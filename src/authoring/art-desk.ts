/**
 * ART DESK QUEUE — existing request, claim, review and readiness truth
 * projected into the private authoring lanes.
 *
 * The desk does not keep a second database of requests. It reads the durable
 * registry, overlays claims/reviews, and refuses to re-commission coverage.
 */

import type { AssetClaim, AssetClaimDocument } from "./asset-claim";
import { activeClaimFor } from "./asset-claim";
import type { AssetReadinessDeclaration } from "./asset-readiness";
import {
  TERMINAL_ASSET_REQUEST_STATUSES,
  type AssetRequest,
} from "./asset-request";
import type { AssetReviewDocument, AssetReviewRecord } from "./asset-review";
import { latestReviewForBytes } from "./asset-review";

export const ART_DESK_LANES = [
  "needs-your-review",
  "claimed-generating",
  "revision",
  "approved-awaiting-integration",
  "in-game",
  "covered-history",
] as const;

export type ArtDeskLane = (typeof ART_DESK_LANES)[number];

export interface ArtDeskCoverage {
  readonly assetId?: string;
  readonly sha256?: string;
  readonly disposition:
    | "public-released"
    | "private-usable"
    | "candidate"
    | "history"
    | "input-missing"
    | "unknown";
  readonly note: string;
}

/**
 * What the identified server found when it looked for a candidate's bytes.
 * `unchecked` means no receipt has been read yet; it is never treated as
 * present.
 */
export type ArtDeskCandidateBytes =
  "unchecked" | "verified" | "missing" | "hash-mismatch" | "not-a-raster";

export interface ArtDeskCandidateInput {
  readonly sha256: string;
  readonly path: string;
  readonly sceneId?: string;
  readonly bytes?: ArtDeskCandidateBytes;
  readonly source?: "generation-batch" | "upload-sidecar";
  readonly raster?: {
    readonly container: "png" | "jpg";
    readonly width: number;
    readonly height: number;
  };
}

export interface ArtDeskItem {
  readonly request: AssetRequest;
  readonly lane: ArtDeskLane;
  readonly generationEligible: boolean;
  readonly coverage: ArtDeskCoverage;
  readonly claim?: AssetClaim;
  readonly latestReview?: AssetReviewRecord;
  readonly warnings: readonly string[];
  readonly candidateSha256?: string;
  readonly candidateThumbPath?: string;
  /** Server-verified state of the recorded candidate's bytes. */
  readonly candidateBytes: ArtDeskCandidateBytes;
  /** True only when bytes are present, decoded and hash to the recorded value. */
  readonly candidateVerified: boolean;
  readonly candidateSource?: ArtDeskCandidateInput["source"];
  readonly candidateRaster?: ArtDeskCandidateInput["raster"];
  /** Disposable QA request from the private sidecar; never production coverage. */
  readonly disposable: boolean;
  readonly sceneId?: string;
}

/**
 * Pack identity state as the identified server reported it. `unknown` is the
 * browser's state before any receipt arrives; it is neither supplied nor
 * missing and says so.
 */
export type ArtDeskPrivatePackStatus =
  | "unknown"
  | "not-configured"
  | "missing"
  | "invalid"
  | "incomplete"
  | "verified";

export interface ArtDeskPrivatePackReceipt {
  readonly status: ArtDeskPrivatePackStatus;
  readonly note: string;
  readonly packId?: string;
  readonly manifestSha256?: string;
  readonly filesTotal?: number;
  readonly filesPresent?: number;
  readonly checkedAt?: string;
}

export interface ArtDeskState {
  readonly contractVersion: "alive43-art-desk-v1";
  readonly items: readonly ArtDeskItem[];
  readonly privatePack: ArtDeskPrivatePackReceipt;
}

export function unknownPrivatePackReceipt(): ArtDeskPrivatePackReceipt {
  return {
    status: "unknown",
    note: "Private pack state has not been read from the identified server yet.",
  };
}

const PRIVATE_PACK_INPUT_MISSING: ReadonlySet<ArtDeskPrivatePackStatus> =
  new Set(["unknown", "not-configured", "missing", "invalid", "incomplete"]);

export interface ArtDeskReconciliation {
  readonly documentVersion: 1;
  readonly generatedFrom: string;
  readonly holds: Readonly<
    Record<string, NonNullable<AssetRequest["generationHold"]>>
  >;
  readonly coveredRequestIds: readonly string[];
  readonly searchedExistingSources: readonly string[];
}

export interface ArtDeskInputs {
  readonly requests: readonly AssetRequest[];
  readonly claims: AssetClaimDocument;
  readonly reviews: AssetReviewDocument;
  readonly readiness?: AssetReadinessDeclaration;
  readonly now: string;
  readonly releasedAssetIds?: ReadonlySet<string>;
  readonly candidateByRequest?: Readonly<Record<string, ArtDeskCandidateInput>>;
  /** Receipt from the identified server; omitted means not yet read. */
  readonly privatePack?: ArtDeskPrivatePackReceipt;
  /** Request ids that came from the disposable QA sidecar. */
  readonly disposableRequestIds?: ReadonlySet<string>;
  readonly reconciliation?: ArtDeskReconciliation;
}

