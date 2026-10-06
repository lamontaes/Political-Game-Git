import type { DecisionDeclaration } from "./trait-packs";

/** The choices a mogul weighs before approaching a campaign. */
export const MOGUL_APPROACH_DECISION: DecisionDeclaration = {
  id: "mogul.approach",
  scope: "governing:conversation",
  options: ["donate", "deal", "wait"],
};
