import type { RuleSourceRef } from "./legislature-rules";
import type {
  QualificationFieldName,
  QualificationOfficeFamily,
} from "./office-qualification-rules";

/**
 * Qualifications the game applies before the state's corpus is compiled,
 * because the state's constitution states them plainly and a drawn stand-in
 * would contradict it.
 *
 * Each row names its constitutional section. The section's text has not been
 * retrieved into the repository (the source site refused this environment),
 * so each row is `partial`, not `verified`, and the state's full reading is
 * still on the research queue. When the state's corpus is compiled, its own
 * rows replace these: this table is read only where the corpus has nothing.
 */
interface SettledQualification {
  readonly stateJurisdictionKey: string;
  readonly officeFamily: QualificationOfficeFamily;
  readonly field: QualificationFieldName;
  readonly value: number;
  readonly citation: string;
  readonly researchQuestionId: string;
}

const SETTLED: readonly SettledQualification[] = [
  {
    // A member of the Maine House must "have arrived at the age of 21 years".
    stateJurisdictionKey: "US-ME",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    citation: "Me. Const. art. IV, pt. 1, § 4",
    researchQuestionId: "state-legislator-qualifications-in-every-unread-state",
  },
];

export function settledQualification(
  stateJurisdictionKey: string,
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
): { readonly value: number; readonly source: RuleSourceRef } | null {
  const row = SETTLED.find(
    (candidate) =>
      candidate.stateJurisdictionKey === stateJurisdictionKey &&
      candidate.field === field &&
      candidate.officeFamily === officeFamily,
  );
  if (!row) return null;
  return {
    value: row.value,
    source: {
      authority: "constitution",
      citation: row.citation,
      sourceTitle: "Constitution of the State of Maine",
      sourceUrl: null,
      retrievedAt: null,
      verification: "partial",
      note: `Applied from the cited section before the state's qualifications are compiled; the text was not retrieved here. Confirmation is filed as ${row.researchQuestionId}.`,
    },
  };
}
