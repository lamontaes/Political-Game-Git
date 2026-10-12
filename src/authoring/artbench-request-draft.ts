/**
 * Request drafts for the Artbench "New request" and "Create related variant"
 * actions.
 *
 * A new request is independent: nothing is taken from whatever row happens
 * to be selected. A related variant deliberately copies the parent's
 * applicable fields and records the relationship. Only the documented
 * project-wide defaults below are shared by both.
 */

import type { AssetRequest, AssetStyleReference } from "./asset-request";

export type RequestDraftMode = "new" | "related";

/** Project-wide defaults a fresh request starts from. */
export const NEW_REQUEST_DEFAULTS = {
  targetClass: "environment-plate",
  minimumWidth: 4608,
  aspectRatio: "16:9",
  alphaRequired: false,
  container: "either",
  runtimeComponent: "none",
  /** A declaration only; it names no reference image. */
  styleAuthority: "project rendering language (no reference image recorded)",
} as const;

export interface RequestDraftFields {
  readonly requestId: string;
  readonly title: string;
  readonly use: string;
  readonly consumerId: string;
  readonly targetClass: AssetRequest["target"]["targetClass"];
  readonly minimumWidth: number;
  readonly alphaRequired: boolean;
  readonly recipe: readonly string[];
  readonly styleReferences: readonly AssetStyleReference[];
}

export interface RequestDraftParent {
  readonly request: AssetRequest;
  readonly candidateId?: string;
  readonly candidateSha256?: string;
}

/** Initial form values for a mode; "new" never reads the parent. */
export function initialDraftFields(
  mode: RequestDraftMode,
  parent: RequestDraftParent | null,
): RequestDraftFields {
  if (mode === "new" || !parent) {
    return {
      requestId: "",
      title: "",
      use: "",
      consumerId: "",
      targetClass: NEW_REQUEST_DEFAULTS.targetClass,
      minimumWidth: NEW_REQUEST_DEFAULTS.minimumWidth,
      alphaRequired: NEW_REQUEST_DEFAULTS.alphaRequired,
      recipe: [],
      styleReferences: [],
    };
  }
  const { request } = parent;
  return {
    requestId: "",
    title: "",
    use: "",
    consumerId: request.consumer.consumerId,
    targetClass: request.target.targetClass,
    minimumWidth: request.target.minimumWidth,
    alphaRequired: request.target.alphaRequired,
    recipe: [...request.generationRecipe],
    styleReferences: [
      ...(request.target.styleReferences ?? []),
      ...(parent.candidateId
        ? [
            {
              role: "parent-template" as const,
              ref: `candidate:${parent.candidateId}`,
              sha256: parent.candidateSha256,
              note: `Parent revision of ${request.requestId}.`,
            },
          ]
        : []),
    ],
  };
}

export interface RequestDraft {
  readonly request: AssetRequest;
  readonly parentRequestId?: string;
  readonly parentCandidateId?: string;
}

/** Build the request.created payload for a mode. */
export function buildRequestDraft(
  mode: RequestDraftMode,
  fields: RequestDraftFields,
  parent: RequestDraftParent | null,
  options: { readonly linkParentCandidate?: boolean } = {},
): RequestDraft {
  const requestId = fields.requestId.trim();
  const common = {
    requestId,
    requestVersion: 1,
    priority: "P2" as const,
    status: "draft" as const,
    title: fields.title.trim(),
    inventoryCheck: {
      repositoryPathsSearched: [],
      driveLocationsSearched: [],
      found: "Not yet searched.",
      shortfall: "Declared on the bench.",
    },
    generationRecipe: fields.recipe.map((l) => l.trim()).filter(Boolean),
    dependsOn: [],
  };
  const styleReferences = fields.styleReferences.filter((r) => r.ref.trim());
  if (mode === "new" || !parent) {
    return {
      request: {
        ...common,
        consumer: {
          consumerId: fields.consumerId.trim() || "unassigned",
          runtimeComponent: NEW_REQUEST_DEFAULTS.runtimeComponent,
          playerVisibleUse: fields.use.trim(),
        },
        whyNeeded: "Owner request from the bench.",
        target: {
          targetClass: fields.targetClass,
          minimumWidth: fields.minimumWidth || 1,
          aspectRatio: NEW_REQUEST_DEFAULTS.aspectRatio,
          alphaRequired: fields.alphaRequired,
          container: NEW_REQUEST_DEFAULTS.container,
          styleAuthority: NEW_REQUEST_DEFAULTS.styleAuthority,
          ...(styleReferences.length ? { styleReferences } : {}),
        },
        acceptanceCriteria: [],
      },
    };
  }
  const p = parent.request;
  return {
    request: {
      ...common,
      consumer: {
        consumerId: fields.consumerId.trim() || p.consumer.consumerId,
        runtimeComponent: p.consumer.runtimeComponent,
        playerVisibleUse: fields.use.trim(),
      },
      whyNeeded: `Related variant of ${p.requestId}.`,
      target: {
        targetClass: fields.targetClass,
        minimumWidth: fields.minimumWidth || 1,
        aspectRatio: p.target.aspectRatio,
        alphaRequired: fields.alphaRequired,
        container: p.target.container,
        styleAuthority: p.target.styleAuthority,
        ...(styleReferences.length ? { styleReferences } : {}),
      },
      acceptanceCriteria: [...p.acceptanceCriteria],
      compatibility: p.compatibility,
      scope: p.scope ? { ...p.scope, variantId: requestId } : undefined,
    },
    parentRequestId: p.requestId,
    parentCandidateId:
      options.linkParentCandidate && parent.candidateId
        ? parent.candidateId
        : undefined,
  };
}
