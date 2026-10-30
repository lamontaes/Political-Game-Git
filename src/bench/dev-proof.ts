/**
 * Dev mode's records proof (owner, Oct 29, 2026, to the speed lead: "That
 * needs to be built into the advanced mode... a dev mode where you can be
 * anybody, make anything happen in the simulation... and trace why things
 * happen"). Two builds that run the same seed and place to the same date
 * should keep the same records; a speed change must not change what the
 * simulation decides. This reads what a world keeps from the same list a
 * snapshot saves (`worldRecords` in `src/core2/snapshot.ts`): the core's
 * records, every engine's tables and every engine's runtime part, the counted
 * population among them. It keeps one digest per table and compares two
 * proofs table by table. A differing table names the first record that
 * differs, so the trace (`dev-trace.ts`) can open it and show why it happened.
 * Engines whose state a snapshot would miss are listed as not covered, never
 * passed as the same. Read-only: it writes nothing and spends no game time.
 */
import { createHash, type Hash } from "node:crypto";
import { bookkeeping } from "../core2/bookkeeping";
import { uncoveredModules, worldRecords } from "../core2/snapshot";
import type { CoreState } from "../core2/types";

export interface RecordProof {
  readonly seed: string;
  readonly date: string;
  /** Proofs taken with the debug bookkeeping on and off keep different records. */
  readonly bookkeeping: boolean;
  /** One digest over every table's digest. */
  readonly digest: string;
  /** Rows and digest by table: "core.people", "<module id>.<table>", "part.<id>.<field>". */
  readonly tables: Readonly<Record<string, { rows: number; digest: string }>>;
  /** Installed engines whose state neither the proof nor a snapshot can see. */
  readonly uncovered: readonly string[];
  /** Each row's digest by table and record id, when asked for. */
  readonly rows?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export interface ProofDifference {
  readonly table: string;
  readonly base?: { rows: number; digest: string };
  readonly head?: { rows: number; digest: string };
  /** The first record id (sorted) whose row differs or is on one side only. */
  readonly firstId?: string;
  /** How many record ids differ, when both proofs kept rows. */
  readonly differingIds?: number;
}

// Cache counters inside engine parts: a restored world starts its own count, so they are not records.
const CACHES = new Set(["moneySerial", "netCache"]);
const DEPTH = 40;
const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const primitive = (value: unknown) =>
  typeof value === "string" ||
  typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));

/**
 * Feeds a value to the hash in a fixed form: object keys and Map keys sorted,
 * arrays in order, a key holding undefined the same as a missing key (as a
 * snapshot saves it).
 */
function feed(hash: Hash, value: unknown, path: Set<object>, depth = 0): void {
  if (value === null || value === undefined || typeof value !== "object") {
    hash.update(
      typeof value === "function" ? "f;" : `${typeof value}:${String(value)};`,
    );
    return;
  }
  if (depth > DEPTH || path.has(value)) {
    hash.update("^;");
    return;
  }
  path.add(value);
  if (value instanceof Map) {
    hash.update("M{");
    for (const [key, item] of [...value].sort((a, b) =>
      order(String(a[0]), String(b[0])),
    )) {
      hash.update(`${String(key)}=`);
      feed(hash, item, path, depth + 1);
    }
    hash.update("}");
  } else if (value instanceof Set) {
    hash.update("S{");
    const items = [...value];
    if (items.every((item) => typeof item !== "object"))
      items.sort((a, b) => order(String(a), String(b)));
    for (const item of items) feed(hash, item, path, depth + 1);
    hash.update("}");
  } else if (ArrayBuffer.isView(value)) {
    hash.update(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
    );
  } else if (Array.isArray(value)) {
    // A column of plain values (the counted population's) goes in one update.
    if (value.every(primitive)) hash.update(`A${JSON.stringify(value)}`);
    else {
      hash.update("[");
      for (const item of value) feed(hash, item, path, depth + 1);
      hash.update("]");
    }
  } else {
    hash.update("{");
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record).sort(order)) {
      if (record[key] === undefined) continue;
      hash.update(`${key}:`);
      feed(hash, record[key], path, depth + 1);
    }
    hash.update("}");
  }
  path.delete(value);
}

const digestOf = (value: unknown) => {
  const hash = createHash("sha256");
  feed(hash, value, new Set());
  return hash.digest("hex").slice(0, 16);
};

