import { describe, expect, it } from "vitest";

import {
  CANDIDATE_QUALIFICATION_RULE_SETS,
  assessCandidateQualification,
  candidateQualificationRuleSet,
} from "./candidate-qualification";
import { makeIsoDate } from "./dates";

describe("candidate qualification rules", () => {
  const rules = candidateQualificationRuleSet(
    "us-ak-legislature-v1:candidacy",
    "us-ak-legislature-v1:senate",
    makeIsoDate("2026-11-03"),
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

/**
 * Provenance travels with the rule set, not with whichever state was
 * researched first. These are the assertions that fail if a second state's
 * rows are ever attributed to Alaska's constitution, or gated on Alaska's
 * retrieval date.
 */
describe("a second state's rules cite their own instrument", () => {
  it("every shipped rule set carries its own source, and its values agree with it", () => {
    expect(CANDIDATE_QUALIFICATION_RULE_SETS.length).toBeGreaterThan(0);
    for (const set of CANDIDATE_QUALIFICATION_RULE_SETS) {
      expect(set.source.legalLocator).not.toBe("");
      for (const field of [
        set.minimumAge,
        set.stateResidenceYears,
        set.districtResidenceYears,
        set.termYears,
      ]) {
        if (field.state === "KNOWN" || field.state === "NO_REQUIREMENT_FOUND") {
          // Not merely "has a source": the value's source must be the set's
          // own, which is what a shared helper silently got wrong.
          expect(field.source).toBe(set.source);
        }
      }
    }
  });

  it("a set observed later than the save's date is unknown, on its own date", () => {
    const set = CANDIDATE_QUALIFICATION_RULE_SETS[0]!;
    const before = makeIsoDate("2020-01-01");
    const gated = candidateQualificationRuleSet(
      set.candidacyPackId,
      set.officeKey,
      before,
    );
    if (!gated) throw new Error("Missing the rule set under test.");
    expect(gated.minimumAge.state).toBe("UNKNOWN");
    if (gated.minimumAge.state !== "UNKNOWN") return;
    // Its own locator and its own observation date, not another state's.
    expect(gated.minimumAge.reason).toContain(set.source.legalLocator);
    expect(gated.minimumAge.reason).toContain(set.source.observedCurrentOn);
  });

  it("an unread rule refuses rather than passing, and a sourced absence does not refuse", () => {
    const set = CANDIDATE_QUALIFICATION_RULE_SETS[0]!;
    const unread = candidateQualificationRuleSet(
      set.candidacyPackId,
      set.officeKey,
      makeIsoDate("2020-01-01"),
    );
    if (!unread) throw new Error("Missing the rule set under test.");
    const assessment = assessCandidateQualification(unread, {
      birthDate: makeIsoDate("1970-01-01"),
      onDate: makeIsoDate("2020-01-01"),
      stateResidenceSince: makeIsoDate("1970-01-01"),
      districtResidenceSince: makeIsoDate("1970-01-01"),
    });
    // Unknown is not permission: an old-enough, long-resident candidate is
    // still refused, because the rule was never read for that date.
    expect(assessment.qualifies).toBe(false);
    expect(
      assessment.refusals.every(
        (refusal) => refusal.kind === "unresolved-rule",
      ),
    ).toBe(true);

    const sourcedAbsence = assessCandidateQualification(
      {
        ...set,
        districtResidenceYears: {
          state: "NO_REQUIREMENT_FOUND",
          source: set.source,
        },
      },
      {
        birthDate: makeIsoDate("1970-01-01"),
        onDate: makeIsoDate("2026-11-03"),
        stateResidenceSince: makeIsoDate("1970-01-01"),
        districtResidenceSince: null,
      },
    );
    // "Sourced: no such requirement" is an answer, so it raises no refusal
    // even with no district residence proved.
    expect(sourcedAbsence.qualifies).toBe(true);
  });
});
