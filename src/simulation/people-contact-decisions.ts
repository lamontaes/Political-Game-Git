import type { DecisionDeclaration } from "./trait-packs";

/**
 * What answering a contact offers, published for whatever wants to argue about
 * it.
 *
 * A decision declaring itself is the one piece of the trait seam that stays
 * code, and it is what lets a pack be written by somebody who cannot read the
 * decision: the option keys below are the whole of what a lean may attach to,
 * and a lean naming anything else is rejected when its pack loads rather than
 * silently matching nothing.
 *
 * It sits in its own leaf module, beside the decision rather than inside it,
 * so that the build's registry and the decision can both read it without
 * importing each other. A declaration that imported its decision, or a
 * decision that imported the registry that names it, is a cycle — the first
 * version was exactly that, and it loaded under the test runner while failing
 * under the corpus tool, which is the worst way for a cycle to behave.
 *
 * The keys are the same ones `evaluateDecision` is given in
 * `people-contact.ts`. Where a trait's meaning would depend on the situation,
 * the situation belongs in a key here rather than in a lean; see
 * `docs/systems/traits.md`.
 */
export const CONTACT_ANSWER_DECISION: DecisionDeclaration = {
  id: "contact.answer",
  scope: "life:ordinary",
  options: ["accept", "counter", "decline"],
};
