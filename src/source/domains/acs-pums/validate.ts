/**
 * PUMS corpus validation.
 *
 * The checks that matter here are semantic rather than structural. A microdata
 * corpus can be perfectly well formed and still be lying about what its numbers
 * mean — that a blank is a zero, that a loss is a gap, that a person weight and
 * a housing weight are interchangeable, or that a sample of Wyoming says
 * anything about the nation.
 */

import { isUnresolved, presentValue } from "../../core/index";
import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import { HOUSING_PROJECTION, PERSON_PROJECTION } from "./projection";
import type { PumsHousingRecord } from "./types";

const PROHIBITED_FIELD_TERMS = [
  "probability",
  "rate",
  "propensity",
  "likelihood",
  "biograph",
  "formation",
  "archetype",
  "persona",
  "trait",
  "behaviour",
  "behavior",
];

export function validatePumsCorpus(
  compiled: CompiledCorpus<PumsHousingRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  if (production && compiled.corpus.coverage.isCompleteUniverse) {
    findings.push({
      severity: "error",
      code: "pums/coverage-overclaim",
      message:
        "This corpus holds a slice of one state's 1-year sample. It is not a complete universe of anything, and a microdata corpus that claims to be one invites every consumer to treat it as the population.",
    });
  }

  let personCount = 0;
  const serials = new Set<string>();

  for (const record of records) {
    if (serials.has(record.serialNumber)) {
      findings.push({
        severity: "error",
        code: "pums/duplicate-serial",
        message: `Housing serial ${record.serialNumber} appears more than once.`,
        recordId: record.serialNumber,
      });
    }
    serials.add(record.serialNumber);

    for (const key of Object.keys(record)) {
      if (
        PROHIBITED_FIELD_TERMS.some((term) => key.toLowerCase().includes(term))
      ) {
        findings.push({
          severity: "error",
          code: "pums/sample-is-not-behaviour",
          message: `Field "${key}" derives behaviour from a survey sample. A weighted observation supports a population estimate, not a rule about how people act.`,
          recordId: record.serialNumber,
        });
      }
    }

    for (const name of HOUSING_PROJECTION) {
      if (!(name in record.variables)) {
        findings.push({
          severity: "error",
          code: "pums/missing-projected-variable",
          message: `Housing record ${record.serialNumber} does not carry projected variable ${name}.`,
          recordId: record.serialNumber,
        });
      }
    }

    // A blank cell must never have become a value. If the housing weight or any
    // projected variable resolved to 0 where the raw cell was empty, the
    // algebra has been bypassed somewhere upstream.
    for (const [name, value] of Object.entries(record.variables)) {
      if (value.state === "KNOWN" && value.value === "") {
        findings.push({
          severity: "error",
          code: "pums/empty-string-as-value",
          message: `Housing record ${record.serialNumber} holds variable ${name} as KNOWN with an empty string. A blank PUMS cell is not applicable, not empty.`,
          recordId: record.serialNumber,
        });
      }
    }

    for (const person of record.persons) {
      personCount += 1;
      if (person.serialNumber !== record.serialNumber) {
        findings.push({
          severity: "error",
          code: "pums/person-household-mismatch",
          message: `Person ${person.personNumber} is filed under housing unit ${record.serialNumber} but carries serial ${person.serialNumber}.`,
          recordId: record.serialNumber,
        });
      }
      for (const name of PERSON_PROJECTION) {
        if (!(name in person.variables)) {
          findings.push({
            severity: "error",
            code: "pums/missing-projected-variable",
            message: `Person ${person.serialNumber}/${person.personNumber} does not carry projected variable ${name}.`,
            recordId: record.serialNumber,
          });
        }
      }
      // PWGTP and WGTP count different universes. A person weight equal to the
      // housing weight is fine by coincidence; a person weight *read from* the
      // housing column is not, and would show up as every person in a unit
      // sharing the unit's weight.
      if (
        isUnresolved(person.personWeight) &&
        person.personWeight.state === "UNKNOWN"
      ) {
        findings.push({
          severity: "warning",
          code: "pums/person-weight-unresolved",
          message: `Person ${person.serialNumber}/${person.personNumber} has no resolved PWGTP, so it cannot contribute to any weighted estimate.`,
          recordId: record.serialNumber,
        });
      }
    }

    const declaredPersons = presentValue(
      record.variables.NP ?? {
        state: "UNKNOWN",
        reason: "absent",
        investigated: [],
      },
    );
    const typeHuGq = presentValue(
      record.variables.TYPEHUGQ ?? {
        state: "UNKNOWN",
        reason: "absent",
        investigated: [],
      },
    );
    if (
      typeof declaredPersons === "number" &&
      declaredPersons > 0 &&
      record.persons.length !== declaredPersons &&
      typeHuGq !== null
    ) {
      findings.push({
        severity: "warning",
        code: "pums/household-size-mismatch",
        message: `Housing unit ${record.serialNumber} declares NP=${declaredPersons} but the slice carries ${record.persons.length} person records.`,
        recordId: record.serialNumber,
      });
    }
  }

  if (production && personCount === 0) {
    findings.push({
      severity: "error",
      code: "pums/no-persons",
      message:
        "The corpus carries no person records, so its person weights describe nothing.",
    });
  }

  return { domain: "acs-pums", checked: records.length, findings };
}
