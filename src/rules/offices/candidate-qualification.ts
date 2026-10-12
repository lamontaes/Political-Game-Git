/** P11 KEEP: candidate-qualification.ts; wording is supplied by the English engine. */
import { ageOnDate, type IsoDate } from "./calendar";
import type {
  CandidateQualificationRuleSet as LegacyRuleSet,
  CandidateQualificationAssessmentInput,
  QualificationSourceRef,
} from "../../simulation/candidate-qualification";
export type QualificationValue<T> =
  | {
      readonly state: "KNOWN";
      readonly value: T;
      readonly source: QualificationSourceRef;
    }
  | { readonly state: "UNKNOWN" }
  | {
      readonly state: "NO_REQUIREMENT_FOUND";
      readonly source: QualificationSourceRef;
    }
  | { readonly state: "NOT_APPLICABLE" };
export type CandidateQualificationRuleSet = Omit<
  LegacyRuleSet,
  "minimumAge" | "stateResidenceYears" | "districtResidenceYears" | "termYears"
> & {
  readonly minimumAge: QualificationValue<number>;
  readonly stateResidenceYears: QualificationValue<number>;
  readonly districtResidenceYears: QualificationValue<number>;
  readonly termYears: QualificationValue<number>;
};
export interface CandidateQualificationRefusal {
  readonly kind:
    | "minimum-age"
    | "state-residence"
    | "district-residence"
    | "unresolved-rule";
  readonly field:
    "minimumAge" | "stateResidenceYears" | "districtResidenceYears";
  readonly source: QualificationSourceRef | null;
}
export interface CandidateQualificationAssessment {
  readonly qualifies: boolean;
  readonly ruleSetId: string;
  readonly refusals: readonly CandidateQualificationRefusal[];
}
export type { CandidateQualificationAssessmentInput };
export function ruleSetApplicableOn(
  rules: CandidateQualificationRuleSet,
  onDate: IsoDate,
): CandidateQualificationRuleSet {
  const { observedCurrentOn, provisionEffectiveOn } = rules.source;
  if (provisionEffectiveOn !== null) {
    if (onDate >= provisionEffectiveOn) return rules;
    const unknownBefore = (): QualificationValue<number> => ({
      state: "UNKNOWN",
    });
    return {
      ...rules,
      minimumAge: unknownBefore(),
      stateResidenceYears: unknownBefore(),
      districtResidenceYears: unknownBefore(),
      termYears: unknownBefore(),
    };
  }
  if (onDate >= observedCurrentOn) return rules;
  const unavailable = (): QualificationValue<number> => ({
    state: "UNKNOWN",
  });
  return {
    ...rules,
    minimumAge: unavailable(),
    stateResidenceYears: unavailable(),
    districtResidenceYears: unavailable(),
    termYears: unavailable(),
  };
}

function durationRefusal(
  field: "stateResidenceYears" | "districtResidenceYears",
  kind: "state-residence" | "district-residence",
  _label: string,
  value: QualificationValue<number>,
  since: IsoDate | null,
  onDate: IsoDate,
  _districtIsUnknown = false,
): CandidateQualificationRefusal | null {
  void _districtIsUnknown;
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
      source: null,
    };
  }
  if (since === null) {
    return {
      kind,
      field,
      source: value.source,
    };
  }
  if (ageOnDate(since, onDate) < value.value) {
    return {
      kind,
      field,
      source: value.source,
    };
  }
  return null;
}

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
        source: rules.minimumAge.source,
      });
    }
  } else if (rules.minimumAge.state === "UNKNOWN") {
    refusals.push({
      kind: "unresolved-rule",
      field: "minimumAge",
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
    input.districtIsUnknown === true,
  );
  if (district) refusals.push(district);
  return {
    qualifies: refusals.length === 0,
    ruleSetId: rules.ruleSetId,
    refusals,
  };
}
