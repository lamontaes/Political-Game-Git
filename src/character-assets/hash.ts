/**
 * A simple, dependency-free, deterministic FNV-1a hash function for strings.
 * This ensures cross-platform stability and avoids dependency on simulation tick RNG.
 */
export function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

/**
 * Deterministically selects an item from a canonically sorted array.
 * Uses an independent channel string (e.g. "body", "hair") so adding a new
 * selection later doesn't reshuffle existing choices.
 */
export function selectDeterministically<T>(
  items: readonly T[],
  seed: string,
  libraryVersion: string,
  channel: string,
  getId: (item: T) => string,
): T {
  if (items.length === 0) {
    throw new Error(
      `Cannot select deterministically from an empty array for channel: ${channel}`,
    );
  }

  // Ensure canonical sorting to prevent filesystem or JS object insertion order from affecting outcome.
  // Using direct ASCII/code-unit comparison rather than localeCompare to ensure absolute cross-platform determinism.
  const sortedItems = [...items].sort((a, b) => {
    const idA = getId(a);
    const idB = getId(b);
    return idA < idB ? -1 : idA > idB ? 1 : 0;
  });

  // Generate salted hash
  const hashVal = fnv1a(`${seed}|${libraryVersion}|${channel}`);
  const index = hashVal % sortedItems.length;

  return sortedItems[index] as T; // Since length > 0, index is within bounds
}
