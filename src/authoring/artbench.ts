/**
 * ARTBENCH — immutable event contract and rebuildable projection.
 *
 * The owner's asset-production workspace keeps one canonical record kind: an
 * append-only event. Requests, candidates (exact bytes), decisions, tags,
 * revision requests and integration hand-offs are all events with stable ids.
 * Everything a screen or an index shows is a projection reduced from those
 * events; a projection is never edited by hand and can always be rebuilt.
 *
 * Identity, in one line: assetId is the logical thing being made; candidateId
 * is one ingested set of bytes for it; sha256 is exactly those bytes;
 * parentCandidateId is edit lineage; eventId is one immutable fact. The same
 * ids are used in the local data root, the bench and the Drive exchange.
 *
 * Browser-safe: no Node imports.
 */

import type { AssetRequest } from "./asset-request";
import type { AssetReviewDecision } from "./asset-review";

export const ARTBENCH_CONTRACT_VERSION = "artbench-events/v1" as const;

export type ArtbenchActorKind =
  "owner" | "agent" | "worker" | "system" | "legacy";

export interface ArtbenchActor {
  readonly kind: ArtbenchActorKind;
  readonly id: string;
}

export type ArtbenchEventSource = "bench" | "legacy" | "inbox" | "drive";

export type EditKind =
  | "original"
  | "upscale"
  | "background-removal"
  | "repaint"
  | "crop"
  | "canvas-change"
  | "other";

export const EDIT_KINDS: readonly EditKind[] = [
  "original",
  "upscale",
  "background-removal",
  "repaint",
  "crop",
  "canvas-change",
  "other",
];

/** Edits that can invalidate neck/seat/anchor/occlusion calibration. */
export const CALIBRATION_SENSITIVE_EDITS: readonly EditKind[] = [
  "repaint",
  "upscale",
  "background-removal",
  "crop",
  "canvas-change",
];

export interface CandidateProvenance {
  readonly worker?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly promptRef?: string;
  readonly createdAt?: string;
  readonly sourceTime?: string;
  readonly originalName?: string;
  readonly batchId?: string;
  readonly itemId?: string;
  readonly jobId?: string;
  /**
   * The producer's receipt of reference images actually supplied as inputs.
   * Absent means unknown, never "none".
   */
  readonly referenceInputs?: readonly {
    readonly ref: string;
    readonly sha256?: string;
    readonly role?: string;
  }[];
}

export interface CandidateIngestedPayload {
  readonly candidateId: string;
  readonly assetId: string;
  /** "inbox" when the upload named no request; it stays visible until assigned. */
  readonly requestId: string;
  readonly requestVersion: number;
  readonly sha256: string;
  readonly byteLength: number;
  readonly container: "png" | "jpg";
  readonly width: number;
  readonly height: number;
  readonly hasAlpha: boolean;
  /** Path of the immutable original inside the data root (never a machine path). */
  readonly storagePath: string;
  readonly parentCandidateId?: string;
  readonly editKind: EditKind;
  readonly note?: string;
  readonly provenance: CandidateProvenance;
  readonly nativeDetail: "native" | "derived" | "unverified";
  /** Measured constraints the lineage carries but that need a recheck. */
  readonly calibrationRecheck: readonly string[];
  /** Descriptive tags inherited from the parent at ingest (never approval). */
  readonly inheritedTags?: TagSet;
}

export type TagSet = Readonly<Record<string, readonly string[]>>;

/** Facet keys the bench offers; custom keys are allowed too. */
export const TAG_FACETS = [
  "assetType",
  "region",
  "family",
  "season",
  "governmentLevel",
  "hairstyle",
  "hairTexture",
  "hairLength",
  "clothingClass",
  "custom",
] as const;

export type TagFacet = (typeof TAG_FACETS)[number];

export interface TagsSetPayload {
  readonly entity: "candidate" | "asset";
  readonly entityId: string;
  readonly tags: TagSet;
  /** Version of the entity's tag state the author saw; mismatch is a conflict. */
  readonly baseVersion: number;
  readonly author: ArtbenchActor;
  readonly suggestion?: boolean;
}

export interface ReviewDecidedPayload {
  readonly reviewId: string;
  readonly requestId: string;
  readonly requestVersion: number;
  readonly candidateId: string;
  /** The candidate the reviewer was looking at; must equal candidateId. */
  readonly viewedCandidateId: string;
  readonly outputSha256: string;
  readonly decision: AssetReviewDecision;
  readonly contractVersion: string;
  readonly fitContractHash: string;
  readonly sceneContractHash: string;
  readonly rightsStatus: "known" | "unknown";
  readonly sourceDeclaration: string;
  /** Revision instructions or approval/reject note. */
  readonly note?: string;
  readonly attachments?: readonly string[];
  /** A correction of an earlier decision names it; the earlier one stays. */
  readonly supersedesReviewId?: string;
  /** True when the request is a disposable QA record; never production cargo. */
  readonly qa?: boolean;
  /** How the caller proved owner review capability; never self-declared. */
  readonly authority?: ReviewAuthority;
}

export type ReviewAuthority = "host-token" | "session-capability";

/** A review that arrived through the exchange: evidence, never applied. */
export interface ReviewImportedPayload {
  readonly imported: ReviewDecidedPayload;
  readonly fromOrigin: string;
  readonly reason: string;
}

/** Administrative disposition: marks records as QA and returns their items. */
export interface QaDispositionPayload {
  readonly requestId?: string;
  readonly candidateId?: string;
  readonly itemId?: string;
  readonly reason: string;
}

export interface RequestCreatedPayload {
  readonly request: AssetRequest;
  readonly assetId: string;
  /** Disposable QA request: excluded from approval, coverage and integration. */
  readonly qa?: boolean;
  readonly parentRequestId?: string;
  readonly parentCandidateId?: string;
  readonly origin: "owner" | "worker" | "expansion";
  /** For a broad ask, the finite manifest this request is one item of. */
  readonly manifestId?: string;
}

