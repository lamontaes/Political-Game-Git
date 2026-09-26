import { describe, expect, it } from "vitest";
import { deserializeWorld, serializeWorld } from "../simulation";
import { SCENE_FAMILY_DEFINITIONS } from "./contextual-scene-families";
import { CONTEXTUAL_SCENE_SUBJECTS } from "./contextual-scenes";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { passOrdinaryDays } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";

describe("withdrawn contextual dialogue copy", () => {
  it("does not supply any fixed scene family to the conversation engine", () => {
    expect(Object.values(SCENE_FAMILY_DEFINITIONS)).toEqual([]);
  });

  it("cannot reopen old scene subjects through time or Save and Continue", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "withdrawn-contextual-copy",
      startAge: 34,
    });
    const personId = game.playerPersonId;
    const advanced = passOrdinaryDays(game.world, 7);
    const loaded = deserializeWorld(serializeWorld(advanced));
    for (const world of [game.world, advanced, loaded]) {
      const available = availablePlayerConversations(world, personId);
      expect(
        available.every(
          (entry) =>
            !CONTEXTUAL_SCENE_SUBJECTS.some(
              (subject) => subject === entry.subject,
            ),
        ),
      ).toBe(true);
      for (const subject of CONTEXTUAL_SCENE_SUBJECTS) {
        expect(projectPlayerConversation(world, personId, subject)).toBeNull();
      }
    }
  });
});
