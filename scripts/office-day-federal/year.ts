/**
 * One played year (every module installed) in a drawn place: the speed check
 * for the federal day, one run, one number. Seconds to build and to run.
 *
 * With --federal, the player takes the sitting president through the bench's
 * own player and skips the year (the cost of the federal day for the person
 * the player controls; without it, no one is controlled).
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/office-day-federal/year.ts <seed> [days] [--federal]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";
import { coreAPI } from "../../src/core2/state";
import { BenchPlayer } from "../../src/bench/player";
import {
  OFFICES_MODULE_ID,
  type TermRow,
} from "../../src/core2/modules/offices";
import { playThrough } from "./drive";

setBookkeeping(false);
const seed = process.argv[2] ?? "office-federal-speed";
const days = Number(
  process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : 365,
);
const place = drawPlace(seed, "office-federal");
const built = Date.now();
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const buildSeconds = (Date.now() - built) / 1000;
const started = Date.now();
const through = addDays(makeIsoDate(world.core.date), days);
if (process.argv.includes("--federal")) {
  // The player takes the sitting president and skips the year, the
  // character taking every federal moment the player leaves.
  const api = coreAPI(world.core);
  const president = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        "seat:US:president",
        "serving",
      ]) as unknown as TermRow[]
  )[0]!.personId!;
  const player = new BenchPlayer(world.core, world.director);
  player.select(president);
  playThrough(player, api, through, () => {}, "skip");
} else advanceCore(world.core, through);
console.log(
  JSON.stringify({
    seed,
    place: `${place.name} (${place.key})`,
    days,
    federal: process.argv.includes("--federal"),
    buildSeconds,
    seconds: (Date.now() - started) / 1000,
  }),
);
