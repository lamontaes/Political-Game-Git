import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "./new-game";
import { artPreviewLibraries } from "./art-preview";
import { planLifeScenePeople } from "./life-scene-people";
import { PRIVATE_CANDIDATE_ART_AVAILABLE } from "./private-candidate-manifests";
import type { Person, World } from "../simulation";

const game = createNewGameWorld({
  placeKey: "kentucky",
  startAge: 34,
  depth: "summarize-earlier-life",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  seed: "g41-contact-test",
  givenName: null,
  familyName: null,
  appearanceRecipeVersion: "appearance-recipe-v2",
  appearanceCatalogGeneration: 9,
});
const base = Object.values(game.world.people).find(
  (p) => p.id !== game.playerPersonId,
)!;
const people: Person[] = [0, 1, 2].map((i) => ({
  ...base,
  id: `g41-test-${i}`,
  birthDate: "1970-01-01",
  appearance: {
    seed: `g41-${i}`,
    recipeVersion: "appearance-recipe-v2",
    catalogGeneration: 9,
    selection: {
      bodyFamily: "ep40-masc-average-body",
      headFamily: "ep40-masc-average-head",
      hairFamily: "ep40-masc-average-hair",
    },
    outfit: {
      version: "complete-outfit-v1",
      families: {
        top: `ep40-masc-average-${i === 0 ? "blue-polo" : "navy-shirt"}-torso`,
        bottom: "ep40-masc-average-trousers",
        footwear: "ep40-masc-average-shoes",
      },
    },
  },
}));
const world: World = {
  ...game.world,
  people: {
    ...game.world.people,
    ...Object.fromEntries(people.map((p) => [p.id, p])),
  },
};
const present = people.map((p) => ({
  personId: p.id,
  name: p.givenName,
  relationship: null,
  introduction: "Test-only occupancy",
}));
const options = {
  wardrobeByPersonId: {},
  artPreview: artPreviewLibraries("candidate-review")!,
};

// PEOPLE40 bodies and POSE41 fits are owner-private and absent from a public checkout.
describe.skipIf(!PRIVATE_CANDIDATE_ART_AVAILABLE)(
  "POSE41 per-person scene consumer",
  () => {
    it("keeps an unsupported polo standing and gives the exact seated outfit the sofa", () => {
      const before = JSON.stringify(world);
      const result = planLifeScenePeople(
        world,
        present,
        "residence-apartment-living-canonical-03",
        undefined,
        options,
      );
      expect(result).toHaveLength(3);
      expect(result.find((p) => p.personId === "g41-test-0")?.seated).toBe(
        false,
      );
      expect(
        result.some((p) => p.anchorId === "sofa-seated" && p.sourcePoseId),
      ).toBe(true);
      expect(new Set(result.map((p) => p.anchorId)).size).toBe(3);
      const standingFallback = result.find(
        (person) => person.anchorId === "living-room-middle-standing",
      );
      expect(standingFallback?.hasArt).toBe(true);
      expect(standingFallback?.seated).toBe(false);
      expect(standingFallback?.artDiagnostics).toContain(
        "preferred-pose-substituted",
      );
      expect(
        result.some((person) =>
          ["club-chair-seated", "entry-side-standing"].includes(
            person.anchorId,
          ),
        ),
      ).toBe(false);
      expect(
        planLifeScenePeople(
          world,
          [...present].reverse(),
          "residence-apartment-living-canonical-03",
          undefined,
          options,
        ),
      ).toEqual(result);
      expect(JSON.stringify(world)).toBe(before);
    });
    it("uses standing places in the workroom and does not create attendance", () => {
      const result = planLifeScenePeople(
        world,
        present,
        "shared-workroom-office-production",
        undefined,
        options,
      );
      expect(result).toHaveLength(3);
      expect(result.every((p) => !p.seated)).toBe(true);
      expect(result.some((p) => p.anchorId === "workroom-floor-standing")).toBe(
        true,
      );
      expect(
        planLifeScenePeople(
          world,
          [],
          "residence-apartment-living-canonical-03",
          undefined,
          options,
        ),
      ).toEqual([]);
      expect(
        planLifeScenePeople(
          world,
          [{ ...present[0], personId: "not-in-world" }],
          "residence-apartment-living-canonical-03",
          undefined,
          options,
        ),
      ).toEqual([]);
    });
  },
);
