// STOPGAP RULES3-GOV-014: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: peopleOutSick.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 256: -U.passDays */
export function peopleOutSickRule1(facts: { readonly UPassDays: number }) {
  return -facts.UPassDays;
}

/** Legacy line 259: found.onsetAt >= from && found.onsetAt < date */
export function peopleOutSickRule2(facts: {
  readonly foundOnsetAt: string;
  readonly from: string;
  readonly date: string;
}) {
  return facts.foundOnsetAt >= facts.from && facts.foundOnsetAt < facts.date;
}
