import { completedMonthsBetween, type IsoDate } from "./calendar";
import type { QualificationAssessment } from "../../simulation/office-qualification-rules";
export interface EnactedQualification {
  readonly field: string;
  readonly value: number;
  readonly assessmentField: QualificationAssessment["field"];
}
function assessEnactedQualification(
  change: EnactedQualification,
  person: {
    readonly age: number;
    readonly since: IsoDate | null;
    readonly districtIsUnknown: boolean;
    readonly onDate: IsoDate;
  },
): Omit<QualificationAssessment, "reason"> {
  if (change.field === "qualification.minimumAge") {
    const meets = person.age >= change.value;
    return {
      field: change.assessmentField,
      verdict: meets ? "meets" : "fails",
      source: null,
    };
  }
  if (change.value === 0)
    return {
      field: change.assessmentField,
      verdict: "meets",
      source: null,
    };
  if (person.since === null)
    return {
      field: change.assessmentField,
      verdict: "not-evaluated",
      source: null,
    };
  const held = completedMonthsBetween(person.since, person.onDate);
  const meets = held >= change.value * 12;
  return {
    field: change.assessmentField,
    verdict: meets ? "meets" : "fails",
    source: null,
  };
}

/** Replaces the same assessment fields that the public candidacy read overlays. */
export function enactedQualificationAssessments(
  changes: readonly EnactedQualification[],
  person: {
    readonly age: number;
    readonly stateResidenceSince: IsoDate | null;
    readonly districtResidenceSince: IsoDate | null;
    readonly districtIsUnknown: boolean;
    readonly onDate: IsoDate;
  },
) {
  return changes.map((change) =>
    assessEnactedQualification(change, {
      age: person.age,
      since:
        change.field === "qualification.minimumAge"
          ? null
          : change.field === "qualification.stateResidenceYears"
            ? person.stateResidenceSince
            : person.districtResidenceSince,
      districtIsUnknown: person.districtIsUnknown,
      onDate: person.onDate,
    }),
  );
}
