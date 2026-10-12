import { OFFICES_PARAMETERS } from "./parameters";
// STOPGAP offices.salary-reference-estimate: Office salary is a reciprocal-rank regional/income comparison rounded to hundreds with at least four donors.
// stopgapId: "offices.salary-reference-estimate"
import type { OfficePay, PaidOffice } from "../../simulation/office-pay";
export interface PayFacts {
  readonly values: readonly (readonly [string, number])[];
  readonly incomes: Readonly<Record<string, number>>;
  readonly regions: Readonly<Record<string, string | undefined>>;
}
export function reciprocalRankedReferences<T>(
  rows: readonly T[],
  compareCloseness: (a: T, b: T) => number,
  stableKey: (row: T) => string,
): readonly (T & {
  readonly rank: number;
  readonly weight: number;
})[] {
  const candidates = [...rows].sort(
    (a, b) =>
      compareCloseness(a, b) || stableKey(a).localeCompare(stableKey(b)),
  );
  let rank = 1;
  return candidates.map((candidate, index) => {
    if (index > 0 && compareCloseness(candidate, candidates[index - 1]!) !== 0)
      rank = index + 1;
    return { ...candidate, rank, weight: 1 / rank };
  });
}

export function weightedReferenceMean<
  T extends {
    readonly weight: number;
  },
>(references: readonly T[], value: (reference: T) => number): number {
  if (references.length === 0)
    throw new Error("No sourced references for the weighted estimate.");
  return (
    references.reduce((sum, row) => sum + value(row) * row.weight, 0) /
    references.reduce((sum, row) => sum + row.weight, 0)
  );
}
export function estimatedStatePay(
  office: PaidOffice,
  state: string,
  facts: PayFacts,
): OfficePay | null {
  if (office === "member-of-congress") return null;

  const values = facts.values;
  if (values.length < OFFICES_PARAMETERS.salaryMinimumReferences.value)
    return null;
  const incomes = facts.incomes;
  const regionOf = (key: string) => {
    const region = facts.regions[key];
    if (!region) throw new Error(`No Census region for ${key}.`);
    return region;
  };
  const targetIncome = incomes[`US-${state}`];
  const targetRegion = targetIncome === undefined ? null : regionOf(state);
  const references = values.flatMap(([referenceState, annualDollars]) => {
    const income = incomes[`US-${referenceState}`];
    if (targetIncome !== undefined && income === undefined) return [];
    return [
      {
        state: referenceState,
        annualDollars,
        sameRegion:
          targetRegion !== null && regionOf(referenceState) === targetRegion,
        incomeDistance:
          targetIncome === undefined ? 0 : Math.abs(income! - targetIncome),
      },
    ];
  });
  const compare = (
    a: (typeof references)[number],
    b: (typeof references)[number],
  ) =>
    Number(b.sameRegion) - Number(a.sameRegion) ||
    a.incomeDistance - b.incomeDistance;
  const weighted = reciprocalRankedReferences(
    references,
    compare,
    (ref) => ref.state,
  );
  const mean = weightedReferenceMean(weighted, (ref) => ref.annualDollars);
  const annualDollars =
    Math.round(mean / OFFICES_PARAMETERS.salaryRoundingDollars.value) *
    OFFICES_PARAMETERS.salaryRoundingDollars.value;
  const estimate = {
    office,
    state,
    annualDollars,
  };
  return estimate;
}
