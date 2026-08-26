import { selectDeterministically } from "./hash";
import type {
  CharacterAssetLibrary,
  PersistentAppearanceRecipe,
  ResolvedOutfitRecipe,
  WardrobeContext,
  SceneAnchorClass
} from "./types";
import {
  getCompatibleHeadFamilies,
  getCompatibleHairs,
  getCompatibleHeadAssets,
  getCompatibleWardrobes,
  getCompatiblePoses
} from "./compatibility";

/**
 * Resolves the immutable core identity recipe for a person.
 * This should be done once when the person is created or when the library version changes.
 */
export function resolvePersistentAppearance(
  identitySeed: string,
  library: CharacterAssetLibrary
): PersistentAppearanceRecipe {
  // 1. Select Body Family
  const bodyFamily = selectDeterministically(
    library.bodyFamilies,
    identitySeed,
    library.version,
    "body",
    (b) => b.id
  );

  // 2. Select Head Family compatible with body
  const compatibleHeadFamilies = getCompatibleHeadFamilies(library, bodyFamily.id);
  const headFamily = selectDeterministically(
    compatibleHeadFamilies,
    identitySeed,
    library.version,
    "head_family",
    (h) => h.id
  );

  // 3. Select Hair (or bald)
  // We represent "bald" or "no hair asset" by allowing null.
  // Let's create a null option by injecting it into the selection pool if desired,
  // or just pick from compatible hairs + a null option.
  const compatibleHairs = getCompatibleHairs(library, headFamily.id);
  const hairOptions = [...compatibleHairs, null];

  const selectedHair = selectDeterministically(
    hairOptions,
    identitySeed,
    library.version,
    "hair",
    (h) => h ? h.id : "hair_null"
  );

  return {
    identitySeed,
    libraryVersion: library.version,
    bodyFamilyId: bodyFamily.id,
    headFamilyId: headFamily.id,
    hairAssetId: selectedHair ? selectedHair.id : null,
  };
}

/**
 * Resolves a contextual outfit based on the permanent identity and environmental factors.
 */
export function resolveContextualOutfit(
  recipe: PersistentAppearanceRecipe,
  context: WardrobeContext,
  anchorClass: SceneAnchorClass,
  library: CharacterAssetLibrary
): ResolvedOutfitRecipe {

  if (recipe.libraryVersion !== library.version) {
    throw new Error(`Recipe library version ${recipe.libraryVersion} does not match current library ${library.version}`);
  }

  // 1. Select Age-Specific Head Asset for the Head Family
  const compatibleHeads = getCompatibleHeadAssets(library, recipe.headFamilyId, context.ageState);
  const headAsset = selectDeterministically(
    compatibleHeads,
    recipe.identitySeed,
    library.version,
    `head_asset_${context.ageState}`, // Use age state in channel so different ages can pick different variants deterministically if multiple exist
    (h) => h.id
  );

  // 2. Select Wardrobe compatible with body and context tags
  const compatibleWardrobes = getCompatibleWardrobes(library, recipe.bodyFamilyId, context.requiredTags);
  const wardrobe = selectDeterministically(
    compatibleWardrobes,
    recipe.identitySeed,
    library.version,
    `wardrobe_${context.requiredTags.join("_")}`, // Contextual channel
    (w) => w.id
  );

  // 3. Select Pose compatible with body and scene anchor
  const compatiblePoses = getCompatiblePoses(library, recipe.bodyFamilyId, anchorClass);
  const pose = selectDeterministically(
    compatiblePoses,
    recipe.identitySeed,
    library.version,
    `pose_${anchorClass}`,
    (p) => p.id
  );

  return {
    identitySeed: recipe.identitySeed,
    libraryVersion: recipe.libraryVersion,
    bodyFamilyId: recipe.bodyFamilyId,
    headAssetId: headAsset.id,
    hairAssetId: recipe.hairAssetId,
    wardrobeAssetId: wardrobe.id,
    poseFamilyId: pose.id,
  };
}
