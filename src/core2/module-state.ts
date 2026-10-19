import { moduleData, moduleKey, type ModuleRow } from "./module-data";
import type { CoreModule, CoreState } from "./types";

export type ModuleIndexValue = string | number | boolean | null;
export interface ModuleIndexDefinition {
  fields: readonly string[];
  unique?: boolean;
}
export interface ModuleTableDefinition {
  indexes?: Readonly<Record<string, ModuleIndexDefinition>>;
  /** Throw on an invalid row. Validation is pure and receives detached, frozen data. */
  validate?: (row: ModuleRow) => void;
}
export interface ModuleStateDefinition {
  schemaVersion: number;
  tables: Readonly<Record<string, ModuleTableDefinition>>;
}
export interface ModuleStateSnapshot {
  moduleId: string;
  schemaVersion: number;
  tables: Readonly<Record<string, readonly ModuleRow[]>>;
}
export interface ModuleTable {
  get(id: string): ModuleRow | undefined;
  put(row: ModuleRow): void;
  remove(id: string): boolean;
  query(
    index: string,
    values: readonly ModuleIndexValue[],
  ): readonly ModuleRow[];
  rows(): readonly ModuleRow[];
  readonly size: number;
}
export interface ModuleStateStore {
  readonly moduleId: string;
  readonly schemaVersion: number;
  table(name: string): ModuleTable;
  snapshot(): ModuleStateSnapshot;
  /** Explicit exact-version replacement; no implicit save migration. */
  restore(snapshot: ModuleStateSnapshot): void;
}
interface Table {
  definition: ModuleTableDefinition;
  rows: Map<string, ModuleRow>;
  indexes: Map<string, Map<string, Set<string>>>;
}
interface Store {
  module: CoreModule;
  schemaVersion: number;
  tables: Map<string, Table>;
  busy: boolean;
}
const stores = new WeakMap<CoreState, Map<string, Store>>();
const facades = new WeakMap<Store, ModuleStateStore>();
function freshTable(definition: ModuleTableDefinition): Table {
  return {
    definition,
    rows: new Map(),
    indexes: new Map(
      Object.keys(definition.indexes ?? {}).map((name) => [name, new Map()]),
    ),
  };
}
/** Preparation is side-effect free so registration failures install no tables. */
export function prepareModuleState(module: CoreModule): Store | undefined {
  const state = module.state;
  if (!state) return undefined;
  if (!Number.isSafeInteger(state.schemaVersion) || state.schemaVersion <= 0)
    throw new Error("Module schema version must be a positive safe integer.");
  const tables = new Map<string, Table>();
  for (const [name, raw] of Object.entries(state.tables)) {
    moduleKey(name);
    if (raw.validate !== undefined && typeof raw.validate !== "function")
      throw new Error("Invalid module row validator.");
    const indexes = moduleData(raw.indexes ?? {});
    for (const [key, index] of Object.entries(indexes)) {
      moduleKey(key);
      if (
        !index.fields.length ||
        new Set(index.fields).size !== index.fields.length ||
        (index.unique !== undefined && typeof index.unique !== "boolean")
      )
        throw new Error("Invalid module index.");
      index.fields.forEach(moduleKey);
    }
    tables.set(name, freshTable({ indexes, validate: raw.validate }));
  }
  if (!tables.size) throw new Error("Module state needs at least one table.");
  return { module, schemaVersion: state.schemaVersion, tables, busy: false };
}
export function installModuleState(
  core: CoreState,
  store: Store | undefined,
): void {
  if (!store) return;
  let modules = stores.get(core);
  if (!modules) stores.set(core, (modules = new Map()));
  modules.set(store.module.id, store);
}
function indexKey(values: readonly unknown[]): string {
  for (const value of values)
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "boolean" &&
      !(typeof value === "number" && Number.isFinite(value))
    )
      throw new Error("Module index values must be finite scalars.");
  return JSON.stringify(values);
}
/** Each table definition's indexes as a list, built once (writes are frequent). */
const indexLists = new WeakMap<
  object,
  readonly (readonly [
    string,
    { fields: readonly string[]; unique?: boolean },
  ])[]
>();
function indexList(table: Table) {
  const definition = table.definition;
  let list = indexLists.get(definition);
  if (!list)
    indexLists.set(
      definition,
      (list = Object.entries(
        definition.indexes ?? {},
      ) as unknown as readonly (readonly [
        string,
        { fields: readonly string[]; unique?: boolean },
      ])[]),
    );
  return list;
}
function rowKeys(table: Table, row: ModuleRow): [string, string][] {
  const list = indexList(table);
  const keys: [string, string][] = new Array(list.length);
  for (let i = 0; i < list.length; i++) {
    const [name, def] = list[i]!;
    const values: unknown[] = new Array(def.fields.length);
    for (let j = 0; j < def.fields.length; j++) values[j] = row[def.fields[j]!];
    keys[i] = [name, indexKey(values)];
  }
  return keys;
}
function insert(table: Table, row: ModuleRow): void {
  moduleKey(row.id);
  const keys = rowKeys(table, row);
  table.definition.validate?.(row);
  for (const [name, key] of keys) {
    const def = table.definition.indexes![name]!;
    if (!def.unique) continue;
    const ids = table.indexes.get(name)!.get(key);
    if (ids)
      for (const id of ids)
        if (id !== row.id)
          throw new Error(`Duplicate unique module index: ${name}`);
  }
  const old = table.rows.get(row.id);
  if (old) erase(table, old);
  table.rows.set(row.id, row);
  for (const [name, key] of keys) {
    const index = table.indexes.get(name)!;
    let ids = index.get(key);
    if (!ids) index.set(key, (ids = new Set()));
    ids.add(row.id);
  }
}
function erase(table: Table, row: ModuleRow): void {
  for (const [name, key] of rowKeys(table, row)) {
    const index = table.indexes.get(name)!;
    const ids = index.get(key)!;
    ids.delete(row.id);
    if (!ids.size) index.delete(key);
  }
  table.rows.delete(row.id);
}
/**
 * A debug hook for the table trace (scripts/core2-year/table-trace.ts): called
 * on every table read and write with the module, the table and what was done.
 * Off (null) in play and in tests, so the cost is one null check.
 */
