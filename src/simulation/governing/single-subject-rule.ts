import singleSubjectTable from "../../../data/research/legislative-procedure/single-subject.json" with { type: "json" };
import type { LegislativeRulePack } from "../legislature-rules";

interface SingleSubjectRow {
  readonly code: string;
  readonly singleSubject: string;
  readonly scope: string | null;
  readonly appropriationsException: string | null;
  readonly citation: string;
}

export interface SingleSubjectRule {
  readonly generalBills: boolean;
  /** A money bill may carry nothing but appropriations. */
  readonly appropriationBills: boolean;
  readonly citation: string;
}

const SINGLE_SUBJECT_ROWS = singleSubjectTable as SingleSubjectRow[];

/**
 * The constitution's single-subject rule for a place. The scope text is read
 * as written: a rule for "all bills" or "all laws" binds general bills; a
 * rule for "appropriation bills only", or an exception that confines the
 * general appropriation bill to appropriations, binds money bills.
 */
export function singleSubjectRule(
  pack: LegislativeRulePack,
): SingleSubjectRule | null {
  const code = pack.jurisdictionKey.replace(/^US-/, "");
  const row = SINGLE_SUBJECT_ROWS.find((candidate) => candidate.code === code);
  if (!row || row.singleSubject !== "yes") return null;
  const scope = (row.scope ?? "").toLowerCase();
  const exception = (row.appropriationsException ?? "").toLowerCase();
  const localOnly = scope.includes("private or local");
  const moneyOnly = scope.includes("appropriation bills only");
  const generalBills = !localOnly && !moneyOnly;
  const appropriationBills =
    moneyOnly ||
    /nothing but|embrace only|only ordinary|shall contain only|confined to/.test(
      exception,
    ) ||
    (generalBills &&
      (exception === "" ||
        exception === "n/a" ||
        exception.startsWith("none stated")));
  return { generalBills, appropriationBills, citation: row.citation };
}
