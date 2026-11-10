/* eslint-disable @typescript-eslint/no-explicit-any */
// What the durable log keeps after N years, by visibility and kind: rows, JSON bytes, and how many are over a year old.
// node --max-old-space-size=8000 --import tsx scripts/speed-years/probe-log.ts <seed> <placeKey> <years>
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { setFastForward } from "../../src/core2/fast-forward";
setBookkeeping(false);
if (process.env.CORE2_FAST_FORWARD === "1") setFastForward(true);
const [seed = "mont1", key = "5046000", years = "4"] = process.argv.slice(2);
const w = buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: key });
const core = w.core as any;
for (let y = 1; y <= Number(years); y++) {
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const yearAgo = addDays(makeIsoDate(core.date), -365);
  const by = new Map<string, { rows: number; bytes: number; old: number }>();
  let total = 0;
  for (const row of core.durableLog.values()) {
    const k = `${row.visibility}\t${row.kind}`;
    const e = by.get(k) ?? { rows: 0, bytes: 0, old: 0 };
    const b = JSON.stringify(row).length;
    e.rows++;
    e.bytes += b;
    total += b;
    if (row.date < yearAgo) e.old++;
    by.set(k, e);
  }
  console.log(`YEAR ${y} ${core.date} rows=${core.durableLog.size} jsonMB=${(total / 1e6).toFixed(1)}`);
  // The largest kind, by who it names and by field.
  const acts = [...core.durableLog.values()].filter((row: any) => row.kind === "person.acted");
  const player = core.playerId;
  const own = acts.filter((row: any) => row.decision?.actorId === player || row.personIds.includes(player));
  const fields = new Map<string, number>();
  for (const row of acts)
    for (const [f, v] of Object.entries(row)) fields.set(f, (fields.get(f) ?? 0) + JSON.stringify(v ?? null).length);
  const dfields = new Map<string, number>();
  for (const row of acts)
    for (const [f, v] of Object.entries((row as any).decision ?? {})) dfields.set(f, (dfields.get(f) ?? 0) + JSON.stringify(v ?? null).length);
  const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, b]) => `${f}=${(b / 1e6).toFixed(1)}MB`).join(" ");
  console.log(`  ACTS ${acts.length}, naming the player ${own.length}; fields ${top(fields)}`);
  console.log(`  ACT DECISION fields ${top(dfields)}`);
  // Acts by who they name, whether they still hold every option's score, and age.
  const quarterAgo = addDays(makeIsoDate(core.date), -90);
  const cells = new Map<string, { rows: number; bytes: number }>();
  for (const row of acts as any[]) {
    const who =
      row.decision?.actorId === player || row.actorId === player
        ? "by-player"
        : row.personIds.includes(player)
          ? "names-player"
          : "other";
    const age = row.date >= quarterAgo ? "<90d" : row.date >= yearAgo ? "90d-1y" : ">1y";
    const k = `${who} ${row.decision?.scores ? "scores" : "condensed"} ${age} ${row.visibility}`;
    const c = cells.get(k) ?? { rows: 0, bytes: 0 };
    c.rows++;
    c.bytes += JSON.stringify(row).length;
    cells.set(k, c);
  }
  for (const [k, c] of [...cells].sort((a, b) => b[1].bytes - a[1].bytes))
    console.log(`  ACTCELL ${k}: ${c.rows} rows ${(c.bytes / 1e6).toFixed(1)} MB`);
  for (const [k, e] of [...by].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 25))
    console.log(`  ${(e.bytes / 1e6).toFixed(1)} MB ${e.rows} rows ${e.old} old  ${k}`);
}
