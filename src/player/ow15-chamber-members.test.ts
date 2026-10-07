import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { stateNameForUsps } from "./useWorldOrientation";
import { projectWorldOrientation } from "../presentation/living-world-orientation";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { projectOpeningFamily } from "../presentation/opening-story";
import {
  chamberFloorPeople,
  openingChamberMembers,
  openingHouseholdPeople,
  openingTourStagedPeople,
} from "../presentation/opening-tour-people";
import { backdropStaging } from "../presentation/backdrop-people";
import { projectOrientationView } from "../presentation/world-orientation";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";

/*
 * OW-15: the Senate and House floors hold their members from the seat roster,
 * home state first, and the home on your life's card holds the people the
 * household record says live there.
 */
describe("chambers seat their members", { timeout: 300_000 }, () => {
  for (const seed of ["ow15-floor-a", "ow15-floor-b"]) {
    const place = drawRandomPlace(seed);
    it(`${place.displayName} (seed ${seed})`, () => {
      const { world, playerPersonId } = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          questionnaire: "skipped",
        }),
      ).game!;
      const view = projectOrientationView(
        projectWorldOrientation(world, playerPersonId),
        stateNameForUsps,
      );
      const usps = homeStateUsps(world, playerPersonId);
      for (const [chamberKey, room] of [
        ["us-senate", "us-senate-floor"],
        ["us-house", "us-house-floor"],
      ] as const) {
        const chamber = view.steps
          .flatMap((step) => step.chambers)
          .find((candidate) => candidate.chamberKey === chamberKey);
        const limit = backdropStaging(room)!.spots.filter(
          (spot) => (spot.role ?? "general") === "general",
        ).length;
        const members = chamberFloorPeople(chamber, { homeUsps: usps, limit });
        expect(members.length, chamberKey).toBe(limit);
        const staged = openingTourStagedPeople(
          world,
          playerPersonId,
          room,
          members,
          { furniture: true, faceRoom: true },
        );
        console.info(
          `${place.displayName}, seed ${seed}, ${world.currentDate}: ${room} stages ${staged.length} of ${members.length} members (overflow ${staged.overflow.length})`,
        );
        // Every open-floor spot but at most one is filled; before OW-15 the
        // floor held one standing figure.
        expect(staged.length, room).toBeGreaterThanOrEqual(limit - 1);
      }
      // OW-14: the state chamber seats its lawmakers, the desks facing away
      // included (front on until their back view is drawn).
      const room = "state-legislative-chamber-bicameral";
      const seats = backdropStaging(room)!.spots.filter((spot) =>
        ["general", "member-at-dais"].includes(spot.role ?? "general"),
      ).length;
      const lawmakers = openingChamberMembers(world, playerPersonId, seats);
      expect(lawmakers.length).toBe(seats);
      const seated = openingTourStagedPeople(
        world,
        playerPersonId,
        room,
        lawmakers,
        {
          furniture: true,
          faceRoom: true,
          memberIds: new Set(lawmakers.map((person) => person.personId)),
        },
      );
      expect(seated.length).toBeGreaterThanOrEqual(seats - 1);
      expect(
        seated.some((person) => /:spot:[45]$/.test(person.slotId ?? "")),
        "a member sits at a desk that faces away",
      ).toBe(true);
      const living = projectOpeningFamily(world, playerPersonId);
      const expected = [
        ...living.parents.filter((m) => m.livesWithYou && !m.died),
        ...living.household.filter((m) => !m.died),
      ].map((m) => m.personId);
      expect(
        openingHouseholdPeople(world, playerPersonId).map((p) => p.personId),
      ).toEqual(expected);
    });
  }
});
