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

/**
 * An index over a history list that follows the list as it grows.
 *
 * A writer appends by copying the list, so an index keyed by the list alone
 * is rebuilt from every record after every write: checking one new record
 * against a list of every paycheck cost a little more each Day a world ran.
 * When a list begins with every record of a list already indexed, that index
 * is extended with the new records instead, and the older list gives it up
 * (asked about again, it builds its own). Whether the new list really begins
 * with the old one is checked record by record, by identity.
 */
interface GrowingIndexKind<I> {
  readonly create: () => I;
  readonly add: (index: I, record: unknown, position: number) => void;
}

interface GrowingIndexState<I> {
  readonly byList: WeakMap<readonly unknown[], I>;
  /** The indexed list each record is currently the last record of. */
  readonly listEndingWith: WeakMap<object, readonly unknown[]>;
}

const GROWING_STATES = new WeakMap<object, GrowingIndexState<unknown>>();

/** How far back from a list's end to look for the list it grew from. */
const GROWING_LOOKBACK = 64;

function growingIndex<I>(
  kind: GrowingIndexKind<I>,
  records: readonly unknown[],
): I {
  let state = GROWING_STATES.get(kind) as GrowingIndexState<I> | undefined;
  if (!state) {
    state = { byList: new WeakMap(), listEndingWith: new WeakMap() };
    GROWING_STATES.set(kind, state as GrowingIndexState<unknown>);
  }
  const cached = state.byList.get(records);
  if (cached !== undefined) return cached;
  let index: I | undefined;
  let from = 0;
  const stop = Math.max(0, records.length - GROWING_LOOKBACK);
  for (let at = records.length - 1; at >= stop; at -= 1) {
    const record = records[at];
    if (typeof record !== "object" || record === null) break;
    const earlier = state.listEndingWith.get(record);
    if (!earlier) continue;
    if (earlier.length !== at + 1 || !beginsWith(records, earlier)) break;
    index = state.byList.get(earlier);
    if (index === undefined) break;
    state.byList.delete(earlier);
    state.listEndingWith.delete(record);
    from = at + 1;
    break;
  }
  if (index === undefined) {
    index = kind.create();
    from = 0;
  }
  for (let at = from; at < records.length; at += 1)
    kind.add(index, records[at], at);
  state.byList.set(records, index);
  const last = records.at(-1);
  if (typeof last === "object" && last !== null)
    state.listEndingWith.set(last, records);
  return index;
}

function beginsWith(
  records: readonly unknown[],
  prefix: readonly unknown[],
): boolean {
  for (let at = prefix.length - 1; at >= 0; at -= 1)
    if (records[at] !== prefix[at]) return false;
  return true;
}

const STABLE_KEYS: GrowingIndexKind<Set<unknown>> = {
  create: () => new Set(),
  add: (keys, record) => {
    keys.add((record as { readonly stableKey?: unknown }).stableKey);
  },
};

/** True when a record in the list has this stable key. */
export function hasStableKey(
  records: readonly { readonly stableKey: string }[],
  stableKey: string,
): boolean {
  return growingIndex(STABLE_KEYS, records).has(stableKey);
}
