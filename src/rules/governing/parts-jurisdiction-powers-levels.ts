// STOPGAP RULES3-GOV-056: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/question-authority.ts :: jurisdictionPowersLevels.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 175: levels.length > 0 */
export function jurisdictionPowersLevelsRule1(facts: {
  readonly levelsLength: number;
}) {
  return facts.levelsLength > 0;
}
