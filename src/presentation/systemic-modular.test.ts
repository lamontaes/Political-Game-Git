import { describe, expect, it } from "vitest";
import { POSE41_VARIANTS, resolvePose41 } from "./pose41-adapter";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "./engine-people29-review";
import { MODULAR45_REGISTRY } from "./private-candidate-manifests";
import {
  componentsAtGeneration,
  resolveCharacterRecipe,
} from "./character-components";
import {
  preparedFamily,
  selectPreparedBody,
  preparedPartsAt,
  generatedPreparedMaterial,
  preparedPortraitFrame,
  validatePreparedAppearance,
} from "./engine-people29-data";
import { resolveCompleteOutfit } from "./complete-outfit";
import type { PersonAppearance } from "../simulation/types";
const generation = MODULAR45_REGISTRY.generations.find(
  (g) => g.generation === 14,
);
describe.skipIf(!generation)("systemic prepared generation", () => {
  it("registers new bodies with their original family and all 18 head fits", () => {
    const members = componentsAtGeneration(library, 14);
    const bodies = members.filter(
      (c) => c.definition.kind === "body" && c.assetId.endsWith("-s14d"),
    );
    expect(bodies.length).toBe(6);
    for (const body of bodies) {
      const f = preparedFamily(body.definition.family)!;
      expect(f, body.definition.family).toBeDefined();
      expect(body.definition.pose_family).toBe("standing-neutral");
      const prefix = body.definition.family.replace(/-body$/, "");
      for (const head of ["lean", "average", "heavy"])
        for (const hair of [null, "lean", "average", "heavy"]) {
          const appearance: PersonAppearance = {
            seed: "systemic-test",
            recipeVersion: "appearance-recipe-v2",
            catalogGeneration: 14,
            selection: {
              bodyFamily: body.definition.family,
              headFamily: `${prefix}-head-${head}`,
              hairFamily: hair ? `${prefix}-hair-${hair}` : null,
            },
            material: generatedPreparedMaterial(f, "systemic-test", 14),
          };
          expect(() => validatePreparedAppearance(appearance)).not.toThrow();
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
          const ids = recipe.context.components.map((c) => c.assetId);
          expect(ids).toContain(`${prefix}-head-${head}-m45-s14d`);
          expect(ids.filter((id) => id.includes("-hair-")).length).toBe(
            hair ? 1 : 0,
          );
          expect(preparedPortraitFrame(f, ids)).toBeDefined();
        }
    }
  });
  it("preserves logical face and hairstyle across compatible body changes", () => {
    for (const sex of ["masc", "fem"])
      for (const from of ["lean", "average", "heavy"])
        for (const to of ["lean", "average", "heavy"])
          for (const face of ["lean", "average", "heavy"])
            for (const hair of [null, "lean", "average", "heavy"]) {
              const prefix = `ep41-${sex}-${from}`;
              const a: PersonAppearance = {
                seed: "identity",
                recipeVersion: "appearance-recipe-v2",
                catalogGeneration: 14,
                selection: {
                  bodyFamily: prefix + "-body",
                  headFamily: prefix + "-head-" + face,
                  hairFamily: hair ? prefix + "-hair-" + hair : null,
                },
                material: generatedPreparedMaterial(
                  preparedFamily(prefix + "-body")!,
                  "identity",
                  14,
                ),
              };
              const next = selectPreparedBody(a, `ep41-${sex}-${to}-body`);
              expect(next?.selection?.headFamily).toBe(
                `ep41-${sex}-${to}-head-${face}`,
              );
              expect(next?.selection?.hairFamily).toBe(
                hair ? `ep41-${sex}-${to}-hair-${hair}` : null,
              );
            }
  });
  it("resolves all declared current pose combinations with material templates", () => {
    const variants = POSE41_VARIANTS.filter((v) => v.id.endsWith("-s14d"));
    expect(variants).toHaveLength(288);
    for (const v of variants) {
      const result = resolvePose41({
        pose: v.pose,
        bodyAssetId: v.sourceBodyAssetIds[0]!,
        headAssetId: v.sourceHeadAssetIds[0]!,
        hairAssetId: v.sourceHairAssetIds[0]!,
        outfitAssetIds: v.outfitAssetIds,
        candidatePreview: true,
      });
      expect(result.status, v.id).toBe("ready");
      if (result.status === "ready") {
        expect(result.layers.every((l) => l.url)).toBe(true);
        const f = preparedFamily(v.sourceBodyAssetIds[0])!;
        for (const l of result.layers)
          expect(
            f.parts.some((p) => p.id === l.assetId),
            l.assetId,
          ).toBe(true);
      }
    }
  });
  it("keeps future materials out of the older generation", () => {
    for (const family of [
      "masc-lean",
      "masc-average",
      "masc-heavy",
      "fem-lean",
      "fem-average",
      "fem-heavy",
    ]) {
      const f = preparedFamily(`ep41-${family}-body`)!;
      expect(preparedPartsAt(f, 13).some((p) => p.id.endsWith("-s14d"))).toBe(
        false,
      );
      expect(generatedPreparedMaterial(f, "old", 13).palettes.hair).toBe(
        "source-colour",
      );
    }
  });
});
