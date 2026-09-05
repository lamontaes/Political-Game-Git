import type { AssetTargetClass } from "./asset-lineage";

/**
 * A MISSING PICTURE, WRITTEN DOWN SO SOMEBODY CAN MAKE IT.
 *
 * Every gap in this project has previously been recorded as a sentence in a
 * report. Sentences do not reconcile: nobody can ask a paragraph whether the
 * thing it wants already exists, and by the time a report is read half of what
 * it asks for has arrived under a different name. This module is the durable
 * form of that ask.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not hold prompts, model names or
 * generator settings as identity. `generationRecipe` says what the picture must
 * contain in words any tool could be driven by; `generatorParameters` is an
 * ephemeral scratch field, and the validator refuses to let anything from it
 * become the request's name.
 *
 * THE SEED INVARIANT. A diffusion seed may be recorded as provenance. It may
 * never be an asset's identity. A seed names one roll of one model's dice: it
 * survives no model upgrade, describes nothing about what the picture is for,
 * and cannot be searched for by anybody trying to find out whether the asset
 * already exists. `requestId` must be a semantic slug, and `validateAssetRequests`
 * rejects one that is a bare number or hex digest.
 *
 * WHAT LIVES ELSEWHERE, ON PURPOSE. The return path — what happens when a
 * candidate arrives — is already built: `asset-lineage.ts` measures a candidate
 * and issues a disposition, and `asset-bank.ts` records the verification with
 * its hash, container, dimensions, transparency, style-family judgement and
 * artifact flags. Adding a second verification record here would give the
 * project two answers to "was this accepted", so this module stops at the ask
 * and points at those for the answer.
 */

export type AssetRequestPriority = "P0" | "P1" | "P2";

/**
 * The lifecycle, which is deliberately longer at the front than at the back. A
 * request spends most of its life before anything is generated, and the states
 * that matter most are the ones that stop a generation happening twice.
 */
export type AssetRequestStatus =
  | "draft"
  | "queued"
  | "prompting"
  | "generating"
  | "candidate-submitted"
  | "intake-evaluating"
  | "accepted-promoted"
  | "revision-requested"
  | "rejected"
  /** Reconciled away: the thing asked for turned out to already exist. */
  | "withdrawn-already-covered";

export const ASSET_REQUEST_STATUSES: readonly AssetRequestStatus[] = [
  "draft",
  "queued",
  "prompting",
  "generating",
  "candidate-submitted",
  "intake-evaluating",
  "accepted-promoted",
  "revision-requested",
  "rejected",
  "withdrawn-already-covered",
];

/** Statuses that are finished. Each one has to say how it finished. */
export const TERMINAL_ASSET_REQUEST_STATUSES: readonly AssetRequestStatus[] = [
  "accepted-promoted",
  "rejected",
  "withdrawn-already-covered",
];

export interface AssetRequestConsumer {
  /** Matches a `SceneConsumerDeclaration.consumerId` when one exists. */
  readonly consumerId: string;
  /** The file a reviewer opens to see the gap. "none" when nothing exists. */
  readonly runtimeComponent: string;
  /** What a player would be doing when they saw it. */
  readonly playerVisibleUse: string;
}

/**
 * What was searched before asking for a new picture.
 *
 * Required, and required to be specific. A request that skips this step is how
 * a project commissions a second copy of something it already owns, which has
 * happened here often enough to be worth a schema field.
 */
export interface AssetRequestInventoryCheck {
  readonly repositoryPathsSearched: readonly string[];
  readonly driveLocationsSearched: readonly string[];
  /** What was actually found, including "nothing". */
  readonly found: string;
  /** Why what was found does not answer this request. */
  readonly shortfall: string;
}

export interface AssetRequestTarget {
  readonly targetClass: AssetTargetClass;
  /** The floor a delivered file must clear, in pixels of real width. */
  readonly minimumWidth: number;
  readonly aspectRatio: string;
  /** True when the delivered file must carry real per-pixel transparency. */
  readonly alphaRequired: boolean;
  readonly container: "png" | "jpeg" | "either";
  /** The approved reference a delivery is judged against for style. */
  readonly styleAuthority: string;
}

