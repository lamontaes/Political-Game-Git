import { privateModularInputs } from "../presentation/private-test-inputs";
import { describe, expect, it } from "vitest";
import {
  acquirePreparedVariant,
  preparedVariantCacheSize,
} from "../player/engine-people29-svg";
import { resolvePersonPortrait } from "../presentation/person-visual";
import { PRODUCTION_CHARACTER_LIBRARY } from "../presentation/visual-integration";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as review } from "../presentation/engine-people29-review";
import { initializeFreshCandidateOutfits } from "../presentation/complete-outfit";
import { resolveCharacterRecipe } from "../presentation/character-components";
import type { AppearanceMaterial } from "../simulation/appearance-material";
import type { Person, World } from "../simulation/types";

describe("R1 live prepared-variant cap", () => {
  it("all simultaneously mounted people acquire layers and release all entries", () => {
    const held: { release(): void }[] = [];
    let refusedAt: number | null = null;
    // Each mounted MaterialImage holds one ref for as long as it is on screen; keys include the whole
    // per-person material + drawn ids, so no two people share an entry.
    for (let person = 0; person < 12 && refusedAt === null; person++)
      for (let layer = 0; layer < 6; layer++) {
        const material = {
          version: "engine-people29-v1",
          familyId: `f${person}`,
          palettes: {},
          features: {},
        } as unknown as AppearanceMaterial;
        try {
          const v = acquirePreparedVariant(`layer-${layer}`, material, [
            `p${person}`,
          ]);
          void v.url.catch(() => {});
          held.push(v);
        } catch (e) {
          refusedAt = person;
          console.log(
            `person #${person + 1} layer ${layer}: ${String(e)}; live=${preparedVariantCacheSize()}`,
          );
          break;
        }
      }
    held.forEach((h) => h.release());
    expect(refusedAt).toBe(null);
    expect(held).toHaveLength(72);
    expect(preparedVariantCacheSize()).toBe(0);
  });
});
describe.skipIf(
  !privateModularInputs(
    "variant-cache-and-pack.r1.test.ts",
    ["art/manifest/character_candidate_modular45_registry.json"],
    review.catalogGeneration >= 15,
  ),
)("R1 candidate-preview save opened without the private pack", () => {
  it("portrait fails closed with a reason; the recipe resolver throws a named error", () => {
    const w = initializeFreshCandidateOutfits(
      {
        people: {
          a: {
            id: "a",
            givenName: "A",
            familyName: "B",
            identity: { gender: "male" },
            appearance: {
              seed: "s",
              recipeVersion: "appearance-recipe-v2",
              catalogGeneration: 15,
            },
          },
        },
        personOrder: ["a"],
      } as unknown as World,
      review,
      "complete-outfit-v2",
    );
    const person = w.people.a as Person;
    const visual = resolvePersonPortrait(person); // production libraries
    console.log("production portrait:", JSON.stringify(visual));
    expect(visual.kind).toBe("placeholder");
    expect(() =>
      resolveCharacterRecipe(
        { appearance: person.appearance!, poseFamily: "standing-neutral" },
        PRODUCTION_CHARACTER_LIBRARY,
      ),
    ).toThrow(/generation 15/);
  });
});

it("releasing a failed request cannot evict its replacement lease", async () => {
  const material = {
    version: "engine-people29-v1",
    familyId: "missing-fixture",
    palettes: {},
    features: {},
  } as unknown as AppearanceMaterial;
  const old = acquirePreparedVariant("absent-fixture", material, []);
  await old.url.catch(() => {});
  const replacement = acquirePreparedVariant("absent-fixture", material, []);
  old.release();
  expect(preparedVariantCacheSize()).toBe(1);
  await replacement.url.catch(() => {});
  replacement.release();
  expect(preparedVariantCacheSize()).toBe(0);
});
