/**
 * Place–district relationship corpus validation.
 *
 * Universe counts are pinned from the publisher files themselves after the
 * first locked compile. Identity vectors are Census GEOIDs, not compiler output.
 */

import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import {
  LEXINGTON_FAYETTE_PLACE_GEOID,
  OFFICIAL_PLACE_RELATION_VECTORS,
  isPlaceGeoid,
  isStateLegislativeGeoid,
  isUnassignedResidualGeoid,
} from "./identity";
import type { PlaceDistrictRelationRecord } from "./types";

/** Distinct place–chamber membership records in the 2024 national files. */
export const EXPECTED_RELATION_RECORD_COUNT = 63227;

const PROHIBITED_FIELD_TERMS = [
  "party",
  "incumbent",
  "election",
  "vote",
  "power",
  "authority",
  "eligib",
  "population",
  "interiorPoint",
  "latitude",
  "longitude",
];

export function validateSldPlaceRelationCorpus(
  compiled: CompiledCorpus<PlaceDistrictRelationRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  if (production) {
    if (
      EXPECTED_RELATION_RECORD_COUNT > 0 &&
      records.length !== EXPECTED_RELATION_RECORD_COUNT
    ) {
      findings.push({
        severity: "error",
        code: "sld-place-relations/universe-count",
        message: `The 2024 SLDL/SLDU–place relationship files compile ${EXPECTED_RELATION_RECORD_COUNT} place-chamber records; this corpus holds ${records.length}.`,
      });
    }
    if (!compiled.corpus.coverage.isCompleteUniverse) {
      findings.push({
        severity: "error",
        code: "sld-place-relations/coverage",
        message:
          "The relationship corpus compiles the complete national files and must say so.",
      });
    }
  }

  const byId = new Map<string, PlaceDistrictRelationRecord>();
  for (const record of records) {
    if (byId.has(record.recordId)) {
      findings.push({
        severity: "error",
        code: "sld-place-relations/duplicate-id",
        message: `Record ${record.recordId} appears more than once.`,
        recordId: record.recordId,
      });
    }
    byId.set(record.recordId, record);

    if (record.recordId !== `${record.chamber}:${record.placeGeoid}`) {
      findings.push({
        severity: "error",
        code: "sld-place-relations/record-id",
        message: `Record id ${record.recordId} does not reassemble from chamber and place GEOID.`,
        recordId: record.recordId,
      });
    }
    if (!isPlaceGeoid(record.placeGeoid)) {
      findings.push({
        severity: "error",
        code: "sld-place-relations/place-geoid",
        message: `Place GEOID "${record.placeGeoid}" is not a 7-digit Census place identifier.`,
        recordId: record.recordId,
      });
    }
    if (record.membership === "whole-place") {
      if (
        record.districtGeoid === null ||
        !isStateLegislativeGeoid(record.districtGeoid)
      ) {
        findings.push({
          severity: "error",
          code: "sld-place-relations/whole-place-district",
          message: `Whole-place record ${record.recordId} has no valid district GEOID.`,
          recordId: record.recordId,
        });
      } else if (isUnassignedResidualGeoid(record.districtGeoid)) {
        findings.push({
          severity: "error",
          code: "sld-place-relations/residual-membership",
          message: `Residual district ${record.districtGeoid} is not whole-place membership.`,
          recordId: record.recordId,
        });
      }
      if (
        record.intersectionLandAreaSquareMeters !==
          record.placeLandAreaSquareMeters ||
        record.intersectionWaterAreaSquareMeters !==
          record.placeWaterAreaSquareMeters
      ) {
        findings.push({
          severity: "error",
          code: "sld-place-relations/partial-containment",
          message: `Whole-place record ${record.recordId} does not cover the published place area.`,
          recordId: record.recordId,
        });
      }
    } else if (record.districtGeoid !== null) {
      findings.push({
        severity: "error",
        code: "sld-place-relations/split-district",
        message: `Split record ${record.recordId} must not name a single home district.`,
        recordId: record.recordId,
      });
    }

    const serialized = JSON.stringify(record);
    for (const term of PROHIBITED_FIELD_TERMS) {
      if (serialized.includes(term)) {
        findings.push({
          severity: "error",
          code: "sld-place-relations/prohibited-field",
          message: `Record ${record.recordId} carries prohibited field term "${term}".`,
          recordId: record.recordId,
        });
      }
    }
  }

  if (production) {
    for (const vector of OFFICIAL_PLACE_RELATION_VECTORS) {
      const record = byId.get(`${vector.chamber}:${vector.placeGeoid}`);
      if (!record) {
        findings.push({
          severity: "error",
          code: "sld-place-relations/oracle-missing",
          message: `Official vector ${vector.placeGeoid} (${vector.chamber}) is missing.`,
        });
        continue;
      }
      if (record.membership !== vector.membership) {
        findings.push({
          severity: "error",
          code: "sld-place-relations/oracle-membership",
          message: `Official vector ${vector.placeGeoid} expected ${vector.membership}, compiled ${record.membership}.`,
          recordId: record.recordId,
        });
      }
      if (record.districtGeoid !== vector.districtGeoid) {
        findings.push({
          severity: "error",
          code: "sld-place-relations/oracle-district",
          message: `Official vector ${vector.placeGeoid} expected district ${vector.districtGeoid}, compiled ${record.districtGeoid}.`,
          recordId: record.recordId,
        });
      }
    }
    const lexington = byId.get(`state-lower:${LEXINGTON_FAYETTE_PLACE_GEOID}`);
    if (lexington && lexington.membership !== "split") {
      findings.push({
        severity: "error",
        code: "sld-place-relations/lexington-split",
        message:
          "Lexington-Fayette must remain a split place; it is not whole-place house membership.",
      });
    }
  }

  return {
    domain: "sld-place-relations",
    checked: records.length,
    findings,
  };
}
