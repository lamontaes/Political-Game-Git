// STOPGAP RULES3-GOV-011: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/disaster.ts :: disasterStateReviewHandler.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 823: !governor */
export function disasterStateReviewHandlerRule1(facts: {
  readonly governor: unknown;
}) {
  return !facts.governor;
}

/** Legacy line 851: world.currentDate >= deadline */
export function disasterStateReviewHandlerRule2(facts: {
  readonly currentDate: string;
  readonly deadline: string;
}) {
  return facts.currentDate >= facts.deadline;
}

/** Legacy line 869: itemIndex(item) + 1 */
export function disasterStateReviewHandlerRule3(facts: {
  readonly itemIndexItem: number;
}) {
  return facts.itemIndexItem + 1;
}

/** Legacy line 870: Math.min(7, daysBetween(world.currentDate, deadline)) */
export function disasterStateReviewHandlerRule4(facts: {
  readonly daysBetweenWorldCurrentDateDeadline: number;
}) {
  return Math.min(7, facts.daysBetweenWorldCurrentDateDeadline);
}

/** Legacy line 878: assessment.destroyed.household + assessment.destroyed.dwelling */
export function disasterStateReviewHandlerRule5(facts: {
  readonly assessmentDestroyedHousehold: number;
  readonly assessmentDestroyedDwelling: number;
}) {
  return facts.assessmentDestroyedHousehold + facts.assessmentDestroyedDwelling;
}

/** Legacy line 885: request ? "request" : "decline" */
export function disasterStateReviewHandlerRule6(facts: {
  readonly request: boolean;
}) {
  return facts.request ? "request" : "decline";
}

/** Legacy line 887: request         ? "Damage exceeded what the state expected to handle alone."         : "The governor judged state and local resources sufficient." */
export function disasterStateReviewHandlerRule7(facts: {
  readonly request: boolean;
}) {
  return facts.request
    ? "Damage exceeded what the state expected to handle alone."
    : "The governor judged state and local resources sufficient.";
}

/** Legacy line 892: request ? "request" : "decline" */
export function disasterStateReviewHandlerRule8(facts: {
  readonly request: boolean;
}) {
  return facts.request ? "request" : "decline";
}
