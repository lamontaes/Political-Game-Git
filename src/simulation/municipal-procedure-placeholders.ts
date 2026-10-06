/**
 * Sourced supplements for parts of a council's ordinance procedure that its
 * enacted charter leaves to the body's own rules.
 *
 * `municipalRulePackFor` reads an entry only where the compiled charter reading
 * is silent on that field, so the more specific sourced value always wins.
 *
 * The District of Columbia is the only entry. The Home Rule Act fixes the
 * Council's vote, quorum, readings, the Mayor's action and congressional
 * review (D.C. Code §§ 1-204.04(e), 1-204.12, 1-206.02(c)(1)), and requires
 * the Council to adopt its own rules of procedure (§ 1-204.04(c)). Those rules
 * are recorded in the Council Period XXVI Rules of Organization and Procedure:
 * Rule 401 permits members to introduce bills, while Rules 231 and 315 require
 * committee action before the first-reading vote and a later final vote.
 */

export const MUNICIPAL_PROCEDURE_SUPPLEMENT_VERSION =
  "ocd-municipal-procedure-supplement/cp26-v1" as const;

export interface MunicipalProcedureSupplement {
  /** Who may introduce a measure. */
  readonly introductionSponsorship: string;
  /** Whether each earlier reading is put to the same vote as final passage. */
  readonly everyReadingVoted: boolean;
  readonly researchQuestionId: string;
  readonly note: string;
}

const SUPPLEMENTS: Readonly<Record<string, MunicipalProcedureSupplement>> = {
  "us-dc-washington": {
    introductionSponsorship:
      "A Councilmember may introduce a bill by filing it with the Secretary under Council Period XXVI Rule 401.",
    everyReadingVoted: true,
    researchQuestionId: "dc-council-rules-of-organization-and-procedure",
    note: `${MUNICIPAL_PROCEDURE_SUPPLEMENT_VERSION}: Council Period XXVI Rules 231, 315, and 401 record member introduction, committee action before first reading, a first-reading vote, and a final vote after at least 13 days. The engine's committee stage is recorded separately from this supplement. Source: https://dccouncil.gov/wp-content/uploads/2026/01/PR26-0001-FINAL-1-29-26.pdf.`,
  },
};

/** The sourced procedure supplement for one government, or null if absent. */
export function municipalProcedureSupplement(
  governmentKey: string,
): MunicipalProcedureSupplement | null {
  return SUPPLEMENTS[governmentKey] ?? null;
}
