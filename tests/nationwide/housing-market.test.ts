import { describe, expect, it } from "vitest";

import { homePriceLevels } from "../../src/simulation/living-world/housing-market";
import type { MacroMonthRecord } from "../../src/simulation/macro-economy/types";

/** Months whose real growth and inflation are the given annual rates. */
function months(
  rates: readonly { growthPct: number; inflationPct: number }[],
): MacroMonthRecord[] {
  let output = 100;
  let price = 100;
  return rates.map((rate, index) => {
    output *= Math.exp(rate.growthPct / 100 / 12);
    price *= Math.exp(rate.inflationPct / 100 / 12);
    const month = String((index % 12) + 1).padStart(2, "0");
    const year = 2026 + Math.floor(index / 12);
    return {
      recordedAt: `${year}-${month}-01`,
      growthPct: rate.growthPct,
      inflationPct: rate.inflationPct,
      realOutputIndex: output,
      priceIndex: price,
      policyRate: { lowerPct: 4, upperPct: 4.25 },
    } as unknown as MacroMonthRecord;
  });
}

describe("a town's home prices follow its economy, with no draw", () => {
  it("starts at one and grows with income in a steady economy", () => {
    const steady = months(
      Array.from({ length: 121 }, () => ({ growthPct: 2, inflationPct: 2.5 })),
    );
    const levels = homePriceLevels(steady);
    expect(levels[0]!.level).toBe(1);
    // Ten years at 4.5% income growth: home prices end near exp(0.45).
    const tenYears = Math.log(levels[120]!.level);
    expect(tenYears).toBeGreaterThan(0.4);
    expect(tenYears).toBeLessThan(0.5);
    // The same months give the same prices.
    expect(homePriceLevels(steady)).toEqual(levels);
  });

  it("slows when income stops growing", () => {
    const boom = Array.from({ length: 24 }, () => ({
      growthPct: 3,
      inflationPct: 3,
    }));
    const bust = Array.from({ length: 24 }, () => ({
      growthPct: -3,
      inflationPct: 1,
    }));
    const levels = homePriceLevels(months([...boom, ...bust]));
    const yearly = (to: number) =>
      Math.log(levels[to]!.level / levels[to - 12]!.level);
    expect(yearly(47)).toBeLessThan(yearly(23));
  });
});
