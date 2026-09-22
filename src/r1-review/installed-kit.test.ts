import { privateModularInputs } from "../presentation/private-test-inputs";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "../presentation/engine-people29-review";
import { MODULAR45_REGISTRY as registry } from "../presentation/private-candidate-manifests";
import {
  resolveCharacterRecipe,
  projectCharacterLayers,
} from "../presentation/character-components";
import { resolvePose41 } from "../presentation/pose41-adapter";
import {
  PREPARED_FAMILIES,
  defaultPreparedMaterial,
  preparedFamily,
  selectPreparedBody,
} from "../presentation/engine-people29-data";
import type { PersonAppearance } from "../simulation/types";
const present = fs.existsSync("art/authoring/modular47-r1/calibration.json");
if (process.env.MODULAR_REQUIRE_PRIVATE === "1" && !present)
  throw new Error(
    "Required corrected private kit is missing; no skipped pass permitted",
  );
describe.skipIf(
  !privateModularInputs(
    "installed-kit",
    ["art/authoring/modular47-r1/calibration.json"],
    present,
  ),
)("R1 corrected installed registry", () => {
  it("resolves every authored head/hair/body/outfit and both supported pose mappings", () => {
    const spec = JSON.parse(
      fs.readFileSync("art/authoring/modular47-r1/calibration.json", "utf8"),
    );
    expect(library.catalogGeneration).toBeGreaterThanOrEqual(spec.generation);
    let count = 0,
      poses = 0;
    for (const fit of spec.fits)
      for (const hair of [null, ...fit.hair])
        for (const sleeve of ["short", "long"]) {
          const family = `ep41-${fit.body.split("/")[0]}-body`;
          const appearance: PersonAppearance = {
            seed: "r1-installed",
            recipeVersion: "appearance-recipe-v2",
            catalogGeneration: spec.generation,
            selection: {
              bodyFamily: family,
              headFamily: fit.component.family,
              hairFamily: hair?.component.family ?? null,
            },
            material: defaultPreparedMaterial(
              preparedFamily(family)!,
              spec.generation,
            ),
          };
          const recipe = resolveCharacterRecipe(
            {
              appearance,
              poseFamily: "standing-neutral",
              wardrobe: {
                id: "r1-test",
                families: {
                  top: [
                    `ep41-${fit.body.split("/")[0]}-${sleeve}-sleeve-torso`,
                  ],
                },
              },
            },
            library,
          );
          const parts = recipe.context.components;
          expect(parts.every((p) => p.assetId.startsWith("m47r1-"))).toBe(true);
          expect(parts.find((p) => p.kind === "head")?.assetId).toBe(fit.id);
          expect(
            parts.find((p) => p.kind === "hair-front")?.assetId ?? null,
          ).toBe(hair?.id ?? null);
          expect(projectCharacterLayers(recipe, library)?.fitRefusals).toEqual(
            [],
          );
          for (const target of PREPARED_FAMILIES.filter((f) =>
            /^ep41-(masc|fem)-(lean|average|heavy)-standing-v1$/.test(f.id),
          )) {
            const changed = selectPreparedBody(
              appearance,
              target.id.replace("-standing-v1", "-body"),
            );
            expect(changed?.selection?.headFamily).toBe(
              appearance.selection?.headFamily,
            );
            expect(changed?.selection?.hairFamily).toBe(
              appearance.selection?.hairFamily,
            );
          }
          const ids = (kind: string) =>
            parts.filter((p) => p.kind === kind).map((p) => p.assetId);
          for (const pose of [
            "seated-guest-neutral",
            "standing-listening",
          ] as const) {
            const result = resolvePose41({
              pose,
              bodyAssetId: ids("body")[0]!,
              headAssetId: ids("head")[0]!,
              hairAssetId: ids("hair-front")[0] ?? null,
              outfitAssetIds: parts
                .filter((p) => ["top", "bottom", "footwear"].includes(p.kind))
                .map((p) => p.assetId),
              candidatePreview: true,
            });
            expect(result.status).toBe("ready");
            poses++;
          }
          count++;
        }
    console.info({ standingCombinations: count, poseCombinations: poses });
    expect(count).toBe(216);
    expect(poses).toBe(432);
  });
  it("binds all prepared pose/corrective/expression files in the frozen closure", () => {
    const closures = (
      registry as unknown as {
        preparedClosures: {
          generation: number;
          partIds: string[];
          files: Record<string, string>;
          sha256: string;
        }[];
      }
    ).preparedClosures;
    const closure = closures.find((c) => c.generation === 16)!;
    expect(closure).toBeDefined();
    const { sha256, ...payload } = closure;
    expect(
      createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    ).toBe(sha256);
    expect(closure.partIds.length).toBe(672);
    for (const [file, hash] of Object.entries(closure.files))
      expect(
        createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
        file,
      ).toBe(hash);
  });
});
