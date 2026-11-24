/**
 * The work requirement counts each covered adult's own months (7 CFR 273.24):
 * a stopped adult who is not the household's payee takes only their share of
 * the benefit out, and the household keeps drawing through its payee. A place
 * is drawn from all 56 on a seed nobody chose; the world is played twice, with
 * the requirement and without.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { rowsOf } from "./law-reach/group-b-store";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.SNAP_MEMBER_SEED || randomBytes(20).toString("hex");
const ASSIST_WORK =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";
const FOOD_AID = "snap-baseline";
/** The time limit is three months of benefit; five months of reviews and purchases show who it stopped. */
const DAYS = 150;
const TRIES = 10;

interface Taken {
  readonly id: string;
  readonly key: string;
  readonly recipientId: string;
  readonly stoppedOn?: string;
}

const tomorrow = (api: CoreAPI) => addDays(makeIsoDate(api.state.date), 1);

/** Puts the requirement out of force at every level that says yes, or in force at the state. */
function setRequirement(api: CoreAPI, value: 0 | 1, tag: string): void {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  if (value === 0) {
    for (const { level, jurisdiction } of lawChain(api).levels) {
      const latest = (
        laws.query("bySeries", [
          jurisdiction,
          ASSIST_WORK,
        ]) as unknown as LawRowInput[]
      )
        .filter((r) => r.effectiveDate <= api.state.date)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      if (latest?.value !== 1) continue;
      enactLaw(api, {
        jurisdiction,
        level,
        series: ASSIST_WORK,
        value: 0,
        effectiveDate: tomorrow(api),
        measureId: `snap-work-${tag}`,
        citation: "SNAP work test: the requirement off",
      });
    }
    return;
  }
  const state = lawChain(api).levels.find((l) => l.level === "state")!;
  enactLaw(api, {
    jurisdiction: state.jurisdiction,
    level: "state",
    series: ASSIST_WORK,
    value: 1,
    effectiveDate: tomorrow(api),
    measureId: `snap-work-${tag}`,
    citation: "SNAP work test: the requirement on",
  });
}

function play(drawn: ReturnType<typeof drawPlace>, requirement: boolean) {
  const core = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core as CoreState;
  const api = coreAPI(core);
  if (!lawInForce(api, "snap-maximum").value) return null;
  // The starting answer is repealed in both worlds, so the requirement is a change from no law.
  setRequirement(api, 0, "open");
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  if (requirement) setRequirement(api, 1, "on");
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  return core;
}

interface Benefit {
  readonly key: string;
  readonly recipientId: string;
  readonly amountMinor: number;
  readonly obligationId: string;
}

describe("the work requirement stops one adult, not the household", () => {
  it(
    `a stopped non-payee lowers the household's benefit and leaves it paid (seed ${seed})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `snap-member-stop:${attempt}`);
          const lawWorld = play(drawn, true);
          if (!lawWorld) {
            passed.push(`${drawn.name}, ${drawn.state}: no SNAP in force`);
            continue;
          }
          const api = coreAPI(lawWorld);
          const stopped = rowsOf<Taken>(api, "taken").filter(
            (r) => r.key === `limit|${FOOD_AID}`,
          );
          const paying = (core: CoreState) =>
            new Map(
              rowsOf<Benefit>(coreAPI(core), "taken")
                .filter((r) => r.key === `benefit|${FOOD_AID}`)
                .map((r) => [r.recipientId, r] as const),
            );
          const lawPaid = paying(lawWorld);
          // A stopped adult in a household whose payee is someone else and still paid.
          const cases = stopped.flatMap((row) => {
            const home = lawWorld.people.get(row.recipientId)?.householdId;
            const members = home
              ? (lawWorld.households.get(home)?.memberIds ?? [])
              : [];
            const payee = members.find(
              (id) => id !== row.recipientId && lawPaid.has(id),
            );
            return payee ? [{ row, home: home!, payee }] : [];
          });
          if (!cases.length) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): ${stopped.length} stopped, none with a paid payee beside them`,
            );
            continue;
          }
          const control = play(drawn, false)!;
          const controlPaid = paying(control);
          const lower = cases.filter(
            (c) =>
              (controlPaid.get(c.payee)?.amountMinor ?? 0) >
              lawPaid.get(c.payee)!.amountMinor,
          );
          expect(
            lower.length,
            `${drawn.name} (${drawn.key}, seed ${drawn.seed}): a stopped non-payee did not lower the household's benefit`,
          ).toBeGreaterThan(0);
          const c = lower[0]!;
          process.stdout.write(
            `SNAP-MEMBER (SNAP_MEMBER_SEED=${seed}) ${drawn.name} (${drawn.key}, seed ${drawn.seed}): ${c.row.recipientId} stopped ${c.row.stoppedOn}; ${c.home} paid through ${c.payee} ${lawPaid.get(c.payee)!.amountMinor} against ${controlPaid.get(c.payee)!.amountMinor} in the control world (${lawPaid.get(c.payee)!.obligationId}). Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed a stopped non-payee beside a paid payee: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
