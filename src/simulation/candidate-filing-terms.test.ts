import { describe, expect, it } from "vitest";
import { STATES } from "./state-reference";
import {
  candidateFilingTerms,
  filingTermsCoverage,
  type FilingOfficeFamily,
} from "./candidate-filing-terms";

const FAMILIES: readonly FilingOfficeFamily[] = [
  "statewideExecutive",
  "stateLegislative",
  "federalLegislative",
  "local",
];

describe("candidate filing terms", () => {
  it("returns nonblank terms for every office family in all 56 places", () => {
    const places = Object.keys(STATES);
    expect(places).toHaveLength(56);
    expect(filingTermsCoverage()).toEqual(places);

    for (const usps of places) {
      for (const family of FAMILIES) {
        const terms = candidateFilingTerms(usps, family);
        expect(terms.feeMinorUnits).toBeGreaterThanOrEqual(0);
        expect(
          typeof terms.signatures === "number"
            ? terms.signatures
            : terms.signatures.percent,
        ).toBeGreaterThan(0);
        expect(terms.deadline).toMatch(/^\d{2}-\d{2}$/);
        expect(terms.estimatedFrom).not.toBe("");
      }
    }
  });

  it("marks unread terms as estimates instead of refusing the place", () => {
    expect(candidateFilingTerms("AS", "local")).toMatchObject({
      estimated: true,
      estimatedFrom: "Median of read filing terms for the same office family",
    });
  });

  it("rejects a place outside the supported 56 instead of borrowing a rule", () => {
    expect(() => candidateFilingTerms("ZZ", "local")).toThrow(
      "Unsupported filing place: ZZ",
    );
  });
});
