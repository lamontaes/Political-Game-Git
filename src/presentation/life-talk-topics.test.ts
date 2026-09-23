import { describe, expect, it } from "vitest";

import type { EntityId, World } from "../simulation";
import {
  commitLifeConversation,
  projectLifeConversation,
  type LifeTalkIntent,
} from "./life-conversation";
import {
  chooseOpeningLifeScene,
  currentOpeningLifeScene,
  openNextLifeScene,
} from "./life-scene-flow";
import { createNewGameWorld } from "./new-game";
import { TELL_PREFIX, tellableTopics } from "./life-talk-topics";
import { activeOrdinaryGoal } from "../simulation/life-personality";

/*
 * ChatGPT, 2026-09-22: "What do you want to tell me?" with no way to tell them
 * anything has to become a conversation about something in the character's
 * life, answered according to the person and their history together.
 */

const setup = {
  startKind: "custom",
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

function say(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  intent: LifeTalkIntent,
): World {
  const view = projectLifeConversation(world, playerPersonId, personId);
  if (!view) throw new Error("No conversation is available.");
  if (!view.intents.some((option) => option.key === intent))
    throw new Error(`Intent ${intent} is not offered.`);
  return commitLifeConversation(world, {
    playerPersonId,
    personId,
    intent,
    revision: view.revision,
  });
}

/** Play scenes until one with somebody resolves; return who was not in it. */
function livedSomethingWithSomebody(seed: string) {
  const game = createNewGameWorld({ ...setup, seed });
  const playerPersonId = game.playerPersonId;
  let world = game.world;
  for (let attempt = 0; attempt < 15; attempt += 1) {
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
    // Somebody at home now who was not part of that scene.
    world = openNextLifeScene(world, playerPersonId);
    const now = currentOpeningLifeScene(world, playerPersonId);
    const listener = now?.presentPersonIds.find(
      (id) =>
        id !== playerPersonId &&
        id !== scene.counterpartPersonId &&
        !activeOrdinaryGoal(world, id, "privacy") &&
        tellableTopics(world, playerPersonId, id).some(
          (topic) => topic.kind === "experience",
        ),
    );
    if (listener) return { world, playerPersonId, listener };
  }
  return null;
}

describe("telling somebody something", () => {
  it(
    "offers real things from the player's life, and the listener comes to know them",
    { timeout: 900_000 },
    () => {
      let found: ReturnType<typeof livedSomethingWithSomebody> = null;
      for (const seed of [
        "tell-a",
        "tell-b",
        "tell-c",
        "tell-d",
        "tell-e",
        "tell-f",
        "tell-g",
        "tell-h",
      ]) {
        found = livedSomethingWithSomebody(seed);
        if (found) break;
      }
      expect(found).not.toBeNull();
      const { playerPersonId, listener } = found!;
      let world = say(found!.world, playerPersonId, listener, "share");
      const view = projectLifeConversation(world, playerPersonId, listener)!;
      const tell = view.intents.find((option) =>
        option.key.startsWith(TELL_PREFIX),
      );
      expect(tell).toBeDefined();
      expect(tell!.label).toMatch(
        /^Tell them about .+ (at school|at home|in the neighborhood)/,
      );
      // There is always a way out that is not a dead end.
      expect(view.intents.some((option) => option.key === "nothing")).toBe(
        true,
      );

      const topic = tellableTopics(world, playerPersonId, listener).find(
        (entry) => entry.key === tell!.key,
      )!;
      expect(topic.kind).toBe("experience");
      world = say(world, playerPersonId, listener, tell!.key as LifeTalkIntent);
      const reply = projectLifeConversation(
        world,
        playerPersonId,
        listener,
      )!.transcript.at(-1)!.reply;
      expect(reply.length).toBeGreaterThan(0);
      expect(reply).not.toContain("What do you want to tell me");

      if (topic.kind !== "experience") throw new Error("unreachable");
      const learned = world.history.knowledge.filter(
        (record) => record.personId === listener,
      );
      // A listener with no need for quiet was chosen, so it is heard.
      expect(reply.startsWith("Can it wait")).toBe(false);
      {
        const record = learned.find(
          (entry) => entry.eventId === topic.eventId,
        )!;
        expect(record.source).toEqual({
          kind: "told-by",
          sourcePersonId: playerPersonId,
          claimId: null,
        });
        // Once told, it is not offered to them again.
        expect(
          tellableTopics(world, playerPersonId, listener).some(
            (entry) => entry.key === tell!.key,
          ),
        ).toBe(false);
      }
    },
  );

  it(
    "lets the player say it can wait, with no dead end",
    { timeout: 900_000 },
    () => {
      const game = createNewGameWorld({ ...setup, seed: "tell-nothing" });
      const world0 = openNextLifeScene(game.world, game.playerPersonId);
      const scene = currentOpeningLifeScene(world0, game.playerPersonId)!;
      const listener = scene.presentPersonIds.find(
        (id) => id !== game.playerPersonId,
      )!;
      let world = say(world0, game.playerPersonId, listener, "share");
      world = say(world, game.playerPersonId, listener, "nothing");
      const reply = projectLifeConversation(
        world,
        game.playerPersonId,
        listener,
      )!.transcript.at(-1)!.reply;
      expect(reply).toMatch(/whenever you like|Another time/);
    },
  );
});
