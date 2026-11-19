import { describe, expect, it } from "vitest";
import { fertilityAt } from "./births-plan";
import renewalParameters from "./data/renewal/parameters.json" with { type: "json" };

// Pins 23, rows 12 and 13 (Nov 17): the only age term in a birth plan or an
// exposure is the body's own curve, falling with age. No published center
// and no peak-year timing pull set it.
describe("the age pull toward a child is the body's own curve", () => {
  const half = renewalParameters.renewalFertilityHalfAge.value;
  const width = renewalParameters.renewalFertilityWidth.value;
  it("falls with every year of age and is one half at its half age", () => {
    expect(fertilityAt(half, half, width)).toBeCloseTo(0.5, 12);
    for (let age = 18; age < 49; age += 1)
      expect(fertilityAt(age + 1, half, width)).toBeLessThan(
        fertilityAt(age, half, width),
      );
  });
  it("no published center, spread or timing peak is left in the plan's rows", () => {
    for (const key of [
      "renewalAgeCenter",
      "renewalAgeSpread",
      "renewalTimingPeakYears",
      "renewalTimingWeight",
    ])
      expect(Object.keys(renewalParameters), key).not.toContain(key);
  });
});
