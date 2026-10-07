import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { openingLocalChamber } from "../presentation/opening-story";
import { homePlacesForPerson } from "../presentation/place-backdrops";
import { orientationBackdrop } from "./WorldOrientationPanel";
import { drawRandomPlace } from "../../tests/support/random-place";

/*
 * OW-11: the intro walks through rooms, not exterior after exterior. Each card
 * stands inside the room its people work in, read from the place's records.
 */
describe("the intro rooms", { timeout: 180_000 }, () => {
  for (const seed of ["ow11-rooms-a", "ow11-rooms-b"]) {
    const place = drawRandomPlace(seed);
    it(`${place.displayName} (seed ${seed})`, () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          questionnaire: "skipped",
        }),
      ).game!;
      const sources = {
        whiteHouse: null,
        regionalPlate: null,
        regionScene: null,
        localChamber: openingLocalChamber(game.world, game.playerPersonId),
        homePlaces: homePlacesForPerson(game.world, game.playerPersonId),
      };
      for (const step of [
        "year",
        "congress",
        "state",
        "locality",
        "your-life",
      ]) {
        const backdrop = orientationBackdrop(step, sources);
        expect(backdrop.kind, step).toBe("place");
        if (backdrop.kind === "place")
          expect(backdrop.place, step).not.toMatch(/exterior|main-street/);
      }
    });
  }
});
