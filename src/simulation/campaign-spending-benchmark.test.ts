import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_SPENDING_RESEARCH_REFERENCE,
  comparableCampaignSpendFromRecords,
} from "./campaign-spending-benchmark";

describe("campaign spending comparisons", () => {
  it("uses the median of recorded races within a similar household count", () => {
    expect(
      comparableCampaignSpendFromRecords(1_000, [
        { households: 400, amountMinorUnits: 100_000 },
        { households: 1_200, amountMinorUnits: 250_000 },
        { households: 2_000, amountMinorUnits: 900_000 },
        { households: 4_000, amountMinorUnits: 1_000_000 },
      ]),
    ).toBe(250_000);
  });

  it("has no recorded comparison outside the matching size band and exposes a research fallback", () => {
    expect(
      comparableCampaignSpendFromRecords(1_000, [
        { households: 10_000, amountMinorUnits: 99 },
      ]),
    ).toBeNull();
    expect(CAMPAIGN_SPENDING_RESEARCH_REFERENCE).toMatchObject({
      amountMinorUnits: 3_266_500,
      estimated: true,
    });
  });
});
