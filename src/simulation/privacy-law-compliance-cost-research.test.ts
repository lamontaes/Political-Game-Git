import { describe, expect, it } from "vitest";
import research from "../../data/research/money/privacy-law-compliance-cost-ccpa-2019.json" with { type: "json" };

describe("privacy law compliance cost research row (A28)", () => {
  it("reads back the CCPA assessment's per-firm initial cost by firm size", () => {
    const central = research.centralEstimate;
    expect(central.page).toBe(11);
    expect(
      central.bySize.map((row) => [row.sizeClass, row.dollarsPerFirm]),
    ).toEqual([
      ["fewer-than-20-employees", 50_000],
      ["20-to-100-employees", 100_000],
      ["100-to-500-employees", 450_000],
      ["more-than-500-employees", 2_000_000],
    ]);
    // Each figure appears in the verbatim quote it was read from.
    for (const text of ["$50,000", "$100,000", "$450,000", "$2 million"]) {
      expect(central.quote).toContain(text);
    }
    expect(research.source.url).toMatch(/^https:\/\/dof\.ca\.gov\//);
  });

  it("places 100 and 500 employees in the SUSB 100-499 band at $450,000", () => {
    const central = research.centralEstimate;
    const classesFor = (employees: number) =>
      central.bySize.filter(
        (row) =>
          employees >= row.minEmployees &&
          (row.maxEmployees === null || employees <= row.maxEmployees),
      );
    for (const employees of [1, 19, 20, 99, 100, 101, 499, 500, 501, 10_000]) {
      expect(classesFor(employees), `${employees} employees`).toHaveLength(1);
    }
    expect(classesFor(99).map((row) => row.dollarsPerFirm)).toEqual([100_000]);
    expect(classesFor(100).map((row) => row.dollarsPerFirm)).toEqual([450_000]);
    expect(classesFor(500).map((row) => row.dollarsPerFirm)).toEqual([450_000]);
    expect(classesFor(501).map((row) => row.dollarsPerFirm)).toEqual([
      2_000_000,
    ]);
    const convention = central.bandConvention;
    expect(convention.status).toBe("approved");
    expect(convention.source).toContain("Statistics of U.S. Businesses");
    expect(convention.susbBands).toContain("03: 20-99 employees");
    expect(convention.susbBands).toContain("04: 100-499 employees");
    expect("unresolvedBoundaries" in central).toBe(false);
    // The SRIA's printed bands stay as evidence, verbatim from its quote.
    expect(convention.printedSriaBands.map((band) => band.band)).toEqual([
      "medium-sized firms (20-100 employees)",
      "medium/large firms (100-500 employees)",
      "firms with greater than 500 employees",
    ]);
    for (const band of convention.printedSriaBands) {
      expect(central.quote).toContain(band.band);
    }
  });

  it("charges only organizations above the $25 million CCPA revenue threshold, marked ESTIMATED", () => {
    const applicability = research.centralEstimate.applicability;
    expect(applicability.label).toBe("ESTIMATED");
    expect(applicability.revenueThresholdDollars).toBe(25_000_000);
    expect(applicability.citation).toContain("1798.140(d)(1)(A)");
    expect(applicability.quote).toContain(
      "annual gross revenues in excess of twenty-five million dollars ($25,000,000)",
    );
    expect(applicability.rule).toContain("below that there is no charge");
  });

  it("lists the recurring cost as unread", () => {
    expect(research.unread.map((gap) => gap.what)).toContain(
      "Ongoing yearly compliance cost per firm",
    );
  });

  it("keeps the economy-wide total and every range as a check, not a draw", () => {
    expect(research.economyWide.totalInitialDollars).toBe(55_000_000_000);
    expect(research.economyWide.shareOfStateGrossProduct).toBe(0.018);
    expect(research.economyWide.quote).toContain("approximately $55 billion");
    expect(research.economyWide.quote).toContain("1.8%");
    expect(research.checksOnly.note).toContain("never a draw");
    expect(research.checksOnly.regulationOnlyCosts.quote).toContain("16,454.2");
    expect(research.unread.length).toBeGreaterThan(0);
  });
});
