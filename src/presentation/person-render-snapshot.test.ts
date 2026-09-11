import { composeSceneCharacter } from "./scene-composition";
import { SCENE_REGISTRY } from "./scene-registry";
import { PRODUCTION_POSE_REGISTRY } from "./visual-integration";
import { PEOPLE_VISUAL4_POSE_ART } from "./people-visual4-review";
import { describe, expect, it } from "vitest";
import {
  createPersonRenderSnapshot,
  recipeFromSnapshot,
} from "./person-render-snapshot";
import {
  PEOPLE_VISUAL4_CHARACTER_LIBRARY as library,
  PEOPLE_VISUAL4_VISUAL_LIBRARY as visuals,
} from "./people-visual4-review";
import { createCharacterProofWorld } from "./character-proof";
import {
  setPersonVisualSelection,
  resolvePersonWardrobeContext,
} from "./person-visual-selection";
import {
  composeCandidateReviewSubject,
  CANDIDATE_REVIEW_PLATE,
} from "./candidate-review";
import { resolvePersonPortrait } from "./person-visual";

const selection = {
  bodyFamily: "wave-a-average-man-standing-neutral-front-a-v1-pv4",
  headFamily: "pv4-ocd_head_adult_light_square_older_lined_v1",
  hairFamily: "pv4-hair-01-light-square-older-lined-v1-front",
};
const families = {
  top: "pv4-wave-a-male-top-brown-fur-hood-parka-v1",
  bottom: "pv4-wave-a-male-bottom-black-joggers-v1",
  footwear:
    "pv4-wave-a-footwear-low-top-sneaker-gray-v1-wave-a-average-man-standing-neutral-front-a-v1-pv4",
};
function fixture() {
  const initial = createCharacterProofWorld(
    library,
    "people-visual4-canonical-review-v1",
    1,
  );
  const personId = initial.personOrder[0]!;
  const world = setPersonVisualSelection(initial, personId, selection, {
    library,
    poseFamily: "standing-neutral",
  });
  const person = world.people[personId]!;
  const wardrobe = resolvePersonWardrobeContext(
    person,
    { personId, families },
    { library, poseFamily: "standing-neutral" },
  );
  return { person, wardrobe };
}

describe("person presentation snapshot", () => {
  it("captures effective wardrobe without replacing seeded identity and shares one recipe across consumers", () => {
    const { person, wardrobe } = fixture();
    const original = JSON.stringify(person.appearance);
    const snapshot = createPersonRenderSnapshot({
      personId: person.id,
      appearance: person.appearance!,
      wardrobe,
      library,
    });
    const recipe = snapshot.recipeForPose("standing-neutral");
    expect(recipe.identity.slots.top).toBe(
      "pv4-wave-a-male-top-green-cable-sweater-v1",
    );
    expect(
      recipe.context.components.find((c) => c.kind === "top")?.assetId,
    ).toBe("pv4_wave_a_male_top_brown_fur_hood_parka_v1");
    expect(snapshot.recipeForPose("standing-neutral")).toBe(recipe);
    const subject = composeCandidateReviewSubject({
      personId: person.id,
      appearance: person.appearance,
      snapshot,
      library,
      visualLibrary: visuals,
      bodyAssetId: "wave_a_average_man_standing_neutral_front_a_v1_pv4",
      plate: CANDIDATE_REVIEW_PLATE,
    })!;
    expect(subject.recipe).toBe(recipe);
    const portrait = resolvePersonPortrait(person, {
      libraries: { characters: library, visuals },
      snapshot,
    });
    expect(portrait.kind).toBe("modular");
    if (portrait.kind === "modular")
      expect(portrait.plan.layers.map((l) => [l.assetId, l.url])).toEqual(
        subject.plan.layers.map((l) => [l.assetId, l.url]),
      );
    const pair = [...SCENE_REGISTRY.scenes.values()].flatMap((scene) =>
      [...scene.anchors.values()]
        .filter(
          (anchor) =>
            anchor.kind === "floor-standing" &&
            scene.floorCalibration &&
            scene.standardBodyWidthPercent !== null,
        )
        .map((anchor) => ({ scene, anchor })),
    )[0]!;
    const scene = composeSceneCharacter({
      personId: person.id,
      displayName: "Snapshot person",
      appearance: person.appearance!,
      snapshot,
      ...pair,
      library,
      visualLibrary: visuals,
      poseRegistry: PRODUCTION_POSE_REGISTRY,
      poseArt: PEOPLE_VISUAL4_POSE_ART,
    });
    expect(scene.complete).toBe(true);
    expect(scene.recipe).toBe(recipe);
    expect(scene.layers.map((l) => [l.assetId, l.url])).toEqual(
      subject.plan.layers.map((l) => [l.assetId, l.url]),
    );
    expect(JSON.stringify(person.appearance)).toBe(original);
    expect(() =>
      recipeFromSnapshot(
        snapshot,
        "foreign-person",
        person.appearance!,
        library,
        "standing-neutral",
      ),
    ).toThrow(/snapshot/);
    expect(() =>
      recipeFromSnapshot(
        snapshot,
        person.id,
        { ...person.appearance!, seed: "foreign-seed" },
        library,
        "standing-neutral",
      ),
    ).toThrow(/snapshot/);
    expect(() =>
      recipeFromSnapshot(
        snapshot,
        person.id,
        person.appearance!,
        library,
        "standing-neutral",
        { ...wardrobe, id: "another-context" },
      ),
    ).toThrow(/snapshot/);
    expect(Object.isFrozen(snapshot.appearance)).toBe(true);
    expect(Object.isFrozen(recipe.context.components)).toBe(true);
  });
  it("captures caller-owned preferences and preserves the legacy generation pin", () => {
    const { person, wardrobe } = fixture();
    const mutable = structuredClone(wardrobe);
    const appearance = { ...person.appearance!, catalogGeneration: undefined };
    const snapshot = createPersonRenderSnapshot({
      personId: person.id,
      appearance,
      wardrobe: mutable,
      library: { ...library, catalogGeneration: 2 },
    });
    (mutable.families as Record<string, string[]>).top = ["unknown-family"];
    const recipe = snapshot.recipeForPose("standing-neutral");
    expect(recipe.catalogGeneration).toBe(1);
    expect(
      recipe.context.components.find((c) => c.kind === "top")?.assetId,
    ).toBe("pv4_wave_a_male_top_brown_fur_hood_parka_v1");
    expect(() =>
      resolvePersonWardrobeContext(
        person,
        { personId: person.id, families: { top: "unknown-family" } },
        { library, poseFamily: "standing-neutral" },
      ),
    ).toThrow();
  });
});
