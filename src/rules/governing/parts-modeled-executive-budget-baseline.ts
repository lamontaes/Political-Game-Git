// STOPGAP RULES3-GOV-040: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/executive-budget-requests.ts :: modeledExecutiveBudgetBaseline.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 211: world.publicBudgets?.governments.filter((government) =>       samePublicGovernmentIdentity(         publicGovernmentIdentityForRecord(government),         identity,       ),     ) ?? [] */
export function modeledExecutiveBudgetBaselineRule1(facts: {
  readonly publicBudgetsGovernmentsFilterGovernmentSamePublicGovernment: unknown;
}) {
  return (
    facts.publicBudgetsGovernmentsFilterGovernmentSamePublicGovernment ?? []
  );
}

/** Legacy line 217: candidates.length !== 1 */
export function modeledExecutiveBudgetBaselineRule2(facts: {
  readonly candidatesLength: number;
}) {
  return facts.candidatesLength !== 1;
}

/** Legacy line 220: row.startsOn <= onDate && row.endsOn >= onDate */
export function modeledExecutiveBudgetBaselineRule3(facts: {
  readonly rowStartsOn: string;
  readonly onDate: string;
  readonly rowEndsOn: string;
}) {
  return facts.rowStartsOn <= facts.onDate && facts.rowEndsOn >= facts.onDate;
}

/** Legacy line 222: !year */
export function modeledExecutiveBudgetBaselineRule4(facts: {
  readonly year: unknown;
}) {
  return !facts.year;
}

/** Legacy line 232: Math.round(year.appropriations[index]! * 100) */
export function modeledExecutiveBudgetBaselineRule5(facts: {
  readonly yearAppropriationsIndex: number;
}) {
  return Math.round(facts.yearAppropriationsIndex * 100);
}
