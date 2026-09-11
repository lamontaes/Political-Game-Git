/**
 * Matrix rows into qualification records.
 *
 * The research vocabulary and the substrate's value algebra are close but not
 * identical, and the two places they differ are the two places PR #72 went
 * wrong, so both are handled explicitly.
 *
 * `OFFICE_DOES_NOT_EXIST` is not a field state. It becomes an `OfficeExistence`
 * record carrying KNOWN(false) — a fact about an entity, with its own evidence.
 * `CREATED_NOT_YET_OPERATIVE` becomes NOT_YET_OPERATIVE, which carries a value
 * and an operative-from date and is still not present truth.
 *
 * Nothing is promoted. A row the research left UNKNOWN stays UNKNOWN here, and
 * a row it marked for normalization review is carried with that flag set rather
 * than quietly cleared.
 */

import {
  SourceValidationError,
  conflicting,
  known,
  noRequirementFound,
  notApplicable,
  notYetOperative,
  unknown,
} from "../../core/index";
import type { Claim, Evidence, ParseDefect, Sourced } from "../../core/index";
import { matrixField } from "./parse";
import type { QualificationMatrixSchema } from "./parse";
import type { DelimitedRow } from "../../core/index";
import type {
  CitedAuthority,
  OfficeExistence,
  OfficeFamily,
  QualificationClaim,
  QualificationField,
  QualificationRecord,
} from "./types";
import { unknownTransportValidity } from "./temporal";

/**
 * The office names the two batches use, mapped onto this domain's vocabulary.
 *
 * Declared rather than derived. 31C writes `LOWER_CHAMBER` and 31D writes
 * `lower_legislator` for the same institution, and upper-casing one into the
 * other would silently accept any name a future batch happened to invent.
 */
const OFFICE_FAMILY_BY_MATRIX_NAME: Readonly<Record<string, OfficeFamily>> = {
  GOVERNOR: "GOVERNOR",
  LIEUTENANT_GOVERNOR: "LIEUTENANT_GOVERNOR",
  LT_GOVERNOR: "LIEUTENANT_GOVERNOR",
  ATTORNEY_GENERAL: "ATTORNEY_GENERAL",
  SECRETARY_OF_STATE: "SECRETARY_OF_STATE",
  UPPER_CHAMBER: "UPPER_CHAMBER",
  UPPER_LEGISLATOR: "UPPER_CHAMBER",
  LOWER_CHAMBER: "LOWER_CHAMBER",
  LOWER_LEGISLATOR: "LOWER_CHAMBER",
  UNICAMERAL_CHAMBER: "UNICAMERAL_CHAMBER",
  NEBRASKA_UNICAMERAL: "UNICAMERAL_CHAMBER",
};

/** 31F's field names, mapped onto this domain's vocabulary. */
const FIELD_BY_MATRIX_NAME: Readonly<Record<string, QualificationField>> = {
  "Minimum Age": "MINIMUM_AGE",
  min_age: "MINIMUM_AGE",
  "U.S. Citizenship Duration": "US_CITIZENSHIP",
  us_citizenship: "US_CITIZENSHIP",
  "State Residence Duration": "STATE_RESIDENCE",
  state_residence_years: "STATE_RESIDENCE",
  "District Residence Duration": "DISTRICT_RESIDENCE",
  district_residence: "DISTRICT_RESIDENCE",
  "Elector Requirement": "ELECTOR_REQUIREMENT",
  elector_required: "ELECTOR_REQUIREMENT",
  "Term Length": "TERM_LENGTH",
  term_length_years: "TERM_LENGTH",
  "Term Limit Rule": "TERM_LIMIT",
  term_limit: "TERM_LIMIT",
  "Professional Qualifications": "PROFESSIONAL_QUALIFICATION",
  professional_qualification: "PROFESSIONAL_QUALIFICATION",
  "Selection Mechanism": "SELECTION_MECHANISM",
  selection_type: "SELECTION_MECHANISM",
};

const EXISTENCE_FIELD_NAMES = new Set(["Office Existence", "office_existence"]);

export interface QualificationNormalizeResult {
  readonly records: readonly QualificationRecord[];
  readonly defects: readonly ParseDefect[];
}

/** A value that is a number where the research wrote one, else the text. */
function requirementValue(raw: string): string | number {
  const numeric = /^(\d+(?:\.\d+)?)\s*(?:years?)?$/i.exec(raw.trim());
  if (numeric) return Number(numeric[1]);
  return raw.trim();
}

function authorityFrom(
  row: DelimitedRow,
  schema: QualificationMatrixSchema,
): CitedAuthority {
  const rawDerivation = matrixField(row, "direct_derived", schema);
  const derivation =
    rawDerivation === "DERIVED" || rawDerivation === "HISTORICAL"
      ? rawDerivation
      : "DIRECT";
  return {
    authorityType: matrixField(row, "authority_type", schema),
    legalLocator: matrixField(row, "legal_locator", schema),
    authorityUrl: matrixField(row, "authority_url", schema),
    researchReportedEffectiveDate: matrixField(row, "effective_date", schema),
    provisionValidity: unknownTransportValidity(
      "The staged research transport does not establish provision-specific temporal applicability.",
    ),
    sourceRetrievedAt: null,
    sourceStatedVintage: null,
    derivation,
    derivationChain: matrixField(row, "derivation_chain", schema) || null,
    paraphrase: matrixField(row, "paraphrase", schema),
    notes: matrixField(row, "notes", schema) || null,
  };
}

