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

/**
 * First-record lookup for append-oriented histories. Array identity is the
 * cache boundary: a writer's new array receives a new index, while the many
 * reads of an unchanged family reuse the same one. Keeping the first record
 * preserves `records.find(record => record.id === id)` even for malformed
 * histories, which the integrity pass must still reject separately.
 */
const RECORDS_BY_ID = new WeakMap<object, ReadonlyMap<EntityId, unknown>>();

export function recordById<T extends { readonly id: EntityId }>(
  records: readonly T[],
  id: EntityId,
): T | undefined {
  let index = RECORDS_BY_ID.get(records);
  if (!index) {
    const built = new Map<EntityId, T>();
    for (const record of records) {
      if (!built.has(record.id)) built.set(record.id, record);
    }
    index = built;
    RECORDS_BY_ID.set(records, index);
  }
  return index.get(id) as T | undefined;
}

const RECORDS_BY_STRING_FIELD = new WeakMap<
  object,
  Map<string, ReadonlyMap<string, readonly unknown[]>>
>();

/** Preserve array order while narrowing a history scan to one owner. */
export function recordsByStringField<T>(
  records: readonly T[],
  field: keyof T,
  value: string,
): readonly T[] {
  let fields = RECORDS_BY_STRING_FIELD.get(records);
  if (!fields) {
    fields = new Map();
    RECORDS_BY_STRING_FIELD.set(records, fields);
  }
  const fieldName = String(field);
  let groups = fields.get(fieldName);
  if (!groups) {
    const built = new Map<string, T[]>();
    for (const record of records) {
      const key = record[field];
      if (typeof key !== "string") {
        throw new Error(`History field ${fieldName} must be a string.`);
      }
      const group = built.get(key) ?? [];
      group.push(record);
      built.set(key, group);
    }
    groups = built;
    fields.set(fieldName, groups);
  }
  return (groups.get(value) ?? []) as readonly T[];
}

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
