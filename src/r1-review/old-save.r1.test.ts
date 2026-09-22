import { privateModularInputs } from "../presentation/private-test-inputs";
import { MODULAR45_REGISTRY } from "../presentation/private-candidate-manifests";
import { describe, expect, it } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as full } from "../presentation/engine-people29-review";
import {
  createCharacterComponentLibrary,
  componentsAtGeneration,
  resolveCharacterRecipe,
  projectCharacterLayers,
  type CharacterComponentManifestRecord,
} from "../presentation/character-components";
import {
  preparedFamily,
  preparedPartsAt,
  generatedPreparedMaterial,
  validatePreparedAppearance,
} from "../presentation/engine-people29-data";
import type { PersonAppearance } from "../simulation/types";

function truncated(max: number) {
  const records: CharacterComponentManifestRecord[] = [
    ...full.components.values(),
  ]
    .filter((c) => c.definition.catalog_generation <= max)
    .map(
      (c) =>
        ({
          asset_id: c.assetId,
          asset_type: "character-component",
          fixed_or_modular: "modular",
          generation_status: "approved",
          qa_status: "approved",
          runtime_release_status: c.released ? "released" : "not-released",
          ...(c.fixture ? { availability: "development-fixture" } : {}),
          component: c.definition,
        }) as unknown as CharacterComponentManifestRecord,
    );
  return createCharacterComponentLibrary(
    records,
    {
      catalog_generation: max,
      prepared_profiles: MODULAR45_REGISTRY.preparedProfiles,
      profile_layer_changes: MODULAR45_REGISTRY.profileLayerChanges,
      slots: full.slots,
      generations: full.generations.filter((g) => g.generation <= max),
    } as never,
    full.fit,
    full.skinTone,
  );
}
describe.skipIf(
  !privateModularInputs(
    "old-save.r1.test.ts",
    ["art/manifest/character_candidate_modular45_registry.json"],
    full.catalogGeneration >= 15,
  ),
)(
  "R1 old pinned generations resolve identically after the corrected generation is appended",
  () => {
    for (const g of [12, 13, 14, 15])
      it(`generation ${g}`, { timeout: 180000 }, () => {
        const before = truncated(g);
        let n = 0;
        const members = componentsAtGeneration(before, g);
        expect(componentsAtGeneration(full, g).map((c) => c.assetId)).toEqual(
          members.map((c) => c.assetId),
        );
        for (const body of members.filter(
          (c) =>
            c.definition.kind === "body" &&
            c.definition.family.startsWith("ep41-"),
        )) {
          const bf = body.definition.family;
          const heads = [
            ...new Set(
              members
                .filter(
                  (c) =>
                    c.definition.kind === "head" &&
                    c.definition.compatible_body_families?.includes(bf),
                )
                .map((c) => c.definition.family),
            ),
          ];
          for (const head of heads) {
            const hairs = [
              null,
              ...new Set(
                members
                  .filter(
                    (c) =>
                      c.definition.kind === "hair-front" &&
                      c.definition.compatible_body_families?.includes(bf),
                  )
                  .map((c) => c.definition.family),
              ),
            ];
            for (const hair of hairs) {
              const a: PersonAppearance = {
                seed: "old-save",
                recipeVersion: "appearance-recipe-v2",
                catalogGeneration: g,
                selection: {
                  bodyFamily: bf,
                  headFamily: head,
                  hairFamily: hair,
                },
                material: generatedPreparedMaterial(
                  preparedFamily(bf)!,
                  "old-save",
                  g,
                ),
              } as PersonAppearance;
              for (const pose of ["standing-neutral", "seated-guest-neutral"]) {
                let x: unknown, y: unknown;
                try {
                  const r = resolveCharacterRecipe(
                    { appearance: a, poseFamily: pose },
                    before,
                  );
                  x = [r, projectCharacterLayers(r, before)];
                } catch (e) {
                  x = String(e);
                }
                try {
                  const r = resolveCharacterRecipe(
                    { appearance: a, poseFamily: pose },
                    full,
                  );
                  y = [r, projectCharacterLayers(r, full)];
                } catch (e) {
                  y = String(e);
                }
                expect(y).toEqual(x);
                n++;
              }
              expect(() => validatePreparedAppearance(a)).not.toThrow();
            }
          }
          expect(
            preparedPartsAt(preparedFamily(bf)!, g).filter(
              (p) => (p.introducedGeneration ?? 0) > g,
            ),
          ).toEqual([]);
        }
        console.log(`gen ${g}: ${n} recipe+projection comparisons identical`);
        expect(n).toBeGreaterThan(0);
      });
  },
);
