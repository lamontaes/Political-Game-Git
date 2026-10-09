import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  activeCampaignForCandidate,
  localGoverningBodiesForJurisdiction,
} from "../simulation";
import {
  CANVASS_DOORS_PER_HOUR,
  CANVASS_SUPPORT_EFFECT,
  DOOR_ANSWER_DECISION_ID,
  residentComesToTheDoor,
  walkCampaignCanvass,
} from "../simulation/campaign-canvass";
import {
  CAMPAIGN_DOOR_CONTACT_KIND,
  doorConversationBasisPoints,
} from "../simulation/campaigns";
import { doorKnockingReturn } from "../simulation/campaign-recognition";
import { contestIncumbentPersonId } from "../simulation/election-contests";
import {
  addSimulationMinutes,
  ageOnDate,
  simulationMinutesBetween,
} from "../simulation/dates";
import {
  doorResponse,
  doorSubject,
  placeConditions,
} from "../simulation/door-conversations";
import {
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../simulation/life-queries";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import {
  materializeSettledTownHousehold,
  townHouseholdPeople,
  townResidentId,
} from "../simulation/living-world/town-residents";
import { whereaboutsAt } from "../simulation/living-world/work-schedules";
import { municipalSeatChoices } from "../simulation/municipal-seat-identity";
import { outcomeRecipientsAt } from "../simulation/outcome-web/person-outcome-landings";
import { storyPeople, writeOutStoryPerson } from "../simulation/story-people";
import { scheduledActivityState } from "../simulation/time-work";
import { traitRegistryFor } from "../simulation/trait-registry";
import { registeredTraitConsiderations } from "../simulation/trait-readings";
import type { EntityId, World } from "../simulation/types";
import {
  assertWorldIntegrity,
  withWorldIntegrityDeferred,
} from "../simulation/world";
import { fileForOffice, spendAnAfternoon } from "./campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { endQuestionnaireEarly } from "./setup-questionnaire-flow";

const SEED = "outreach-canvass";

/** A place, drawn from all 56 by seed, whose own board an adult can stand for. */
const place = drawRandomPlace(SEED, (candidate) =>
  localGoverningBodiesForJurisdiction(candidate.context.jurisdiction.id).some(
    (seat) => seat.seat === "governing-body",
  ),
);

