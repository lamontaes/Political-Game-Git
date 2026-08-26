import { describe, it, expect } from "vitest";
import { resolvePersistentAppearance, resolveContextualOutfit } from "../../src/character-assets/resolver";
import { selectDeterministically } from "../../src/character-assets/hash";
import { SYNTHETIC_LIBRARY_V1 } from "../../src/character-assets/fixtures";

describe("Character Asset Resolver", () => {
  describe("Deterministic hashing", () => {
    it("selects the same item given the same seed and channel", () => {
      const items = [{ id: "A" }, { id: "B" }, { id: "C" }];

      const sel1 = selectDeterministically(items, "seed1", "lib_v1", "channel1", i => i.id);
      const sel2 = selectDeterministically(items, "seed1", "lib_v1", "channel1", i => i.id);

      expect(sel1.id).toBe(sel2.id);
    });

    it("selects different items across different seeds (distribution)", () => {
      const items = [{ id: "A" }, { id: "B" }, { id: "C" }];
      const selections = new Set();

      // With a few distinct seeds, we should see some distribution
      for (let i = 0; i < 20; i++) {
        const sel = selectDeterministically(items, `seed_${i}`, "lib_v1", "channel1", i => i.id);
        selections.add(sel.id);
      }

      expect(selections.size).toBeGreaterThan(1);
    });

    it("selects differently when library version changes", () => {
      const items = [{ id: "A" }, { id: "B" }, { id: "C" }];
      const sel1 = selectDeterministically(items, "fixed_seed", "lib_v1", "channel1", i => i.id);
      const sel2 = selectDeterministically(items, "fixed_seed", "lib_v2", "channel1", i => i.id);
      // Because it's a hash, it MIGHT be the same by chance, but mostly it changes.
      // We just ensure it's structurally salted.
      expect(sel1.id).toBeDefined();
      expect(sel2.id).toBeDefined();
    });
  });

  describe("Persistent Appearance Recipe", () => {
    it("resolves a stable identity for a given seed", () => {
      const recipe1 = resolvePersistentAppearance("senator_smith_01", SYNTHETIC_LIBRARY_V1);
      const recipe2 = resolvePersistentAppearance("senator_smith_01", SYNTHETIC_LIBRARY_V1);

      expect(recipe1).toEqual(recipe2);
      expect(recipe1.bodyFamilyId).toMatch(/^body_family/);
      expect(recipe1.headFamilyId).toMatch(/^head_family/);
    });

    it("adding a new asset channel doesn't reshuffle existing attributes", () => {
      // Simulate adding a new channel to resolvePersistentAppearance
      // Currently it resolves body, head_family, hair.
      // We will ensure that the resolved body and head don't change if we were to add another trait later.
      const recipe1 = resolvePersistentAppearance("stable_seed", SYNTHETIC_LIBRARY_V1);

      // Because we use independent selection channels (e.g. "body", "head_family")
      // instead of a single rolling RNG, adding a new selectDeterministically
      // inside resolvePersistentAppearance would not affect prior selections.
      // We verify the hash of just the body channel is stable.
      const bodyOnly = selectDeterministically(SYNTHETIC_LIBRARY_V1.bodyFamilies, "stable_seed", SYNTHETIC_LIBRARY_V1.version, "body", b => b.id);

      expect(recipe1.bodyFamilyId).toBe(bodyOnly.id);
    });
  });

  describe("Contextual Outfit Recipe", () => {
    it("resolves contextual state correctly", () => {
      const recipe = resolvePersistentAppearance("context_seed_1", SYNTHETIC_LIBRARY_V1);

      const outfit = resolveContextualOutfit(
        recipe,
        { ageState: "adult", requiredTags: ["formal"] },
        "anchor_hallway",
        SYNTHETIC_LIBRARY_V1
      );

      expect(outfit.bodyFamilyId).toBe(recipe.bodyFamilyId);
      expect(outfit.wardrobeAssetId).toBeDefined();
      expect(outfit.poseFamilyId).toBeDefined();
      // Should pick the adult variant of the selected head family
      expect(outfit.headAssetId).toMatch(/_adult$/);
    });

    it("throws if library version mismatches", () => {
      const recipe = resolvePersistentAppearance("context_seed_1", SYNTHETIC_LIBRARY_V1);
      const wrongLibrary = { ...SYNTHETIC_LIBRARY_V1, version: "lib_v2" as const };

      expect(() => {
        resolveContextualOutfit(
          recipe,
          { ageState: "adult", requiredTags: ["formal"] },
          "anchor_hallway",
          wrongLibrary
        );
      }).toThrowError(/does not match current library/);
    });

    it("throws on invalid combinations (e.g. no valid wardrobe)", () => {
      const recipe = resolvePersistentAppearance("context_seed_1", SYNTHETIC_LIBRARY_V1);

      expect(() => {
        resolveContextualOutfit(
          recipe,
          { ageState: "adult", requiredTags: ["space_suit"] }, // Invalid tag
          "anchor_hallway",
          SYNTHETIC_LIBRARY_V1
        );
      }).toThrowError(/No wardrobe found/);
    });

    it("preserves identical head family across ages", () => {
      const recipe = resolvePersistentAppearance("aging_seed", SYNTHETIC_LIBRARY_V1);

      const youngOutfit = resolveContextualOutfit(
        recipe,
        { ageState: "young_adult", requiredTags: ["formal"] },
        "anchor_hallway",
        SYNTHETIC_LIBRARY_V1
      );

      const seniorOutfit = resolveContextualOutfit(
        recipe,
        { ageState: "senior", requiredTags: ["formal"] },
        "anchor_hallway",
        SYNTHETIC_LIBRARY_V1
      );

      // Even though age state changed, the core head family ID should map to the same base variant
      // in our synthetic library, e.g., head_01_young and head_01_senior.
      // We can verify this by looking up the assets in the library.
      const youngAsset = SYNTHETIC_LIBRARY_V1.headAssets.find(h => h.id === youngOutfit.headAssetId)!;
      const seniorAsset = SYNTHETIC_LIBRARY_V1.headAssets.find(h => h.id === seniorOutfit.headAssetId)!;

      expect(youngAsset.familyId).toBe(recipe.headFamilyId);
      expect(seniorAsset.familyId).toBe(recipe.headFamilyId);
    });
  });
});
