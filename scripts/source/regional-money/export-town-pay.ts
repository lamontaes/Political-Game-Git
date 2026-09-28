/**
 * Export what each town job pays, and how often, from committed BLS files.
 *
 * Reads the raw BLS May 2025 OEWS workbooks committed in the repository
 * (`data/source/career-occupations/raw/oews-state-2025.zip`,
 * `oews-area-2025.zip` and `oews.zip`), the county-to-OEWS-area table
 * (`data/source/cbsa-delineations/regional-corpus.json.gz`) and the BLS
 * pay-period shares (`data/source/bls-pay-period/regional-corpus.json.gz`),
 * and writes `src/simulation/living-world/town-pay.generated.ts`:
 *
 * - For every SOC code a town job is paid as (`TOWN_JOB_SOC`), the 10th,
 *   25th, 50th, 75th and 90th percentile annual wage in every metro and
 *   nonmetro area, every state, D.C. and territory, and the nation.
 * - Each county's OEWS area.
 * - The share of private establishments paying weekly, every two weeks,
 *   twice a month and monthly, by establishment size and by industry.
 *
 * A cell BLS withheld (`*`) or top-coded (`#`) stays missing (an empty
 * field), never zero. Run with `npm run export:town-pay`; `-- --check` fails
 * when the committed output is stale. The output is committed so the browser
 * build never reads the corpora.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { readXlsxSheet } from "../../../src/source/core/archive/xlsx";
import { readZipMember } from "../../../src/source/core/archive/zip";
import { TOWN_JOB_SOC } from "../../../src/simulation/living-world/town-job-soc";

export const TOWN_PAY_OUTPUT_PATH =
  "src/simulation/living-world/town-pay.generated.ts";

const PERCENTILES = [
  "A_PCT10",
  "A_PCT25",
  "A_MEDIAN",
  "A_PCT75",
  "A_PCT90",
] as const;

type Row = readonly string[];

function zippedSheet(path: string, member: string, name: string) {
  return readXlsxSheet(readZipMember(readFileSync(path), member), name).rows;
}

function headerMap(row: Row, required: readonly string[]) {
  const positions = Object.fromEntries(row.map((key, i) => [key, i]));
  for (const key of required)
    if (positions[key] === undefined) throw new Error(`Missing column ${key}`);
  return (line: Row, key: string) => line[positions[key]!] ?? "";
}

function wage(raw: string): string {
  return /^\d+(?:\.\d+)?$/.test(raw) ? String(Math.round(Number(raw))) : "";
}

const wanted = new Set(Object.values(TOWN_JOB_SOC));
/** SOC -> area key -> "p10/p25/p50/p75/p90". State keys are "S" + FIPS. */
const table = new Map<string, Map<string, string>>();
function keep(soc: string, area: string, get: (key: string) => string) {
  const cells = PERCENTILES.map((key) => wage(get(key)));
  if (cells.every((cell) => cell === "")) return;
  let areas = table.get(soc);
  if (!areas) table.set(soc, (areas = new Map()));
  areas.set(area, cells.join("/"));
}

for (const [path, member, name, scope] of [
  [
    "data/source/career-occupations/raw/oews-state-2025.zip",
    "oesm25st/state_M2025_dl.xlsx",
    "state_M2025_dl",
    "state",
  ],
  [
    "data/source/career-occupations/raw/oews-area-2025.zip",
    "oesm25ma/MSA_M2025_dl.xlsx",
    "MSA_M2025_dl",
    "area",
  ],
  [
    "data/source/career-occupations/raw/oews-area-2025.zip",
    "oesm25ma/BOS_M2025_dl.xlsx",
    "BOS_M2025_dl",
    "area",
  ],
] as const) {
  const rows = zippedSheet(path, member, name);
  const get = headerMap(rows[0]!, [
    "AREA",
    "NAICS",
    "OWN_CODE",
    "OCC_CODE",
    ...PERCENTILES,
  ]);
  for (const row of rows.slice(1)) {
    if (get(row, "NAICS") !== "000000" || get(row, "OWN_CODE") !== "1235")
      continue;
    const soc = get(row, "OCC_CODE");
    if (!wanted.has(soc)) continue;
    const area = get(row, "AREA");
    keep(soc, scope === "state" ? `S${area}` : area, (key) => get(row, key));
  }
}

