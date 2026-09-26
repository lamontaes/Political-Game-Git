import { describe, expect, it } from "vitest";
import {
  availableLifeSituations,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import {
  currentPlayerOpeningLifeScene,
  openNextLifeScene,
} from "./life-scene-flow";
import { projectPlayerStoryMoment } from "./life-story";

describe("withdrawn fixed life copy", () => {
  for (const age of [5, 24]) {
    it(`does not put an old authored scene into an age-${age} player's new life`, () => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `withdrawn-life-copy-${age}`,
        startAge: age,
        depth: age === 5 ? "play-formative-years" : "summarize-earlier-life",
      });
      const { world, playerPersonId } = game;

      expect(
        availableLifeSituations(world, {
          personId: playerPersonId,
          asOfDate: world.currentDate,
        }),
      ).toEqual([]);
      expect(openNextLifeScene(world, playerPersonId)).toBe(world);
      expect(currentPlayerOpeningLifeScene(world, playerPersonId)).toBeNull();
      expect(projectPlayerStoryMoment(world, playerPersonId).scene).toMatchObject(
        { kind: "ordinary-stretch", prose: "", options: [] },
      );

      const loaded = deserializeWorld(serializeWorld(world));
      expect(currentPlayerOpeningLifeScene(loaded, playerPersonId)).toBeNull();
      expect(projectPlayerStoryMoment(loaded, playerPersonId).scene.prose).toBe(
        "",
      );
    });
  }
});
