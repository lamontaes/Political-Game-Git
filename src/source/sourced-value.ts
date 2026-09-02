/**
 * Shared sourced-value contract for the source substrate.
 *
 * A `SourcedValue<T>` is the single way the source layer expresses "what an
 * official source establishes about a fact". It exists so that absence of
 * evidence can never be flattened into a substantive claim: UNKNOWN,
 * NOT_APPLICABLE, CONFLICTING and HISTORICAL are distinct states, and none of
 * them is representable as `0`, `false`, `""` or `null`.
 *
 * This module deliberately does NOT import simulation types. The source layer
 * describes providers and their records; gameplay truth is downstream and is
 * reached only through an explicit domain adapter. Using plain `string` for
 * dates and identifiers here keeps a source record from being mistaken for a
 * `World` entity by the type system.
 */

/** ISO 8601 calendar date (`YYYY-MM-DD`) as published by a source. */
export type SourceIsoDate = string;

/** Identifier minted by the source layer, not a simulation `EntityId`. */
export type SourceEntityId = string;

/**
 * How a source establishes a fact. This classifies the *authority* of the
 * source, not the confidence of the value.
 */
export type SourceClassification =
  | "CONSTITUTIONAL_PROVISION"
  | "STATUTORY_CODE"
  | "ADMINISTRATIVE_RULE"
  | "JUDICIAL_OPINION"
  | "OFFICIAL_ELECTION_AUTHORITY"
  | "CENSUS_FEDERAL_RECORD"
  | "FEDERAL_STATISTICAL_AGENCY"
  | "EMPIRICAL_ACADEMIC"
  | "HISTORICAL_ARCHIVAL";

/** Citation metadata attached to a substantive claim. */
export interface ProvenanceRecord {
  readonly sourceId: string;
  readonly authoritativeUrl: string;
  readonly publisher: string;
  readonly effectiveDate: SourceIsoDate;
  readonly locator: string;
  readonly sourceClassification: SourceClassification;
  readonly retrievedAt?: SourceIsoDate;
  readonly notes?: string;
}

export type ValueState =
  "KNOWN" | "UNKNOWN" | "NOT_APPLICABLE" | "CONFLICTING" | "HISTORICAL";

/** The source establishes this value, and cites where. */
export interface KnownValue<T> {
  readonly state: "KNOWN";
  readonly value: T;
  readonly provenance: ProvenanceRecord;
}

/**
 * No consulted source establishes the value. This is not zero, not false, and
 * not "none" — it is absence of evidence.
 */
export interface UnknownValue {
  readonly state: "UNKNOWN";
  readonly reason?: string;
}

/** The field does not apply to this subject (e.g. a chamber a unicameral state does not have). */
export interface NotApplicableValue {
  readonly state: "NOT_APPLICABLE";
  readonly reason: string;
}

export interface ConflictingSourceClaim<T> {
  readonly claim: T;
  readonly provenance: ProvenanceRecord;
}

/** Two or more authorities disagree. Resolving the conflict is a research act, not a default. */
export interface ConflictingValue<T> {
  readonly state: "CONFLICTING";
  readonly claims: readonly ConflictingSourceClaim<T>[];
  readonly conflictNotes?: string;
}

/** The value was true over a bounded past interval and is not asserted as current. */
export interface HistoricalValue<T> {
  readonly state: "HISTORICAL";
  readonly value: T;
  readonly effectiveStart: SourceIsoDate;
  readonly effectiveEnd: SourceIsoDate;
  readonly provenance: ProvenanceRecord;
  readonly supersedingReason?: string;
}

export type SourcedValue<T> =
  | KnownValue<T>
  | UnknownValue
  | NotApplicableValue
  | ConflictingValue<T>
  | HistoricalValue<T>;

export function known<T>(
  value: T,
  provenance: ProvenanceRecord,
): KnownValue<T> {
  return { state: "KNOWN", value, provenance };
}

export function unknown(reason?: string): UnknownValue {
  return reason === undefined
    ? { state: "UNKNOWN" }
    : { state: "UNKNOWN", reason };
}

export function notApplicable(reason: string): NotApplicableValue {
  return { state: "NOT_APPLICABLE", reason };
}

export function conflicting<T>(
  claims: readonly ConflictingSourceClaim<T>[],
  conflictNotes?: string,
): ConflictingValue<T> {
  return conflictNotes === undefined
    ? { state: "CONFLICTING", claims }
    : { state: "CONFLICTING", claims, conflictNotes };
}

/**
 * Reads a value only when the source actually establishes it.
 *
 * Every other state returns `undefined` rather than a substitute, so a caller
 * that wants a number must decide for itself what to do about absence. There
 * is deliberately no `valueOr(default)` helper: a default supplied at the read
 * site is exactly how UNKNOWN silently becomes zero.
 */
export function knownValue<T>(sourced: SourcedValue<T>): T | undefined {
  return sourced.state === "KNOWN" ? sourced.value : undefined;
}

export function isKnown<T>(sourced: SourcedValue<T>): sourced is KnownValue<T> {
  return sourced.state === "KNOWN";
}

/** True when the value is absent or contested — i.e. not safe to compute with. */
export function isUnresolved<T>(sourced: SourcedValue<T>): boolean {
  return sourced.state === "UNKNOWN" || sourced.state === "CONFLICTING";
}

const SOURCE_ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a source-published calendar date.
 *
 * Round-tripping through `Date` rejects real-looking impossibilities such as
 * `2023-02-30`, which a pattern test alone would accept.
 */
export function isValidSourceIsoDate(value: unknown): value is SourceIsoDate {
  if (typeof value !== "string" || !SOURCE_ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(value);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}
