import type { CharacterComponentKind } from "./character-components";
import { optionalGlob } from "./optional-glob";

export type Pose41Pose = "standing-listening" | "seated-guest-neutral";
export interface Pose41Point {
  readonly x: number;
  readonly y: number;
}
export interface Pose41Layer {
  readonly assetId: string;
  readonly kind: CharacterComponentKind;
  readonly layer: number;
  readonly path: string;
  readonly sha256: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface Pose41Variant {
  readonly id: string;
  readonly family: string;
  readonly pose: Pose41Pose;
  readonly facing: "front";
  readonly sourceBodyAssetIds: readonly string[];
  readonly sourceHeadAssetIds: readonly string[];
  readonly sourceHairAssetIds: readonly (string | null)[];
  readonly outfitAssetIds: readonly string[];
  readonly canvas: { readonly width: number; readonly height: number };
  readonly standingReference: {
    readonly canvas: { readonly width: number; readonly height: number };
    readonly crownY: number;
    readonly soleY: number;
    readonly sourceScale: number;
  };
  readonly poseSourceScale: number;
  readonly contacts: {
    readonly crown: Pose41Point;
    readonly seatedPelvis?: Pose41Point;
    readonly leftFoot: Pose41Point;
    readonly rightFoot: Pose41Point;
  };
  readonly alphaBounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly contactUncertaintyPixels: number;
  readonly confidence: "visual-estimate";
  readonly humanAcceptance: "pending";
  readonly layers: readonly Pose41Layer[];
}
export interface Pose41Request {
  readonly pose: Pose41Pose;
  readonly bodyAssetId: string;
  readonly headAssetId: string;
  readonly hairAssetId: string | null;
  /** Exact rendered garment components, including collar/accessory layers. */
  readonly outfitAssetIds: readonly string[];
  readonly candidatePreview: boolean;
}
export type Pose41Resolution =
  | {
      readonly status: "ready";
      readonly variantId: string;
      readonly pose: Pose41Pose;
      readonly facing: "front";
      readonly canvas: Pose41Variant["canvas"];
      readonly standingReference: Pose41Variant["standingReference"];
      readonly poseSourceScale: number;
      readonly contacts: Pose41Variant["contacts"];
      readonly alphaBounds: Pose41Variant["alphaBounds"];
      readonly contactUncertaintyPixels: number;
      readonly confidence: "visual-estimate";
      readonly humanAcceptance: "pending";
      readonly layers: readonly (Pose41Layer & { readonly url: string })[];
    }
  | {
      readonly status: "unavailable";
      readonly reason:
        | "private-preview-required"
        | "pose-fit-missing"
        | "pose-source-unavailable";
    };

const urls = optionalGlob(() =>
  import.meta.glob<string>("../../art/generated/candidates/pose41/*.png", {
    eager: true,
    query: "?url",
    import: "default",
  }),
);
// The original and repaired-identity pose packs describe owner-private pose art
// and are absent from a public checkout; the bank is then empty and every
// request refuses as pose-fit-missing.
const packs = optionalGlob(() =>
  import.meta.glob<{ readonly variants: readonly unknown[] }>(
    [
      "../../art/authoring/pose41/pack.json",
      "../../art/authoring/modular41-head-v2/pose-pack.json",
      "../../art/authoring/modular45/pose-pack.json",
      "../../art/authoring/systemic-repair/pose-pack.json",
    ],
    { eager: true, import: "default" },
  ),
);
export const POSE41_VARIANTS = [
  ...(packs["../../art/authoring/pose41/pack.json"]?.variants ?? []),
  ...(packs["../../art/authoring/modular41-head-v2/pose-pack.json"]?.variants ??
    []),
  // MODULAR45 generation 13: every corrected face x hairstyle (and no hair).
  ...(packs["../../art/authoring/modular45/pose-pack.json"]?.variants ?? []),
  ...(packs["../../art/authoring/systemic-repair/pose-pack.json"]?.variants ??
    []),
] as unknown as readonly Pose41Variant[];
const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));

/**
 * Pure, private source-pixel adapter. No World, clock, selection or Talk input.
 * Logical identities/outfits never change. G owns placement, occupancy, scale,
 * occlusion and any explicitly valid standing fallback after a refusal.
 */
export function resolvePose41(
  request: Pose41Request,
  bank: readonly Pose41Variant[] = POSE41_VARIANTS,
  urlForPath: (path: string) => string | undefined = (path) =>
    urls[`../../${path}`],
): Pose41Resolution {
  if (!request.candidatePreview)
    return { status: "unavailable", reason: "private-preview-required" };
  const variant = bank.find(
    (v) =>
      v.pose === request.pose &&
      v.sourceBodyAssetIds.includes(request.bodyAssetId) &&
      v.sourceHeadAssetIds.includes(request.headAssetId) &&
      v.sourceHairAssetIds.includes(request.hairAssetId) &&
      sameSet(v.outfitAssetIds, request.outfitAssetIds),
  );
  if (!variant) return { status: "unavailable", reason: "pose-fit-missing" };
  const layers = variant.layers.map((layer) => ({
    ...layer,
    url: urlForPath(layer.path),
  }));
  if (layers.some((layer) => !layer.url))
    return { status: "unavailable", reason: "pose-source-unavailable" };
  return {
    status: "ready",
    variantId: variant.id,
    pose: variant.pose,
    facing: variant.facing,
    canvas: variant.canvas,
    standingReference: variant.standingReference,
    poseSourceScale: variant.poseSourceScale,
    contacts: variant.contacts,
    alphaBounds: variant.alphaBounds,
    contactUncertaintyPixels: variant.contactUncertaintyPixels,
    confidence: variant.confidence,
    humanAcceptance: variant.humanAcceptance,
    layers: layers as readonly (Pose41Layer & { readonly url: string })[],
  };
}
