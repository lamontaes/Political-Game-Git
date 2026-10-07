/**
 * Export what a rental home costs in each county, from the committed HUD file.
 *
 * Reads the normalized HUD FY2025 corpus committed in the repository
 * (`data/source/hud-housing/corpus.json`, built from `raw/FY25_FMRs.xlsx` and
 * `raw/Section8-FY25.xlsx`) and writes
 * `src/simulation/living-world/town-rent.generated.ts`:
 *
 * - For every HUD area row, the Fair Market Rent for an efficiency and for
 *   one to four bedrooms, in whole dollars a month.
 * - The same row's very low income limit (50% of area median) and low income
 *   limit (80%) for a family of four, in dollars a year. Other family sizes
 *   are derived with HUD's own family-size adjustment in the reader.
 * - The row's published population, which weighs a county's towns where HUD
 *   publishes New England towns rather than the county.
 *
 * A row is keyed by its five-digit state and county FIPS code, and a New
 * England town row by that code and the town's name. Run with
 * `npm run export:town-rent`; `-- --check` fails when the committed output is
 * stale. The output is committed so the browser build never reads the corpus.
 */

import { readFileSync, writeFileSync } from "node:fs";

import type {
  HudFairMarketRentRecord,
  HudIncomeLimitRecord,
  HudRecord,
} from "../../../src/source/domains/hud-housing/types";

export const TOWN_RENT_OUTPUT_PATH =
  "src/simulation/living-world/town-rent.generated.ts";

const corpus = JSON.parse(
  readFileSync("data/source/hud-housing/corpus.json", "utf8"),
) as readonly HudRecord[];

const limits = new Map<string, HudIncomeLimitRecord>();
// Connecticut's income limits use its planning regions and its Fair Market
// Rents its old counties, so a town row also joins by state and town name.
const limitsByTown = new Map<string, HudIncomeLimitRecord>();
for (const record of corpus)
  if (record.recordKind === "income-limit") {
    limits.set(record.area.hudFipsCode, record);
    if (record.area.countyTownName)
      limitsByTown.set(
        `${record.area.stateUsps}|${record.area.countyTownName}`,
        record,
      );
  }

const counties: string[] = [];
const towns: string[] = [];
const stateRows = new Map<
  string,
  {
    population: number;
    rentTotals: [number, number, number, number, number];
    rentWeight: number;
    veryLowTotal: number;
    lowTotal: number;
    limitWeight: number;
  }
>();
let vintage = "";
for (const record of corpus) {
  if (record.recordKind !== "fair-market-rent") continue;
  const fmr = record as HudFairMarketRentRecord;
  vintage = fmr.productVintage;
  const code = fmr.area.hudFipsCode;
  const county = code.slice(0, 5);
  const limit =
    limits.get(code) ??
    (fmr.area.countyTownName
      ? limitsByTown.get(`${fmr.area.stateUsps}|${fmr.area.countyTownName}`)
      : undefined);
  const cells = [
    ...(["0", "1", "2", "3", "4"] as const).map((bedrooms) =>
      String(fmr.rentByBedrooms[bedrooms]),
    ),
    limit ? String(limit.veryLowIncomeLimitByFamilySize["4"] ?? "") : "",
    limit ? String(limit.lowIncomeLimitByFamilySize["4"] ?? "") : "",
    fmr.publishedPopulation === null ? "" : String(fmr.publishedPopulation),
  ].join("/");
  // County rows partition a state; including town rows would count many
  // residents twice because those towns are already part of county totals.
  if (code.endsWith("99999")) {
    const state = stateRows.get(fmr.area.stateUsps) ?? {
      population: 0,
      rentTotals: [0, 0, 0, 0, 0],
      rentWeight: 0,
      veryLowTotal: 0,
      lowTotal: 0,
      limitWeight: 0,
    };
    const population = Math.max(0, fmr.publishedPopulation ?? 0);
    if (population > 0) {
      state.population += population;
      state.rentWeight += population;
      (["0", "1", "2", "3", "4"] as const).forEach((bedrooms, index) => {
        state.rentTotals[index]! += fmr.rentByBedrooms[bedrooms] * population;
      });
      const incomeLimit = limits.get(code);
      if (incomeLimit) {
        state.veryLowTotal +=
          (incomeLimit.veryLowIncomeLimitByFamilySize["4"] ?? 0) * population;
        state.lowTotal +=
          (incomeLimit.lowIncomeLimitByFamilySize["4"] ?? 0) * population;
        state.limitWeight += population;
      }
    }
    stateRows.set(fmr.area.stateUsps, state);
  }
  if (code.endsWith("99999")) counties.push(`${county}:${cells}`);
  else if (fmr.area.countyTownName)
    towns.push(`${county}|${fmr.area.countyTownName}:${cells}`);
}
counties.sort();
towns.sort();
const stateRentRows = [...stateRows]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([state, row]) => {
    const average = (value: number, weight: number) =>
      weight > 0 ? Math.round(value / weight) : 0;
    return `${state}:${row.rentTotals
      .map((total) => average(total, row.rentWeight))
      .join(
        "/",
      )}/${average(row.veryLowTotal, row.limitWeight)}/${average(row.lowTotal, row.limitWeight)}/${row.population}`;
  });

const output = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/regional-money/export-town-rent.ts\` from the
 * committed HUD ${vintage} Fair Market Rents and Section 8 income limits
 * (\`data/source/hud-housing/corpus.json\`). An empty field is a figure the
 * file does not give, never zero.
 */

export const TOWN_RENT_META = ${JSON.stringify(
  {
    fairMarketRents: `HUD ${vintage} Fair Market Rents, by county or New England town: efficiency through four bedrooms, dollars a month (the 40th percentile of gross rent for standard-quality units recently rented).`,
    incomeLimits: `HUD ${vintage} Section 8 income limits, same areas: very low (50%) and low (80%) income for a family of four, dollars a year.`,
  },
  null,
  2,
)} as const;

/**
 * One entry per county HUD publishes as a whole, separated by \`;\`:
 * \`countyFips:r0/r1/r2/r3/r4/veryLow4/low4/population\`.
 */
export const TOWN_RENT_COUNTIES = ${JSON.stringify(counties.join(";"))};

/**
 * One entry per New England town HUD publishes instead of its county:
 * \`countyFips|Town name:r0/r1/r2/r3/r4/veryLow4/low4/population\`.
 */
export const TOWN_RENT_TOWNS = ${JSON.stringify(towns.join(";"))};

/**
 * Population-weighted HUD county rents by state or territory, used only
 * when a playable place has no Census county link. These are estimates, not
 * additional published HUD areas.
 * \`USPS:r0/r1/r2/r3/r4/veryLow4/low4/population\`.
 */
export const TOWN_RENT_STATES = ${JSON.stringify(stateRentRows.join(";"))};
`;

if (process.argv.includes("--check")) {
  if (readFileSync(TOWN_RENT_OUTPUT_PATH, "utf8") !== output)
    throw new Error(`Stale ${TOWN_RENT_OUTPUT_PATH}`);
  console.log(`${TOWN_RENT_OUTPUT_PATH} is current.`);
} else {
  writeFileSync(TOWN_RENT_OUTPUT_PATH, output);
  console.log(
    `Wrote ${counties.length} counties and ${towns.length} towns to ${TOWN_RENT_OUTPUT_PATH}.`,
  );
}
