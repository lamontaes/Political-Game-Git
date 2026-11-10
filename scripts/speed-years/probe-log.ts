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
  for (const [k, e] of [...by].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 25))
    console.log(`  ${(e.bytes / 1e6).toFixed(1)} MB ${e.rows} rows ${e.old} old  ${k}`);
}
