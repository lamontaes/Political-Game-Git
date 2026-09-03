/**
 * The source value algebra.
 *
 * Eight states, and five of them have no `value` key at all. That absence is
 * the whole design: 13B's central finding was not carelessness about facts but
 * an architecture in which an unknown could be read as a zero. Here there is no
 * field to read a zero out of, and no `valueOr` to invent one, so `?? 0` has
 * nothing to attach to.
 *
 * Release status (FINAL/PRELIMINARY/REVISED) is an orthogonal property of a
 * KNOWN value rather than a ninth state — it describes a value's revision
 * lineage, not whether anybody knows it.
 */

import { SourceValueError } from "./errors";

/** Where in which artifact a fact was read. */
export type SourceLocator =
  | {
      readonly kind: "delimited-row";
      readonly artifactId: string;
      readonly line: number;
      readonly column?: string;
    }
  | {
      readonly kind: "fixed-width-row";
      readonly artifactId: string;
      readonly line: number;
      readonly span?: readonly [number, number];
    }
  | {
      readonly kind: "api-record";
      readonly artifactId: string;
      readonly recordPath: string;
    }
  | {
      readonly kind: "table-cell";
      readonly artifactId: string;
      readonly table: string;
      readonly lineCode: string;
      readonly period: string;
    }
  | {
      readonly kind: "legal-section";
      readonly artifactId: string;
      readonly citation: string;
      readonly pageOrSection: string;
    }
  | {
      readonly kind: "legislative-package";
      readonly artifactId: string;
      readonly packageId: string;
      readonly granuleId?: string;
    }
  | {
      readonly kind: "roll-call";
      readonly artifactId: string;
      readonly congress: number;
      readonly session: number;
      readonly rollCallNumber: number;
    };

/** The artifact id a locator points into, whatever its kind. */
export function locatorArtifactId(locator: SourceLocator): string {
  return locator.artifactId;
}

/** One citation: which artifact said it, and where inside that artifact. */
export interface Evidence {
  readonly artifactId: string;
  readonly locator: SourceLocator;
  readonly providerNativeId?: string;
}

/** Revision lineage of a value the provider does state. Not a kind of knowing. */
export type ReleaseStatus = "FINAL" | "PRELIMINARY" | "REVISED";

/** One side of a disagreement between authorities. */
export interface Claim<T> {
  readonly value: T;
  readonly evidence: readonly [Evidence, ...Evidence[]];
  readonly asOf: string;
}

export type SourceStateName =
  | "KNOWN"
  | "HISTORICAL"
  | "NOT_YET_OPERATIVE"
  | "CONFLICTING"
  | "NOT_APPLICABLE"
  | "NO_REQUIREMENT_FOUND"
  | "SUPPRESSED"
  | "UNKNOWN";

/**
 * A fact and how well it is known.
 *
 * KNOWN, HISTORICAL and NOT_YET_OPERATIVE carry a value; the other five do not
 * have the key. Only KNOWN is present truth — see `presentValue`.
 */
export type Sourced<T> =
  | {
      readonly state: "KNOWN";
      readonly value: T;
      readonly evidence: readonly [Evidence, ...Evidence[]];
      readonly release: ReleaseStatus;
      readonly asOf: string;
    }
  | {
      readonly state: "HISTORICAL";
      readonly value: T;
      readonly evidence: readonly [Evidence, ...Evidence[]];
      readonly period: { readonly start: string; readonly end: string };
    }
  | {
      readonly state: "NOT_YET_OPERATIVE";
      readonly value: T | null;
      readonly evidence: readonly [Evidence, ...Evidence[]];
      readonly operativeFrom: string;
    }
  | {
      readonly state: "CONFLICTING";
      readonly claims: readonly [Claim<T>, Claim<T>, ...Claim<T>[]];
    }
  | {
      readonly state: "NOT_APPLICABLE";
      readonly evidence: readonly [Evidence, ...Evidence[]];
      readonly reason: string;
    }
  | {
      readonly state: "NO_REQUIREMENT_FOUND";
      readonly evidence: readonly [Evidence, ...Evidence[]];
      readonly scopeSearched: string;
    }
  | {
      readonly state: "SUPPRESSED";
      readonly evidence: readonly [Evidence, ...Evidence[]];
      readonly providerFlag: string;
    }
  | {
      readonly state: "UNKNOWN";
      readonly reason: string;
      readonly investigated: readonly Evidence[];
    };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[0-9:.]+Z)?$/;