export interface CandidateSelectedPayload {
  readonly requestId: string;
  readonly candidateId: string;
}

export interface IntegrationQueuedPayload {
  readonly itemId: string;
  readonly candidateId: string;
  readonly assetId: string;
  readonly requestId: string;
  readonly sha256: string;
  readonly consumerId: string;
  readonly runtimeComponent: string;
  readonly target: AssetRequest["target"];
  readonly tagsState: "tagged" | "untagged";
  readonly missingFacts: readonly string[];
  readonly approvalReviewId: string;
}

export interface IntegrationReceivedPayload {
  readonly itemId: string;
  readonly state: "accepted" | "installed" | "published" | "returned";
  readonly receipt: Readonly<Record<string, string>>;
  readonly note?: string;
}

export interface BatchCompletedPayload {
  readonly batchId: string;
  readonly source: "local-inbox" | "drive-inbox";
  readonly itemCount: number;
  readonly ingestedCandidateIds: readonly string[];
  readonly rejected: readonly {
    readonly item: string;
    readonly reason: string;
  }[];
}

export type ArtbenchEvent =
  | ArtbenchEventOf<"request.created", RequestCreatedPayload>
  | ArtbenchEventOf<"candidate.ingested", CandidateIngestedPayload>
  | ArtbenchEventOf<"candidate.selected", CandidateSelectedPayload>
  | ArtbenchEventOf<"review.decided", ReviewDecidedPayload>
  | ArtbenchEventOf<"tags.set", TagsSetPayload>
  | ArtbenchEventOf<"integration.queued", IntegrationQueuedPayload>
  | ArtbenchEventOf<"integration.received", IntegrationReceivedPayload>
  | ArtbenchEventOf<"batch.completed", BatchCompletedPayload>
  | ArtbenchEventOf<"review.imported", ReviewImportedPayload>
  | ArtbenchEventOf<"qa.disposition", QaDispositionPayload>;

export type ArtbenchEventType = ArtbenchEvent["type"];

export interface ArtbenchEventOf<T extends string, P> {
  readonly contractVersion: typeof ARTBENCH_CONTRACT_VERSION;
  readonly eventId: string;
  /** Local append order; foreign events get a seq when they are admitted. */
  readonly seq: number;
  readonly at: string;
  readonly actor: ArtbenchActor;
  readonly source: ArtbenchEventSource;
  /** Store that authored the event, so a store never re-imports its own. */
  readonly origin: string;
  readonly type: T;
  readonly payload: P;
}

/* ------------------------------------------------------------------ */
/* Projection                                                          */
/* ------------------------------------------------------------------ */

export type CandidateStatus =
  | "awaiting-review"
  | "approved"
  | "rejected"
  | "revision-requested"
  | "integration-ready"
  | "accepted"
  | "installed"
  | "in-game";

export interface ProjectedDecision {
  readonly eventId: string;
  readonly at: string;
  readonly actor: ArtbenchActor;
  readonly payload: ReviewDecidedPayload;
}

export interface ProjectedCandidate extends CandidateIngestedPayload {
  readonly ingestedAt: string;
  readonly ingestEventId: string;
  readonly source: ArtbenchEventSource;
  /** 1-based order of this candidate within its asset's history. */
  readonly revision: number;
  readonly childCandidateIds: readonly string[];
  readonly tags: TagSet;
  readonly tagsVersion: number;
  readonly tagAuthors: readonly ArtbenchActor[];
  readonly decisions: readonly ProjectedDecision[];
  readonly latestDecision?: ProjectedDecision;
  readonly status: CandidateStatus;
  readonly integrationItemId?: string;
  readonly integrationState?: IntegrationReceivedPayload["state"];
  /** Disposable QA candidate: never production cargo. */
  readonly qa: boolean;
  /** Every ingestion event for this candidate id (one per store that took it in). */
  readonly ingestReceipts: readonly IngestReceipt[];
  /** Set when this id is a legacy duplicate of the same delivered item. */
  readonly aliasOf?: string;
  /** Legacy duplicate ids grouped under this canonical candidate. */
  readonly aliasIds: readonly string[];
  /** Decisions across the whole duplicate group, oldest first. */
  readonly groupDecisions: readonly ProjectedDecision[];
  /** Group members ended with different decisions; shown, never resolved here. */
  readonly duplicateDecisionConflict: boolean;
}

export interface IngestReceipt {
  readonly eventId: string;
  readonly origin: string;
  readonly at: string;
  readonly source: ArtbenchEventSource;
}

/** One delivered batch item that arrived with different bytes. */
export interface IntakeConflict {
  readonly requestId: string;
  readonly batchId: string;
  readonly itemId: string;
  readonly candidateIds: readonly string[];
  readonly sha256s: readonly string[];
}

export type RequestLane =
  | "need-generation"
  | "awaiting-capable-worker"
  | "claimed-generating"
  | "needs-review"
  | "revision-requested"
  | "approved-awaiting-integration"
  | "in-game"
  | "history"
  | "inbox";

export const REQUEST_LANES: readonly RequestLane[] = [
  "need-generation",
  "awaiting-capable-worker",
  "claimed-generating",
  "needs-review",
  "revision-requested",
  "approved-awaiting-integration",
  "in-game",
  "history",
  "inbox",
];

export const LANE_LABELS: Record<RequestLane, string> = {
  "need-generation": "Need generation",
  "awaiting-capable-worker": "Awaiting capable worker",
  "claimed-generating": "Claimed / generating",
  "needs-review": "Needs review",
  "revision-requested": "Revision requested",
  "approved-awaiting-integration": "Approved / awaiting integration",
  "in-game": "In game",
  history: "History",
  inbox: "Inbox (unassigned)",
};

