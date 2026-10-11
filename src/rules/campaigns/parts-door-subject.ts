// STOPGAP RULES3-CAM-038: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/door-conversations.ts :: doorSubject.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 144: !recipient */
export function doorSubjectRule1(facts: { readonly recipient: unknown }) {
  return !facts.recipient;
}

/** Legacy line 147: !matchesOutcomeRecipientRule(condition.recipientRule, recipient) */
export function doorSubjectRule2(facts: {
  readonly matchesOutcomeRecipientRuleConditionRecipientRuleRecipient: boolean;
}) {
  return !facts.matchesOutcomeRecipientRuleConditionRecipientRuleRecipient;
}

/** Legacy line 149: !found || condition.worseBy > found.worseBy + 1e-12 */
export function doorSubjectRule3(facts: {
  readonly found: unknown;
  readonly conditionWorseBy: number;
  readonly foundWorseBy: number;
}) {
  return !facts.found || facts.conditionWorseBy > facts.foundWorseBy + 1e-12;
}

/** Legacy line 151: !found || found.worseBy === 0 */
export function doorSubjectRule4(facts: {
  readonly found: unknown;
  readonly foundWorseBy: number;
}) {
  return !facts.found || facts.foundWorseBy === 0;
}
