import { describe, expect, it } from "vitest";

import { relationshipHistory } from "../simulation/queries";
import type { EntityId, World } from "../simulation";
import {
  commitLifeConversation,
  projectLifeConversation,
  type LifeTalkIntent,
} from "./life-conversation";
import { createNewGameWorld } from "./new-game";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { projectPersonDossier } from "./person-dossier";
import {
  chooseOpeningLifeScene,
  currentOpeningLifeScene,
  openNextLifeScene,
} from "./life-scene-flow";

/*
 * Playtest, 2026-09-22: after eleven exchanges and half an hour playing
 * together, the mother's card still said "You last spoke on January 5".
 * Talking wrote an event and nothing between the two people, so the card
 * could not move and time apart could not be measured.
 */

const setup = {
  startKind: "custom",
  seed: "talk-contact",
  placeKey: "lexington-fayette",
  startAge: 6,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: "Audience",
  familyName: "Review",
  gender: "male",
  pronouns: "he-him",
  questionnaire: "skipped",
  appearanceCatalogGeneration: 10,
  appearanceRecipeVersion: "appearance-recipe-v2",
  appearanceOutfitVersion: "complete-outfit-v2",
} as const;

function opening(seed: string = setup.seed) {
  const { world, playerPersonId } = createNewGameWorld({ ...setup, seed });
  const scene = resolveOpeningPlaySceneContext(world, playerPersonId);
  const parent =
    scene.presentPeople.find((person) =>
      ["your mom", "your dad", "your parent", "your guardian"].includes(
        person.relationship ?? "",
      ),
    ) ?? scene.presentPeople[0]!;
  return { world, playerPersonId, parentId: parent.personId };
}

function say(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  intent: LifeTalkIntent,
): World {
  const view = projectLifeConversation(world, playerPersonId, personId);
  if (!view) throw new Error("No conversation is available.");
  if (!view.intents.some((option) => option.key === intent)) {
    throw new Error(`Intent ${intent} is not offered.`);
  }
  return commitLifeConversation(world, {
    playerPersonId,
    personId,
    intent,
    revision: view.revision,
  });
}

describe("talking to somebody", () => {
  it(
    "puts the day's conversation on the two people's shared record once",
    { timeout: 900_000 },
    () => {
      const { world: start, playerPersonId, parentId } = opening();
      const before = relationshipHistory(
        start,
        playerPersonId,
        parentId,
      ).length;

      let world = say(start, playerPersonId, parentId, "greet");
      world = say(world, playerPersonId, parentId, "scene");
      world = say(world, playerPersonId, parentId, "greet");

      const added = relationshipHistory(world, playerPersonId, parentId).slice(
        before,
      );
      // Three turns on one day are one conversation, not three.
      expect(added.map((interaction) => interaction.kind)).toEqual([
        "contact:conversation",
      ]);
      expect(added[0]!.occurredAt).toBe(world.currentDate);

      const card = projectPersonDossier(world, playerPersonId, parentId);
      expect(card.lastInteraction).toContain("You last spoke on");
      expect(
        relationshipHistory(world, playerPersonId, parentId).at(-1)!.occurredAt,
      ).toBe(world.currentDate);
    },
  );

  it("records half an hour together as shared time, and a plan as nothing more", () => {
    let reached = 0;
    for (const seed of [
      "talk-time-a",
      "talk-time-b",
      "talk-time-c",
      "talk-time-d",
    ]) {
      const { world: start, playerPersonId, parentId } = opening(seed);
      let world = say(start, playerPersonId, parentId, "activity");
      world = say(world, playerPersonId, parentId, "suggestGame");
      const offered = projectLifeConversation(world, playerPersonId, parentId);
      const kindsAfterPlan = relationshipHistory(
        world,
        playerPersonId,
        parentId,
      ).map((interaction) => interaction.kind);
      expect(kindsAfterPlan).not.toContain("experience:time-together");
      if (!offered?.intents.some((option) => option.key === "spendTime")) {
        continue;
      }
      reached += 1;
      world = say(world, playerPersonId, parentId, "spendTime");
      const kinds = relationshipHistory(world, playerPersonId, parentId).map(
        (interaction) => interaction.kind,
      );
      expect(
        kinds.filter((kind) => kind === "experience:time-together"),
      ).toHaveLength(1);
    }
    // At least one of these parents agreed to play, or this case measured
    // nothing about time together.
    expect(reached).toBeGreaterThan(0);
  }, 900_000);

  it(
    "puts a scene played with somebody on the shared record, as contact only",
    { timeout: 900_000 },
    () => {
      const { world: start, playerPersonId } = opening("scene-contact");
      let world = start;
      let withSomebody = 0;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        world = openNextLifeScene(world, playerPersonId);
        const scene = currentOpeningLifeScene(world, playerPersonId);
        if (!scene) break;
        world = chooseOpeningLifeScene(
          world,
          playerPersonId,
          scene.eventId,
          scene.definition.choices[0]!.key,
        );
        if (!scene.counterpartPersonId) continue;
        withSomebody += 1;
        const recorded = world.history.relationshipInteractions.filter(
          (interaction) =>
            interaction.stableKey ===
            `opening-life:scene-contact:${scene.eventId}`,
        );
        expect(recorded).toHaveLength(1);
        expect(recorded[0]!.kind).toBe("contact:shared-moment");
        expect(recorded[0]!.change).toBe("maintained");
        expect(recorded[0]!.personIds).toContain(scene.counterpartPersonId);
      }
      expect(withSomebody).toBeGreaterThan(0);
    },
  );
});
