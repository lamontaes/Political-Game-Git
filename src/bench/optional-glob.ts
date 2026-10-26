const unavailable = new WeakSet<object>();

/**
 * Resolve an `import.meta.glob` result where one exists.
 *
 * Vite and Vitest rewrite the literal glob call inside `load` into an object of
 * matched modules, so this returns exactly that set. Plain Node entrypoints
 * (development CLIs run through tsx) have no `import.meta.glob`; there the call
 * throws and the result is an empty set marked as unavailable, rather than a
 * crash in a tool that never paints.
 */
export function optionalGlob<T>(
  load: () => Record<string, T>,
): Record<string, T> {
  try {
    return load();
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const empty: Record<string, T> = {};
    unavailable.add(empty);
    return empty;
  }
}

/** True only for a result produced outside Vite, where no glob exists at all. */
export function globUnavailable(result: object): boolean {
  return unavailable.has(result);
}
