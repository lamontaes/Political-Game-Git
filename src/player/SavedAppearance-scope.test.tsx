import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { savedRenderSnapshots } from "./SavedAppearance";

describe("saved appearance work follows the people being drawn", () => {
  it("prepares a visible person without preparing every person in the save", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "visible-person-snapshot",
      startKind: "custom",
      placeKey: "3918000",
      startAge: 30,
      depth: "summarize-earlier-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    const other = game.world.personOrder.find(
      (personId) => personId !== game.playerPersonId,
    );
    expect(other).toBeDefined();

    const visible = savedRenderSnapshots(game.world, {}, [
      game.playerPersonId,
      game.playerPersonId,
    ]);
    expect(Object.keys(visible)).toEqual([game.playerPersonId]);
    expect(visible[other!]).toBeUndefined();

    const laterVisible = savedRenderSnapshots(game.world, {}, [other!]);
    expect(Object.keys(laterVisible)).toEqual([other]);
  });
});
