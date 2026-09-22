import type { DecisionDeclaration } from "./trait-packs";

/**
 * What a member answering at a bargaining sitting is choosing between,
 * published for whatever wants to argue about it.
 *
 * It sits in its own leaf module in the simulation layer, beside nothing it
 * imports, for two reasons. The build's trait registry has to read it, and the
 * registry is simulation code that may not import the presentation module the
 * decision itself lives in. And a declaration that imported its decision, or a
 * decision that imported the registry naming it, is a cycle that loads under
 * the test runner while failing under the corpus tool.
 *
 * **Two declarations, not one.** `evaluateBargainingDecision` offers different
 * options depending on what was just said: answering a request for support is
 * a choice between committing and staying uncommitted, while answering an
 * offer is a choice between taking it and holding out for the original ask.
 * The option key `hold-off` appears in both and does not mean the same thing
 * in each — declining to say where you stand is not refusing a version on the
 * table. One declaration listing all four keys would let a pack attach an
 * argument about refusing an offer to a turn where no offer was made, and the
 * loader could not catch it, because the key would exist. Two declarations
 * make the situation part of what a lean has to name.
 *
 * The option keys below are exactly the keys the decision builds, and a lean
 * naming anything else is rejected when its pack loads.
 */

/** Answering a request for support: say where you will be, or do not. */
export const BARGAINING_ANSWER_REQUEST_DECISION: DecisionDeclaration = {
  id: "legislation.bargaining.answer-request",
  scope: "government:bargaining",
  options: ["commit", "hold-off"],
};

/** Answering an offer of language: work with it, or hold out for the ask. */
export const BARGAINING_ANSWER_OFFER_DECISION: DecisionDeclaration = {
  id: "legislation.bargaining.answer-offer",
  scope: "government:bargaining",
  options: ["take-the-offer", "hold-off"],
};
