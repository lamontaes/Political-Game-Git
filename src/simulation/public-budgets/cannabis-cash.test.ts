import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";

// Draw only a test place identity. No transaction, amount or law is generated here.
const place = drawRandomPlace("a31-recorded-cannabis-new-game");
describe("cannabis cash producer opening", () => {
  it(`opens a new game in ${place.key} without inventing cannabis purchases`, () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed: "a31-recorded-cannabis-new-game",
      questionnaire: "skipped",
    });
    expect(game.world.people[game.playerPersonId]).toBeDefined();
    expect(game.world.history.taxCollections ?? []).toHaveLength(0);
  });
});
