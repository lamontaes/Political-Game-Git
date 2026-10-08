import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  householdConversationRoom,
  openOrdinaryLife,
} from "../../presentation/ordinary-life";
import { recordedRoomPresence } from "../../presentation/recorded-room-presence";
import { householdMembershipsAt, peopleInHouseholdAt, personName } from "..";
import { householdMembersAtHome } from "./home-presence";
import { whereaboutsAt } from "./work-schedules";

function lifeAt(seed: string) {
  const place = drawRandomPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
      household: "shares-a-home",
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const world = openOrdinaryLife(game.world, personId);
  return { place, world, personId };
}

describe("a housemate who is home when a life begins is in the room", () => {
  // Two watched lives drawn from the 56 places by seed, both starting at
  // home: one where a housemate is home at the start, one where the housemate
  // is at work.
  it.each([
    ["h1-home-4", true],
    ["h1-home-7", false],
  ])(
    "seed %s: the room holds exactly the housemates the world has at home",
    (seed, housemateHome) => {
      const { place, world, personId } = lifeAt(seed);
      const membership = householdMembershipsAt(world, personId).find(
        (entry) => entry.state.residenceRole === "primary",
      )!;
      const housemates = peopleInHouseholdAt(
        world,
        membership.household.id,
      ).filter((id) => id !== personId);
      expect(housemates.length, place.displayName).toBeGreaterThan(0);

      const presence = recordedRoomPresence(world, personId)!;
      expect(presence.location.setting).toBe("home");

      // Exactly the housemates the work week and activities leave at home.
      const home = householdMembersAtHome(world, personId);
      expect([...presence.personIds].sort()).toEqual(
        [personId, ...home].sort(),
      );
      for (const id of presence.personIds.filter((id) => id !== personId)) {
        expect(housemates).toContain(id);
        expect(whereaboutsAt(world, id).kind).toBe("home");
      }
      // A housemate on shift is not in the room.
      for (const id of housemates.filter((id) => !home.includes(id)))
        expect(presence.personIds).not.toContain(id);

      const room = householdConversationRoom(world, personId);
      if (housemateHome) {
        expect(home).toHaveLength(1);
        expect(room?.eligibleAddresseePersonIds).toEqual(home);
        expect(personName(world.people[home[0]!]!)).toBeTruthy();
      } else {
        expect(home).toHaveLength(0);
        expect(room).toBeNull();
      }
    },
    300_000,
  );

  it("a job-holder off shift at the start is home, and the housemate on shift is not in the room", () => {
    // Before this change that start recorded presence nowhere at all.
    const { world, personId } = lifeAt("h1-home-1");
    const presence = recordedRoomPresence(world, personId)!;
    expect(presence.location.setting).toBe("home");
    expect(presence.personIds).toEqual([personId]);
    expect(householdConversationRoom(world, personId)).toBeNull();
  }, 300_000);

  it("reads a later moment from the same records: the evening finds the housemate home", () => {
    const { world, personId } = lifeAt("h1-home-1");
    expect(householdMembersAtHome(world, personId)).toHaveLength(0);
    const evening = {
      ...world.currentMoment,
      minuteOfDay: 18 * 60 + 30,
    };
    expect(householdMembersAtHome(world, personId, evening)).toHaveLength(1);
  }, 300_000);
});
