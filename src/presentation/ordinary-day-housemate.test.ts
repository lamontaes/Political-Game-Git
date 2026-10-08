import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { explicitNewGameSetup } from "./new-game-geography";
import { createOpeningLifeController } from "./opening-life";
import { projectOrdinaryDay } from "./ordinary-life";

/**
 * The day's opening screen names someone the player lives with the way a
 * housemate is named at home: by first name, not by family name alone.
 */
describe("the housemate on the day's opening screen", () => {
  it(
    "is named by first name, even with another family name",
    { timeout: 180_000 },
    () => {
      const seed = "housemate-name-oct8-2";
      const place = drawRandomPlace(seed);
      const game = createOpeningLifeController(
        explicitNewGameSetup({
          placeKey: place.key,
          seed,
          startAge: 34 as never,
          depth: "summarize-earlier-life",
        }),
      ).finishTransition().game!;
      const day = projectOrdinaryDay(game.world, game.playerPersonId);
      const player = game.world.people[game.playerPersonId]!;
      const mate = game.world.people[day.companionPersonId ?? ""];
      // The case under test: a housemate whose family name is not the player's.
      expect(mate, place.displayName).toBeDefined();
      expect(mate!.familyName).not.toBe(player.familyName);
      expect(day.opening).toContain(`${mate!.givenName} is`);
      expect(day.opening).not.toContain(`${mate!.familyName} is`);
    },
  );
});
