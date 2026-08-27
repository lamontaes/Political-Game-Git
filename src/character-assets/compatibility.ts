import type {
  CharacterAssetLibrary,
  BodyFamilyId,
  HeadFamilyId,
  HeadAsset,
  HeadFamilyAsset,
  AgeState,
  WardrobeAsset,
  SceneAnchorClass,
  PoseAsset,
} from "./types";

export function getCompatibleHeadFamilies(
  library: CharacterAssetLibrary,
  bodyFamilyId: BodyFamilyId,
): readonly HeadFamilyAsset[] {
  const families = library.headFamilies.filter((h) =>
    h.compatibleBodyFamilies.includes(bodyFamilyId),
  );
  if (families.length === 0) {
    throw new Error(
      `No head families found compatible with body: ${bodyFamilyId}`,
    );
  }
  return families;
}

export function getCompatibleHeadAssets(
  library: CharacterAssetLibrary,
  headFamilyId: HeadFamilyId,
  ageState: AgeState,
): readonly HeadAsset[] {
  const assets = library.headAssets.filter(
    (h) => h.familyId === headFamilyId && h.ageState === ageState,
  );
  if (assets.length === 0) {
    throw new Error(
      `No head assets found for family ${headFamilyId} at age ${ageState}`,
    );
  }
  return assets;
}

export function getCompatibleWardrobes(
  library: CharacterAssetLibrary,
  bodyFamilyId: BodyFamilyId,
  requiredTags: readonly string[],
): readonly WardrobeAsset[] {
  const assets = library.wardrobeAssets.filter((w) => {
    if (!w.compatibleBodyFamilies.includes(bodyFamilyId)) return false;
    return requiredTags.every((tag) => w.tags.includes(tag));
  });
  if (assets.length === 0) {
    throw new Error(
      `No wardrobe found for body ${bodyFamilyId} matching tags: ${requiredTags.join(", ")}`,
    );
  }
  return assets;
}

export function getCompatiblePoses(
  library: CharacterAssetLibrary,
  bodyFamilyId: BodyFamilyId,
  anchorClass: SceneAnchorClass,
): readonly PoseAsset[] {
  const body = library.bodyFamilies.find((b) => b.id === bodyFamilyId);
  if (!body) throw new Error(`Body family not found: ${bodyFamilyId}`);

  const assets = library.poses.filter((p) => {
    if (!body.supportedPoseFamilies.includes(p.familyId)) return false;
    if (!p.compatibleSceneAnchors.includes(anchorClass)) return false;
    return true;
  });

  if (assets.length === 0) {
    throw new Error(
      `No pose found for body ${bodyFamilyId} and anchor ${anchorClass}`,
    );
  }
  return assets;
}
