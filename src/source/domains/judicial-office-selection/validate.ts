/**
 * Judicial-office corpus validation.
 *
 * The checks defend the three commitments the model exists to keep: that a
 * citation is checkable, that tenure and its renewal agree, and — the one this
 * domain adds over its siblings — that honesty about retrieval is enforced in
 * the data. A fixture that names a real constitution but has not retrieved it
 * must say so, and an unresolved field must be a stated absence, not a silent
 * gap.
 */

import type {
  CompiledCorpus,
  Sourced,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { JudicialOfficeRecord } from "./types";

/** Record field → the token naming it in `unresolvedFields`. */
const UNRESOLVED_TOKEN: Readonly<
  Record<
    | "termLengthYears"
    | "mandatoryRetirementAge"
    | "professionalQualification"
    | "minimumAge"
    | "residencyRequirement"
    | "barMembershipRequirement",
    string
  >
> = {
  termLengthYears: "term_length",
  mandatoryRetirementAge: "mandatory_retirement",
  professionalQualification: "professional_qualification",
  minimumAge: "minimum_age",
  residencyRequirement: "residency",
  barMembershipRequirement: "bar_requirement",
};

type ScalarFieldName = keyof typeof UNRESOLVED_TOKEN;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateJudicialCorpus(
  compiled: CompiledCorpus<JudicialOfficeRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const isFixture = compiled.corpus.inputClass === "fixture";
  const records = compiled.records;

  let anyUnresolved = false;

  for (const record of records) {
    const authority = record.citedAuthority;

    if (!/^us-[a-z-]+$/.test(record.jurisdictionId)) {
      findings.push({
        severity: "error",
        code: "judicial/bad-jurisdiction-id",
        message: `${record.recordId} carries jurisdiction id "${record.jurisdictionId}", which is not "us-federal" or "us-<state>".`,
        recordId: record.recordId,
      });
    }
    if (authority.legalLocator.trim() === "") {
      findings.push({
        severity: "error",
        code: "judicial/no-legal-locator",
        message: `${record.recordId} names an authority but no article, section or statute within it. A citation without a locator is not checkable.`,
        recordId: record.recordId,
      });
    }
    if (
      authority.exactSource.trim() === "" ||
      authority.authorityType.trim() === ""
    ) {
      findings.push({
        severity: "error",
        code: "judicial/no-authority",
        message: `${record.recordId} does not name both an authority type and an exact source.`,
        recordId: record.recordId,
      });
    }
    if (
      authority.authorityUrl === "" ||
      !/^https?:\/\//.test(authority.authorityUrl)
    ) {
      findings.push({
        severity: "error",
        code: "judicial/no-authority-url",
        message: `${record.recordId} cites no authority URL.`,
        recordId: record.recordId,
      });
    }
    if (!ISO_DATE.test(authority.referenceDate)) {
      findings.push({
        severity: "error",
        code: "judicial/no-reference-date",
        message: `${record.recordId} carries reference date "${authority.referenceDate}", which is not an ISO date.`,
        recordId: record.recordId,
      });
    }

    // Honesty: a fixture has not retrieved and has not verified the authority it
    // cites, and must say so. This is the 92G source-honesty gate expressed as a
    // check rather than a hope.
    if (isFixture && authority.retrieval !== "NOT_RETRIEVED") {
      findings.push({
        severity: "error",
        code: "judicial/fixture-claims-retrieval",
        message: `${record.recordId} is a fixture row but claims retrieval "${authority.retrieval}". A fixture retrieves nothing; the research it stands on is a secondary synthesis.`,
        recordId: record.recordId,
      });
    }
    if (isFixture && authority.verification !== "UNVERIFIED") {
      findings.push({
        severity: "error",
        code: "judicial/fixture-claims-verification",
        message: `${record.recordId} is a fixture row but claims verification "${authority.verification}". A fixture verifies nothing against first-party bytes.`,
        recordId: record.recordId,
      });
    }

    // Selection must exist and each stage must be ordered.
    if (record.initialSelection.length === 0) {
      findings.push({
        severity: "error",
        code: "judicial/no-initial-selection",
        message: `${record.recordId} states no way it is first filled.`,
        recordId: record.recordId,
      });
    }
    for (const [pipeline, name] of [
      [record.initialSelection, "initial-selection"],
      [record.interimVacancyFilling, "interim-vacancy"],
    ] as const) {
      pipeline.forEach((stage, index) => {
        if (stage.order !== index + 1) {
          findings.push({
            severity: "error",
            code: "judicial/misordered-pipeline",
            message: `${record.recordId} has a ${name} stage out of order (position ${index + 1} declares order ${stage.order}).`,
            recordId: record.recordId,
          });
        }
      });
    }

    // Tenure and its renewal must agree.
    if (record.tenureKind === "GOOD_BEHAVIOR") {
      if (record.retentionMethod !== "NONE") {
        findings.push({
          severity: "error",
          code: "judicial/good-behavior-with-retention",
          message: `${record.recordId} holds office during good behavior yet declares a retention method "${record.retentionMethod}". A hold that does not lapse is not renewed.`,
          recordId: record.recordId,
        });
      }
      if (record.termLengthYears.state === "KNOWN") {
        findings.push({
          severity: "error",
          code: "judicial/good-behavior-with-term",
          message: `${record.recordId} holds office during good behavior yet states a fixed term length. Good-behavior tenure has no term; the field should be NOT_APPLICABLE.`,
          recordId: record.recordId,
        });
      }
    } else if (record.retentionMethod === "NONE") {
      findings.push({
        severity: "error",
        code: "judicial/fixed-term-without-renewal",
        message: `${record.recordId} holds a fixed term yet states no way the term is renewed.`,
        recordId: record.recordId,
      });
    }

    // Every unresolved scalar must be a stated absence, never a silent gap.
    for (const field of Object.keys(UNRESOLVED_TOKEN) as ScalarFieldName[]) {
      const value = record[field] as Sourced<string | number>;
      if (value.state !== "KNOWN") anyUnresolved = true;
      if (value.state === "UNKNOWN") {
        const token = UNRESOLVED_TOKEN[field];
        if (!authority.unresolvedFields.includes(token)) {
          findings.push({
            severity: "error",
            code: "judicial/silent-unresolved-gap",
            message: `${record.recordId} leaves ${field} UNKNOWN but does not name "${token}" among the authority's unresolved fields. An absence must be stated.`,
            recordId: record.recordId,
          });
        }
      }
    }
  }

  if (records.length >= 3 && !anyUnresolved) {
    findings.push({
      severity: "warning",
      code: "judicial/no-uncertainty",
      message:
        "Every scalar in the corpus resolved to KNOWN. These jurisdictions' qualification detail is not uniformly resolvable, so a corpus with no unresolved value may have promoted something.",
    });
  }

  return {
    domain: "judicial-office-selection",
    checked: records.length,
    findings,
  };
}
