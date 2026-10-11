// STOPGAP RULES3-GOV-076: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/nationwide-world/state-executive-terms.ts :: offCycleRecoveryDates.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 256: Number(onDate.slice(0, 4)) */
export function offCycleRecoveryDatesRule1(facts: {
  readonly onDateSlice04: string;
}) {
  return Number(facts.onDateSlice04);
}

/** Legacy line 257: commencementInYear(rule.commencement, startYear) <= onDate */
export function offCycleRecoveryDatesRule2(facts: {
  readonly commencementInYearRuleCommencementStartYear: string;
  readonly onDate: string;
}) {
  return facts.commencementInYearRuleCommencementStartYear <= facts.onDate;
}

/** Legacy line 258: startYear += 1 */
export function offCycleRecoveryDatesRule3(facts: {
  readonly startYear: number;
}) {
  return facts.startYear + 1;
}

/** Legacy line 261: startYear + rule.termYears */
export function offCycleRecoveryDatesRule4(facts: {
  readonly startYear: number;
  readonly ruleTermYears: number;
}) {
  return facts.startYear + facts.ruleTermYears;
}
