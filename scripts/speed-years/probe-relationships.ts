/**
 * Memory probe: relationships by kind and by the cause of their latest change
 * after N years, in the world `speed:year` plays.
 *   npm run ... tsx scripts/speed-years/probe-relationships.ts <seed> <placeKey> <years>
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const [seed = "mont1", placeKey = "5046000", yearsText = "1"] =
  process.argv.slice(2);
setBookkeeping(false);
const world = buildBenchWorld(
  drawPlace(seed, "speed-year").seed,
  gameStartDate(),
  {
    twoLevel: true,
    placeKey,
  },
);
for (let year = 1; year <= Number(yearsText); year += 1) {
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  const byKind = new Map<string, number>();
  const byCause = new Map<string, number>();
  const degree = new Map<string, number>();
  for (const row of world.core.relationships.values()) {
    byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1);
    const cause =
      (row.latestChange as { reason?: { cause?: string } } | undefined)?.reason
        ?.cause ?? "(none)";
    byCause.set(cause, (byCause.get(cause) ?? 0) + 1);
    degree.set(row.actorId, (degree.get(row.actorId) ?? 0) + 1);
    degree.set(row.otherId, (degree.get(row.otherId) ?? 0) + 1);
  }
  const logKind = new Map<string, number>();
  const logVis = new Map<string, number>();
  for (const row of world.core.durableLog.values()) {
    logKind.set(row.kind, (logKind.get(row.kind) ?? 0) + 1);
    const vis = `${row.visibility ?? "-"}${row.publicRecord ? "+pub" : ""}${row.news ? "+news" : ""}`;
    logVis.set(vis, (logVis.get(vis) ?? 0) + 1);
  }
  console.log(
    JSON.stringify({
      year,
      log: world.core.durableLog.size,
      logKind: [...logKind].sort((a, b) => b[1] - a[1]).slice(0, 15),
      logVis: [...logVis],
    }),
  );
  const top = (m: Map<string, number>, n = 12) =>
    [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
  const d = [...degree.values()].sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      year,
      date: world.core.date,
      total: world.core.relationships.size,
      byKind: top(byKind),
      byCause: top(byCause),
      people: world.core.people.size,
      degreeMedian: d[d.length >> 1],
      degreeP99: d[Math.floor(d.length * 0.99)],
      degreeMax: d.at(-1),
    }),
  );
}