const isPlain = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !ArrayBuffer.isView(value) &&
  !(value instanceof Map) &&
  !(value instanceof Set);

/**
 * One kept value as tables of [id, row]: a Map's entries by key; a plain
 * record split one level, each Map in it its own table and the rest one row,
 * so a difference in a runtime (the cash journal, the counted population)
 * still names its record.
 */
function addTables(
  out: Map<string, [string, unknown][]>,
  name: string,
  value: unknown,
): void {
  if (value === undefined) return;
  const entries = (map: Map<unknown, unknown>): [string, unknown][] =>
    [...map].map(([id, row]) => [String(id), row]);
  if (value instanceof Map) return void out.set(name, entries(value));
  if (!isPlain(value)) return void out.set(name, [["", value]]);
  const rest: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    if (CACHES.has(key) || inner === undefined) continue;
    if (inner instanceof Map) out.set(`${name}.${key}`, entries(inner));
    else rest[key] = inner;
  }
  if (Object.keys(rest).length) out.set(name, [["", rest]]);
}

/** Every table a world keeps, from the list a snapshot saves. */
function tables(core: CoreState): Map<string, [string, unknown][]> {
  const world = worldRecords(core);
  const out = new Map<string, [string, unknown][]>();
  for (const [field, value] of Object.entries(world.core))
    addTables(out, `core.${field}`, value);
  for (const [moduleId, store] of world.modules)
    for (const name of Object.keys(
      core.modules.get(moduleId)?.state?.tables ?? {},
    ))
      out.set(
        `${moduleId}.${name}`,
        store
          .table(name)
          .rows()
          .map((row) => [String(row.id), row]),
      );
  for (const [id, saved] of Object.entries(world.parts))
    addTables(out, `part.${id}`, saved);
  return out;
}

/** The world's records proof at today's date; `rows` also keeps each row's digest. */
export function recordProof(
  core: CoreState,
  options: { rows?: boolean } = {},
): RecordProof {
  const digests: Record<string, { rows: number; digest: string }> = {};
  const rows: Record<string, Record<string, string>> = {};
  for (const [name, entries] of [...tables(core)].sort((a, b) =>
    order(a[0], b[0]),
  )) {
    entries.sort((a, b) => order(a[0], b[0]));
    const table = createHash("sha256");
    const kept: Record<string, string> = {};
    for (const [id, row] of entries) {
      const digest = digestOf(row);
      table.update(`${id}=${digest};`);
      if (options.rows) kept[id] = digest;
    }
    digests[name] = {
      rows: entries.length,
      digest: table.digest("hex").slice(0, 16),
    };
    if (options.rows) rows[name] = kept;
  }
  return {
    seed: core.seed,
    date: core.date,
    bookkeeping: bookkeeping(),
    digest: digestOf(digests),
    tables: digests,
    uncovered: uncoveredModules(core),
    ...(options.rows ? { rows } : {}),
  };
}

/** The tables whose records differ between two proofs of the same seed and date. */
export function compareProofs(
  base: Pick<RecordProof, "seed" | "date" | "tables" | "rows" | "bookkeeping">,
  head: Pick<RecordProof, "seed" | "date" | "tables" | "rows" | "bookkeeping">,
): ProofDifference[] {
  if (base.seed !== head.seed || base.date !== head.date)
    throw new Error("Compare proofs of the same seed on the same date.");
  if (base.bookkeeping !== head.bookkeeping)
    throw new Error(
      "Compare proofs taken with the debug bookkeeping set the same way.",
    );
  const differences: ProofDifference[] = [];
  const names = [
    ...new Set([...Object.keys(base.tables), ...Object.keys(head.tables)]),
  ].sort(order);
  for (const table of names) {
    const before = base.tables[table],
      after = head.tables[table];
    if (before && after && before.digest === after.digest) continue;
    const beforeRows = base.rows?.[table],
      afterRows = head.rows?.[table];
    if (!beforeRows || !afterRows) {
      differences.push({ table, base: before, head: after });
      continue;
    }
    const ids = [
      ...new Set([...Object.keys(beforeRows), ...Object.keys(afterRows)]),
    ]
      .filter((id) => beforeRows[id] !== afterRows[id])
      .sort(order);
    differences.push({
      table,
      base: before,
      head: after,
      firstId: ids[0],
      differingIds: ids.length,
    });
  }
  return differences;
}
