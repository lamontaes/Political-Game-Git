/**
 * COMPILED GENERATION / INTAKE BRIEFS.
 *
 * A brief is assembled from the request, the current style/template hashes,
 * measured plate facts, and the scene scaffold's honestly unresolved geometry.
 * It never fabricates a millimetre, treats a specified camera angle as a
 * measured proof, or treats 600×1200 standing as a mandatory native generator
 * size — that size is a fitted derivative when a parent exists.
 */

import { ART_DESK_CONTRACT_VERSION } from "./asset-compatibility";
import type { AssetCompatibilityTags } from "./asset-compatibility";
import type { AssetRequest, AssetStyleReference } from "./asset-request";
import { toCanonicalJson } from "./canonical-json";
import type { AuthoringCertainty, ScaffoldField } from "./scene-scaffold";

export const STANDING_FITTED_DERIVATIVE = {
  width: 600,
  height: 1200,
  role: "fitted-derivative",
  notNativeGeneratorRequirement: true,
} as const;

export interface BriefPixelRef {
  readonly role:
    | "style-authority"
    | "subject-content"
    | "template"
    | "parent-master"
    | "derivative";
  readonly pathOrDriveId: string;
  readonly sha256?: string;
  readonly nativeWidth?: number;
  readonly nativeHeight?: number;
  readonly nativeDetail?: "native" | "declared-upscale" | "unverified";
  readonly missingReason?: string;
  /**
   * "declared": a real image id/path with its hash is recorded on the
   * request. "unresolved": only text or an id without a hash. Neither says
   * the image was actually supplied to a generator.
   */
  readonly resolution?: "declared" | "unresolved";
}

const REFERENCE_ROLE: Record<
  AssetStyleReference["role"],
  BriefPixelRef["role"]
> = {
  "drawing-style": "style-authority",
  "subject-content": "subject-content",
  "parent-template": "parent-master",
};

/**
 * The request's reference images as brief entries. Without explicit
 * references, the style-authority text is carried as an unresolved
 * declaration rather than treated as supplied pixels.
 */
export function requestReferencePixels(
  request: Pick<AssetRequest, "target">,
): BriefPixelRef[] {
  const explicit = request.target.styleReferences ?? [];
  if (explicit.length === 0) {
    return [
      {
        role: "style-authority",
        pathOrDriveId: request.target.styleAuthority,
        nativeDetail: "unverified",
        resolution: "unresolved",
        missingReason:
          "No reference image is recorded on this request; the style authority is a text declaration, not supplied pixels.",
      },
    ];
  }
  return explicit.map((reference) => ({
    role: REFERENCE_ROLE[reference.role],
    pathOrDriveId: reference.ref,
    sha256: reference.sha256,
    nativeWidth: reference.width,
    nativeHeight: reference.height,
    nativeDetail: "unverified",
    resolution: reference.sha256 ? "declared" : "unresolved",
    missingReason: reference.sha256
      ? undefined
      : "No hash is recorded for this reference image.",
  }));
}

export interface BriefGeometryField {
  readonly name: string;
  readonly certainty: AuthoringCertainty;
  readonly value?: string;
  readonly reason?: string;
}

export interface CompiledAssetBrief {
  readonly contractVersion: typeof ART_DESK_CONTRACT_VERSION;
  readonly requestId: string;
  readonly requestVersion: number;
  readonly consumerId: string;
  readonly familyId?: string;
  readonly variantId?: string;
  readonly intendedContext?: string;
  readonly stylePixels: readonly BriefPixelRef[];
  readonly masterDimensions?: {
    readonly width: number;
    readonly height: number;
    readonly nativeDetail: "native" | "declared-upscale" | "unverified";
  };
  readonly derivativeNote: string;
  readonly camera: BriefGeometryField;
  readonly coordinateConvention: BriefGeometryField;
  readonly bodyPoseFamilies: readonly string[];
  readonly contacts: readonly BriefGeometryField[];
  readonly stagingAndSafeAreas: readonly BriefGeometryField[];
  readonly dynamicSurfaces: readonly string[];
  readonly alphaRequired: boolean;
  readonly layerRequirements: readonly string[];
  readonly importPreviewChecks: readonly string[];
  readonly compatibility?: AssetCompatibilityTags;
  readonly sourceHashes: readonly string[];
  readonly generationHold?: string;
}

function fieldFromScaffold(
  name: string,
  field: ScaffoldField<unknown> | undefined,
): BriefGeometryField {
  if (!field) {
    return {
      name,
      certainty: "UNKNOWN",
      reason: "No scaffold field has been authored yet.",
    };
  }
  if (field.state === "unresolved") {
    return { name, certainty: field.certainty, reason: field.reason };
  }
  return {
    name,
    certainty: field.certainty,
    value:
      typeof field.value === "string"
        ? field.value
        : JSON.stringify(field.value),
  };
}

