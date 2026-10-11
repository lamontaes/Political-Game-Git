// STOPGAP RULES3-GOV-070: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/executive-term-rules-in-world.ts :: nextRegularElectionInWorld.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 231: !segments */
export function nextRegularElectionInWorldRule1(facts: {
  readonly segments: unknown;
}) {
  return !facts.segments;
}

/** Legacy line 232: Number(onDate.slice(0, 4)) */
export function nextRegularElectionInWorldRule2(facts: {
  readonly onDateSlice04: string;
}) {
  return Number(facts.onDateSlice04);
}

/** Legacy line 233: year < from + 40 */
export function nextRegularElectionInWorldRule3(facts: {
  readonly year: number;
  readonly from: number;
}) {
  return facts.year < facts.from + 40;
}

/** Legacy line 233: year += 1 */
export function nextRegularElectionInWorldRule4(facts: {
  readonly year: number;
}) {
  return facts.year + 1;
}

/** Legacy line 235: !isElectionYear(rule.election, year) */
export function nextRegularElectionInWorldRule5(facts: {
  readonly isElectionYearRuleElectionYear: boolean;
}) {
  return !facts.isElectionYearRuleElectionYear;
}

/** Legacy line 237: day >= onDate */
export function nextRegularElectionInWorldRule6(facts: {
  readonly day: string;
  readonly onDate: string;
}) {
  return facts.day >= facts.onDate;
}
