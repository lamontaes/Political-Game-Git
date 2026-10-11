// STOPGAP RULES3-GOV-079: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/office-pay.ts :: estimatedStatePay.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 144: office === "member-of-congress" */
export function estimatedStatePayRule1(facts: { readonly office: string }) {
  return facts.office === "member-of-congress";
}

/** Legacy line 149: values.length < 4 */
export function estimatedStatePayRule2(facts: {
  readonly valuesLength: number;
}) {
  return facts.valuesLength < 4;
}

/** Legacy line 154: targetIncome === undefined ? null : censusRegionOf(state) */
export function estimatedStatePayRule3(facts: {
  readonly targetIncome: number | undefined;
  readonly censusRegionOfState: string;
}) {
  return facts.targetIncome! === undefined ? null : facts.censusRegionOfState;
}

/** Legacy line 157: targetIncome !== undefined && income === undefined */
export function estimatedStatePayRule4(facts: {
  readonly targetIncome: number | undefined;
  readonly income: number | undefined;
}) {
  return facts.targetIncome! !== undefined && facts.income! === undefined;
}

/** Legacy line 163: targetRegion !== null &&           censusRegionOf(referenceState) === targetRegion */
export function estimatedStatePayRule5(facts: {
  readonly targetRegion: string | null;
  readonly censusRegionOfReferenceState: string;
}) {
  return (
    facts.targetRegion! !== null &&
    facts.censusRegionOfReferenceState === facts.targetRegion
  );
}

/** Legacy line 166: targetIncome === undefined ? 0 : Math.abs(income! - targetIncome) */
export function estimatedStatePayRule6(facts: {
  readonly targetIncome: number | undefined;
  readonly income: number;
}) {
  return facts.targetIncome! === undefined
    ? 0
    : Math.abs(facts.income - facts.targetIncome);
}

/** Legacy line 174: Number(b.sameRegion) - Number(a.sameRegion) ||     a.incomeDistance - b.incomeDistance */
export function estimatedStatePayRule7(facts: {
  readonly bSameRegion: boolean;
  readonly aSameRegion: boolean;
  readonly aIncomeDistance: number;
  readonly bIncomeDistance: number;
}) {
  return (
    Number(facts.bSameRegion) - Number(facts.aSameRegion) ||
    facts.aIncomeDistance - facts.bIncomeDistance
  );
}

/** Legacy line 182: Math.round(mean / 100) * 100 */
export function estimatedStatePayRule8(facts: { readonly mean: number }) {
  return Math.round(facts.mean / 100) * 100;
}

/** Legacy line 187: targetIncome === undefined ? "same-office plain mean; target household income is not read" : `ranked by Census region, then sourced household-income distance (${stateHouseholdIncome2023.source.url}); reciprocal-rank weights are an authored estimation */
export function estimatedStatePayRule9(facts: {
  readonly targetIncome: number | undefined;
  readonly stateHouseholdIncome2023SourceUrl: string;
}) {
  return facts.targetIncome! === undefined
    ? "same-office plain mean; target household income is not read"
    : `ranked by Census region, then sourced household-income distance (${facts.stateHouseholdIncome2023SourceUrl}); reciprocal-rank weights are an authored estimation rule`;
}