describe(`a candidate's afternoon on the doors in a generated world (${place.displayName}, seed ${SEED})`, () => {
  it(
    "meets the residents home who come to the door as story-only people, and moves support by what they raised",
    { timeout: 240_000 },
    () => {
      const game = generateOpeningLife(
        prepareOpeningLife(
          endQuestionnaireEarly({
            ...DEFAULT_NEW_GAME_SETUP,
            seed: SEED,
            placeKey: place.key,
            startAge: 18,
          }),
        ),
      ).game!;
      const personId = game.playerPersonId;
      let world: World = openOrdinaryLife(game.world, personId);
      const council = localGoverningBodiesForJurisdiction(
        world.people[personId]!.homeJurisdictionId,
      ).find((seat) => seat.seat === "governing-body")!;
      world = fileForOffice(
        world,
        personId,
        null,
        council.officeKey,
        null,
        municipalSeatChoices(world, personId, council.officeKey).find(
          (choice) => choice.eligible,
        )?.key ?? null,
      );
      const campaign = activeCampaignForCandidate(world, personId)!;
      const before = world;

      // The Campaigns screen's outreach button.
      world = spendAnAfternoon(world, personId, "outreach");
      assertWorldIntegrity(world);
      const action = world.history.campaignActions!.at(-1)!;
      const result = world.history.campaignActionResults!.at(-1)!;
      expect(result.campaignActionId).toBe(action.id);
      const canvass = result.canvass!;

      // The doors reached follow from the session's minutes and the pace.
      const timing = scheduledActivityState(world, action.scheduledActivityId);
      const minutes = simulationMinutesBetween(timing.start, timing.end);
      const doors = Math.floor((minutes * CANVASS_DOORS_PER_HOUR) / 60);
      const doorKeys = canvass.doorKeys!;
      expect(doorKeys.length).toBeGreaterThan(0);
      expect(doorKeys.length).toBeLessThanOrEqual(doors);
      expect(new Set(doorKeys).size).toBe(doorKeys.length);

      // Nobody is written out by a session on the doors: the world has the
      // same people and households, and the people met who were not already
      // written out are named in the story instead.
      expect(world.personOrder.length).toBe(before.personOrder.length);
      expect(world.history.households.length).toBe(
        before.history.households.length,
      );
      const named = new Map(storyPeople(world).map((row) => [row.id, row]));
      expect(canvass.storyPersonIds!.length, place.key).toBeGreaterThan(0);
      for (const id of canvass.storyPersonIds!) {
        const row = named.get(id)!;
        expect(row, id).toBeDefined();
        expect(world.people[id]).toBeUndefined();
        const roster = townHouseholdPeople(
          world,
          row.origin.town,
          row.origin.household,
        )[row.origin.member]!;
        expect(`${row.givenName} ${row.familyName}`).toBe(
          `${roster.givenName} ${roster.familyName}`,
        );
        expect(row.birthDate).toBe(roster.birthDate);
        // Where they were met, and what they said, as speech acts.
        expect(row.whereMet.setting).toBe("campaign-door");
        expect(row.whereMet.on).toBe(result.completedAt);
        const said = canvass.conversations!.find(
          (entry) => entry.personId === id,
        )!;
        expect(row.lines[0]).toEqual(
          said.subject
            ? { act: "complain", about: said.subject.measure }
            : { act: "greet", about: null },
        );
        expect(row.lines[1]!.act).toBe(
          { warm: "agree", cool: "decline", heard: "undecided" }[said.response],
        );
      }

      // Read every door again on a scratch copy, written out there the way
      // the walk reads them, and check who came: the adults home at the
      // minute of the knock whose own decision was to come and talk.
      const scratch = withWorldIntegrityDeferred(() => {
        let next = world;
        for (const key of doorKeys) {
          const [, town, index] = key.split(":");
          if (key.startsWith("town:"))
            next = materializeSettledTownHousehold(
              next,
              town as EntityId,
              Number(index),
            );
        }
        return next;
      });
      const householdOf = (key: string): EntityId | null => {
        const [, town, index] = key.split(":");
        if (!key.startsWith("town:")) return town as EntityId;
        const first = townResidentId(
          scratch,
          town as EntityId,
          Number(index),
          0,
        );
        return householdMembershipsAt(scratch, first)[0]?.household.id ?? null;
      };
      const recipients = outcomeRecipientsAt(scratch, timing.start.date);
      const conditions = placeConditions(
        scratch,
        world.people[personId]!.homeJurisdictionId,
        timing.start.date,
      );
      const holdsSeat =
        contestIncumbentPersonId(world, campaign.contestId) === personId;
      const expected: { id: EntityId; key: string }[] = [];
      doorKeys.forEach((doorKey, index) => {
        const knockedAt = addSimulationMinutes(
          timing.start,
          Math.floor((index * minutes) / doorKeys.length),
        );
        const householdId = householdOf(doorKey);
        for (const id of householdId
          ? peopleInHouseholdAt(scratch, householdId)
          : []) {
          if (
            id === personId ||
            ageOnDate(scratch.people[id]!.birthDate, knockedAt.date) < 18 ||
            whereaboutsAt(scratch, id, knockedAt).kind !== "home"
          )
            continue;
          const key = `${action.stableKey}:door:${doorKey}:${id}`;
          if (residentComesToTheDoor(scratch, id, personId, key))
            expected.push({ id, key });
        }
      });
      const conversations = canvass.conversations!;
      expect(conversations.map((row) => row.personId).sort()).toEqual(
        expected.map((row) => row.id).sort(),
      );
      // What each raised is the condition reaching them where the place
      // stands furthest from the country's middle, and how they took the
      // candidate is their own decision about it.
      for (const { id, key } of expected) {
        const row = conversations.find((entry) => entry.personId === id)!;
        const subject = doorSubject(conditions, recipients(id));
        expect(row.subject, id).toEqual(subject);
        expect(row.response, id).toBe(
          doorResponse(scratch, {
            residentId: id,
            candidateId: personId,
            subject,
            holdsSeat,
            key: `${key}:conversation`,
          }),
        );
      }
      const raised = conversations.filter((row) => row.subject !== null);
      expect(raised.length, place.key).toBeGreaterThan(0);
      console.log(
        JSON.stringify({
          place: place.key,
          doors: doorKeys.length,
          met: conversations.length,
          storyOnly: canvass.storyPersonIds!.length,
          writtenOut: canvass.metPersonIds.length,
          subjects: [...new Set(raised.map((row) => row.subject!.measure))],
          partisan: conversations.filter((row) => row.partisan).length,
          warm: conversations.filter((row) => row.response === "warm").length,
          cool: conversations.filter((row) => row.response === "cool").length,
          heard: conversations.filter((row) => row.response === "heard").length,
        }),
      );

      // A problem where they live leans a resident toward a newcomer for the
      // seat and away from whoever holds it, so with no traits, debts or
      // party on record the response follows the problem raised.
      for (const row of raised) {
        const leaning = registeredTraitConsiderations(
          scratch,
          traitRegistryFor(scratch),
          row.personId,
          "check",
          "campaign.door-conversation",
          personId,
        );
        if (leaning.length > 0 || row.partisan) continue;
        expect(row.response, row.personId).toBe(holdsSeat ? "cool" : "warm");
      }
      // Nobody raises a condition where their state ranks at or above the
      // middle of the states.
      for (const row of raised) expect(row.subject!.gap).toBeGreaterThan(0);

      // Written-out residents met are met by name and know of the visit.
      for (const id of canvass.metPersonIds) {
        expect(
          world.history.relationshipInteractions.some(
            (row) =>
              row.kind === CAMPAIGN_DOOR_CONTACT_KIND &&
              row.eventId === result.outcomeEventId &&
              row.personIds.includes(personId) &&
              row.personIds.includes(id),
          ),
          id,
        ).toBe(true);
      }

      // Everyone met now counts as recognizing the candidate, against the
      // town's adults rather than only those written out.
      const recognition = doorKnockingReturn(world, campaign);
      for (const id of [...canvass.metPersonIds, ...canvass.storyPersonIds!])
        expect(recognition.recognizedPersonIds).toContain(id);
      expect(recognition.electorate).toBeGreaterThanOrEqual(
        recognition.adultResidentIds.length,
      );
      // Every conversation moved support toward the candidate by the visit's
      // base; what was said moved each a little, never past zero.
      expect(
        doorConversationBasisPoints(world, campaign, conversations),
      ).toBeGreaterThan(0);
      const as = (response: (typeof conversations)[number]["response"]) =>
        doorConversationBasisPoints(
          world,
          campaign,
          conversations.map((row) => ({ ...row, response })),
        );
      expect(as("warm")).toBeGreaterThan(as("heard"));
      expect(as("heard")).toBeGreaterThan(as("cool"));
      expect(as("cool")).toBeGreaterThan(0);
      expect(as("cool") / as("heard")).toBeCloseTo(
        CANVASS_SUPPORT_EFFECT.cool,
        6,
      );

      // The next session picks up at the next doors.
      const nextDoors = walkCampaignCanvass(world, campaign, action);
      expect(nextDoors.length).toBeGreaterThan(0);
      expect(nextDoors.some((door) => doorKeys.includes(door.doorKey))).toBe(
        false,
      );

      // A story person who starts to matter is written out as the same
      // person, under the id they were named with.
      const someone = named.get(canvass.storyPersonIds![0]!)!;
      const written = writeOutStoryPerson(world, someone.id);
      expect(written.people[someone.id]?.birthDate).toBe(someone.birthDate);
      assertWorldIntegrity(written);
    },
  );

  it("decides who comes to the door from their own traits", () => {
    const game = generateOpeningLife(
      prepareOpeningLife(
        endQuestionnaireEarly({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: SEED,
          placeKey: place.key,
          startAge: 18,
        }),
      ),
    ).game!;
    const world = game.world;
    const personId = game.playerPersonId;
    // Somebody whose recorded traits lean against talking stays inside;
    // somebody who leans toward it, or has no lean either way, comes.
    const leanOf = (id: EntityId) =>
      registeredTraitConsiderations(
        world,
        traitRegistryFor(world),
        id,
        "check",
        DOOR_ANSWER_DECISION_ID,
        personId,
      ).map((row) => row.optionKey);
    const residents = world.personOrder.filter((id) => id !== personId);
    const declines = residents.find(
      (id) => leanOf(id).includes("decline") && !leanOf(id).includes("talk"),
    );
    const talks = residents.find(
      (id) => leanOf(id).includes("talk") && !leanOf(id).includes("decline"),
    );
    const neither = residents.find((id) => leanOf(id).length === 0);
    expect(declines && talks && neither).toBeTruthy();
    expect(residentComesToTheDoor(world, declines!, personId, "d")).toBe(false);
    expect(residentComesToTheDoor(world, talks!, personId, "t")).toBe(true);
    expect(residentComesToTheDoor(world, neither!, personId, "n")).toBe(true);
  }, 240_000);

  it("reads conditions for every one of the 56 places", () => {
    const game = generateOpeningLife(
      prepareOpeningLife(
        endQuestionnaireEarly({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: SEED,
          placeKey: place.key,
          startAge: 18,
        }),
      ),
    ).game!;
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    let read = 0;
    for (const state of states) {
      const conditions = placeConditions(
        game.world,
        stateJurisdictionForKey(state.jurisdictionKey)!.id,
        game.world.currentDate,
      );
      // A place the outcome web keeps no value for has no conditions,
      // rather than invented ones.
      for (const row of conditions) {
        expect(Number.isFinite(row.worseBy), state.jurisdictionKey).toBe(true);
        expect(row.nationalMiddle).not.toBe(0);
      }
      if (conditions.length > 0) read += 1;
    }
    console.log(JSON.stringify({ placesWithConditions: read }));
    expect(read).toBeGreaterThanOrEqual(52);
  }, 240_000);
});
