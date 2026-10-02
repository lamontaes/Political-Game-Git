import { describe, expect, it } from "vitest";
import {
  LIVING_COSTS_SOURCE,
  estimatedMonthlyHouseholdLivingCosts,
  estimateLivingCostsCategoryAnnual,
  REPRESENTATIVE_LIVING_COSTS,
  livingCostsRegionForState,
  representativeMonthlyLivingCostsMinor,
} from "./living-costs-data";

describe("A52 retained CES nonhousing bills", () => {
  it.each([
    ["national", 81824],
    ["northeast", 82592],
    ["midwest", 79125],
    ["south", 73398],
    ["west", 85567],
  ] as const)(
    "converts the sourced %s retained basket to %i cents per adult-month",
    (region, amount) => {
      expect(representativeMonthlyLivingCostsMinor(region)).toBe(amount);
    },
  );
  it("keeps purchased vehicles, health premiums/services and unidentified transit out of this bounded basket", () => {
    expect(
      REPRESENTATIVE_LIVING_COSTS.regions.national.annualUsdPerConsumerUnit,
    ).toEqual({
      food: 10169,
      apparelAndServices: 2001,
      miscellaneous: 1218,
      gasoline: 2411,
      maintenanceAndRepairs: 984,
      drugs: 658,
      medicalSupplies: 233,
    });
    expect(LIVING_COSTS_SOURCE).toContain("average-2024.xlsx");
  });
  it("uses existing Census geography and labels territories as national estimates", () => {
    expect(livingCostsRegionForState("US-MN")).toBe("midwest");
    expect(livingCostsRegionForState("US-NM")).toBe("west");
    expect(livingCostsRegionForState("US-PR")).toBe("national");
    expect(livingCostsRegionForState(null)).toBe("national");
  });
});

describe("R7 admitted household-size and regional category estimate", () => {
  it.each([1, 2, 3, 4, 5, 8])(
    "uses the retained size column for %i residents",
    (count) => {
      const estimate = estimatedMonthlyHouseholdLivingCosts("national", count);
      expect(estimate.sizeColumn).toBe(count >= 5 ? "5plus" : String(count));
      expect(estimate.label).toBe("ESTIMATED FROM AVERAGE");
      expect(estimate.categories).toHaveLength(7);
      expect(estimate.monthlyMinor).toBe(
        Math.round(
          (estimate.categories.reduce(
            (sum, row) => sum + row.sourceMeans.size!.annualMeanUsd,
            0,
          ) *
            100) /
            12,
        ),
      );
      expect(
        estimate.categories.every(
          (row) => row.sourceMeans.size!.standardErrorUsd > 0,
        ),
      ).toBe(true);
    },
  );
  it("uses each category's regional ratio, not a total-basket demographic multiplier", () => {
    const estimate = estimatedMonthlyHouseholdLivingCosts("west", 4);
    const food = estimate.categories.find((row) => row.key === "food")!;
    expect(food.annualMeanUsd).toBe((14543 * 11746) / 10169);
    expect(
      estimate.categories.every(
        (row) => row.method === "size-times-region-ratio",
      ),
    ).toBe(true);
    expect(estimate.uncertainty).toContain(
      "not the spread of individual household spending",
    );
  });
  it("uses an available category unscaled when the other table is missing", () => {
    const size = {
      annualMeanUsd: 2400,
      standardErrorUsd: 24,
      relativeStandardErrorPercent: 1,
    };
    const region = {
      annualMeanUsd: 3600,
      standardErrorUsd: 36,
      relativeStandardErrorPercent: 1,
    };
    expect(
      estimateLivingCostsCategoryAnnual(size, undefined, region),
    ).toMatchObject({
      annualMeanUsd: 2400,
      method: "available-table-unscaled",
    });
    expect(
      estimateLivingCostsCategoryAnnual(undefined, region, size),
    ).toMatchObject({
      annualMeanUsd: 3600,
      method: "available-table-unscaled",
    });
    expect(
      estimateLivingCostsCategoryAnnual(undefined, undefined, size),
    ).toMatchObject({
      annualMeanUsd: 2400,
      method: "available-table-unscaled",
    });
    expect(
      estimateLivingCostsCategoryAnnual(undefined, undefined, undefined),
    ).toBeNull();
  });
  it("does not extrapolate beyond five-or-more or accept a fabricated household count", () => {
    expect(estimatedMonthlyHouseholdLivingCosts("south", 5).monthlyMinor).toBe(
      estimatedMonthlyHouseholdLivingCosts("south", 12).monthlyMinor,
    );
    expect(() => estimatedMonthlyHouseholdLivingCosts("south", 0)).toThrow();
    expect(() => estimatedMonthlyHouseholdLivingCosts("south", 1.5)).toThrow();
  });
});
