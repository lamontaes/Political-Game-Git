import { describe, expect, it } from "vitest";

import staging from "../../art/backdrops/staging.json" with { type: "json" };
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  placeBackdropPeople,
  spotView,
  type StagingSpot,
} from "./backdrop-people";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { slotAcceptsRole } from "./scene-slot-contract";

/**
 * The people a scene names, standing in the place's picture, in a generated
 * world at a place drawn from all 56 (the seed and place are printed).
 *
 * Four of the world's own residents are put in every painted place in turn,
 * through the path every scene uses (placeBackdropPeople). Each place has
 * room for them: everyone is drawn at a spot, posed for what they are doing
 * there, and nobody is left out for want of a painting, including at spots
 * turned to one side and places to lean.
 */

const PLACES = Object.entries(
  (staging as { places: Record<string, { spots: StagingSpot[] }> }).places,
);
const SEED = "p4-posed-people";

describe(
  "people a scene names, in every painted place",
  { timeout: 240_000 },
  () => {
    const place = drawRandomPlace(SEED);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: place.key,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const world = game.world;
    const player = game.playerPersonId;
    console.info("P4_POSED_PEOPLE", {
      seed: SEED,
      placeKey: place.key,
      place: place.displayName,
      worldId: world.id,
      date: world.currentDate,
      personId: player,
    });
    const residents = Object.values(world.people)
      .filter((person) => person.id !== player && person.appearance)
      .slice(0, 4);

    it("draws everyone present at a spot, turned spots included", () => {
      expect(residents.length).toBe(4);
      let turned = 0;
      for (const [name, stage] of PLACES) {
        // Spots a person the scene names can take: not the lectern, not a seat
        // facing away (no seated back painting yet), not one kept for a role.
        const open = stage.spots.filter(
          (spot) =>
            spot.pose !== "podium" &&
            !(spot.pose === "sit" && spot.facing === "away") &&
            slotAcceptsRole(spot.role ?? "general"),
        );
        const present = residents
          .slice(0, Math.min(residents.length, open.length))
          .map((person) => ({ personId: person.id }));
        const people = placeBackdropPeople(
          world,
          player,
          name,
          world.currentMoment,
          present,
          { rosterOnly: true },
        );
        expect(people.overflow, name).toEqual([]);
        expect(people.map((person) => person.personId).sort(), name).toEqual(
          present.map((person) => person.personId).sort(),
        );
        for (const person of people) {
          const spot = stage.spots.find((at) => at.id === person.slotId)!;
          // A seat holds a seated person; a standing spot a standing one.
          expect(person.resolvedPose.startsWith("seated"), person.slotId).toBe(
            spot.pose === "sit",
          );
          if (spotView(spot) === "three-quarter") turned++;
        }
      }
      // People stand at spots turned to one side, facing the room.
      expect(turned).toBeGreaterThan(0);
    });
  },
);