export interface BriefInputs {
  readonly request: AssetRequest;
  readonly stylePixels: readonly BriefPixelRef[];
  readonly scaffold?: {
    readonly camera?: ScaffoldField<unknown>;
    readonly coordinateConvention?: ScaffoldField<unknown>;
    readonly floor?: ScaffoldField<unknown>;
    readonly seat?: ScaffoldField<unknown>;
    readonly foot?: ScaffoldField<unknown>;
    readonly hand?: ScaffoldField<unknown>;
    readonly occlusion?: ScaffoldField<unknown>;
    readonly uiSafe?: ScaffoldField<unknown>;
  };
  readonly bodyPoseFamilies?: readonly string[];
  readonly dynamicSurfaces?: readonly string[];
  readonly layerRequirements?: readonly string[];
  readonly masterDimensions?: CompiledAssetBrief["masterDimensions"];
}

export function compileAssetBrief(inputs: BriefInputs): CompiledAssetBrief {
  const { request } = inputs;
  const sourceHashes = inputs.stylePixels
    .map((pixel) => pixel.sha256)
    .filter((hash): hash is string => typeof hash === "string");
  return {
    contractVersion: ART_DESK_CONTRACT_VERSION,
    requestId: request.requestId,
    requestVersion: request.requestVersion,
    consumerId: request.consumer.consumerId,
    familyId: request.scope?.familyId,
    variantId: request.scope?.variantId,
    intendedContext: request.scope?.intendedContext,
    stylePixels: inputs.stylePixels,
    masterDimensions: inputs.masterDimensions,
    derivativeNote:
      "Prepared standing 600×1200 is a fitted derivative when a parent exists, not a mandatory native image-generator size for every request.",
    camera: fieldFromScaffold(
      "camera-axes-orientation",
      inputs.scaffold?.camera,
    ),
    coordinateConvention: fieldFromScaffold(
      "normalized-image-space",
      inputs.scaffold?.coordinateConvention,
    ),
    bodyPoseFamilies: inputs.bodyPoseFamilies ?? [],
    contacts: [
      fieldFromScaffold("floor-contact", inputs.scaffold?.floor),
      fieldFromScaffold("seat-contact", inputs.scaffold?.seat),
      fieldFromScaffold("foot-contact", inputs.scaffold?.foot),
      fieldFromScaffold("hand-contact", inputs.scaffold?.hand),
    ],
    stagingAndSafeAreas: [
      fieldFromScaffold("occlusion", inputs.scaffold?.occlusion),
      fieldFromScaffold("ui-safe-area", inputs.scaffold?.uiSafe),
    ],
    dynamicSurfaces: inputs.dynamicSurfaces ?? [],
    alphaRequired: request.target.alphaRequired,
    layerRequirements: inputs.layerRequirements ?? [],
    importPreviewChecks: [
      "Magic bytes and real dimensions, never the filename.",
      "Hash the preserved original before any crop, alpha or tier derive.",
      "Preview must not write a player save.",
      "Replaced bytes lose any prior exact-hash approval.",
    ],
    compatibility: request.compatibility,
    sourceHashes,
    generationHold: request.generationHold,
  };
}

export function briefContractHash(brief: CompiledAssetBrief): string {
  return toCanonicalJson({
    contractVersion: brief.contractVersion,
    requestId: brief.requestId,
    requestVersion: brief.requestVersion,
    compatibility: brief.compatibility ?? null,
    camera: brief.camera,
    contacts: brief.contacts,
    bodyPoseFamilies: brief.bodyPoseFamilies,
  });
}

/**
 * The style references a request is actually judged against. Environment and
 * mask requests name their own style authority; only people requests draw on
 * the private character pack, and even then the pack's state comes from the
 * server receipt, never from a guessed path.
 */
export function styleReferencesFor(
  request: Pick<AssetRequest, "requestId" | "target">,
  pack: {
    readonly status: string;
    readonly note: string;
    readonly packId?: string;
    readonly manifestSha256?: string;
  },
): readonly BriefPixelRef[] {
  const references = requestReferencePixels(request);
  if (!request.requestId.startsWith("person-")) {
    return references;
  }
  const template: BriefPixelRef =
    pack.status === "verified" && pack.packId
      ? {
          role: "template",
          pathOrDriveId: pack.packId,
          sha256: pack.manifestSha256,
          nativeDetail: "unverified",
        }
      : {
          role: "template",
          pathOrDriveId: "PG_PRIVATE_ART_PACK",
          missingReason: pack.note,
        };
  return [...references, template];
}

export function privatePackInputState(
  supplied: { readonly path?: string; readonly sha256?: string } | null,
): BriefPixelRef {
  if (!supplied?.path) {
    return {
      role: "template",
      pathOrDriveId: "PG_PRIVATE_ART_PACK",
      missingReason:
        "Authorized private MODULAR41 pack was not supplied to this worktree. That is an access/input problem, not proof the asset is absent.",
    };
  }
  return {
    role: "template",
    pathOrDriveId: supplied.path,
    sha256: supplied.sha256,
    nativeDetail: "unverified",
  };
}