export interface AssetRequest {
  /** A stable semantic slug. Never a seed, a hash or a generator id. */
  readonly requestId: string;
  readonly requestVersion: number;
  readonly priority: AssetRequestPriority;
  readonly status: AssetRequestStatus;
  /** One line, in the terms an art brief would use. */
  readonly title: string;
  readonly consumer: AssetRequestConsumer;
  readonly whyNeeded: string;
  readonly inventoryCheck: AssetRequestInventoryCheck;
  readonly target: AssetRequestTarget;
  /** Generator-independent. What must be in the picture, not how to prompt it. */
  readonly generationRecipe: readonly string[];
  /** Ephemeral, provenance only. Never identity, never reconciled against. */
  readonly generatorParameters?: Readonly<Record<string, string>>;
  readonly acceptanceCriteria: readonly string[];
  /** Other request ids that must land first. */
  readonly dependsOn: readonly string[];
  /** Requests this one replaces, so a reconciled queue keeps its history. */
  readonly supersedes?: readonly string[];
  /** Required on a terminal status: how it ended, and where the thing is now. */
  readonly resolutionNote?: string;
}

export const ASSET_REQUEST_DOCUMENT_VERSION = 1 as const;

export interface AssetRequestDocument {
  readonly documentVersion: typeof ASSET_REQUEST_DOCUMENT_VERSION;
  readonly generatedFrom: string;
  readonly requests: readonly AssetRequest[];
}

export type AssetRequestFindingCode =
  | "unknown-status"
  | "duplicate-request-id"
  | "seed-shaped-request-id"
  | "non-semantic-request-id"
  | "terminal-without-resolution"
  | "open-with-resolution"
  | "empty-inventory-check"
  | "empty-generation-recipe"
  | "empty-acceptance-criteria"
  | "unknown-dependency"
  | "unknown-superseded-request"
  | "generator-parameter-in-identity"
  | "non-positive-minimum-width"
  | "non-positive-request-version";

export interface AssetRequestFinding {
  readonly code: AssetRequestFindingCode;
  readonly severity: "error" | "warning";
  readonly requestId: string;
  readonly message: string;
}

export interface AssetRequestValidation {
  readonly valid: boolean;
  readonly findings: readonly AssetRequestFinding[];
}

/** A bare number, or something that reads as a digest, is not a name. */
const SEED_SHAPED = /^(?:seed[-_]?)?\d{4,}$/i;
const DIGEST_SHAPED = /^[0-9a-f]{16,}$/i;
/** A name has at least two words in it, joined by hyphens. */
const SEMANTIC_SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

