import { describe, expect, it } from "vitest";
import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import { daysBetween, makeIsoDate } from "./dates";
import { STATES } from "./state-reference";
import {
  candidateFilingTerms,
  filingDeadlineBefore,
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

  it("dates a local race's deadline before its own election, in all 56 places", () => {
    const places = nominationRules.places as Record<
      string,
      { readonly filing?: { readonly daysBeforePrimary?: number | null } }
    >;
    // A spring election, where the shared June 1 estimate fell after it.
    const election = makeIsoDate("2026-04-02");
    let read = 0;
    for (const usps of Object.keys(STATES)) {
      const deadline = filingDeadlineBefore(usps, election);
      expect(deadline.date < election, usps).toBe(true);
      expect(daysBetween(deadline.date, election), usps).toBe(
        deadline.daysBeforeElection,
      );
      expect(deadline.estimatedFrom.length, usps).toBeGreaterThan(0);
      const lead = places[`US-${usps}`]?.filing?.daysBeforePrimary;
      if (typeof lead === "number") {
        expect(deadline.daysBeforeElection, usps).toBe(lead);
        read += 1;
      }
    }
    // The FEC compilation covers the 50 states, D.C. and Guam; the other
    // territories take the median lead.
    expect(read).toBe(52);
    expect(filingDeadlineBefore("AS", election).estimatedFrom).toMatch(
      /median candidate filing lead/i,
    );
  });
});
