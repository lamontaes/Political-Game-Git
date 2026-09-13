import { describe, it, expect } from "vitest";
import { PEOPLE_VISUAL4_CHARACTER_LIBRARY as library } from "./people-visual4-review";
import {
  resolveCompleteOutfit,
  findCompleteOutfit,
  commitCompleteOutfit,
  initializeFreshCandidateOutfits,
} from "./complete-outfit";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { resolveCharacterRecipe } from "./character-components";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
const poseFamily = "standing-neutral";
const appearance = {
  seed: "p29",
  recipeVersion: "appearance-recipe-v2",
  catalogGeneration: 4,
  selection: {
    bodyFamily: "wave-a-average-man-standing-neutral-front-a-v1-pv4",
    headFamily: "pv4-ocd_head_adult_light_oval_young_v1",
    hairFamily: null,
  },
};
describe("complete outfit transaction", () => {
  it("finds a full fitted outfit and rejects incompatible retained clothing", () => {
    const found = findCompleteOutfit({ appearance, library, poseFamily });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(
      resolveCompleteOutfit({
        appearance,
        library,
        poseFamily,
        families: { ...found.families, top: "missing-family" },
      }).ok,
    ).toBe(false);
    expect(
      found.recipe.context.components.filter((p) =>
        ["body", "head", "top", "bottom", "footwear"].includes(p.kind),
      ).length,
    ).toBeGreaterThanOrEqual(5);
  });
  it("rejects before mutation; confirmed World outfit wins over stale shell and survives reopen", () => {
    let world = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "p29-save",
      startAge: 34,
      appearanceCatalogGeneration: 4,
    }).world;
    if (world.control.kind !== "person") throw Error("control");
    const id = world.control.personId;
    const own = { ...appearance, seed: world.people[id]!.appearance!.seed };
    const result = findCompleteOutfit({ appearance: own, library, poseFamily });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const before = serializeWorld(world);
    expect(() =>
      commitCompleteOutfit(world, id, own, {
        library,
        poseFamily,
        families: { top: "missing" },
      }),
    ).toThrow();
    expect(serializeWorld(world)).toBe(before);
    world = commitCompleteOutfit(world, id, own, {
      library,
      poseFamily,
      families: result.families,
    });
    const reopened = deserializeWorld(serializeWorld(world));
    expect(reopened.people[id]!.appearance).toEqual(
      world.people[id]!.appearance,
    );
    const actual = resolveCharacterRecipe(
      {
        appearance: reopened.people[id]!.appearance!,
        poseFamily,
        wardrobe: { id: "stale", families: { top: ["missing"] } },
      },
      library,
    );
    expect(actual.context.components).toEqual(result.recipe.context.components);
  });
  it("initializes only supplied fresh candidate people deterministically and retains explicit choices", () => {
    const original = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "p29-fresh",
      startAge: 34,
      appearanceCatalogGeneration: 4,
    }).world;
    const fresh = initializeFreshCandidateOutfits(original, library);
    expect(initializeFreshCandidateOutfits(original, library)).toEqual(fresh);
    expect(initializeFreshCandidateOutfits(fresh, library)).toEqual(fresh);
    for (const p of Object.values(fresh.people))
      expect(
        resolveCompleteOutfit({
          appearance: p.appearance!,
          library,
          poseFamily,
        }).ok,
      ).toBe(true);
    for (const p of Object.values(original.people))
      expect(p.appearance?.outfit).toBeUndefined();
  });
});

describe("complete outfit version boundaries", () => {
  it("refuses future outfit payloads on save decode", () => {
    const world = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "future-outfit",
    }).world;
    const id = world.personOrder[0]!;
    const invalid = {
      ...world,
      people: {
        ...world.people,
        [id]: {
          ...world.people[id]!,
          appearance: {
            ...world.people[id]!.appearance!,
            outfit: { version: "future-outfit", families: {} },
          },
        },
      },
    };
    expect(() => serializeWorld(invalid as unknown as typeof world)).toThrow(
      /outfit/i,
    );
  });
});
