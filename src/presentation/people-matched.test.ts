import fs from "node:fs";
import { PNG } from "pngjs";
import { describe, it, expect } from "vitest";
import { PEOPLE_VISUAL4_CHARACTER_LIBRARY as library } from "./people-visual4-review";
import {
  componentsAtGeneration,
  resolveCharacterRecipe,
  projectCharacterLayers,
} from "./character-components";
import matched from "../../art/manifest/character_candidate_matched_registry.json";
import source from "../../art/manifest/character_candidate_coherence_registry.json";

describe("matched collar family", () => {
  it("keeps logical choices exact and hides helper pieces", () => {
    const families = (g: number) =>
      componentsAtGeneration(library, g)
        .map((c) => c.definition.family)
        .sort();
    expect(families(4)).toEqual(families(3));
    expect(
      componentsAtGeneration(library, 4).some(
        (c) => c.definition.render_piece_of,
      ),
    ).toBe(false);
  });
  it("conserves every source color and alpha across disjoint pieces", () => {
    for (const original of source.assets) {
      const owner = matched.assets.find(
        (a) => a.candidate_component.supersedes_asset_id === original.asset_id,
      )!;
      const front = matched.assets.find(
        (a) => a.candidate_component.render_piece_of === owner.asset_id,
      )!;
      const [a, b, c] = [original, owner, front].map((r) =>
        PNG.sync.read(fs.readFileSync(r.final_path)),
      );
      expect([b!.width, b!.height, c!.width, c!.height]).toEqual([
        a!.width,
        a!.height,
        a!.width,
        a!.height,
      ]);
      let errors = 0;
      for (let i = 0; i < a!.data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          if (b!.data[i + j] !== a!.data[i + j]) errors++;
          if (c!.data[i + j] !== a!.data[i + j]) errors++;
        }
        if (b!.data[i + 3]! + c!.data[i + 3]! !== a!.data[i + 3]) errors++;
        if (b!.data[i + 3] !== 0 && c!.data[i + 3] !== 0) errors++;
      }
      expect(errors).toBe(0);
    }
  });
  it("resolves one selected shirt to coordinated fitted pieces on two bodies without changing identity", () => {
    for (const body of ["average-man", "skinny-man"])
      for (const original of source.assets) {
        const appearance = {
          seed: "matched-example",
          recipeVersion: "appearance-recipe-v2",
          catalogGeneration: 4,
          selection: {
            bodyFamily: `wave-a-${body}-standing-neutral-front-a-v1-pv4`,
            headFamily: "pv4-ocd_head_adult_light_oval_young_v1",
            hairFamily: null,
          },
        };
        const request = {
          appearance,
          poseFamily: "standing-neutral",
          wardrobe: {
            id: "matched",
            families: { top: [original.candidate_component.family] },
          },
        };
        const recipe = resolveCharacterRecipe(request, library);
        const old = resolveCharacterRecipe(
          { ...request, appearance: { ...appearance, catalogGeneration: 3 } },
          library,
        );
        expect(recipe.identity).toEqual(old.identity);
        const tops = recipe.context.components.filter((c) => c.kind === "top");
        expect(tops).toHaveLength(2);
        expect(tops.map((c) => c.layer)).toEqual([35, 43]);
        const projected = projectCharacterLayers(recipe, library)!;
        const fitted = projected.layers.filter((c) => c.kind === "top");
        expect(fitted.every((p) => p.fitRefusal === null)).toBe(true);
        expect(
          fitted.map(({ left, top, width, height }) => ({
            left,
            top,
            width,
            height,
          }))[0],
        ).toEqual(
          fitted.map(({ left, top, width, height }) => ({
            left,
            top,
            width,
            height,
          }))[1],
        );
        expect(
          old.context.components.filter((c) => c.kind === "top"),
        ).toHaveLength(1);
      }
  });
});
