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
  readonly sceneId?: string;
}

export interface ArtDeskState {
  readonly contractVersion: "alive43-art-desk-v1";
  readonly items: readonly ArtDeskItem[];
  readonly privatePack: {
    readonly status: "supplied" | "input-missing";
    readonly note: string;
    readonly path?: string;
  };
}

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
  readonly candidateByRequest?: Readonly<
    Record<
      string,
      {
        readonly sha256: string;
        readonly path: string;
        readonly sceneId?: string;
      }
    >
  >;
  readonly privatePackPath?: string;
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

function readinessClosed(request: AssetRequest): boolean {
  return request.status === "withdrawn-already-covered";
}

export function projectArtDesk(inputs: ArtDeskInputs): ArtDeskState {
  const privatePack = inputs.privatePackPath
    ? {
        status: "supplied" as const,
        note: "Authorized private pack path supplied to this worktree.",
        path: inputs.privatePackPath,
      }
    : {
        status: "input-missing" as const,
        note: "Authorized private MODULAR41 pack was not handed to this isolated worktree. That is an access/input problem, not proof modern people are absent from the bank.",
      };

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
        note: "Candidate bytes present for exact-hash review.",
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
      privatePack.status === "input-missing" &&
      request.requestId.startsWith(PEOPLE_REQUEST_PREFIX)
    ) {
      warnings.push(privatePack.note);
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
      !request.requestId.startsWith(PEOPLE_REQUEST_PREFIX);

    const itemCore = {
      request,
      coverage,
      claim,
      latestReview,
      warnings,
      candidateSha256: candidate?.sha256,
      candidateThumbPath: candidate?.path,
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
