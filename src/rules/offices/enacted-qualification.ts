import { completedMonthsBetween, type IsoDate } from "./calendar";
import type { QualificationAssessment } from "../../simulation/office-qualification-rules";
export interface EnactedQualification {
  readonly field: string;
  readonly value: number;
  readonly assessmentField: QualificationAssessment["field"];
}
export function assessEnactedQualification(
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