export type TableOp = "get" | "put" | "remove" | "query" | "rows";
let tableTrace:
  ((moduleId: string, table: string, op: TableOp) => void) | null = null;
export function setTableTrace(hook: typeof tableTrace): void {
  tableTrace = hook;
}

export function moduleState(
  core: CoreState,
  moduleId: string,
): ModuleStateStore {
  const store = stores.get(core)?.get(moduleKey(moduleId));
  if (!store || core.modules.get(moduleId) !== store.module)
    throw new Error("Module has no registered state.");
  // One facade per store: engines ask for it per row, and every method below
  // checks ownership on each use, so reusing it changes nothing but speed.
  const cached = facades.get(store);
  if (cached) return cached;
  const check = () => {
    if (core.modules.get(moduleId) !== store.module || store.busy)
      throw new Error("Module state owner is stale or reentrant.");
  };
  const operation = <T>(fn: () => T): T => {
    check();
    store.busy = true;
    try {
      return fn();
    } finally {
      store.busy = false;
    }
  };
  const tableFacades = new Map<string, ModuleTable>();
  const facade: ModuleStateStore = Object.freeze({
    moduleId,
    schemaVersion: store.schemaVersion,
    table(name: string): ModuleTable {
      check();
      const known = tableFacades.get(name);
      if (known) return known;
      moduleKey(name);
      if (!store.tables.has(name))
        throw new Error(`Unregistered module table: ${name}`);
      const current = () => store.tables.get(name)!;
      const facade: ModuleTable = Object.freeze({
        get(id: string) {
          check();
          tableTrace?.(moduleId, name, "get");
          return current().rows.get(moduleKey(id));
        },
        put(row: ModuleRow) {
          tableTrace?.(moduleId, name, "put");
          operation(() => insert(current(), moduleData(row)));
        },
        remove(id: string) {
          tableTrace?.(moduleId, name, "remove");
          return operation(() => {
            const row = current().rows.get(moduleKey(id));
            if (!row) return false;
            erase(current(), row);
            return true;
          });
        },
        query(index: string, values: readonly ModuleIndexValue[]) {
          tableTrace?.(moduleId, name, "query");
          return operation(() => {
            const table = current(),
              def = table.definition.indexes?.[moduleKey(index)];
            if (!def || values.length !== def.fields.length)
              throw new Error("Unregistered module index or wrong key arity.");
            // indexKey checks the values are scalars; no copy is needed.
            const ids = table.indexes.get(index)!.get(indexKey(values));
            return Object.freeze(
              ids ? Array.from(ids, (id) => table.rows.get(id)!) : [],
            );
          });
        },
        rows() {
          check();
          tableTrace?.(moduleId, name, "rows");
          return Object.freeze([...current().rows.values()]);
        },
        get size() {
          check();
          return current().rows.size;
        },
      });
      tableFacades.set(name, facade);
      return facade;
    },
    snapshot() {
      check();
      return moduleData({
        moduleId,
        schemaVersion: store.schemaVersion,
        tables: Object.fromEntries(
          [...store.tables].map(([name, table]) => [
            name,
            [...table.rows.values()],
          ]),
        ),
      });
    },
    restore(input: ModuleStateSnapshot) {
      operation(() => {
        const snapshot = moduleData(input);
        if (
          snapshot.moduleId !== moduleId ||
          snapshot.schemaVersion !== store.schemaVersion ||
          Object.keys(snapshot.tables).length !== store.tables.size
        )
          throw new Error("Module snapshot owner, schema, or tables differ.");
        const next = new Map<string, Table>();
        for (const [name, old] of store.tables) {
          const rows = snapshot.tables[name];
          if (!Array.isArray(rows))
            throw new Error("Module snapshot is missing a registered table.");
          const table = freshTable(old.definition);
          for (const row of rows) {
            if (table.rows.has(row.id))
              throw new Error("Duplicate snapshot row.");
            insert(table, row);
          }
          next.set(name, table);
        }
        store.tables = next;
      });
    },
  });
  facades.set(store, facade);
  return facade;
}

/** Rows in each module table, by "module/table" (memory checks and the bench). */
export function moduleTableSizes(core: CoreState): Record<string, number> {
  const sizes: Record<string, number> = {};
  for (const [id, store] of stores.get(core) ?? new Map<string, Store>())
    for (const [name, table] of store.tables)
      sizes[`${id}/${name}`] = table.rows.size;
  return sizes;
}

/** Every installed engine's table store (world snapshots). */
export function moduleStateStores(
  core: CoreState,
): Map<string, ModuleStateStore> {
  return new Map(
    [...(stores.get(core)?.keys() ?? [])].map((id) => [
      id,
      moduleState(core, id),
    ]),
  );
}
