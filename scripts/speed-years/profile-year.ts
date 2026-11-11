/**
 * CPU profile of one chosen year of the speed:year world (development tooling).
 *   node --import tsx scripts/speed-years/profile-year.ts --seed <s> --place <key> --year 4 --out <file.cpuprofile>
 * Years before the chosen one run unprofiled, so an election year can be read alone.
 */
import { Session } from "node:inspector/promises";
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", "5a1c0de7a11ce5e1");
const year = Number(option("year", "4"));
const out = option("out", "profile.cpuprofile");
const drawn = drawPlace(seed, "speed-year");
const placeKey = option("place", drawn.key);
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const session = new Session();
session.connect();
for (let y = 1; y <= year; y += 1) {
  const target = addDays(makeIsoDate(world.core.date), 365);
  if (y === year) {
    await session.post("Profiler.enable");
    await session.post("Profiler.setSamplingInterval", { interval: 2000 });
    await session.post("Profiler.start");
  }
  const began = performance.now();
  advanceCore(world.core, target);
  console.log(
    `year ${y}: ${((performance.now() - began) / 1000).toFixed(1)} s`,
  );
  if (y === year) {
    const { profile } = await session.post("Profiler.stop");
    writeFileSync(out, JSON.stringify(profile));
  }
}
