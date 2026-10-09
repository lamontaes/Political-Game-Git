import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { annualizedRecordedPayMinor } from "../../simulation/household-pay";
import { annualizedPayMinorFromFacts } from "./annualized-pay";

const places = lifePlaceStateIdentities();
const cadences = [
  ["weekly", 52],
  ["biweekly", 26],
  ["semimonthly", 24],
  ["monthly", 12],
] as const;

describe("annualized recorded pay rule", () => {
  it.each(places)(
    "matches legacy annualization in $jurisdictionKey",
    (place) => {
      const index = places.indexOf(place);
      const amountMinor = 1_237 + index * 101;
      for (const [cadence, periodsPerYear] of cadences) {
        expect(annualizedPayMinorFromFacts(amountMinor, periodsPerYear)).toBe(
          annualizedRecordedPayMinor(amountMinor, cadence),
        );
      }
    },
  );

  it("returns no estimate when the cadence has no selected frequency", () => {
    expect(annualizedPayMinorFromFacts(10_000, null)).toBeNull();
    expect(annualizedRecordedPayMinor(10_000, "daily")).toBeNull();
  });
});
