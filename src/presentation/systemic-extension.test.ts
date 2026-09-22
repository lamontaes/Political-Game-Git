import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as existing } from "./engine-people29-review";
import {
  createCharacterComponentLibrary,
  liftCandidatesForReview,
  resolveCharacterRecipe,
} from "./character-components";
import { createGarmentFitBank } from "./garment-fit";
import type { GarmentFitBankData } from "./garment-fit";
import { resolveCompleteOutfit } from "./complete-outfit";
const path = "art/authoring/systemic-repair/extension/registry-candidate.json";
describe.skipIf(!fs.existsSync(path))(
  "data-only head/body admission rehearsal",
  () => {
    it("assembles a complete additional family through the existing catalog and garment resolver", () => {
      const registry = JSON.parse(fs.readFileSync(path, "utf8"));
      const proof = JSON.parse(
        fs.readFileSync(
          "art/authoring/systemic-repair/extension/proof.json",
          "utf8",
        ),
      );
      expect(proof.fitterAndRendererUnchanged).toBe(true);
      expect(proof.before).toEqual(proof.after);
      const records = registry.assets.filter((a: { asset_id: string }) =>
        proof.newIds.includes(a.asset_id),
      );
      const lifted = liftCandidatesForReview(records, existing.slots);
      const library = createCharacterComponentLibrary(
        lifted.records,
        lifted.catalog,
        createGarmentFitBank({
          schema: "garment-fit-v1",
          garments: registry.garments,
        } as unknown as GarmentFitBankData),
      );
      const appearance = {
        seed: "heldout",
        recipeVersion: "appearance-recipe-v2" as const,
        catalogGeneration: library.catalogGeneration,
        selection: {
          bodyFamily: "extension-fixture-body",
          headFamily: "extension-fixture-head",
          hairFamily: null,
        },
      };
      const outfit = resolveCompleteOutfit({
        appearance,
        library,
        poseFamily: "standing-neutral",
      });
      expect(outfit.ok, JSON.stringify(outfit)).toBe(true);
      const recipe = resolveCharacterRecipe(
        { appearance, poseFamily: "standing-neutral" },
        library,
      );
      expect(recipe.context.components.map((c) => c.assetId).sort()).toEqual(
        [...proof.newIds].sort(),
      );
    });
  },
);
