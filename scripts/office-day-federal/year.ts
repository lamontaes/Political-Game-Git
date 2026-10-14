/**
 * One played year (every module installed) in a drawn place: the speed check
 * for the federal day, one run, one number. Seconds to build and to run.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/office-day-federal/year.ts <seed> [days]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { drawPlace } from "../core2-year/place";

setBookkeeping(false);
const seed = process.argv[2] ?? "office-federal-speed";
const days = Number(process.argv[3] ?? 365);
const place = drawPlace(seed, "office-federal");
const built = Date.now();
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const buildSeconds = (Date.now() - built) / 1000;
const started = Date.now();
advanceCore(world.core, addDays(makeIsoDate(world.core.date), days));
console.log(
  JSON.stringify({
    seed,
    place: `${place.name} (${place.key})`,
    days,
    buildSeconds,
    seconds: (Date.now() - started) / 1000,
  }),
);
