/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** Which pay paths paid in a played year: npx tsx scripts/money/pay-paths.ts <seed> [years] [placeKey] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "money-1";
const years = Number(process.argv[3] ?? 1);
const drawn = drawPlace(seed, "speed-year");
const key = process.argv[4] ?? drawn.key;
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
console.log(`${drawn.name} ${key} seed ${seed}`);
advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365 * years));
const core: any = world.core;
let earned = 0,
  paid = 0;
for (const t of core.work.totalsByJob.values()) {
  earned += t.requestedMinor;
  paid += t.paidMinor;
}
let liquid = 0;
for (const person of core.people.values()) liquid += person.liquidMinor;
console.log(
  `year ${years}: jobs ${core.work.totalsByJob.size} earned ${earned} paid ${paid} named-liquid ${liquid} journal-owners ${core.cashJournal.totalsByOwner.size}`,
);
