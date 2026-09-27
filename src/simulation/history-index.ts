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

/*
 * A writer appends to a history family by making a new array that begins with
 * every record of the old one. Rebuilding an index from scratch after each
 * append made a big world's Day pay for every record of a family on every
 * write: with every legislature seated, one Day rebuilt the due-item and
 * legislative indexes thousands of times.
 *
 * So an index built for an array can move to the array that extends it. The
 * move is made only after checking, record by record, that the new array
 * starts with exactly the old one's records; anything else builds afresh, so
 * the answer is always the one a fresh build would give. The old array loses
 * its index and rebuilds it only if it is read again. Groups handed out
 * earlier are never changed: a group that gains a record is copied.
 */
const RECENT_LIMIT = 16;

function startsWith(
  records: readonly unknown[],
  prior: readonly unknown[],
): boolean {
  if (prior.length === 0 || prior.length > records.length) return false;
  for (let index = prior.length - 1; index >= 0; index -= 1)
    if (records[index] !== prior[index]) return false;
  return true;
}

/** Takes the index of a recently indexed array that `records` extends. */
function adoptFromPrefix<V>(
  cache: WeakMap<object, V>,
  recent: (readonly unknown[])[],
  records: readonly unknown[],
): { readonly value: V; readonly from: number } | null {
  for (let at = recent.length - 1; at >= 0; at -= 1) {
    const prior = recent[at]!;
    // Cheap rejections first: most recent arrays belong to other families.
    if (
      prior.length === 0 ||
      prior.length > records.length ||
      records[prior.length - 1] !== prior[prior.length - 1] ||
      records[0] !== prior[0]
    )
      continue;
    const value = cache.get(prior);
    if (value === undefined || !startsWith(records, prior)) continue;
    cache.delete(prior);
    recent.splice(at, 1);
    return { value, from: prior.length };
  }
  return null;
}

function remember(
  recent: (readonly unknown[])[],
  records: readonly unknown[],
): void {
  recent.push(records);
  if (recent.length > RECENT_LIMIT) recent.shift();
}

/**
 * The same move for any index over one history array. `build` makes the index
 * from nothing; `extend` adds records[from..] to an index taken from the array
 * this one extends, and must not change anything it has already handed out.
 */
export function indexFollowingAppends<V>(
  cache: WeakMap<object, V>,
  recent: (readonly unknown[])[],
  records: readonly unknown[],
  build: () => V,
  extend: (index: V, from: number) => V,
): V {
  const cached = cache.get(records);
  if (cached !== undefined) return cached;
  const adopted = adoptFromPrefix(cache, recent, records);
  const index = adopted ? extend(adopted.value, adopted.from) : build();
  cache.set(records, index);
  remember(recent, records);
  return index;
}

const STABLE_KEYS = new WeakMap<object, Set<string>>();
const RECENT_STABLE_KEYS: (readonly unknown[])[] = [];

/** Every stable key a history family holds, following appends. */
export function stableKeysOf(
  records: readonly { readonly stableKey: string }[],
): ReadonlySet<string> {
  return indexFollowingAppends(
    STABLE_KEYS,
    RECENT_STABLE_KEYS,
    records,
    () => new Set(records.map((record) => record.stableKey)),
    (keys, from) => {
      for (let at = from; at < records.length; at += 1)
        keys.add(records[at]!.stableKey);
      return keys;
    },
  );
}

/**
 * First-record lookup for append-oriented histories. Array identity is the
 * cache boundary: a writer's new array receives the index of the array it
 * extends (see above), while the many reads of an unchanged family reuse the
 * same one. Keeping the first record preserves
 * `records.find(record => record.id === id)` even for malformed histories,
 * which the integrity pass must still reject separately.
 */
const RECORDS_BY_ID = new WeakMap<object, Map<EntityId, unknown>>();
const RECENT_BY_ID: (readonly unknown[])[] = [];

export function recordById<T extends { readonly id: EntityId }>(
  records: readonly T[],
  id: EntityId,
): T | undefined {
  let index = RECORDS_BY_ID.get(records);
  if (!index) {
    const adopted = adoptFromPrefix(RECORDS_BY_ID, RECENT_BY_ID, records);
    const built = adopted?.value ?? new Map<EntityId, unknown>();
    for (let at = adopted?.from ?? 0; at < records.length; at += 1) {
      const record = records[at]!;
      if (!built.has(record.id)) built.set(record.id, record);
    }
    index = built;
    RECORDS_BY_ID.set(records, index);
    remember(RECENT_BY_ID, records);
  }
  return index.get(id) as T | undefined;
}

const RECORDS_BY_STRING_FIELD = new WeakMap<
  object,
  Map<string, Map<string, readonly unknown[]>>
>();
const RECENT_BY_STRING_FIELD: (readonly unknown[])[] = [];

/** Preserve array order while narrowing a history scan to one owner. */
export function recordsByStringField<T>(
  records: readonly T[],
  field: keyof T,
  value: string,
): readonly T[] {
  let fields = RECORDS_BY_STRING_FIELD.get(records);
  if (!fields) {
    const adopted = adoptFromPrefix(
      RECORDS_BY_STRING_FIELD,
      RECENT_BY_STRING_FIELD,
      records,
    );
    fields = new Map();
    if (adopted) {
      // Every field the old array was grouped by gains the appended records.
      for (const [name, groups] of adopted.value) {
        try {
          fields.set(
            name,
            extendGroups(groups, records, adopted.from, name as keyof T),
          );
        } catch {
          // A malformed appended record: leave this field to a fresh build,
          // which reports it.
        }
      }
    }
    RECORDS_BY_STRING_FIELD.set(records, fields);
    remember(RECENT_BY_STRING_FIELD, records);
  }
  const fieldName = String(field);
  let groups = fields.get(fieldName);
  if (!groups) {
    groups = extendGroups(new Map(), records, 0, field);
    fields.set(fieldName, groups);
  }
  return (groups.get(value) ?? []) as readonly T[];
}

/** Adds records[from..] to their groups, copying any group that grows. */
function extendGroups<T>(
  groups: Map<string, readonly unknown[]>,
  records: readonly T[],
  from: number,
  field: keyof T,
): Map<string, readonly unknown[]> {
  const grown = new Map<string, unknown[]>();
  for (let at = from; at < records.length; at += 1) {
    const record = records[at]!;
    const key = record[field];
    if (typeof key !== "string") {
      throw new Error(`History field ${String(field)} must be a string.`);
    }
    let group = grown.get(key);
    if (!group) {
      group = [...(groups.get(key) ?? [])];
      grown.set(key, group);
    }
    group.push(record);
  }
  for (const [key, group] of grown) groups.set(key, group);
  return groups;
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
