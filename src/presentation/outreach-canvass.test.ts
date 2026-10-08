import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  activeCampaignForCandidate,
  localGoverningBodiesForJurisdiction,
} from "../simulation";
import {
  CANVASS_DOORS_PER_HOUR,
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
import type { World } from "../simulation/types";
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
    "meets by name the residents home at each knock, and only them",
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

      // At each door, exactly the adults home at the minute of the knock.
      const expected = canvass.householdIds.flatMap((householdId, index) => {
        const knockedAt = addSimulationMinutes(
          timing.start,
          Math.floor((index * minutes) / doors),
        );
        return peopleInHouseholdAt(world, householdId).filter(
          (id) =>
            id !== personId &&
            ageOnDate(world.people[id]!.birthDate, knockedAt.date) >= 18 &&
            whereaboutsAt(world, id, knockedAt).kind === "home",
        );
      });
      expect([...canvass.metPersonIds].sort()).toEqual(
        [...new Set(expected)].sort(),
      );
      expect(canvass.metPersonIds.length, place.key).toBeGreaterThan(0);
      // Someone in a knocked household who was not home was not met.
      const notMet = canvass.householdIds
        .flatMap((householdId) => peopleInHouseholdAt(world, householdId))
        .filter((id) => id !== personId && !expected.includes(id));
      for (const id of notMet) expect(canvass.metPersonIds).not.toContain(id);

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
      const next = walkCampaignCanvass(world, campaign, action);
      expect(
        next.some((door) => canvass.householdIds.includes(door.householdId)),
      ).toBe(false);
    },
  );
});
