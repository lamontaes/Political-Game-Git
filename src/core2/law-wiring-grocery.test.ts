/**
 * The grocery sales-tax exemption reaches what households pay for food, in a
 * played world: a place drawn from all 56 on a seed nobody chose, in a state
 * that taxes groceries, the bench world with every module installed, built
 * twice from the same seed. In one, the town's lowest level that may pass it
 * exempts groceries the second day; the other is the control. The sales tax
 * engine spares the grocery share of every retail seller's sales, and at each
 * seller's next price review the change in what it keeps of each dollar of
 * sales reaches its price at the researched pass-through (finance-state.ts,
 * salesTaxPassThrough). A household whose everyday plan was short in the
 * control world buys more of it at the lower prices. The research link into
 * food insecurity is carried by these engines (links.json carriedBy).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { sellerTaxShare } from "./modules/purchase-tax";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GROCERY_SEED || randomBytes(20).toString("hex");
const LAW = "us-policy-positions:fiscal.exempt-groceries-from-sales-tax";
const RETAIL = "enterprise:retail";
/** Past every retail seller's next monthly price review and the households' next purchases. */
const DAYS = 45;
const TRIES = 6;

function retailSellers(core: CoreState, placeId: string): string[] {
  return [...core.organizations.values()]
    .filter(
      (o) =>
        o.placeId === placeId &&
        (o.classification ?? "").startsWith(RETAIL) &&
        core.finance.businesses.has(o.id) &&
        !core.finance.businesses.get(o.id)!.closedAt,
    )
    .map((o) => o.id)
    .sort();
}

/** The town's lowest level that may exempt groceries (the powers catalog's state, county, city). */
function lowestLevel(api: CoreAPI) {
  const levels = lawChain(api).levels;
  for (const level of ["city", "county", "state"] as const) {
    const row = levels.find((l) => l.level === level);
    if (row) return { level, jurisdiction: row.jurisdiction };
  }
  return null;
}

