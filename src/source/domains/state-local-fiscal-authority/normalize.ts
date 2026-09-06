/**
 * Matrix rows into fiscal authority records.
 *
 * Nothing is promoted here. A row the research left UNKNOWN stays UNKNOWN, a
 * row it flagged for review is carried with the flag set, and a fact with no
 * effective date cannot be KNOWN because a fiscal rule that cannot be placed in
 * time cannot be applied to a fiscal year.
 *
 * Three statuses the value algebra offers are deliberately *not* reachable from
 * this matrix, and each refusal is a defect naming why rather than a quiet
 * downgrade:
 *
 * `HISTORICAL` needs a closed interval. A row carries one effective date, so
 * building a historical value here would mean inventing the end of it — and a
 * repealed millage cap with a fabricated repeal date is worse than no record.
 *
 * `SUPPRESSED` describes a publisher that holds a value and withholds it, which
 * is a statistical disclosure practice. A constitution does not suppress; if a
 * provision cannot be read, that is UNKNOWN.
 *
 * `CONFLICTING` requires claims from two distinct artifacts, because a single
 * artifact read two ways is a parser defect rather than a conflict in the
 * world. One matrix is one artifact, so a row marked CONFLICTING becomes
 * UNKNOWN with a reason saying exactly that, and the validator reports it. The
 * alternative — synthesising a second claim so the state becomes expressible —
 * would manufacture the disagreement it claims to record.
 */

import {
  SourceValidationError,
  known,
  noRequirementFound,
  notApplicable,
  notYetOperative,
  unknown,
} from "../../core/index";
import type {
  DelimitedRow,
  Evidence,
  ParseDefect,
  Sourced,
} from "../../core/index";
import { fiscalMatrixField } from "./parse";
import {
  FISCAL_FIELD_SCHEMA,
  MAX_PLAUSIBLE_MILLS,
  TAX_INSTRUMENTS,
} from "./schema";
import type { FiscalFieldSchema } from "./schema";
import type {
  CitedFiscalAuthority,
  FiscalAuthorityRecord,
  FiscalLevel,
  FiscalRuleField,
  FiscalRuleRecord,
  FiscalRuleValue,
  TaxAuthorizationStatus,
  TaxInstrument,
  TaxInstrumentAuthorityRecord,
} from "./types";

const LEVELS: readonly FiscalLevel[] = [
  "STATE",
  "COUNTY",
  "MUNICIPALITY",
  "CONSOLIDATED_CITY_COUNTY",
  "SCHOOL_DISTRICT",
  "SPECIAL_DISTRICT",
];

const AUTHORIZATION_STATUSES: readonly TaxAuthorizationStatus[] = [
  "AUTHORIZED",
  "AUTHORIZED_WITH_VOTER_APPROVAL",
  "AUTHORIZED_LIMITED_CLASS",
  "CONSTITUTIONALLY_PROHIBITED",
  "STATUTORILY_PREEMPTED",
  "NO_ENABLING_AUTHORITY",
];