/**
 * Turn one research status into a sourced value.
 *
 * `corpusAsOf` is needed because NOT_YET_OPERATIVE is defined against it: an
 * office whose operative date has passed is operative, and the constructor
 * refuses to pretend otherwise.
 */
export function readRequirement(
  status: string,
  rawValue: string,
  evidence: Evidence,
  authority: CitedAuthority,
  corpusAsOf: string,
): Sourced<string | number> {
  // The transport date is validated as transport, never used as `Sourced.asOf`.
  const researchDateIsDated = /^\d{4}-\d{2}-\d{2}$/.test(
    authority.researchReportedEffectiveDate,
  );

  if (authority.derivation === "HISTORICAL") {
    return unknown(
      `The source row is historical context, not a current qualification: ${authority.paraphrase}`,
      [evidence],
    );
  }

  switch (status) {
    case "KNOWN":
      return researchDateIsDated
        ? known(requirementValue(rawValue), [evidence], "FINAL", corpusAsOf)
        : unknown(
            `The research states "${rawValue}" but supplies no effective date, so the requirement cannot be placed in time.`,
            [evidence],
          );
    case "NOT_APPLICABLE":
      return notApplicable(
        [evidence],
        authority.paraphrase ||
          `${authority.legalLocator}: the field is meaningless for this office.`,
      );
    case "NO_REQUIREMENT_FOUND":
      return noRequirementFound(
        [evidence],
        authority.legalLocator
          ? `${authority.authorityType} ${authority.legalLocator}, read in full and silent on this requirement.`
          : "The named authority was read and is silent on this requirement.",
      );
    case "CREATED_NOT_YET_OPERATIVE":
    case "NOT_YET_OPERATIVE":
      return researchDateIsDated
        ? notYetOperative(
            requirementValue(rawValue),
            [evidence],
            authority.researchReportedEffectiveDate,
            corpusAsOf,
          )
        : unknown(
            "The research records the requirement as not yet operative but supplies no date on which it becomes so.",
            [evidence],
          );
    case "CONFLICTING": {
      // A conflict needs two authorities. The matrix shape carries one per row,
      // so a CONFLICTING row cannot be built here without inventing the second.
      const claims: Claim<string | number>[] = [];
      return conflicting(claims);
    }
    case "UNKNOWN":
    default:
      return unknown(
        authority.paraphrase ||
          `The research recorded status "${status}" without establishing a value.`,
        [evidence],
      );
  }
}

export function normalizeQualifications(
  rows: readonly DelimitedRow[],
  artifactId: string,
  corpusAsOf: string,
  schema: QualificationMatrixSchema,
): QualificationNormalizeResult {
  const records: QualificationRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const read = (name: Parameters<typeof matrixField>[1]) =>
      matrixField(row, name, schema);
    const stateUsps = read("state").toUpperCase();
    const officeRaw = read("office_family").toUpperCase();
    const fieldName = read("fact_field");
    const status = read("status");
    const value = read("value");
    const reviewRequired = read("review_required") === "true";

    if (!/^[A-Z]{2}$/.test(stateUsps)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${stateUsps}" is not a two-letter state code.`,
      });
      continue;
    }
    const officeFamily = OFFICE_FAMILY_BY_MATRIX_NAME[officeRaw];
    if (!officeFamily) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${officeRaw}" is not an office family this domain models.`,
      });
      continue;
    }

    const authority = authorityFrom(row, schema);
    const evidence: Evidence = {
      artifactId,
      locator: {
        kind: "legal-section",
        artifactId,
        citation: authority.legalLocator,
        pageOrSection: `${stateUsps}/${officeFamily}/${fieldName}`,
      },
    };

    if (EXISTENCE_FIELD_NAMES.has(fieldName)) {
      const datedExistence = /^\d{4}-\d{2}-\d{2}$/.test(
        authority.researchReportedEffectiveDate,
      );
      const exists: Sourced<boolean> = !datedExistence
        ? unknown(
            `The research recorded office existence as "${status}" but supplied no effective date.`,
            [evidence],
          )
        : status === "OFFICE_DOES_NOT_EXIST"
          ? known(false, [evidence], "FINAL", corpusAsOf)
          : status === "CREATED_NOT_YET_OPERATIVE" ||
              status === "NOT_YET_OPERATIVE"
            ? notYetOperative(
                true,
                [evidence],
                authority.researchReportedEffectiveDate,
                corpusAsOf,
              )
            : status === "KNOWN"
              ? known(value !== "false", [evidence], "FINAL", corpusAsOf)
              : unknown(
                  `The research recorded office existence as "${status}".`,
                  [evidence],
                );

      records.push({
        recordId: `${stateUsps}:${officeFamily}:EXISTENCE`,
        stateUsps,
        officeFamily,
        exists,
        dutiesPerformedBy: null,
        citedAuthority: authority,
        evidence,
      } satisfies OfficeExistence);
      continue;
    }

    const field = FIELD_BY_MATRIX_NAME[fieldName];
    if (!field) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${fieldName}" is not a qualification field this domain models.`,
      });
      continue;
    }

    records.push({
      recordId: `${stateUsps}:${officeFamily}:${field}`,
      stateUsps,
      officeFamily,
      field,
      requirement: readRequirement(
        status,
        value,
        evidence,
        authority,
        corpusAsOf,
      ),
      citedAuthority: authority,
      normalizationReviewRequired: reviewRequired,
      evidence,
    } satisfies QualificationClaim);
  }

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.recordId)) {
      throw new SourceValidationError(
        `The qualifications matrix yields "${record.recordId}" twice; one office cannot carry a field twice.`,
      );
    }
    seen.add(record.recordId);
  }

  return { records, defects };
}
