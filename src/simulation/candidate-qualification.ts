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
  /** The research row that led to this first-party verification. */
  readonly researchLineage: string;
}

export interface CandidateQualificationRuleSet {
  readonly ruleSetId: string;
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
  researchLineage: "31A Alaska legislative-office qualification rows",
};

function known<T>(value: T): QualificationValue<T> {
  return { state: "KNOWN", value, source: AK_CONSTITUTION };
}

export const CANDIDATE_QUALIFICATION_RULE_SETS: readonly CandidateQualificationRuleSet[] =
  [
    {
      ruleSetId: "us-ak-house-qualifications-v1",
      candidacyPackId: "us-ak-legislature-v1:candidacy",
      officeKey: "us-ak-legislature-v1:house",
      jurisdictionKey: "US-AK",
      minimumAge: known(21),
      stateResidenceYears: known(3),
      districtResidenceYears: known(1),
      termYears: known(2),
    },
    {
      ruleSetId: "us-ak-senate-qualifications-v1",
      candidacyPackId: "us-ak-legislature-v1:candidacy",
      officeKey: "us-ak-legislature-v1:senate",
      jurisdictionKey: "US-AK",
      minimumAge: known(25),
      stateResidenceYears: known(3),
      districtResidenceYears: known(1),
      termYears: known(4),
    },
  ];

export function candidateQualificationRuleSet(
  candidacyPackId: string,
  officeKey: string,
): CandidateQualificationRuleSet | null {
  return (
    CANDIDATE_QUALIFICATION_RULE_SETS.find(
      (rules) =>
        rules.candidacyPackId === candidacyPackId &&
        rules.officeKey === officeKey,
    ) ?? null
  );
}

export type CandidateQualificationRefusalKind =
  | "minimum-age"
  | "state-residence"
  | "district-residence"
  | "unresolved-rule";

export interface CandidateQualificationRefusal {
  readonly kind: CandidateQualificationRefusalKind;
  readonly field:
    | "minimumAge"
    | "stateResidenceYears"
    | "districtResidenceYears";
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
  if (value.state === "NOT_APPLICABLE" || value.state === "NO_REQUIREMENT_FOUND") {
    return null;
  }
  if (value.state === "UNKNOWN") {
    return { kind: "unresolved-rule", field, reason: value.reason, source: null };
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
