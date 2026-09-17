import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  initializeFreshCandidateOutfits,
  commitCompleteOutfit,
} from "./complete-outfit";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { describe, it, expect } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "./engine-people29-review";
import {
  ENGINE_PEOPLE29_FAMILIES,
  selectPreparedBody,
  validatePreparedAppearance,
} from "./engine-people29-data";
import { resolveCompleteOutfit, findCompleteOutfit } from "./complete-outfit";
import { PEOPLE_VISUAL4_CHARACTER_LIBRARY as old } from "./people-visual4-review";
import { resolveCharacterRecipe } from "./character-components";
import { artPreviewLibraries } from "./art-preview";
import {
  PRIVATE_CANDIDATE_ART_AVAILABLE,
  candidateRegistry,
} from "./private-candidate-manifests";
// Prepared candidate art is owner-private and absent from a public checkout.
const needsPrivateArt = !PRIVATE_CANDIDATE_ART_AVAILABLE;
const data = candidateRegistry("engine29");
describe.skipIf(needsPrivateArt)("prepared candidate increment", () => {
  it("preserves old generations and never promotes source art", () => {
    expect(artPreviewLibraries("production")).toBeNull();
    expect(
      data.assets.every(
        (a) =>
          a.generation_status === "draft" &&
          a.qa_status === "pending" &&
          a.runtime_release_status === "unreleased",
      ),
    ).toBe(true);
    for (const g of [1, 2, 3, 4])
      for (const seed of ["p29-old-a", "p29-old-b"]) {
        const appearance = {
          seed,
          recipeVersion: "appearance-recipe-v2",
          catalogGeneration: g,
        };
        const request = {
          appearance,
          poseFamily: "standing-neutral",
          unresolvableRequiredSlots: "diagnose" as const,
        };
        expect(resolveCharacterRecipe(request, library)).toEqual(
          resolveCharacterRecipe(request, old),
        );
      }
  });
  it("all six distinct families have complete real top and bottom alternatives", () => {
    expect(new Set(ENGINE_PEOPLE29_FAMILIES.map((f) => f.bodyType)).size).toBe(
      6,
    );
    for (const family of ENGINE_PEOPLE29_FAMILIES) {
      const body = family.parts.find((p) => p.kind === "body")!.id;
      const appearance = selectPreparedBody(
        {
          seed: "prepared",
          recipeVersion: "appearance-recipe-v2",
          catalogGeneration: 5,
        },
        body,
      )!;
      validatePreparedAppearance(appearance);
      const found = findCompleteOutfit({
        appearance,
        library,
        poseFamily: "standing-neutral",
      });
      expect(found.ok, family.id).toBe(true);
      if (!found.ok) continue;
      for (const name of ["default", "wardrobe"]) {
        const ids = family.recipes[name]!;
        const top = ids.find((id) => id.endsWith("-torso"))!;
        const bottom = ids.find(
          (id) => family.parts.find((p) => p.id === id)?.kind === "bottom",
        )!;
        const result = resolveCompleteOutfit({
          appearance,
          library,
          poseFamily: "standing-neutral",
          families: { ...found.families, top, bottom },
        });
        expect(result.ok, JSON.stringify(result)).toBe(true);
      }
      expect(
        resolveCompleteOutfit({
          appearance,
          library,
          poseFamily: "seated-guest-neutral",
        }).ok,
      ).toBe(false);
    }
  });
});

it.skipIf(needsPrivateArt)(
  "freezes source bytes and generation5 while old fresh replay markers reproduce",
  () => {
    // Generation 5 = engine-people29; later additive generations preserve it.
    // The retained current-bank pack reaches MODULAR41 generation 12; the
    // MODULAR45 people repair adds generation 13 on top of it.
    expect(library.catalogGeneration).toBe(13);
    for (const asset of data.assets)
      expect(
        createHash("sha256")
          .update(readFileSync(asset.final_path))
          .digest("hex"),
      ).toBe(asset.hash);
    for (const family of data.families)
      for (const part of family.parts)
        expect(
          createHash("sha256").update(readFileSync(part.svgPath)).digest("hex"),
        ).toBe(part.sha256);
    const world = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "p29-frozen-4",
      startAge: 34,
      appearanceCatalogGeneration: 4,
    }).world;
    expect(initializeFreshCandidateOutfits(world, library)).toEqual(
      initializeFreshCandidateOutfits(world, old),
    );
  },
);
it.skipIf(needsPrivateArt)(
  "rejects bad material before commit and preserves valid marked save data",
  () => {
    const world = initializeFreshCandidateOutfits(
      createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "p29-parameter-save",
        startAge: 34,
        appearanceCatalogGeneration: 5,
      }).world,
      library,
    );
    if (world.control.kind !== "person") throw Error("Expected person");
    const id = world.control.personId,
      appearance = world.people[id]!.appearance!;
    const before = serializeWorld(world);
    expect(deserializeWorld(before).people[id]!.appearance).toEqual(appearance);
    for (const material of [
      { ...appearance.material!, version: "future-v2" },
      {
        ...appearance.material!,
        palettes: { ...appearance.material!.palettes, skin: "unknown" },
      },
      {
        ...appearance.material!,
        features: {
          ...appearance.material!.features,
          nose: { ...appearance.material!.features.nose, x: 50 },
        },
      },
      { ...appearance.material!, familyId: "other-family" },
    ]) {
      expect(() =>
        commitCompleteOutfit(
          world,
          id,
          { ...appearance, material } as typeof appearance,
          {
            library,
            poseFamily: "standing-neutral",
            families: appearance.outfit!.families,
          },
        ),
      ).toThrow();
      expect(serializeWorld(world)).toBe(before);
    }
  },
);
