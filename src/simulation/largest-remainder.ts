/**
 * Largest remainder (Hamilton's method) in exact integers: how many of
 * `slots` each weight is owed. Every weight first gets the whole slots its
 * share earns, rounded down; the slots left go one each to the largest
 * remainders, ties to the larger weight and then the earlier entry. The
 * counts always sum to `slots`. Neither older allocator fits:
 * `displayedSharePercents` rounds floating percentages for display, and
 * `apportionHouse` guarantees every entry one seat.
 *
 * First written for the survey household donors (#1742,
 * `source/adapters/acs-pums-character-history.ts`, which re-exports it); it
 * lives here so simulation code shares the one allocator without importing a
 * source adapter.
 */
export function largestRemainderAllocation(
  weights: readonly number[],
  slots: number,
): readonly number[] {
  if (!Number.isSafeInteger(slots) || slots < 1)
    throw new Error("A donor allocation needs a positive whole slot count.");
  const exact = weights.map((weight) => {
    if (!Number.isSafeInteger(weight) || weight <= 0)
      throw new Error("A donor allocation needs positive whole weights.");
    return BigInt(weight);
  });
  const total = exact.reduce((sum, weight) => sum + weight, 0n);
  if (total <= 0n) throw new Error("A donor allocation needs some weight.");
  const owed = exact.map((weight) => weight * BigInt(slots));
  const counts = owed.map((value) => Number(value / total));
  let left = slots - counts.reduce((sum, count) => sum + count, 0);
  const order = owed
    .map((value, index) => ({ index, remainder: value % total }))
    .sort((a, b) =>
      a.remainder !== b.remainder
        ? a.remainder > b.remainder
          ? -1
          : 1
        : exact[a.index]! !== exact[b.index]!
          ? exact[a.index]! > exact[b.index]!
            ? -1
            : 1
          : a.index - b.index,
    );
  for (const { index } of order) {
    if (left <= 0) break;
    counts[index] = counts[index]! + 1;
    left -= 1;
  }
  return counts;
}
