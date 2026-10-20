/**
 * Does a played year's death count among full people follow the SSA 2023 life
 * table? For each drawn place the played world (buildBenchWorld) runs a year;
 * the full people alive at the start are set against the table's expected
 * deaths for their ages and sex, pooled and by age band.
 * Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=8000 --import tsx scripts/health/mortality-band.ts [seed] [places] [years]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { ssa2023AnnualProbability } from "../../src/core2/health-mortality-table";

const seed = process.argv[2] ?? "mb1";
const places = Number(process.argv[3] ?? 6);
const years = Number(process.argv[4] ?? 1);
setBookkeeping(false);

const BANDS: [string, number, number][] = [
  ["0-17", 0, 17],
  ["18-39", 18, 39],
  ["40-64", 40, 64],
  ["65-79", 65, 79],
  ["80+", 80, 119],
];
const bandOf = (age: number) =>
  BANDS.find(([, lo, hi]) => age >= lo && age <= hi)![0];
const total = new Map<
  string,
  { expected: number; deaths: number; people: number }
>();
const bump = (band: string, expected: number, died: boolean) => {
  const row = total.get(band) ?? { expected: 0, deaths: 0, people: 0 };
  row.expected += expected;
  row.deaths += died ? 1 : 0;
  row.people += 1;
  total.set(band, row);
};

for (let i = 0; i < places; i += 1) {
  const place = drawPlace(`${seed}:${i}`, "mortality-band");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  for (let year = 0; year < years; year += 1) {
    const start = core.date;
    const alive = [...core.people.values()].filter((p) => p.alive);
    const info = alive.map((p) => {
      const age = ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(start));
      // The health engine's category is the equal mixture of the two tables.
      const q =
        (Number(ssa2023AnnualProbability(Math.min(age, 119), "male")) +
          Number(ssa2023AnnualProbability(Math.min(age, 119), "female"))) /
        2;
      return { id: p.id, age, q };
    });
    advanceCore(core, addDays(makeIsoDate(start), 365));
    let deaths = 0;
    let expected = 0;
    for (const row of info) {
      const died = core.people.get(row.id)?.alive === false;
      bump(bandOf(row.age), row.q, died);
      deaths += died ? 1 : 0;
      expected += row.q;
    }
    console.log(
      `${place.name} (${place.key}) year ${year + 1}: ${deaths} deaths, ${expected.toFixed(1)} expected, ${alive.length} people`,
    );
  }
}
let d = 0,
  e = 0;
for (const [band] of BANDS) {
  const row = total.get(band);
  if (!row) continue;
  d += row.deaths;
  e += row.expected;
  console.log(
    `${band}: ${row.deaths} deaths, ${row.expected.toFixed(1)} expected, ratio ${(row.deaths / Math.max(1e-9, row.expected)).toFixed(2)}, ${row.people} people`,
  );
}
console.log(
  `pooled: ${d} deaths, ${e.toFixed(1)} expected, ratio ${(d / Math.max(1e-9, e)).toFixed(3)}`,
);