export function validateAssetRequests(
  requests: readonly AssetRequest[],
): AssetRequestValidation {
  const findings: AssetRequestFinding[] = [];
  const seen = new Set<string>();
  const known = new Set(requests.map((request) => request.requestId));

  const error = (
    code: AssetRequestFindingCode,
    requestId: string,
    message: string,
  ) => findings.push({ code, severity: "error", requestId, message });

  for (const request of requests) {
    const { requestId } = request;

    if (seen.has(requestId)) {
      error(
        "duplicate-request-id",
        requestId,
        `Two requests share the id '${requestId}'. An id is how a gap is reconciled; two of them is two gaps.`,
      );
    }
    seen.add(requestId);

    if (SEED_SHAPED.test(requestId) || DIGEST_SHAPED.test(requestId)) {
      error(
        "seed-shaped-request-id",
        requestId,
        `'${requestId}' reads as a generator seed or digest. A seed names one roll of one model's dice: it survives no model change and cannot be searched for. Identity is semantic.`,
      );
    } else if (!SEMANTIC_SLUG.test(requestId)) {
      error(
        "non-semantic-request-id",
        requestId,
        `'${requestId}' is not a lowercase hyphenated slug of at least two words. A one-word id is not searchable and will collide.`,
      );
    }

    if (!ASSET_REQUEST_STATUSES.includes(request.status)) {
      error(
        "unknown-status",
        requestId,
        `Status '${request.status}' is not a lifecycle state.`,
      );
    }

    const terminal = TERMINAL_ASSET_REQUEST_STATUSES.includes(request.status);
    if (terminal && !request.resolutionNote?.trim()) {
      error(
        "terminal-without-resolution",
        requestId,
        `Status '${request.status}' is finished and must say how it finished and where the asset is now.`,
      );
    }
    if (!terminal && request.resolutionNote?.trim()) {
      findings.push({
        code: "open-with-resolution",
        severity: "warning",
        requestId,
        message: `An open request carries a resolution note. Either it is finished, or the note belongs in the inventory check.`,
      });
    }

    const check = request.inventoryCheck;
    if (
      check.repositoryPathsSearched.length === 0 &&
      check.driveLocationsSearched.length === 0
    ) {
      error(
        "empty-inventory-check",
        requestId,
        `Nothing was searched before this was asked for. Commissioning art the project already owns is the failure this field exists to stop.`,
      );
    }

    if (request.generationRecipe.length === 0) {
      error(
        "empty-generation-recipe",
        requestId,
        `A request with no recipe cannot be worked by anyone but its author.`,
      );
    }
    if (request.acceptanceCriteria.length === 0) {
      error(
        "empty-acceptance-criteria",
        requestId,
        `Without acceptance criteria there is no way to say a delivery is wrong.`,
      );
    }

    for (const [key, value] of Object.entries(
      request.generatorParameters ?? {},
    )) {
      if (value.length > 0 && requestId.includes(value.toLowerCase())) {
        error(
          "generator-parameter-in-identity",
          requestId,
          `The generator parameter '${key}' appears inside the request id. Generator settings are provenance and are not identity.`,
        );
      }
    }

    if (
      !Number.isInteger(request.requestVersion) ||
      request.requestVersion < 1
    ) {
      error(
        "non-positive-request-version",
        requestId,
        `requestVersion must be a positive integer.`,
      );
    }
    if (
      !Number.isInteger(request.target.minimumWidth) ||
      request.target.minimumWidth <= 0
    ) {
      error(
        "non-positive-minimum-width",
        requestId,
        `A target with no real minimum width cannot be measured on delivery.`,
      );
    }

    for (const dependency of request.dependsOn) {
      if (!known.has(dependency)) {
        error(
          "unknown-dependency",
          requestId,
          `Depends on '${dependency}', which is not a request in this queue.`,
        );
      }
    }
    for (const superseded of request.supersedes ?? []) {
      if (!known.has(superseded)) {
        findings.push({
          code: "unknown-superseded-request",
          severity: "warning",
          requestId,
          message: `Supersedes '${superseded}', which is not in this queue. History is easier to follow when the replaced record stays.`,
        });
      }
    }
  }

  return {
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}

/** Requests that still want something. Terminal states are excluded. */
export function openAssetRequests(
  requests: readonly AssetRequest[],
): readonly AssetRequest[] {
  return requests.filter(
    (request) => !TERMINAL_ASSET_REQUEST_STATUSES.includes(request.status),
  );
}

export interface AssetRequestSummary {
  readonly total: number;
  readonly open: number;
  readonly byPriority: Readonly<Record<AssetRequestPriority, number>>;
  readonly byStatus: Readonly<Partial<Record<AssetRequestStatus, number>>>;
}

export function summarizeAssetRequests(
  requests: readonly AssetRequest[],
): AssetRequestSummary {
  const byStatus: Partial<Record<AssetRequestStatus, number>> = {};
  const byPriority: Record<AssetRequestPriority, number> = {
    P0: 0,
    P1: 0,
    P2: 0,
  };
  for (const request of requests) {
    byStatus[request.status] = (byStatus[request.status] ?? 0) + 1;
    if (!TERMINAL_ASSET_REQUEST_STATUSES.includes(request.status)) {
      byPriority[request.priority] += 1;
    }
  }
  return {
    total: requests.length,
    open: openAssetRequests(requests).length,
    byPriority,
    byStatus,
  };
}
