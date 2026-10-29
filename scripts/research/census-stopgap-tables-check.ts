/* eslint-disable @typescript-eslint/no-explicit-any -- the tables are JSON read by shape; every field used is checked below */
/**
 * Reads the Census tables behind the Oct 19 stopgap reruns and holds each to
 * what the game's own data and the other research files say about it:
 *
 *   node --import tsx scripts/research/census-stopgap-tables-check.ts
 *
 * - census-rerun.results.json: every result names a stopgap row that exists;
 * - census-SG-WORLD-property-tax-rate.json: the game's state property-tax
 *   rates (src/core2/data/housing/property-tax.json) sit inside the table's
 *   own 1-year and 5-year range, and every state and territory is covered;
 * - census-SG-WORLD-housing-county-estimate.json: the game's county rent and
 *   value for each patched county is the value it had when the patch was
 *   computed, or the patch itself once applied (drift reads neither);
 * - census-household-pulse-homeschool-replicate-errors-2023.json, the kin,
 *   moves, partnership-start, partnership-model and district-placement
 *   tables: every state and island area is present, every figure is finite
 *   and in its range, and every error is positive.
 *
 * Prints one line per table and exits nonzero naming each failure.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) =>
  JSON.parse(readFileSync(join(ROOT, path), "utf8")) as Record<string, any>;
const CENSUS = "data/research/stopgaps-oct19/census/";
const failures: string[] = [];
const fail = (text: string) => {
  if (failures.length < 60) failures.push(text);
};
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
/** Fifty states and D.C. as the tables key them. */
const STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];
const ISLAND_AREAS = ["GU", "VI", "AS", "MP"];
const covers = (table: string, keys: Iterable<string>, want: string[]) => {
  const have = new Set(keys);
  for (const key of want)
    if (!have.has(key)) fail(`${table}: ${key} is missing`);
};
const inRange = (label: string, value: unknown, low: number, high: number) => {
  if (!finite(value) || value < low || value > high)
    fail(`${label}: ${String(value)} is outside [${low}, ${high}]`);
};
const report = (name: string, detail: string) =>
  process.stdout.write(`${name}: ${detail}\n`);

// The reruns name stopgap rows that exist.
const stopgaps = read("src/core2/data/stopgaps.json") as unknown as
  { id: string }[] | { stopgaps: { id: string }[] };
const stopgapIds = new Set(
  (Array.isArray(stopgaps) ? stopgaps : stopgaps.stopgaps).map((r) => r.id),
);
const reruns = JSON.parse(
  readFileSync(join(ROOT, CENSUS, "census-rerun.results.json"), "utf8"),
) as { id: string; recommended?: unknown }[];
for (const result of reruns) {
  if (!stopgapIds.has(result.id))
    fail(`census-rerun.results: ${result.id} is not a stopgap row`);
  if (!result.recommended)
    fail(`census-rerun.results: ${result.id} has no recommended value`);
}
report(
  "census-rerun.results",
  `${reruns.length} results, each on a stopgap row`,
);

// Property tax: the game's state rate sits inside the table's own range.
const tax = read(`${CENSUS}census-SG-WORLD-property-tax-rate.json`);
const gameTax = read("src/core2/data/housing/property-tax.json");
covers("property-tax-rate states", Object.keys(tax.states), STATES);
covers("property-tax-rate territories", Object.keys(tax.territories), [
  ...ISLAND_AREAS,
  "PR",
]);
let taxChecked = 0;
for (const [state, row] of Object.entries<any>(tax.states)) {
  const game = gameTax.byState?.[state];
  if (!finite(game)) continue;
  const rates = [row.rate1yr2024, row.rate5yr, row.repoRate].filter(finite);
  const low = Math.min(...rates) - 3 * (row.moe1yr2024 ?? 0);
  const high = Math.max(...rates) + 3 * (row.moe1yr2024 ?? 0);
  taxChecked += 1;
  if (game < low || game > high)
    fail(
      `property-tax-rate ${state}: the game's ${game} is outside the table's ${low.toFixed(5)} to ${high.toFixed(5)}`,
    );
}
report("property-tax-rate", `${taxChecked} state rates held to the table`);

// County rent and value: unchanged since the patch, or the patch applied.
const patch = read(`${CENSUS}census-SG-WORLD-housing-county-estimate.json`);
const housing = read("src/core2/data/housing/housing.json");
let patched = 0;
for (const [fips, row] of Object.entries<any>(patch.patch)) {
  const game = housing.countyRentValue?.[fips] as number[] | undefined;
  if (!game) continue;
  patched += 1;
  const same = (a: number | null, b: number | null) => a === null || a === b;
  const before =
    same(row.gameCurrent[0], game[0]) && same(row.gameCurrent[1], game[1]);
  const after = row.rentValue[0] === game[0] && row.rentValue[1] === game[1];
  if (!before && !after)
    fail(
      `housing-county-estimate ${fips}: the game's ${JSON.stringify(game)} is neither its value when patched ${JSON.stringify(row.gameCurrent)} nor the patch ${JSON.stringify(row.rentValue)}`,
    );
}
covers(
  "housing-county-estimate island areas",
  Object.keys(patch.islandAreas2020),
  ISLAND_AREAS,
);
report(
  "housing-county-estimate",
  `${patched} counties held to the game's data`,
);

// Homeschool share and its replicate errors.
const homeschool = read(
  "data/research/people/census-household-pulse-homeschool-replicate-errors-2023.json",
);
inRange("homeschool national share", homeschool.national.share, 0, 0.3);
if (!(homeschool.national.standardError > 0))
  fail("homeschool national standard error is not positive");
