/**
 * World snapshots (owner's ruling 7): a long game loads from a compact
 * snapshot of the world plus the commands given since, instead of replaying
 * every day from the opening. A snapshot holds the core's records, every
 * engine's module tables, and the runtime state engines keep outside them,
 * which each engine hands over as a named part (`registerSnapshotPart`).
 * What a snapshot leaves out is rebuilt from the save's recipe: the data
 * tables, the installed engines and their listeners.
 *
 * Loading is only offered when every installed engine says its state is
 * covered (tables, a part, or nothing kept between days); otherwise a save
 * stays the recipe plus every command, which always loads.
 *
 * Records shared between places in the world (the same object reached two
 * ways) stay shared after loading, and the rebuilt world's own tables are
 * refilled in place, since engines check both.
 */
import { moduleStateStores, type ModuleStateSnapshot } from "./module-state";
import type { CoreState } from "./types";

export const SNAPSHOT_FORMAT = "core2-snapshot-v1";
const NOT_YET = Symbol("registered on first use");

/** Rebuilt from the recipe, never saved: the data tables, engines and listeners. */
const REBUILT = new Set([
  "data",
  "modules",
  "reasonProviders",
  "eventSubscribers",
  "eventSubscribersByKind",
  "eventAppraisalSubscribers",
  "eventAppraisalSubscribersByKind",
  "relationshipSubscribers",
  "relationshipSubscribersByKind",
]);

export interface SnapshotPart {
  /** Plain data (Maps and Sets allowed) holding the engine's runtime state. */
  save(core: CoreState): unknown;
  /** Puts it back into a freshly built world of the same recipe. */
  restore(core: CoreState, data: unknown): void;
}

const parts = new Map<string, SnapshotPart>();
const covered = new Set<string>();

/**
 * An engine's runtime state kept outside the core's records and its module
 * tables (for example a WeakMap keyed by the world).
 */
export function registerSnapshotPart(id: string, part: SnapshotPart): void {
  parts.set(id, part);
}

/** Engines whose whole state is in the snapshot (module ids). */
export function declareSnapshotCovered(...moduleIds: string[]): void {
  for (const id of moduleIds) covered.add(id);
}

/** Installed engines whose state a snapshot would miss; empty when it's safe. */
export function uncoveredModules(core: CoreState): string[] {
  return [...core.modules.keys()].filter((id) => !covered.has(id)).sort();
}

export type Encoded =
  null | boolean | number | string | Encoded[] | { [key: string]: Encoded };

export interface WorldSnapshot {
  format: typeof SNAPSHOT_FORMAT;
  apiVersion: string;
  date: string;
  /** `{ core, modules, parts }`, encoded together so shared records stay shared. */
  world: Encoded;
}

const TAGS = [
  "$map",
  "$set",
  "$bigint",
  "$number",
  "$rebuilt",
  "$object",
  "$def",
  "$ref",
];

/** Objects reached more than once, found before encoding. */
function sharedObjects(root: unknown): Set<object> {
  const seen = new Set<object>(),
    shared = new Set<object>();
  const stack: unknown[] = [root];
  while (stack.length) {
    const value = stack.pop();
    if (!value || typeof value !== "object") continue;
    if (seen.has(value)) {
      shared.add(value);
      continue;
    }
    seen.add(value);
    if (value instanceof Map)
      for (const [key, inner] of value) stack.push(key, inner);
    else if (value instanceof Set) for (const inner of value) stack.push(inner);
    else if (Array.isArray(value)) for (const inner of value) stack.push(inner);
    else for (const inner of Object.values(value)) stack.push(inner);
  }
  return shared;
}

/**
 * Maps, Sets and bigints as tagged plain JSON, shared records once with
 * references after; a function becomes a marker for the rebuilt world's own.
 */