const nationalZip = "data/source/career-occupations/raw/oews.zip";
const nationalBytes = readFileSync(nationalZip);
const nationalMember = "oesm25nat/national_M2025_dl.xlsx";
const nationalRows = readXlsxSheet(
  readZipMember(nationalBytes, nationalMember),
  "national_M2025_dl",
).rows;
const nationalGet = headerMap(nationalRows[0]!, [
  "OCC_CODE",
  "O_GROUP",
  ...PERCENTILES,
]);
for (const row of nationalRows.slice(1)) {
  const soc = nationalGet(row, "OCC_CODE");
  if (wanted.has(soc) && nationalGet(row, "O_GROUP") === "detailed")
    keep(soc, "US", (key) => nationalGet(row, key));
}

const counties = JSON.parse(
  gunzipSync(
    readFileSync("data/source/cbsa-delineations/regional-corpus.json.gz"),
  ).toString("utf8"),
) as { rows: { countyFips: string; oewsAreaCode: string }[] };
const countyAreas = counties.rows
  .map((row) => `${row.countyFips}:${row.oewsAreaCode}`)
  .sort()
  .join(";");

const payPeriods = JSON.parse(
  gunzipSync(
    readFileSync("data/source/bls-pay-period/regional-corpus.json.gz"),
  ).toString("utf8"),
) as {
  referenceMonth: string;
  rows: {
    dimension: string;
    group: string;
    payPeriod: string;
    percent: number;
  }[];
};
const shares: Record<string, Record<string, number>> = {};
for (const row of payPeriods.rows) {
  const group = `${row.dimension}|${row.group}`;
  (shares[group] ??= {})[row.payPeriod] = row.percent;
}

const minimum = JSON.parse(
  readFileSync("data/research/money/minimum-wage-2026.json", "utf8"),
) as {
  asOf: string;
  federalHourly: number;
  places: Record<string, { basicHourly: number | null }>;
};
const minimumByState = Object.fromEntries(
  Object.entries(minimum.places)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => [key, row.basicHourly]),
);

const occupations = [...table.keys()].sort();
const rows = occupations
  .map(
    (soc) =>
      `${soc}=${[...table.get(soc)!]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([area, cells]) => `${area}:${cells}`)
        .join(",")}`,
  )
  .join(";");

const output = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/regional-money/export-town-pay.ts\` from the
 * committed BLS files. An empty wage is a figure BLS withheld or top-coded,
 * never zero.
 */

export const TOWN_PAY_META = ${JSON.stringify(
  {
    wages:
      "BLS Occupational Employment and Wage Statistics, May 2025: area, state and national tables, 10th, 25th, 50th, 75th and 90th percentile annual wage, all ownerships.",
    payPeriods: `BLS Current Employment Statistics, length of pay periods, private establishments, ${payPeriods.referenceMonth}.`,
  },
  null,
  2,
)} as const;

/**
 * One entry per SOC code, separated by \`;\`:
 * \`soc=area:p10/p25/p50/p75/p90,...\`, dollars a year. An area is an OEWS
 * area code, \`S\` and a state FIPS code for a state, or \`US\`.
 */
export const TOWN_PAY_PERCENTILES = ${JSON.stringify(rows)};

/** Each county's OEWS area: \`countyFips:areaCode;...\`. */
export const TOWN_PAY_COUNTY_AREAS = ${JSON.stringify(countyAreas)};

/**
 * Each state's, D.C.'s and territory's basic minimum wage an hour, from
 * \`data/research/money/minimum-wage-2026.json\` (U.S. Department of Labor,
 * as of ${minimum.asOf}); null where it is UNKNOWN. City minimums are not here.
 */
export const TOWN_MINIMUM_WAGES: Readonly<Record<string, number | null>> = ${JSON.stringify(minimumByState, null, 2)};

/** The federal minimum wage an hour. */
export const FEDERAL_MINIMUM_HOURLY = ${minimum.federalHourly};

/** Percent of private establishments by pay period, by \`dimension|group\`. */
export const TOWN_PAY_PERIOD_SHARES: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = ${JSON.stringify(shares, null, 2)};
`;

if (process.argv.includes("--check")) {
  if (readFileSync(TOWN_PAY_OUTPUT_PATH, "utf8") !== output)
    throw new Error(`Stale ${TOWN_PAY_OUTPUT_PATH}`);
  console.log(`${TOWN_PAY_OUTPUT_PATH} is current.`);
} else {
  writeFileSync(TOWN_PAY_OUTPUT_PATH, output);
  console.log(
    `Wrote ${occupations.length} of ${wanted.size} occupations to ${TOWN_PAY_OUTPUT_PATH}.`,
  );
}
