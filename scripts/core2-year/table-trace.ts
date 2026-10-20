/**
 * Which module tables are written and never read by another engine, from a
 * played year (pool item core-wiring-gaps-trace-pass). The static scan sees
 * only names; this one counts, for every module table, who wrote it and who
 * read it, by the file that made each call.
 * Run: node --import tsx scripts/core2-year/table-trace.ts [seed] [days]
 */
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { bankView } from "../../src/bench/bank";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  moduleTableSizes,
  setTableTrace,
  type TableOp,
} from "../../src/core2/module-state";
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const days = Number(process.argv[3] ?? 365);
const place = drawPlace(
  createHash("sha256").update(seed).digest("hex"),
  "table-trace",
);

/** The engine a source file belongs to: modules/<name>.ts, or the stem before the first dash. */
function engineOfFile(path: string): string {
  const marker = path.indexOf("/src/");
  const rel = marker >= 0 ? path.slice(marker + 5) : path;
  const parts = rel.split("/");
  const base = (parts.at(-1) ?? "").replace(/\.[a-z]+$/, "");
  if (parts[0] === "core2" && parts[1] === "modules") return base;
  if (parts[0] === "core2") return base.split("-")[0]!;
  return parts[0] === "director" ||
    parts[0] === "bench" ||
    parts[0] === "english"
    ? parts[0]
    : base.split("-")[0]!;
}
/** The engine a module id names: core2-campaigns-v1 is campaigns. */
const engineOfModule = (id: string) =>
  id.replace(/^core2-/, "").replace(/-v\d+$/, "");
const same = (a: string, b: string) =>
  a === b || a.startsWith(b) || b.startsWith(a);

interface Count {
  writes: number;
  ownReads: number;
  foreignReads: Map<string, number>;
}
const counts = new Map<string, Count>();
const WRITES: ReadonlySet<TableOp> = new Set(["put", "remove"]);
setTableTrace((moduleId, table, op) => {
  const holder: { stack?: string } = {};
  Error.captureStackTrace(holder);
  const frame = (holder.stack ?? "")
    .split("\n")
    .slice(1)
    .find((line) => !line.includes("module-state.ts") && line.includes("/"));
  const file = /\(?([^()\s]+):\d+:\d+\)?\s*$/.exec(frame ?? "")?.[1] ?? "";
  const caller = engineOfFile(file);
  const key = `${moduleId}/${table}`;
  const row = counts.get(key) ?? {
    writes: 0,
    ownReads: 0,
    foreignReads: new Map<string, number>(),
  };
  if (WRITES.has(op)) row.writes += 1;
  else if (same(caller, engineOfModule(moduleId))) row.ownReads += 1;
  else row.foreignReads.set(caller, (row.foreignReads.get(caller) ?? 0) + 1);
  counts.set(key, row);
});

const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
counts.clear(); // the opening writes everything once; the year is what counts
advanceCore(world.core, addDays(makeIsoDate(world.core.date), days));
// A screen reads a table only when it is opened, so open the ones that read
// engine tables: the Money screen's bank view for the controlled person.
if (world.core.playerId) bankView(world.core, world.core.playerId);
setTableTrace(null);

const sizes = moduleTableSizes(world.core);
const rows = Object.keys(sizes)
  .map((key) => {
    const c = counts.get(key);
    return {
      table: key,
      rows: sizes[key]!,
      writes: c?.writes ?? 0,
      ownReads: c?.ownReads ?? 0,
      foreignReaders: [...(c?.foreignReads ?? [])]
        .sort((a, b) => b[1] - a[1])
        .map(([engine, n]) => `${engine} ${n}`),
    };
  })
  .sort((a, b) => a.table.localeCompare(b.table));
const unread = rows.filter(
  (row) => row.rows > 0 && row.foreignReaders.length === 0,
);
const report = {
  place: `${place.name} (${place.key})`,
  seed,
  placeSeed: place.seed,
  days,
  tables: rows.length,
  unreadByOthers: unread.length,
  unread,
};
const out = process.argv[4];
if (out) writeFileSync(out, JSON.stringify(report, null, 2));
console.log(
  `table-trace: ${report.place}, seed ${seed}, ${days} days: ${rows.length} tables, ${unread.length} with rows that no other engine read`,
);
for (const row of unread)
  console.log(
    `${row.table}: ${row.rows} rows, ${row.writes} writes in the period, ${row.ownReads} own reads`,
  );
