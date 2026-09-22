import { describe, expect, it } from "vitest";

import {
  CANDIDATE_QUALIFICATION_RULE_SETS,
  assessCandidateQualification,
  candidateQualificationRuleSet,
  ruleSetApplicableOn,
} from "./candidate-qualification";
import { makeIsoDate } from "./dates";

/**
 * A rule set whose instrument states no commencement date.
 *
 * Built here rather than borrowed from a shipped set. These tests used to lean
 * on Alaska's `provisionEffectiveOn` being null, which made them quietly
 * dependent on a gap in the data: the moment the date was supplied they failed,
 * though the behaviour they check had not changed at all. The observation
 * fallback has to keep being exercised after every state has a date.
 */
function undatedRuleSet() {
  const set = CANDIDATE_QUALIFICATION_RULE_SETS[0]!;
  return {
    ...set,
    source: { ...set.source, provisionEffectiveOn: null },
  };
}

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
    const set = undatedRuleSet();
    const gated = ruleSetApplicableOn(set, makeIsoDate("2020-01-01"));
    expect(gated.minimumAge.state).toBe("UNKNOWN");
    if (gated.minimumAge.state !== "UNKNOWN") return;
    // Its own locator and its own observation date, not another state's.
    expect(gated.minimumAge.reason).toContain(set.source.legalLocator);
    expect(gated.minimumAge.reason).toContain(set.source.observedCurrentOn);
  });

  it("an unread rule refuses rather than passing, and a sourced absence does not refuse", () => {
    const set = undatedRuleSet();
    const unread = ruleSetApplicableOn(set, makeIsoDate("2020-01-01"));
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

/**
 * A known commencement date is a stronger fact than a retrieval date, and the
 * gate has to prefer it — otherwise researching one is pointless, because the
 * refusal would survive the answer.
 */
describe("a rule that states when it took effect is governed by that date", () => {
  const set = CANDIDATE_QUALIFICATION_RULE_SETS[0]!;

  it("opens Alaska on an ordinary start date, which is what this unblocked", () => {
    // The whole point of the commencement fix, stated as the outcome a player
    // would see: a lifelong Sitka resident filing on 2026-01-05, eight months
    // before the constitution was read, is assessed rather than refused.
    const onDate = makeIsoDate("2026-01-05");
    const gated = candidateQualificationRuleSet(
      set.candidacyPackId,
      set.officeKey,
      onDate,
    );
    if (!gated) throw new Error("Missing the rule set under test.");
    expect(gated.minimumAge.state).toBe("KNOWN");
    expect(
      assessCandidateQualification(gated, {
        birthDate: makeIsoDate("1980-04-12"),
        onDate,
        stateResidenceSince: makeIsoDate("1980-04-12"),
        districtResidenceSince: makeIsoDate("1980-04-12"),
      }).qualifies,
    ).toBe(true);
  });

  it("applies on a date before the instrument was read, once commencement is known", () => {
    const dated = {
      ...set,
      source: {
        ...set.source,
        provisionEffectiveOn: makeIsoDate("1959-01-03"),
      },
    };
    // 2026-01-05 is long before the 2026-09-06 retrieval, and would be refused
    // on observation alone. With a commencement in 1959 it is simply in force.
    expect(
      ruleSetApplicableOn(dated, makeIsoDate("2026-01-05")).minimumAge.state,
    ).toBe("KNOWN");
  });

  it("still refuses a date before the instrument itself took effect", () => {
    const dated = {
      ...set,
      source: {
        ...set.source,
        provisionEffectiveOn: makeIsoDate("1959-01-03"),
      },
    };
    const before = ruleSetApplicableOn(dated, makeIsoDate("1958-06-01"));
    expect(before.minimumAge.state).toBe("UNKNOWN");
    if (before.minimumAge.state !== "UNKNOWN") return;
    expect(before.minimumAge.reason).toContain("1959-01-03");
    // The weaker observation sentence must not be the one shown when the
    // stronger fact is what decided it.
    expect(before.minimumAge.reason).not.toContain(
      "observed in the acquired source",
    );
  });

  it("falls back to the retrieval date only while commencement is unknown", () => {
    const set = undatedRuleSet();
    expect(set.source.provisionEffectiveOn).toBeNull();
    const before = ruleSetApplicableOn(set, makeIsoDate("2020-01-01"));
    expect(before.minimumAge.state).toBe("UNKNOWN");
    if (before.minimumAge.state !== "UNKNOWN") return;
    expect(before.minimumAge.reason).toContain(
      "observed in the acquired source",
    );
  });
});
