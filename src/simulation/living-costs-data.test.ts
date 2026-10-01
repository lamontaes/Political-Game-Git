import { describe, expect, it } from "vitest";
import {
  LIVING_COSTS_SOURCE,
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
