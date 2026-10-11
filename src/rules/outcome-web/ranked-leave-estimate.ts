export function reciprocalRankedReferences<T>(
  rows: readonly T[],
  compareCloseness: (a: T, b: T) => number,
  stableKey: (row: T) => string,
): readonly (T & { readonly rank: number; readonly weight: number })[] {
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

export function weightedReferenceMean<T extends { readonly weight: number }>(
  references: readonly T[],
  value: (reference: T) => number,
): number {
  if (references.length === 0)
    throw new Error("No sourced references for the weighted estimate.");
  return (
    references.reduce((sum, row) => sum + value(row) * row.weight, 0) /
    references.reduce((sum, row) => sum + row.weight, 0)
  );
}
export type EstimateKind = "employee-premium" | "low-wage-benefit";

interface Reference {
  readonly stateKey: string;
  readonly percent: number;
  readonly sameRegion: boolean;
  readonly incomeDistanceDollars: number;
  readonly rank: number;
  readonly weight: number;
}

export interface Estimate {
  readonly percent: number;
  readonly references: readonly Reference[];
  readonly method: string;
}

export function rankedPaidLeaveEstimateFromFacts(
  facts: LeaveEstimateFacts,
  stateKey: string,
  kind: EstimateKind,
): Estimate {
  const income = facts.incomes[stateKey];
  const region =
    income === undefined ? null : facts.regionOf(stateKey.slice(3));
  const compare = (
    a: Omit<Reference, "rank" | "weight">,
    b: Omit<Reference, "rank" | "weight">,
  ) =>
    Number(b.sameRegion) - Number(a.sameRegion) ||
    a.incomeDistanceDollars - b.incomeDistanceDollars;
  const candidates = facts.sources[kind]
    .filter(
      (row) =>
        income === undefined || facts.incomes[row.stateKey] !== undefined,
    )
    .map((row) => ({
      ...row,
      sameRegion:
        income !== undefined &&
        facts.regionOf(row.stateKey.slice(3)) === region,
      incomeDistanceDollars:
        income === undefined
          ? 0
          : Math.abs(facts.incomes[row.stateKey]! - income),
    }));
  if (candidates.length === 0)
    throw new Error("No sourced paid-leave rates to estimate from.");
  const references = reciprocalRankedReferences(
    candidates,
    compare,
    (row) => row.stateKey,
  );
  const estimate = {
    percent: weightedReferenceMean(references, (row) => row.percent),
    references,
    method:
      income === undefined
        ? "same-program plain mean because target household income is unread"
        : "same-program Census region and household-income distance; authored reciprocal-rank weights",
  };
  return estimate;
}

export interface LeaveEstimateFacts {
  readonly incomes: Readonly<Record<string, number>>;
  readonly sources: Readonly<
    Record<
      EstimateKind,
      readonly { readonly stateKey: string; readonly percent: number }[]
    >
  >;
  readonly regionOf: (usps: string) => string | null;
}
