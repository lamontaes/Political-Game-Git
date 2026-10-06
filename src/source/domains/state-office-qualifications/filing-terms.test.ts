import { describe, expect, it } from "vitest";
import filingData from "../../../../data/research/elections/candidate-filing-terms.json" with { type: "json" };
import { compileFilingTerms } from "./compile";
import { estimatedFilingTerms } from "./normalize";
import type { OfficeFamily } from "./types";
import { validateCandidateFilingTerms } from "./validate";

const officeFamilies = filingData.officeFamilies as readonly OfficeFamily[];

describe("candidate filing terms", () => {
  it("compiles nonblank terms for every office family in all 56 places", () => {
    expect(filingData.places).toHaveLength(56);
    const terms = compileFilingTerms();
    expect(terms).toHaveLength(56 * officeFamilies.length);

    for (const place of filingData.places) {
      for (const family of officeFamilies) {
        const row = terms.find(
          (candidate) =>
            candidate.jurisdictionKey === place.jurisdictionKey &&
            candidate.officeFamily === family,
        );
        expect(row, `${place.jurisdictionKey}/${family}`).toBeDefined();
        expect(row!.circulationOpenDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(row!.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const signatures =
          row!.signatureRequirement.kind === "COUNT"
            ? row!.signatureRequirement.count
            : row!.signatureRequirement.percent;
        expect(row!.filingFeeCents > 0 || signatures > 0).toBe(true);
        if (row!.signatureRequirement.kind === "PERCENT_OF_NAMED_BASE") {
          expect(row!.signatureRequirement.namedBase.trim()).not.toBe("");
        }
        if (row!.estimated) {
          expect(row!.estimatedFrom?.length).toBeGreaterThan(0);
        } else {
          expect(row!.estimatedFrom).toBeNull();
        }
      }
    }
    expect(validateCandidateFilingTerms(terms)).toEqual([]);
  });

  it.each([
    ["Provo", 250, 7_500],
    ["Temple", 25, 10_000],
    ["Lycoming", 100, 2_500],
  ] as const)("reads the %s seed example exactly", (place, signatures, fee) => {
    for (const family of officeFamilies) {
      const terms = estimatedFilingTerms(place, family);
      expect(terms.filingFeeCents).toBe(fee);
      expect(terms.signatureRequirement).toEqual({
        kind: "COUNT",
        count: signatures,
      });
      expect(terms.estimated).toBe(false);
      expect(terms.estimatedFrom).toBeNull();
    }
  });

  it("uses same-family population-band donors only when three are read", () => {
    const estimated = estimatedFilingTerms("US-AL", "GOVERNOR");
    expect(estimated.estimated).toBe(true);
    expect(estimated.estimatedFrom).toHaveLength(3);
    expect(estimated.filingFeeCents).toBe(7_500);
    expect(estimated.signatureRequirement).toEqual({
      kind: "COUNT",
      count: 100,
    });
  });
});
