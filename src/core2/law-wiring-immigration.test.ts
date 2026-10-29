/**
 * Local immigration enforcement reaches workers' pull to work, in a played
 * world: a place drawn from all 56 on a seed nobody chose, the bench world
 * with every module installed, built twice from the same seed. In one, the
 * town's lowest level that may partner with federal immigration enforcement
 * does so the second day; the other is the control. The outcome web runs the
 * two research links (East et al. 2023) into the jobs engine's pull to work:
 * a noncitizen seeded without work authorization takes the undocumented
 * employment effect, a citizen the U.S.-born one, and a noncitizen with
 * authorization neither (participationShift in jobs-web.ts).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  authorizationMeasure,
  fullFacts,
  participationShift,
  UNDOCUMENTED,
  US_BORN,
} from "./jobs-web";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce, webReach } from "./modules/laws";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.IMMIGRATION_SEED || randomBytes(20).toString("hex");
const LAW =
  "us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement";
/** The most days to play until the web's month row reads the law in force. */
const DAYS = 45;
const TRIES = 6;

const sizeOf = (key: string) => WEB_LINKS.find((l) => l.key === key)!.size!;

function lowestLevel(api: CoreAPI) {
  const levels = lawChain(api).levels;
  for (const level of ["city", "county", "state"] as const) {
    const row = levels.find((l) => l.level === level);
    if (row) return { level, jurisdiction: row.jurisdiction };
  }
  return null;
}

describe("local immigration enforcement reaches workers' pull to work", () => {
  it(
    `an unauthorized worker takes the undocumented effect and a citizen the U.S.-born one (seed ${seed})`,
    { timeout: 900_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-immigration:${attempt}`);
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core as CoreState;
          const lawWorld = build();
          const api = coreAPI(lawWorld);
          if (lawInForce(api, LAW).value === 1) {
            passed.push(`${drawn.name}, ${drawn.state}: already in force`);
            continue;
          }
          const at = lowestLevel(api);
          if (!at) {
            passed.push(`${drawn.name}, ${drawn.state}: no level holds it`);
            continue;
          }
          const control = build();
          const row = enactLaw(api, {
            ...at,
            series: LAW,
            value: 1,
            effectiveDate: addDays(makeIsoDate(lawWorld.date), 1),
            measureId: `immigration-test-${attempt}`,
            citation: "Immigration test: a 287(g) partnership",
          });
          // Play to the first day the web's month row reads the law, and the
          // control world to the same day: later, a county's own partnership
          // enacted in play would stand in both worlds alike.
          const town = lawChain(api).townPlaceId;
          const last = addDays(makeIsoDate(lawWorld.date), DAYS);
          while (
            lawWorld.date < last &&
            webReach(api, town, UNDOCUMENTED).factor === 1
          )
            advanceCore(lawWorld, addDays(makeIsoDate(lawWorld.date), 1));
          advanceCore(control, lawWorld.date);
          // A state law that forbids local partnerships keeps a city's out.
          const governing = lawInForce(api, LAW);
          if (governing.value !== 1) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): the ${at.level}'s partnership is not in force (${governing.governing?.id ?? "no row"} governs)`,
            );
            continue;
          }
          // A place whose own governments put a partnership in force in play
          // has it in the control world too, so the two worlds read alike.
          const controlLaw = lawInForce(coreAPI(control), LAW);
          if (controlLaw.value === 1) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): the control world put a partnership in force in play (${controlLaw.governing?.id ?? "no row"} governs)`,
            );
            continue;
          }
          const p = (key: string) => api.parameter(key);
          const adults = [...lawWorld.people.values()].filter(
            (person) => person.alive && person.placeId === town,
          );
          const shiftOf = (core: CoreState, id: string) =>
            participationShift(
              coreAPI(core),
              town,
              fullFacts(coreAPI(core), id, p)!,
              p,
            );
          // Each full adult's measure, and the pull to work it gives in each world.
          const rows = adults.map((person) => ({
            id: person.id,
            measure: authorizationMeasure(api, person.id, p),
            law: shiftOf(lawWorld, person.id),
            control: control.people.get(person.id)?.alive
              ? shiftOf(control, person.id)
              : Number.NaN,
          }));
          const unauthorized = rows.filter(
            (r) => r.measure === UNDOCUMENTED && Number.isFinite(r.control),
          );
          const citizens = rows.filter(
            (r) => r.measure === US_BORN && Number.isFinite(r.control),
          );
          if (!unauthorized.length || !citizens.length) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): ${unauthorized.length} unauthorized and ${citizens.length} citizen full residents`,
            );
            continue;
          }
          const undocumented = Math.log(
            1 + sizeOf("enforcement-to-undocumented-employment"),
          );
          const usBorn = Math.log(
            1 + sizeOf("enforcement-to-us-born-employment"),
          );
          // The shift is the person's other groups plus their authorization's
          // effect: the difference from the control world is exactly the link.
          for (const r of unauthorized)
            expect(r.law - r.control, r.id).toBeCloseTo(undocumented, 9);
          for (const r of citizens)
            expect(r.law - r.control, r.id).toBeCloseTo(usBorn, 9);
          for (const r of rows.filter((r) => !r.measure))
            expect(r.law, r.id).toBeCloseTo(r.control, 12);
          const reached = appliedOn(api, LAW);
          const worker = unauthorized[0]!;
          const citizen = citizens[0]!;
          process.stdout.write(
            `IMMIGRATION (IMMIGRATION_SEED=${seed}) ${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed}): law ${row.id} at ${at.level}; ${rows.length} full residents, ${unauthorized.length} seeded unauthorized, ${citizens.length} citizens; ${worker.id}'s pull to work ${worker.law.toFixed(6)} against ${worker.control.toFixed(6)} in the control world; ${citizen.id}'s ${citizen.law.toFixed(6)} against ${citizen.control.toFixed(6)}; ${reached.length} applied rows of the law. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place had unauthorized and citizen residents to compare: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
