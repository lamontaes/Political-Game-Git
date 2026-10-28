/**
 * The full people's deaths against the SSA 2023 life table, in the world the
 * owner plays: `buildBenchWorld` for each seed named, a year of play, the
 * deaths the health engine records against the deaths the table expects for
 * the same people (totals only; the table never picks who dies).
 *
 *   node --import tsx scripts/health/mortality-band.ts mb1 mb2 mb3 ...
 *
 * Prints one line per place and the pooled ratio; the band is 0.8 to 1.2.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { doubledAgeYearHazard } from "../../src/core2/health-mortality-table";
import { MULTIPLIER_ONE } from "../../src/core2/health-hazard";
import { FIXED_SCALE } from "../../src/core2/kernel/fixed-point";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { healthReport } from "../../src/core2/modules/health";

const DAYS_A_YEAR = 365;
// MORTALITY_YEARS=3 plays three years and compares with three years of the table.
const YEARS = Number(process.env.MORTALITY_YEARS ?? 1);
const seeds = process.argv.slice(2);
if (!seeds.length) throw new Error("Name at least one seed.");
let deaths = 0;
let expected = 0;
for (const seed of seeds) {
  const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
  const core = world.core;
  const start = makeIsoDate(core.date);
  let table = 0;
  let people = 0;
  for (const person of core.people.values()) {
    if (!person.alive) continue;
    people += 1;
    // The table's hazard summed over the years played, the person a year older each year.
    let hazard = 0;
    for (let year = 0; year < YEARS; year += 1)
      hazard +=
        Number(
          (doubledAgeYearHazard(
            ageOnDate(makeIsoDate(person.birthDate), start) + year,
            "equal-mixture",
          ) *
            BigInt(MULTIPLIER_ONE)) /
            (FIXED_SCALE + FIXED_SCALE),
        ) / MULTIPLIER_ONE;
    table += 1 - Math.exp(-hazard);
  }
  advanceCore(core, addDays(start, DAYS_A_YEAR * YEARS));
  const died = healthReport(core).deaths ?? 0;
  deaths += died;
  expected += table;
  console.log(
    `${world.place.key} seed ${seed}: ${people} full people, ${died} deaths, table expects ${table.toFixed(1)}`,
  );
}
console.log(
  `pooled: ${deaths} deaths against ${expected.toFixed(1)} expected, ratio ${(deaths / expected).toFixed(3)}`,
);
