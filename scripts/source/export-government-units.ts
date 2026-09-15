/**
 * `npm run export:government-units` — the structural government-unit index.
 *
 * One row per general-purpose government in the Census Bureau's 2025
 * Government Units listing (General Purpose sheet): counties, municipalities
 * and townships, identified by the publisher's PID6. It carries identity and
 * geography only. Nothing here states a power, a form of government, a body
 * size or a rule; those come from the rule domains and are attached by the
 * capability resolver.
 *
 * A place GEOID is written only for a municipal unit whose state FIPS plus
 * publisher place code is a place in the accepted national places corpus. A
 * county row's "99xxx" code and a township's publisher code are not places and
 * are never presented as one; the township code travels as
 * `publisherPlaceCode` for audit, unverified. A county GEOID is the unit's
 * county AREA, not a governing parent.
 *
 * Regenerate with `npm run export:government-units`. The output is committed so
 * the browser build never runs Node source code.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { openGovernmentUnitsProduction } from "../../src/source/domains/government-units/index";
import { readPublishedGeneralPurposeUnits } from "../../src/source/domains/government-units/published-2025";
import type { ArtifactLock } from "../../src/source/core/index";
import { NATIONAL_PLACES_ROWS } from "../../src/simulation/national-places.generated";
import { NATIONAL_COUNTIES_ROWS } from "../../src/simulation/national-counties.generated";
import { REPO_ROOT, domainDataDir } from "./registry";

export const GOVERNMENT_UNITS_OUTPUT_PATH =
  "src/simulation/government-units.generated.ts";

const TYPE_CODES: Readonly<Record<string, 1 | 2 | 3>> = {
  "1 - COUNTY": 1,
  "2 - MUNICIPAL": 2,
  "3 - TOWNSHIP": 3,
};

/** Build the generated module text from the locked listing. */
export function renderGovernmentUnitsModule(): string {
  const lock = JSON.parse(
    readFileSync(
      resolve(domainDataDir("government-units"), "artifact-lock.json"),
      "utf-8",
    ),
  ) as ArtifactLock;
  const input = openGovernmentUnitsProduction(lock);
  const listing = input.artifacts.listing.artifact;
  const units = readPublishedGeneralPurposeUnits(input);
  const places = new Set(
    (JSON.parse(NATIONAL_PLACES_ROWS) as string[][]).map((row) => row[0]!),
  );
  const counties = new Set(
    (JSON.parse(NATIONAL_COUNTIES_ROWS) as string[][]).map((row) => row[0]!),
  );

  const rows: (string | number | null)[][] = [];
  let municipalPlacesVerified = 0;
  let municipalPlacesUnverified = 0;
  for (const unit of units) {
    const typeCode = TYPE_CODES[unit.unitType];
    if (typeCode === undefined) {
      throw new Error(`Unrecognized 2025 GUS unit type "${unit.unitType}".`);
    }
    const countyGeoid =
      unit.countyAreaFips !== null
        ? unit.stateFips + unit.countyAreaFips
        : null;
    if (countyGeoid !== null && !counties.has(countyGeoid)) {
      throw new Error(
        `GUS unit ${unit.publisherId} names county area ${countyGeoid}, which is not in the national counties corpus.`,
      );
    }
    const candidatePlace =
      unit.placeFips !== null ? unit.stateFips + unit.placeFips : null;
    let placeGeoid: string | null = null;
    if (typeCode === 2 && candidatePlace !== null) {
      if (places.has(candidatePlace)) {
        placeGeoid = candidatePlace;
        municipalPlacesVerified += 1;
      } else {
        municipalPlacesUnverified += 1;
      }
    }
    rows.push([
      unit.publisherId,
      unit.unitName,
      typeCode,
      unit.state,
      countyGeoid,
      placeGeoid,
      typeCode === 3 ? (unit.placeFips ?? null) : null,
      unit.functionalActive ? 1 : 0,
    ]);
  }
  rows.sort((left, right) => String(left[0]).localeCompare(String(right[0])));

  const meta = {
    artifactId: listing.artifactId,
    artifactSha256: listing.bytes.sha256,
    sheet: "General Purpose",
    asOf: "2025-06-30",
    unitCount: rows.length,
    counties: rows.filter((row) => row[2] === 1).length,
    municipalities: rows.filter((row) => row[2] === 2).length,
    townships: rows.filter((row) => row[2] === 3).length,
    municipalPlacesVerified,
    municipalPlacesUnverified,
    columns: [
      "publisherId",
      "name",
      "typeCode (1 county, 2 municipality, 3 township)",
      "stateUsps",
      "countyGeoid",
      "placeGeoid",
      "publisherPlaceCode (townships only; unverified)",
      "functionalActive",
    ],
    coverage:
      "Every general-purpose government in the Census Bureau's 2025 Government Units listing. Special districts and school districts are not general-purpose units and are not in this index. Identity and geography only; no legal power is asserted.",
  };

  return [
    "/**",
    " * GENERATED — do not edit by hand.",
    " *",
    " * Written by `scripts/source/export-government-units.ts` from the locked",
    " * Census 2025 Government Units listing. Identity and geography only.",
    " * Regenerate with `npm run export:government-units`.",
    " */",
    "",
    `export const GOVERNMENT_UNITS_META = ${JSON.stringify(meta, null, 2)} as const;`,
    "",
    "/** One JSON string, parsed once on first use. */",
    `export const GOVERNMENT_UNITS_ROWS: string = ${JSON.stringify(JSON.stringify(rows))};`,
    "",
  ].join("\n");
}

if (process.argv[1]?.endsWith("export-government-units.ts")) {
  const text = renderGovernmentUnitsModule();
  writeFileSync(
    resolve(REPO_ROOT, GOVERNMENT_UNITS_OUTPUT_PATH),
    text,
    "utf-8",
  );
  console.log(
    `export:government-units wrote ${GOVERNMENT_UNITS_OUTPUT_PATH} (${text.length} bytes).`,
  );
}
