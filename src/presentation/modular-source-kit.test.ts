import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as prior } from "./engine-people29-review";
import {
  createCharacterComponentLibrary,
  computeCharacterGenerationSignature,
  componentsAtGeneration,
  resolveCharacterRecipe,
  projectCharacterLayers,
  type CharacterComponentDefinition,
  type CharacterComponentManifestRecord,
} from "./character-components";
import type { PersonAppearance } from "../simulation/types";
const directory = "art/authoring/modular47/";
const available = fs.existsSync(directory + "registry-candidate.json");
function kit() {
  const spec = JSON.parse(
    fs.readFileSync(directory + "calibration.json", "utf8"),
  );
  const registry = JSON.parse(
    fs.readFileSync(directory + "registry-candidate.json", "utf8"),
  );
  const report = JSON.parse(
    fs.readFileSync(directory + "fit-report.json", "utf8"),
  );
  const ids = new Set<string>(report.newIds);
  const records: CharacterComponentManifestRecord[] = [
    ...prior.components.values(),
  ].map((c) => ({
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
      catalog_generation: report.generation,
      slots: prior.slots,
      generations: [
        ...prior.generations,
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
    prior.fit,
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
    it("keeps generation 14 recipes exact across the new kit admission", () => {
      const { library } = kit();
      for (let i = 0; i < 40; i++) {
        const appearance = {
          seed: `historical-kit-${i}`,
          recipeVersion: "appearance-recipe-v2",
          catalogGeneration: 14,
        };
        const request = { appearance, poseFamily: "standing-neutral" };
        expect(resolveCharacterRecipe(request, library)).toEqual(
          resolveCharacterRecipe(request, prior),
        );
      }
      expect(componentsAtGeneration(library, 14).map((c) => c.assetId)).toEqual(
        componentsAtGeneration(prior, 14).map((c) => c.assetId),
      );
    });
  },
);
