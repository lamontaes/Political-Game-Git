/**
 * Whether the full people's yearly deaths land on the SSA 2023 period life
 * table across places (developer proof for SG-P10-resilience-scale, no effect
 * on play). Per drawn place: the people in `core.people` at the start, the
 * deaths among them over a year, and the deaths the table expects for their
 * ages (the equal mix of the male and female annual probabilities, at the age
 * each reaches mid-year). The pooled ratio is the figure the resilience base
 * scale is meant to hold near 1.
 *
 *   node --import tsx scripts/health/mortality-band.ts [--seed <s>] [--places 8]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { ssa2023AnnualProbability } from "../../src/core2/health-mortality-table";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", randomBytes(8).toString("hex"));
const places = Number(option("places", "8"));

setBookkeeping(false);
let pooledDeaths = 0;
let pooledExpected = 0;
for (let i = 0; i < places; i++) {
  const draw = drawPlace(`${seed}:${i}`, "mortality-band");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const start = makeIsoDate(core.date);
  const middle = addDays(start, 182);
  const people = [...core.people.values()].filter((p) => p.alive);
  let expected = 0;
  for (const person of people) {
    const age = Math.max(0, ageOnDate(makeIsoDate(person.birthDate), middle));
    expected +=
      (Number(ssa2023AnnualProbability(age, "male")) +
        Number(ssa2023AnnualProbability(age, "female"))) /
      2;
  }
  advanceCore(core, addDays(start, 365));
  const deaths = people.filter((p) => !core.people.get(p.id)?.alive).length;
  pooledDeaths += deaths;
  pooledExpected += expected;
  console.log(
    `${draw.name} (key ${draw.key}, seed ${seed}:${i}): ${people.length} full people, ${deaths} deaths, ${expected.toFixed(1)} expected`,
  );
}
console.log(
  `pooled over ${places} places: ${pooledDeaths} deaths against ${pooledExpected.toFixed(1)} expected, ratio ${(pooledDeaths / pooledExpected).toFixed(3)}`,
);
