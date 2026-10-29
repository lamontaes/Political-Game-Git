/**
 * Dev mode's records proof (owner, Oct 29, 2026, to the speed lead: "That
 * needs to be built into the advanced mode... a dev mode where you can be
 * anybody, make anything happen in the simulation... and trace why things
 * happen"). Two builds that run the same seed and place to the same date
 * should keep the same records; a speed change must not change what the
 * simulation decides. This reads every table the core and its engines keep,
 * one digest per table, and compares two proofs table by table. A differing
 * table names the first record that differs, so the trace (`dev-trace.ts`)
 * can open it and show why it happened. Read-only: it writes nothing and
 * spends no game time.
 */
import { createHash, type Hash } from "node:crypto";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

export interface RecordProof {
  readonly seed: string;
  readonly date: string;
  /** One digest over every table's digest. */
  readonly digest: string;
  /** Rows and digest by table: "core.people", "<module id>.<table>". */
  readonly tables: Readonly<Record<string, { rows: number; digest: string }>>;
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

// Runtime wiring, not records: the parameters, the installed modules and their subscribers.
const NOT_RECORDS = new Set([
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
const DEPTH = 40;
const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Feeds a value to the hash in a fixed form: object keys and Map keys sorted, arrays in order. */
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
    hash.update("[");
    for (const item of value) feed(hash, item, path, depth + 1);
    hash.update("]");
  } else {
    hash.update("{");
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record).sort(order)) {
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

/** Every table the core and its engines keep, as [id, row] pairs. */
function tables(core: CoreState): Map<string, [string, unknown][]> {
  const out = new Map<string, [string, unknown][]>();
  const fields = core as unknown as Record<string, unknown>;
  for (const field of Object.keys(fields).sort(order)) {
    if (NOT_RECORDS.has(field)) continue;
    const value = fields[field];
    out.set(
      `core.${field}`,
      value instanceof Map
        ? [...value].map(([id, row]) => [String(id), row])
        : [["", value]],
    );
  }
  const api = coreAPI(core);
  for (const [moduleId, module] of [...core.modules].sort((a, b) =>
    order(a[0], b[0]),
  )) {
    const names = Object.keys(module.state?.tables ?? {}).sort(order);
    const state = names.length ? api.moduleState(moduleId) : undefined;
    for (const name of names)
      out.set(
        `${moduleId}.${name}`,
        state!
          .table(name)
          .rows()
          .map((row) => [String(row.id), row]),
      );
  }
  return out;
}

/** The world's records proof at today's date; `rows` also keeps each row's digest. */
export function recordProof(
  core: CoreState,
  options: { rows?: boolean } = {},
): RecordProof {
  const digests: Record<string, { rows: number; digest: string }> = {};
  const rows: Record<string, Record<string, string>> = {};
  for (const [name, entries] of tables(core)) {
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
    digest: digestOf(digests),
    tables: digests,
    ...(options.rows ? { rows } : {}),
  };
}

/** The tables whose records differ between two proofs of the same seed and date. */
export function compareProofs(
  base: RecordProof,
  head: RecordProof,
): ProofDifference[] {
  if (base.seed !== head.seed || base.date !== head.date)
    throw new Error("Compare proofs of the same seed on the same date.");
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