describe("the grocery exemption reaches what households pay for food", () => {
  it(
    `the exemption moves grocery sellers' prices and what a short household buys (seed ${seed})`,
    { timeout: 900_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-grocery:${attempt}`);
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core as CoreState;
          const lawWorld = build();
          const api = coreAPI(lawWorld);
          const town = lawChain(api).townPlaceId;
          const sellers = retailSellers(lawWorld, town);
          const governing = lawInForce(api, LAW);
          const exempt = governing.value === 1;
          // Where groceries are exempt the test repeals the exemption at the
          // level that has it; where they are taxed it enacts one.
          const at = exempt
            ? governing.governing
              ? {
                  level: governing.governing.level,
                  jurisdiction: governing.governing.jurisdiction,
                }
              : null
            : lowestLevel(api);
          const taxedAtAll = sellers.some(
            (id) =>
              sellerTaxShare(lawWorld, id, "now") > 0 ||
              (exempt && sellerTaxShare(lawWorld, id, "opening") > 0),
          );
          const salesTax = lawInForce(api, "sales-tax").value ?? 0;
          if (!at || !sellers.length || !(salesTax > 0) || !taxedAtAll) {
            passed.push(
              `${drawn.name}, ${drawn.state}: ${!(salesTax > 0) ? "no sales tax" : !sellers.length ? "no retail seller" : "no level holds the law"}`,
            );
            continue;
          }
          const control = build();
          const row = enactLaw(api, {
            ...(at as {
              level: "state" | "county" | "city";
              jurisdiction: string;
            }),
            series: LAW,
            value: exempt ? 0 : 1,
            effectiveDate: addDays(makeIsoDate(lawWorld.date), 1),
            measureId: `grocery-test-${attempt}`,
            citation: exempt
              ? "Grocery test: the grocery exemption repealed"
              : "Grocery test: groceries exempted from the sales tax",
          });
          const until = addDays(makeIsoDate(lawWorld.date), DAYS);
          const pass = lawWorld.data.parameters.salesTaxPassThrough!.value;
          // Each retail seller at its first price review after the change, in
          // both worlds the same day: its price moved by the pass-through
          // times the change in what it keeps of each dollar of sales (a
          // later review also answers demand at the new price, so only the
          // first is read).
          const firstReview = new Map<
            string,
            {
              id: string;
              ratio: number;
              expected: number;
              on: string;
              before: number;
            }
          >();
          const prior = new Map<string, number>();
          // The share of its sales the tax took at each seller's last review:
          // the review that records a new share is the one that took the step.
          const recorded = new Map(
            sellers.map(
              (id) =>
                [
                  id,
                  lawWorld.finance.businesses.get(id)?.lastSalesTaxShare ??
                    sellerTaxShare(lawWorld, id, "opening"),
                ] as const,
            ),
          );
          const skipped = new Set<string>();
          while (lawWorld.date < until) {
            for (const id of sellers) {
              const a = lawWorld.finance.businesses.get(id);
              const b = control.finance.businesses.get(id);
              if (a && b) prior.set(id, a.price / b.price);
            }
            const next = addDays(makeIsoDate(lawWorld.date), 1);
            advanceCore(lawWorld, next);
            advanceCore(control, next);
            for (const id of sellers) {
              if (firstReview.has(id) || skipped.has(id)) continue;
              const withLaw = lawWorld.finance.businesses.get(id);
              const without = control.finance.businesses.get(id);
              if (!withLaw || !without || withLaw.closedAt) continue;
              const share = withLaw.lastSalesTaxShare;
              if (share === undefined || share === recorded.get(id)) continue;
              recorded.set(id, share);
              // A seller the control world did not review the same day answers
              // a different month's demand: it is passed over.
              if (without.lastReviewedAt !== withLaw.lastReviewedAt) {
                skipped.add(id);
                continue;
              }
              firstReview.set(id, {
                id,
                ratio: withLaw.price / without.price,
                expected:
                  1 +
                  pass *
                    ((1 - sellerTaxShare(control, id, "now")) /
                      (1 - sellerTaxShare(lawWorld, id, "now")) -
                      1),
                on: lawWorld.date,
                before: prior.get(id) ?? Number.NaN,
              });
            }
          }
          const moved = [...firstReview.values()];
          // A household short of its everyday plan buys more of it where the
          // exemption lowered prices, and less where its repeal raised them.
          const bought = [...control.finance.livingPlans.values()].filter(
            (plan) => {
              const withLaw = lawWorld.finance.livingPlans.get(
                plan.householdId,
              );
              if (!plan.lastAt || withLaw?.lastAt !== plan.lastAt) return false;
              const share = (p: typeof plan) =>
                p.lastPaidMinor / p.lastRequestedMinor;
              return exempt
                ? withLaw.lastPaidMinor < withLaw.lastRequestedMinor &&
                    withLaw.lastRequestedMinor > plan.lastRequestedMinor &&
                    share(withLaw) < share(plan)
                : plan.lastPaidMinor < plan.lastRequestedMinor &&
                    withLaw.lastRequestedMinor < plan.lastRequestedMinor &&
                    share(withLaw) > share(plan);
            },
          );
          if (!moved.length || !bought.length) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): ${moved.length} retail sellers reviewed in both worlds, ${bought.length} short households bought ${exempt ? "less" : "more"}`,
            );
            continue;
          }
          for (const m of moved) {
            // Exempting lowers the tax's share and the price; repealing raises both.
            expect(Math.sign(m.expected - 1), m.id).toBe(exempt ? 1 : -1);
            expect(
              m.ratio,
              `${m.id} on ${m.on}: law to control price ${m.before} the day before`,
            ).toBeCloseTo(m.expected, 6);
          }
          // The exemption's applied rows: where it was enacted, the sales it spared.
          const spared = appliedOn(exempt ? coreAPI(control) : api, LAW).filter(
            (r) => r.what === "sales-tax-exempt",
          );
          expect(spared.length, "the exemption spared no sale").toBeGreaterThan(
            0,
          );
          const seller = moved[0]!;
          const plan = bought[0]!;
          const planLaw = lawWorld.finance.livingPlans.get(plan.householdId)!;
          process.stdout.write(
            `GROCERY (GROCERY_SEED=${seed}) ${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed}): law ${row.id} at ${at.level} (${exempt ? "repealed" : "enacted"}); ${moved.length} retail sellers repriced, e.g. ${lawWorld.organizations.get(seller.id)?.name ?? seller.id} (${seller.id}) at ${seller.ratio.toFixed(6)} of its control price (expected ${seller.expected.toFixed(6)}); ${spared.length} applied rows spared tax, e.g. ${spared[0]!.id}; ${bought.length} short households bought ${exempt ? "less" : "more"}, e.g. ${plan.householdId} on ${plan.lastAt}: paid ${planLaw.lastPaidMinor} of ${planLaw.lastRequestedMinor} against ${plan.lastPaidMinor} of ${plan.lastRequestedMinor} in the control world. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed the exemption reaching prices and a short household: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
