import { describe, expect, it } from "vitest";

import {
  assessCandidateQualification,
  candidateQualificationRuleSet,
} from "./candidate-qualification";
import { makeIsoDate } from "./dates";

describe("candidate qualification rules", () => {
  const rules = candidateQualificationRuleSet(
    "us-ak-legislature-v1:candidacy",
    "us-ak-legislature-v1:senate",
  );

  it("passes every implemented field when the exact facts prove them", () => {
    if (!rules) throw new Error("Missing Alaska Senate qualification rules.");
    expect(
      assessCandidateQualification(rules, {
        birthDate: makeIsoDate("1980-04-12"),
        onDate: makeIsoDate("2026-11-03"),
        stateResidenceSince: makeIsoDate("2020-01-01"),
        districtResidenceSince: makeIsoDate("2024-01-01"),
      }),
    ).toEqual({
      qualifies: true,
      ruleSetId: "us-ak-senate-qualifications-v1",
      refusals: [],
    });
  });

  it("returns field-specific, sourced refusals without a near-miss score", () => {
    if (!rules) throw new Error("Missing Alaska Senate qualification rules.");
    const result = assessCandidateQualification(rules, {
      birthDate: makeIsoDate("2004-12-01"),
      onDate: makeIsoDate("2026-11-03"),
      stateResidenceSince: makeIsoDate("2025-01-01"),
      districtResidenceSince: null,
    });
    expect(result.qualifies).toBe(false);
    expect(result.refusals.map((refusal) => refusal.kind)).toEqual([
      "minimum-age",
      "state-residence",
      "district-residence",
    ]);
    for (const refusal of result.refusals) {
      expect(refusal.reason.trim().length).toBeGreaterThan(0);
      expect(refusal.source?.sourceUrl).toBe(
        "https://ltgov.alaska.gov/information/alaskas-constitution/",
      );
    }
  });
});
