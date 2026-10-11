// STOPGAP RULES3-GOV-027: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/hazard.ts :: multiplierAt.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 64: change.effectiveAt <= date */
export function multiplierAtRule1(facts: {
  readonly changeEffectiveAt: string;
  readonly date: string;
}) {
  return facts.changeEffectiveAt <= facts.date;
}
