import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import type { EntityId, World } from "../simulation";
import { chooseOrdinaryLifeGoal } from "../simulation/life-personality";
import { conversationRegister } from "./conversation-register";
import { createNewGameWorld } from "./new-game";
import { invitationDeclineLine } from "./refusal-english";

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

function withPrivacyGoal(world: World, personId: EntityId): World {
  return {
    ...chooseOrdinaryLifeGoal(
      { ...world, control: { kind: "person", personId } },
      personId,
      "privacy",
    ),
    control: world.control,
  };
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

  it("picks different parts for the same refusal in a household and outside it", () => {
    const { world: start, playerPersonId, housemate, outsider } = world();
    let next = withPrivacyGoal(start, housemate!);
    next = withPrivacyGoal(next, outsider!);
    const partsFor = (speaker: EntityId) => {
      const keys = new Set<string>();
      for (let index = 0; index < 60; index += 1) {
        const line = invitationDeclineLine(
          next,
          speaker,
          playerPersonId,
          [],
          `encal1:${index}`,
          "game",
        );
        expect(line, `a refusal from ${speaker}`).not.toBeNull();
        for (const part of line!.parts) keys.add(part.partKey);
      }
      return keys;
    };
    const family = partsFor(housemate!);
    const everyday = partsFor(outsider!);
    // A household member is never thanked-for-asking and an outsider never
    // gets the family's short put-off; each register still speaks its own.
    expect(family.has("invitation.company-decline:closer:thanks-asking")).toBe(
      false,
    );
    expect(family.has("invitation.company-decline:closer:maybe-later")).toBe(
      true,
    );
    expect(everyday.has("invitation.company-decline:closer:maybe-later")).toBe(
      false,
    );
    expect(
      everyday.has("invitation.company-decline:closer:thanks-asking"),
    ).toBe(true);
  });
});