/** The statuses that carry a value, and the ones that must not. */
const VALUE_BEARING_STATUSES = new Set(["KNOWN", "NOT_YET_OPERATIVE"]);
const VALUELESS_STATUSES = new Set([
  "NOT_APPLICABLE",
  "NO_REQUIREMENT_FOUND",
  "UNKNOWN",
  "CONFLICTING",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface FiscalNormalizeResult {
  readonly records: readonly FiscalAuthorityRecord[];
  readonly defects: readonly ParseDefect[];
}

function authorityFrom(row: DelimitedRow): CitedFiscalAuthority {
  const derivation =
    fiscalMatrixField(row, "direct_derived") === "DERIVED"
      ? "DERIVED"
      : "DIRECT";
  return {
    authorityType: fiscalMatrixField(row, "authority_type"),
    legalLocator: fiscalMatrixField(row, "legal_locator"),
    authorityUrl: fiscalMatrixField(row, "authority_url"),
    effectiveDate: fiscalMatrixField(row, "effective_date"),
    derivation,
    derivationChain: null,
    paraphrase: fiscalMatrixField(row, "paraphrase"),
  };
}

/** A value read according to its declared kind, or a sentence saying why not. */
export function readRuleValue(
  raw: string,
  schema: FiscalFieldSchema,
): { readonly value: FiscalRuleValue } | { readonly error: string } {
  const text = raw.trim();
  switch (schema.kind) {
    case "BOOLEAN":
      if (text === "true") return { value: true };
      if (text === "false") return { value: false };
      return {
        error: `"${text}" is not a boolean. This field holds exactly "true" or "false"; a legal rule that is neither is an unresolved status, not a third value.`,
      };
    case "PERCENT": {
      const parsed = Number(text);
      if (!Number.isFinite(parsed))
        return { error: `"${text}" is not a number of percent.` };
      if (parsed < 0 || parsed > 100)
        return {
          error: `${parsed} is outside 0 to 100 percent, so it reads as a figure that arrived in the wrong column.`,
        };
      return { value: parsed };
    }
    case "MILLS": {
      const parsed = Number(text);
      if (!Number.isFinite(parsed))
        return { error: `"${text}" is not a number of mills.` };
      if (parsed < 0 || parsed > MAX_PLAUSIBLE_MILLS)
        return {
          error: `${parsed} is outside 0 to ${MAX_PLAUSIBLE_MILLS} mills. A percentage in a millage column looks exactly like this.`,
        };
      return { value: parsed };
    }
    case "MONEY": {
      const parsed = Number(text.replace(/[$,]/g, ""));
      if (!Number.isFinite(parsed))
        return { error: `"${text}" is not a dollar amount.` };
      if (parsed < 0) return { error: `${parsed} is a negative debt ceiling.` };
      return { value: parsed };
    }
    case "ENUM": {
      const permitted = schema.enumValues ?? [];
      if (permitted.includes(text)) return { value: text };
      return {
        error: `"${text}" is outside this field's closed vocabulary. Permitted: ${permitted.join(", ")}.`,
      };
    }
    case "TEXT":
      if (text === "")
        return {
          error:
            "A text field with an empty value is an absence wearing a value's clothes; use a status that says so.",
        };
      return { value: text };
  }
}

/**
 * Turn one research status into a sourced value.
 *
 * `corpusAsOf` is needed because NOT_YET_OPERATIVE is defined against it: a
 * limitation whose operative date has passed is operative, and the constructor
 * refuses to pretend otherwise.
 */
function readSourced<T extends FiscalRuleValue>(
  status: string,
  value: T | null,
  evidence: Evidence,
  authority: CitedFiscalAuthority,
  corpusAsOf: string,
): Sourced<T> {
  const datable = ISO_DATE.test(authority.effectiveDate);

  switch (status) {
    case "KNOWN":
      if (!datable || value === null) {
        return unknown(
          `The research states a value but supplies no effective date, so the rule cannot be placed in a fiscal year.`,
          [evidence],
        );
      }
      return known(value, [evidence], "FINAL", authority.effectiveDate);
    case "NOT_YET_OPERATIVE":
      if (!datable || value === null) {
        return unknown(
          "The research records the rule as not yet operative but supplies no date on which it becomes so.",
          [evidence],
        );
      }
      return notYetOperative(
        value,
        [evidence],
        authority.effectiveDate,
        corpusAsOf,
      );
    case "NOT_APPLICABLE":
      return notApplicable(
        [evidence],
        authority.paraphrase ||
          `${authority.legalLocator}: the rule is meaningless for this level of government.`,
      );
    case "NO_REQUIREMENT_FOUND":
      return noRequirementFound(
        [evidence],
        authority.legalLocator
          ? `${authority.authorityType} ${authority.legalLocator}, read in full and silent on this rule.`
          : "The named authority was read and is silent on this rule.",
      );
    case "CONFLICTING":
      return unknown(
        "The research records conflicting authorities, but CONFLICTING requires claims from two distinct artifacts and this matrix is one artifact. Carried unresolved rather than synthesised.",
        [evidence],
      );
    case "UNKNOWN":
    default:
      return unknown(
        authority.paraphrase ||
          `The research recorded status "${status}" without establishing a value.`,
        [evidence],
      );
  }
}

export function normalizeFiscalAuthority(
  rows: readonly DelimitedRow[],
  artifactId: string,
  corpusAsOf: string,
): FiscalNormalizeResult {
  const records: FiscalAuthorityRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const stateUsps = fiscalMatrixField(row, "state").toUpperCase();
    const levelRaw = fiscalMatrixField(row, "level").toUpperCase();
    const kindRaw = fiscalMatrixField(row, "record_kind").toUpperCase();
    const subject = fiscalMatrixField(row, "subject").trim();
    const status = fiscalMatrixField(row, "status").trim();
    const rawValue = fiscalMatrixField(row, "value").trim();
    const reviewRequired = fiscalMatrixField(row, "review_required") === "true";

    const fail = (message: string): void => {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: ${message}`,
      });
    };

    if (!/^[A-Z]{2}$/.test(stateUsps)) {
      fail(`"${stateUsps}" is not a two-letter state code.`);
      continue;
    }
    const level = LEVELS.find((candidate) => candidate === levelRaw);
    if (!level) {
      fail(`"${levelRaw}" is not a level of government this domain models.`);
      continue;
    }
    if (status === "HISTORICAL") {
      fail(
        "HISTORICAL needs a closed interval and this matrix carries one date. A repealed rule with an invented repeal date is worse than no record.",
      );
      continue;
    }
    if (status === "SUPPRESSED") {
      fail(
        "SUPPRESSED describes a publisher withholding a value it holds. A legal authority does not suppress; an unreadable provision is UNKNOWN.",
      );
      continue;
    }
    if (VALUELESS_STATUSES.has(status) && rawValue !== "") {
      fail(
        `status "${status}" carries no value, but the row supplies "${rawValue}".`,
      );
      continue;
    }
    if (VALUE_BEARING_STATUSES.has(status) && rawValue === "") {
      fail(`status "${status}" needs a value and the row supplies none.`);
      continue;
    }

    const authority = authorityFrom(row);
    const evidence: Evidence = {
      artifactId,
      locator: {
        kind: "legal-section",
        artifactId,
        citation: authority.legalLocator,
        pageOrSection: `${stateUsps}/${level}/${subject}`,
      },
    };

    if (kindRaw === "TAX_INSTRUMENT") {
      const instrument = TAX_INSTRUMENTS.find(
        (candidate) => candidate === subject,
      );
      if (!instrument) {
        fail(`"${subject}" is not a tax instrument this domain models.`);
        continue;
      }
      let authorizationValue: TaxAuthorizationStatus | null = null;
      if (rawValue !== "") {
        const matched = AUTHORIZATION_STATUSES.find(
          (candidate) => candidate === rawValue,
        );
        if (!matched) {
          fail(
            `"${rawValue}" is not a tax authorization status. Permitted: ${AUTHORIZATION_STATUSES.join(", ")}.`,
          );
          continue;
        }
        authorizationValue = matched;
      }

      records.push({
        kind: "TAX_INSTRUMENT",
        recordId: `${stateUsps}:${level}:TAX:${instrument}`,
        stateUsps,
        level,
        instrument,
        authorization: readSourced<TaxAuthorizationStatus>(
          status,
          authorizationValue,
          evidence,
          authority,
          corpusAsOf,
        ),
        citedAuthority: authority,
        normalizationReviewRequired: reviewRequired,
        evidence,
      } satisfies TaxInstrumentAuthorityRecord);
      continue;
    }

    if (kindRaw !== "FISCAL_RULE") {
      fail(
        `"${kindRaw}" is not a record kind. A row is either TAX_INSTRUMENT or FISCAL_RULE.`,
      );
      continue;
    }

    const field = subject as FiscalRuleField;
    const schema = FISCAL_FIELD_SCHEMA[field] as FiscalFieldSchema | undefined;
    if (!schema) {
      fail(`"${subject}" is not a fiscal rule this domain models.`);
      continue;
    }
    if (schema.scope === "STATE" && level !== "STATE") {
      fail(
        `"${field}" is a state-level rule and this row files it under ${level}.`,
      );
      continue;
    }
    if (schema.scope === "LOCAL" && level === "STATE") {
      fail(
        `"${field}" is a local-level rule and this row files it under STATE.`,
      );
      continue;
    }

    let value: FiscalRuleValue | null = null;
    if (rawValue !== "") {
      const read = readRuleValue(rawValue, schema);
      if ("error" in read) {
        fail(`${field}: ${read.error}`);
        continue;
      }
      value = read.value;
    }

    records.push({
      kind: "FISCAL_RULE",
      recordId: `${stateUsps}:${level}:RULE:${field}`,
      stateUsps,
      level,
      field,
      rule: readSourced<FiscalRuleValue>(
        status,
        value,
        evidence,
        authority,
        corpusAsOf,
      ),
      citedAuthority: authority,
      normalizationReviewRequired: reviewRequired,
      evidence,
    } satisfies FiscalRuleRecord);
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
        `The fiscal authority matrix yields "${record.recordId}" twice. One level of government in one state holds one answer for a rule; two rows are two readings of the same provision, which is a matrix defect rather than a fact.`,
      );
    }
    seen.add(record.recordId);
  }

  return { records, defects };
}

/** Re-exported so a caller can name the instrument set without the schema. */
export type { TaxInstrument };
