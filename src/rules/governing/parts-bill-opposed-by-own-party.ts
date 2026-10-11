// STOPGAP RULES3-GOV-059: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: billOpposedByOwnParty.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1284: !matter.measureId */
export function billOpposedByOwnPartyRule1(facts: {
  readonly matterMeasureId: string | null;
}) {
  return !facts.matterMeasureId!;
}

/** Legacy line 1290: own.nay > own.yea */
export function billOpposedByOwnPartyRule2(facts: {
  readonly ownNay: number;
  readonly ownYea: number;
}) {
  return facts.ownNay > facts.ownYea;
}
