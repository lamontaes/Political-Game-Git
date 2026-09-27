import { describe, expect, it } from "vitest";

import { deserializeWorld, serializeWorld, type World } from "../simulation";
import { linePartsOf } from "./english-composition";
import {
  commitLifeConversation,
  projectLifeConversation,
} from "./life-conversation";
import { createNewGameWorld } from "./new-game";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { SMALL_TALK_BANKS } from "./small-talk-english";

/** An adult who shares a home, so the housemate is someone to greet twice. */
function adultAtHome(seed: string) {
  const { world, playerPersonId } = createNewGameWorld({
    startKind: "custom",
    seed,
    placeKey: "lexington-fayette",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    givenName: "Jordan",
    familyName: "Review",
    gender: "unstated",
    pronouns: "they-them",
    questionnaire: "skipped",
    appearanceCatalogGeneration: 10,
    appearanceRecipeVersion: "appearance-recipe-v2",
    appearanceOutfitVersion: "complete-outfit-v2",
  } as never);
  const present = resolveOpeningPlaySceneContext(world, playerPersonId)
    .presentPeople[0];
  return present ? { world, playerPersonId, personId: present.personId } : null;
}

function greet(world: World, playerPersonId: string, personId: string): World {
  const view = projectLifeConversation(world, playerPersonId, personId)!;
  return commitLifeConversation(world, {
    playerPersonId,
    personId,
    intent: "greet",
    revision: view.revision,
  });
}

describe("a second greeting, built from reviewed parts", () => {
  it(
    "answers from the greet-again bank, saves its parts, and gives the same words after a reload",
    { timeout: 300_000 },
    () => {
      const seen = new Set<string>();
      let reached = 0;
      for (const seed of ["again-a", "again-b", "again-c", "again-d"]) {
        const home = adultAtHome(seed);
        if (!home) continue;
        reached += 1;
        const once = greet(home.world, home.playerPersonId, home.personId);
        const saved = deserializeWorld(serializeWorld(once));
        const twice = greet(once, home.playerPersonId, home.personId);
        const reloaded = greet(saved, home.playerPersonId, home.personId);

        const turn = twice.history.events.at(-1)!;
        const parts = linePartsOf(turn.tags);
        expect(
          parts?.some((key) => key.startsWith("small-talk.greet-again:core:")),
        ).toBe(true);
        expect(turn.context.immediateReaction).toBeTruthy();
        // The same moment after Save and Continue says the same thing.
        expect(reloaded.history.events.at(-1)!.context.immediateReaction).toBe(
          turn.context.immediateReaction,
        );
        seen.add(turn.context.immediateReaction!);
      }
      expect(reached).toBeGreaterThan(0);
      // Different lives do not all get the one fixed line.
      expect(seen.size).toBeGreaterThan(1);
      expect([...seen]).not.toEqual(["Hi again."]);
    },
  );

  it(
    "does not reach for the same parts again with the same person",
    { timeout: 300_000 },
    () => {
      const home = adultAtHome("again-a")!;
      let world = greet(home.world, home.playerPersonId, home.personId);
      const cores: string[] = [];
      for (let turn = 0; turn < 3; turn += 1) {
        world = greet(world, home.playerPersonId, home.personId);
        const core = linePartsOf(world.history.events.at(-1)!.tags)!.find(
          (key) => key.includes(":core:"),
        )!;
        cores.push(core);
      }
      // Three greetings in a row use three different cores.
      expect(new Set(cores).size).toBe(3);
    },
  );

  it("keeps every part to the rules of its place in the line", () => {
    for (const bank of SMALL_TALK_BANKS) {
      for (const variant of bank.parts.opener?.variants ?? [])
        if (variant.kind === "template") expect(variant.text).toMatch(/,$/);
      for (const variant of bank.parts.closer?.variants ?? [])
        if (variant.kind === "template") expect(variant.text).toMatch(/^[A-Z]/);
    }
  });
});
