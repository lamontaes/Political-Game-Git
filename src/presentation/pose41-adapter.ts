import { posePacks as bundledPacks } from "./bundled-art";
import { poseUrls as urls } from "./bundled-art";
import type { CharacterComponentKind } from "./character-components";
import { runtimeArt, runtimeArtUrls } from "./runtime-art";

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

// The original and repaired-identity pose packs describe owner-private pose art
// and are absent from a public checkout; the bank is then empty and every
// request refuses as pose-fit-missing.

const packs = {
  ...bundledPacks,
  ...Object.fromEntries(
    Object.entries(runtimeArt()?.metadata ?? {})
      .filter(([name]) => name.endsWith("pack.json"))
      .map(([name, value]) => [
        `../../${name}`,
        value as { readonly variants: readonly unknown[] },
      ]),
  ),
};
export const POSE41_VARIANTS = Object.values(packs).flatMap(
  (pack) => pack.variants ?? [],
) as readonly Pose41Variant[];

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
    runtimeArtUrls()[path] ?? urls[`../../${path}`],
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
