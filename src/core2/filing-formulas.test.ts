/**
 * Audit 2, item 6: independents file on their own terms, and signature
 * counts written as formulas are worked out from the race. No one pays to
 * file (owner, Oct 13).
 */
import { describe, expect, it } from "vitest";
import { filingRequirements } from "./modules/elections";
import { signaturesFromFormula } from "./filing-formulas";
import { officeSalary } from "./filing-context";

describe("filing formulas and independent terms", () => {
  it("reads signatures from a share of voters", () => {
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

  it("reads per-district petitions and lesser-of counts", () => {
    expect(
      signaturesFromFormula(
        "1,500 from each congressional district (or 30% of party assembly delegates instead)",
        {
          votesCast: 3_000_000,
          registered: 3_500_000,
          districts: 8,
        },
      )?.value,
    ).toBe(12_000);
    expect(
      signaturesFromFormula(
        "1,500 or 10% of votes cast in the last party primary for the office, whichever is less",
        {
          votesCast: 10_000,
          registered: 12_000,
        },
      )?.value,
    ).toBe(1000);
  });

  it("gives an independent the independent route, and drops a petition that only stood in for a fee", () => {
    const salary = officeSalary("US-CA", "governor")!;
    const party = filingRequirements("US-CA", "statewideExecutive", "party", {
      salary: salary.dollars,
      termYears: 4,
      votesCast: 15_000_000,
    });
    // A fee of 2% of the first year's salary, or a petition in its place:
    // with no fee there is nothing to petition for.
    expect(party).not.toHaveProperty("feeMinor");
    expect(party.signatures).toBeNull();
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
    // An independent with no fee petitions with 1% of the governor's vote.
    expect(independent.signatures).toBe(80_000);
    expect(independent.deadline).toBe("2026-06-25");
  });

  it("a statewide route that is a petition alone keeps it; a county office that took a fee files free (PLAY's report)", () => {
    const co = filingRequirements("US-CO", "statewideExecutive", "party", {
      salary: 174_000,
      termYears: 6,
      votesCast: 3_200_000,
      districts: 8,
    });
    expect(co.signatures).toBe(12_000);
    const ms = filingRequirements("US-MS", "countyOffice", "party", {
      salary: 40_000,
      termYears: 4,
      votesCast: 10_000,
    });
    expect(ms).not.toHaveProperty("feeMinor");
    expect(ms.signatures).toBeNull();
  });
});
