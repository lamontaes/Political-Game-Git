/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** How many cash-journal postings a year makes, by source kind, and postings per entry: npx tsx scripts/money/journal-count.ts <seed> <placeKey> [days] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { setJournalTrace } from "../../src/core2/journal-state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";

const seed = process.argv[2] ?? "n8f6";
const placeKey = process.argv[3] ?? "4932660";
const days = Number(process.argv[4] ?? 365);
setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const byKind = new Map<string, { entries: number; postings: number }>();
let entries = 0,
  postings = 0;
setJournalTrace((input: any) => {
  const k = String(input.sourceRef.kind);
  const row = byKind.get(k) ?? { entries: 0, postings: 0 };
  row.entries += 1;
  row.postings += input.postings.length;
  byKind.set(k, row);
  entries += 1;
  postings += input.postings.length;
});
const t0 = Date.now();
advanceCore(world.core, addDays(makeIsoDate(world.core.date), days));
console.log(
  `${entries} entries, ${postings} postings in ${days} days (${((Date.now() - t0) / 1000).toFixed(0)} s)`,
);
for (const [k, v] of [...byKind]
  .sort((a, b) => b[1].postings - a[1].postings)
  .slice(0, 12))
  console.log(
    k.padEnd(48),
    String(v.entries).padStart(9),
    String(v.postings).padStart(9),
    (v.postings / v.entries).toFixed(1),
  );
