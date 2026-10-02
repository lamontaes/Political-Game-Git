/**
 * Place-within-county corpus validation.
 *
 * Universe counts are pinned from the publisher files after the first locked
 * compile. Identity vectors are Census GEOIDs read from the files themselves.
 */

import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type {
  PlaceCountyPartRecord,
  PlaceRelationRecord,
  PlaceDistrictPopulationRecord,
} from "./types";

/** Place-within-county parts in the 50 state and DC files. */
export const EXPECTED_PART_RECORD_COUNT = 33037;
/** Distinct 2020 places in the same files. */
export const EXPECTED_PLACE_COUNT = 31617;

/** Official vectors: place GEOID → county GEOIDs, as the files publish them. */
export const OFFICIAL_PLACE_COUNTY_VECTORS: Readonly<
  Record<string, readonly string[]>
> = {
  // Alamo town, Nevada: one county.
  "3200500": ["32017"],
  // Oklahoma City, Oklahoma: four counties.
  "4055000": ["40017", "40027", "40109", "40125"],
  // Charlottesville city, Virginia: its own county equivalent.
  "5114968": ["51540"],
};

export function validatePlaceCountyCorpus(
  compiled: CompiledCorpus<PlaceRelationRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const districtRecords = compiled.records.filter(
    (record): record is PlaceDistrictPopulationRecord =>
      "relationKind" in record,
  );
  const records = compiled.records.filter(
    (record): record is PlaceCountyPartRecord => !("relationKind" in record),
  );
  const groups = new Map<string, PlaceDistrictPopulationRecord[]>();
  const districtIds = new Set<string>();
  for (const record of districtRecords) {
    const key = `${record.boundaryVintage}:${record.placeGeoid}:${record.chamber}`;
    const parts = groups.get(key) ?? [];
    parts.push(record);
    groups.set(key, parts);
    if (
      districtIds.has(record.recordId) ||
      !Number.isSafeInteger(record.partPopulationCount) ||
      record.partPopulationCount < 0 ||
      record.districtGeoid.slice(0, 2) !== record.stateFips ||
      record.placeGeoid.slice(0, 2) !== record.stateFips ||
      record.populationAsOf !== "2020-04-01"
    )
      findings.push({
        severity: "error",
        code: "place-county-relations/district-population",
        message: `Invalid district part ${record.recordId}`,
      });
    districtIds.add(record.recordId);
  }
  for (const [key, parts] of groups) {
    const total = parts.reduce(
      (sum, part) => sum + part.partPopulationCount,
      0,
    );
    if (
      !Number.isSafeInteger(total) ||
      parts.some((part) => part.placePopulationCount !== total)
    )
      findings.push({
        severity: "error",
        code: "place-county-relations/district-partition",
        message: `District parts do not reconcile for ${key}`,
      });
  }
  const production = compiled.corpus.inputClass === "production";
  const places = new Map<string, PlaceCountyPartRecord[]>();
  const ids = new Set<string>();

  for (const record of records) {
    if (ids.has(record.recordId)) {
      findings.push({
        severity: "error",
        code: "place-county-relations/duplicate",
        message: `Record ${record.recordId} appears more than once.`,
      });
    }
    ids.add(record.recordId);
    if (
      !Number.isSafeInteger(record.partPopulationCount) ||
      record.partPopulationCount < 0
    ) {
      findings.push({
        severity: "error",
        code: "place-county-relations/population",
        message: `Record ${record.recordId} has no valid nonnegative population count.`,
      });
    }
    if (
      !/^\d{7}$/.test(record.placeGeoid) ||
      !/^\d{5}$/.test(record.countyGeoid) ||
      record.placeGeoid.slice(0, 2) !== record.stateFips ||
      record.countyGeoid.slice(0, 2) !== record.stateFips
    ) {
      findings.push({
        severity: "error",
        code: "place-county-relations/identity",
        message: `Record ${record.recordId} does not hold same-state 7-digit place and 5-digit county GEOIDs.`,
      });
    }
    const list = places.get(record.placeGeoid);
    if (list) list.push(record);
    else places.set(record.placeGeoid, [record]);
  }

  const countyPopulation = new Map(
    [...places].map(([place, parts]) => [
      place,
      parts.reduce((sum, part) => sum + part.partPopulationCount, 0),
    ]),
  );
  for (const [key, parts] of groups) {
    if (
      countyPopulation.get(parts[0]!.placeGeoid) !==
      parts[0]!.placePopulationCount
    )
      findings.push({
        severity: "error",
        code: "place-county-relations/district-place-total",
        message: `District P1 total differs from existing county parts for ${key}`,
      });
  }

  for (const [placeGeoid, parts] of places) {
    const land = parts.reduce(
      (sum, part) => sum + part.partLandAreaSquareMeters,
      0,
    );
    if (
      parts.some(
        (part) =>
          part.placeLandAreaSquareMeters !== land ||
          part.placeCountyPartCount !== parts.length,
      )
    ) {
      findings.push({
        severity: "error",
        code: "place-county-relations/partition",
        message: `Place ${placeGeoid}'s parts do not add up to its recorded land area and part count.`,
      });
    }
  }

  if (production) {
    if (
      EXPECTED_PART_RECORD_COUNT > 0 &&
      records.length !== EXPECTED_PART_RECORD_COUNT
    ) {
      findings.push({
        severity: "error",
        code: "place-county-relations/universe-count",
        message: `The 2020 redistricting files hold ${EXPECTED_PART_RECORD_COUNT} place-within-county parts; this corpus holds ${records.length}.`,
      });
    }
    if (EXPECTED_PLACE_COUNT > 0 && places.size !== EXPECTED_PLACE_COUNT) {
      findings.push({
        severity: "error",
        code: "place-county-relations/place-count",
        message: `The 2020 redistricting files name ${EXPECTED_PLACE_COUNT} places; this corpus names ${places.size}.`,
      });
    }
    for (const [placeGeoid, counties] of Object.entries(
      OFFICIAL_PLACE_COUNTY_VECTORS,
    )) {
      const actual = (places.get(placeGeoid) ?? [])
        .map((part) => part.countyGeoid)
        .sort();
      if (actual.join(",") !== counties.join(",")) {
        findings.push({
          severity: "error",
          code: "place-county-relations/official-vector",
          message: `Place ${placeGeoid} should lie in ${counties.join(", ")}; the corpus has ${actual.join(", ") || "nothing"}.`,
        });
      }
    }
    if (!compiled.corpus.coverage.isCompleteUniverse) {
      findings.push({
        severity: "error",
        code: "place-county-relations/coverage",
        message: "The production corpus must claim the complete universe.",
      });
    }
  }

  return {
    domain: "place-county-relations",
    checked: records.length,
    findings,
  };
}
