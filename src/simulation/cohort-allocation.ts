import { largestRemainderAllocation } from "./largest-remainder";

/** A quota on a recorded cohort, not an independent chance for each actor. */
export function cohortCategoryAt<Key extends string>(
  rows: readonly (readonly [Key, number])[],
  population: number,
  ordinal: number,
): Key {
  return cohortCategoryPosition(rows, population, ordinal).category;
}

/** The member's ordinal within the same measured category, for nested cohorts. */
export function cohortCategoryPosition<Key extends string>(
  rows: readonly (readonly [Key, number])[],
  population: number,
  ordinal: number,
): {
  readonly category: Key;
  readonly categoryPopulation: number;
  readonly categoryOrdinal: number;
} {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= population)
    throw new Error("A cohort ordinal must name an existing member.");
  const positive = rows.filter(([, weight]) => weight > 0);
  const counts = largestRemainderAllocation(
    positive.map(([, weight]) => Math.max(1, Math.round(weight * 1_000_000))),
    population,
  );
  let start = 0;
  for (const [index, [key]] of positive.entries()) {
    const count = counts[index]!;
    if (ordinal < start + count)
      return {
        category: key,
        categoryPopulation: count,
        categoryOrdinal: ordinal - start,
      };
    start += count;
  }
  throw new Error("A cohort allocation has no category for this member.");
}
