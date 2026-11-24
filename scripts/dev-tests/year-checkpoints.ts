// Where a played year's seconds go, by month: tsx year-checkpoints.ts <seed> <start date>
import { buildBenchWorld } from "../../src/bench/world";
import { advanceCore } from "../../src/core2/life";
import { setKeepEveryonesWhy } from "../../src/core2/why-kept";
const [seed = "1", opening = "2026-10-12"] = process.argv.slice(2);
setKeepEveryonesWhy(true);
const t0 = Date.now();
const world = buildBenchWorld(seed, opening, { twoLevel: true });
console.log(
  `built ${world.place.key} in ${((Date.now() - t0) / 1000).toFixed(0)} s`,
);
let date = opening;
const end = `${Number(opening.slice(0, 4)) + 1}${opening.slice(4)}`;
let last = Date.now();
while (date < end) {
  date = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
  advanceCore(world.core, date);
  if (date.endsWith("-01") || date.endsWith("-15")) {
    console.log(`${date} +${((Date.now() - last) / 1000).toFixed(0)} s`);
    last = Date.now();
  }
}
console.log(`total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
