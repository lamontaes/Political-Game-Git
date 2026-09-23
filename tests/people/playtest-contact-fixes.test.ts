import { describe, expect, it } from "vitest";
import { projectPersonDossier } from "../../src/presentation/person-dossier";
import { projectPartyAndCommunityWork } from "../../src/presentation/campaign-life-surface";
import { declineCalendarActivity } from "../../src/presentation/calendar-time-control";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { joinOrdinaryGroup } from "../../src/presentation/ordinary-community";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../src/presentation/ordinary-life";
import {
  askedNote,
  askOnADate,
  goMeetSomebodyNew,
  meetingNewOptions,
  projectContacts,
} from "../../src/presentation/people-contacts";
import { scheduledActivityState } from "../../src/simulation";
import {
  CONTACT_CALLED_OFF_EVENT,
  CONTACT_CALLED_OFF_KIND,
  CONTACT_COUNTERED_EVENT,
  CONTACT_LOCATION_KEY,
} from "../../src/simulation/people-contact";
import { introducedPeople } from "../../src/simulation/social-introductions";
import { addDays, ageOnDate } from "../../src/simulation/dates";
import { proseWeekdayDate } from "../../src/presentation/prose-dates";
import type { EntityId, World } from "../../src/simulation";

/**
 * Three things playtests found on 2026-09-23, each driven through the same
 * commands the People screen and the Calendar use.
 */

function openLife(placeKey: string, seed: string, startAge: number) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed,
      startAge,
    }),
  ).game!;
  const playerId = game.playerPersonId;
  return { world: openOrdinaryLife(game.world, playerId), playerId };
}

function meetingWith(world: World, playerId: EntityId, otherId: EntityId) {
  return world.history.scheduledActivities.find(
    (activity) =>
      activity.location.locationKey === CONTACT_LOCATION_KEY &&
      activity.kind === "confirmed" &&
      activity.participantPersonIds.includes(playerId) &&
      activity.participantPersonIds.includes(otherId) &&
      scheduledActivityState(world, activity.id).status === "scheduled",
  );
}

describe("a child is not offered adult meetings or party work", () => {
  // Juneau (an 8-year-old offered a meeting with a party organizer) and the
  // mass-play finding (minors offered party work in 18 games).
  for (const [town, placeKey] of [
    ["Houma, Louisiana", "2236255"],
    ["Reno, Nevada", "3260600"],
  ] as const) {
    it(`${town}: at eight`, () => {
      const { world, playerId } = openLife(placeKey, `minor:${town}`, 8);
      const player = world.people[playerId]!;
      expect(ageOnDate(player.birthDate, world.currentDate)).toBeLessThan(18);
      expect(projectPartyAndCommunityWork(world, playerId).requestable).toEqual(
        [],
      );
      for (const contact of projectContacts(world, playerId).contacts) {
        expect(
          contact.basis.some((entry) => entry.startsWith("public organizer")),
        ).toBe(false);
        const other = world.people[contact.personId]!;
        const adult = ageOnDate(other.birthDate, world.currentDate) >= 18;
        const ask = contact.actions.find((a) => a.kind === "ask-to-meet");
        if (adult && !contact.basis.includes("family") && !contact.livesWithYou)
          expect(ask?.available).toBe(false);
      }
    }, 300_000);
  }

  it("an adult still reaches the party organizer", () => {
    const { world, playerId } = openLife("2236255", "minor:adult", 30);
    const organizers = projectContacts(world, playerId).contacts.filter(
      (contact) =>
        contact.basis.some((entry) => entry.startsWith("public organizer")),
    );
    expect(organizers.length).toBeGreaterThan(0);
  }, 300_000);
});