const PEOPLE_REQUEST_PREFIX = "person-";

function readinessFor(
  readiness: AssetReadinessDeclaration | undefined,
  requestId: string,
) {
  return readiness?.requestVerdicts.find(
    (item) => item.requestId === requestId,
  );
}

function laneFor(item: {
  readonly request: AssetRequest;
  readonly claim?: AssetClaim;
  readonly coverage: ArtDeskCoverage;
  readonly latestReview?: AssetReviewRecord;
}): ArtDeskLane {
  const { request, claim, coverage, latestReview } = item;
  if (
    request.status === "withdrawn-already-covered" ||
    request.status === "rejected" ||
    request.generationHold === "already-covered-candidate" ||
    coverage.disposition === "history" ||
    readinessClosed(request)
  ) {
    return "covered-history";
  }
  if (
    request.generationHold === "d-held-people" &&
    request.status !== "revision-requested"
  ) {
    return "covered-history";
  }
  if (request.status === "accepted-promoted") {
    return coverage.disposition === "public-released"
      ? "in-game"
      : "approved-awaiting-integration";
  }
  if (latestReview?.decision === "approve") {
    return "approved-awaiting-integration";
  }
  if (
    request.status === "revision-requested" ||
    latestReview?.decision === "request-revision"
  ) {
    return "revision";
  }
  if (
    claim?.state === "active" ||
    request.status === "generating" ||
    request.status === "prompting"
  ) {
    return "claimed-generating";
  }
  if (
    request.status === "candidate-submitted" ||
    request.status === "intake-evaluating" ||
    request.generationHold === "awaiting-assessment" ||
    coverage.disposition === "candidate"
  ) {
    return "needs-your-review";
  }
  if (request.status === "queued" || request.status === "draft") {
    return request.generationHold ? "covered-history" : "needs-your-review";
  }
  return "needs-your-review";
}

function candidateCoverageNote(candidate: ArtDeskCandidateInput): string {
  switch (candidate.bytes) {
    case "verified":
      return candidate.raster
        ? `Candidate bytes present and hash-verified: ${candidate.raster.width}×${candidate.raster.height} ${candidate.raster.container}.`
        : "Candidate bytes present and hash-verified.";
    case "missing":
      return "Candidate hash is recorded. Its private bytes are not in this checkout; the record is history, not reviewable pixels.";
    case "hash-mismatch":
      return "Candidate hash is recorded, but the bytes on disk hash differently. Not reviewable as this candidate.";
    case "not-a-raster":
      return "Candidate hash is recorded and matches, but the bytes do not decode as PNG or JPEG.";
    default:
      return "Candidate hash is recorded. Bytes have not been verified by the identified server yet.";
  }
}

/** A decision may bind only a candidate whose bytes the server verified. */
export function decisionBlocker(item: ArtDeskItem): string | null {
  if (!item.candidateSha256) {
    return "Approve/reject binds exact candidate bytes. Upload a candidate first.";
  }
  if (item.candidateBytes === "unchecked") {
    return "Candidate bytes are not verified yet; wait for the identified server's receipt.";
  }
  if (!item.candidateVerified) {
    return `Candidate bytes are ${item.candidateBytes}; a decision binds present, decoded, hash-verified bytes.`;
  }
  return null;
}

function readinessClosed(request: AssetRequest): boolean {
  return request.status === "withdrawn-already-covered";
}

