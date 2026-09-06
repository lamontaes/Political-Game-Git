import {
  TERMINAL_ASSET_REQUEST_STATUSES,
  type AssetRequest,
} from "./asset-request";

/**
 * WHETHER THE PROJECT ALREADY OWNS WHAT IT IS ABOUT TO COMMISSION.
 *
 * `asset-request.ts` records the ask and makes each request say what was
 * searched before it was written. That check is true on the day it is written
 * and decays from then on: art arrives, gets chopped, measured and banked under
 * a name nobody put back into the queue, and the queue keeps asking for it. The
 * front-facing footwear pairs were requested for re-render while the corrected
 * front-facing source sat ingested, chopped and hash-verified in the same
 * repository.
 *
 * This module is the reconciliation that closes that gap, and it is deliberately
 * DECLARED AND VERIFIED rather than inferred. Nothing here guesses that a
 * preserved asset answers a request by matching words in its title; a person
 * writes the link down with the evidence paths that justify it, and this module
 * refuses the declaration when it does not hold together — when an open request
 * has no verdict, when a verdict claims an asset closes a request the queue
 * still has open, or when preserved art is left with no verdict at all.
 *
 * The last of those is the one that matters over time. A newly ingested family
 * that nobody has reconciled is exactly how the previous double-commission
 * happened, so it fails the check rather than passing silently.
 */

export type AssetReadinessVerdict =
  /** Preserved art answers the ask. The request must be withdrawn, not generated. */
  | "closed-by-preserved-asset"
  /** Preserved art changes what the request may claim, but does not answer it. */
  | "premise-restated-still-required"
  /** Nothing preserved bears on this ask. It stands as written. */
  | "unaffected-still-required";

export interface AssetReadinessRequestVerdict {
  readonly requestId: string;
  readonly verdict: AssetReadinessVerdict;
  /** Repository paths that carry the pixels or the measurements being cited. */
  readonly evidencePaths: readonly string[];
  /** Why the evidence does or does not answer the ask, in the ask's own terms. */
  readonly reason: string;
}

/**
 * Preserved art that answers no open request. Recorded so that ingesting a
 * family and then forgetting it is a visible state rather than an absence.
 */
export interface UnlinkedPreservedAsset {
  /** The coverage key: a candidate family id, or a source filename. */
  readonly preservedUnit: string;
  readonly evidencePaths: readonly string[];
  readonly reason: string;
  readonly nextRequiredAction: string;
}

export interface AssetReadinessDeclaration {
  readonly documentVersion: 1;
  readonly reconciledAgainst: {
    readonly preservedEvidenceGeneration: string;
    readonly mergeCommit: string;
    readonly evidenceDocuments: readonly string[];
  };
  readonly requestVerdicts: readonly AssetReadinessRequestVerdict[];
  readonly unlinkedPreservedAssets: readonly UnlinkedPreservedAsset[];
}

export type AssetReadinessFindingCode =
  | "open-request-without-verdict"
  | "verdict-for-unknown-request"
  | "duplicate-verdict"
  | "closed-request-still-open"
  | "verdict-without-evidence"
  | "unaffected-verdict-cites-evidence"
  | "preserved-unit-unreconciled"
  | "missing-evidence-path";

export interface AssetReadinessFinding {
  readonly code: AssetReadinessFindingCode;
  readonly severity: "error";
  readonly subject: string;
  readonly message: string;
}

export interface AssetReadinessReport {
  readonly valid: boolean;
  readonly findings: readonly AssetReadinessFinding[];
  readonly closedByPreservedAsset: readonly string[];
  readonly premiseRestated: readonly string[];
  readonly stillRequired: readonly string[];
  readonly unlinkedPreservedUnits: readonly string[];
}

function isOpen(request: AssetRequest): boolean {
  return !TERMINAL_ASSET_REQUEST_STATUSES.includes(request.status);
}

/**
 * Reconciles the queue against the declaration.
 *
 * `preservedUnits` is every unit of preserved art the reconciliation must
 * account for — candidate families and standalone source candidates alike.
 * `existingPaths` decides whether a cited evidence path is really there; the
 * caller supplies it so this module stays free of the filesystem.
 */
