// STOPGAP RULES3-GOV-043: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/office-continuity.ts :: nextCongressionalElectionAfter.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 440: Number(date.slice(0, 4)) */
export function nextCongressionalElectionAfterRule1(facts: {
  readonly dateSlice04: string;
}) {
  return Number(facts.dateSlice04);
}

/** Legacy line 441: year % 2 === 1 */
export function nextCongressionalElectionAfterRule2(facts: {
  readonly year: number;
}) {
  return facts.year % 2 === 1;
}

/** Legacy line 441: year += 1 */
export function nextCongressionalElectionAfterRule3(facts: {
  readonly year: number;
}) {
  return facts.year + 1;
}

/** Legacy line 443: day <= date */
export function nextCongressionalElectionAfterRule4(facts: {
  readonly day: string;
  readonly date: string;
}) {
  return facts.day <= facts.date;
}

/** Legacy line 443: year + 2 */
export function nextCongressionalElectionAfterRule5(facts: {
  readonly year: number;
}) {
  return facts.year + 2;
}
