import { describe, it, expect } from "vitest";
import {
  resolvePersistentAppearance,
  resolveContextualOutfit,
} from "../../src/character-assets/resolver";
import { selectDeterministically } from "../../src/character-assets/hash";
import { validateAssetLibrary } from "../../src/character-assets/validation";
import { SYNTHETIC_LIBRARY_V1 } from "../../src/character-assets/fixtures";

describe("Character Asset Resolver", () => {
  describe("Library Validation", () => {
    it("accepts a well-formed synthetic library", () => {
      expect(() => validateAssetLibrary(SYNTHETIC_LIBRARY_V1)).not.toThrow();
    });

    it("throws on missing age states in head families", () => {
      const badLib = {
        ...SYNTHETIC_LIBRARY_V1,
        headAssets: SYNTHETIC_LIBRARY_V1.headAssets.filter(
          (h) => h.ageState !== "senior",
        ),
      };
      expect(() =>
        validateAssetLibrary(
          badLib as Parameters<typeof validateAssetLibrary>[0],
        ),
      ).toThrowError(/missing an asset for age state: senior/);
    });

    it("throws on invalid body family references in wardrobes", () => {
      const badLib = {
        ...SYNTHETIC_LIBRARY_V1,
        wardrobeAssets: [
          {
            id: "wardrobe_bad",
            compatibleBodyFamilies: ["body_family_999"], // Missing
            tags: [],
            provenanceRef: "bad",
          },
        ],
      };
      expect(() =>
        validateAssetLibrary(
          badLib as Parameters<typeof validateAssetLibrary>[0],
        ),
      ).toThrowError(/references missing body: body_family_999/);
    });
  });

  describe("Deterministic hashing", () => {
    it("selects the same item given the same seed and channel", () => {
      const items = [{ id: "A" }, { id: "B" }, { id: "C" }];

      const sel1 = selectDeterministically(
        items,
        "seed1",
        "lib_v1",
        "channel1",
        (i) => i.id,
      );
      const sel2 = selectDeterministically(
        items,
        "seed1",
        "lib_v1",
        "channel1",
        (i) => i.id,
      );

      expect(sel1.id).toBe(sel2.id);
    });

    it("candidate input order does not affect selection (canonical sorting)", () => {
      const itemsABC = [{ id: "A" }, { id: "B" }, { id: "C" }];
      const itemsBCA = [{ id: "B" }, { id: "C" }, { id: "A" }];

      const sel1 = selectDeterministically(
        itemsABC,
        "seed1",
        "lib_v1",
        "channel1",
        (i) => i.id,
      );
      const sel2 = selectDeterministically(
        itemsBCA,
        "seed1",
        "lib_v1",
        "channel1",
        (i) => i.id,
      );

      expect(sel1.id).toBe(sel2.id);
    });

    it("wardrobe tag input order does not affect selection", () => {
      const recipe = resolvePersistentAppearance(
        "wardrobe_seed",
        SYNTHETIC_LIBRARY_V1,
      );

      const outfit1 = resolveContextualOutfit(
        recipe,
        { ageState: "adult", requiredTags: ["office", "formal"] },
        "anchor_hallway",
        SYNTHETIC_LIBRARY_V1,
      );

      const outfit2 = resolveContextualOutfit(
        recipe,
        { ageState: "adult", requiredTags: ["formal", "office"] },
        "anchor_hallway",
        SYNTHETIC_LIBRARY_V1,
      );

      expect(outfit1.wardrobeAssetId).toBe(outfit2.wardrobeAssetId);
    });

    it("new unrelated resolution channels do not change existing channels", () => {
      const recipe1 = resolvePersistentAppearance(
        "stable_seed",
        SYNTHETIC_LIBRARY_V1,
      );

      // If we directly query the hash resolver for a random new channel like 'accessory'
      const accessory = selectDeterministically(
        [{ id: "acc_1" }, { id: "acc_2" }],
        "stable_seed",
        SYNTHETIC_LIBRARY_V1.version,
        "accessory",
        (i) => i.id,
      );

      // The body family resolved via the persistent resolver MUST be mathematically unaffected
      const expectedBody = selectDeterministically(
        SYNTHETIC_LIBRARY_V1.bodyFamilies,
        "stable_seed",
        SYNTHETIC_LIBRARY_V1.version,
        "body",
        (b) => b.id,
      );

      expect(recipe1.bodyFamilyId).toBe(expectedBody.id);
      expect(accessory.id).toBeDefined();
    });

    it("identical seed + identical immutable library produces identical recipes", () => {
      const recipe1 = resolvePersistentAppearance(
        "stable_seed_555",
        SYNTHETIC_LIBRARY_V1,
      );
      const outfit1 = resolveContextualOutfit(
        recipe1,
        { ageState: "senior", requiredTags: ["formal"] },
        "anchor_committee_seat",
        SYNTHETIC_LIBRARY_V1,
      );

      // Do it all again
      const recipe2 = resolvePersistentAppearance(
        "stable_seed_555",
        SYNTHETIC_LIBRARY_V1,
      );
      const outfit2 = resolveContextualOutfit(
        recipe2,
        { ageState: "senior", requiredTags: ["formal"] },
        "anchor_committee_seat",
        SYNTHETIC_LIBRARY_V1,
      );

      expect(recipe1).toEqual(recipe2);
      expect(outfit1).toEqual(outfit2);
    });

    it("throws if library version mismatches", () => {
      const recipe = resolvePersistentAppearance(
        "context_seed_1",
        SYNTHETIC_LIBRARY_V1,
      );
      const wrongLibrary = {
        ...SYNTHETIC_LIBRARY_V1,
        version: "lib_v2" as const,
      };

      expect(() => {
        resolveContextualOutfit(
          recipe,
          { ageState: "adult", requiredTags: ["formal", "office"] },
          "anchor_hallway",
          wrongLibrary,
        );
      }).toThrowError(/does not match current library/);
    });
  });
});
