/**
 * Place–congressional-district relationship corpus validation.
 *
 * The universe count is pinned from the publisher file after the first locked
 * compile. Identity vectors are Census GEOIDs read from that file.
 */

import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import {
  OFFICIAL_CONGRESSIONAL_PLACE_VECTORS,
  isCongressionalGeoid,
  isPlaceGeoid,
  isUnassignedResidualGeoid,
} from "./identity";
import type { CongressionalPlaceRelationRecord } from "./types";

/** Distinct places the 119th CD–2020 place file intersects with a district. */
export const EXPECTED_CD_RELATION_RECORD_COUNT = 32188;

const PROHIBITED_FIELD_TERMS = [
  "party",
  "incumbent",
  "election",
  "vote",
  "population",
  "interiorPoint",
  "latitude",
  "longitude",
];

export function validateCdPlaceRelationCorpus(
  compiled: CompiledCorpus<CongressionalPlaceRelationRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";
  const error = (code: string, message: string, recordId?: string) =>
    findings.push({
      severity: "error",
      code: `cd-place-relations/${code}`,
      message,
      ...(recordId ? { recordId } : {}),
    });

  if (production && records.length !== EXPECTED_CD_RELATION_RECORD_COUNT) {
    error(
      "universe-count",
      `The 119th CD–place relationship file compiles ${EXPECTED_CD_RELATION_RECORD_COUNT} place records; this corpus holds ${records.length}.`,
    );
  }

  const byId = new Map<string, CongressionalPlaceRelationRecord>();
  for (const record of records) {
    if (byId.has(record.recordId)) {
      error(
        "duplicate-id",
        `Record ${record.recordId} appears more than once.`,
        record.recordId,
      );
    }
    byId.set(record.recordId, record);
    if (record.recordId !== `congressional:${record.placeGeoid}`) {
      error(
        "record-id",
        `Record id ${record.recordId} does not reassemble from its place GEOID.`,
        record.recordId,
      );
    }
    if (!isPlaceGeoid(record.placeGeoid)) {
      error(
        "place-geoid",
        `Place GEOID "${record.placeGeoid}" is not a 7-digit Census place identifier.`,
        record.recordId,
      );
    }
    if (
      record.intersectingDistrictGeoids.length === 0 ||
      record.intersectingDistrictGeoids.some(
        (geoid) =>
          !isCongressionalGeoid(geoid) ||
          geoid.slice(0, 2) !== record.placeGeoid.slice(0, 2),
      )
    ) {
      error(
        "intersecting",
        `Record ${record.recordId} lists no or malformed intersecting districts.`,
        record.recordId,
      );
    }
    if (record.membership === "whole-place") {
      if (
        record.districtGeoid === null ||
        isUnassignedResidualGeoid(record.districtGeoid) ||
        record.intersectingDistrictGeoids.length !== 1 ||
        record.intersectingDistrictGeoids[0] !== record.districtGeoid
      ) {
        error(
          "whole-place-district",
          `Whole-place record ${record.recordId} is not exactly one assignable intersecting district.`,
          record.recordId,
        );
      }
      if (
        record.intersectionLandAreaSquareMeters !==
          record.placeLandAreaSquareMeters ||
        record.intersectionWaterAreaSquareMeters !==
          record.placeWaterAreaSquareMeters
      ) {
        error(
          "partial-containment",
          `Whole-place record ${record.recordId} does not cover the published place area.`,
          record.recordId,
        );
      }
    } else if (record.districtGeoid !== null) {
      error(
        "split-district",
        `Split record ${record.recordId} must not name a single home district.`,
        record.recordId,
      );
    }
    const serialized = JSON.stringify(record);
    for (const term of PROHIBITED_FIELD_TERMS) {
      if (serialized.includes(term)) {
        error(
          "prohibited-field",
          `Record ${record.recordId} carries prohibited field term "${term}".`,
          record.recordId,
        );
      }
    }
  }

  if (production) {
    for (const vector of OFFICIAL_CONGRESSIONAL_PLACE_VECTORS) {
      const record = byId.get(`congressional:${vector.placeGeoid}`);
      if (
        !record ||
        record.membership !== vector.membership ||
        record.districtGeoid !== vector.districtGeoid ||
        record.intersectingDistrictGeoids.join(",") !==
          vector.intersectingDistrictGeoids.join(",")
      ) {
        error(
          "oracle",
          `Official vector ${vector.placeGeoid} does not compile as published: ${vector.note}`,
        );
      }
    }
  }

  return { domain: "cd-place-relations", checked: records.length, findings };
}