function requireDate(label: string, value: string): void {
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new SourceValueError(`${label} must be an ISO date; got "${value}".`);
  }
}

function requireEvidence(
  state: string,
  evidence: readonly Evidence[],
): readonly [Evidence, ...Evidence[]] {
  if (evidence.length === 0) {
    throw new SourceValueError(
      `${state} requires at least one piece of evidence. Only UNKNOWN may carry none.`,
    );
  }
  for (const item of evidence) {
    if (!item.artifactId) {
      throw new SourceValueError(`${state} evidence must name an artifactId.`);
    }
    if (item.locator.artifactId !== item.artifactId) {
      throw new SourceValueError(
        `${state} evidence points at artifact "${item.artifactId}" but its locator reads "${item.locator.artifactId}".`,
      );
    }
  }
  return evidence as readonly [Evidence, ...Evidence[]];
}

function requireReason(state: string, reason: string): string {
  if (reason.trim() === "") {
    throw new SourceValueError(`${state} requires a non-empty reason.`);
  }
  return reason;
}

/** The authority states this value and it is operative as of the corpus date. */
export function known<T>(
  value: T,
  evidence: readonly Evidence[],
  release: ReleaseStatus,
  asOf: string,
): Sourced<T> {
  requireDate("known() asOf", asOf);
  return {
    state: "KNOWN",
    value,
    evidence: requireEvidence("KNOWN", evidence),
    release,
    asOf,
  };
}

/** True over a closed past interval that ended before the corpus as-of date. */
export function historical<T>(
  value: T,
  evidence: readonly Evidence[],
  start: string,
  end: string,
  corpusAsOf: string,
): Sourced<T> {
  requireDate("historical() start", start);
  requireDate("historical() end", end);
  requireDate("historical() corpusAsOf", corpusAsOf);
  if (Date.parse(start) > Date.parse(end)) {
    throw new SourceValueError(
      `HISTORICAL period starts (${start}) after it ends (${end}).`,
    );
  }
  if (Date.parse(end) >= Date.parse(corpusAsOf)) {
    throw new SourceValueError(
      `HISTORICAL period ends (${end}) on or after the corpus as-of date (${corpusAsOf}); that is present truth, not history.`,
    );
  }
  return {
    state: "HISTORICAL",
    value,
    evidence: requireEvidence("HISTORICAL", evidence),
    period: { start, end },
  };
}

/** Enacted or created, effective only after the corpus as-of date. */
export function notYetOperative<T>(
  value: T | null,
  evidence: readonly Evidence[],
  operativeFrom: string,
  corpusAsOf: string,
): Sourced<T> {
  requireDate("notYetOperative() operativeFrom", operativeFrom);
  requireDate("notYetOperative() corpusAsOf", corpusAsOf);
  if (Date.parse(operativeFrom) <= Date.parse(corpusAsOf)) {
    throw new SourceValueError(
      `NOT_YET_OPERATIVE takes effect (${operativeFrom}) on or before the corpus as-of date (${corpusAsOf}); it is already operative.`,
    );
  }
  return {
    state: "NOT_YET_OPERATIVE",
    value,
    evidence: requireEvidence("NOT_YET_OPERATIVE", evidence),
    operativeFrom,
  };
}

/**
 * Two or more authorities assert incompatible values.
 *
 * At least two claims must cite *distinct* artifacts. Two readings of one row
 * are a parser bug, not a disagreement between authorities.
 */
