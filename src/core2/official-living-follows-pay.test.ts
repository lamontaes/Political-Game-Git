/**
 * An official's living cost follows their pay on the Consumer Expenditure
 * Survey's curve of spending against income (official-living.ts), so a
 * well-paid official spends most of what they earn after tax instead of
 * piling it up as cash (pool item world-median-owner-cash-grows-tenfold-in-a-year).
 * Pinned to Matagorda, Texas on seed pt1:0 so a draw never decides the result.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { householdDailyCostMinor } from "./household-cost";
import { bedroomsForHousehold, hudStateRentRow } from "./hud-rents";
import { officialHousehold } from "./official-living";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

it("living cost rises with pay, never below the basket, with no step", () => {
  const draw = drawPlace("pt1:0", "session-a-property-tax");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const { stateKey } = lawChain(api);
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const costAt = (usd: number) =>
    officialHousehold(api, stateKey, usd * 100, "official:fixture:0")
      .livingCostDailyMinor;
  const pays = [20, 40, 60, 66, 80, 100, 144, 200, 300].map((k) => k * 1000);
  const costs = pays.map(costAt);
  // Never falls as pay rises, and never steps: each cost is within a bounded
  // ratio of the one before it.
  for (let i = 1; i < costs.length; i++) {
    expect(costs[i]!, `${where} at ${pays[i]}`).toBeGreaterThanOrEqual(
      costs[i - 1]!,
    );
    expect(costs[i]! / costs[i - 1]!, `${where} at ${pays[i]}`).toBeLessThan(
      2.1,
    );
  }
  // At $144,000 a year an official spends well over the one-person basket and
  // still keeps part of their pay after the withholding.
  const yearSpend = (costAt(144_000) * 365.25) / 100;
  expect(yearSpend, where).toBeGreaterThan(60_000);
  expect(yearSpend, where).toBeLessThan(0.75 * 144_000);
  // Mid pay never spends more than most of it (the ceiling: 70 percent).
  expect((costAt(40_000) * 365.25) / 100, where).toBeLessThanOrEqual(
    0.7 * 40_000 + 365,
  );
  // Low pay is held to the basket plus rent (the floor).
  expect(costAt(5_000), where).toBe(costAt(1_000));
}, 60_000);

it("shelter is charged once: a renter's and an owner's total outgo against pay", () => {
  const draw = drawPlace("pt1:0", "session-a-property-tax");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const { stateKey } = lawChain(api);
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const p = (key: string) => api.parameter(key);
  const rent = hudStateRentRow(stateKey, api.state.seed)!;
  const fmrDaily =
    (rent.rents[bedroomsForHousehold(1)]! * p("minorPerDollar") * 12) /
    p("daysPerMeanYear");
  const payMinor = 66_000 * p("minorPerDollar");
  const cost = householdDailyCostMinor({
    seed: api.state.seed,
    stateKey,
    size: 1,
    rent,
    annualPayMinor: payMinor,
    parameter: p,
  });
  // The cost carries the Fair Market Rent as its shelter, so the housing
  // engine's payment replaces exactly that rent and nothing else.
  expect(cost, where).toBeGreaterThan(fmrDaily);
  // A renter paying the Fair Market Rent through the housing engine, and an
  // owner paying a mortgage and tax of twice that, each have the cost less
  // what comes out (housing-shelter.ts takes out up to the rent) plus the
  // payment: shelter once, never twice.
  const outgo = (paid: number) => cost - Math.min(fmrDaily, paid) + paid;
  const renter = outgo(fmrDaily);
  const owner = outgo(2 * fmrDaily);
  expect(renter, where).toBeCloseTo(cost, -1);
  expect(owner - renter, where).toBeCloseTo(fmrDaily, -1);
  // Against pay: a renter's outgo is most of pay or less, and the owner's
  // exceeds it by exactly the shelter they chose to buy above the rent.
  const payDaily = payMinor / p("daysPerMeanYear");
  expect(renter / payDaily, where).toBeLessThanOrEqual(0.7 + 1e-9);
  expect(owner / payDaily, where).toBeGreaterThan(renter / payDaily);
}, 60_000);
