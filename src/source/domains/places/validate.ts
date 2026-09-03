/**
 * Place corpus validation.
 *
 * The universe count and the identity vectors come from the Census file itself
 * and from published place identifiers, not from this compiler's own output.
 */

import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import { OFFICIAL_PLACE_VECTORS, isPlaceGeoid, placeGeoidFq } from "./identity";
import type { PlaceRecord } from "./types";

/** The 2025 Gazetteer national places file publishes 32,350 records. */
export const EXPECTED_PLACE_RECORD_COUNT = 32350;

const PROHIBITED_FIELD_TERMS = [
  "power",
  "authority",
  "eligib",
  "canRun",
  "selectionMethod",
  "governingBody",
  "legalBasis",
  "homeRule",
  "population",
  "party",
  "election",
];

export function validatePlaceCorpus(
  compiled: CompiledCorpus<PlaceRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  if (production) {
    if (records.length !== EXPECTED_PLACE_RECORD_COUNT) {
      findings.push({
        severity: "error",
        code: "places/universe-count",
        message: `The 2025 Gazetteer places file publishes ${EXPECTED_PLACE_RECORD_COUNT} records; this corpus holds ${records.length}.`,
      });
    }
    if (!compiled.corpus.coverage.isCompleteUniverse) {
      findings.push({
        severity: "error",
        code: "places/coverage",
        message:
          "The places corpus compiles the complete national file and must say so.",
      });
    }
  }

  const byGeoid = new Map<string, PlaceRecord>();
  for (const record of records) {
    if (byGeoid.has(record.geoid)) {
      findings.push({
        severity: "error",
        code: "places/duplicate-geoid",
        message: `GEOID ${record.geoid} appears more than once.`,
        recordId: record.geoid,
      });
    }
    byGeoid.set(record.geoid, record);

    if (!isPlaceGeoid(record.geoid)) {
      findings.push({
        severity: "error",
        code: "places/geoid-grammar",
        message: `GEOID "${record.geoid}" does not match the published grammar.`,
        recordId: record.geoid,
      });
    }
    if (record.geoidFq !== placeGeoidFq(record.geoid)) {
      findings.push({
        severity: "error",
        code: "places/geoidfq-grammar",
        message: `GEOIDFQ "${record.geoidFq}" is not ${placeGeoidFq(record.geoid)}.`,
        recordId: record.geoid,
      });
    }
    if (record.stateFips + record.placeFips !== record.geoid) {
      findings.push({
        severity: "error",
        code: "places/fips-split",
        message: `State and place FIPS do not reassemble into GEOID ${record.geoid}.`,
        recordId: record.geoid,
      });
    }
    if (!record.sourceName.startsWith(record.displayName)) {
      findings.push({
        severity: "error",
        code: "places/display-name-derivation",
        message: `Display name "${record.displayName}" is not a leading segment of published name "${record.sourceName}"; the derivation only removes a trailing class description.`,
        recordId: record.geoid,
      });
    }
    for (const key of Object.keys(record)) {
      if (
        PROHIBITED_FIELD_TERMS.some((term) =>
          key.toLowerCase().includes(term.toLowerCase()),
        )
      ) {
        findings.push({
          severity: "error",
          code: "places/identity-is-not-authority",
          message: `Field "${key}" asserts something a Gazetteer row does not establish.`,
          recordId: record.geoid,
        });
      }
    }
  }

  if (production) {
    for (const vector of OFFICIAL_PLACE_VECTORS) {
      const record = byGeoid.get(vector.geoid);
      if (!record) {
        findings.push({
          severity: "error",
          code: "places/oracle-missing",
          message: `Official vector ${vector.geoid} (${vector.sourceName}) is absent. ${vector.note}`,
          recordId: vector.geoid,
        });
        continue;
      }
      if (record.sourceName !== vector.sourceName) {
        findings.push({
          severity: "error",
          code: "places/oracle-name",
          message: `Official vector ${vector.geoid} is published as "${vector.sourceName}"; this corpus says "${record.sourceName}".`,
          recordId: vector.geoid,
        });
      }
      if (record.legalStatisticalAreaDescriptionCode !== vector.lsad) {
        findings.push({
          severity: "error",
          code: "places/oracle-lsad",
          message: `Official vector ${vector.geoid} carries LSAD ${vector.lsad}; this corpus says ${record.legalStatisticalAreaDescriptionCode}.`,
          recordId: vector.geoid,
        });
      }
      if (record.stateUsps !== vector.stateUsps) {
        findings.push({
          severity: "error",
          code: "places/oracle-state",
          message: `Official vector ${vector.geoid} is in ${vector.stateUsps}; this corpus says ${record.stateUsps}.`,
          recordId: vector.geoid,
        });
      }
    }
  }

  return { domain: "places", checked: records.length, findings };
}
