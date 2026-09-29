import type { DecisionDeclaration } from "../trait-packs";

/**
 * Whether somebody serving a sentence asks for clemency, published for the
 * trait packs. A leaf module, like `people-contact-decisions.ts`, so the
 * registry and the decision can both read it without importing each other.
 *
 * It is an ordinary-life decision: the person asking is deciding about their
 * own life, not acting in an office.
 */
export const CLEMENCY_PETITION_DECISION: DecisionDeclaration = {
  id: "clemency.petition",
  scope: "life:ordinary",
  options: ["petition", "wait"],
};
