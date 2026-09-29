import type { DecisionDeclaration } from "../trait-packs";

/**
 * The two decisions an ordinary person makes in a criminal case, published for
 * the trait packs. A leaf module, like `clemency-decisions.ts`, so the
 * registry and the court route can both read it without importing each other.
 *
 * Option keys sort so that a tie falls to the side the law favors: the
 * decision engine breaks an exact tie by option key, and a defendant whose
 * reasons balance takes the plea on offer ("plead" before "trial"), and a
 * juror whose reasons balance acquits ("acquit" before "convict"), as the
 * presumption of innocence requires.
 */
export const PLEA_DECISION: DecisionDeclaration = {
  id: "court.plea",
  scope: "life:ordinary",
  options: ["plead", "trial"],
};

export const JURY_VOTE_DECISION: DecisionDeclaration = {
  id: "court.jury-vote",
  scope: "life:ordinary",
  options: ["acquit", "convict"],
};
