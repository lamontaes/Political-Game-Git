/**
 * PLACEHOLDERS for the parts of a council's ordinance procedure that its read
 * instruments leave to the body's own rules, pending research.
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
 * were not read, so who introduces an act, the committee that hears and
 * reports it, and whether the Council votes at first reading are filed as
 * `dc-council-rules-of-organization-and-procedure`.
 */

export const MUNICIPAL_PROCEDURE_PLACEHOLDER_VERSION =
  "ocd-municipal-procedure-placeholder/v1" as const;

export interface MunicipalProcedurePlaceholder {
  /** Who may introduce a measure. */
  readonly introductionSponsorship: string;
  /**
   * Whether each earlier reading is put to the same vote as final passage.
   * Without it an earlier reading decides nothing and the engine cannot
   * advance past it.
   */
  readonly everyReadingVoted: boolean;
  /**
   * Whether the body refers each measure to a standing committee, which hears
   * it and reports it before the first reading. Without it a body whose read
   * instruments set no referral requirement sends a measure straight to the
   * floor.
   */
  readonly committeeReferral: boolean;
  readonly researchQuestionId: string;
  readonly note: string;
}

const PLACEHOLDERS: Readonly<Record<string, MunicipalProcedurePlaceholder>> = {
  "us-dc-washington": {
    introductionSponsorship:
      "Any member of the Council may introduce an act. (A placeholder: the Council's own rules were not read.)",
    everyReadingVoted: true,
    // estimatedFrom: "Council of the District of Columbia, Rules of
    // Organization and Procedure": the Chairman refers each bill to a
    // standing committee, which holds a hearing and reports it before the
    // Committee of the Whole puts it on the legislative agenda.
    committeeReferral: true,
    researchQuestionId: "dc-council-rules-of-organization-and-procedure",
    note: `${MUNICIPAL_PROCEDURE_PLACEHOLDER_VERSION}: any member introduces an act, a standing committee hears it and reports it, and each of the two readings is put to a vote of a majority of the members present and voting. Pending dc-council-rules-of-organization-and-procedure; not the Council's record.`,
  },
};

/** The placeholder procedure for one government, or null where none is set. */
export function municipalProcedurePlaceholder(
  governmentKey: string,
): MunicipalProcedurePlaceholder | null {
  return PLACEHOLDERS[governmentKey] ?? null;
}
