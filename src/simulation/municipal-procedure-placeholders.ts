/**
 * ESTIMATES for parts of a council's ordinance procedure that its read
 * instruments leave to the body's own rules.
 *
 * Each entry is the game's own stand-in, never a claim about the law, and
 * names the research question that replaces it. `municipalRulePackFor` reads
 * an entry only where the compiled reading is silent on that field, so a
 * sourced value always wins.
 *
 * The District of Columbia is the only entry. The Home Rule Act fixes the
 * Council's vote, quorum, readings, the Mayor's action and congressional
 * review (D.C. Code §§ 1-204.04(e), 1-204.12, 1-206.02(c)(1)), and requires
 * the Council to adopt its own rules of procedure (§ 1-204.04(c)). Those rules
 * were not read, so who introduces an act, whether a committee must report
 * it, and whether the Council votes at first reading are filed as
 * `dc-council-rules-of-organization-and-procedure`.
 */

export const MUNICIPAL_PROCEDURE_ESTIMATE_VERSION =
  "ocd-municipal-procedure-estimate/v1" as const;

export interface MunicipalProcedurePlaceholder {
  /** Who may introduce a measure. */
  readonly introductionSponsorship: string;
  /**
   * Whether each earlier reading is put to the same vote as final passage.
   * Without it an earlier reading decides nothing and the engine cannot
   * advance past it.
   */
  readonly everyReadingVoted: boolean;
  readonly researchQuestionId: string;
  readonly note: string;
}

const ESTIMATES: Readonly<Record<string, MunicipalProcedurePlaceholder>> = {
  "us-dc-washington": {
    introductionSponsorship:
      "Any member of the Council may introduce an act. (Estimated from the game's recorded council procedures for Charlottesville and Richmond, which allow councilmember introduction.)",
    everyReadingVoted: true,
    researchQuestionId: "dc-council-rules-of-organization-and-procedure",
    note: `${MUNICIPAL_PROCEDURE_ESTIMATE_VERSION}: ESTIMATED FROM SIMILAR PLACES IN THE GAME (Charlottesville and Richmond): a councilmember may introduce an act. The recorded Home Rule Act supplies two readings and majority passage; it does not require a committee stage. This estimate is not the Council's own rule.`,
  },
};

/** The placeholder procedure for one government, or null where none is set. */
export function municipalProcedurePlaceholder(
  governmentKey: string,
): MunicipalProcedurePlaceholder | null {
  return ESTIMATES[governmentKey] ?? null;
}
