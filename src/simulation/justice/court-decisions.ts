import type { DecisionDeclaration } from "../trait-packs";

/**
 * Criminal-court decisions published for trait packs. A leaf module, like
 * `clemency-decisions.ts`, so the registry and the court route can both read
 * them without importing each other.
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

/** Judicial decisions published for registered trait effects. */
export const PRETRIAL_DETENTION_DECISION: DecisionDeclaration = {
  id: "justice.pretrial-detention",
  scope: "life:ordinary",
  options: ["court:release-before-trial", "court:hold-before-trial"],
};

export const SENTENCE_DECISION: DecisionDeclaration = {
  id: "justice.sentence",
  scope: "life:ordinary",
  options: ["court:community-supervision", "court:jail"],
};
