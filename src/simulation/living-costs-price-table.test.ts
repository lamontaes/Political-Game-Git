import { describe, expect, it } from "vitest";
import {
  LIVING_COSTS_PRICE_TABLE,
  livingCostsPriceLevel,
} from "./living-costs-price-table";
import { estimatedMonthlyHouseholdLivingCosts } from "./living-costs-data";

describe("household living-cost price table", () => {
  it("retains one sourced base, size spread, and shared price measure per category", () => {
    const categories = Object.values(LIVING_COSTS_PRICE_TABLE);
    expect(categories.length).toBeGreaterThan(0);
    for (const row of categories) {
      expect(row.base).toBeGreaterThan(0);
      expect(Object.keys(row.spreadByHousehold)).toEqual([
        "1",
        "2",
        "3",
        "4",
        "5plus",
      ]);
      expect(row.linkedMeasure).toBe("macro-economy.national-price-index");
    }
  });

  it("prices each retained category through the same recorded national index", () => {
    const base = estimatedMonthlyHouseholdLivingCosts("south", 3);
    const doubled = estimatedMonthlyHouseholdLivingCosts("south", 3, {
      currentPriceIndex: 200,
      basePriceIndex: 100,
    });
    expect(livingCostsPriceLevel(200, 100)).toBe(2);
    expect(doubled.monthlyMinor).toBe(base.monthlyMinor * 2);
    doubled.categories.forEach((row, index) =>
      expect(row.annualMeanUsd).toBeCloseTo(
        base.categories[index]!.annualMeanUsd * 2,
        8,
      ),
    );
    expect(doubled.categories.every((row) => row.linkedMeasure)).toBe(true);
  });

  it("rejects invalid price indices rather than inventing a fallback", () => {
    expect(() => livingCostsPriceLevel(0, 100)).toThrow(
      "positive finite values",
    );
    expect(() => livingCostsPriceLevel(100, Number.NaN)).toThrow(
      "positive finite values",
    );
  });
});