export function conflicting<T>(
  claims: readonly Claim<T>[],
): Sourced<T> {
  if (claims.length < 2) {
    throw new SourceValueError(
      `CONFLICTING requires at least two claims; got ${claims.length}.`,
    );
  }
  const artifacts = new Set<string>();
  for (const claim of claims) {
    requireEvidence("CONFLICTING claim", claim.evidence);
    requireDate("CONFLICTING claim asOf", claim.asOf);
    for (const item of claim.evidence) artifacts.add(item.artifactId);
  }
  if (artifacts.size < 2) {
    throw new SourceValueError(
      "CONFLICTING requires claims from at least two distinct artifacts; a single artifact read two ways is a parser defect.",
    );
  }
  return {
    state: "CONFLICTING",
    claims: claims as readonly [Claim<T>, Claim<T>, ...Claim<T>[]],
  };
}

/** The field is meaningless for this record, and here is why. */
export function notApplicable<T>(
  evidence: readonly Evidence[],
  reason: string,
): Sourced<T> {
  return {
    state: "NOT_APPLICABLE",
    evidence: requireEvidence("NOT_APPLICABLE", evidence),
    reason: requireReason("NOT_APPLICABLE", reason),
  };
}

/** The authority was read and is silent. Distinct from UNKNOWN: the search happened. */
export function noRequirementFound<T>(
  evidence: readonly Evidence[],
  scopeSearched: string,
): Sourced<T> {
  return {
    state: "NO_REQUIREMENT_FOUND",
    evidence: requireEvidence("NO_REQUIREMENT_FOUND", evidence),
    scopeSearched: requireReason("NO_REQUIREMENT_FOUND scopeSearched", scopeSearched),
  };
}

/** The provider holds the value and deliberately withheld it. */
export function suppressed<T>(
  evidence: readonly Evidence[],
  providerFlag: string,
): Sourced<T> {
  return {
    state: "SUPPRESSED",
    evidence: requireEvidence("SUPPRESSED", evidence),
    providerFlag: requireReason("SUPPRESSED providerFlag", providerFlag),
  };
}

/** Nobody has established it here. The only state that may carry no evidence. */
export function unknown<T>(
  reason: string,
  investigated: readonly Evidence[] = [],
): Sourced<T> {
  return {
    state: "UNKNOWN",
    reason: requireReason("UNKNOWN", reason),
    investigated,
  };
}

/**
 * The value if it is present truth, else null.
 *
 * Seven of the eight states answer null. HISTORICAL and NOT_YET_OPERATIVE carry
 * a value and are still not the present answer — 13B found an `isUnresolved`
 * that treated them as usable.
 *
 * There is deliberately no fallback parameter. A caller who needs a display
 * default writes it at the presentation boundary, where a reader can see it,
 * rather than inside the source layer where it would become data.
 */
export function presentValue<T>(value: Sourced<T>): T | null {
  return value.state === "KNOWN" ? value.value : null;
}

/** KNOWN only. */
export function isPresentlyUsable<T>(value: Sourced<T>): boolean {
  return value.state === "KNOWN";
}

/** Everything but KNOWN. */
export function isUnresolved<T>(value: Sourced<T>): boolean {
  return value.state !== "KNOWN";
}

/** Every artifact this value cites, across whichever key its state uses. */
export function citedArtifactIds<T>(value: Sourced<T>): readonly string[] {
  const ids = new Set<string>();
  switch (value.state) {
    case "CONFLICTING":
      for (const claim of value.claims) {
        for (const item of claim.evidence) ids.add(item.artifactId);
      }
      break;
    case "UNKNOWN":
      for (const item of value.investigated) ids.add(item.artifactId);
      break;
    default:
      for (const item of value.evidence) ids.add(item.artifactId);
      break;
  }
  return [...ids].sort();
}
