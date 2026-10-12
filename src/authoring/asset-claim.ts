/**
 * ATOMIC CLAIMS ON A GENERATION REQUEST.
 *
 * Two workers generating the same semantic request is how the project pays for
 * a picture it already owns. A claim is a recoverable lock on
 * (requestId, requestVersion), not a forever-invisible hold and not permission
 * to overwrite someone else's unpublished bytes when the claim expires.
 */

export type AssetClaimState = "active" | "released" | "expired-visible";

export const ASSET_CLAIM_STATES: readonly AssetClaimState[] = [
  "active",
  "released",
  "expired-visible",
];

export const ASSET_CLAIM_DOCUMENT_VERSION = 1 as const;

export interface AssetClaim {
  readonly claimId: string;
  readonly requestId: string;
  readonly requestVersion: number;
  readonly claimant: string;
  readonly claimedAt: string;
  readonly expiresAt: string;
  readonly state: AssetClaimState;
  /** Path of unpublished output, if any. Expiry never authorizes replacing it. */
  readonly unpublishedAssetPath?: string;
}

export interface AssetClaimDocument {
  readonly documentVersion: typeof ASSET_CLAIM_DOCUMENT_VERSION;
  readonly claims: readonly AssetClaim[];
}

export type ClaimFindingCode =
  | "duplicate-active-claim"
  | "unknown-claim-state"
  | "expiry-overwrite-attempt"
  | "stale-request-version"
  | "empty-claimant";

export interface ClaimFinding {
  readonly code: ClaimFindingCode;
  readonly severity: "error" | "warning";
  readonly claimId: string;
  readonly message: string;
}

export interface ClaimAttempt {
  readonly requestId: string;
  readonly requestVersion: number;
  readonly claimant: string;
  readonly now: string;
  readonly ttlMs: number;
  readonly claimId: string;
}

export type ClaimResult =
  | { readonly ok: true; readonly document: AssetClaimDocument }
  | {
      readonly ok: false;
      readonly code: ClaimFindingCode;
      readonly message: string;
      readonly document: AssetClaimDocument;
    };

function parseTime(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

export function recoverExpiredClaims(
  document: AssetClaimDocument,
  now: string,
): AssetClaimDocument {
  const nowMs = parseTime(now);
  return {
    ...document,
    claims: document.claims.map((claim) => {
      if (claim.state !== "active") return claim;
      const expires = parseTime(claim.expiresAt);
      if (!Number.isFinite(expires) || !Number.isFinite(nowMs)) return claim;
      if (nowMs < expires) return claim;
      return { ...claim, state: "expired-visible" as const };
    }),
  };
}

export function activeClaimFor(
  document: AssetClaimDocument,
  requestId: string,
  now: string,
): AssetClaim | undefined {
  const recovered = recoverExpiredClaims(document, now);
  return recovered.claims.find(
    (claim) => claim.requestId === requestId && claim.state === "active",
  );
}

export function claimAssetRequest(
  document: AssetClaimDocument,
  attempt: ClaimAttempt,
): ClaimResult {
  if (!attempt.claimant.trim()) {
    return {
      ok: false,
      code: "empty-claimant",
      message:
        "A claim names a worker. An empty claimant is an invisible lock.",
      document,
    };
  }
  const recovered = recoverExpiredClaims(document, attempt.now);
  const current = recovered.claims.find(
    (claim) =>
      claim.requestId === attempt.requestId && claim.state === "active",
  );
  if (current) {
    if (current.claimant === attempt.claimant) {
      return { ok: true, document: recovered };
    }
    return {
      ok: false,
      code: "duplicate-active-claim",
      message: `Request '${attempt.requestId}' is already claimed by '${current.claimant}' until ${current.expiresAt}.`,
      document: recovered,
    };
  }
  const expiredWithBytes = recovered.claims.find(
    (claim) =>
      claim.requestId === attempt.requestId &&
      claim.state === "expired-visible" &&
      claim.unpublishedAssetPath,
  );
  if (expiredWithBytes) {
    return {
      ok: false,
      code: "expiry-overwrite-attempt",
      message: `Claim expiry recovered the lock on '${attempt.requestId}' but must not overwrite unpublished asset '${expiredWithBytes.unpublishedAssetPath}'.`,
      document: recovered,
    };
  }
  const stale = recovered.claims.find(
    (claim) =>
      claim.requestId === attempt.requestId &&
      claim.requestVersion !== attempt.requestVersion &&
      claim.state === "active",
  );
  if (stale) {
    return {
      ok: false,
      code: "stale-request-version",
      message: `Claim is for version ${attempt.requestVersion}; the active claim is on version ${stale.requestVersion}.`,
      document: recovered,
    };
  }
  const expiresAt = new Date(
    parseTime(attempt.now) + attempt.ttlMs,
  ).toISOString();
  const next: AssetClaim = {
    claimId: attempt.claimId,
    requestId: attempt.requestId,
    requestVersion: attempt.requestVersion,
    claimant: attempt.claimant,
    claimedAt: attempt.now,
    expiresAt,
    state: "active",
  };
  return {
    ok: true,
    document: { ...recovered, claims: [...recovered.claims, next] },
  };
}

export function attachUnpublishedAsset(
  document: AssetClaimDocument,
  claimId: string,
  unpublishedAssetPath: string,
): AssetClaimDocument {
  return {
    ...document,
    claims: document.claims.map((claim) =>
      claim.claimId === claimId ? { ...claim, unpublishedAssetPath } : claim,
    ),
  };
}

export function releaseClaim(
  document: AssetClaimDocument,
  claimId: string,
): AssetClaimDocument {
  return {
    ...document,
    claims: document.claims.map((claim) =>
      claim.claimId === claimId
        ? { ...claim, state: "released" as const }
        : claim,
    ),
  };
}

export function emptyClaimDocument(): AssetClaimDocument {
  return { documentVersion: ASSET_CLAIM_DOCUMENT_VERSION, claims: [] };
}
