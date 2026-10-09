/**
 * Owner rule R6 (October 8, 2026): no more than two items in a batch share a
 * kind of moment, screen, place, relationship or setup, and the batch is
 * shuffled so neighbors differ. Pure: it only orders and counts items.
 */

/** The dimensions owner rule R6 keeps to two items each. */
export const DIMENSIONS = [
  "moment",
  "screen",
  "place",
  "relationship",
  "setup",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface Rule6Item {
  readonly id: string;
  readonly moment: string;
  readonly screen: string;
  readonly place: string;
  /** Null for an item with no other person in it. */
  readonly relationship: string | null;
  readonly setup: string;
}

/**
 * Owner rule R6: keep each value of each dimension to two items. Each step
 * takes the eligible item that repeats the fewest values already chosen, so
 * every kind of moment, screen and place gets in before any repeats; `order`
 * breaks ties.
 */
export function selectByRule6<T extends Rule6Item>(
  candidates: readonly T[],
  order: (item: T) => string,
): T[] {
  const counts = new Map<string, number>();
  const keysOf = (item: T) =>
    DIMENSIONS.flatMap((dimension) => {
      const value = item[dimension];
      return value === null ? [] : [`${dimension}:${value}`];
    });
  const left = [...candidates].sort((a, b) => order(a).localeCompare(order(b)));
  const chosen: T[] = [];
  for (;;) {
    let best: { item: T; repeats: number } | null = null;
    for (const item of left) {
      const keys = keysOf(item);
      if (keys.some((key) => (counts.get(key) ?? 0) >= 2)) continue;
      const repeats = keys.reduce(
        (sum, key) => sum + (counts.get(key) ?? 0),
        0,
      );
      if (!best || repeats < best.repeats) best = { item, repeats };
    }
    if (!best) return chosen;
    left.splice(left.indexOf(best.item), 1);
    for (const key of keysOf(best.item))
      counts.set(key, (counts.get(key) ?? 0) + 1);
    chosen.push(best.item);
  }
}

/** Neighbors differ in kind of moment and in place wherever they can. */
export function spread<T extends Rule6Item>(items: readonly T[]): T[] {
  const left = [...items];
  const out: T[] = [];
  while (left.length > 0) {
    const last = out.at(-1);
    const index = left.findIndex(
      (item) =>
        !last || (item.moment !== last.moment && item.place !== last.place),
    );
    out.push(left.splice(index >= 0 ? index : 0, 1)[0]!);
  }
  return out;
}

export function coverageOf(
  items: readonly Rule6Item[],
): Record<Dimension, Record<string, number>> {
  const table = Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, {} as Record<string, number>]),
  ) as Record<Dimension, Record<string, number>>;
  for (const item of items)
    for (const dimension of DIMENSIONS) {
      const value = item[dimension] ?? "(none)";
      table[dimension][value] = (table[dimension][value] ?? 0) + 1;
    }
  return table;
}
