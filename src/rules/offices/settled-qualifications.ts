import type { RuleSourceRef } from "../../simulation/legislature-rules";
import type {
  QualificationFieldName,
  QualificationOfficeFamily,
} from "../../simulation/office-qualification-rules";
export interface SettledQualification {
  readonly stateJurisdictionKey: string;
  readonly officeFamily: QualificationOfficeFamily;
  readonly field: QualificationFieldName;
  readonly value: number;
  readonly validFrom?: string;
  readonly source: RuleSourceRef;
}

export function settledQualification(
  stateJurisdictionKey: string,
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
  onDate: string | undefined,
  SETTLED: readonly SettledQualification[],
): {
  readonly value: number;
  readonly source: RuleSourceRef;
  readonly validFrom?: string;
} | null {
  const row = SETTLED.find(
    (candidate) =>
      candidate.stateJurisdictionKey === stateJurisdictionKey &&
      candidate.field === field &&
      candidate.officeFamily === officeFamily,
  );
  if (
    !row ||
    (onDate !== undefined &&
      row.validFrom !== undefined &&
      onDate < row.validFrom)
  )
    return null;
  return {
    value: row.value,
    source: row.source,
    ...(row.validFrom === undefined ? {} : { validFrom: row.validFrom }),
  };
}
