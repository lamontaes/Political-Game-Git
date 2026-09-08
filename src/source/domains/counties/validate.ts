/**
 * County corpus validation, against oracles independent of this compiler.
 *
 * The universe count and the identity vectors come from the Census Bureau's own
 * published file and code lists. A test that only checks the compiler agrees
 * with itself would pass on a corpus of fabricated counties (13B N2).
 */

import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import {
  OFFICIAL_COUNTY_VECTORS,
  countyGeoidFq,
  isCountyGeoid,
} from "./identity";
import type { CountyRecord } from "./types";

/**
 * The 2025 Gazetteer counties national file covers the 50 states, the District
 * of Columbia and Puerto Rico. American Samoa, Guam, the Northern Mariana
 * Islands and the U.S. Virgin Islands are organized under island-area products
 * and are genuinely absent from this file — an accurate reflection of the
 * product, not a gap in the transcription (30A finding 64-F01).
 */
export const EXPECTED_COUNTY_RECORD_COUNT = 3222;

const PROHIBITED_FIELD_TERMS = [
  "power",
  "authority",
  "eligib",
  "canRun",
  "selectionMethod",
  "governingBody",
  "legalBasis",
  "isActive",
  "population",
  "party",
  "election",
];

export function validateCountyCorpus(
  compiled: CompiledCorpus<CountyRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;

  if (compiled.corpus.inputClass === "production") {
    if (records.length !== EXPECTED_COUNTY_RECORD_COUNT) {
      findings.push({
        severity: "error",
        code: "counties/universe-count",
        message: `The 2025 Gazetteer counties file publishes ${EXPECTED_COUNTY_RECORD_COUNT} county and county-equivalent records; this corpus holds ${records.length}.`,
      });
    }
    if (!compiled.corpus.coverage.isCompleteUniverse) {
      findings.push({
        severity: "error",
        code: "counties/coverage",
        message:
          "The counties corpus compiles the complete national file and must say so.",
      });
    }
  }

  const byGeoid = new Map<string, CountyRecord>();
  for (const record of records) {
    if (byGeoid.has(record.geoid)) {
      findings.push({
        severity: "error",
        code: "counties/duplicate-geoid",
        message: `GEOID ${record.geoid} appears more than once.`,
        recordId: record.geoid,
      });
    }
    byGeoid.set(record.geoid, record);

    if (!isCountyGeoid(record.geoid)) {
      findings.push({
        severity: "error",
        code: "counties/geoid-grammar",
        message: `GEOID "${record.geoid}" does not match the published grammar.`,
        recordId: record.geoid,
      });
    }
    if (record.geoidFq !== countyGeoidFq(record.geoid)) {
      findings.push({
        severity: "error",
        code: "counties/geoidfq-grammar",
        message: `GEOIDFQ "${record.geoidFq}" is not ${countyGeoidFq(record.geoid)}.`,
        recordId: record.geoid,
      });
    }
    if (record.stateFips + record.countyFips !== record.geoid) {
      findings.push({
        severity: "error",
        code: "counties/fips-split",
        message: `State and county FIPS do not reassemble into GEOID ${record.geoid}.`,
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
          code: "counties/identity-is-not-authority",
          message: `Field "${key}" asserts something a Gazetteer row does not establish. Identity is existence, name and location, and nothing else.`,
          recordId: record.geoid,
        });
      }
    }
  }

  if (compiled.corpus.inputClass === "production") {
    for (const vector of OFFICIAL_COUNTY_VECTORS) {
      const record = byGeoid.get(vector.geoid);
      if (!record) {
        findings.push({
          severity: "error",
          code: "counties/oracle-missing",
          message: `Official vector ${vector.geoid} (${vector.sourceName}) is absent. ${vector.note}`,
          recordId: vector.geoid,
        });
        continue;
      }
      if (record.sourceName !== vector.sourceName) {
        findings.push({
          severity: "error",
          code: "counties/oracle-name",
          message: `Official vector ${vector.geoid} is published as "${vector.sourceName}"; this corpus says "${record.sourceName}".`,
          recordId: vector.geoid,
        });
      }
      if (record.stateUsps !== vector.stateUsps) {
        findings.push({
          severity: "error",
          code: "counties/oracle-state",
          message: `Official vector ${vector.geoid} is in ${vector.stateUsps}; this corpus says ${record.stateUsps}.`,
          recordId: vector.geoid,
        });
      }
    }
  }

  return { domain: "counties", checked: records.length, findings };
}
