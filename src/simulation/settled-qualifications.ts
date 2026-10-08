import { researchRuleTable } from "./research-rule-tables";
import type { RuleSourceRef } from "./legislature-rules";
import type {
  QualificationFieldName,
  QualificationOfficeFamily,
} from "./office-qualification-rules";

/** Primary-source qualifications awaiting the locked corpus transport.
 * Each row retains its own authority and earliest supported date. These rows
 * are partial, never a claim that blocked acquisition produced verified bytes.
 * A compiled field remains authoritative where it already exists.
 */
interface SettledQualification {
  readonly stateJurisdictionKey: string;
  readonly officeFamily: QualificationOfficeFamily;
  readonly field: QualificationFieldName;
  readonly value: number;
  readonly validFrom?: string;
  readonly source: RuleSourceRef;
}

const SETTLED: readonly SettledQualification[] = researchRuleTable(
  "settledQualifications",
) as readonly SettledQualification[];

export function settledQualification(
  stateJurisdictionKey: string,
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
  onDate?: string,
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