export interface ProjectedRequest {
  readonly request: AssetRequest;
  readonly assetId: string;
  readonly source: "registry" | "qa" | "event";
  readonly candidateIds: readonly string[];
  readonly selectedCandidateId?: string;
  readonly lane: RequestLane;
  readonly parentRequestId?: string;
  readonly parentCandidateId?: string;
  readonly manifestId?: string;
  readonly createdEventId?: string;
  /** Disposable QA request: shown, filterable, never coverage or cargo. */
  readonly qa: boolean;
}

export interface ProjectedAsset {
  readonly assetId: string;
  readonly requestIds: readonly string[];
  readonly candidateIds: readonly string[];
  readonly currentApprovedCandidateId?: string;
  readonly activeRuntimeCandidateId?: string;
  readonly tags: TagSet;
  readonly tagsVersion: number;
}

export interface TagConflict {
  readonly eventId: string;
  readonly entity: TagsSetPayload["entity"];
  readonly entityId: string;
  readonly baseVersion: number;
  readonly currentVersion: number;
  readonly attempted: TagSet;
  readonly author: ArtbenchActor;
  readonly at: string;
}

export interface ProjectedIntegrationItem extends IntegrationQueuedPayload {
  readonly queuedAt: string;
  readonly queuedEventId: string;
  readonly state: "pending" | IntegrationReceivedPayload["state"];
  readonly receipts: readonly IntegrationReceivedPayload[];
  /** Current candidate tags for the receiver; tagsState stays approval-time. */
  readonly currentTags: TagSet;
  readonly currentTagsVersion: number;
  readonly qa: boolean;
}

export interface ArtbenchProjection {
  readonly contractVersion: typeof ARTBENCH_CONTRACT_VERSION;
  readonly lastSeq: number;
  readonly eventCount: number;
  readonly requests: Readonly<Record<string, ProjectedRequest>>;
  readonly candidates: Readonly<Record<string, ProjectedCandidate>>;
  readonly assets: Readonly<Record<string, ProjectedAsset>>;
  readonly integrationQueue: readonly ProjectedIntegrationItem[];
  readonly conflicts: readonly TagConflict[];
  /** Same request/batch/item delivered with different bytes. */
  readonly intakeConflicts: readonly IntakeConflict[];
  readonly rejectedEvents: readonly {
    readonly eventId: string;
    readonly reason: string;
  }[];
  /** Reviews that arrived through the exchange; evidence only. */
  readonly importedReviews: readonly {
    readonly eventId: string;
    readonly at: string;
    readonly fromOrigin: string;
    readonly reason: string;
    readonly imported: ReviewDecidedPayload;
  }[];
}

export const INBOX_REQUEST_ID = "inbox";

export interface ProjectionInputs {
  readonly registryRequests: readonly AssetRequest[];
  readonly qaRequests?: readonly AssetRequest[];
  readonly events: readonly ArtbenchEvent[];
  /** Requests whose claims are currently active (from the claim document). */
  readonly claimedRequestIds?: ReadonlySet<string>;
  /** True when at least one capable generation worker is registered. */
  readonly generatorAvailable?: boolean;
}

export function assetIdForRequest(
  request: Pick<AssetRequest, "requestId" | "scope">,
): string {
  return request.scope?.familyId
    ? `asset:${request.scope.familyId}${request.scope.variantId ? `:${request.scope.variantId}` : ""}`
    : `asset:${request.requestId}`;
}

function mergeTags(base: TagSet, next: TagSet): TagSet {
  const merged: Record<string, readonly string[]> = { ...base };
  for (const [key, values] of Object.entries(next)) {
    merged[key] = [...new Set(values)];
    if (merged[key].length === 0) delete merged[key];
  }
  return merged;
}

function isUntagged(tags: TagSet): boolean {
  return Object.values(tags).every((values) => values.length === 0);
}

interface MutableCandidate {
  ingest: CandidateIngestedPayload;
  ingestedAt: string;
  ingestEventId: string;
  source: ArtbenchEventSource;
  children: string[];
  tags: TagSet;
  tagsVersion: number;
  tagAuthors: ArtbenchActor[];
  decisions: ProjectedDecision[];
  integrationItemId?: string;
  integrationState?: IntegrationReceivedPayload["state"];
  receipts: IngestReceipt[];
}

function candidateStatus(
  c: MutableCandidate,
  decisions: readonly ProjectedDecision[] = c.decisions,
): CandidateStatus {
  if (c.integrationState === "installed") return "installed";
  if (c.integrationState === "published") return "in-game";
  if (c.integrationState === "accepted") return "accepted";
  const latest = decisions.at(-1);
  if (!latest) return "awaiting-review";
  if (latest.payload.decision === "approve") {
    return c.integrationItemId ? "integration-ready" : "approved";
  }
  if (latest.payload.decision === "reject") return "rejected";
  return "revision-requested";
}

