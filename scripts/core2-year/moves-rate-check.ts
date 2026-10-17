/**
 * Do people leave at the ACS rates? In a played year of a drawn place, the
 * departures of full people and of counted groups (people leaving the town for
 * another county or state) against what the ACS rate for each resident's age
 * and state adds up to (data/research/migration/mover-rates-acs-2024.json,
 * the table the moves engines read). Pool item SG-P15-moves-weights.
 * Run: node --import tsx scripts/core2-year/moves-rate-check.ts [seed ...]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { countedResidents } from "../../src/core2/electorate";
import { countedMoves } from "../../src/core2/modules/counted-moves";
import { departuresOf } from "../../src/core2/modules/moves";
import { coreAPI } from "../../src/core2/state";
import { lawChain } from "../../src/core2/modules/laws";
import rates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import { drawPlace } from "./place";

const BANDS = rates.ageBands as readonly string[];
const bandOf = (age: number) => {
  if (age < 18) return null;
  for (const band of BANDS) {
    if (band.endsWith("+"))
      return age >= Number(band.slice(0, -1)) ? band : null;
    const [lo, hi] = band.split("-").map(Number) as [number, number];
    if (age >= lo && age <= hi) return band;
  }
  return null;
};
const ageOn = (born: string, date: string) =>
  Number(date.slice(0, 4)) - Number(born.slice(0, 4));

const seeds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [randomBytes(6).toString("hex")];
const total = { expected: 0, actual: 0 };
for (const seed of seeds) {
  const place = drawPlace(seed, "moves-rate-check");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const state = lawChain(api).stateKey;
  const byState = (
    rates.places as unknown as Record<
      string,
      { departurePerYearByAge: Record<string, number> }
    >
  )[state];
  const table =
    byState?.departurePerYearByAge ?? rates.national.departurePerYearByAge;
  const start = core.date;
  const ages: { age: number; weight: number }[] = [];
  for (const person of core.people.values())
    if (person.alive && person.tier !== "inactive")
      ages.push({ age: ageOn(person.birthDate, start), weight: 1 });
  for (const row of countedResidents(core))
    ages.push({ age: ageOn(row.birthDate, start), weight: row.weight });
  let expected = 0;
  const bandPeople: Record<string, number> = {};
  for (const { age, weight } of ages) {
    const band = bandOf(age);
    if (!band) continue;
    bandPeople[band] = (bandPeople[band] ?? 0) + weight;
    expected += weight * ((table as Record<string, number>)[band] ?? 0);
  }
  advanceCore(core, addDays(makeIsoDate(start), 365));
  const full = departuresOf(api).reduce((n, row) => n + row.withIds.length, 0);
  const counted = countedMoves(api)
    .filter((row) => row.direction === "out")
    .reduce((n, row) => n + row.people, 0);
  // Everyone in the town at the end, by the same count as the start.
  let end = 0;
  for (const person of core.people.values())
    if (person.alive && person.tier !== "inactive") end += 1;
  for (const row of countedResidents(core)) end += row.weight;
  const arrived = countedMoves(api)
    .filter((row) => row.direction === "in")
    .reduce((n, row) => n + row.people, 0);
  const actual = full + counted;
  total.expected += expected;
  total.actual += actual;
  console.log(
    `${place.name} (${place.key}), ${state}, seed ${place.seed.slice(0, 12)}: ${Math.round(ages.length)} residents, adults ${Math.round(Object.values(bandPeople).reduce((a, b) => a + b, 0))}; expected ${expected.toFixed(1)} leave, ${actual.toFixed(1)} did (${full} full, ${counted.toFixed(1)} counted); ratio ${(actual / (expected || 1)).toFixed(2)}; ${arrived.toFixed(0)} arrived (${(arrived / (actual || 1)).toFixed(2)} of departures); town ${ages.length.toFixed(0)} to ${end.toFixed(0)} people (${(((end - ages.length) / ages.length) * 100).toFixed(1)}%)`,
  );
}
console.log(
  `all: expected ${total.expected.toFixed(1)}, actual ${total.actual.toFixed(1)}, ratio ${(total.actual / (total.expected || 1)).toFixed(2)}`,
);
