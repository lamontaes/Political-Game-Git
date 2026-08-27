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
  library.facialHairFamilies.forEach((f) =>
    ensureUnique(f.id, "facialHairFamilies"),
  );
  library.facialHairAssets.forEach((f) =>
    ensureUnique(f.id, "facialHairAssets"),
  );
  library.complexions.forEach((c) => ensureUnique(c.id, "complexions"));
  library.accessories.forEach((a) => ensureUnique(a.id, "accessories"));
  library.wardrobeAssets.forEach((w) => ensureUnique(w.id, "wardrobeAssets"));
  library.poses.forEach((p) => ensureUnique(p.id, "poses"));

  const bodyFamilyIds = new Set(library.bodyFamilies.map((b) => b.id));
  const headFamilyIds = new Set(library.headFamilies.map((h) => h.id));
  const facialHairFamilyIds = new Set(
    library.facialHairFamilies.map((f) => f.id),
  );

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

  // Ensure HeadAssets map to valid HeadFamilies
  library.headAssets.forEach((h) => {
    if (!headFamilyIds.has(h.familyId)) {
      throw new Error(
        `HeadAsset ${h.id} references missing family: ${h.familyId}`,
      );
    }
  });

  // Ensure HairAssets map to valid HairFamilies
  const hairFamilyIds = new Set(library.hairFamilies.map((h) => h.id));
  library.hairAssets.forEach((h) => {
    if (!hairFamilyIds.has(h.familyId)) {
      throw new Error(
        `HairAsset ${h.id} references missing family: ${h.familyId}`,
      );
    }
  });

  // Complexions -> HeadFamilies
  library.complexions.forEach((c) => {
    c.compatibleHeadFamilies.forEach((hId) => {
      if (!headFamilyIds.has(hId))
        throw new Error(
          `Complexion ${c.id} references missing head family: ${hId}`,
        );
    });
  });

  // Facial Hair Families -> HeadFamilies
  library.facialHairFamilies.forEach((f) => {
    f.compatibleHeadFamilies.forEach((hId) => {
      if (!headFamilyIds.has(hId))
        throw new Error(
          `FacialHairFamily ${f.id} references missing head family: ${hId}`,
        );
    });
  });

  // Facial Hair Assets -> Facial Hair Families
  library.facialHairAssets.forEach((f) => {
    if (!facialHairFamilyIds.has(f.familyId)) {
      throw new Error(
        `FacialHairAsset ${f.id} references missing family: ${f.familyId}`,
      );
    }
  });

  // Accessories -> HeadFamilies
  library.accessories.forEach((a) => {
    a.compatibleHeadFamilies.forEach((hId) => {
      if (!headFamilyIds.has(hId))
        throw new Error(
          `Accessory ${a.id} references missing head family: ${hId}`,
        );
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

  // 4b. Validate Age Completeness for Facial Hairs
  library.facialHairFamilies.forEach((f) => {
    const familyHairs = library.facialHairAssets.filter(
      (fa) => fa.familyId === f.id,
    );
    requiredAges.forEach((age) => {
      if (!familyHairs.some((fa) => fa.ageState === age)) {
        throw new Error(
          `FacialHairFamily ${f.id} is missing an asset for age state: ${age}`,
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