export function projectArtbench(inputs: ProjectionInputs): ArtbenchProjection {
  const requests = new Map<
    string,
    {
      request: AssetRequest;
      source: ProjectedRequest["source"];
      assetId: string;
      candidateIds: string[];
      selectedCandidateId?: string;
      /** True once the owner pinned a revision explicitly (candidate.selected). */
      selectedPinned?: boolean;
      parentRequestId?: string;
      parentCandidateId?: string;
      manifestId?: string;
      createdEventId?: string;
      qa: boolean;
    }
  >();
  for (const request of inputs.registryRequests) {
    requests.set(request.requestId, {
      request,
      source: "registry",
      assetId: assetIdForRequest(request),
      candidateIds: [],
      qa: false,
    });
  }
  for (const request of inputs.qaRequests ?? []) {
    if (!requests.has(request.requestId)) {
      requests.set(request.requestId, {
        request,
        source: "qa",
        assetId: assetIdForRequest(request),
        candidateIds: [],
        qa: true,
      });
    }
  }
  const importedReviews: ArtbenchProjection["importedReviews"][number][] = [];
  const qaCandidates = new Set<string>();
  const candidates = new Map<string, MutableCandidate>();
  const assets = new Map<
    string,
    {
      requestIds: Set<string>;
      candidateIds: string[];
      tags: TagSet;
      tagsVersion: number;
      currentApprovedCandidateId?: string;
      activeRuntimeCandidateId?: string;
    }
  >();
  const integration = new Map<string, ProjectedIntegrationItem>();
  const conflicts: TagConflict[] = [];
  const rejected: { eventId: string; reason: string }[] = [];
  const seenReviewIds = new Set<string>();
  const assetFor = (assetId: string) => {
    let asset = assets.get(assetId);
    if (!asset) {
      asset = {
        requestIds: new Set(),
        candidateIds: [],
        tags: {},
        tagsVersion: 0,
      };
      assets.set(assetId, asset);
    }
    return asset;
  };
  for (const entry of requests.values()) {
    assetFor(entry.assetId).requestIds.add(entry.request.requestId);
  }

  const ordered = [...inputs.events].sort((a, b) => a.seq - b.seq);
  let lastSeq = 0;
  for (const event of ordered) {
    lastSeq = Math.max(lastSeq, event.seq);
    switch (event.type) {
      case "request.created": {
        const { request } = event.payload;
        if (requests.has(request.requestId)) {
          rejected.push({
            eventId: event.eventId,
            reason: `request ${request.requestId} already exists`,
          });
          break;
        }
        requests.set(request.requestId, {
          request,
          source: "event",
          assetId: event.payload.assetId,
          candidateIds: [],
          parentRequestId: event.payload.parentRequestId,
          parentCandidateId: event.payload.parentCandidateId,
          manifestId: event.payload.manifestId,
          createdEventId: event.eventId,
          qa: event.payload.qa === true,
        });
        assetFor(event.payload.assetId).requestIds.add(request.requestId);
        break;
      }
      case "candidate.ingested": {
        const p = event.payload;
        const existing = candidates.get(p.candidateId);
        if (existing) {
          // The same logical delivery ingested by another store: one card,
          // one more receipt. Different content under the same id is refused.
          if (
            existing.ingest.sha256 === p.sha256 &&
            existing.ingest.requestId === p.requestId &&
            existing.ingest.requestVersion === p.requestVersion &&
            existing.ingest.provenance?.batchId === p.provenance?.batchId &&
            existing.ingest.provenance?.itemId === p.provenance?.itemId &&
            existing.ingest.editKind === p.editKind &&
            existing.ingest.parentCandidateId === p.parentCandidateId
          ) {
            existing.receipts.push({
              eventId: event.eventId,
              origin: event.origin,
              at: event.at,
              source: event.source,
            });
          } else {
            rejected.push({
              eventId: event.eventId,
              reason: `candidate ${p.candidateId} already ingested with different content`,
            });
          }
          break;
        }
        const parent = p.parentCandidateId
          ? candidates.get(p.parentCandidateId)
          : undefined;
        const asset = assetFor(p.assetId);
        asset.candidateIds.push(p.candidateId);
        const tags = parent
          ? mergeTags(parent.tags, p.inheritedTags ?? {})
          : (p.inheritedTags ?? {});
        candidates.set(p.candidateId, {
          ingest: p,
          ingestedAt: event.at,
          ingestEventId: event.eventId,
          source: event.source,
          children: [],
          tags,
          tagsVersion: 0,
          tagAuthors: [],
          decisions: [],
          receipts: [
            {
              eventId: event.eventId,
              origin: event.origin,
              at: event.at,
              source: event.source,
            },
          ],
        });
        if (parent) parent.children.push(p.candidateId);
        const request = requests.get(p.requestId);
        if (request) {
          request.candidateIds.push(p.candidateId);
          // A fresh candidate becomes the selected revision unless the owner
          // pinned one explicitly; an edited revision of the pinned one follows.
          if (
            !request.selectedPinned ||
            (parent &&
              parent.ingest.candidateId === request.selectedCandidateId)
          ) {
            request.selectedCandidateId = p.candidateId;
          }
        } else if (p.requestId !== INBOX_REQUEST_ID) {
          rejected.push({
            eventId: event.eventId,
            reason: `candidate names unknown request ${p.requestId}`,
          });
        }
        break;
      }
      case "candidate.selected": {
        const request = requests.get(event.payload.requestId);
        if (request && candidates.has(event.payload.candidateId)) {
          request.selectedCandidateId = event.payload.candidateId;
          request.selectedPinned = true;
        } else {
          rejected.push({
            eventId: event.eventId,
            reason: "selection names an unknown request or candidate",
          });
        }
        break;
      }
      case "review.decided": {
        const p = event.payload;
        const candidate = candidates.get(p.candidateId);
        if (seenReviewIds.has(p.reviewId)) {
          rejected.push({
            eventId: event.eventId,
            reason: `duplicate reviewId ${p.reviewId}`,
          });
          break;
        }
        if (!candidate) {
          rejected.push({
            eventId: event.eventId,
            reason: `decision names unknown candidate ${p.candidateId}`,
          });
          break;
        }
        if (
          candidate.ingest.sha256 !== p.outputSha256 ||
          p.viewedCandidateId !== p.candidateId
        ) {
          rejected.push({
            eventId: event.eventId,
            reason:
              "decision hash or viewed candidate does not match the candidate",
          });
          break;
        }
        seenReviewIds.add(p.reviewId);
        candidate.decisions.push({
          eventId: event.eventId,
          at: event.at,
          actor: event.actor,
          payload: p,
        });
        if (p.decision === "approve") {
          assetFor(candidate.ingest.assetId).currentApprovedCandidateId =
            p.candidateId;
        }
        break;
      }
      case "tags.set": {
        const p = event.payload;
        const target =
          p.entity === "candidate"
            ? candidates.get(p.entityId)
            : assets.get(p.entityId);
        if (!target) {
          rejected.push({
            eventId: event.eventId,
            reason: `tags name unknown ${p.entity} ${p.entityId}`,
          });
          break;
        }
        if (p.baseVersion !== target.tagsVersion) {
          conflicts.push({
            eventId: event.eventId,
            entity: p.entity,
            entityId: p.entityId,
            baseVersion: p.baseVersion,
            currentVersion: target.tagsVersion,
            attempted: p.tags,
            author: p.author,
            at: event.at,
          });
          break;
        }
        // A human edit replaces an agent suggestion; a suggestion never overrides a human.
        if (
          p.suggestion &&
          "tagAuthors" in target &&
          target.tagAuthors.some((a) => a.kind === "owner")
        ) {
          rejected.push({
            eventId: event.eventId,
            reason: "agent suggestion cannot override owner tags",
          });
          break;
        }
        target.tags = mergeTags(target.tags, p.tags);
        target.tagsVersion += 1;
        if ("tagAuthors" in target) target.tagAuthors.push(p.author);
        break;
      }
      case "integration.queued": {
        const p = event.payload;
        const candidate = candidates.get(p.candidateId);
        if (!candidate) {
          rejected.push({
            eventId: event.eventId,
            reason: "integration item names unknown candidate",
          });
          break;
        }
        if (
          requests.get(candidate.ingest.requestId)?.qa ||
          qaCandidates.has(p.candidateId)
        ) {
          rejected.push({
            eventId: event.eventId,
            reason: "QA candidates never enter the integration queue",
          });
          break;
        }
        if (
          [...integration.values()].some(
            (item) =>
              item.candidateId === p.candidateId && item.state === "pending",
          )
        ) {
          rejected.push({
            eventId: event.eventId,
            reason: "candidate already queued for integration",
          });
          break;
        }
        candidate.integrationItemId = p.itemId;
        integration.set(p.itemId, {
          ...p,
          queuedAt: event.at,
          queuedEventId: event.eventId,
          state: "pending",
          receipts: [],
          currentTags: {},
          currentTagsVersion: 0,
          qa: false,
        });
        break;
      }
      case "integration.received": {
        const item = integration.get(event.payload.itemId);
        if (!item) {
          rejected.push({
            eventId: event.eventId,
            reason: `receipt for unknown integration item ${event.payload.itemId}`,
          });
          break;
        }
        const updated: ProjectedIntegrationItem = {
          ...item,
          state: event.payload.state,
          receipts: [...item.receipts, event.payload],
        };
        integration.set(item.itemId, updated);
        const candidate = candidates.get(item.candidateId);
        if (candidate) {
          candidate.integrationState = event.payload.state;
          if (
            event.payload.state === "installed" ||
            event.payload.state === "published"
          ) {
            assetFor(candidate.ingest.assetId).activeRuntimeCandidateId =
              candidate.ingest.candidateId;
          }
        }
        break;
      }
      case "batch.completed":
        break;
      case "review.imported":
        importedReviews.push({
          eventId: event.eventId,
          at: event.at,
          fromOrigin: event.payload.fromOrigin,
          reason: event.payload.reason,
          imported: event.payload.imported,
        });
        break;
      case "qa.disposition": {
        const p = event.payload;
        if (p.requestId) {
          const request = requests.get(p.requestId);
          if (request) {
            request.qa = true;
            for (const id of request.candidateIds) qaCandidates.add(id);
          }
        }
        if (p.candidateId) qaCandidates.add(p.candidateId);
        if (p.itemId) {
          const item = integration.get(p.itemId);
          if (item) {
            integration.set(p.itemId, {
              ...item,
              state: "returned",
              qa: true,
              receipts: [
                ...item.receipts,
                {
                  itemId: p.itemId,
                  state: "returned",
                  receipt: { disposition: "qa" },
                  note: p.reason,
                },
              ],
            });
            qaCandidates.add(item.candidateId);
          }
        }
        break;
      }
    }
  }

  // Legacy duplicates: the same delivered item (request/version, batch/item,
  // bytes, lineage) ingested under different random ids by different stores.
  // The first becomes canonical; the others stay as aliases with their own
  // history and never show as separate pending cards.
  const aliasOf = new Map<string, string>();
  const aliasIds = new Map<string, string[]>();
  const byItem = new Map<
    string,
    {
      requestId: string;
      batchId: string;
      itemId: string;
      variants: { sha: string; ids: string[] }[];
    }
  >();
  const groupKeyOwner = new Map<string, string>();
  for (const [candidateId, c] of candidates) {
    const { batchId, itemId } = c.ingest.provenance ?? {};
    if (!batchId || !itemId) continue;
    const itemKey = [c.ingest.requestId, batchId, itemId].join("\u0000");
    const item = byItem.get(itemKey) ?? {
      requestId: c.ingest.requestId,
      batchId,
      itemId,
      variants: [],
    };
    const variant = item.variants.find((v) => v.sha === c.ingest.sha256);
    if (variant) variant.ids.push(candidateId);
    else item.variants.push({ sha: c.ingest.sha256, ids: [candidateId] });
    byItem.set(itemKey, item);
    const groupKey = [
      c.ingest.requestId,
      c.ingest.requestVersion,
      batchId,
      itemId,
      c.ingest.sha256,
      c.ingest.parentCandidateId ?? "",
      c.ingest.editKind,
    ].join("\u0000");
    const owner = groupKeyOwner.get(groupKey);
    if (!owner) {
      groupKeyOwner.set(groupKey, candidateId);
    } else {
      aliasOf.set(candidateId, owner);
      aliasIds.set(owner, [...(aliasIds.get(owner) ?? []), candidateId]);
    }
  }
  const intakeConflicts: IntakeConflict[] = [];
  for (const { requestId, batchId, itemId, variants } of byItem.values()) {
    if (variants.length < 2) continue;
    intakeConflicts.push({
      requestId,
      batchId,
      itemId,
      candidateIds: variants.flatMap((v) => v.ids.slice(0, 1)),
      sha256s: variants.map((v) => v.sha),
    });
  }
  for (const [alias, owner] of aliasOf) {
    for (const entry of requests.values()) {
      entry.candidateIds = entry.candidateIds.filter((id) => id !== alias);
      if (entry.selectedCandidateId === alias)
        entry.selectedCandidateId = owner;
    }
  }

  const projectedCandidates: Record<string, ProjectedCandidate> = {};
  const revisionCounter = new Map<string, number>();
  for (const [candidateId, c] of candidates) {
    const members = [candidateId, ...(aliasIds.get(candidateId) ?? [])];
    const groupDecisions = members
      .flatMap((id) => candidates.get(id)?.decisions ?? [])
      .sort((a, b) =>
        a.at === b.at
          ? a.eventId.localeCompare(b.eventId)
          : a.at.localeCompare(b.at),
      );
    const finals = new Set(
      members
        .map((id) => candidates.get(id)?.decisions.at(-1)?.payload.decision)
        .filter(Boolean),
    );
    const revision = (revisionCounter.get(c.ingest.assetId) ?? 0) + 1;
    revisionCounter.set(c.ingest.assetId, revision);
    projectedCandidates[candidateId] = {
      ...c.ingest,
      ingestedAt: c.ingestedAt,
      ingestEventId: c.ingestEventId,
      source: c.source,
      revision,
      childCandidateIds: c.children,
      tags: c.tags,
      tagsVersion: c.tagsVersion,
      tagAuthors: c.tagAuthors,
      decisions: c.decisions,
      latestDecision: c.decisions.at(-1),
      status: candidateStatus(
        c,
        aliasOf.has(candidateId) ? c.decisions : groupDecisions,
      ),
      ingestReceipts: c.receipts,
      aliasOf: aliasOf.get(candidateId),
      aliasIds: aliasIds.get(candidateId) ?? [],
      groupDecisions: aliasOf.has(candidateId) ? c.decisions : groupDecisions,
      duplicateDecisionConflict: finals.size > 1,
      integrationItemId: c.integrationItemId,
      integrationState: c.integrationState,
      qa:
        qaCandidates.has(candidateId) ||
        (requests.get(c.ingest.requestId)?.qa ?? false),
    };
  }

  const projectedRequests: Record<string, ProjectedRequest> = {};
  for (const [requestId, entry] of requests) {
    const statuses = entry.candidateIds.map(
      (id) => projectedCandidates[id]?.status,
    );
    projectedRequests[requestId] = {
      request: entry.request,
      assetId: entry.assetId,
      source: entry.source,
      candidateIds: entry.candidateIds,
      selectedCandidateId: entry.selectedCandidateId,
      parentRequestId: entry.parentRequestId,
      parentCandidateId: entry.parentCandidateId,
      manifestId: entry.manifestId,
      createdEventId: entry.createdEventId,
      qa: entry.qa,
      lane: laneFor(entry.request, statuses, {
        claimed: inputs.claimedRequestIds?.has(requestId) ?? false,
        generatorAvailable: inputs.generatorAvailable ?? false,
      }),
    };
  }
  // Unassigned uploads are visible as a pseudo-request, never silently lost.
  // An inbox candidate that has been assigned (it has a child on a real
  // request) leaves the inbox; its bytes and lineage stay as history.
  const inboxCandidates = Object.values(projectedCandidates).filter(
    (c) => c.requestId === INBOX_REQUEST_ID && c.childCandidateIds.length === 0,
  );
  if (inboxCandidates.length > 0) {
    projectedRequests[INBOX_REQUEST_ID] = {
      request: inboxRequest(),
      assetId: "asset:inbox",
      source: "event",
      candidateIds: inboxCandidates.map((c) => c.candidateId),
      selectedCandidateId: inboxCandidates.at(-1)?.candidateId,
      lane: "inbox",
      qa: false,
    };
  }

  const projectedAssets: Record<string, ProjectedAsset> = {};
  for (const [assetId, asset] of assets) {
    projectedAssets[assetId] = {
      assetId,
      requestIds: [...asset.requestIds],
      candidateIds: asset.candidateIds,
      currentApprovedCandidateId: asset.currentApprovedCandidateId,
      activeRuntimeCandidateId: asset.activeRuntimeCandidateId,
      tags: asset.tags,
      tagsVersion: asset.tagsVersion,
    };
  }

  return {
    contractVersion: ARTBENCH_CONTRACT_VERSION,
    lastSeq,
    eventCount: ordered.length,
    requests: projectedRequests,
    candidates: projectedCandidates,
    assets: projectedAssets,
    integrationQueue: [...integration.values()].map((item) => {
      const candidate = projectedCandidates[item.candidateId];
      return {
        ...item,
        currentTags: candidate?.tags ?? {},
        currentTagsVersion: candidate?.tagsVersion ?? 0,
        qa: item.qa || (candidate?.qa ?? false),
      };
    }),
    conflicts,
    intakeConflicts,
    rejectedEvents: rejected,
    importedReviews,
  };
}

