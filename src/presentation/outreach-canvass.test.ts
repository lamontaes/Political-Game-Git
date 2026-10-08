import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  activeCampaignForCandidate,
  localGoverningBodiesForJurisdiction,
} from "../simulation";
import {
  CANVASS_DOORS_PER_HOUR,
  DOOR_ANSWER_DECISION_ID,
  residentComesToTheDoor,
  walkCampaignCanvass,
} from "../simulation/campaign-canvass";
import { CAMPAIGN_DOOR_CONTACT_KIND } from "../simulation/campaigns";
import {
  addSimulationMinutes,
  ageOnDate,
  simulationMinutesBetween,
} from "../simulation/dates";
import { peopleInHouseholdAt } from "../simulation/life-queries";
import { whereaboutsAt } from "../simulation/living-world/work-schedules";
import { municipalSeatChoices } from "../simulation/municipal-seat-identity";
import { scheduledActivityState } from "../simulation/time-work";
import { traitRegistryFor } from "../simulation/trait-registry";
import { registeredTraitConsiderations } from "../simulation/trait-readings";
import type { EntityId, World } from "../simulation/types";
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
    "meets by name the residents home at each knock who come to the door, and only them",
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

      // The Campaigns screen's outreach button.
      world = spendAnAfternoon(world, personId, "outreach");
      const action = world.history.campaignActions!.at(-1)!;
      const result = world.history.campaignActionResults!.at(-1)!;
      expect(result.campaignActionId).toBe(action.id);
      const canvass = result.canvass!;

      // The doors reached follow from the session's minutes and the pace.
      const timing = scheduledActivityState(world, action.scheduledActivityId);
      const minutes = simulationMinutesBetween(timing.start, timing.end);
      const doors = Math.floor((minutes * CANVASS_DOORS_PER_HOUR) / 60);
      expect(canvass.householdIds.length).toBeGreaterThan(0);
      expect(canvass.householdIds.length).toBeLessThanOrEqual(doors);
      expect(new Set(canvass.householdIds).size).toBe(
        canvass.householdIds.length,
      );

      // At each door, the adults home at the minute of the knock.
      const home = canvass.householdIds.flatMap((householdId, index) => {
        const knockedAt = addSimulationMinutes(
          timing.start,
          Math.floor((index * minutes) / doors),
        );
        return peopleInHouseholdAt(world, householdId)
          .filter(
            (id) =>
              id !== personId &&
              ageOnDate(world.people[id]!.birthDate, knockedAt.date) >= 18 &&
              whereaboutsAt(world, id, knockedAt).kind === "home",
          )
          .map((id) => ({ id, householdId }));
      });
      // Of those, exactly the ones whose own decision is to come and talk.
      const talked = home.filter(({ id, householdId }) =>
        residentComesToTheDoor(
          world,
          id,
          personId,
          `${action.stableKey}:door:${householdId}:${id}`,
        ),
      );
      expect([...canvass.metPersonIds].sort()).toEqual(
        [...new Set(talked.map(({ id }) => id))].sort(),
      );
      expect(canvass.metPersonIds.length, place.key).toBeGreaterThan(0);
      // The decision is the resident's own. Somebody whose recorded traits
      // lean against talking stays inside; somebody who leans toward it, or
      // has no lean either way, comes to the door.
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
      expect(residentComesToTheDoor(world, declines!, personId, "d")).toBe(
        false,
      );
      expect(residentComesToTheDoor(world, talks!, personId, "t")).toBe(true);
      expect(residentComesToTheDoor(world, neither!, personId, "n")).toBe(true);
      // Nobody in a knocked household who was out was met.
      const out = canvass.householdIds
        .flatMap((householdId) => peopleInHouseholdAt(world, householdId))
        .filter((id) => id !== personId && !home.some((row) => row.id === id));
      for (const id of out) expect(canvass.metPersonIds).not.toContain(id);

      // Each one is met by name and knows of the visit.
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
        expect(
          world.history.knowledge.some(
            (row) =>
              row.personId === id && row.eventId === result.outcomeEventId,
          ),
          id,
        ).toBe(true);
      }

      // The next session picks up at the next door, not the same ones.
      const next = walkCampaignCanvass(world, campaign, action).doors;
      expect(next.length).toBeGreaterThan(0);
      expect(
        next.some((door) => canvass.householdIds.includes(door.householdId)),
      ).toBe(false);
    },
  );
});
