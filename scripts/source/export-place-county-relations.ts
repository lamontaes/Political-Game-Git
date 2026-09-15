/**
 * Export the compact place-within-county index for runtime use.
 *
 * One row per part of a 2020 Census place lying in one county: place GEOID,
 * county GEOID and the part's land area in square meters. The runtime turns
 * these into county-government shares through the government-unit index; it
 * never picks one county for a place by name or centroid.
 *
 * Run with `node --import tsx scripts/source/export-place-county-relations.ts`
 * (an `export:place-county-relations` npm script is an adapter request to
 * LAND, which owns package.json). The output is committed so the browser
 * build never runs Node source code.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  PLACE_COUNTY_COMPILER_VERSION,
  PLACE_COUNTY_CORPUS_AS_OF,
} from "../../src/source/domains/place-county-relations/index";
import type { PlaceCountyPartRecord } from "../../src/source/domains/place-county-relations/index";
import type { NormalizedCorpus } from "../../src/source/core/index";
import { NATIONAL_COUNTIES_ROWS } from "../../src/simulation/national-counties.generated";
import { REPO_ROOT, domainDataDir } from "./registry";

export const PLACE_COUNTY_OUTPUT_PATH =
  "src/simulation/place-county-relations.generated.ts";

/**
 * Connecticut's eight 2020 counties were replaced as county equivalents by
 * planning regions in the 2022 geography, and none has a county government.
 * They are the only 2020 county GEOIDs expected to be absent from the 2025
 * national counties corpus.
 */
const RETIRED_2020_COUNTY_STATE_FIPS = "09";

export function renderPlaceCountyModule(): string {
  const dir = domainDataDir("place-county-relations");
  const records = JSON.parse(
    readFileSync(resolve(dir, "corpus.json"), "utf-8"),
  ) as PlaceCountyPartRecord[];
  const manifest = JSON.parse(
    readFileSync(resolve(dir, "corpus-manifest.json"), "utf-8"),
  ) as NormalizedCorpus;
  const counties2025 = new Set(
    (JSON.parse(NATIONAL_COUNTIES_ROWS) as string[][]).map((row) => row[0]!),
  );

  const retired = new Set<string>();
  const placeLand = new Map<string, number>();
  for (const record of records) {
    if (!counties2025.has(record.countyGeoid)) {
      if (record.stateFips !== RETIRED_2020_COUNTY_STATE_FIPS) {
        throw new Error(
          `2020 county ${record.countyGeoid} (in place ${record.placeGeoid}) is not in the 2025 national counties corpus, and only Connecticut's retired counties are expected to be missing.`,
        );
      }
      retired.add(record.countyGeoid);
    }
    placeLand.set(record.placeGeoid, record.placeLandAreaSquareMeters);
  }
  const noLand = [...placeLand].filter(([, land]) => land === 0);
  if (noLand.length > 0) {
    throw new Error(
      `${noLand.length} places have no land area, so a land share is undefined for them; the first is ${noLand[0]![0]}.`,
    );
  }

  const rows = records.map((record) => [
    record.placeGeoid,
    record.countyGeoid,
    record.partLandAreaSquareMeters,
  ]);

  const meta = {
    corpusId: manifest.corpusId,
    corpusSha256: manifest.canonicalSha256,
    compilerVersion: PLACE_COUNTY_COMPILER_VERSION,
    geographyAsOf: PLACE_COUNTY_CORPUS_AS_OF,
    source:
      "2020 Census Redistricting Data (P.L. 94-171) geographic headers, summary level 155 (State-Place-County), 50 states and DC",
    partCount: rows.length,
    placeCount: placeLand.size,
    multiCountyPlaceCount: [
      ...records.reduce(
        (counts, record) =>
          counts.set(
            record.placeGeoid,
            (counts.get(record.placeGeoid) ?? 0) + 1,
          ),
        new Map<string, number>(),
      ),
    ].filter(([, count]) => count > 1).length,
    retired2020CountyGeoids: [...retired].sort(),
    columns: ["placeGeoid", "countyGeoid", "partLandAreaSquareMeters"],
    coverage:
      "2020 place and county geography. A place incorporated or re-bounded after 2020 is described as it stood on 2020-04-01, or not at all.",
  };

  return [
    "/**",
    " * GENERATED — do not edit by hand.",
    " *",
    " * Written by `scripts/source/export-place-county-relations.ts` from the",
    " * compiled place-county-relations corpus. Geography only; no government",
    " * power or service area is asserted.",
    " */",
    "",
    `export const PLACE_COUNTY_RELATIONS_META = ${JSON.stringify(meta, null, 2)} as const;`,
    "",
    "/** One JSON string, parsed once on first use. */",
    `export const PLACE_COUNTY_RELATIONS_ROWS: string = ${JSON.stringify(JSON.stringify(rows))};`,
    "",
  ].join("\n");
}

if (process.argv[1]?.endsWith("export-place-county-relations.ts")) {
  const text = renderPlaceCountyModule();
  writeFileSync(resolve(REPO_ROOT, PLACE_COUNTY_OUTPUT_PATH), text, "utf-8");
  console.log(
    `export-place-county-relations wrote ${PLACE_COUNTY_OUTPUT_PATH} (${text.length} bytes).`,
  );
}