function inboxRequest(): AssetRequest {
  return {
    requestId: INBOX_REQUEST_ID,
    requestVersion: 1,
    priority: "P2",
    status: "draft",
    title: "Inbox — uploads not yet assigned to a request",
    consumer: {
      consumerId: "artbench-inbox",
      runtimeComponent: "none",
      playerVisibleUse: "Not a player-facing asset until assigned.",
    },
    whyNeeded:
      "Holds candidates that arrived without a request so nothing vanishes.",
    inventoryCheck: {
      repositoryPathsSearched: [],
      driveLocationsSearched: [],
      found: "n/a",
      shortfall: "n/a",
    },
    target: {
      targetClass: "environment-plate",
      minimumWidth: 1,
      aspectRatio: "any",
      alphaRequired: false,
      container: "either",
      styleAuthority: "n/a — unassigned inbox",
    },
    generationRecipe: [],
    acceptanceCriteria: [],
    dependsOn: [],
  };
}

function laneFor(
  request: AssetRequest,
  statuses: readonly (CandidateStatus | undefined)[],
  state: { readonly claimed: boolean; readonly generatorAvailable: boolean },
): RequestLane {
  const terminal =
    request.status === "rejected" ||
    request.status === "withdrawn-already-covered";
  if (statuses.some((s) => s === "in-game" || s === "installed"))
    return "in-game";
  if (
    statuses.some(
      (s) => s === "integration-ready" || s === "approved" || s === "accepted",
    )
  ) {
    return "approved-awaiting-integration";
  }
  if (request.status === "accepted-promoted") return "in-game";
  if (statuses.some((s) => s === "awaiting-review")) return "needs-review";
  if (statuses.some((s) => s === "revision-requested"))
    return "revision-requested";
  if (terminal) return "history";
  if (request.generationHold) return "history";
  if (
    state.claimed ||
    request.status === "generating" ||
    request.status === "prompting"
  ) {
    return "claimed-generating";
  }
  if (statuses.length > 0 && statuses.every((s) => s === "rejected")) {
    // A rejected candidate does not cancel the request; it needs new pixels.
    return state.generatorAvailable
      ? "need-generation"
      : "awaiting-capable-worker";
  }
  return state.generatorAvailable
    ? "need-generation"
    : "awaiting-capable-worker";
}

