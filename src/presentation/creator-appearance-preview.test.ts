import { describe, expect, it } from "vitest";
import {
  creatorAppearanceDraft,
  creatorBodyAllowed,
  applyCreatorAppearance,
} from "./creator-appearance-preview";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "./engine-people29-review";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import {
  commitCompleteOutfit,
  initializeFreshCandidateOutfits,
} from "./complete-outfit";
import { selectPreparedBody } from "./engine-people29-data";
import { buildSeedFor } from "./new-game-identity";
import { PRIVATE_CANDIDATE_ART_AVAILABLE } from "./private-candidate-manifests";

const setup: NewGameSetup = {
  startKind: "custom",
  placeKey: "lexington-fayette",
  startAge: 34,
  depth: "summarize-earlier-life",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  seed: "kit41-continuity",
  givenName: "Maya",
  familyName: "Grey",
  questionnaire: "skipped",
  appearanceRecipeVersion: "appearance-recipe-v2",
  appearanceCatalogGeneration: 10,
  appearanceOutfitVersion: "complete-outfit-v2",
};

// Generation-10+ prepared bodies are owner-private and absent from a public checkout.
describe.skipIf(!PRIVATE_CANDIDATE_ART_AVAILABLE)(
  "KIT41 creator-to-life continuity",
  () => {
    it("edits all six bodies without starting a household or changing the generator inputs", () => {
      const draft = creatorAppearanceDraft(setup, library)!;
      const id = draft.personOrder[0]!;
      expect(draft.personOrder).toHaveLength(1);
      const beforeSeed = buildSeedFor(setup);
      for (const body of [
        "masc-average",
        "fem-average",
        "masc-heavy",
        "masc-lean",
        "fem-heavy",
        "fem-lean",
      ]) {
        const appearance = selectPreparedBody(
          draft.people[id]!.appearance!,
          `ep41-${body}-body`,
        )!;
        expect(appearance.selection?.bodyFamily).toBe(`ep41-${body}-body`);
        expect(appearance.seed).toBe(draft.people[id]!.appearance!.seed);
      }
      expect(buildSeedFor(setup)).toBe(beforeSeed);
      expect(draft.actionSequence).toBe(0);
    });

    it("commits exactly the previewed recipe after ordinary creation, with other people/history unchanged", () => {
      const draft = creatorAppearanceDraft(setup, library)!;
      const id = draft.personOrder[0]!;
      const appearance = draft.people[id]!.appearance!;
      const edited = commitCompleteOutfit(
        draft,
        id,
        {
          ...appearance,
          selection: { ...appearance.selection!, hairFamily: null },
        },
        {
          library,
          poseFamily: "standing-neutral",
          families: appearance.outfit!.families,
        },
      );
      const game = createNewGameWorld(setup);
      expect(game.playerPersonId).toBe(id);
      const world = initializeFreshCandidateOutfits(
        game.world,
        library,
        "complete-outfit-v2",
      );
      const saved = applyCreatorAppearance(
        world,
        { personId: id, appearance: edited.people[id]!.appearance! },
        library,
      );
      expect(saved.people[id]!.appearance).toEqual(
        edited.people[id]!.appearance,
      );
      expect(saved.history).toBe(world.history);
      expect(saved.currentMoment).toBe(world.currentMoment);
      for (const other of world.personOrder.filter((p) => p !== id))
        expect(saved.people[other]).toBe(world.people[other]);
      expect(applyCreatorAppearance(world, null, library)).toBe(world);
    });
  },
);

describe.skipIf(!PRIVATE_CANDIDATE_ART_AVAILABLE)(
  "Normal Start body choices",
  () => {
    it("accepts only the three supported masculine families for a male normal start", () => {
      const male = {
        ...setup,
        startKind: "normal" as const,
        gender: "male" as const,
      };
      for (const shape of ["lean", "average", "heavy"]) {
        expect(creatorBodyAllowed(male, `ep41-masc-${shape}-body`)).toBe(true);
        expect(creatorBodyAllowed(male, `ep41-fem-${shape}-body`)).toBe(false);
      }
      expect(creatorBodyAllowed(male, "unknown-body")).toBe(false);
      expect(
        creatorBodyAllowed(
          { ...male, startKind: "custom" },
          "ep41-fem-average-body",
        ),
      ).toBe(true);
      for (const gender of ["female", "nonbinary", "unstated"] as const)
        expect(
          creatorBodyAllowed({ ...male, gender }, "ep41-fem-average-body"),
        ).toBe(true);
      const draft = creatorAppearanceDraft(male, library)!;
      expect(
        creatorBodyAllowed(
          male,
          draft.people[draft.personOrder[0]!]!.appearance!.selection!
            .bodyFamily,
        ),
      ).toBe(true);
    });
  },
);
