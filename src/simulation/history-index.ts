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
  return beginsWith(records, prior);
}

/** Takes the index of a recently indexed array that `records` extends. */
function adoptFromPrefix<V>(
  cache: WeakMap<object, V>,
  recent: (readonly unknown[])[],
  records: readonly unknown[],
): { readonly value: V; readonly from: number } | null {
  const line = LINES.get(records)?.line;
  for (let at = recent.length - 1; at >= 0; at -= 1) {
    const prior = recent[at]!;
    if (prior.length === 0 || prior.length > records.length) continue;
    const value = cache.get(prior);
    if (value === undefined) continue;
    // An append line already proves the prefix by identity. Reading its
    // first record again would walk a transaction view's entire tail chain.
    const proven = line !== undefined && LINES.get(prior)?.line === line;
    if (
      !proven &&
      (records[prior.length - 1] !== prior[prior.length - 1] ||
        records[0] !== prior[0] ||
        !startsWith(records, prior))
    )
      continue;
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

/** Every stable key a history family holds, following appends. */
export function stableKeysOf(
  records: readonly { readonly stableKey: string }[],
): ReadonlySet<string> {
  return growingIndex(STABLE_KEYS, records) as ReadonlySet<string>;
}

const KEYED_INDEXES = new Map<
  string,
  {
    readonly cache: WeakMap<object, Map<string, readonly unknown[]>>;
    readonly recent: (readonly unknown[])[];
  }
>();

/**
 * Records grouped under the keys `keysOf` gives each one (none, one or
 * several), in array order, following appends. `name` names the grouping;
 * one name must always use the same `keysOf`.
 */
export function recordsByKey<T>(
  records: readonly T[],
  name: string,
  keysOf: (record: T) => readonly string[],
  key: string,
): readonly T[] {
  let slot = KEYED_INDEXES.get(name);
  if (!slot) {
    slot = { cache: new WeakMap(), recent: [] };
    KEYED_INDEXES.set(name, slot);
  }
  const extend = (
    groups: Map<string, readonly unknown[]>,
    from: number,
  ): Map<string, readonly unknown[]> => {
    const grown = new Map<string, unknown[]>();
    for (let at = from; at < records.length; at += 1) {
      const record = records[at]!;
      for (const recordKey of new Set(keysOf(record))) {
        let group = grown.get(recordKey);
        if (!group) {
          group = [...(groups.get(recordKey) ?? [])];
          grown.set(recordKey, group);
        }
        group.push(record);
      }
    }
    for (const [recordKey, group] of grown) groups.set(recordKey, group);
    return groups;
  };
  const groups = indexFollowingAppends(
    slot.cache,
    slot.recent,
    records,
    () => extend(new Map(), 0),
    extend,
  );
  return (groups.get(key) ?? []) as readonly T[];
}

/**
 * First-record lookup for append-oriented histories. Array identity is the
 * cache boundary: a writer's new array receives the index of the array it
 * extends (see above), while the many reads of an unchanged family reuse the
 * same one. Keeping the first record preserves
 * `records.find(record => record.id === id)` even for malformed histories,
 * which the integrity pass must still reject separately.
 */

export function recordById<T extends { readonly id: EntityId }>(
  records: readonly T[],
  id: EntityId,
): T | undefined {
  return growingIndex(FIRST_RECORD_BY_ID, records).get(id) as T | undefined;
}

const RECORDS_BY_STRING_FIELD = new WeakMap<
  object,
  Map<string, Map<string, readonly unknown[]>>
>();
const RECENT_BY_STRING_FIELD: (readonly unknown[])[] = [];
// Person-owned histories are the hot read path. Keep their grouping directly
// under the immutable record revision instead of traversing the field table.
const PERSON_RECORDS = new WeakMap<object, Map<string, readonly unknown[]>>();
const RECENT_PERSON_RECORDS: (readonly unknown[])[] = [];
// Missing groups are immutable too. Reusing their empty view avoids allocating
// a new list for every absent-person read and makes absence a stable dependency.
const NO_FIELD_RECORDS: readonly unknown[] = Object.freeze([]);

/** Preserve array order while narrowing a history scan to one owner. */
export function recordsByStringField<T>(
  records: readonly T[],
  field: keyof T,
  value: string,
): readonly T[] {
  if (field === "personId") {
    let people = PERSON_RECORDS.get(records);
    if (!people) {
      people = indexFollowingAppends(
        PERSON_RECORDS,
        RECENT_PERSON_RECORDS,
        records,
        () => extendGroups(new Map(), records, 0, field),
        (groups, from) => extendGroups(groups, records, from, field),
      );
    }
    return (people.get(value) ?? NO_FIELD_RECORDS) as readonly T[];
  }
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
  return (groups.get(value) ?? NO_FIELD_RECORDS) as readonly T[];
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
export interface GrowingIndexKind<I> {
  readonly create: () => I;
  readonly add: (index: I, record: unknown, position: number) => void;
}

interface GrowingIndexState<I> {
  readonly byList: WeakMap<readonly unknown[], I>;
  /** Recent arrays retained by the existing bounded append cache. */
  readonly recent: (readonly unknown[])[];
}

const GROWING_STATES = new WeakMap<object, GrowingIndexState<unknown>>();

export function growingIndex<I>(
  kind: GrowingIndexKind<I>,
  records: readonly unknown[],
): I {
  let state = GROWING_STATES.get(kind) as GrowingIndexState<I> | undefined;
  if (!state) {
    state = { byList: new WeakMap(), recent: [] };
    GROWING_STATES.set(kind, state as GrowingIndexState<unknown>);
  }
  const extend = (index: I, from: number): I => {
    for (let at = from; at < records.length; at += 1)
      kind.add(index, records[at], at);
    return index;
  };
  return indexFollowingAppends(
    state.byList,
    state.recent,
    records,
    () => extend(kind.create(), 0),
    extend,
  );
}

/**
 * A new list: `records` followed by `added`. The list is remembered as a
 * growth of `records`, so an index that followed `records` moves to it without
 * rereading every record to prove it (see `beginsWith`).
 */
export function appendedList<T>(
  records: readonly T[],
  added: readonly T[],
): T[] {
  // `concat` copies a long list faster than spreading it; records are
  // objects, never arrays, so nothing is flattened.
  const stream = APPEND_TRANSACTION?.get(records);
  const next = stream
    ? appendHistoryView(stream, added)
    : records.concat(added);
  const from = LINES.get(records);
  if (from && !from.grown) {
    from.grown = true;
    LINES.set(next, { line: from.line, grown: false });
  } else {
    // The first growth of a list starts a line. So does a second growth of
    // the same list: the two new lists share a start but not each other.
    const line = {};
    if (!from) LINES.set(records, { line, grown: true });
    LINES.set(next, { line, grown: false });
  }
  return next;
}

interface HistoryAppendStream {
  base?: readonly unknown[];
  readonly root?: HistoryAppendStream;
  tail?: {
    readonly prior: HistoryAppendStream;
    readonly added: readonly unknown[];
  };
  readonly length: number;
}

let APPEND_TRANSACTION: WeakMap<object, HistoryAppendStream> | undefined;

/** Keep each writer's immutable snapshot, copying this intake's list once. */
export function withHistoryAppendTransaction(
  world: World,
  families: readonly (keyof World["history"])[],
  run: (world: World) => World,
): World {
  const transaction = new WeakMap<object, HistoryAppendStream>();
  for (const family of families) {
    const records = world.history[family];
    if (Array.isArray(records))
      transaction.set(
        records,
        APPEND_TRANSACTION?.get(records) ?? {
          base: records,
          length: records.length,
        },
      );
  }
  const outer = APPEND_TRANSACTION;
  let result: World;
  APPEND_TRANSACTION = transaction;
  try {
    result = run(world);
  } finally {
    APPEND_TRANSACTION = outer;
  }
  if (result === world) return world;
  const history = { ...result.history };
  for (const family of families) {
    const records = result.history[family];
    if (!Array.isArray(records)) continue;
    const stream = transaction.get(records);
    if (!stream || records === world.history[family]) continue;
    const chunks: (readonly unknown[])[] = [];
    let root = stream;
    for (; root.tail; root = root.tail.prior) chunks.push(root.tail.added);
    const added = chunks.reverse().flat();
    // A shared ancestor may already back a longer committed sibling. Only
    // its original logical prefix belongs to this append line.
    const base = root.base!;
    const prefix =
      base.length === root.length ? base : base.slice(0, root.length);
    const materialized = prefix.concat(added);
    // The plain list has exactly this immutable view's records and order.
    // Preserve the append proof so the next reader transfers its index.
    const lineage = LINES.get(records);
    if (lineage) LINES.set(materialized, { ...lineage });
    Object.assign(history, { [family]: materialized });
    // Cached or held views keep their original lengths, but no longer hold
    // this line's prior streams, chunks or old base array.
    let current = stream;
    for (;;) {
      const prior = current.tail?.prior;
      current.base = materialized;
      delete current.tail;
      if (!prior) break;
      current = prior;
    }
  }
  return { ...result, history };
}

function appendHistoryView<T>(
  prior: HistoryAppendStream,
  added: readonly T[],
): T[] {
  const root = prior.tail ? prior.root! : prior;
  const stream: HistoryAppendStream = {
    root,
    tail: { prior, added: [...added] },
    length: prior.length + added.length,
  };
  const index = (key: string | symbol): number | undefined => {
    if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key))
      return undefined;
    const value = Number(key);
    return value < stream.length ? value : undefined;
  };
  const valueAt = (at: number): unknown => {
    // A base record precedes every chunk on this append line. Read its
    // original logical prefix directly; commit rebinds the same base stream.
    if (at < root.length) return root.base![at];
    let current = stream;
    while (current.tail) {
      if (at >= current.tail.prior.length)
        return current.tail.added[at - current.tail.prior.length];
      current = current.tail.prior;
    }
    return current.base![at];
  };
  const view = new Proxy<T[]>([], {
    get(target, key, receiver) {
      if (key === "length") return stream.length;
      if (key === Symbol.iterator)
        return function* () {
          const chunks: (readonly unknown[])[] = [];
          let root = stream;
          for (; root.tail; root = root.tail.prior)
            chunks.push(root.tail.added);
          for (let at = 0; at < root.length; at += 1) yield root.base![at];
          for (let at = chunks.length - 1; at >= 0; at -= 1) yield* chunks[at]!;
        };
      const at = index(key);
      return at === undefined
        ? Reflect.get(target, key, receiver)
        : valueAt(at);
    },
    has(target, key) {
      return index(key) !== undefined || Reflect.has(target, key);
    },
    ownKeys() {
      return [
        ...Array.from({ length: stream.length }, (_, at) => String(at)),
        "length",
      ];
    },
    getOwnPropertyDescriptor(target, key) {
      const at = index(key);
      return at === undefined
        ? Reflect.getOwnPropertyDescriptor(target, key)
        : {
            configurable: true,
            enumerable: true,
            writable: false,
            value: valueAt(at),
          };
    },
    set() {
      throw new Error("A state-intake history snapshot is immutable");
    },
    deleteProperty() {
      throw new Error("A state-intake history snapshot is immutable");
    },
    defineProperty() {
      throw new Error("A state-intake history snapshot is immutable");
    },
  });
  APPEND_TRANSACTION!.set(view, stream);
  return view;
}

/**
 * Lists built by `appendedList`, grouped in lines: each list in a line is the
 * one before it with records added, so a shorter list in a line begins every
 * longer one. Only a line's newest list can grow it. The lists hold no
 * reference to each other, so an old list is freed as usual.
 */
const LINES = new WeakMap<
  readonly unknown[],
  { readonly line: object; grown: boolean }
>();

/**
 * Whether `records` begins with every record of `prefix`, by identity.
 *
 * Two lists on one line (`appendedList`) are proven by their lengths. Any
 * other pair is compared record by record: proving a long list had only
 * grown cost as much as the list, so a world's tenth year spent seconds on it
 * (Build 18 profile, September 28, 2026).
 */
function beginsWith(
  records: readonly unknown[],
  prefix: readonly unknown[],
): boolean {
  const line = LINES.get(records)?.line;
  if (
    line !== undefined &&
    LINES.get(prefix)?.line === line &&
    prefix.length <= records.length
  )
    return true;
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

const FIRST_RECORD_BY_STABLE_KEY: GrowingIndexKind<Map<unknown, unknown>> = {
  create: () => new Map(),
  add: (index, record) => {
    const key = (record as { readonly stableKey?: unknown }).stableKey;
    if (!index.has(key)) index.set(key, record);
  },
};

/**
 * The first record in the list with this stable key, as
 * `records.find((record) => record.stableKey === stableKey)` returns it.
 */
export function recordByStableKey<T extends { readonly stableKey: string }>(
  records: readonly T[],
  stableKey: string,
): T | undefined {
  return growingIndex(FIRST_RECORD_BY_STABLE_KEY, records).get(stableKey) as
    T | undefined;
}

const FIRST_RECORD_BY_ID: GrowingIndexKind<Map<unknown, unknown>> = {
  create: () => new Map(),
  add: (index, record) => {
    const id = (record as { readonly id?: unknown }).id;
    if (!index.has(id)) index.set(id, record);
  },
};

const GROUPED_BY_FIELD = new Map<
  string,
  {
    readonly cache: WeakMap<object, Map<unknown, readonly unknown[]>>;
    readonly recent: (readonly unknown[])[];
  }
>();

/**
 * The records whose `field` is `value`, in list order: what
 * `records.filter((record) => record[field] === value)` returns, read from an
 * index that follows the list as it grows.
 */
export function recordsWithFieldValue<T, K extends keyof T & string>(
  records: readonly T[],
  field: K,
  value: T[K],
): readonly T[] {
  let slot = GROUPED_BY_FIELD.get(field);
  if (!slot) {
    slot = { cache: new WeakMap(), recent: [] };
    GROUPED_BY_FIELD.set(field, slot);
  }
  if (typeof value === "number" && Number.isNaN(value)) return [];
  const extend = (
    groups: Map<unknown, readonly unknown[]>,
    from: number,
  ): Map<unknown, readonly unknown[]> => {
    const grown = new Map<unknown, unknown[]>();
    for (let at = from; at < records.length; at += 1) {
      const record = records[at]!;
      const key = record[field];
      let group = grown.get(key);
      if (!group) {
        // Groups already returned for an older snapshot stay unchanged.
        // Copy each affected group once for this append batch.
        group = [...(groups.get(key) ?? [])];
        grown.set(key, group);
      }
      group.push(record);
    }
    for (const [key, group] of grown) groups.set(key, group);
    return groups;
  };
  const groups = indexFollowingAppends(
    slot.cache,
    slot.recent,
    records,
    () => extend(new Map(), 0),
    extend,
  );
  return (groups.get(value) ?? []) as readonly T[];
}

/** A metadata replacement no longer extends this array. Release only its
 * existing lookup bindings and append candidates; held rows/groups stay intact,
 * and an old snapshot rebuilds on its next read as it does after adoption.
 */
export function releaseHistoryReadIndexes(records: readonly unknown[]): void {
  const release = (
    cache: { delete(records: readonly unknown[]): boolean },
    recent: (readonly unknown[])[],
  ): void => {
    cache.delete(records);
    for (let at = recent.length - 1; at >= 0; at -= 1) {
      if (recent[at] === records) recent.splice(at, 1);
    }
  };
  release(RECORDS_BY_STRING_FIELD, RECENT_BY_STRING_FIELD);
  release(PERSON_RECORDS, RECENT_PERSON_RECORDS);
  for (const slot of KEYED_INDEXES.values()) release(slot.cache, slot.recent);
  for (const slot of GROUPED_BY_FIELD.values())
    release(slot.cache, slot.recent);
  for (const kind of [
    STABLE_KEYS,
    FIRST_RECORD_BY_STABLE_KEY,
    FIRST_RECORD_BY_ID,
  ]) {
    const state = GROWING_STATES.get(kind);
    if (state) release(state.byList, state.recent);
  }
}

interface PeopleReadIndex {
  readonly order: World["personOrder"];
  readonly value: unknown;
  readonly extend: (
    value: unknown,
    next: World,
    added: readonly EntityId[],
  ) => unknown;
}
const PEOPLE_READ_INDEXES = new WeakMap<
  World["people"],
  Map<string, PeopleReadIndex>
>();

/** Read indexes for an immutable person table and its exact iteration order. */
export function indexOverPeople<T>(
  world: World,
  name: string,
  build: () => T,
  extend: (value: T, next: World, added: readonly EntityId[]) => T,
): T {
  let indexes = PEOPLE_READ_INDEXES.get(world.people);
  if (!indexes) {
    indexes = new Map();
    PEOPLE_READ_INDEXES.set(world.people, indexes);
  }
  const cached = indexes.get(name);
  if (cached?.order === world.personOrder) return cached.value as T;
  const value = build();
  indexes.set(name, {
    order: world.personOrder,
    value,
    extend: (prior, next, added) => extend(prior as T, next, added),
  });
  return value;
}

/**
 * Only an append writer that copied the existing table unchanged may call this.
 * It transfers reads without changing any previously returned index. External
 * person edits have no transfer and therefore rebuild their own indexes.
 */
export function carryPeopleReadIndexesAfterAppend(
  previous: World,
  next: World,
): void {
  const prior = PEOPLE_READ_INDEXES.get(previous.people);
  if (!prior || previous.people === next.people) return;
  const added = next.personOrder.slice(previous.personOrder.length);
  const indexes = new Map<string, PeopleReadIndex>();
  for (const [name, index] of prior) {
    if (index.order !== previous.personOrder) continue;
    indexes.set(name, {
      ...index,
      order: next.personOrder,
      value: index.extend(index.value, next, added),
    });
  }
  PEOPLE_READ_INDEXES.set(next.people, indexes);
}
