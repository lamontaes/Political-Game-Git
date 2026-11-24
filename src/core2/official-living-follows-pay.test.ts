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