describe("asking somebody out, and calling it off", () => {
  it("says when the answer comes, and a confirmed date can be called off", () => {
    const opened = openLife("3260600", "call-off:reno", 26);
    const playerId = opened.playerId;
    let world = opened.world;
    world = joinOrdinaryGroup(world, playerId);
    const option = meetingNewOptions(world, playerId)[0]!;
    world = goMeetSomebodyNew(world, {
      personId: playerId,
      setting: option.setting,
      viaPersonId: option.viaPersonId,
    }).world;
    const otherId = introducedPeople(world, playerId).at(-1)!;

    // Ask on successive days until somebody says yes to an evening.
    let meeting = undefined as ReturnType<typeof meetingWith>;
    for (let day = 0; day < 20 && !meeting; day += 1) {
      const ask = projectContacts(world, playerId)
        .contacts.find((entry) => entry.personId === otherId)
        ?.actions.find((entry) => entry.kind === "ask-on-a-date");
      if (ask?.available) {
        const on = projectContacts(world, playerId).earliestMeetingOn;
        const note = askedNote(world, {
          otherPersonId: otherId,
          on,
          date: true,
        });
        const given = world.people[otherId]!.givenName;
        expect(note).toMatch(
          new RegExp(
            `^You asked ${given} to go out on .+\\. ${given} will answer by .+\\.$`,
          ),
        );
        world = askOnADate(world, {
          personId: playerId,
          otherPersonId: otherId,
          on,
        });
      }
      world = passOrdinaryDays(world, 1);
      meeting = meetingWith(world, playerId, otherId);
    }
    expect(meeting).toBeDefined();

    const heldOn = scheduledActivityState(world, meeting!.id).start.date;
    const result = declineCalendarActivity(world, playerId, meeting!.id);
    expect(result.outcome).toMatch(/^You called it off/);
    world = result.world;
    expect(scheduledActivityState(world, meeting!.id).status).not.toBe(
      "scheduled",
    );
    const event = world.history.events.find(
      (candidate) => candidate.type === CONTACT_CALLED_OFF_EVENT,
    );
    expect(event?.involvedEntityIds).toEqual(
      expect.arrayContaining([playerId, otherId]),
    );
    expect(
      world.history.relationshipInteractions.some(
        (interaction) => interaction.kind === CONTACT_CALLED_OFF_KIND,
      ),
    ).toBe(true);

    // Time now passes the evening that was held.
    world = passOrdinaryDays(world, 5);
    expect(world.currentDate > heldOn).toBe(true);
  }, 300_000);
});

describe("a person at home is not a stranger on the card", () => {
  // Fairbanks: a sister at home read "You haven't spoken." Elko: a father at
  // home read "You last spoke" seventeen months back.
  it("says they live together, and invents no conversation", () => {
    const { world, playerId } = openLife("3260600", "card:reno", 12);
    const athome = projectContacts(world, playerId).contacts.filter(
      (contact) => contact.livesWithYou,
    );
    expect(athome.length).toBeGreaterThan(0);
    const before = world.history.relationshipInteractions.length;
    for (const contact of athome) {
      expect(
        projectPersonDossier(world, playerId, contact.personId)!
          .lastInteraction,
      ).toMatch(/^You live together\./);
    }
    expect(world.history.relationshipInteractions.length).toBe(before);
  }, 300_000);
});

describe("an answer of another day reaches the person who asked", () => {
  /*
   * Peoria (main 15dbdd4f): Nicole asked Samantha out five times in a year and
   * never heard back. The answer was "not that day, but another", and only
   * the refusal half of it was written: nothing showed, and no day came back.
   */
  it("shows the other day as their question to answer", () => {
    const { world: opened, playerId } = openLife("1759000", "p:3", 18);
    let world = opened;
    const asked = projectContacts(world, playerId).contacts.filter(
      (contact) =>
        contact.actions.find((entry) => entry.kind === "ask-on-a-date")
          ?.available,
    );
    for (const contact of asked) {
      world = askOnADate(world, {
        personId: playerId,
        otherPersonId: contact.personId,
        on: projectContacts(world, playerId).earliestMeetingOn,
      });
    }
    world = passOrdinaryDays(world, 1);
    const countered = world.history.events.filter(
      (event) => event.type === CONTACT_COUNTERED_EVENT,
    );
    expect(countered.length).toBeGreaterThan(0);
    for (const event of countered) {
      const otherId = event.involvedEntityIds.find((id) => id !== playerId)!;
      const row = projectContacts(world, playerId).contacts.find(
        (contact) => contact.personId === otherId,
      )!;
      expect(
        row.actions.find((entry) => entry.kind === "answer-proposal")
          ?.available,
      ).toBe(true);
    }
  }, 300_000);
});

describe("the note after asking names the evening, then the answer day", () => {
  // Buffalo: "You asked Justin out on Thursday, January 31, 2041. Justin will
  // answer by Wednesday, January 30, 2041." read as asking on Thursday.
  it("puts the asked-for evening after the answer day, and says which is which", () => {
    const { world, playerId } = openLife("3260600", "note:reno", 26);
    const other = projectContacts(world, playerId).contacts.find(
      (contact) => !contact.livesWithYou,
    )!;
    const on = addDays(world.currentDate, 10);
    const note = askedNote(world, {
      otherPersonId: other.personId,
      on,
      date: true,
    });
    const given = world.people[other.personId]!.givenName;
    expect(note).toBe(
      `You asked ${given} to go out on ${proseWeekdayDate(on)}. ${given} will answer by ${proseWeekdayDate(addDays(world.currentDate, 1))}.`,
    );
  }, 300_000);
});
