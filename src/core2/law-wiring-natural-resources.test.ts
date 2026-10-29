/**
 * The natural resources budget line reaches people through the rest act, in
 * a played world: a place drawn from all 56 on a seed nobody chose, the bench
 * world with every module installed, built twice from the same seed. In one,
 * the state raises its natural resources line by half; the other is the
 * control. The outcome web moves the share of the town's residents near a
 * place to exercise from that line by an estimate from the nearest research
 * (natural-resources-spending-to-exercise-access), and every rest a resident
 * takes in the raised world relieves stress by the rest's own amount times
 * the web's factor on that share: the life module's recover handler reads it
 * at the moment it relieves, as it does for the parks line.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { affectAt } from "./emotion";
import { gameStartDate } from "./game-start";
import { budgetLineAddedPct } from "./gov-measures";
import { advanceCore } from "./life";
import {
  amendBudget,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { LIFE_MODULE, PARK_ACCESS } from "./modules/life";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { WEB_LINKS } from "./outcome-web-model";
import { webReach } from "./outcome-web-reach";
import { parameterValues } from "./parameters";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed =
  process.env.NATURAL_RESOURCES_SEED ?? randomBytes(20).toString("hex");
const LINE = "naturalResources";
const LINK = "natural-resources-spending-to-exercise-access";
/** The state raises its natural resources line by half. */
const RAISE = 0.5;
/** Long enough for two web months after the raise. */
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
  readonly links: readonly string[];
}

/** The town's web months: each month's row id and the link's effect. */
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

describe("the natural resources line reaches the people who rest", () => {
  it("is an estimate from the nearest research, with its spread around zero", () => {
    const row = WEB_LINKS.find((link) => link.key === LINK)!;
    expect(row.from).toBe("budget.naturalResources-added-pct");
    expect(row.to).toBe(PARK_ACCESS);
    expect(row.size).toBeGreaterThan(0);
    expect(row.range![0]).toBeLessThan(0);
    expect(row.range![1]).toBeGreaterThan(row.size!);
  });

  it(
    `a state's larger natural resources line moves the town's park access, and each rest relieves by it (seed ${seed})`,
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
            links: web.parts.map((part) => part.link),
          });
          return out;
        });
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(
            seed,
            `law-wiring-natural-resources:${attempt}`,
          );
          const where = `${drawn.name}, ${drawn.state} (${drawn.key})`;
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          const raised = build();
          const control = build();
          const api = coreAPI(raised);
          const state = governments(api).find((gov) => gov.level === "state");
          const budget = state ? budgetsOf(api, state.id).at(-1) : undefined;
          const base =
            state && budget
              ? (baseBudget(api, state, budget.fiscalYear).spendingMinor[
                  LINE
                ] ?? 0)
              : 0;
          if (!state || base <= 0) {
            passed.push(`${where}: no state natural resources line`);
            continue;
          }
          const act = `natural-resources-test-${attempt}`;
          amendBudget(api, {
            governmentId: state.id,
            line: LINE,
            deltaMinor: Math.round(base * RAISE),
            measureId: act,
            carry: true,
          });
          const cause = budgetLineAddedPct(api, LINE);
          if (!cause || cause.value <= 0) {
            passed.push(`${where}: the town carries no share of the line`);
            continue;
          }
          const until = addDays(makeIsoDate(raised.date), DAYS);
          rests.length = 0;
          advanceCore(raised, until);
          advanceCore(control, until);
          const placeId = lawChain(api).townPlaceId;
          const withRaise = monthEffects(raised, placeId);
          const without = monthEffects(control, placeId);
          // The town's months whose park access the raise moved.
          const moved = [...withRaise].filter(
            ([month, row]) => row.effect !== (without.get(month)?.effect ?? 0),
          );
          const movedIds = new Set(moved.map(([, row]) => row.id));
          const read = rests.filter(
            (r) =>
              r.core === raised &&
              r.recordId !== null &&
              movedIds.has(r.recordId) &&
              r.links.includes(LINK),
          );
          if (!moved.length || !read.length) {
            passed.push(
              `${where}: ${moved.length} months moved, ${read.length} rests in them`,
            );
            continue;
          }
          // The raise adds to whatever the state's own budget did in both
          // worlds: each moved month reads higher than its twin's.
          for (const [month, row] of moved)
            expect(row.effect, row.id).toBeGreaterThan(
              without.get(month)?.effect ?? 0,
            );
          const restEffect = api.parameter("restEffect");
          for (const r of read) {
            expect(r.factor, r.personId).not.toBe(1);
            // The relief is the rest's own amount times the web's factor.
            expect(r.after, r.personId).toBeCloseTo(
              r.before * Math.exp(-restEffect * r.factor),
              12,
            );
          }
          const sample = read.find((r) => r.before > 0);
          expect(sample, "a rest in a moved month with stress").toBeDefined();
          process.stdout.write(
            `NATURAL-RESOURCES (NATURAL_RESOURCES_SEED=${seed}) ${where}, world seed ${drawn.seed}: act ${act} raised ${state.id}'s natural resources line ${RAISE * 100}% (${budget!.id}), the town's share ${cause.value.toFixed(2)}% above its base; ${moved.length} web months moved (${moved.map(([m, r]) => `${r.id} ${r.effect.toExponential(3)} against ${(without.get(m)?.effect ?? 0).toExponential(3)}`).join(", ")}); ${read.length} rests read them, e.g. ${sample!.personId} on ${sample!.date}: stress ${sample!.before.toFixed(6)} to ${sample!.after.toFixed(6)} at factor ${sample!.factor.toFixed(8)} (${sample!.recordId}). Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed a rest in a month the raise moved: ${passed.join("; ")}`,
        );
      } finally {
        spy.mockRestore();
        setBookkeeping(bookkeeping);
      }
    },
  );
});