export function encode(root: unknown): Encoded {
  const shared = sharedObjects(root);
  const ids = new Map<object, number>();
  const walk = (value: unknown, path: string): Encoded => {
    if (value === null || value === undefined) return null;
    switch (typeof value) {
      case "boolean":
      case "string":
        return value;
      case "number":
        return Number.isFinite(value) ? value : { $number: String(value) };
      case "bigint":
        return { $bigint: value.toString() };
      case "function":
        // Registered by an engine as it installs; the rebuilt world has it.
        return { $rebuilt: true };
      case "symbol":
        throw new Error(`Snapshot can't save a symbol at ${path}.`);
    }
    const object = value as object;
    const known = ids.get(object);
    if (known !== undefined) return { $ref: known };
    let id: number | undefined;
    if (shared.has(object)) ids.set(object, (id = ids.size));
    let out: Encoded;
    if (object instanceof Map)
      out = {
        $map: [...object].map(([key, inner]) => [
          walk(key, `${path}.key`),
          walk(inner, `${path}[${String(key)}]`),
        ]),
      };
    else if (object instanceof Set)
      out = { $set: [...object].map((inner) => walk(inner, `${path}{}`)) };
    else if (Array.isArray(object))
      out = object.map((inner, i) => walk(inner, `${path}[${i}]`));
    else {
      const proto = Object.getPrototypeOf(object);
      if (proto !== Object.prototype && proto !== null)
        throw new Error(`Snapshot can't save a class instance at ${path}.`);
      const fields: Record<string, Encoded> = {};
      for (const [key, inner] of Object.entries(object))
        if (inner !== undefined) fields[key] = walk(inner, `${path}.${key}`);
      // A plain object whose own key looks like a tag is escaped.
      out = TAGS.some((tag) => tag in fields) ? { $object: fields } : fields;
    }
    return id === undefined ? out : { $def: id, v: out };
  };
  return walk(root, "$");
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size)
      return false;
    for (const [key, value] of a) if (!same(value, b.get(key))) return false;
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size)
      return false;
    for (const value of a) if (!b.has(value)) return false;
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as never)[k] !== undefined),
    kb = Object.keys(b).filter((k) => (b as never)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  for (const key of ka)
    if (
      !same(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    )
      return false;
  return true;
}

/** Freeze a rebuilt record and the plain objects and arrays inside it. */
function seal<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value))
    return value;
  const proto = Object.getPrototypeOf(value) as unknown;
  if (!Array.isArray(value) && proto !== Object.prototype) return value;
  for (const inner of Object.values(value)) seal(inner);
  return Object.freeze(value);
}

/**
 * Decode, walking the freshly built world alongside (`current`): its tables
 * are refilled in place, its unchanged frozen records kept, and what an
 * engine registered as it installed (a function) kept from it.
 */