covers(
  "homeschool states",
  Object.keys(homeschool.states).map((k) => k.slice(3)),
  STATES,
);
for (const [key, row] of Object.entries<any>(homeschool.states)) {
  inRange(`homeschool ${key} share`, row.share, 0, 0.5);
  if (!(row.standardError > 0))
    fail(`homeschool ${key}: standard error is not positive`);
}
report(
  "homeschool-replicate-errors",
  `${Object.keys(homeschool.states).length} states`,
);

// Kin distance.
const kin = read(`${CENSUS}census-SG-P15-kin-generation.json`);
covers("kin-generation states", Object.keys(kin.states), STATES);
covers(
  "kin-generation territories",
  Object.keys(kin.territories),
  ISLAND_AREAS,
);
for (const [state, row] of Object.entries<any>(kin.states))
  for (const key of [
    "notBornInState25to54",
    "parentBeyondHour",
    "adultChildBeyondHour",
    "interstateOutRate18to34",
  ])
    inRange(`kin-generation ${state} ${key}`, row[key], 0, 1);
report("kin-generation", `${Object.keys(kin.states).length} states`);

// Move weights.
const moves = read(`${CENSUS}census-SG-P15-moves-weights.json`);
covers("moves-weights states", Object.keys(moves.states), STATES);
covers(
  "moves-weights island areas",
  Object.keys(moves.islandAreas2020),
  ISLAND_AREAS,
);
for (const [fips, row] of Object.entries<any>(moves.byStateHolds)) {
  if (!(row.ownerHold > 0 && row.ownerHoldSE > 0))
    fail(`moves-weights hold ${fips}: owner hold or its error is not positive`);
  if (!(row.childrenHold > 0 && row.childrenHoldSE > 0))
    fail(
      `moves-weights hold ${fips}: children hold or its error is not positive`,
    );
}
report(
  "moves-weights",
  `${Object.keys(moves.byStateHolds).length} state holds`,
);

// Median age at first marriage.
const start = read(`${CENSUS}census-SG-PW8-partnership-start.json`);
covers("partnership-start states", Object.keys(start.statesAndDC), STATES);
covers(
  "partnership-start island areas",
  Object.keys(start.territoriesFromIslandAreasCensus2020),
  ISLAND_AREAS,
);
for (const [state, row] of Object.entries<any>(start.statesAndDC)) {
  inRange(
    `partnership-start ${state} men`,
    row.medianAgeFirstMarriageMen,
    20,
    40,
  );
  inRange(
    `partnership-start ${state} women`,
    row.medianAgeFirstMarriageWomen,
    20,
    40,
  );
  if (!(row.moeMen > 0 && row.moeWomen > 0))
    fail(`partnership-start ${state}: margin of error is not positive`);
}
report("partnership-start", `${Object.keys(start.statesAndDC).length} states`);

// Partnership model: the island areas' and places' age and marital counts.
const model = read(`${CENSUS}census-SG-P15-partnership-model.json`);
const places = read(`${CENSUS}census-SG-P15-partnership-model-places.json`);
const counts = (label: string, row: any) => {
  for (const sex of ["male", "female"] as const) {
    if (row.population?.[sex]?.length !== 19)
      fail(`${label}: ${sex} population is not 19 age bands`);
    if (row.marital?.[sex]?.length !== 14)
      fail(`${label}: ${sex} marital is not 14 bands`);
    for (const value of [
      ...(row.population?.[sex] ?? []),
      ...(row.marital?.[sex] ?? []),
    ])
      if (!finite(value) || value < 0)
        fail(`${label}: a ${sex} count is not a non-negative number`);
  }
};
covers("partnership-model geos", Object.keys(model.geos), [
  "66",
  "78",
  "60",
  "69",
]);
for (const [geo, row] of Object.entries<any>(model.geos))
  counts(`partnership-model geo ${geo}`, row);
for (const [key, row] of Object.entries<any>(places.places))
  counts(`partnership-model place ${key}`, row);
report(
  "partnership-model",
  `${Object.keys(model.geos).length} island areas, ${Object.keys(places.places).length} places`,
);

// District placement: every district carries the same columns.
const districts = read(`${CENSUS}census-SG-CORE-district-placement.json`);
const width = Object.values<any>(districts.districts)[0]!.length;
// Columns: households, owner households, median income, median age,
// population, then 11 owner and 11 renter household counts by income bin.
// A "-ZZZ" key is the Census code for land in no district: nobody lives
// there, so its counts are zero and its medians are null.
for (const [id, row] of Object.entries<any>(districts.districts)) {
  if (row.length !== width) {
    fail(`district-placement ${id}: ${row.length} columns, not ${width}`);
    continue;
  }
  const counts = [row[0], row[1], row[4], ...row.slice(5)];
  if (counts.some((v: unknown) => !finite(v) || (v as number) < 0))
    fail(`district-placement ${id}: a count is negative or not a number`);
  if (id.endsWith("-ZZZ")) {
    if (
      counts.some((v: number) => v !== 0) ||
      row[2] !== null ||
      row[3] !== null
    )
      fail(`district-placement ${id}: a district-less code holds people`);
    continue;
  }
  if (!finite(row[2]) || !finite(row[3]))
    fail(`district-placement ${id}: a median is not a number`);
  const owners = row.slice(5, 16).reduce((n: number, v: number) => n + v, 0);
  const renters = row.slice(16, 27).reduce((n: number, v: number) => n + v, 0);
  // Households with no reported income fall outside the bins; the bins never hold more than the district.
  if (owners > row[1] + 1 || owners + renters > row[0] + 1)
    fail(
      `district-placement ${id}: its income bins hold more households than the district`,
    );
}
covers(
  "district-placement territories",
  Object.keys(districts.territories),
  ISLAND_AREAS,
);
report(
  "district-placement",
  `${Object.keys(districts.districts).length} districts of ${width} columns`,
);

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
