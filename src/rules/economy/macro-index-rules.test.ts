import { describe, expect, it } from "vitest";
import {
  annualizedQuarterlyGrowthPct as legacyAnnualizedGrowth,
  twelveMonthChangePct as legacyTwelveMonthChange,
} from "../../simulation/macro-economy/kernel";
import { STATES } from "../../simulation/state-reference";
import {
  annualizedQuarterlyGrowthPct,
  roundMacro,
  twelveMonthChangePct,
} from "./macro-index-rules";

describe("standalone macro index rules", () => {
  it.each(Object.keys(STATES))(
    "matches published index math for US-%s",
    (usps) => {
      const previousIndex = 90 + usps.charCodeAt(0) / 100;
      const quarterIndex = previousIndex * (0.96 + usps.charCodeAt(1) / 1000);
      const yearAgoIndex = previousIndex * 0.98;
      const currentPriceIndex =
        yearAgoIndex * (0.97 + usps.charCodeAt(0) / 1000);
      expect(annualizedQuarterlyGrowthPct(quarterIndex, previousIndex)).toBe(
        legacyAnnualizedGrowth(quarterIndex, previousIndex),
      );
      expect(twelveMonthChangePct(currentPriceIndex, yearAgoIndex)).toBe(
        legacyTwelveMonthChange(currentPriceIndex, yearAgoIndex),
      );
    },
  );

  it("rounds to the persisted precision and removes negative zero", () => {
    expect(roundMacro(-0.0000001)).toBe(0);
    expect(roundMacro(1.23456789)).toBe(1.234568);
  });
});
