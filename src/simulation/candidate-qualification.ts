import { ageOnDate } from "./dates";
import type { IsoDate } from "./types";

/** The four research states kept distinct all the way into the consumer. */
export type QualificationValue<T> =
  | {
      readonly state: "KNOWN";
      readonly value: T;
      readonly source: QualificationSourceRef;
    }
  | { readonly state: "UNKNOWN"; readonly reason: string }
  | {
      readonly state: "NO_REQUIREMENT_FOUND";
      readonly source: QualificationSourceRef;
    }
  | { readonly state: "NOT_APPLICABLE"; readonly reason: string };

export interface QualificationSourceRef {
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly legalLocator: string;
  readonly retrievedAt: string;
  /** Unknown here; retrieval is not substituted for legal commencement. */
  readonly provisionEffectiveOn: IsoDate | null;
  /** Date on which the acquired source was observed carrying this text. */
  readonly observedCurrentOn: IsoDate;
  /** The research row that led to this first-party verification. */
  readonly researchLineage: string;
}

export interface CandidateQualificationRuleSet {
  readonly ruleSetId: string;
  /**
   * The instrument this set's rules were read from.
   *
   * Declared per rule set rather than shared, because provenance is the one
   * thing that must never be inherited from whichever state happened to be
   * researched first. A second state's rows attributed to Alaska's
   * constitution would be a sourcing error the game states as fact.
   */
  readonly source: QualificationSourceRef;
  readonly candidacyPackId: string;
  readonly officeKey: string;
  readonly jurisdictionKey: string;
  readonly minimumAge: QualificationValue<number>;
  readonly stateResidenceYears: QualificationValue<number>;
  readonly districtResidenceYears: QualificationValue<number>;
  readonly termYears: QualificationValue<number>;
}

const AK_CONSTITUTION: QualificationSourceRef = {
  sourceTitle: "The Constitution of the State of Alaska",
  sourceUrl: "https://ltgov.alaska.gov/information/alaskas-constitution/",
  legalLocator: "Alaska Const. art. II, §§ 2–3",
  retrievedAt: "2026-09-06T18:45:27.267Z",
  // The constitution "became operative with the formal Proclamation of
  // Statehood on January 3, 1959", in the publisher's own words, on the page
  // already held at data/source/state-legislatures/raw/ak-constitution.html.
  //
  // That date governs THESE TWO SECTIONS only because their present words are
  // the original ones, and the evidence for that is the publisher's own
  // convention rather than an absence we are reading hopefully: the edition
  // marks an amended section with a bracketed year, and Article II's body
  // carries three such markers — 1984 on § 5 and 1976 twice — while §§ 2 and 3
  // carry none. A convention that is demonstrably applied inside this very
  // article, and applied to neighbours of these sections, makes its silence
  // here evidence. Without that check the date would be convenient rather than
  // honest, and a convenient date is exactly what ruleSetApplicableOn exists to
  // keep out.
  provisionEffectiveOn: "1959-01-03" as IsoDate,
  observedCurrentOn: "2026-09-06" as IsoDate,
  researchLineage: "31A Alaska legislative-office qualification rows",
};

function known<T>(
  value: T,
  source: QualificationSourceRef,
): QualificationValue<T> {
  return { state: "KNOWN", value, source };
}

export const CANDIDATE_QUALIFICATION_RULE_SETS: readonly CandidateQualificationRuleSet[] =
  [
    {
      ruleSetId: "us-ak-house-qualifications-v1",
      source: AK_CONSTITUTION,
      candidacyPackId: "us-ak-legislature-v1:candidacy",
      officeKey: "us-ak-legislature-v1:house",
      jurisdictionKey: "US-AK",
      minimumAge: known(21, AK_CONSTITUTION),
      stateResidenceYears: known(3, AK_CONSTITUTION),
      districtResidenceYears: known(1, AK_CONSTITUTION),
      termYears: known(2, AK_CONSTITUTION),
    },
    {
      ruleSetId: "us-ak-senate-qualifications-v1",
      source: AK_CONSTITUTION,
      candidacyPackId: "us-ak-legislature-v1:candidacy",
      officeKey: "us-ak-legislature-v1:senate",
      jurisdictionKey: "US-AK",
      minimumAge: known(25, AK_CONSTITUTION),
      stateResidenceYears: known(3, AK_CONSTITUTION),
      districtResidenceYears: known(1, AK_CONSTITUTION),
      termYears: known(4, AK_CONSTITUTION),
    },
  ];

export function candidateQualificationRuleSet(
  candidacyPackId: string,
  officeKey: string,
  onDate: IsoDate,
): CandidateQualificationRuleSet | null {
  const rules =
    CANDIDATE_QUALIFICATION_RULE_SETS.find(
      (rules) =>
        rules.candidacyPackId === candidacyPackId &&
        rules.officeKey === officeKey,
    ) ?? null;
  return rules === null ? null : ruleSetApplicableOn(rules, onDate);
}

/**
 * The same rule set, with any field the evidence cannot place on `onDate`
 * turned to UNKNOWN.
 *
 * Separated from the lookup above so the dating rule can be exercised on a set
 * this build does not ship. Otherwise it could only ever be tested against
 * Alaska's two, and the behaviour that matters is what happens to the next
 * state's.
 */
