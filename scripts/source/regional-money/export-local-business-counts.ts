/**
 * Export how many businesses of each kind a county has, and what they take in.
 *
 * Reads three locked sources and writes
 * `src/simulation/local-business-counts.generated.ts`:
 *  1. County Business Patterns 2023 (U.S. Census Bureau), 4-digit industry
 *     codes: establishments and employees for each county.
 *  2. The 2022 Economic Census extract in `data/source/economic-census-2022`:
 *     sales and employees for the nation and each state, from which a state's
 *     sales per employee follows.
 *  3. The Bureau of Economic Analysis's 2024 county and state population
 *     (table CAINC1, line 2), so a town's share of its county follows from
 *     the town's own population.
 * A county with no County Business Patterns rows at all is left out (unknown,
 * not "no businesses"); a county that has rows but none for a code has none of
 * that kind. Run with `npm run export:local-business-counts`; `-- --check`
 * fails when the committed output is stale.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { readZipMember } from "../../../src/source/core/archive/zip";

export const LOCAL_BUSINESS_COUNTS_OUTPUT_PATH =
  "src/simulation/local-business-counts.generated.ts";

/** The game's eight kinds of town business and the NAICS 2022 codes each is. */
export const LOCAL_BUSINESS_NAICS: readonly (readonly [
  string,
  readonly string[],
])[] = [
  ["grocery", ["4451"]],
  ["hardware", ["4441"]],
  ["diner", ["7225"]],
  ["auto-repair", ["8111"]],
  ["law-office", ["5411"]],
  ["accounting", ["5412"]],
  ["construction", ["2381", "2382"]],
  ["salon", ["8121"]],
];

const CBP_ZIP = "data/source/county-business-patterns/raw/cbp-county-2023.zip";
const EC_EXTRACT = "data/source/economic-census-2022/raw/business-receipts.csv";
const BEA_ZIP = "data/source/bea-regional/raw/CAINC1.zip";
const BEA_MEMBER = "CAINC1__ALL_AREAS_1969_2024.csv";

type Cell = { establishments: number; employees: number };

function emptyCells(): Cell[] {
  return LOCAL_BUSINESS_NAICS.map(() => ({ establishments: 0, employees: 0 }));
}

function csvFields(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      fields.push(field);
      field = "";
    } else field += character;
  }
  fields.push(field);
  return fields;
}

function countyPopulation(): Map<string, number> {
  const text = readZipMember(readFileSync(BEA_ZIP), BEA_MEMBER).toString(
    "latin1",
  );
  const lines = text.split(/\r?\n/);
  const header = csvFields(lines[0]!);
  const fips = header.indexOf("GeoFIPS");
  const line = header.indexOf("LineCode");
  const year = header.indexOf("2024");
  const population = new Map<string, number>();
  for (const row of lines.slice(1)) {
    if (!row) continue;
    const cells = csvFields(row);
    if (cells.length < header.length) continue;
    const geo = cells[fips]!.trim();
    if (cells[line]!.trim() !== "2" || geo.length !== 5 || geo === "00000")
      continue;
    const value = cells[year]!.trim();
    if (/^\d+$/.test(value)) population.set(geo, Number(value));
  }
  return population;
}

