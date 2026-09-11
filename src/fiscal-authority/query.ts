/**
 * Browser-safe fiscal-authority reads.
 *
 * This module knows nothing about source acquisition or the simulation World.
 * A source adapter supplies portable records; consumers ask dated questions.
 */

export type FiscalAuthorityAction =
  "exercise-current-authority" | "propose-authority-change";

export interface PortableFiscalSource {
  readonly artifactId: string;
  readonly citation: string;
  readonly url: string;
  readonly evidenceLocator: string;
  readonly enactedDate?: string | null;
  readonly effectiveDate?: string;
  readonly effectiveDateDerivation: string | null;
  readonly effectiveDateEvidenceArtifactIds?: readonly string[];
  readonly lastAmendedDate?: string | null;
  readonly observedDate?: string;
  readonly versionApplicability?:
    "CONTINUOUS_INTERVAL" | "FOUNDATIONAL_AND_OBSERVED_POINTS";
}

interface PortableBase {
  readonly recordId: string;
  readonly stateUsps: string;
  readonly level: string;
  readonly effectiveFrom: string;
  readonly effectiveThrough: string | null;
  readonly sourceAsOf: string;
  readonly source: PortableFiscalSource;
  readonly constraints: readonly string[];
  readonly uncertainty: string | null;
}

export interface PortableTaxAuthority extends PortableBase {
  readonly kind: "TAX_INSTRUMENT";
  readonly instrument: string;
  readonly authorization: string | null;
}

export interface PortableFiscalRule extends PortableBase {
  readonly kind: "FISCAL_RULE";
  readonly field: string;
  readonly value: string | number | boolean | null;
}

export type PortableFiscalAuthorityRecord =
  PortableTaxAuthority | PortableFiscalRule;

interface QueryBase {
  readonly stateUsps: string;
  readonly level: string;
  readonly asOfDate: string;
}

export type FiscalAuthorityQuery = QueryBase &
  (
    | { readonly instrument: string; readonly field?: never }
    | { readonly field: string; readonly instrument?: never }
  );

export type DatedFiscalAuthorityResult =
  | {
      readonly state: "IN_FORCE";
      readonly record: PortableFiscalAuthorityRecord;
    }
  | {
      readonly state: "NOT_YET_EFFECTIVE" | "NO_LONGER_EFFECTIVE";
      readonly record: PortableFiscalAuthorityRecord;
    }
  | {
      readonly state: "UNESTABLISHED";
      readonly reason: string;
      readonly record: PortableFiscalAuthorityRecord | null;
    }
  | {
      readonly state: "CONFLICTING";
      readonly reason: string;
      readonly records: readonly PortableFiscalAuthorityRecord[];
    };

function requireIsoDate(value: string): void {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      `Fiscal authority query date must be YYYY-MM-DD; got "${value}".`,
    );
  }
}

function matches(
  record: PortableFiscalAuthorityRecord,
  query: FiscalAuthorityQuery,
): boolean {
  if (record.stateUsps !== query.stateUsps || record.level !== query.level) {
    return false;
  }
  return "instrument" in query
    ? record.kind === "TAX_INSTRUMENT" && record.instrument === query.instrument
    : record.kind === "FISCAL_RULE" && record.field === query.field;
}

function isOperativeOn(
  record: PortableFiscalAuthorityRecord,
  asOfDate: string,
): boolean {
  if (
    record.source.versionApplicability === "FOUNDATIONAL_AND_OBSERVED_POINTS"
  ) {
    return asOfDate === record.effectiveFrom || asOfDate === record.sourceAsOf;
  }
  return (
    asOfDate >= record.effectiveFrom &&
    (record.effectiveThrough === null || asOfDate <= record.effectiveThrough)
  );
}

export function queryFiscalAuthority(
  records: readonly PortableFiscalAuthorityRecord[],
  query: FiscalAuthorityQuery,
): DatedFiscalAuthorityResult {
  requireIsoDate(query.asOfDate);
  const candidates = records.filter((record) => matches(record, query));
  if (candidates.length === 0) {
    return {
      state: "UNESTABLISHED",
      reason:
        "No first-party production record establishes this jurisdiction, level, and selector.",
      record: null,
    };
  }
  for (const record of candidates) {
    requireIsoDate(record.effectiveFrom);
    if (record.effectiveThrough !== null) {
      requireIsoDate(record.effectiveThrough);
      if (record.effectiveThrough < record.effectiveFrom) {
        throw new Error(
          `Fiscal authority record "${record.recordId}" ends before it begins.`,
        );
      }
    }
  }
  const operative = candidates.filter(
    (record) =>
      record.uncertainty === null && isOperativeOn(record, query.asOfDate),
  );
  if (operative.length > 1) {
    return {
      state: "CONFLICTING",
      reason:
        "More than one production record is operative for the dated question; the query refuses to choose an authority.",
      records: operative,
    };
  }
  if (operative.length === 1)
    return { state: "IN_FORCE", record: operative[0]! };

  const unresolved = candidates.find((record) => record.uncertainty !== null);
  if (unresolved) {
    return {
      state: "UNESTABLISHED",
      reason: unresolved.uncertainty!,
      record: unresolved,
    };
  }
  const next = candidates
    .filter((record) => query.asOfDate < record.effectiveFrom)
    .sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom),
    )[0];
  if (next) {
    return { state: "NOT_YET_EFFECTIVE", record: next };
  }
  const previous = candidates
    .filter(
      (record) =>
        record.effectiveThrough !== null &&
        query.asOfDate > record.effectiveThrough,
    )
    .sort((left, right) =>
      (right.effectiveThrough ?? "").localeCompare(left.effectiveThrough ?? ""),
    )[0];
  if (previous) {
    return { state: "NO_LONGER_EFFECTIVE", record: previous };
  }
  const pointInTime = candidates.find(
    (record) =>
      record.source.versionApplicability === "FOUNDATIONAL_AND_OBSERVED_POINTS",
  );
  if (pointInTime) {
    return {
      state: "UNESTABLISHED",
      reason:
        query.asOfDate > pointInTime.sourceAsOf
          ? `The current wording was observed on ${pointInTime.sourceAsOf}; this corpus does not project legal authority into a later date.`
          : `The foundational rule is verified on ${pointInTime.effectiveFrom} and the current wording on ${pointInTime.sourceAsOf}, but the intervening amendment history is not fully acquired.`,
      record: pointInTime,
    };
  }
  return {
    state: "UNESTABLISHED",
    reason: "No matching record resolves authority for the requested date.",
    record: null,
  };
}

export function currentTaxPermission(
  result: DatedFiscalAuthorityResult,
): "PERMITTED" | "BARRED" | "UNESTABLISHED" {
  if (result.state !== "IN_FORCE" || result.record.kind !== "TAX_INSTRUMENT") {
    return "UNESTABLISHED";
  }
  const value = result.record.authorization;
  if (
    value === "AUTHORIZED" ||
    value === "AUTHORIZED_WITH_VOTER_APPROVAL" ||
    value === "AUTHORIZED_LIMITED_CLASS"
  ) {
    return "PERMITTED";
  }
  if (
    value === "CONSTITUTIONALLY_PROHIBITED" ||
    value === "STATUTORILY_PREEMPTED" ||
    value === "NO_ENABLING_AUTHORITY"
  ) {
    return "BARRED";
  }
  return "UNESTABLISHED";
}
