import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { assertPersonCitizenshipIntegrity } from "../simulation/citizenship";
import { addDays } from "../simulation/dates";
import { SeededRng } from "../simulation/rng";
import { assertWorldIntegrity } from "../simulation/world";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { buildPreStartCharacterWorld } from "./production-world";

describe("a new life records its citizenship when it enters the World", () => {
  for (const seed of ["citizenship-start-a", "citizenship-start-b"]) {
    const place = drawRandomPlace(seed);
    const age = new SeededRng(seed).integer(18, 71);

    it(`dates it to the prior-year World the character is built into (${place.displayName}, ${place.key}, seed ${seed})`, () => {
      const targetStartDate = place.context.initialMoment.date;
      const priorYearStartDate = addDays(targetStartDate, -1);
      const built = buildPreStartCharacterWorld({
        seed,
        place,
        age,
        givenName: "",
        familyName: "",
        startingLife: "ordinary-life",
        depth: "summarize-earlier-life",
        household: "lives-alone",
        preStartYear: {
          version: "pre-start-world-year-v1",
          targetStartDate,
          priorYearStartDate,
        },
      });
      const player = built.world.people[built.playerPersonId]!;
      expect(player.citizenshipStatuses).toHaveLength(1);
      expect(player.citizenshipStatuses![0]!.effectiveAt).toBe(
        priorYearStartDate,
      );
      assertPersonCitizenshipIntegrity(player, built.world.currentDate);
      assertWorldIntegrity(built.world);
    }, 300_000);

    it(`still records it for a life that starts on the start date (${place.displayName}, ${place.key}, seed ${seed})`, () => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      });
      const player = game.world.people[game.playerPersonId]!;
      expect(player.citizenshipStatuses).toHaveLength(1);
      assertPersonCitizenshipIntegrity(player, game.world.currentDate);
    }, 300_000);
  }
});