export function reconcileAssetReadiness(
  requests: readonly AssetRequest[],
  declaration: AssetReadinessDeclaration,
  preservedUnits: readonly string[],
  existingPaths: ReadonlySet<string>,
): AssetReadinessReport {
  const findings: AssetReadinessFinding[] = [];
  const error = (
    code: AssetReadinessFindingCode,
    subject: string,
    message: string,
  ) => findings.push({ code, severity: "error", subject, message });

  const byId = new Map(requests.map((request) => [request.requestId, request]));
  const seen = new Set<string>();

  for (const verdict of declaration.requestVerdicts) {
    const request = byId.get(verdict.requestId);
    if (!request) {
      error(
        "verdict-for-unknown-request",
        verdict.requestId,
        `The reconciliation rules on '${verdict.requestId}', which is not in the request queue.`,
      );
      continue;
    }
    if (seen.has(verdict.requestId)) {
      error(
        "duplicate-verdict",
        verdict.requestId,
        `Two verdicts for '${verdict.requestId}'. A request is reconciled once or not at all.`,
      );
    }
    seen.add(verdict.requestId);

    if (
      verdict.verdict === "closed-by-preserved-asset" &&
      request.status !== "withdrawn-already-covered"
    ) {
      error(
        "closed-request-still-open",
        verdict.requestId,
        `Preserved art is declared to answer '${verdict.requestId}', but the queue still carries status '${request.status}'. A request answered by art the project already owns is withdrawn, not generated.`,
      );
    }

    if (verdict.verdict === "unaffected-still-required") {
      if (verdict.evidencePaths.length > 0) {
        error(
          "unaffected-verdict-cites-evidence",
          verdict.requestId,
          `'${verdict.requestId}' is declared unaffected yet cites evidence. Evidence that bears on a request restates it; evidence that does not is not evidence.`,
        );
      }
    } else if (verdict.evidencePaths.length === 0) {
      error(
        "verdict-without-evidence",
        verdict.requestId,
        `'${verdict.requestId}' claims preserved art bears on it but cites no path to that art.`,
      );
    }

    for (const evidencePath of verdict.evidencePaths) {
      if (!existingPaths.has(evidencePath)) {
        error(
          "missing-evidence-path",
          verdict.requestId,
          `Cited evidence '${evidencePath}' is not in the repository.`,
        );
      }
    }
  }

  for (const request of requests) {
    if (!isOpen(request)) continue;
    if (!seen.has(request.requestId)) {
      error(
        "open-request-without-verdict",
        request.requestId,
        `'${request.requestId}' is open and has not been reconciled against the preserved assets. An unreconciled open request is how the project commissions a second copy of art it owns.`,
      );
    }
  }

  const covered = new Set<string>();
  for (const verdict of declaration.requestVerdicts) {
    for (const evidencePath of verdict.evidencePaths) covered.add(evidencePath);
  }
  const unlinked = new Set(
    declaration.unlinkedPreservedAssets.map((entry) => entry.preservedUnit),
  );
  for (const entry of declaration.unlinkedPreservedAssets) {
    for (const evidencePath of entry.evidencePaths) {
      if (!existingPaths.has(evidencePath)) {
        error(
          "missing-evidence-path",
          entry.preservedUnit,
          `Cited evidence '${evidencePath}' is not in the repository.`,
        );
      }
    }
  }

  for (const unit of preservedUnits) {
    const cited = [...covered].some((evidencePath) =>
      evidencePath.includes(unit),
    );
    if (!cited && !unlinked.has(unit)) {
      error(
        "preserved-unit-unreconciled",
        unit,
        `Preserved art '${unit}' answers no request and is not recorded as unlinked. Ingested art nobody reconciled is invisible to the queue that would otherwise ask for it again.`,
      );
    }
  }

  const idsWith = (verdict: AssetReadinessVerdict) =>
    declaration.requestVerdicts
      .filter((entry) => entry.verdict === verdict)
      .map((entry) => entry.requestId)
      .sort();

  return {
    valid: findings.length === 0,
    findings,
    closedByPreservedAsset: idsWith("closed-by-preserved-asset"),
    premiseRestated: idsWith("premise-restated-still-required"),
    stillRequired: idsWith("unaffected-still-required"),
    unlinkedPreservedUnits: [...unlinked].sort(),
  };
}
