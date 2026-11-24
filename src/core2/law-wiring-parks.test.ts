/**
 * The parks laws reach people through the rest act, in a played world: a
 * place drawn from all 56 on a seed nobody chose, the bench world with every
 * module installed, built twice from the same seed. In one, the town's lowest
 * level that may pass it enacts a dedicated parks tax; the other is the
 * control. The outcome web moves the share of the town's residents near a
 * park or recreation facility from the parks line (parks-spending-to-
 * exercise-access), and every rest a resident takes in the law's world
 * relieves stress by the rest's own amount times the web's factor on that
 * share: the life module's recover handler reads it at the moment it relieves.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { affectAt } from "./emotion";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { LIFE_MODULE, PARK_ACCESS } from "./modules/life";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { webReach } from "./outcome-web-reach";
import { parameterValues } from "./parameters";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.PARKS_SEED ?? randomBytes(20).toString("hex");
const LAW =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";
const LINK = "parks-spending-to-exercise-access";
/** Long enough for two web months after the law takes effect. */
const DAYS = 45;
const TRIES = 4;

interface Rest {
  readonly core: CoreState;
  readonly personId: string;
  readonly date: string;
  readonly before: number;
  readonly after: number;
  readonly factor: number;
  readonly recordId: string | null;
}

/** The town's lowest level that may pass a dedicated parks tax (the powers catalog's state, county, city). */
function lowestLevel(api: CoreAPI) {
  const levels = lawChain(api).levels;
  for (const level of ["city", "county", "state"] as const) {
    const row = levels.find((l) => l.level === level);
    if (row) return { level, jurisdiction: row.jurisdiction };
  }
  return null;
}

/** The town's web months: each month's row id and the parks link's effect. */
function monthEffects(
  core: CoreState,
  placeId: string,
): Map<string, { id: string; effect: number }> {
  const rows = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly WebMonth[];
  return new Map(
    rows.map((row) => [
      row.month,
      { id: row.id, effect: row.effects[LINK] ?? 0 },
    ]),
  );
}

describe("the parks laws reach the people who rest", () => {
  it(
    `a dedicated parks tax moves the town's park access, and each rest relieves by it (seed ${seed})`,
    { timeout: 900_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const rests: Rest[] = [];
      const recover = LIFE_MODULE.effectHandlers!.recover!;
      // Watch every rest the simulation chooses, in both worlds, around the
      // handler that relieves it.
      const spy = vi
        .spyOn(LIFE_MODULE.effectHandlers!, "recover")
        .mockImplementation((api, actorId, chosen, date, days, decision) => {
          const person = api.state.people.get(actorId)!;
          const before = affectAt(
            person.affect,
            api.state.date,
            parameterValues(api.state.data.parameters),
          ).stress;
          const out = recover(api, actorId, chosen, date, days, decision);
          const web = webReach(api, person.placeId, PARK_ACCESS);
          rests.push({
            core: api.state as CoreState,
            personId: actorId,
            date: api.state.date,
            before,
            after: api.state.people.get(actorId)!.affect.stress,
            factor: web.factor,
            recordId: web.recordId,
          });
          return out;
        });
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-parks:${attempt}`);
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          const lawWorld = build();
          const control = build();
          const api = coreAPI(lawWorld);
          const at = lowestLevel(api);
          if (!at) {
            passed.push(`${drawn.name}: no level may pass it`);
            continue;
          }
          const row = enactLaw(api, {
            ...at,
            series: LAW,
            value: 1,
            effectiveDate: addDays(makeIsoDate(lawWorld.date), 1),
            measureId: `parks-test-${attempt}`,
            citation: "Parks test: a dedicated parks tax",
          });
          const until = addDays(makeIsoDate(lawWorld.date), DAYS);
          rests.length = 0;
          advanceCore(lawWorld, until);
          advanceCore(control, until);
          const placeId = lawChain(api).townPlaceId;
          const withLaw = monthEffects(lawWorld, placeId);
          const without = monthEffects(control, placeId);
          // The town's months whose park access the law moved.
          const moved = [...withLaw].filter(
            ([month, row]) => row.effect !== (without.get(month)?.effect ?? 0),
          );
          const movedIds = new Set(moved.map(([, row]) => row.id));
          const read = rests.filter(
            (r) =>
              r.core === lawWorld &&
              r.recordId !== null &&
              movedIds.has(r.recordId),
          );
          if (!moved.length || !read.length) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): ${moved.length} months moved, ${read.length} rests in them`,
            );
            continue;
          }
          const restEffect = api.parameter("restEffect");
          for (const r of read) {
            expect(r.factor, r.personId).not.toBe(1);
            // The relief is the rest's own amount times the web's factor.
            expect(r.after, r.personId).toBeCloseTo(
              r.before * Math.exp(-restEffect * r.factor),
              12,
            );
          }
          // A rest that had stress to relieve: the witness the chain names.
          const sample = read.find((r) => r.before > 0);
          expect(sample, "a rest in a moved month with stress").toBeDefined();
          const person = lawWorld.people.get(sample!.personId)!;
          process.stdout.write(
            `PARKS ${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed}): law ${row.id} at ${at.level}; ${moved.length} web months moved (${moved.map(([m, r]) => `${r.id} ${r.effect.toFixed(6)} against ${(without.get(m)?.effect ?? 0).toFixed(6)}`).join(", ")}); ${read.length} rests read them, e.g. ${person.givenName} ${person.familyName} (${sample!.personId}) on ${sample!.date}: stress ${sample!.before.toFixed(4)} to ${sample!.after.toFixed(4)} at factor ${sample!.factor.toFixed(6)}, where the rest alone would leave ${(sample!.before * Math.exp(-restEffect)).toFixed(4)} (${sample!.recordId}). Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed a rest in a month the law moved: ${passed.join("; ")}`,
        );
      } finally {
        spy.mockRestore();
        setBookkeeping(bookkeeping);
      }
    },
  );
});
