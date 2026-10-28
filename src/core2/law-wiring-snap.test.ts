/**
 * The SNAP maximum reaches what a household eats, in a played world: a place
 * drawn from all 56 on a seed nobody chose, the bench world with every module
 * installed, built twice from the same seed. In one, Congress raises the
 * maximum allotment a tenth the second day; the other is the control. The
 * benefit engine sets each qualifying household's benefit at the maximum in
 * force (runFoodAid), and the household's monthly purchases (settle in
 * cost-of-living.ts) buy its everyday plan from what its members hold, so a
 * household that could not buy all of its plan buys more of it. The research
 * link into food insecurity is carried by these two engines, and the web
 * does not run it (snap-maximum-to-food-insecurity, links.json carriedBy).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn, type LawAppliedRow } from "./law-reach/applied";
import { advanceCore } from "./life";
import { enactLaw, lawInForce } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.SNAP_SEED ?? randomBytes(20).toString("hex");
const KEY = "snap-maximum";
const LINK = "snap-maximum-to-food-insecurity";
/** Two monthly benefit closes and two everyday purchases after the raise. */
const DAYS = 70;
const TRIES = 4;

/** The SNAP maximum raised a tenth by a federal act, on the row in force. */
function raiseSnapMaximum(api: CoreAPI): string {
  const governing = lawInForce(api, KEY).governing;
  if (!governing?.value) throw new Error("no SNAP maximum row to raise");
  return enactLaw(api, {
    jurisdiction: governing.jurisdiction,
    level: governing.level,
    series: KEY,
    value: Math.round(governing.value * 1.1),
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: "snap-test-raise",
    citation: "SNAP test: the maximum raised a tenth",
    ...(governing.unit ? { unit: governing.unit } : {}),
    ...(governing.terms ? { terms: { ...governing.terms } } : {}),
  }).id;
}

/** Each named household's benefit row under the maximum, by household. */
function benefits(api: CoreAPI, lawId?: string) {
  return new Map(
    appliedOn(api, KEY)
      .filter(
        (r) =>
          r.target === "household" &&
          r.what === "snap-benefit-set" &&
          (!lawId || r.lawId === lawId),
      )
      .map((r) => [r.targetId, r] as const),
  );
}

describe("the SNAP maximum reaches what a household buys", () => {
  it(
    `a raised maximum pays more and a short household buys more of its plan (seed ${seed})`,
    { timeout: 900_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-snap:${attempt}`);
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core as CoreState;
          const lawWorld = build();
          const control = build();
          const api = coreAPI(lawWorld);
          if (!lawInForce(api, KEY).governing?.value) {
            passed.push(`${drawn.name}: no SNAP maximum in force`);
            continue;
          }
          const lawId = raiseSnapMaximum(api);
          const until = addDays(makeIsoDate(lawWorld.date), DAYS);
          advanceCore(lawWorld, until);
          advanceCore(control, until);
          const raised = benefits(api, lawId);
          const before = benefits(coreAPI(control));
          // The benefit engine set each household's benefit at the raised maximum.
          const pairs: [LawAppliedRow, LawAppliedRow][] = [];
          for (const [household, row] of raised) {
            const other = before.get(household);
            if (other) pairs.push([row, other]);
          }
          // Households the control world left short at their last purchase.
          const short = pairs.filter(([row]) => {
            const plan = control.finance.livingPlans.get(row.targetId);
            return (
              !!plan?.lastAt && plan.lastPaidMinor < plan.lastRequestedMinor
            );
          });
          const bought = short.filter(([row]) => {
            const withLaw = lawWorld.finance.livingPlans.get(row.targetId);
            const without = control.finance.livingPlans.get(row.targetId)!;
            return (
              !!withLaw?.lastAt &&
              withLaw.lastAt === without.lastAt &&
              withLaw.lastPaidMinor > without.lastPaidMinor
            );
          });
          if (!pairs.length || !bought.length) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): ${pairs.length} households on SNAP in both worlds, ${short.length} short, ${bought.length} bought more`,
            );
            continue;
          }
          for (const [row, other] of pairs)
            expect(row.amountMinor, row.id).toBeGreaterThan(other.amountMinor);
          // The web leaves the carried link alone.
          const months = coreAPI(lawWorld)
            .moduleState(OUTCOME_WEB_MODULE_ID)
            .table("months")
            .rows() as unknown as WebMonth[];
          expect(
            months.some((m) => m.effects[LINK] !== undefined),
            "the web ran the carried SNAP maximum link",
          ).toBe(false);
          const [row, other] = bought[0]!;
          const withLaw = lawWorld.finance.livingPlans.get(row.targetId)!;
          const without = control.finance.livingPlans.get(row.targetId)!;
          process.stdout.write(
            `SNAP ${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed}): law ${lawId}; ${pairs.length} named households' benefits rose, ${short.length} were short in the control world, ${bought.length} bought more; ${row.targetId}: benefit ${row.amountMinor} against ${other.amountMinor} (${row.id}), everyday purchases on ${withLaw.lastAt} paid ${withLaw.lastPaidMinor} of ${withLaw.lastRequestedMinor} against ${without.lastPaidMinor} of ${without.lastRequestedMinor} in the control world. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed a short household buying more: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
