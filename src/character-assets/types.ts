/**
 * Opaque IDs for distinct asset types to ensure type safety.
 */
export type AssetLibraryVersion = `lib_v${number}`;
export type BodyFamilyId = `body_family_${string}`;
export type HeadFamilyId = `head_family_${string}`;
export type HeadAssetId = `head_${string}`;
export type HairFamilyId = `hair_family_${string}`;
export type HairAssetId = `hair_asset_${string}`;
export type FacialHairAssetId = `facial_hair_${string}`;
export type WardrobeAssetId = `wardrobe_${string}`;
export type PoseFamilyId = `pose_family_${string}`;
export type PoseAssetId = `pose_asset_${string}`;
export type SceneAnchorClass = `anchor_${string}`;

export type AgeState = "young_adult" | "adult" | "senior";

/**
 * Geometric and stylistic metadata for bodies.
 */
export interface BodyFamilyAsset {
  readonly id: BodyFamilyId;
  readonly shoulderWidthBand: "narrow" | "average" | "broad";
  readonly statureBand: "short" | "average" | "tall";
  readonly supportedPoseFamilies: readonly PoseFamilyId[];
  readonly provenanceRef: string;
}

/**
 * A head family groups persistent facial identities across ages.
 */
export interface HeadFamilyAsset {
  readonly id: HeadFamilyId;
  readonly compatibleBodyFamilies: readonly BodyFamilyId[];
}

export interface HeadAsset {
  readonly id: HeadAssetId;
  readonly familyId: HeadFamilyId;
  readonly ageState: AgeState;
  readonly provenanceRef: string;
}

/**
 * A hair family groups persistent hair identity (e.g. natural curl pattern/base style) across age states.
 */
export interface HairFamilyAsset {
  readonly id: HairFamilyId;
  readonly compatibleHeadFamilies: readonly HeadFamilyId[];
}

export interface HairAsset {
  readonly id: HairAssetId;
  readonly familyId: HairFamilyId;
  readonly ageState: AgeState;
  readonly provenanceRef: string;
}

/**
 * Compatibility rules for a wardrobe piece.
 */
export interface WardrobeAsset {
  readonly id: WardrobeAssetId;
  readonly compatibleBodyFamilies: readonly BodyFamilyId[];
  // e.g. ["formal", "casual"]
  readonly tags: readonly string[];
  readonly provenanceRef: string;
}

export interface PoseAsset {
  readonly id: PoseAssetId;
  readonly familyId: PoseFamilyId;
  readonly compatibleSceneAnchors: readonly SceneAnchorClass[];
  readonly provenanceRef: string;
}

/**
 * The permanent appearance recipe for an individual, isolated from age and wardrobe.
 */
export interface PersistentAppearanceRecipe {
  readonly identitySeed: string;
  readonly libraryVersion: AssetLibraryVersion;

  readonly bodyFamilyId: BodyFamilyId;
  readonly headFamilyId: HeadFamilyId;
  readonly hairFamilyId: HairFamilyId | null; // e.g. permanently bald
}

/**
 * The context in which an outfit is evaluated (e.g. current simulation age, formality needs).
 */
export interface WardrobeContext {
  readonly ageState: AgeState;
  readonly requiredTags: readonly string[];
}

/**
 * A fully resolved contextual appearance for a specific scene or snapshot in time.
 */
export interface ResolvedOutfitRecipe {
  readonly identitySeed: string;
  readonly libraryVersion: AssetLibraryVersion;

  readonly bodyFamilyId: BodyFamilyId;
  readonly headAssetId: HeadAssetId;
  readonly hairAssetId: HairAssetId | null;
  readonly wardrobeAssetId: WardrobeAssetId;
  readonly poseAssetId: PoseAssetId;
}

/**
 * A synthetic Asset Library interface for resolution.
 */
export interface CharacterAssetLibrary {
  readonly version: AssetLibraryVersion;
  readonly bodyFamilies: readonly BodyFamilyAsset[];
  readonly headFamilies: readonly HeadFamilyAsset[];
  readonly headAssets: readonly HeadAsset[];
  readonly hairFamilies: readonly HairFamilyAsset[];
  readonly hairAssets: readonly HairAsset[];
  readonly wardrobeAssets: readonly WardrobeAsset[];
  readonly poses: readonly PoseAsset[];
}
