/**
 * FEMA corpus validation: the fraud oracles, permanently.
 *
 * These checks exist because a green CI passed #66. Every one of them asks the
 * corpus a question whose right answer is fixed by the live OpenFEMA API rather
 * than by anything in this repository, and each corresponds to a specific
 * assertion the audit disproved.
 */

import type { CompiledCorpus, ValidationFinding, ValidationReport } from "../../core/index";
import {
  CHEROKEE_COUNTY_DESIGNATED_AREA,
  EASTERN_BAND_DESIGNATED_AREA,
  FEMA_FIELD_ORACLES,
  FEMA_FRAUD_ORACLES,
  SUBSTITUTED_TRIBAL_AREA,
} from "./identity";
import type { FemaDeclarationRecord } from "./types";

/**
 * Words that would turn an administrative record into a hazard model.
 *
 * A declaration says a government acted. It does not say how often such an
 * event happens, how bad it was, or what it will cost next time.
 */
const PROHIBITED_FIELD_TERMS = [
  "rate",
  "probability",
  "risk",
  "severity",
  "casualt",
  "occurrence",
  "recurrence",
  "seasonal",
  "frequency",
  "damage",
  "cost",
  "impact",
  "likelihood",
  "expected",
];

export function validateFemaCorpus(
  compiled: CompiledCorpus<FemaDeclarationRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  if (production && compiled.corpus.coverage.isCompleteUniverse) {
    findings.push({
      severity: "error",
      code: "fema/coverage-overclaim",
      message:
        "This corpus holds a bounded slice of the declaration universe and must say so. #66's failure to label its 15 records as a sample is what let a fabricated set read as the record of what FEMA has declared.",
    });
  }

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (PROHIBITED_FIELD_TERMS.some((term) => key.toLowerCase().includes(term))) {
        findings.push({
          severity: "error",
          code: "fema/declaration-is-not-hazard",
          message: `Field "${key}" turns an administrative declaration into a claim about hazard behaviour. A declaration is evidence that a government acted.`,
          recordId: record.recordId,
        });
      }
    }
  }

  if (!production) {
    return { domain: "fema-disasters", checked: records.length, findings };
  }

  const byDisaster = new Map<number, FemaDeclarationRecord[]>();
  for (const record of records) {
    const bucket = byDisaster.get(record.disasterNumber);
    if (bucket) bucket.push(record);
    else byDisaster.set(record.disasterNumber, [record]);
  }

  for (const oracle of FEMA_FRAUD_ORACLES) {
    const bucket = byDisaster.get(oracle.disasterNumber) ?? [];
    if (bucket.length === 0) {
      findings.push({
        severity: "error",
        code: "fema/fraud-oracle-missing",
        message: `Disaster ${oracle.disasterNumber} is absent, so the corpus no longer disproves the claim it exists to disprove. ${oracle.rejectedClaim}`,
      });
      continue;
    }
    for (const record of bucket) {
      if (record.femaDeclarationString !== oracle.expectedDeclarationString) {
        findings.push({
          severity: "error",
          code: "fema/fraud-oracle-identity",
          message: `Disaster ${oracle.disasterNumber} is ${oracle.expectedDeclarationString}; this corpus says ${record.femaDeclarationString}. ${oracle.rejectedClaim}`,
          recordId: record.recordId,
        });
        break;
      }
      if (record.state !== oracle.expectedState) {
        findings.push({
          severity: "error",
          code: "fema/fraud-oracle-state",
          message: `Disaster ${oracle.disasterNumber} is in ${oracle.expectedState}; this corpus says ${record.state}. ${oracle.rejectedClaim}`,
          recordId: record.recordId,
        });
        break;
      }
    }
  }

  for (const oracle of FEMA_FIELD_ORACLES) {
    const bucket = byDisaster.get(oracle.disasterNumber) ?? [];
    if (bucket.length === 0) continue;
    for (const record of bucket) {
      const actual = record[oracle.field];
      if (actual !== oracle.expected) {
        findings.push({
          severity: "error",
          code: "fema/field-oracle",
          message: `Disaster ${oracle.disasterNumber} has ${oracle.field} ${JSON.stringify(oracle.expected)} in OpenFEMA; this corpus says ${JSON.stringify(actual)}. ${oracle.rejectedClaim}`,
          recordId: record.recordId,
        });
        break;
      }
    }
  }

  const helene = records.filter((record) => record.disasterNumber === 4827);
  const easternBand = helene.find(
    (record) => record.designatedArea === EASTERN_BAND_DESIGNATED_AREA,
  );
  if (!easternBand) {
    findings.push({
      severity: "error",
      code: "fema/tribal-designation-missing",
      message: `Declaration DR-4827-NC designates the ${EASTERN_BAND_DESIGNATED_AREA}, and this corpus does not carry that record.`,
    });
  } else if (easternBand.derivedDesignatedAreaType !== "tribal") {
    findings.push({
      severity: "error",
      code: "fema/tribal-designation-mistyped",
      message: `The ${EASTERN_BAND_DESIGNATED_AREA} is a tribal designation; the derivation typed it "${easternBand.derivedDesignatedAreaType}".`,
      recordId: easternBand.recordId,
    });
  }

  const cherokeeCounty = helene.find(
    (record) => record.designatedArea === CHEROKEE_COUNTY_DESIGNATED_AREA,
  );
  if (cherokeeCounty && cherokeeCounty.derivedDesignatedAreaType !== "county-or-parish") {
    findings.push({
      severity: "error",
      code: "fema/county-mistyped-as-tribal",
      message: `North Carolina's Cherokee County is a county. The same declaration designates a tribe with a similar name, and the derivation typed the county "${cherokeeCounty.derivedDesignatedAreaType}".`,
      recordId: cherokeeCounty.recordId,
    });
  }

  if (records.some((record) => record.designatedArea === SUBSTITUTED_TRIBAL_AREA)) {
    findings.push({
      severity: "error",
      code: "fema/substituted-tribe",
      message: `A record designates the "${SUBSTITUTED_TRIBAL_AREA}", which is in Oklahoma. #66 substituted it for the ${EASTERN_BAND_DESIGNATED_AREA} under a North Carolina declaration.`,
    });
  }

  return { domain: "fema-disasters", checked: records.length, findings };
}
