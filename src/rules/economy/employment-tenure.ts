export type AgeTenureRow = readonly [
  ageBelow: number,
  medianTenureYears: number,
];

/** Select the supplied median tenure for the first age band above the resident. */
export function medianTenureYearsFromFacts(
  age: number,
  rows: readonly AgeTenureRow[],
): number | null {
  return rows.find(([ageBelow]) => age < ageBelow)?.[1] ?? null;
}
