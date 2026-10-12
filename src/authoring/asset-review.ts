/**
 * EXACT-BYTE REVIEW DECISIONS.
 *
 * Approval binds the hash of the bytes that were seen, the fit/scene contract
 * they were judged against, and who decided when. Changing a pixel is a new
 * candidate. Private acceptance is not public release, production deployment,
 * or permission to alter a saved life.
 */

export const ASSET_REVIEW_DOCUMENT_VERSION = 1 as const;
export const ART_DESK_CONTRACT_ID = "alive43-art-desk-v1" as const;

export type AssetReviewDecision = "approve" | "request-revision" | "reject";

export const ASSET_REVIEW_DECISIONS: readonly AssetReviewDecision[] = [
  "approve",
  "request-revision",
  "reject",
];

export type RightsDeclaration = "known" | "unknown";

export interface AssetReviewRecord {
  readonly reviewId: string;
  readonly requestId: string;
  readonly requestVersion: number;
  /** SHA-256 of the exact candidate bytes reviewed. */
  readonly outputSha256: string;
  readonly contractVersion: typeof ART_DESK_CONTRACT_ID;
  readonly fitContractHash: string;
  readonly sceneContractHash: string;
  readonly decision: AssetReviewDecision;
  readonly authorId: string;
  readonly decidedAt: string;
  readonly rightsStatus: RightsDeclaration;
  readonly sourceDeclaration: string;
  readonly note?: string;
}

export interface AssetReviewDocument {
  readonly documentVersion: typeof ASSET_REVIEW_DOCUMENT_VERSION;
  readonly reviews: readonly AssetReviewRecord[];
}

const SHA256 = /^[a-f0-9]{64}$/;

export type ReviewFindingCode =
  | "bytes-changed-lose-approval"
  | "unknown-decision"
  | "missing-hash"
  | "empty-author"
  | "stale-revision"
  | "duplicate-review-id";

export interface ReviewBinding {
  readonly requestId: string;
  readonly requestVersion: number;
  readonly expectedRequestVersion: number;
  readonly outputSha256: string;
  readonly currentOutputSha256: string;
  readonly contractVersion: string;
  readonly fitContractHash: string;
  readonly sceneContractHash: string;
  readonly decision: AssetReviewDecision;
  readonly authorId: string;
  readonly decidedAt: string;
  readonly rightsStatus: RightsDeclaration;
  readonly sourceDeclaration: string;
  readonly reviewId: string;
  readonly note?: string;
}

export type ReviewWriteResult =
  | { readonly ok: true; readonly document: AssetReviewDocument }
  | {
      readonly ok: false;
      readonly code: ReviewFindingCode;
      readonly message: string;
      readonly document: AssetReviewDocument;
    };

export function emptyReviewDocument(): AssetReviewDocument {
  return { documentVersion: ASSET_REVIEW_DOCUMENT_VERSION, reviews: [] };
}

export function latestReviewForBytes(
  document: AssetReviewDocument,
  requestId: string,
  outputSha256: string,
): AssetReviewRecord | undefined {
  const matches = document.reviews.filter(
    (review) =>
      review.requestId === requestId && review.outputSha256 === outputSha256,
  );
  return matches.at(-1);
}

export function approvalSurvivesBytes(
  review: AssetReviewRecord,
  currentOutputSha256: string,
): boolean {
  return (
    review.decision === "approve" && review.outputSha256 === currentOutputSha256
  );
}

export function recordReview(
  document: AssetReviewDocument,
  binding: ReviewBinding,
): ReviewWriteResult {
  if (document.reviews.some((review) => review.reviewId === binding.reviewId)) {
    return {
      ok: false,
      code: "duplicate-review-id",
      message: `Review '${binding.reviewId}' already exists.`,
      document,
    };
  }
  if (!ASSET_REVIEW_DECISIONS.includes(binding.decision)) {
    return {
      ok: false,
      code: "unknown-decision",
      message: `Decision '${binding.decision}' is not a review decision.`,
      document,
    };
  }
  if (
    !SHA256.test(binding.outputSha256) ||
    !SHA256.test(binding.currentOutputSha256)
  ) {
    return {
      ok: false,
      code: "missing-hash",
      message:
        "A review binds a 64-character lowercase SHA-256 of the candidate bytes.",
      document,
    };
  }
  if (!binding.authorId.trim()) {
    return {
      ok: false,
      code: "empty-author",
      message: "A review names the author. Anonymous approval is not durable.",
      document,
    };
  }
  if (binding.requestVersion !== binding.expectedRequestVersion) {
    return {
      ok: false,
      code: "stale-revision",
      message: `Review expected request version ${binding.expectedRequestVersion}; the live record is ${binding.requestVersion}.`,
      document,
    };
  }
  if (binding.outputSha256 !== binding.currentOutputSha256) {
    return {
      ok: false,
      code: "bytes-changed-lose-approval",
      message:
        "Modified output does not inherit approval. Review the current bytes; the previous hash is a different candidate.",
      document,
    };
  }
  if (binding.contractVersion !== ART_DESK_CONTRACT_ID) {
    return {
      ok: false,
      code: "stale-revision",
      message: `Review contract '${binding.contractVersion}' is not ${ART_DESK_CONTRACT_ID}.`,
      document,
    };
  }
  const record: AssetReviewRecord = {
    reviewId: binding.reviewId,
    requestId: binding.requestId,
    requestVersion: binding.requestVersion,
    outputSha256: binding.outputSha256,
    contractVersion: ART_DESK_CONTRACT_ID,
    fitContractHash: binding.fitContractHash,
    sceneContractHash: binding.sceneContractHash,
    decision: binding.decision,
    authorId: binding.authorId,
    decidedAt: binding.decidedAt,
    rightsStatus: binding.rightsStatus,
    sourceDeclaration: binding.sourceDeclaration,
    ...(binding.note ? { note: binding.note } : {}),
  };
  return {
    ok: true,
    document: { ...document, reviews: [...document.reviews, record] },
  };
}