export function decoder(): (
  value: Encoded,
  current?: unknown,
  path?: string,
) => unknown {
  const defs: unknown[] = [];
  const walk = (value: Encoded, current: unknown, path: string): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value))
      return value.map((inner, i) =>
        walk(
          inner,
          Array.isArray(current) ? current[i] : undefined,
          `${path}[${i}]`,
        ),
      );
    if ("$ref" in value) return defs[value.$ref as number];
    if ("$def" in value) {
      const out = walk(value.v!, current, path);
      defs[value.$def as number] = out;
      return out;
    }
    // An engine-registered function: the rebuilt world's, or none yet when
    // the engine registers it on first use (it registers again then).
    if ("$rebuilt" in value)
      return typeof current === "function" ? current : NOT_YET;
    if ("$map" in value) {
      const old = current instanceof Map ? current : undefined;
      const entries = (value.$map as Encoded[][])
        .map(([key, inner]): [unknown, unknown] => {
          const k = walk(key!, undefined, `${path}.key`);
          return [k, walk(inner!, old?.get(k), `${path}[${String(k)}]`)];
        })
        .filter(([, inner]) => inner !== NOT_YET);
      // Refill the rebuilt world's own Map: engines hold references to it.
      if (old && !Object.isFrozen(old)) {
        Map.prototype.clear.call(old);
        for (const [k, inner] of entries) Map.prototype.set.call(old, k, inner);
        return old;
      }
      return new Map(entries);
    }
    if ("$set" in value) {
      const items = (value.$set as Encoded[]).map((inner) =>
        walk(inner, undefined, `${path}{}`),
      );
      if (current instanceof Set && !Object.isFrozen(current)) {
        Set.prototype.clear.call(current);
        for (const item of items) Set.prototype.add.call(current, item);
        return current;
      }
      return new Set(items);
    }
    if ("$bigint" in value) return BigInt(value.$bigint as string);
    if ("$number" in value) return Number(value.$number as string);
    const source = ("$object" in value ? value.$object : value) as Record<
      string,
      Encoded
    >;
    const old =
      current &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      !(current instanceof Map) &&
      !(current instanceof Set)
        ? (current as Record<string, unknown>)
        : undefined;
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(source))
      out[key] = walk(inner, old?.[key], `${path}.${key}`);
    // A frozen record unchanged since the opening stays the rebuilt world's
    // own object (engines check that identity).
    // One that changed in play (an authority a hire joined) is sealed again,
    // as the record it replaced was: engines read a frozen record as admitted.
    if (old && Object.isFrozen(old)) return same(out, old) ? old : seal(out);
    // Refill the rebuilt world's own object in place when it can be written.
    if (old && Object.isExtensible(old)) {
      for (const key of Object.keys(old))
        if (!(key in out) && typeof old[key] !== "function") delete old[key];
      for (const [key, inner] of Object.entries(out))
        if (old[key] !== inner) old[key] = inner;
      return old;
    }
    return out;
  };
  return (value, current, path = "$") => walk(value, current, path);
}

export function snapshotWorld(core: CoreState): WorldSnapshot {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(core))
    if (!REBUILT.has(key)) record[key] = value;
  const saved: Record<string, unknown> = {};
  for (const [id, part] of parts) saved[id] = part.save(core);
  return {
    format: SNAPSHOT_FORMAT,
    apiVersion: core.apiVersion,
    date: core.date,
    world: encode({
      core: record,
      modules: [...moduleStateStores(core)].map(([id, store]) => [
        id,
        store.snapshot(),
      ]),
      parts: saved,
    }),
  };
}

/**
 * Put a snapshot into a world freshly built from the same recipe (its engines
 * installed, nothing advanced). The world then continues from the snapshot's date.
 */
export function restoreWorld(core: CoreState, snapshot: WorldSnapshot): void {
  if (snapshot.format !== SNAPSHOT_FORMAT)
    throw new Error(`Unknown snapshot format: ${snapshot.format}`);
  const world = snapshot.world as Record<string, Encoded>;
  const decode = decoder();
  // Field by field: the rebuilt fields (data, engines, listeners) stay.
  const target = core as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(
    world.core as Record<string, Encoded>,
  ))
    target[key] = decode(value, target[key], `core.${key}`);
  const stores = moduleStateStores(core);
  for (const [id, saved] of decode(world.modules!, undefined, "modules") as [
    string,
    ModuleStateSnapshot,
  ][]) {
    const store = stores.get(id);
    if (!store)
      throw new Error(`Snapshot has tables for a missing engine: ${id}`);
    store.restore(saved);
  }
  const savedParts = decode(world.parts!, undefined, "parts") as Record<
    string,
    unknown
  >;
  for (const [id, part] of parts)
    if (id in savedParts) part.restore(core, savedParts[id]);
}

/** A runtime kept in a WeakMap keyed by the world, saved as one part. */
export function registerWorldMapPart<T>(
  id: string,
  map: WeakMap<CoreState, T>,
): void {
  registerSnapshotPart(id, {
    save: (core) => map.get(core),
    restore: (core, data) => {
      if (data === undefined || data === null) map.delete(core);
      else map.set(core, data as T);
    },
  });
}
