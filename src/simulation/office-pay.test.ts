import { describe, expect, it } from "vitest";

import type { World } from "./types";
import { estimatedStatePay, OFFICE_PAY_META, statePayFor } from "./office-pay";

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

  it("holds California's newer legislator salary in place of the 2023 table's", () => {
    // $128,215 since December 4, 2023; the Book of the States 2023 shows $122,694.
    expect(statePayFor("state-legislator", "CA")?.annualDollars).toBe(128_215);
    expect(OFFICE_PAY_META.newerThanTables).toEqual([
      expect.objectContaining({
        office: "state-legislator",
        state: "CA",
        annualDollars: 128_215,
        effectiveFrom: "2023-12-04",
      }),
    ]);
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

  it("estimates from the average, never zero, where the tables give no salary", () => {
    const world = (seed: string) => ({ seed }) as unknown as World;
    const utah = estimatedStatePay(world("a"), "state-legislator", "UT")!;
    expect(utah.basis).toMatch(
      /^ESTIMATED FROM AVERAGE: .*ranked by Census region/,
    );
    // An annual estimate from actual same-office salaries, never a pay law.
    expect(utah.annualDollars).toBeGreaterThan(20_000);
    expect(utah.annualDollars).toBeLessThan(75_000);
    expect(utah.annualDollars % 100).toBe(0);
    // The same sourced estimate across all worlds; no seed chooses pay.
    expect(estimatedStatePay(world("a"), "state-legislator", "UT")).toEqual(
      utah,
    );
    const others = new Set(
      ["b", "c", "d", "e", "f"].map(
        (seed) =>
          estimatedStatePay(world(seed), "state-legislator", "UT")!
            .annualDollars,
      ),
    );
    expect(others.size).toBe(1);
    expect(utah.basis).toContain("not statutory salary authority");
    // A territory without sourced CPS income gets an actual same-office mean.
    const territory = estimatedStatePay(world("a"), "state-legislator", "AS")!;
    expect(territory.basis).toContain("same-office plain mean");
    expect(estimatedStatePay(world("b"), "state-legislator", "AS")).toEqual(
      territory,
    );
    // Congress is set by statute, never estimated.
    expect(
      estimatedStatePay(world("a"), "member-of-congress", "US"),
    ).toBeNull();
  });
});
