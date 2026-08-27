import { selectDeterministically } from "./hash";
import type {
  CharacterAssetLibrary,
  PersistentAppearanceRecipe,
  ResolvedOutfitRecipe,
  WardrobeContext,
  SceneAnchorClass,
} from "./types";
import {
  getCompatibleHeadFamilies,
  getCompatibleHeadAssets,
  getCompatibleWardrobes,
  getCompatiblePoses,
} from "./compatibility";

/**
 * Resolves the immutable core identity recipe for a person.
 * This should be done once when the person is created or when the library version changes.
 */
export function resolvePersistentAppearance(
  identitySeed: string,
  library: CharacterAssetLibrary,
): PersistentAppearanceRecipe {
  // 1. Select Body Family
  const bodyFamily = selectDeterministically(
    library.bodyFamilies,
    identitySeed,
    library.version,
    "body",
    (b) => b.id,
  );

  // 2. Select Head Family compatible with body
  const compatibleHeadFamilies = getCompatibleHeadFamilies(
    library,
    bodyFamily.id,
  );
  const headFamily = selectDeterministically(
    compatibleHeadFamilies,
    identitySeed,
    library.version,
    "head_family",
    (h) => h.id,
  );

  // 3. Select Hair Family (or bald)
  // We represent "bald" or "no hair" by allowing null.
  const compatibleHairFamilies = library.hairFamilies.filter((h) =>
    h.compatibleHeadFamilies.includes(headFamily.id),
  );
  const hairFamilyOptions = [...compatibleHairFamilies, null];

  const selectedHairFamily = selectDeterministically(
    hairFamilyOptions,
    identitySeed,
    library.version,
    "hair_family",
    (h) => (h ? h.id : "hair_null"),
  );

  return {
    identitySeed,
    libraryVersion: library.version,
    bodyFamilyId: bodyFamily.id,
    headFamilyId: headFamily.id,
    hairFamilyId: selectedHairFamily ? selectedHairFamily.id : null,
  };
}

/**
 * Resolves a contextual outfit based on the permanent identity and environmental factors.
 */
export function resolveContextualOutfit(
  recipe: PersistentAppearanceRecipe,
  context: WardrobeContext,
  anchorClass: SceneAnchorClass,
  library: CharacterAssetLibrary,
): ResolvedOutfitRecipe {
  if (recipe.libraryVersion !== library.version) {
    throw new Error(
      `Recipe library version ${recipe.libraryVersion} does not match current library ${library.version}`,
    );
  }

  // 1. Select Age-Specific Head Asset for the Head Family
  const compatibleHeads = getCompatibleHeadAssets(
    library,
    recipe.headFamilyId,
    context.ageState,
  );
  const headAsset = selectDeterministically(
    compatibleHeads,
    recipe.identitySeed,
    library.version,
    `head_asset_${context.ageState}`, // Use age state in channel so different ages can pick different variants deterministically if multiple exist
    (h) => h.id,
  );

  // 1b. Select Age-Specific Hair Asset (if they have hair)
  let resolvedHairAssetId = null;
  if (recipe.hairFamilyId) {
    // get compatible hairs for that family and age
    const compatibleHairs = library.hairAssets.filter(
      (h) =>
        h.familyId === recipe.hairFamilyId && h.ageState === context.ageState,
    );
    if (compatibleHairs.length > 0) {
      const hairAsset = selectDeterministically(
        compatibleHairs,
        recipe.identitySeed,
        library.version,
        `hair_asset_${context.ageState}`,
        (h) => h.id,
      );
      resolvedHairAssetId = hairAsset.id;
    }
  }

  // 2. Select Wardrobe compatible with body and context tags
  // Canonicalize tag order so logically identical contexts resolve identically
  const canonicalTags = [...context.requiredTags].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const compatibleWardrobes = getCompatibleWardrobes(
    library,
    recipe.bodyFamilyId,
    canonicalTags,
  );
  const wardrobe = selectDeterministically(
    compatibleWardrobes,
    recipe.identitySeed,
    library.version,
    `wardrobe_${canonicalTags.join("_")}`, // Contextual channel
    (w) => w.id,
  );

  // 3. Select Pose compatible with body and scene anchor
  const compatiblePoses = getCompatiblePoses(
    library,
    recipe.bodyFamilyId,
    anchorClass,
  );
  const pose = selectDeterministically(
    compatiblePoses,
    recipe.identitySeed,
    library.version,
    `pose_${anchorClass}`,
    (p) => p.id,
  );

  return {
    identitySeed: recipe.identitySeed,
    libraryVersion: recipe.libraryVersion,
    bodyFamilyId: recipe.bodyFamilyId,
    headAssetId: headAsset.id,
    hairAssetId: resolvedHairAssetId,
    wardrobeAssetId: wardrobe.id,
    poseAssetId: pose.id,
  };
}
