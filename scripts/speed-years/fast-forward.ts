/**
 * Fast-forward against a full run (development tooling, owner Nov 8, 1:58 a.m.).
 *   node --import tsx scripts/speed-years/fast-forward.ts --place <key> --seed <s> --years 8 [--fast 1|0] [--out file.json]
 * Builds the speed:year world, runs it day by day with fast-forward on or off,
 * and writes the big numbers each year: people, births, deaths, who holds each
 * office by party, the races decided with their winners, and the seconds.
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { setFastForward } from "../../src/core2/fast-forward";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { moduleTableSizes } from "../../src/core2/module-state";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", "5a1c0de7a11ce5e1");
const years = Number(option("years", "8"));
const fast = option("fast", "1") === "1";
const out = option("out", "");
const drawn = drawPlace(seed, "speed-year");
const placeKey = option("place", drawn.key);
setBookkeeping(false);
setFastForward(fast);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const rows: unknown[] = [];
for (let y = 1; y <= years; y += 1) {
  const began = performance.now();
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  const seconds = Number(((performance.now() - began) / 1000).toFixed(1));
  const core = world.core;
  const sizes = moduleTableSizes(core);
  const alive = [...core.people.values()].filter((p) => p.alive).length;
  rows.push({
    year: y,
    date: core.date,
    seconds,
    peopleAlive: alive,
    people: core.people.size,
    tables: sizes,
  });
  console.log(
    `year ${y}: ${seconds} s, ${core.date}, ${alive} alive of ${core.people.size} full people`,
  );
}
if (out) writeFileSync(out, JSON.stringify({ seed, placeKey, fast, rows }));