export function ruleSetApplicableOn(
  rules: CandidateQualificationRuleSet,
  onDate: IsoDate,
): CandidateQualificationRuleSet {
  // Two different questions, asked in the right order.
  //
  // If the instrument's own commencement is known, that is the fact: the words
  // applied from that day, whenever we happened to read them. Only when it is
  // unknown do we fall back to the weaker claim, that we can vouch for the text
  // no earlier than the day we saw it. The same distinction the sourced
  // qualification corpus draws between an EXACT_INTERVAL and a bare
  // CURRENT_OBSERVATION — one discipline, kept the same in both files.
  //
  // Each set is gated on ITS OWN instrument. Reading one state's dates against
  // another state's rows would either hide a stale rule or refuse a sound one.
  //
  // `legalLocator` is deliberately NOT destructured here. It stays on
  // `rules.source`, where a reviewer and the diagnostics surfaces can still
  // read it, and it must not reach the refusal sentences below: a player
  // never sees which provision a refusal rests on. If you find yourself
  // adding it back, the thing you want is `rules.source.legalLocator` in a
  // record or a diagnostics view, not in prose.
  const { observedCurrentOn, provisionEffectiveOn } = rules.source;
  if (provisionEffectiveOn !== null) {
    if (onDate >= provisionEffectiveOn) return rules;
    const unknownBefore = (field: string): QualificationValue<number> => ({
      state: "UNKNOWN",
      reason: `The game knows this office's ${field} rule, but that rule did not yet apply this early, and it won't apply a rule to a time it can't place it in. A life that starts later may be able to run here.`,
    });
    return {
      ...rules,
      minimumAge: unknownBefore("minimum age"),
      stateResidenceYears: unknownBefore("state residence"),
      districtResidenceYears: unknownBefore("district residence"),
      termYears: unknownBefore("term length"),
    };
  }
  if (onDate >= observedCurrentOn) return rules;
  const unavailable = (field: string): QualificationValue<number> => ({
    state: "UNKNOWN",
    reason: `The game knows this office's ${field} rule as it stands now, but not whether it was already in force this far back, and it won't apply a rule to a time it can't place it in. A life that starts later may be able to run here.`,
  });
  return {
    ...rules,
    minimumAge: unavailable("minimum age"),
    stateResidenceYears: unavailable("state residence"),
    districtResidenceYears: unavailable("district residence"),
    termYears: unavailable("term length"),
  };
}

export type CandidateQualificationRefusalKind =
  "minimum-age" | "state-residence" | "district-residence" | "unresolved-rule";

export interface CandidateQualificationRefusal {
  readonly kind: CandidateQualificationRefusalKind;
  readonly field:
    "minimumAge" | "stateResidenceYears" | "districtResidenceYears";
  readonly reason: string;
  readonly source: QualificationSourceRef | null;
}

export interface CandidateQualificationAssessment {
  readonly qualifies: boolean;
  readonly ruleSetId: string;
  readonly refusals: readonly CandidateQualificationRefusal[];
}

export interface CandidateQualificationAssessmentInput {
  readonly birthDate: IsoDate;
  readonly onDate: IsoDate;
  /** Start of the proved, uninterrupted state residence interval. */
  readonly stateResidenceSince: IsoDate | null;
  /** Start of the proved, uninterrupted residence in the exact seat district. */
  readonly districtResidenceSince: IsoDate | null;
}

function durationRefusal(
  field: "stateResidenceYears" | "districtResidenceYears",
  kind: "state-residence" | "district-residence",
  label: string,
  value: QualificationValue<number>,
  since: IsoDate | null,
  onDate: IsoDate,
): CandidateQualificationRefusal | null {
  if (
    value.state === "NOT_APPLICABLE" ||
    value.state === "NO_REQUIREMENT_FOUND"
  ) {
    return null;
  }
  if (value.state === "UNKNOWN") {
    return {
      kind: "unresolved-rule",
      field,
      reason: value.reason,
      source: null,
    };
  }
  if (since === null) {
    return {
      kind,
      field,
      reason: `The ${label} rule requires ${value.value} year${value.value === 1 ? "" : "s"}, but the world has no proved start date for that residence interval.`,
      source: value.source,
    };
  }
  if (ageOnDate(since, onDate) < value.value) {
    return {
      kind,
      field,
      reason: `The recorded ${label} interval does not yet satisfy the sourced ${value.value}-year requirement.`,
      source: value.source,
    };
  }
  return null;
}

/** Evaluate only explicit typed facts; birthplace and office labels are never substitutes. */
export function assessCandidateQualification(
  rules: CandidateQualificationRuleSet,
  input: CandidateQualificationAssessmentInput,
): CandidateQualificationAssessment {
  const refusals: CandidateQualificationRefusal[] = [];
  if (rules.minimumAge.state === "KNOWN") {
    if (ageOnDate(input.birthDate, input.onDate) < rules.minimumAge.value) {
      refusals.push({
        kind: "minimum-age",
        field: "minimumAge",
        reason: `The candidate is younger than the sourced minimum age of ${rules.minimumAge.value}.`,
        source: rules.minimumAge.source,
      });
    }
  } else if (rules.minimumAge.state === "UNKNOWN") {
    refusals.push({
      kind: "unresolved-rule",
      field: "minimumAge",
      reason: rules.minimumAge.reason,
      source: null,
    });
  }
  const state = durationRefusal(
    "stateResidenceYears",
    "state-residence",
    "state-residence",
    rules.stateResidenceYears,
    input.stateResidenceSince,
    input.onDate,
  );
  if (state) refusals.push(state);
  const district = durationRefusal(
    "districtResidenceYears",
    "district-residence",
    "district-residence",
    rules.districtResidenceYears,
    input.districtResidenceSince,
    input.onDate,
  );
  if (district) refusals.push(district);
  return {
    qualifies: refusals.length === 0,
    ruleSetId: rules.ruleSetId,
    refusals,
  };
}
