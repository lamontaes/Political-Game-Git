/**
 * Audit 2, item 6: independents file on their own terms, and fees and
 * signature counts written as formulas are worked out from the race.
 */
import { describe, expect, it } from "vitest";
import { filingRequirements } from "./modules/elections";
import { feeFromFormula, signaturesFromFormula } from "./filing-formulas";
import { officeSalary } from "./filing-context";

describe("filing formulas and independent terms", () => {
  it("reads fees from a share of salary and signatures from a share of voters", () => {
    expect(
      feeFromFormula("2% of the first year's salary", 253_000, 4)?.value,
    ).toBe(5060);
    expect(
      feeFromFormula(
        "$50 + 1/8 of 1% of the total salary for the full term",
        80_000,
        4,
      )?.value,
    ).toBe(450);
    expect(
      feeFromFormula(
        "1% of the office's annual salary (waived if $500 or less)",
        40_000,
        4,
      )?.value,
    ).toBe(0);
    expect(
      feeFromFormula("set by charter (commonly $0-$50)", null, null),
    ).toMatchObject({ value: 25, estimate: true });
    expect(
      signaturesFromFormula(
        "1% of votes cast for the office at the last election or 7,500, whichever is less",
        {
          votesCast: 2_000_000,
          registered: 2_500_000,
        },
      )?.value,
    ).toBe(7500);
    expect(
      signaturesFromFormula(
        "5% of active registered voters in the district, capped at 10,000",
        {
          votesCast: 100_000,
          registered: 120_000,
        },
      )?.value,
    ).toBe(6000);
  });

  it("gives an independent the independent route, and a formula fee its worked-out amount", () => {
    const salary = officeSalary("US-CA", "governor")!;
    const party = filingRequirements("US-CA", "statewideExecutive", "party", {
      salary: salary.dollars,
      termYears: 4,
      votesCast: 15_000_000,
    });
    // California's governor: 2% of the first year's salary, not free.
    expect(party.feeMinor).toBe(Math.round(salary.dollars * 0.02 * 100));
    const independent = filingRequirements(
      "US-TX",
      "statewideExecutive",
      "independent",
      {
        salary: 153_750,
        termYears: 4,
        votesCast: 8_000_000,
      },
    );
    // Texas: an independent pays no fee and petitions with 1% of the governor's vote.
    expect(independent.feeMinor).toBe(0);
    expect(independent.signatures).toBe(80_000);
    expect(independent.deadline).toBe("2026-06-25");
  });
});
