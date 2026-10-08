import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  activeCampaignForCandidate,
  localGoverningBodiesForJurisdiction,
} from "../simulation";
import { filingOfficeForSeat } from "../simulation/filing-office";
import {
  FILING_OFFICE_LOCATION_KEY,
  requestFilingVisit,
  scheduledFilingVisits,
} from "../simulation/filing-visit";
import { sittingLocalClerk } from "../simulation/living-world/local-government-seats";
import {
  readWorldSnapshot,
  serializeWorldPayload,
  worldPayloadMatches,
} from "../simulation/serialization";
import { scheduledActivityState } from "../simulation/time-work";
import type { World } from "../simulation/types";
import { playCalendarActivity } from "./calendar-time-control";
import {
  CLERK_QUESTIONS,
  CLERK_SCENE_FILED,
  CLERK_SCENE_QUESTION,
  askClerk,
  fileAtClerk,
  leaveFilingVisit,
  projectClerkFilingScene,
} from "./clerk-filing-scene";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { projectPlacesWorkspace } from "./player-places";
import { endQuestionnaireEarly } from "./setup-questionnaire-flow";

const SEED = "clerk-filing-scene";

/** A place, drawn from all 56 by seed, whose own board an adult can stand for. */
const place = drawRandomPlace(SEED, (candidate) =>
  localGoverningBodiesForJurisdiction(candidate.context.jurisdiction.id).some(
    (seat) => seat.seat === "governing-body",
  ),
);

describe(`the clerk's counter in a generated world (${place.displayName}, seed ${SEED})`, () => {
  it(
    "arranges a visit from Places, answers from the records, files at the counter, and sends the player home",
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
      const opened = world.currentDate;
      const council = localGoverningBodiesForJurisdiction(
        world.people[personId]!.homeJurisdictionId,
      ).find((seat) => seat.seat === "governing-body")!;
      const office = filingOfficeForSeat(world, council.officeKey)!;

      // Places names the office and its clerk's title from the records.
      const offer = projectPlacesWorkspace(world, personId)!.offers.find(
        (row) =>
          row.filingSeatOfficeKey !== undefined &&
          filingOfficeForSeat(world, row.filingSeatOfficeKey)?.unit.id ===
            office.unit.id,
      )!;
      expect(offer, place.key).toBeDefined();
      expect(offer.title).toBe(office.governmentName);
      expect(offer.detail).toBe(office.officeTitle);

      world = requestFilingVisit(world, personId, offer.filingSeatOfficeKey!);
      const visit = scheduledFilingVisits(world, personId)[0]!;
      expect(visit.location.locationKey).toBe(FILING_OFFICE_LOCATION_KEY);
      // The clerk is a resident who holds the office, and is on the visit.
      const clerk = sittingLocalClerk(world, office.unit, office.clerkTitle)!;
      expect(clerk).not.toBeNull();
      expect(visit.participantPersonIds).toContain(clerk.personId);
      // Only one visit at a time; asking again writes nothing.
      expect(
        requestFilingVisit(world, personId, offer.filingSeatOfficeKey!),
      ).toBe(world);
      expect(
        projectPlacesWorkspace(world, personId)!.offers.some(
          (row) => row.filingSeatOfficeKey !== undefined,
        ),
      ).toBe(false);

      // Attend, as the Calendar and Places buttons do: the journey, then the counter.
      world = playCalendarActivity(world, personId, visit.id).world;
      let scene = projectClerkFilingScene(world, personId)!;
      expect(scene, "the player reached the counter").not.toBeNull();
      expect(scene.actors[0]!.personId).toBe(clerk.personId);
      expect(scene.actors[0]!.role).toBe(office.clerkTitle);
      expect(scene.location.label).toBe(office.governmentName);

      for (const question of CLERK_QUESTIONS) {
        const asked = askClerk(world, personId, scene.activityId, question);
        expect(asked, question).not.toBe(world);
        // The same question twice is answered once.
        expect(askClerk(asked, personId, scene.activityId, question)).toBe(
          asked,
        );
        world = asked;
      }
      scene = projectClerkFilingScene(world, personId)!;
      const turns = world.history.events.filter(
        (event) =>
          event.type === CLERK_SCENE_QUESTION &&
          event.tags.includes(`entry:${scene.eventId}`),
      );
      expect(turns.map((turn) => turn.context.choice).sort()).toEqual(
        [...CLERK_QUESTIONS].sort(),
      );
      // What the player now knows, told by the clerk.
      for (const turn of turns)
        expect(
          world.history.knowledge.some(
            (row) =>
              row.eventId === turn.id &&
              row.personId === personId &&
              row.source.kind === "told-by" &&
              row.source.sourcePersonId === clerk.personId,
          ),
        ).toBe(true);
      const requirements = scene.turns.find(
        (turn) => turn.question === "requirements",
      )!;
      const seatAnswer = requirements.answer.find(
        (row) => row.officeKey === council.officeKey,
      )!;
      expect(seatAnswer.minimumAge).toMatchObject({ kind: "known", value: 18 });
      const filing = scene.turns.find((turn) => turn.question === "filing")!;
      expect(
        filing.answer.find((row) => row.officeKey === council.officeKey)
          ?.electionDate,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      expect(scene.availableActions).toContain(`file:${council.officeKey}`);
      world = fileAtClerk(world, personId, scene.activityId, council.officeKey);
      const campaign = activeCampaignForCandidate(world, personId)!;
      expect(campaign.officeKey).toBe(council.officeKey);
      expect(
        world.history.events.some(
          (event) =>
            event.type === CLERK_SCENE_FILED &&
            event.involvedEntityIds.includes(campaign.id),
        ),
      ).toBe(true);
      // The counter shows the filing: the seat, with the player among those filed.
      const filedTurn = projectClerkFilingScene(world, personId)!.turns.find(
        (turn) => turn.kind === CLERK_SCENE_FILED,
      )!;
      expect(filedTurn.answer.map((row) => row.officeKey)).toEqual([
        council.officeKey,
      ]);
      expect(
        filedTurn.answer[0]!.filed?.map((filer) => filer.personId),
      ).toContain(personId);
      // Filed once: the counter no longer offers it.
      expect(
        projectClerkFilingScene(world, personId)!.availableActions,
      ).not.toContain(`file:${council.officeKey}`);

      world = leaveFilingVisit(world, personId, scene.activityId);
      expect(projectClerkFilingScene(world, personId)).toBeNull();
      expect(scheduledActivityState(world, visit.id).status).toBe("cancelled");
      expect(projectPlacesWorkspace(world, personId)!.current.setting).toBe(
        "home",
      );
      expect(
        (Date.parse(world.currentDate) - Date.parse(opened)) / 86_400_000,
      ).toBeLessThanOrEqual(7);

      // Save and continue keeps every answer and the campaign.
      const saved = serializeWorldPayload(world);
      const read = readWorldSnapshot(saved);
      const reloaded = read.world;
      expect(worldPayloadMatches(saved, reloaded, read.formatVersion)).toBe(
        true,
      );
      expect(activeCampaignForCandidate(reloaded, personId)?.id).toBe(
        campaign.id,
      );
    },
  );
});
