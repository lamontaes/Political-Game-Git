import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { drawRandomPlace } from "../../tests/support/random-place";

/*
 * OW-18: the store a generated childhood first worked at carries the town's
 * own name, never the postal "Town, State" form and never a placeholder.
 */
describe("the first-job store name", { timeout: 180_000 }, () => {
  for (const seed of ["ow18-first-job-a", "ow18-first-job-b"]) {
    const place = drawRandomPlace(seed);
    it(`names the store for the town (${place.displayName}, seed ${seed})`, () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          questionnaire: "skipped",
        }),
      ).game!;
      const world = game.world as unknown as {
        history?: { organizationProfiles?: readonly { name: string }[] };
        organizationProfiles?: readonly { name: string }[];
      };
      const profiles =
        world.history?.organizationProfiles ?? world.organizationProfiles ?? [];
      const names = profiles
        .map((profile) => profile.name)
        .filter((name) => /Market/.test(name));
      process.stdout.write(`OW18 ${place.displayName}: ${names.join(" | ")}\n`);
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(name).not.toMatch(/, /);
        expect(name).not.toBe("Neighborhood Market");
      }
    });
  }
});
