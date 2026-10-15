import type { DecisionDeclaration } from "../trait-packs";

/**
 * Whether somebody holding an office runs for it again, published for the
 * trait packs. A leaf module, like `people-contact-decisions.ts`, so the
 * registry and the decision can both read it without importing each other.
 *
 * It is a career choice: a person weighing their own working life.
 */
export const ANOTHER_TERM_DECISION: DecisionDeclaration = {
  id: "career.consider-another-term",
  scope: "career:choice",
  options: ["seek", "step-down"],
};
