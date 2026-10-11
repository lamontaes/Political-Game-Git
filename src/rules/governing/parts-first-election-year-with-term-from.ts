// STOPGAP RULES3-GOV-071: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/executive-term-rules-in-world.ts :: firstElectionYearWithTermFrom.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 108: Number(date.slice(0, 4)) - 1 */
export function firstElectionYearWithTermFromRule1(facts: {
  readonly dateSlice04: string;
}) {
  return Number(facts.dateSlice04) - 1;
}

/** Legacy line 109: year < from + 40 */
export function firstElectionYearWithTermFromRule2(facts: {
  readonly year: number;
  readonly from: number;
}) {
  return facts.year < facts.from + 40;
}

/** Legacy line 109: year += 1 */
export function firstElectionYearWithTermFromRule3(facts: {
  readonly year: number;
}) {
  return facts.year + 1;
}

/** Legacy line 111: !isElectionYear(rule.election, year) */
export function firstElectionYearWithTermFromRule4(facts: {
  readonly isElectionYearRuleElectionYear: boolean;
}) {
  return !facts.isElectionYearRuleElectionYear;
}

/** Legacy line 113: commencementAfter(rule.commencement, election) >= date */
export function firstElectionYearWithTermFromRule5(facts: {
  readonly commencementAfterRuleCommencementElection: string;
  readonly date: string;
}) {
  return facts.commencementAfterRuleCommencementElection >= facts.date;
}
