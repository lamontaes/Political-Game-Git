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
  FISCAL_AUTHORITY_LINEAGE,
  FISCAL_FIELD_SCHEMA,
  FISCAL_LEGAL_ARTIFACT_KINDS,
  MAX_PLAUSIBLE_MILLS,
  TAX_INSTRUMENTS,
} from "./schema";
import type { FiscalFieldSchema, FiscalValueKind } from "./schema";
import type {
  CitedFiscalAuthority,
  EnablingAuthoritySearchScope,
  FiscalAuthorityLineage,
  FiscalAuthorityRecord,
  FiscalLegalArtifactKind,
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

type FiscalMatrixStatus =
  | "KNOWN"
  | "NOT_YET_OPERATIVE"
  | "NOT_APPLICABLE"
  | "NO_REQUIREMENT_FOUND"
  | "UNKNOWN"
  | "CONFLICTING"
  | "HISTORICAL"
  | "SUPPRESSED";

type CompilableFiscalMatrixStatus = Exclude<
  FiscalMatrixStatus,
  "HISTORICAL" | "SUPPRESSED"
>;

const MATRIX_STATUSES: readonly FiscalMatrixStatus[] = [
  "KNOWN",
  "NOT_YET_OPERATIVE",
  "NOT_APPLICABLE",
  "NO_REQUIREMENT_FOUND",
  "UNKNOWN",
  "CONFLICTING",
  "HISTORICAL",
  "SUPPRESSED",
];

const VALUE_KINDS: readonly FiscalValueKind[] = [
  "BOOLEAN",
  "PERCENT",
  "MILLS",
  "MONEY",
  "ENUM",
  "TEXT",
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

function authorityFrom(
  row: DelimitedRow,
  artifactKind: FiscalLegalArtifactKind,
  artifactId: string,
  lineage: FiscalAuthorityLineage,
  derivation: "DIRECT" | "DERIVED",
): CitedFiscalAuthority {
  return {
    authorityType: fiscalMatrixField(row, "authority_type").trim(),
    artifactKind,
    artifactId,
    lineage,
    legalLocator: fiscalMatrixField(row, "legal_locator").trim(),
    authorityUrl: fiscalMatrixField(row, "authority_url").trim(),
    effectiveDate: fiscalMatrixField(row, "effective_date").trim(),
    derivation,
    derivationChain: null,
    paraphrase: fiscalMatrixField(row, "paraphrase").trim(),
  };
}

const SEARCH_SCOPE_KEYS = [
  "authorityKinds",
  "evidenceArtifactIds",
  "instrument",
  "jurisdictionStateUsps",
  "level",
] as const;

function readSearchScope(
  raw: string,
  expected: {
    readonly stateUsps: string;
    readonly level: FiscalLevel;
    readonly instrument: TaxInstrument;
    readonly artifactKind: FiscalLegalArtifactKind;
    readonly artifactId: string;
  },
):
  | { readonly value: EnablingAuthoritySearchScope }
  | { readonly error: string } {
  if (raw === "") {
    return {
      error:
        "NO_ENABLING_AUTHORITY requires searched_scope JSON; free prose is not proof of an authority search.",
    };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return { error: "searched_scope is not valid JSON." };
  }
  if (
    decoded === null ||
    typeof decoded !== "object" ||
    Array.isArray(decoded)
  ) {
    return { error: "searched_scope must be a JSON object." };
  }
  const object = decoded as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  if (
    keys.length !== SEARCH_SCOPE_KEYS.length ||
    keys.some((key, index) => key !== SEARCH_SCOPE_KEYS[index])
  ) {
    return {
      error: `searched_scope must contain exactly: ${SEARCH_SCOPE_KEYS.join(", ")}.`,
    };
  }

  if (object.jurisdictionStateUsps !== expected.stateUsps) {
    return {
      error: `searched_scope jurisdiction must be ${expected.stateUsps}.`,
    };
  }
  if (object.level !== expected.level) {
    return { error: `searched_scope level must be ${expected.level}.` };
  }
  if (object.instrument !== expected.instrument) {
    return {
      error: `searched_scope instrument must be ${expected.instrument}.`,
    };
  }

  if (
    !Array.isArray(object.authorityKinds) ||
    object.authorityKinds.length === 0 ||
    object.authorityKinds.some(
      (kind) =>
        typeof kind !== "string" ||
        !FISCAL_LEGAL_ARTIFACT_KINDS.includes(kind as FiscalLegalArtifactKind),
    )
  ) {
    return {
      error: `searched_scope authorityKinds must be a nonempty array from the closed legal-artifact vocabulary: ${FISCAL_LEGAL_ARTIFACT_KINDS.join(", ")}.`,
    };
  }
  if (!object.authorityKinds.includes(expected.artifactKind)) {
    return {
      error: `searched_scope authorityKinds does not include the cited ${expected.artifactKind} artifact.`,
    };
  }

  if (
    !Array.isArray(object.evidenceArtifactIds) ||
    object.evidenceArtifactIds.length === 0 ||
    object.evidenceArtifactIds.some(
      (id) =>
        typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(id),
    )
  ) {
    return {
      error:
        "searched_scope evidenceArtifactIds must be a nonempty array of stable artifact identities.",
    };
  }
  if (!object.evidenceArtifactIds.includes(expected.artifactId)) {
    return {
      error: `searched_scope evidenceArtifactIds does not include cited artifact "${expected.artifactId}".`,
    };
  }

  return {
    value: {
      jurisdictionStateUsps: object.jurisdictionStateUsps as string,
      level: object.level as FiscalLevel,
      instrument: object.instrument as TaxInstrument,
      authorityKinds:
        object.authorityKinds as readonly FiscalLegalArtifactKind[],
      evidenceArtifactIds: object.evidenceArtifactIds as readonly string[],
    },
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
  status: CompilableFiscalMatrixStatus,
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
    const statusRaw = fiscalMatrixField(row, "status");
    const rawValue = fiscalMatrixField(row, "value").trim();
    const valueKindRaw = fiscalMatrixField(row, "value_kind");
    const derivationRaw = fiscalMatrixField(row, "direct_derived");
    const reviewRequiredRaw = fiscalMatrixField(row, "review_required");
    const authorityKindRaw = fiscalMatrixField(row, "authority_artifact_kind");
    const authorityArtifactId = fiscalMatrixField(row, "authority_artifact_id");
    const authorityLineageRaw = fiscalMatrixField(row, "authority_lineage");
    const searchedScopeRaw = fiscalMatrixField(row, "searched_scope");

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
    const status = MATRIX_STATUSES.find((candidate) => candidate === statusRaw);
    if (!status) {
      fail(
        `status "${statusRaw}" is outside the closed vocabulary: ${MATRIX_STATUSES.join(", ")}.`,
      );
      continue;
    }
    if (status === "HISTORICAL") {
      fail(
        "HISTORICAL needs a closed interval and this matrix carries one date. A repealed rule with an invented repeal date is worse than no record.",
      );
      continue;
    }
    const compilableStatus = status as CompilableFiscalMatrixStatus;
    const valueKind = VALUE_KINDS.find(
      (candidate) => candidate === valueKindRaw,
    );
    if (!valueKind) {
      fail(
        `value_kind "${valueKindRaw}" is outside the closed vocabulary: ${VALUE_KINDS.join(", ")}.`,
      );
      continue;
    }
    const derivation = ["DIRECT", "DERIVED"].find(
      (candidate) => candidate === derivationRaw,
    ) as "DIRECT" | "DERIVED" | undefined;
    if (!derivation) {
      fail(
        `direct_derived "${derivationRaw}" is invalid; expected exactly DIRECT or DERIVED.`,
      );
      continue;
    }
    if (reviewRequiredRaw !== "true" && reviewRequiredRaw !== "false") {
      fail(
        `review_required "${reviewRequiredRaw}" is invalid; expected exactly true or false.`,
      );
      continue;
    }
    const reviewRequired = reviewRequiredRaw === "true";
    const authorityKind = FISCAL_LEGAL_ARTIFACT_KINDS.find(
      (candidate) => candidate === authorityKindRaw,
    );
    if (!authorityKind) {
      fail(
        `authority_artifact_kind "${authorityKindRaw}" is outside the positive legal-artifact vocabulary: ${FISCAL_LEGAL_ARTIFACT_KINDS.join(", ")}.`,
      );
      continue;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(authorityArtifactId)) {
      fail(
        `authority_artifact_id "${authorityArtifactId}" is not a stable artifact identity.`,
      );
      continue;
    }
    if (authorityLineageRaw !== FISCAL_AUTHORITY_LINEAGE) {
      fail(
        `authority_lineage "${authorityLineageRaw}" is invalid; expected exactly ${FISCAL_AUTHORITY_LINEAGE}.`,
      );
      continue;
    }
    const authority = authorityFrom(
      row,
      authorityKind,
      authorityArtifactId,
      authorityLineageRaw,
      derivation,
    );
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
      if (valueKind !== "ENUM") {
        fail(
          `value kind ${valueKind} does not match TAX_INSTRUMENT authorization kind ENUM.`,
        );
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

      let searchedScope: EnablingAuthoritySearchScope | null = null;
      if (
        compilableStatus === "KNOWN" &&
        authorizationValue === "NO_ENABLING_AUTHORITY"
      ) {
        const read = readSearchScope(searchedScopeRaw, {
          stateUsps,
          level,
          instrument,
          artifactKind: authorityKind,
          artifactId: authorityArtifactId,
        });
        if ("error" in read) {
          fail(read.error);
          continue;
        }
        searchedScope = read.value;
      } else if (searchedScopeRaw !== "") {
        fail(
          "searched_scope is permitted only on a KNOWN NO_ENABLING_AUTHORITY tax-instrument row.",
        );
        continue;
      }

      records.push({
        kind: "TAX_INSTRUMENT",
        recordId: `${stateUsps}:${level}:TAX:${instrument}`,
        stateUsps,
        level,
        instrument,
        authorization: readSourced<TaxAuthorizationStatus>(
          compilableStatus,
          authorizationValue,
          evidence,
          authority,
          corpusAsOf,
        ),
        searchedScope,
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
    if (valueKind !== schema.kind) {
      fail(
        `${field}: value kind ${valueKind} does not match the field's declared ${schema.kind} kind.`,
      );
      continue;
    }
    if (searchedScopeRaw !== "") {
      fail(
        "searched_scope is permitted only on a KNOWN NO_ENABLING_AUTHORITY tax-instrument row.",
      );
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
        compilableStatus,
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
