import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../src/presentation/ordinary-life";
import {
  askToMeet,
  goMeetSomebodyNew,
  meetingNewOptions,
  projectContacts,
} from "../../src/presentation/people-contacts";
import {
  performVenueActivity,
  venueActivities,
} from "../../src/presentation/venue-activity";
import { joinOrdinaryGroup } from "../../src/presentation/ordinary-community";
import { CONTACT_LOCATION_KEY } from "../../src/simulation/people-contact";
import { readRelationshipStanding } from "../../src/simulation/relationship-standing";
import { introducedPeople } from "../../src/simulation/social-introductions";
import type { EntityId, World } from "../../src/simulation";

/**
 * The owner's test for a widening social circle (2026-09-23): a new character
 * makes a friend they did not start with inside their first month.
 *
 * Played through the routes a player has: joining the walking group from the
 * life scene, the People screen's "Meet somebody new", asking to meet from the
 * contact list, Attend on the calendar, and time passing. Nothing here writes
 * a record directly.
 *
 * A new 24-year-old in these towns has no job, program or group on day one,
 * and living in the same town is not a way of meeting (ChatGPT,
 * `how-people-meet-new-people`), so there is nobody to meet until the player
 * joins something. That is asserted too.
 */

const TOWNS = [
  ["Houma, Louisiana", "2236255"],
  ["Reno, Nevada", "3260600"],
] as const;

function knownAtStart(world: World, personId: EntityId): Set<EntityId> {
  const known = new Set<EntityId>();
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(personId)) continue;
    for (const id of interaction.personIds) known.add(id);
  }
  return known;
}

function attendDueMeetings(world: World, personId: EntityId): World {
  let next = world;
  for (const entry of venueActivities(next, personId)) {
    if (entry.activity.location.locationKey !== CONTACT_LOCATION_KEY) continue;
    if (entry.refusal) continue;
    next = performVenueActivity(next, personId, entry.activity.id);
  }
  return next;
}

describe("a new life makes a friend in its first month", () => {
  for (const [town, placeKey] of TOWNS) {
    it(`${town}: somebody met after the start is a friend within thirty days`, () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey,
          seed: "first-month-friend",
          startAge: 24,
        }),
      ).game!;
      const playerId = game.playerPersonId;
      let world = openOrdinaryLife(game.world, playerId);
      const started = knownAtStart(world, playerId);

      // Sharing a town with somebody is not a way of meeting them.
      expect(meetingNewOptions(world, playerId)).toEqual([]);
      world = joinOrdinaryGroup(world, playerId);

      // Going out to meet somebody is offered, and only where somebody is.
      const options = meetingNewOptions(world, playerId);
      expect(options.length).toBeGreaterThan(0);
      const met = goMeetSomebodyNew(world, {
        personId: playerId,
        setting: options[0]!.setting,
        viaPersonId: options[0]!.viaPersonId,
      });
      expect(met.said).toMatch(/^You met /);
      world = met.world;

      // A week at a time: ask each new person to meet, go when the day comes.
      for (let day = 0; day < 30; day += 1) {
        if (day % 7 === 0) {
          const view = projectContacts(world, playerId);
          for (const personId of introducedPeople(world, playerId)) {
            const contact = view.contacts.find(
              (entry) => entry.personId === personId,
            );
            const ask = contact?.actions.find(
              (action) => action.kind === "ask-to-meet",
            );
            if (!contact || !ask?.available || contact.outstanding) continue;
            world = askToMeet(world, {
              personId: playerId,
              otherPersonId: personId,
              on: view.earliestMeetingOn,
            });
          }
        }
        world = attendDueMeetings(world, playerId);
        world = passOrdinaryDays(world, 1);
      }

      const newFriends = introducedPeople(world, playerId).filter(
        (personId) => {
          if (started.has(personId)) return false;
          const warmth = readRelationshipStanding(world, playerId, personId)
            .readings.warmth;
          return (
            !warmth.adverse &&
            (warmth.band === "marked" || warmth.band === "strong")
          );
        },
      );
      expect(newFriends.length).toBeGreaterThan(0);
    }, 300_000);
  }

  it("two people asked for the same evening cannot both say yes", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: TOWNS[0][1],
        seed: "first-month-friend",
        startAge: 24,
      }),
    ).game!;
    const playerId = game.playerPersonId;
    let world = joinOrdinaryGroup(
      openOrdinaryLife(game.world, playerId),
      playerId,
    );
    const group = meetingNewOptions(world, playerId)[0]!;
    world = goMeetSomebodyNew(world, {
      personId: playerId,
      setting: group.setting,
      viaPersonId: group.viaPersonId,
    }).world;
    const view = projectContacts(world, playerId);
    const askable = view.contacts.filter(
      (contact) =>
        contact.actions.find((action) => action.kind === "ask-to-meet")
          ?.available && !contact.outstanding,
    );
    expect(askable.length).toBeGreaterThan(1);
    for (const contact of askable) {
      world = askToMeet(world, {
        personId: playerId,
        otherPersonId: contact.personId,
        on: view.earliestMeetingOn,
      });
    }
    // Passing time answers every one of them. Before the fix, a second yes
    // for an evening already taken threw from inside the clock.
    world = passOrdinaryDays(world, 3);
    const meetings = world.history.scheduledActivities.filter(
      (activity) =>
        activity.location.locationKey === CONTACT_LOCATION_KEY &&
        activity.participantPersonIds.includes(playerId),
    );
    expect(meetings.length).toBeLessThanOrEqual(1);
  }, 300_000);
});
