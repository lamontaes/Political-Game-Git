import { describe, expect, it } from "vitest";

import { OFFICE_PAY_META, statePayFor } from "./office-pay";

describe("what states pay for an office", () => {
  it("holds the governor's published salary", () => {
    expect(statePayFor("governor", "NY")?.annualDollars).toBe(250_000);
    expect(statePayFor("governor", "AL")?.annualDollars).toBe(131_800);
    expect(OFFICE_PAY_META.governors).toBeGreaterThanOrEqual(50);
  });

  it("holds a legislator's annual salary where the state pays one", () => {
    expect(statePayFor("state-legislator", "NY")?.annualDollars).toBe(142_000);
    expect(statePayFor("state-legislator", "TX")?.annualDollars).toBe(7_200);
  });

  it("holds a trial court judge's and a member of Congress's salary", () => {
    expect(statePayFor("trial-court-judge", "NY")?.annualDollars).toBe(210_900);
    expect(statePayFor("member-of-congress", "US")?.annualDollars).toBe(
      174_000,
    );
  });

  it("holds nothing, not zero, where the state pays no single annual salary", () => {
    // Utah pays by the legislative day, Vermont by the week during session,
    // Virginia a different salary in each chamber, New Mexico no salary.
    for (const state of ["UT", "VT", "VA", "NM"])
      expect(statePayFor("state-legislator", state)).toBeNull();
    expect(statePayFor("governor", "ZZ")).toBeNull();
  });
});
