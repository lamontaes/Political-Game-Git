/**
 * Export what a home costs in each county, from the locked ACS county table.
 *
 * Reads the compiled corpus `data/source/acs-county-housing-commute/
 * regional-corpus.json.gz` (U.S. Census Bureau, 2020-2024 American Community
 * Survey 5-year, table B25077, median value of owner-occupied housing units)
 * and writes `src/simulation/county-home-value.generated.ts`: one median in
 * whole dollars for every county or county equivalent the survey published a
 * value for. A county the survey withheld (top-coded, too few sample homes)
 * is left out, never written as zero. Run with `npm run export:county-home-value`;
 * `-- --check` fails when the committed output is stale. The output is
 * committed so the browser build never reads the corpus.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

export const COUNTY_HOME_VALUE_OUTPUT_PATH =
  "src/simulation/county-home-value.generated.ts";

const CORPUS = "data/source/acs-county-housing-commute/regional-corpus.json.gz";
const MANIFEST =
  "data/source/acs-county-housing-commute/regional-corpus-manifest.json";

interface Cell {
  readonly estimate: { readonly raw: string; readonly value: number | null };
}
interface Row {
  readonly countyFips: string;
  readonly medianOwnerOccupiedHomeValue?: Cell;
}

export function renderCountyHomeValueModule(): string {
  const corpus = JSON.parse(
    gunzipSync(readFileSync(CORPUS)).toString("utf8"),
  ) as {
    rows: Row[];
    observationPeriod: string;
    source: string;
  };
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    canonicalSha256: string;
    asOf: string;
  };
  const rows: string[] = [];
  let withheld = 0;
  for (const row of [...corpus.rows].sort((a, b) =>
    a.countyFips.localeCompare(b.countyFips),
  )) {
    const value = row.medianOwnerOccupiedHomeValue?.estimate.value ?? null;
    if (value === null || value <= 0) {
      withheld += 1;
      continue;
    }
    rows.push(`${row.countyFips}:${value}`);
  }
  const meta = {
    source: `${corpus.source}, table B25077 (median value, owner-occupied housing units), ${corpus.observationPeriod}.`,
    corpusSha256: manifest.canonicalSha256,
    asOf: manifest.asOf,
    counties: rows.length,
    withheld,
  };
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/regional-money/export-county-home-value.ts\` from
 * the locked ACS county corpus. A county the survey withheld is absent, never
 * zero.
 */

export const COUNTY_HOME_VALUE_META = ${JSON.stringify(meta, null, 2)} as const;

/** \`county FIPS:median home value in dollars\`, separated by \`;\`. */
export const COUNTY_HOME_VALUE_ROWS =
  ${JSON.stringify(rows.join(";"))};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const output = renderCountyHomeValueModule();
  if (process.argv.includes("--check")) {
    if (readFileSync(COUNTY_HOME_VALUE_OUTPUT_PATH, "utf8") !== output)
      throw new Error(`Stale ${COUNTY_HOME_VALUE_OUTPUT_PATH}`);
    console.log(`${COUNTY_HOME_VALUE_OUTPUT_PATH} is current.`);
  } else {
    writeFileSync(COUNTY_HOME_VALUE_OUTPUT_PATH, output);
    console.log(`wrote ${COUNTY_HOME_VALUE_OUTPUT_PATH}`);
  }
}