export function projectArtDesk(inputs: ArtDeskInputs): ArtDeskState {
  const privatePack = inputs.privatePack ?? unknownPrivatePackReceipt();

  const items = inputs.requests.map((raw) => {
    const hold =
      raw.generationHold ?? inputs.reconciliation?.holds[raw.requestId];
    const covered =
      inputs.reconciliation?.coveredRequestIds.includes(raw.requestId) &&
      !TERMINAL_ASSET_REQUEST_STATUSES.includes(raw.status);
    const request: AssetRequest = {
      ...raw,
      generationHold: covered
        ? "already-covered-candidate"
        : (raw.generationHold ?? hold),
    };
    const verdict = readinessFor(inputs.readiness, request.requestId);
    const candidate = inputs.candidateByRequest?.[request.requestId];
    const claim = activeClaimFor(inputs.claims, request.requestId, inputs.now);
    const latestReview = candidate
      ? latestReviewForBytes(
          inputs.reviews,
          request.requestId,
          candidate.sha256,
        )
      : inputs.reviews.reviews
          .filter((review) => review.requestId === request.requestId)
          .at(-1);
    const warnings: string[] = [];
    let coverage: ArtDeskCoverage = {
      disposition: "unknown",
      note: "No current coverage declaration.",
    };
    if (verdict?.verdict === "closed-by-preserved-asset") {
      coverage = {
        disposition: "history",
        note: verdict.reason,
      };
    } else if (request.generationHold === "already-covered-candidate") {
      coverage = {
        disposition: "candidate",
        note:
          request.resolutionNote ??
          "Candidate already ingested; remaining work is review, not generation.",
      };
    } else if (request.generationHold === "private-pack-input") {
      coverage = {
        disposition: "input-missing",
        note: "Needed pixels live in the private pack LAND retains. Missing input, not a missing asset.",
      };
    } else if (request.generationHold === "d-held-people") {
      coverage = {
        disposition: "history",
        note: "D's hold covers new people/body/head generation. Visible as history, not a P0 generation job.",
      };
    } else if (
      request.status === "accepted-promoted" &&
      inputs.releasedAssetIds &&
      [...inputs.releasedAssetIds].some((id) =>
        request.resolutionNote?.includes(id),
      )
    ) {
      coverage = {
        disposition: "public-released",
        note:
          request.resolutionNote ?? "Released in the public runtime manifest.",
      };
    } else if (request.status === "accepted-promoted") {
      coverage = {
        disposition: "private-usable",
        note:
          request.resolutionNote ??
          "Accepted; runtime release is a separate state.",
      };
    } else if (candidate) {
      coverage = {
        disposition: "candidate",
        sha256: candidate.sha256,
        note: candidateCoverageNote(candidate),
      };
    } else if (TERMINAL_ASSET_REQUEST_STATUSES.includes(request.status)) {
      coverage = {
        disposition: "history",
        note: request.resolutionNote ?? request.status,
      };
    }

    if (
      request.requestId.startsWith(PEOPLE_REQUEST_PREFIX) &&
      !request.generationHold
    ) {
      warnings.push(
        "People request without an explicit D-hold flag; generation remains forbidden.",
      );
    }
    if (request.compatibility?.placeIdentity.kind === "exact-literal-site") {
      warnings.push("Exact named landmark — not generic scenery.");
    }
    if (
      request.compatibility?.seasons.includes("winter") &&
      request.compatibility.snowCoverPossible
    ) {
      warnings.push(
        "Snow is possible on this plate; winter dates are not automatically snow.",
      );
    }
    if (
      PRIVATE_PACK_INPUT_MISSING.has(privatePack.status) &&
      request.requestId.startsWith(PEOPLE_REQUEST_PREFIX)
    ) {
      warnings.push(privatePack.note);
    }
    if (candidate && candidate.bytes === "hash-mismatch") {
      warnings.push(
        "Bytes on disk are not the recorded candidate; nothing here can be approved until the record and the file agree.",
      );
    }
    const disposable =
      inputs.disposableRequestIds?.has(request.requestId) ?? false;
    if (disposable) {
      warnings.push(
        "Disposable QA request from the private sidecar. Its candidate is bench proof, not production art, and never counts as coverage.",
      );
    }
    if (
      latestReview &&
      candidate &&
      latestReview.outputSha256 !== candidate.sha256
    ) {
      warnings.push(
        "Candidate bytes changed; prior exact-hash approval does not apply.",
      );
    }

    const generationEligible =
      !request.generationHold &&
      !TERMINAL_ASSET_REQUEST_STATUSES.includes(request.status) &&
      verdict?.verdict !== "closed-by-preserved-asset" &&
      coverage.disposition !== "candidate" &&
      coverage.disposition !== "public-released" &&
      coverage.disposition !== "private-usable" &&
      !disposable &&
      !request.requestId.startsWith(PEOPLE_REQUEST_PREFIX);

    const itemCore = {
      request,
      coverage,
      claim,
      latestReview,
      warnings,
      candidateSha256: candidate?.sha256,
      candidateThumbPath: candidate?.path,
      candidateBytes: candidate?.bytes ?? "unchecked",
      candidateVerified: candidate?.bytes === "verified",
      candidateSource: candidate?.source,
      candidateRaster: candidate?.raster,
      disposable,
      sceneId: candidate?.sceneId ?? request.scope?.familyId,
    };
    return {
      ...itemCore,
      lane: laneFor(itemCore),
      generationEligible,
    };
  });

  return {
    contractVersion: "alive43-art-desk-v1",
    items,
    privatePack,
  };
}

export function filterDeskItems(
  items: readonly ArtDeskItem[],
  lane: ArtDeskLane | "all",
  query: string,
): readonly ArtDeskItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (lane !== "all" && item.lane !== lane) return false;
    if (!needle) return true;
    const haystack = [
      item.request.requestId,
      item.request.title,
      item.request.consumer.consumerId,
      item.request.consumer.playerVisibleUse,
      item.coverage.note,
      ...(item.request.compatibility?.exclusions ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function paginateDeskItems(
  items: readonly ArtDeskItem[],
  page: number,
  pageSize = 8,
): {
  readonly page: readonly ArtDeskItem[];
  readonly total: number;
  readonly pages: number;
} {
  const size = Math.max(1, pageSize);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(0, page), pages - 1);
  return {
    page: items.slice(safePage * size, safePage * size + size),
    total: items.length,
    pages,
  };
}
