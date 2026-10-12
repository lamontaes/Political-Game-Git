/** P11 KEEP: office-qualification-rules.ts over selected qualification facts. */
import { addDays, ageOnDate, completedMonthsBetween } from "./calendar";
import type {
  SourcedQualification,
  DateBoundQualification,
  QualificationAssessmentInput as LegacyInput,
} from "../../simulation/office-qualification-rules";
import { OFFICES_PARAMETERS } from "./parameters";
export type QualificationAssessmentInput = Omit<LegacyInput, "person"> & {
  readonly person: { readonly birthDate: string };
};
export interface QualificationAssessment {
  readonly field: SourcedQualification["field"];
  readonly verdict: "meets" | "fails" | "not-evaluated";
  readonly source: SourcedQualification | null;
}
export type QualificationTemporalApplicability = {
  readonly state: "SUPPORTED" | "UNKNOWN";
};
const ELECTOR_RESIDENCE_DAYS = OFFICES_PARAMETERS.electorResidenceDays.value;
function ageInYears(row: SourcedQualification): number | null {
  if (typeof row.value === "number") return row.value;
  if (typeof row.value === "string") {
    const match = /^(\d+)\s*years?$/i.exec(row.value.trim());
    if (match) return Number(match[1]);
  }
  return null;
}
export function qualificationTemporalApplicability(
  row: SourcedQualification,
  onDate: string,
): QualificationTemporalApplicability {
  const validity = row.provisionValidity;
  if (validity.state === "EXACT_INTERVAL") {
    if (onDate < validity.validFrom) {
      return {
        state: "UNKNOWN",
      };
    }
    if (validity.validThrough !== null && onDate > validity.validThrough) {
      return {
        state: "UNKNOWN",
      };
    }
    return { state: "SUPPORTED" };
  }
  if (validity.state === "CURRENT_OBSERVATION") {
    if (onDate < validity.observedOn) {
      return {
        state: "UNKNOWN",
      };
    }
    return { state: "SUPPORTED" };
  }
  return {
    state: "UNKNOWN",
  };
}

export function durationMonths(row: SourcedQualification): {
  readonly months: number;
} | null {
  if (typeof row.value === "number") {
    return {
      months: row.value * 12,
    };
  }
  if (typeof row.value === "string") {
    const text = row.value.trim();
    const years = /^(\d+)\s*years?$/i.exec(text);
    if (years) {
      const count = Number(years[1]);
      return {
        months: count * 12,
      };
    }
    const months = /^(\d+)\s*months?$/i.exec(text);
    if (months) {
      const count = Number(months[1]);
      return {
        months: count,
      };
    }
    const token = /^RESIDENT_(\d+)_YEARS?$/i.exec(text);
    if (token) {
      const count = Number(token[1]);
      return {
        months: count * 12,
      };
    }
  }
  return null;
}

export function assessOfficeQualifications(
  input: QualificationAssessmentInput,
  rows: readonly DateBoundQualification[],
): readonly QualificationAssessment[] {
  const assessments: QualificationAssessment[] = [];
  for (const row of rows) {
    if (row.field === "SELECTION_MECHANISM" || row.field === "TERM_LENGTH") {
      continue;
    }
    if (row.temporalApplicability.state === "UNKNOWN") {
      assessments.push({
        field: row.field,
        verdict: "not-evaluated",
        source: row,
      });
      continue;
    }
    if (row.field === "OFFICE_EXISTENCE") {
      if (row.sourceState === "KNOWN" && row.value === "false") {
        assessments.push({
          field: row.field,
          verdict: "fails",
          source: row,
        });
      }
      continue;
    }
    if (row.sourceState === "NO_REQUIREMENT_FOUND") {
      assessments.push({
        field: row.field,
        verdict: "meets",
        source: row,
      });
      continue;
    }
    if (row.sourceState === "NOT_APPLICABLE") {
      assessments.push({
        field: row.field,
        verdict: "meets",
        source: row,
      });
      continue;
    }
    if (row.sourceState !== "KNOWN") {
      assessments.push({
        field: row.field,
        verdict: "not-evaluated",
        source: row,
      });
      continue;
    }
    if (row.field === "MINIMUM_AGE") {
      const required = ageInYears(row);
      if (required === null) {
        assessments.push({
          field: row.field,
          verdict: "not-evaluated",
          source: row,
        });
        continue;
      }
      const age = ageOnDate(input.person.birthDate, input.onDate);
      assessments.push({
        field: row.field,
        verdict: age >= required ? "meets" : "fails",
        source: row,
      });
      continue;
    }
    if (row.field === "STATE_RESIDENCE" || row.field === "DISTRICT_RESIDENCE") {
      const required = durationMonths(row);
      const residenceSince =
        row.field === "STATE_RESIDENCE"
          ? input.stateResidenceSince
          : input.districtResidenceSince;
      const held =
        residenceSince === null
          ? null
          : completedMonthsBetween(residenceSince, input.onDate);
      if (required === null || held === null) {
        assessments.push({
          field: row.field,
          verdict: "not-evaluated",
          source: row,
        });
        continue;
      }
      assessments.push({
        field: row.field,
        verdict: held >= required.months ? "meets" : "fails",
        source: row,
      });
      continue;
    }
    if (
      (row.field === "US_CITIZENSHIP" || row.field === "ELECTOR_REQUIREMENT") &&
      input.citizenStatus === false
    ) {
      assessments.push({
        field: row.field,
        verdict: "fails",
        source: row,
      });
      continue;
    }
    if (
      row.field === "US_CITIZENSHIP" &&
      ((input.citizenSince ?? null) !== null ||
        (input.citizenStatus === true && durationMonths(row) === null))
    ) {
      const term = durationMonths(row);
      const held = input.citizenSince
        ? completedMonthsBetween(input.citizenSince, input.onDate)
        : null;
      const meets = term === null || (held !== null && held >= term.months);
      assessments.push({
        field: row.field,
        verdict: meets ? "meets" : "fails",
        source: row,
      });
      continue;
    }
    if (
      row.field === "ELECTOR_REQUIREMENT" &&
      ((input.citizenSince ?? null) !== null || input.citizenStatus === true)
    ) {
      const age = ageOnDate(input.person.birthDate, input.onDate);
      const residentEnough =
        input.stateResidenceSince !== null &&
        addDays(input.stateResidenceSince, ELECTOR_RESIDENCE_DAYS) <=
          input.onDate;
      assessments.push({
        field: row.field,
        verdict:
          age >= OFFICES_PARAMETERS.votingAge.value && residentEnough
            ? "meets"
            : "fails",
        source: row,
      });
      continue;
    }
    if (row.field === "TERM_LIMIT" && input.priorTermsInOffice === 0) {
      assessments.push({
        field: row.field,
        verdict: "meets",
        source: row,
      });
      continue;
    }
    assessments.push({
      field: row.field,
      verdict: "not-evaluated",
      source: row,
    });
  }
  return assessments;
}
