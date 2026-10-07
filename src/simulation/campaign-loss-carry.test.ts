import { describe, expect, it } from "vitest";
import { STATES } from "./state-reference";
import {
  allowedLeftoverFundsUses,
  CAMPAIGN_MONEY_SOURCES,
} from "./campaign-money-sources";

describe("leftover campaign funds", () => {
  it("has an explicit legal-use row for all 56 jurisdictions", () => {
    expect(Object.keys(STATES)).toHaveLength(56);
    for (const code of Object.keys(STATES)) {
      const uses = allowedLeftoverFundsUses(`US-${code}`);
      expect(uses.length, code).toBeGreaterThan(0);
      expect(uses).not.toContain("personal-use");
    }
  });

  it("offers leftover funds as one source and keeps personal use out of the menu", () => {
    expect(CAMPAIGN_MONEY_SOURCES["leftover-funds"].status).toBe("built");
    expect(allowedLeftoverFundsUses("US-NY")).toContain("keep-for-future-race");
    expect(allowedLeftoverFundsUses("US-VA")).toContain("give-to-charity");
    expect(allowedLeftoverFundsUses("US-KY")).toEqual([
      "keep-for-future-race",
      "refund-donors",
    ]);
  });
});
