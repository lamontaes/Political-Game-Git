import { describe, expect, it } from "vitest";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectTownBusinesses } from "./town-businesses-view";
import { drawRandomPlace } from "../../tests/support/random-place";
import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import { createStableId } from "../simulation/ids";

/*
 * OW-18: the town's business list names every private employer the town's
 * people work at, not only the handful seated with owners.
 */
describe("the town business list", { timeout: 180_000 }, () => {
  const jurisdictions = Object.keys(
    (nominationRules as { places: Record<string, unknown> }).places,
  ).sort();

  for (const seed of ["ow18-businesses-a", "ow18-businesses-b"]) {
    const place = drawRandomPlace(seed);
    it(`lists the register's employers (${place.displayName}, seed ${seed})`, () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          questionnaire: "skipped",
        }),
      ).game!;
      const world = game.world;
      const town = Object.values(world.jurisdictions).find((row) =>
        world.history.organizations.some((org) =>
          org.stableKey.includes(`:${row.id}:employer:`),
        ),
      )!;
      const lines = projectTownBusinesses(world, town.id);
      const names = lines.map((line) => line.name);
      process.stdout.write(
        `OW18b ${place.displayName}: ${names.length} ${names.join(" | ")}\n`,
      );
      expect(names.length).toBeGreaterThan(5);
      expect(new Set(names).size).toBe(names.length);
    });
  }

  it("keeps the town register scoped across all 56 jurisdictions", () => {
    expect(jurisdictions).toHaveLength(56);
    const seed = "ow18-businesses-scope";
    const place = drawRandomPlace(seed);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startAge: 34,
        questionnaire: "skipped",
      }),
    ).game!;
    const world = game.world;
    const town = Object.values(world.jurisdictions).find((row) =>
      world.history.organizations.some((org) =>
        org.stableKey.includes(`:${row.id}:employer:`),
      ),
    )!;

    for (const jurisdiction of jurisdictions) {
      const otherJurisdiction = createStableId(
        "jurisdiction",
        `ow18-scope:${jurisdiction}`,
      );
      expect(projectTownBusinesses(world, otherJurisdiction)).toEqual([]);
    }
    expect(projectTownBusinesses(world, town.id).length).toBeGreaterThan(5);
  });
});
