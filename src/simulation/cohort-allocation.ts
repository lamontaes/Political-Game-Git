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
  // Interleave the exact quotas by their service deadlines. A town's first
  // represented households must not all belong to the first source category.
  // Starting at each quota's elapsed share leaves fewer than rows.length
  // positions to settle, rather than walking the entire population.
  const served = counts.map((count) =>
    Math.floor((ordinal * count) / population),
  );
  let position = served.reduce((sum, count) => sum + count, 0);
  while (position <= ordinal) {
    let next = -1;
    for (let index = 0; index < counts.length; index++) {
      if (served[index]! >= counts[index]!) continue;
      if (
        next < 0 ||
        (served[index]! + 1) * counts[next]! <
          (served[next]! + 1) * counts[index]!
      )
        next = index;
    }
    if (next < 0) break;
    if (position === ordinal)
      return {
        category: positive[next]![0],
        categoryPopulation: counts[next]!,
        categoryOrdinal: served[next]!,
      };
    served[next]! += 1;
    position += 1;
  }
  throw new Error("A cohort allocation has no category for this member.");
}
