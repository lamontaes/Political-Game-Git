// STOPGAP RULES3-GOV-023: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: weeklyHoursHeld.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1243: sum + (minimumHours + maximumHours) / 2 */
export function weeklyHoursHeldRule1(facts: {
  readonly sum: number;
  readonly minimumHours: number;
  readonly maximumHours: number;
}) {
  return facts.sum + (facts.minimumHours + facts.maximumHours) / 2;
}
