import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { LIFE_TALK_INTENTS } from "./life-conversation";
import { conversationRegister } from "./conversation-register";
import { createNewGameWorld } from "./new-game";

const SEED = "encal1-register";
const place = drawRandomPlace(SEED);

function world() {
  const { world, playerPersonId } = createNewGameWorld({
    startKind: "custom",
    seed: SEED,
    placeKey: place.key,
    startAge: 34,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    givenName: "Register",
    familyName: "Check",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
    appearanceCatalogGeneration: 10,
    appearanceRecipeVersion: "appearance-recipe-v2",
    appearanceOutfitVersion: "complete-outfit-v2",
  } as const);
  const housemate = world.personOrder.find(
    (id) =>
      id !== playerPersonId &&
      conversationRegister(world, id, playerPersonId) === "family",
  );
  const outsider = world.personOrder.find(
    (id) =>
      id !== playerPersonId &&
      id !== housemate &&
      conversationRegister(world, id, playerPersonId) === "small-talk",
  );
  return { world, playerPersonId, housemate, outsider };
}

describe(`the register of an ordinary conversation in ${place.displayName}, seed ${SEED}`, () => {
  it("reads family from a shared household and everyday talk from anyone else", () => {
    const { world: start, playerPersonId, housemate, outsider } = world();
    expect(housemate, "someone lives with the player").toBeDefined();
    expect(outsider, "someone in the world does not").toBeDefined();
    expect(conversationRegister(start, housemate!, playerPersonId)).toBe(
      "family",
    );
    expect(conversationRegister(start, outsider!, playerPersonId)).toBe(
      "small-talk",
    );
  });

  it("keeps removed date, game, and quiet options out of the intent catalog", () => {
    expect(Object.keys(LIFE_TALK_INTENTS)).not.toEqual(
      expect.arrayContaining(["date", "suggestGame", "suggestQuiet"]),
    );
  });
});
