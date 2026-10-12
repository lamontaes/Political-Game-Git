import { LAWS_PARAMETERS as parameters } from "./parameters";

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
    return {
      ...candidate,
      rank,
      weight: 1 / rank ** parameters.referenceWeightExponent.value,
    };
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
