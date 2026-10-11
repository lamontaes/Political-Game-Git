// STOPGAP RULES3-GOV-028: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/hazard.ts :: nextMultiplierChange.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 75: change.effectiveAt > after */
export function nextMultiplierChangeRule1(facts: {
  readonly changeEffectiveAt: string;
  readonly after: string;
}) {
  return facts.changeEffectiveAt > facts.after;
}
