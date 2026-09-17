import fs from "node:fs";
import { MODULAR45_REGISTRY } from "./private-candidate-manifests";
import { describe, expect, it } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as prior } from "./engine-people29-review";
import {
  createCharacterComponentLibrary,
  computeCharacterGenerationSignature,
  resolveCharacterRecipe,
  projectCharacterLayers,
  type CharacterComponentDefinition,
  type CharacterComponentManifestRecord,
} from "./character-components";
import type { PersonAppearance } from "../simulation/types";
import { createGarmentFitBank, type GarmentFitBankData } from "./garment-fit";
import { resolvePose41 } from "./pose41-adapter";
const directory = "art/authoring/modular47/";
const available = fs.existsSync(directory + "registry-candidate.json");
function kit(expansion = false) {
  const spec = JSON.parse(
    fs.readFileSync(
      directory +
        (expansion ? "expansion-calibration.json" : "calibration.json"),
      "utf8",
    ),
  );
  if (!expansion)
    return {
      library: prior,
      spec,
      additions: [...prior.components.values()]
        .filter((c) => c.definition.catalog_generation === spec.generation)
        .map((c) => ({ asset_id: c.assetId, component: c.definition })),
    };
  const registry = JSON.parse(
    fs.readFileSync(
      directory +
        (expansion ? "expansion-registry.json" : "registry-candidate.json"),
      "utf8",
    ),
  );
  const report = JSON.parse(
    fs.readFileSync(directory + "fit-report.json", "utf8"),
  );
  const ids = new Set<string>([
    ...report.newIds,
    ...(expansion
      ? JSON.parse(
          fs.readFileSync(directory + "expansion-fit-report.json", "utf8"),
        ).newIds
      : []),
  ]);
  const records: CharacterComponentManifestRecord[] = [
    ...prior.components.values(),
  ]
    .filter((c) => c.definition.catalog_generation < 15)
    .map((c) => ({
      asset_id: c.assetId,
      asset_type: "character-component",
      fixed_or_modular: "modular",
      generation_status: "approved",
      qa_status: "approved",
      runtime_release_status: "released",
      component: c.definition,
    }));
  const additions: CharacterComponentManifestRecord[] = registry.assets
    .filter((a: { asset_id: string }) => ids.has(a.asset_id))
    .map(
      (a: {
        asset_id: string;
        candidate_component: CharacterComponentDefinition;
      }) => ({
        asset_id: a.asset_id,
        asset_type: "character-component",
        fixed_or_modular: "modular",
        generation_status: "approved",
        qa_status: "approved",
        runtime_release_status: "released",
        component: {
          ...a.candidate_component,
          catalog_generation: report.generation,
        },
      }),
    );
  const library = createCharacterComponentLibrary(
    [...records, ...additions],
    {
      prepared_profiles: JSON.parse(
        fs.readFileSync(
          "art/authoring/modular47-r1/all-profile-proofs.json",
          "utf8",
        ),
      ),
      profile_layer_changes: MODULAR45_REGISTRY.profileLayerChanges,
      catalog_generation: report.generation,
      slots: prior.slots,
      generations: [
        ...prior.generations.filter((g) => g.generation < 15),
        {
          generation: report.generation,
          component_ids: [...ids].sort(),
          signature: computeCharacterGenerationSignature(
            additions.map((r) => ({
              assetId: r.asset_id,
              definition: r.component!,
            })),
          ),
        },
      ],
    },
    expansion
      ? createGarmentFitBank({
          schema: "garment-fit-bank-v1",
          bounds: prior.fit?.bounds ?? undefined,
          garments: [...(prior.fit?.garments.values() ?? []), ...spec.garments],
        } as GarmentFitBankData)
      : prior.fit,
    prior.skinTone,
  );
  return { library, spec, additions };
}
describe.skipIf(!available)(
  "clean modular source kit through ordinary recipe resolution",
  () => {
    it("every declared face/hair/body/outfit combination resolves without an old-profile fallback", () => {
      const { library, spec } = kit();
      for (const fit of spec.fits) {
        const bodyFamily = `ep41-${fit.body.split("/")[0]}-body`;
        for (const hairFamily of [
          null,
          ...new Set<string>(
            fit.hair.map(
              (h: { component: { family: string } }) => h.component.family,
            ),
          ),
        ]) {
          for (const sleeve of ["short", "long"]) {
            const appearance: PersonAppearance = {
              seed: "data-only-kit",
              recipeVersion: "appearance-recipe-v2",
              catalogGeneration: spec.generation,
              selection: {
                bodyFamily,
                headFamily: fit.component.family,
                hairFamily,
              },
            };
            const fam = fit.body.split("/")[0];
            const recipe = resolveCharacterRecipe(
              {
                appearance,
                poseFamily: "standing-neutral",
                unresolvableRequiredSlots: "diagnose",
                wardrobe: {
                  id: "source-kit-test",
                  families: { top: [`ep41-${fam}-${sleeve}-sleeve-torso`] },
                },
              },
              library,
            );
            expect(
              recipe.context.components.find((c) => c.kind === "head")?.family,
            ).toBe(fit.component.family);
            expect(
              recipe.context.components.find((c) => c.kind === "hair-front")
                ?.family ?? null,
            ).toBe(hairFamily);
            expect(
              recipe.context.components.every((c) =>
                c.assetId.startsWith("m47-"),
              ),
            ).toBe(true);
            const projected = projectCharacterLayers(recipe, library);
            expect(
              projected?.fitRefusals,
              `${fit.id}/${hairFamily}/${sleeve}`,
            ).toEqual([]);
            expect(
              recipe.context.components.filter((c) =>
                ["body", "head", "top", "bottom", "footwear"].includes(c.kind),
              ),
            ).toHaveLength(5);
          }
        }
      }
    });
    it.skipIf(!fs.existsSync(directory + "expansion-registry.json"))(
      "admits genuinely new source art and a seventh profile through the same recipe resolver",
      () => {
        const { library, spec } = kit(true);
        for (const fit of spec.fits) {
          const bodyFamily = fit.component.compatible_body_families[0];
          for (const hair of [null, ...fit.hair]) {
            const recipe = resolveCharacterRecipe(
              {
                appearance: {
                  seed: "post-freeze-expansion",
                  recipeVersion: "appearance-recipe-v2",
                  catalogGeneration: 15,
                  selection: {
                    bodyFamily,
                    headFamily: fit.component.family,
                    hairFamily: hair?.component.family ?? null,
                  },
                },
                poseFamily: "standing-neutral",
                unresolvableRequiredSlots: "diagnose",
                wardrobe: {
                  id: "expansion",
                  families: {
                    top: [
                      bodyFamily === "m47-expansion-average-body"
                        ? "m47-expansion-top"
                        : `ep41-${fit.body.split("/")[0]}-short-sleeve-torso`,
                    ],
                  },
                },
              },
              library,
            );
            expect(
              recipe.context.components.find((c) => c.kind === "head")?.assetId,
            ).toBe(fit.id);
            expect(
              recipe.context.components.find((c) => c.kind === "hair-front")
                ?.assetId ?? null,
            ).toBe(hair?.id ?? null);
            expect(
              recipe.context.components.find((c) => c.kind === "body")?.family,
            ).toBe(bodyFamily);
            expect(
              projectCharacterLayers(recipe, library)?.fitRefusals,
            ).toEqual([]);
            expect(
              recipe.context.components.filter((c) =>
                ["body", "head", "top", "bottom", "footwear"].includes(c.kind),
              ),
            ).toHaveLength(5);
          }
        }
      },
    );
    it.skipIf(!fs.existsSync(directory + "pose-pack.json"))(
      "supports each declared face, hair and outfit in listening and seated poses",
      () => {
        const { library, spec } = kit();
        const bank = JSON.parse(
          fs.readFileSync(directory + "pose-pack.json", "utf8"),
        ).variants;
        for (const fit of spec.fits) {
          const fam = fit.body.split("/")[0];
          for (const hairFamily of [
            null,
            ...new Set<string>(
              fit.hair.map(
                (hair: { component: { family: string } }) =>
                  hair.component.family,
              ),
            ),
          ]) {
            for (const sleeve of ["short", "long"]) {
              const recipe = resolveCharacterRecipe(
                {
                  appearance: {
                    seed: "pose-source-kit",
                    recipeVersion: "appearance-recipe-v2",
                    catalogGeneration: spec.generation,
                    selection: {
                      bodyFamily: `ep41-${fam}-body`,
                      headFamily: fit.component.family,
                      hairFamily,
                    },
                  },
                  poseFamily: "standing-neutral",
                  wardrobe: {
                    id: "pose-outfit",
                    families: { top: [`ep41-${fam}-${sleeve}-sleeve-torso`] },
                  },
                },
                library,
              );
              const parts = recipe.context.components;
              for (const pose of [
                "standing-listening",
                "seated-guest-neutral",
              ] as const) {
                const result = resolvePose41(
                  {
                    pose,
                    bodyAssetId: parts.find((part) => part.kind === "body")!
                      .assetId,
                    headAssetId: parts.find((part) => part.kind === "head")!
                      .assetId,
                    hairAssetId:
                      parts.find((part) => part.kind === "hair-front")
                        ?.assetId ?? null,
                    outfitAssetIds: parts
                      .filter((part) =>
                        ["top", "bottom", "footwear", "accessory"].includes(
                          part.kind,
                        ),
                      )
                      .map((part) => part.assetId),
                    candidatePreview: true,
                  },
                  bank,
                  (path) => (fs.existsSync(path) ? path : undefined),
                );
                expect(
                  result.status,
                  `${fit.id}/${hairFamily}/${sleeve}/${pose}`,
                ).toBe("ready");
              }
            }
          }
        }
      },
    );
  },
);
