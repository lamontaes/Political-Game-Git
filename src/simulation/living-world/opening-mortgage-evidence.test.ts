import { describe, expect, it } from "vitest";
import evidence from "../../../data/research/housing/acs-2024-owner-mortgage-age.json" with { type: "json" };
import { openingOwnerMortgageEvidence } from "./opening-mortgage-evidence";

describe("cited opening mortgage stock evidence", () => {
  it("preserves the official national totals across every age band", () => {
    expect(evidence.ageBands.reduce((sum, row) => sum + row.mortgaged, 0)).toBe(
      51_067_639,
    );
    expect(
      evidence.ageBands.reduce((sum, row) => sum + row.mortgageFree, 0),
    ).toBe(33_142_503);
    expect(evidence.sourceNationalRow.startsWith("0100000US|")).toBe(true);
    expect(evidence.limits).toContain(
      "does not report outstanding principal or remaining loan term",
    );
  });
  it.each(evidence.ageBands)("uses both owner statuses for $label", (band) => {
    const reading = openingOwnerMortgageEvidence(band.minAge)!;
    expect(reading.mortgagedOwners + reading.mortgageFreeOwners).toBe(
      band.mortgaged + band.mortgageFree,
    );
    expect(reading.mortgageShare).toBe(
      band.mortgaged / (band.mortgaged + band.mortgageFree),
    );
    expect(reading.sourceCells).toEqual([
      band.mortgagedCell,
      band.mortgageFreeCell,
    ]);
    if (band.maxAgeExclusive !== null) {
      expect(openingOwnerMortgageEvidence(band.maxAgeExclusive - 1)).toEqual(
        reading,
      );
      expect(
        openingOwnerMortgageEvidence(band.maxAgeExclusive)!.ageBand,
      ).not.toBe(band.label);
    }
  });
  it("does not fabricate an age band for unsupported ages", () => {
    expect(openingOwnerMortgageEvidence(14)).toBeNull();
    expect(openingOwnerMortgageEvidence(Number.NaN)).toBeNull();
    expect(openingOwnerMortgageEvidence(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