/* ------------------------------------------------------------------ */
/* Facets, filtering and search                                        */
/* ------------------------------------------------------------------ */

export interface CatalogFilter {
  readonly lane?: RequestLane | "all";
  readonly status?: CandidateStatus | "all";
  readonly tags?: TagSet;
  readonly untagged?: boolean;
  readonly text?: string;
}

export interface CatalogRow {
  readonly request: ProjectedRequest;
  readonly candidate?: ProjectedCandidate;
}

function textOf(row: CatalogRow): string {
  const r = row.request.request;
  const c = row.candidate;
  return [
    r.requestId,
    r.title,
    r.consumer.consumerId,
    r.consumer.playerVisibleUse,
    r.scope?.familyId,
    r.compatibility?.environmentClass,
    ...(r.compatibility?.allowedReuseRegions ?? []),
    c?.candidateId,
    c?.sha256,
    c?.note,
    c?.editKind,
    ...(c ? Object.values(c.tags).flat() : []),
    ...(c?.decisions.map((d) => d.payload.note ?? "") ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function tagsMatch(
  candidate: ProjectedCandidate | undefined,
  wanted: TagSet,
): boolean {
  if (!candidate) return Object.keys(wanted).length === 0;
  return Object.entries(wanted).every(
    ([facet, values]) =>
      values.length === 0 ||
      values.every((value) =>
        (candidate.tags[facet] ?? [])
          .map((v) => v.toLowerCase())
          .includes(value.toLowerCase()),
      ),
  );
}

/** One row per candidate (plus one row for a request without candidates). */
export function catalogRows(projection: ArtbenchProjection): CatalogRow[] {
  const rows: CatalogRow[] = [];
  for (const request of Object.values(projection.requests)) {
    if (request.candidateIds.length === 0) {
      rows.push({ request });
      continue;
    }
    for (const candidateId of request.candidateIds) {
      const candidate = projection.candidates[candidateId];
      if (candidate) rows.push({ request, candidate });
    }
  }
  return rows;
}

/**
 * The lane a row sits in. A request with one approved and three awaiting
 * candidates is genuinely in two lanes; the candidate decides, the request's
 * own lane is the summary for rows without candidates.
 */
export function rowLane(row: CatalogRow): RequestLane {
  if (!row.candidate) return row.request.lane;
  if (row.request.lane === "inbox") return "inbox";
  switch (row.candidate.status) {
    case "awaiting-review":
      return "needs-review";
    case "revision-requested":
      return "revision-requested";
    case "approved":
    case "integration-ready":
    case "accepted":
      return "approved-awaiting-integration";
    case "installed":
    case "in-game":
      return "in-game";
    case "rejected":
      return "history";
    default:
      return row.request.lane;
  }
}

export function filterCatalog(
  rows: readonly CatalogRow[],
  filter: CatalogFilter,
): CatalogRow[] {
  const needle = filter.text?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    if (filter.lane && filter.lane !== "all" && rowLane(row) !== filter.lane)
      return false;
    if (
      filter.status &&
      filter.status !== "all" &&
      row.candidate?.status !== filter.status
    )
      return false;
    if (filter.untagged && (!row.candidate || !isUntagged(row.candidate.tags)))
      return false;
    if (filter.tags && !tagsMatch(row.candidate, filter.tags)) return false;
    if (needle && !textOf(row).includes(needle)) return false;
    return true;
  });
}

export interface FacetCounts {
  readonly lanes: Readonly<Record<string, number>>;
  readonly statuses: Readonly<Record<string, number>>;
  readonly tags: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly untagged: number;
}

export function facetCounts(rows: readonly CatalogRow[]): FacetCounts {
  const lanes: Record<string, number> = {};
  const statuses: Record<string, number> = {};
  const tags: Record<string, Record<string, number>> = {};
  let untagged = 0;
  for (const row of rows) {
    const lane = rowLane(row);
    lanes[lane] = (lanes[lane] ?? 0) + 1;
    if (!row.candidate) continue;
    statuses[row.candidate.status] = (statuses[row.candidate.status] ?? 0) + 1;
    if (isUntagged(row.candidate.tags)) untagged += 1;
    for (const [facet, values] of Object.entries(row.candidate.tags)) {
      tags[facet] ??= {};
      for (const value of values)
        tags[facet][value] = (tags[facet][value] ?? 0) + 1;
    }
  }
  return { lanes, statuses, tags, untagged };
}

/* ------------------------------------------------------------------ */
/* Briefs and edit bundles                                             */
/* ------------------------------------------------------------------ */

const REFERENCE_ROLE_LABEL: Record<
  NonNullable<AssetRequest["target"]["styleReferences"]>[number]["role"],
  string
> = {
  "drawing-style": "DRAWING STYLE (how to render)",
  "subject-content": "SUBJECT / ARCHITECTURE (what it looks like; not style)",
  "parent-template": "PARENT TEMPLATE (variant source)",
};

function referenceLines(request: AssetRequest): string[] {
  const references = request.target.styleReferences ?? [];
  if (references.length === 0) {
    return [
      "- style reference: UNRESOLVED — no reference image is recorded on this request. The style authority above is a declaration, not supplied pixels.",
    ];
  }
  return [
    ...references.map(
      (r) =>
        `- ${REFERENCE_ROLE_LABEL[r.role]}: ${r.ref}${r.sha256 ? ` sha256 ${r.sha256}` : " (no hash recorded — unresolved)"}${r.width && r.height ? ` ${r.width}×${r.height}` : ""}${r.note ? ` — ${r.note}` : ""}`,
    ),
    "- These are DECLARED references. Record in the manifest which images you actually supplied as inputs (referenceInputs); a listed reference is not proof it was used.",
  ];
}

/** Copyable producer-ingestion brief: what to make and how to hand it back. */
export function producerBrief(
  request: AssetRequest,
  options: {
    readonly inboxHint: string;
    readonly parentCandidate?: ProjectedCandidate;
  },
): string {
  const lines = [
    `# ${request.title}`,
    ``,
    `requestId: ${request.requestId}  requestVersion: ${request.requestVersion}`,
    `assetId: ${assetIdForRequest(request)}`,
    `consumer: ${request.consumer.consumerId} (${request.consumer.runtimeComponent})`,
    `use: ${request.consumer.playerVisibleUse}`,
    ``,
    `## Target`,
    `class: ${request.target.targetClass}; minimum real width ${request.target.minimumWidth}px; aspect ${request.target.aspectRatio}; alpha ${request.target.alphaRequired ? "REQUIRED" : "not required"}; container ${request.target.container}`,
    `style authority (declared text): ${request.target.styleAuthority}`,
    ``,
    `## References`,
    ...referenceLines(request),
    ``,
    `## Must be in the picture`,
    ...request.generationRecipe.map((line) => `- ${line}`),
    ``,
    `## Acceptance`,
    ...request.acceptanceCriteria.map((line) => `- ${line}`),
  ];
  if (request.compatibility) {
    lines.push(
      ``,
      `## Compatibility (do not weaken)`,
      `environment: ${request.compatibility.environmentClass}; climate: ${request.compatibility.climate.join(", ")}; seasons: ${request.compatibility.seasons.join(", ")}; reuse regions: ${request.compatibility.allowedReuseRegions.join(", ")}; place identity: ${request.compatibility.placeIdentity.kind}`,
    );
  }
  if (options.parentCandidate) {
    lines.push(
      ``,
      `## Parent candidate`,
      `candidateId: ${options.parentCandidate.candidateId}; sha256: ${options.parentCandidate.sha256}; ${options.parentCandidate.width}×${options.parentCandidate.height} ${options.parentCandidate.container}`,
    );
  }
  lines.push(
    ``,
    `## Hand back`,
    `Deliver a complete batch folder to ${options.inboxHint}: the image files plus manifest.json written LAST, shaped as`,
    `{"batchId":"<stable id>","items":[{"itemId":"<stable per item>","file":"<name>","requestId":"${request.requestId}","requestVersion":${request.requestVersion},"parentCandidateId":null,"worker":"<who>","provider":"<tool>","model":"<model>","promptRef":"<brief ref>","createdAt":"<iso>","referenceInputs":[{"ref":"<drive:id|repo:path>","sha256":"<hex>","role":"drawing-style"}]}]}`,
    `referenceInputs lists only images actually supplied to the generator; omit it when unknown. Unknown fields may be omitted. Retries reuse the same batchId/itemId. Never publish approval; the owner decides on the bench.`,
  );
  return lines.join("\n");
}

export interface EditBundleManifest {
  readonly contractVersion: typeof ARTBENCH_CONTRACT_VERSION;
  readonly kind: "edit-bundle";
  readonly assetId: string;
  readonly requestId: string;
  readonly requestVersion: number;
  readonly parentCandidateId: string;
  readonly parentSha256: string;
  readonly parentDimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly tags: TagSet;
  readonly notes: readonly string[];
  readonly target: AssetRequest["target"];
  readonly instructions: string;
}

export function editBundleManifest(
  request: AssetRequest,
  candidate: ProjectedCandidate,
): EditBundleManifest {
  return {
    contractVersion: ARTBENCH_CONTRACT_VERSION,
    kind: "edit-bundle",
    assetId: candidate.assetId,
    requestId: request.requestId,
    requestVersion: request.requestVersion,
    parentCandidateId: candidate.candidateId,
    parentSha256: candidate.sha256,
    parentDimensions: { width: candidate.width, height: candidate.height },
    tags: candidate.tags,
    notes: candidate.decisions.map((d) => d.payload.note ?? "").filter(Boolean),
    target: request.target,
    instructions:
      "Edit the original bytes externally, then upload the result on the same card as an edited version. Identity, tags and notes are carried automatically; approval is not.",
  };
}

/** What an edit of a given kind puts at risk for measured calibration. */
export function calibrationRecheckFor(
  editKind: EditKind,
  parent: {
    readonly width: number;
    readonly height: number;
    readonly hasAlpha: boolean;
  },
  next: {
    readonly width: number;
    readonly height: number;
    readonly hasAlpha: boolean;
  },
): string[] {
  const flags: string[] = [];
  if (CALIBRATION_SENSITIVE_EDITS.includes(editKind)) {
    flags.push("floor-contact", "seat-contact", "neck-anchor", "occlusion");
  }
  const parentAspect = parent.width / parent.height;
  const nextAspect = next.width / next.height;
  if (Math.abs(parentAspect - nextAspect) > 0.005) flags.push("aspect-changed");
  if (parent.hasAlpha && !next.hasAlpha) flags.push("transparency-flattened");
  if (next.width !== parent.width || next.height !== parent.height) {
    flags.push("dimensions-changed");
  }
  return [...new Set(flags)];
}
