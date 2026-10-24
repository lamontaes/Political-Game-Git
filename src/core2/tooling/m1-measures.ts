/**
 * Measures the M1-03 and M1-04 checks share, kept apart so each has its own
 * test. A counted record stands for its household's weight (heads), a full
 * person's for one; rates are compared with real ones per person, so every
 * count is of the people records stand for.
 */

/** People the records stand for: each record times its heads. */
export function represented<T>(
  records: Iterable<T>,
  heads: (record: T) => number,
): number {
  let n = 0;
  for (const record of records) n += heads(record);
  return n;
}

/** A state's rate from its regions', weighted by their people. */
export function weightedRate(
  rows: readonly { pct: number; people: number }[],
): number {
  const total = rows.reduce((sum, row) => sum + row.people, 0);
  return rows.reduce((sum, row) => sum + row.pct * row.people, 0) / total;
}

/** A state's opening rate against its published one: no case is excused. */
export function openingRateMatches(
  rows: readonly { pct: number; people: number }[],
  published: number,
): boolean {
  return Math.abs(weightedRate(rows) - published) <= 1e-6;
}
