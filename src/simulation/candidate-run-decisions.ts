import type { DecisionDeclaration } from "./trait-packs";

/** Run decisions shared by the federal and state candidate producers. */
export const CANDIDATE_RUN_DECISIONS: readonly DecisionDeclaration[] = [
  {
    id: "election.consider-congress-run",
    scope: "career:choice",
    options: ["run", "decline"],
  },
  {
    id: "election.consider-state-legislative-run",
    scope: "career:choice",
    options: ["run", "decline"],
  },
];
