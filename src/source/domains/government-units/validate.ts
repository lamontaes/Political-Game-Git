/**
 * Government-units corpus validation.
 *
 * The checks defend the domain's three disciplines: government identity is
 * well-formed and internally consistent; no governance power leaks into a
 * record that only establishes existence; and crosswalks are honest — resolved
 * only where the source establishes them, never manufactured wholesale.
 */

import { isUnresolved } from "../../core/index";
import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import {
  FORBIDDEN_GOVERNANCE_KEYS,
  GOVERNMENT_TYPE_BY_CODE,
  GOVERNMENT_UNIT_GID_PATTERN,
  reconstructGovernmentId,
} from "./identity";
import type { GovernmentUnitCrosswalk, GovernmentUnitRecord } from "./types";

const CROSSWALK_KEYS: readonly (keyof GovernmentUnitCrosswalk)[] = [
  "censusPlace",
  "countyOrEquivalent",
  "schoolDistrictGeography",
  "specialDistrictGeography",
];

export function validateGovernmentUnitsCorpus(
  compiled: CompiledCorpus<GovernmentUnitRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;

  const seen = new Set<string>();
  let resolvedCrosswalks = 0;
  let totalCrosswalks = 0;

  for (const record of records) {
    const id = record.censusGovernmentId;

    if (!GOVERNMENT_UNIT_GID_PATTERN.test(id)) {
      findings.push({
        severity: "error",
        code: "government-units/malformed-id",
        message: `${id} is not a well-formed 14-digit Census government ID.`,
        recordId: id,
      });
    }
    if (seen.has(id)) {
      findings.push({
        severity: "error",
        code: "government-units/duplicate-id",
        message: `Government ID ${id} appears more than once; an identifier that is not unique is not an identifier.`,
        recordId: id,
      });
    }
    seen.add(id);

    const expectedType = GOVERNMENT_TYPE_BY_CODE[record.governmentTypeCode];
    if (record.governmentType !== expectedType) {
      findings.push({
        severity: "error",
        code: "government-units/type-mismatch",
        message: `${id} has type digit ${record.governmentTypeCode} (${expectedType}) but is classified ${record.governmentType}.`,
        recordId: id,
      });
    }
    if (id.slice(2, 3) !== record.governmentTypeCode) {
      findings.push({
        severity: "error",
        code: "government-units/type-code-detached-from-id",
        message: `${id} carries a governmentTypeCode of ${record.governmentTypeCode} that is not the ID's own type digit.`,
        recordId: id,
      });
    }
    // The decomposed components — including the distinct supplement (10-12) and
    // sub (13-14) codes — must reconstruct the exact 14-digit identity key, so
    // neither component can be truncated or merged into the other.
    const reconstructed = reconstructGovernmentId({
      stateCensusCode: record.stateCensusCode,
      governmentTypeCode: record.governmentTypeCode,
      countyCensusCode: record.countyCensusCode,
      unitCensusCode: record.unitCensusCode,
      supplementCensusCode: record.supplementCensusCode,
      subCensusCode: record.subCensusCode,
    });
    if (reconstructed !== id) {
      findings.push({
        severity: "error",
        code: "government-units/id-components-not-lossless",
        message: `${id} does not reconstruct from its components (${reconstructed}); the supplement and sub codes must partition the ID exactly.`,
        recordId: id,
      });
    }

    // No governance power may appear on an identity record, at runtime as well
    // as in the type. This is the same guarantee the schema makes, made visible.
    for (const key of Object.keys(record)) {
      if (FORBIDDEN_GOVERNANCE_KEYS.includes(key)) {
        findings.push({
          severity: "error",
          code: "government-units/inferred-governance-power",
          message: `${id} carries "${key}". This domain establishes government identity, not powers; ${key} must come from separate institutional-rule evidence.`,
          recordId: id,
        });
      }
    }

    if (record.sourceVintage.trim() === "") {
      findings.push({
        severity: "error",
        code: "government-units/no-vintage",
        message: `${id} carries no source vintage; a government fact without a reference year cannot be placed in time.`,
        recordId: id,
      });
    }
    if (record.evidence.artifactId.trim() === "") {
      findings.push({
        severity: "error",
        code: "government-units/no-evidence",
        message: `${id} cites no artifact; a record with no evidence is not sourced.`,
        recordId: id,
      });
    }

    // A resolved place crosswalk must look like a 7-digit place GEOID, and it
    // must never be the government's own identifier: a place is not a government.
    const place = record.crosswalk.censusPlace;
    if (place.state === "KNOWN") {
      if (!/^\d{7}$/.test(place.value)) {
        findings.push({
          severity: "error",
          code: "government-units/implausible-place-geoid",
          message: `${id} resolves its Census place crosswalk to "${place.value}", which is not a 7-digit place GEOID.`,
          recordId: id,
        });
      }
      if (place.value === id) {
        findings.push({
          severity: "error",
          code: "government-units/place-equals-government",
          message: `${id} uses its own government ID as its Census place crosswalk; a government identity is not a place identity.`,
          recordId: id,
        });
      }
    }

    for (const key of CROSSWALK_KEYS) {
      totalCrosswalks += 1;
      if (!isUnresolved(record.crosswalk[key])) resolvedCrosswalks += 1;
    }
  }

  /*
   * A corpus in which every crosswalk resolves is the shape of manufactured
   * matches, not of the Government Units listing, which publishes almost none.
   * The warning fires only on a corpus large enough for the pattern to mean
   * something.
   */
  if (
    records.length >= 20 &&
    totalCrosswalks > 0 &&
    resolvedCrosswalks === totalCrosswalks
  ) {
    findings.push({
      severity: "warning",
      code: "government-units/all-crosswalks-resolved",
      message:
        "Every crosswalk in the corpus resolved. The Government Units listing establishes very few geographic links directly, so universal resolution suggests matches were manufactured rather than sourced.",
    });
  }

  return {
    domain: "government-units",
    checked: records.length,
    findings,
  };
}
