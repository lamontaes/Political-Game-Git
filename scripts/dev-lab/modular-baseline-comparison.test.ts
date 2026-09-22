/** Run explicitly with MODULAR_BASELINE_ROOT pointing at preserved 631450da + its pack. */
import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as current } from "../../src/presentation/engine-people29-review";
import * as api from "../../src/presentation/character-components";
import * as data from "../../src/presentation/engine-people29-data";
import type { PersonAppearance } from "../../src/simulation/types";
const root = process.env.MODULAR_BASELINE_ROOT;
if (!root)
  console.info(
    "Historical cross-source baseline NOT_TESTED: set MODULAR_BASELINE_ROOT to preserved 631450da checkout and pack.",
  );
describe.skipIf(!root)("cross-source 631450da historical pins", () => {
  it("compares independently loaded baseline code/pack with the composed source", async () => {
    const baselineRoot = resolve(root!);
    expect(
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: baselineRoot,
        encoding: "utf8",
      }).trim(),
    ).toBe("631450da65b1ca92fd3fd9bde819b7b3d3a2835e");
    const beforeApi = (await import(
      /* @vite-ignore */ baselineRoot +
        "/src/presentation/character-components.ts"
    )) as typeof api;
    const beforeData = (await import(
      /* @vite-ignore */ baselineRoot +
        "/src/presentation/engine-people29-data.ts"
    )) as typeof data;
    const { ENGINE_PEOPLE29_CHARACTER_LIBRARY: before } = (await import(
      /* @vite-ignore */ baselineRoot +
        "/src/presentation/engine-people29-review.ts"
    )) as { ENGINE_PEOPLE29_CHARACTER_LIBRARY: typeof current };
    expect(before.catalogGeneration).toBe(15);
    expect(current.catalogGeneration).toBe(16);
    const counts: Record<string, number> = {};
    for (const generation of [13, 14, 15]) {
      let count = 0;
      const members = beforeApi.componentsAtGeneration(before, generation);
      expect(
        api.componentsAtGeneration(current, generation).map((c) => c.assetId),
      ).toEqual(members.map((c) => c.assetId));
      for (const body of members.filter(
        (c) =>
          c.definition.kind === "body" &&
          c.definition.family.startsWith("ep41-"),
      )) {
        const family = body.definition.family;
        const oldFamily = beforeData.preparedFamily(family)!;
        const newFamily = data.preparedFamily(family)!;
        expect(
          data.preparedPartsAt(newFamily, generation).map((p) => p.id),
        ).toEqual(
          beforeData.preparedPartsAt(oldFamily, generation).map((p) => p.id),
        );
        const heads = [
          ...new Set(
            members
              .filter(
                (c) =>
                  c.definition.kind === "head" &&
                  c.definition.compatible_body_families?.includes(family),
              )
              .map((c) => c.definition.family),
          ),
        ];
        const hairs = [
          null,
          ...new Set(
            members
              .filter(
                (c) =>
                  c.definition.kind === "hair-front" &&
                  c.definition.compatible_body_families?.includes(family),
              )
              .map((c) => c.definition.family),
          ),
        ];
        for (const headFamily of heads)
          for (const hairFamily of hairs) {
            const appearance: PersonAppearance = {
              seed: "cross-source-pin",
              recipeVersion: "appearance-recipe-v2",
              catalogGeneration: generation,
              selection: { bodyFamily: family, headFamily, hairFamily },
              material: beforeData.generatedPreparedMaterial(
                oldFamily,
                "cross-source-pin",
                generation,
              ),
            };
            expect(
              data.generatedPreparedMaterial(
                newFamily,
                "cross-source-pin",
                generation,
              ),
            ).toEqual(appearance.material);
            for (const poseFamily of [
              "standing-neutral",
              "seated-guest-neutral",
            ]) {
              const request = { appearance, poseFamily };
              function resolved(fn: () => unknown) {
                try {
                  return fn();
                } catch (e) {
                  return { error: String(e) };
                }
              }
              const oldRecipe = resolved(() =>
                beforeApi.resolveCharacterRecipe(request, before),
              );
              const newRecipe = resolved(() =>
                api.resolveCharacterRecipe(request, current),
              );
              expect(newRecipe).toEqual(oldRecipe);
              count++;
            }
          }
      }
      expect(count).toBeGreaterThan(0);
      counts[generation] = count;
      console.log(
        `generation ${generation}: ${count} cross-source comparisons`,
      );
    }
    if (process.env.MODULAR_COMPARISON_REPORT)
      writeFileSync(
        process.env.MODULAR_COMPARISON_REPORT,
        JSON.stringify(
          {
            baselineSha: "631450da65b1ca92fd3fd9bde819b7b3d3a2835e",
            baselineRoot,
            baselineGeneration: before.catalogGeneration,
            currentGeneration: current.catalogGeneration,
            counts,
            passed: true,
          },
          null,
          2,
        ),
      );
  }, 120000);
});
