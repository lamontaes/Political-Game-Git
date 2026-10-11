/** Supporting immutable-array indexes retained with dated cash and opening-pay rules. */
import type { EntityId } from "../../simulation/types";
const RECENT_LIMIT = 16;
function startsWith(
  records: readonly unknown[],
  prior: readonly unknown[],
): boolean {
  if (prior.length === 0 || prior.length > records.length) return false;
  return beginsWith(records, prior);
}
function adoptFromPrefix<V>(
  cache: WeakMap<object, V>,
  recent: (readonly unknown[])[],
  records: readonly unknown[],
): {
  readonly value: V;
  readonly from: number;
} | null {
  const line = LINES.get(records)?.line;
  for (let at = recent.length - 1; at >= 0; at -= 1) {
    const prior = recent[at]!;
    if (prior.length === 0 || prior.length > records.length) continue;
    const value = cache.get(prior);
    if (value === undefined) continue;
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
export function recordById<
  T extends {
    readonly id: EntityId;
  },
>(records: readonly T[], id: EntityId): T | undefined {
  return growingIndex(FIRST_RECORD_BY_ID, records).get(id) as T | undefined;
}
export interface GrowingIndexKind<I> {
  readonly create: () => I;
  readonly add: (index: I, record: unknown, position: number) => void;
}
interface GrowingIndexState<I> {
  readonly byList: WeakMap<readonly unknown[], I>;
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
const LINES = new WeakMap<
  readonly unknown[],
  {
    readonly line: object;
    grown: boolean;
  }
>();
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
const FIRST_RECORD_BY_ID: GrowingIndexKind<Map<unknown, unknown>> = {
  create: () => new Map(),
  add: (index, record) => {
    const id = (
      record as {
        readonly id?: unknown;
      }
    ).id;
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
