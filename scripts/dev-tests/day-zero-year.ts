// Day 0 against later days: row counts for every table the records proof keeps, in a place drawn from a seed.
// tsx scripts/dev-tests/day-zero-year.ts <seed> [days=365]   (the place is drawPlace(seed, "day-zero"))
// Reads the world at creation and after 1, 31 and <days> days (the engines seat much of the opening on their first
// step, so a table empty at creation and filled a day later is a smaller finding than one empty for weeks).
// Prints one JSON object: the place, and {table: [rowsAtCreation, rows1, rows31, rowsLater]} for tables empty at creation and filled later.
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { recordProof } from "../../src/bench/dev-proof";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const [seed, days = "365"] = process.argv.slice(2);
if (!seed) throw new Error("usage: day-zero-year.ts <seed> [days]");
const place = drawPlace(seed, "day-zero");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const rowsOf = () =>
  Object.fromEntries(
    Object.entries(recordProof(world.core).tables).map(([k, v]) => [k, v.rows]),
  );
const day0 = rowsOf();
const start = makeIsoDate(world.core.date);
const reads: Record<string, number>[] = [];
for (const after of [1, 31, Number(days)]) {
  advanceCore(world.core, addDays(start, after));
  reads.push(rowsOf());
}
const filled: Record<string, number[]> = {};
for (const [table, rows] of Object.entries(reads[2]!))
  if ((day0[table] ?? 0) === 0 && rows > 0)
    filled[table] = [0, reads[0]![table] ?? 0, reads[1]![table] ?? 0, rows];
process.stdout.write(
  `${JSON.stringify({ place, days: Number(days), filled }, null, 1)}\n`,
);
