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
