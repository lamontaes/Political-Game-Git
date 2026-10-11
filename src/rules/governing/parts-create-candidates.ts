// STOPGAP RULES3-GOV-063: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: createCandidates.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1791: Number(world.currentDate.slice(0, 4)) */
export function createCandidatesRule1(facts: {
  readonly currentDateSlice04: string;
}) {
  return Number(facts.currentDateSlice04);
}

/** Legacy line 1792: index < count */
export function createCandidatesRule2(facts: {
  readonly index: number;
  readonly count: number;
}) {
  return facts.index < facts.count;
}

/** Legacy line 1792: index += 1 */
export function createCandidatesRule3(facts: { readonly index: number }) {
  return facts.index + 1;
}
