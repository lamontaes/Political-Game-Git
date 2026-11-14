/**
 * A governor's State of the State in a played world, the first year and the
 * next, as the daily loop records them (W-F, Nov 12: a voice prefers the
 * wording it has not used lately). Run:
 *   node --import tsx scripts/words/governor-two-years.ts <seed>
 */
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import {
  ADDRESS_FACT,
  ADDRESS_PART_BREAK,
} from "../../src/director/opening-facts";

setBookkeeping(false);
const label = process.argv[2] ?? "governor-two-years";
const place = drawPlace(label, "speech-outline");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const first = Number(core.date.slice(0, 4));
console.log(`### ${place.name} (${place.key}), seed ${label}`);
for (const year of [first, first + 1]) {
  const date = `${year}-01-21`;
  if (core.date < date) advanceCore(core, date as never);
  const event = core.durableLog.get(`governor.address:${date}`);
  console.log(`\n**The governor's address, ${date}**\n`);
  if (!event) console.log("> (not given)");
  for (const part of String(event?.facts?.[ADDRESS_FACT.parts] ?? "")
    .split(ADDRESS_PART_BREAK)
    .filter(Boolean))
    console.log(`> ${part}\n>`);
}
