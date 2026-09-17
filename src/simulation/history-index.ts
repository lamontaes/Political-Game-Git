import type { EntityId, World } from "./types";

/**
 * Lookups over history, built once per write instead of once per record.
 *
 * Q47-006 profile: the integrity pass asks "does this id exist, and was it
 * available then?" for every record it checks, and each answer scanned — and
 * in one case rebuilt — the whole of that family's history. The cost of
 * validating one write therefore grew with the length of the life, which is
 * what made an evolved click slow.
 *
 * A history object is replaced on every write and never edited, so an index
 * keyed by that object is exact: a write builds it once, every reference
 * check in that same validation reuses it, and the next write starts fresh.
 */
const INDEXES = new WeakMap<object, Map<string, unknown>>();

export function historyIndex<T>(world: World, key: string, build: () => T): T {
  const owner = world.history as unknown as object;
  let table = INDEXES.get(owner);
  if (!table) {
    table = new Map<string, unknown>();
    INDEXES.set(owner, table);
  }
  const existing = table.get(key);
  if (existing !== undefined) return existing as T;
  const built = build();
  table.set(key, built);
  return built;
}

export interface AvailabilityEntry {
  readonly date: string;
  readonly sequence: number;
}

/** Keeps the earliest-dated entry for an id, as a linear scan would find. */
export function addAvailability(
  index: Map<EntityId, AvailabilityEntry>,
  id: EntityId,
  date: string,
  sequence: number,
): void {
  if (!index.has(id)) index.set(id, { date, sequence });
}

/**
 * The same index, but kept while the arrays it was built from are unchanged.
 *
 * A write replaces one or two history arrays and leaves the rest alone, so an
 * index over families that did not change is still exact. Comparing a handful
 * of array identities costs nothing next to rebuilding the index, and it turns
 * "rebuild on every write" into "rebuild when that part of history actually
 * changed".
 */
const SOURCED = new WeakMap<
  object,
  { sources: readonly unknown[]; value: unknown }
>();

export function indexOverArrays<T>(
  anchor: object,
  sources: readonly unknown[],
  build: () => T,
): T {
  const cached = SOURCED.get(anchor);
  if (
    cached &&
    cached.sources.length === sources.length &&
    cached.sources.every((source, index) => source === sources[index])
  )
    return cached.value as T;
  const value = build();
  SOURCED.set(anchor, { sources: [...sources], value });
  return value;
}
