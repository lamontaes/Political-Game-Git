import type { DecisionDeclaration } from "../trait-packs";

/** Choices available to a person named in a live press request. */
export const SUBJECT_RESPONSE_DECISION: DecisionDeclaration = {
  id: "press.subject-response",
  scope: "life:ordinary",
  options: ["dispute", "decline", "no-response"],
};
