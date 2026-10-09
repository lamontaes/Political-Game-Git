/** Add selected weighted sector values without mutating the caller's map. */
export function addWeightedSectorValuesFromFacts(
  currentValues: ReadonlyMap<string, number>,
  sectors: readonly string[],
  cells: readonly (number | null | undefined)[],
  weight: number,
): ReadonlyMap<string, number> {
  const totals = new Map(currentValues);
  sectors.forEach((sector, index) => {
    const value = cells[index];
    if (value !== null && value !== undefined) {
      totals.set(sector, (totals.get(sector) ?? 0) + value * weight);
    }
  });
  return totals;
}
