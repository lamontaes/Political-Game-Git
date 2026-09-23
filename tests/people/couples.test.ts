import { describe, expect, it } from "vitest";
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
  askOnADate,
  askToBeTogether,
  breakUp,
  goMeetSomebodyNew,
  meetingNewOptions,
  projectContacts,
} from "../../src/presentation/people-contacts";
import {
  performVenueActivity,
  venueActivities,
} from "../../src/presentation/venue-activity";
import {
  COUPLE_KIND,
  coupleAskRefusal,
  dateRefusal,
  coupleBetween,
  keptDates,
} from "../../src/simulation/couples";
import { CONTACT_LOCATION_KEY } from "../../src/simulation/people-contact";
import { describePersonContext } from "../../src/simulation/person-context";
import { introducedPeople } from "../../src/simulation/social-introductions";
import type { EntityId, World } from "../../src/simulation";

/**
 * Two people going out and becoming a couple, played through the People
 * screen's own commands: meet somebody, ask them out, go on the evening, and
 * ask to be a couple. Nothing here writes a record directly.
 */

const TOWNS = [
  ["Houma, Louisiana", "2236255"],
  ["Reno, Nevada", "3260600"],
] as const;

function action(
  world: World,
  playerId: EntityId,
  otherId: EntityId,
  kind: string,
) {
  return projectContacts(world, playerId)
    .contacts.find((entry) => entry.personId === otherId)
    ?.actions.find((entry) => entry.kind === kind);
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

function metSomebody(town: string, placeKey: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed: `couples:${town}`,
      startAge: 26,
    }),
  ).game!;
  const playerId = game.playerPersonId;
  let world = joinOrdinaryGroup(
    openOrdinaryLife(game.world, playerId),
    playerId,
  );
  const option = meetingNewOptions(world, playerId)[0]!;
  world = goMeetSomebodyNew(world, {
    personId: playerId,
    setting: option.setting,
    viaPersonId: option.viaPersonId,
  }).world;
  const otherId = introducedPeople(world, playerId).at(-1)!;
  return { world, playerId, otherId };
}

describe("two people become a couple", () => {
  for (const [town, placeKey] of TOWNS) {
    it(`${town}: two dates, then asked, then together`, () => {
      const met = metSomebody(town, placeKey);
      const { playerId, otherId } = met;
      let world = met.world;
      // Nothing to ask about before the two of them have been out.
      expect(action(world, playerId, otherId, "ask-to-be-a-couple")).toBe(
        undefined,
      );
      for (let day = 0; day < 21; day += 1) {
        if (
          keptDates(world, playerId, otherId).length < 2 &&
          action(world, playerId, otherId, "ask-on-a-date")?.available
        ) {
          world = askOnADate(world, {
            personId: playerId,
            otherPersonId: otherId,
            on: projectContacts(world, playerId).earliestMeetingOn,
          });
        }
        world = attendDueMeetings(world, playerId);
        if (keptDates(world, playerId, otherId).length === 1) {
          // One evening is not enough to ask, and the screen says why.
          expect(
            action(world, playerId, otherId, "ask-to-be-a-couple"),
          ).toMatchObject({
            available: false,
            unavailableReason: "You have only been out together once.",
          });
        }
        if (keptDates(world, playerId, otherId).length >= 2) break;
        world = passOrdinaryDays(world, 1);
      }
      expect(keptDates(world, playerId, otherId)).toHaveLength(2);
      expect(
        action(world, playerId, otherId, "ask-to-be-a-couple")?.available,
      ).toBe(true);

      const answered = askToBeTogether(world, {
        personId: playerId,
        otherPersonId: otherId,
      });
      expect(answered.said).toMatch(/said yes/);
      world = answered.world;
      const couple = coupleBetween(world, playerId, otherId)!;
      expect(couple.kind).toBe(COUPLE_KIND);
      // One couple at a time: nobody else can be asked while this lasts
      // (Massachusetts roll call, two partners at once).
      const partnerName = world.people[otherId]!.givenName;
      const others = projectContacts(world, playerId).contacts.filter(
        (entry) =>
          entry.personId !== otherId &&
          dateRefusal(world, playerId, entry.personId) === null,
      );
      expect(others.length).toBeGreaterThan(0);
      for (const entry of others) {
        expect(coupleAskRefusal(world, playerId, entry.personId)).toBe(
          `You are with ${partnerName}. That would have to end first.`,
        );
      }
      // Every system that asks after a partner now finds one.
      expect(
        describePersonContext(world, playerId, otherId)?.relationship,
      ).toBe("your partner");
      expect(action(world, playerId, otherId, "end-couple")?.available).toBe(
        true,
      );

      // And either of them can end it.
      world = breakUp(world, {
        personId: playerId,
        otherPersonId: otherId,
      }).world;
      expect(coupleBetween(world, playerId, otherId)).toBe(null);
      expect(
        describePersonContext(world, playerId, otherId)?.relationship,
      ).not.toBe("your partner");
    }, 300_000);
  }

  it("never offers a date with family, or to anyone under eighteen", () => {
    const KIN =
      /\b(mom|dad|mother|father|sister|brother|son|daughter|grand|aunt|uncle|cousin)/;
    let kinSeen = 0;
    for (const startAge of [26, 15]) {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey: TOWNS[0][1],
          seed: "couples:family",
          startAge,
        }),
      ).game!;
      const playerId = game.playerPersonId;
      const world = openOrdinaryLife(game.world, playerId);
      for (const entry of projectContacts(world, playerId).contacts) {
        const dateOffered = entry.actions.some(
          (item) => item.kind === "ask-on-a-date",
        );
        if (startAge < 18) expect(dateOffered).toBe(false);
        if (entry.relationshipLabel && KIN.test(entry.relationshipLabel)) {
          kinSeen += 1;
          expect(dateOffered).toBe(false);
        }
      }
    }
    expect(kinSeen).toBeGreaterThan(0);
  }, 300_000);
});

describe("somebody who raised you is never somebody to ask out", () => {
  /*
   * Rhode Island (main 22b4f13e): Parker asked out Jennifer Brooks, the
   * guardian who raised Parker, and the date went ahead. A guardian from an
   * age-five start holds a guardianship record and no kinship record, and the
   * guardianship ends at eighteen. The player is made an adult here by moving
   * the birth date, which is the one thing this test changes by hand; the
   * guardianship record is the game's own.
   */
  it("refuses a date with a guardian, in both directions", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: "4459000",
        seed: "g:ri",
        startAge: 5,
      }),
    ).game!;
    const playerId = game.playerPersonId;
    const opened = openOrdinaryLife(game.world, playerId);
    const authority = opened.history.childAuthorities.find(
      (record) =>
        record.childPersonId === playerId && record.holder.kind === "person",
    )!;
    expect(authority).toBeDefined();
    const guardianId = (authority.holder as { personId: EntityId }).personId;
    // The case that was reported: no kinship record joins the two of them.
    expect(
      opened.history.kinshipRelationships.some(
        (kin) =>
          kin.personIds.includes(playerId) &&
          kin.personIds.includes(guardianId),
      ),
    ).toBe(false);
    const world: World = {
      ...opened,
      people: {
        ...opened.people,
        [playerId]: { ...opened.people[playerId]!, birthDate: "2000-01-05" },
      },
    };
    expect(dateRefusal(world, playerId, guardianId)).toBe("You are family.");
    expect(dateRefusal(world, guardianId, playerId)).toBe("You are family.");
    expect(action(world, playerId, guardianId, "ask-on-a-date")).toBe(
      undefined,
    );
  }, 300_000);
});
