import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { TOWN_MEDIAN_TENURE_BY_AGE } from "../../simulation/living-world/town-employment";
import { medianTenureYearsFromFacts } from "./employment-tenure";

const places = lifePlaceStateIdentities();

describe("median employment tenure selection", () => {
  it.each(places)(
    "selects the supplied age band in $jurisdictionKey",
    (place) => {
      const age = 18 + places.indexOf(place);
      const expected = TOWN_MEDIAN_TENURE_BY_AGE.find(
        ([ageBelow]) => age < ageBelow,
      )![1];
      expect(medianTenureYearsFromFacts(age, TOWN_MEDIAN_TENURE_BY_AGE)).toBe(
        expected,
      );
    },
  );

  it("uses the next band at a threshold and returns null without a matching row", () => {
    expect(
      medianTenureYearsFromFacts(20, [
        [20, 0.8],
        [Infinity, 1.5],
      ]),
    ).toBe(1.5);
    expect(medianTenureYearsFromFacts(30, [])).toBeNull();
  });
});
