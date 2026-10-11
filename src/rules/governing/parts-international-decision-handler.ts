// STOPGAP RULES3-GOV-034: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/international.ts :: internationalDecisionHandler.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 559: state.ended || !state.awaitingDecision */
export function internationalDecisionHandlerRule1(facts: {
  readonly stateEnded: boolean;
  readonly stateAwaitingDecision: boolean;
}) {
  return facts.stateEnded || !facts.stateAwaitingDecision;
}

/** Legacy line 562: president && controlledBy(world, president.personId) */
export function internationalDecisionHandlerRule2(facts: {
  readonly president: unknown;
  readonly controlledByWorldPresidentPersonId: boolean;
}) {
  return facts.president && facts.controlledByWorldPresidentPersonId;
}

/** Legacy line 567: daysBetween(makeIsoDate(since), makeIsoDate(world.currentDate)) >=       PROVISIONAL_INTERNATIONAL_POLICY.lapseAfterQuietDays */
export function internationalDecisionHandlerRule3(facts: {
  readonly daysBetweenMakeIsoDateSinceMakeIsoDateWorldCurrentDate: number;
  readonly PROVISIONAL_INTERNATIONAL_POLICYLapseAfterQuietDays: number;
}) {
  return (
    facts.daysBetweenMakeIsoDateSinceMakeIsoDateWorldCurrentDate >=
    facts.PROVISIONAL_INTERNATIONAL_POLICYLapseAfterQuietDays
  );
}

/** Legacy line 574: dueIndex(item) + 1 */
export function internationalDecisionHandlerRule4(facts: {
  readonly dueIndexItem: number;
}) {
  return facts.dueIndexItem + 1;
}

/** Legacy line 585: -1 */
export function internationalDecisionHandlerRule5() {
  return -1;
}

/** Legacy line 590: president ? option : "diplomatic" */
export function internationalDecisionHandlerRule6(facts: {
  readonly president: unknown;
  readonly option: string;
}) {
  return facts.president ? facts.option : "diplomatic";
}

/** Legacy line 591: president?.personId ?? null */
export function internationalDecisionHandlerRule7(facts: {
  readonly presidentPersonId: string | undefined;
}) {
  return facts.presidentPersonId! ?? null;
}

/** Legacy line 592: president ? "npc-rule" : "institution" */
export function internationalDecisionHandlerRule8(facts: {
  readonly president: unknown;
}) {
  return facts.president ? "npc-rule" : "institution";
}
