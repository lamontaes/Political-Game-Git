import type { CharacterAssetLibrary, AgeState } from "./types";

export function validateAssetLibrary(library: CharacterAssetLibrary): void {
  const ids = new Set<string>();

  function ensureUnique(id: string, context: string) {
    if (ids.has(id)) {
      throw new Error(`Duplicate asset ID found: ${id} in ${context}`);
    }
    ids.add(id);
  }

  // 1. Gather all IDs and check uniqueness
  library.bodyFamilies.forEach((b) => ensureUnique(b.id, "bodyFamilies"));
  library.headFamilies.forEach((h) => ensureUnique(h.id, "headFamilies"));
  library.headAssets.forEach((h) => ensureUnique(h.id, "headAssets"));
  library.hairFamilies.forEach((h) => ensureUnique(h.id, "hairFamilies"));
  library.hairAssets.forEach((h) => ensureUnique(h.id, "hairAssets"));
  library.wardrobeAssets.forEach((w) => ensureUnique(w.id, "wardrobeAssets"));
  library.poses.forEach((p) => ensureUnique(p.id, "poses"));

  const bodyFamilyIds = new Set(library.bodyFamilies.map((b) => b.id));
  const headFamilyIds = new Set(library.headFamilies.map((h) => h.id));

  // 2. Validate References
  library.headFamilies.forEach((h) => {
    h.compatibleBodyFamilies.forEach((bId) => {
      if (!bodyFamilyIds.has(bId))
        throw new Error(`HeadFamily ${h.id} references missing body: ${bId}`);
    });
  });

  library.hairFamilies.forEach((h) => {
    h.compatibleHeadFamilies.forEach((hId) => {
      if (!headFamilyIds.has(hId))
        throw new Error(
          `HairFamily ${h.id} references missing head family: ${hId}`,
        );
    });
  });

  library.wardrobeAssets.forEach((w) => {
    w.compatibleBodyFamilies.forEach((bId) => {
      if (!bodyFamilyIds.has(bId))
        throw new Error(`Wardrobe ${w.id} references missing body: ${bId}`);
    });
  });

  // 3. Validate Age Completeness for Heads
  const requiredAges: AgeState[] = ["young_adult", "adult", "senior"];

  library.headFamilies.forEach((h) => {
    const familyHeads = library.headAssets.filter((ha) => ha.familyId === h.id);
    requiredAges.forEach((age) => {
      if (!familyHeads.some((ha) => ha.ageState === age)) {
        throw new Error(
          `HeadFamily ${h.id} is missing an asset for age state: ${age}`,
        );
      }
    });
  });

  // 4. Validate Age Completeness for Hairs
  library.hairFamilies.forEach((h) => {
    const familyHairs = library.hairAssets.filter((ha) => ha.familyId === h.id);
    requiredAges.forEach((age) => {
      if (!familyHairs.some((ha) => ha.ageState === age)) {
        throw new Error(
          `HairFamily ${h.id} is missing an asset for age state: ${age}`,
        );
      }
    });
  });

  // 5. Validate Pose Coherence
  const poseFamilyIds = new Set(library.poses.map((p) => p.familyId));
  library.bodyFamilies.forEach((b) => {
    b.supportedPoseFamilies.forEach((pfId) => {
      if (!poseFamilyIds.has(pfId)) {
        throw new Error(
          `BodyFamily ${b.id} references missing pose family: ${pfId}`,
        );
      }
    });
  });
}