export function renderLocalBusinessCountsModule(): string {
  const population = countyPopulation();
  const naicsIndex = new Map<string, number>();
  LOCAL_BUSINESS_NAICS.forEach(([, codes], kind) =>
    codes.forEach((code) => naicsIndex.set(`${code}//`, kind)),
  );

  const cbp = readZipMember(readFileSync(CBP_ZIP), "cbp23co.txt")
    .toString("utf8")
    .split(/\r?\n/);
  const header = cbp[0]!.replaceAll('"', "").split(",");
  const at = (name: string) => header.indexOf(name);
  const counties = new Map<string, Cell[]>();
  for (const line of cbp.slice(1)) {
    if (!line) continue;
    const row = line.replaceAll('"', "").split(",");
    const state = row[at("fipstate")]!;
    const county = row[at("fipscty")]!;
    if (county === "999") continue;
    const fips = `${state}${county}`;
    if (!counties.has(fips)) counties.set(fips, emptyCells());
    const kind = naicsIndex.get(row[at("naics")]!);
    if (kind === undefined) continue;
    const cell = counties.get(fips)![kind]!;
    cell.establishments += Number(row[at("est")]);
    cell.employees += Number(row[at("emp")]);
  }

  const states = new Map<string, Cell[]>([["US", emptyCells()]]);
  const statePopulation = new Map<string, number>();
  for (const [fips, cells] of counties) {
    const state = fips.slice(0, 2);
    if (!states.has(state)) states.set(state, emptyCells());
    cells.forEach((cell, kind) => {
      for (const target of [states.get(state)!, states.get("US")!]) {
        target[kind]!.establishments += cell.establishments;
        target[kind]!.employees += cell.employees;
      }
    });
  }
  // BEA also publishes eight regions (codes 91000 to 98000) beside the states.
  for (const [fips, value] of population)
    if (fips.endsWith("000") && states.has(fips.slice(0, 2)))
      statePopulation.set(fips.slice(0, 2), value);
  const nationPopulation = [...statePopulation.values()].reduce(
    (sum, value) => sum + value,
    0,
  );

  const rowOf = (populationValue: number | undefined, cells: Cell[]) =>
    [
      populationValue ?? 0,
      ...cells.flatMap((cell) => [cell.establishments, cell.employees]),
    ].join(",");
  const countyRows = [...counties]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fips, cells]) => `${fips}:${rowOf(population.get(fips), cells)}`);
  const stateRows = [...states]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([state, cells]) =>
        `${state}:${rowOf(state === "US" ? nationPopulation : statePopulation.get(state), cells)}`,
    );

  // Sales per employee, from the Economic Census: sales over employees for
  // the geography, summed across a kind's codes. A cell the Census withheld
  // leaves that state out, and the reader takes the nation's.
  const ec = readFileSync(EC_EXTRACT, "utf8").trim().split("\n").slice(1);
  const sales = new Map<
    string,
    { receipts: number; employees: number; ok: boolean }[]
  >();
  for (const line of ec) {
    const [naics, geography, , receipts, employees] = line.split(",") as [
      string,
      string,
      string,
      string,
      string,
    ];
    const kind = LOCAL_BUSINESS_NAICS.findIndex(([, codes]) =>
      codes.includes(naics),
    );
    if (kind < 0) continue;
    if (!sales.has(geography))
      sales.set(
        geography,
        LOCAL_BUSINESS_NAICS.map(() => ({
          receipts: 0,
          employees: 0,
          ok: true,
        })),
      );
    const cell = sales.get(geography)![kind]!;
    if (!receipts || !employees) cell.ok = false;
    else {
      cell.receipts += Number(receipts);
      cell.employees += Number(employees);
    }
  }
  const salesRows = [...sales]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([geography, cells]) =>
        `${geography}:${cells
          .map((cell) =>
            cell.ok && cell.employees > 0
              ? Math.round((cell.receipts * 1000) / cell.employees)
              : 0,
          )
          .join(",")}`,
    );

  const lock = JSON.parse(
    readFileSync(
      "data/source/economic-census-2022/regional-artifact-lock.json",
      "utf8",
    ),
  ) as { artifacts: { sha256: string }[] };
  const meta = {
    source:
      "U.S. Census Bureau County Business Patterns 2023 (establishments and employees, NAICS 2022 4-digit); 2022 Economic Census (sales and employees, nation and states); Bureau of Economic Analysis CAINC1 line 2 (2024 population).",
    economicCensusExtractSha256: lock.artifacts[0]!.sha256,
    counties: countyRows.length,
    states: stateRows.length - 1,
  };
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/regional-money/export-local-business-counts.ts\`.
 * A county with no County Business Patterns rows is absent (unknown, not
 * "none"); a state whose Economic Census sales the Census withheld reads
 * zero here and the reader takes the nation's.
 */

export const LOCAL_BUSINESS_COUNTS_META = ${JSON.stringify(meta, null, 2)} as const;

/** The kinds, in the order every row below lists them. */
export const LOCAL_BUSINESS_COUNT_KINDS = ${JSON.stringify(LOCAL_BUSINESS_NAICS.map(([key]) => key))} as const;

/**
 * \`county FIPS:population,\` then \`establishments,employees\` for each kind,
 * separated by \`;\`. Population 0 means unknown.
 */
export const COUNTY_BUSINESS_ROWS =
  ${JSON.stringify(countyRows.join(";"))};

/** The same, for each state (two-digit FIPS) and the nation (\`US\`). */
export const STATE_BUSINESS_ROWS =
  ${JSON.stringify(stateRows.join(";"))};

/**
 * \`state FIPS or US:\` sales in dollars per employee for each kind
 * (Economic Census 2022). 0 means withheld.
 */
export const SALES_PER_EMPLOYEE_ROWS =
  ${JSON.stringify(salesRows.join(";"))};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const output = renderLocalBusinessCountsModule();
  if (process.argv.includes("--check")) {
    if (readFileSync(LOCAL_BUSINESS_COUNTS_OUTPUT_PATH, "utf8") !== output)
      throw new Error(`Stale ${LOCAL_BUSINESS_COUNTS_OUTPUT_PATH}`);
    console.log(`${LOCAL_BUSINESS_COUNTS_OUTPUT_PATH} is current.`);
  } else {
    writeFileSync(LOCAL_BUSINESS_COUNTS_OUTPUT_PATH, output);
    console.log(`wrote ${LOCAL_BUSINESS_COUNTS_OUTPUT_PATH}`);
  }
}
