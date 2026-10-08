import { describe, expect, it } from "vitest";
import {
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  campaignGuidanceRecordText,
  lifePlaceStateIdentities,
  deserializeWorld,
  homePartyChapters,
  scheduledActivityState,
  serializeWorld,
  simulationMinutesBetween,
  projectCampaignGuidance,
  stateJurisdictionForKey,
} from "../simulation";
import { attendPartyWork, requestPartyWork } from "./campaign-life-actions";
import { plainCandidateGuidance } from "./candidate-guidance-prose";
import {
  askCandidateGuidance,
  composeCandidateGuidanceAnswer,
  leaveCandidateGuidance,
  projectCandidateGuidanceScene,
} from "./candidate-guidance-scene";
import { openingLifeLocation } from "./life-scene-flow";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { previewTimeCommand, submitTimeCommand } from "./time-command";

function booked(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      startKind: "custom",
      placeKey: "0406260",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const chapter = homePartyChapters(game.world)[0]!;
  const world = requestPartyWork(
    game.world,
    personId,
    "candidate-guidance",
    chapter.organizationId,
  );
  const record = campaignLifeActivityRecords(world).at(-1)!;
  return { world, personId, record };
}

function attend(
  world: ReturnType<typeof booked>["world"],
  personId: string,
  activityId: string,
) {
  return submitTimeCommand(world, {
    requestId: `guidance:${world.history.nextSequence}`,
    personId,
    sourceMoment: world.currentMoment,
    command: { kind: "attend-activity", activityId },
  });
}

describe("candidate guidance in the room", () => {
  it("composes the organizer's answer through the shared rule reader in all 56 places", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    const world = booked("candidate-guidance-all-places").world;
    const personId = world.personOrder[0]!;
    for (const place of places) {
      const jurisdiction = stateJurisdictionForKey(place.jurisdictionKey)!;
      const placeWorld = {
        ...world,
        people: {
          ...world.people,
          [personId]: {
            ...world.people[personId]!,
            homeJurisdictionId: jurisdiction.id,
          },
        },
      };
      const response = composeCandidateGuidanceAnswer(placeWorld, personId);
      expect(response, place.name).toBeTruthy();
      expect(response, place.name).not.toContain("Let's check");
      expect(response, place.name).not.toMatch(
        /\b[A-Z]{2,}(?:_[A-Z]+)+\b|\bUS-[A-Z]{2}\b/,
      );
      expect(response, place.name).not.toContain("Const.");
    }
  });

  it("opens through the normal Attend route, saves the organizer and questions, then finishes on Stay", () => {
    const { world, personId, record } = booked("candidate-guidance-room");
    const activityId = record.scheduledActivityId;
    const preview = previewTimeCommand(world, personId, {
      kind: "attend-activity",
      activityId,
    })!;
    expect(preview.target).toEqual(
      scheduledActivityState(world, activityId).start,
    );
    const first = attend(world, personId, activityId);
    expect(first.receipt.status).toBe("accepted");
    expect(first.world.currentMoment).toEqual(preview.target);
    expect(scheduledActivityState(first.world, activityId).status).toBe(
      "scheduled",
    );
    const scene = projectCandidateGuidanceScene(first.world, personId)!;
    expect(scene.actors[0]?.personId).toBe(record.hostPersonId);
    expect(scene.availableActions).toEqual([
      "requirements",
      "filing",
      "stay",
      "leave",
    ]);
    const saved = serializeWorld(first.world);
    expect(projectCandidateGuidanceScene(first.world, personId)).toEqual(scene);
    expect(serializeWorld(first.world)).toBe(saved);

    const asked = askCandidateGuidance(
      first.world,
      personId,
      activityId,
      "requirements",
    );
    expect(asked).not.toBe(first.world);
    expect(asked.currentMoment).toEqual(first.world.currentMoment);
    expect(
      projectCandidateGuidanceScene(asked, personId)?.turns[0]?.words,
    ).toBe("What are the requirements to run here?");
    const response = projectCandidateGuidanceScene(asked, personId)?.turns[0]
      ?.response;
    expect(response).toBe(
      plainCandidateGuidance(
        campaignGuidanceRecordText(projectCampaignGuidance(asked, personId), 4),
      ),
    );
    expect(response).not.toContain("Let's check the requirements");
    expect(response).toContain("minimum age");
    const requirementsEvent = asked.history.events.find(
      (event) =>
        event.type === "campaign.candidate-guidance-question" &&
        event.tags.includes("question:requirements"),
    )!;
    expect(requirementsEvent.context.immediateReaction).toBe(response);
    expect(
      asked.history.knowledge.some(
        (item) =>
          item.eventId === requirementsEvent.id &&
          item.personId === personId &&
          item.accuracy === "accurate" &&
          item.source.kind === "direct",
      ),
    ).toBe(true);
    expect(
      askCandidateGuidance(asked, personId, activityId, "requirements"),
    ).toBe(asked);

    const reloaded = deserializeWorld(serializeWorld(asked));
    expect(
      projectCandidateGuidanceScene(reloaded, personId)?.turns,
    ).toHaveLength(1);
    const finished = attend(reloaded, personId, activityId);
    expect(finished.receipt.status).toBe("accepted");
    expect(scheduledActivityState(finished.world, activityId).status).toBe(
      "completed",
    );
    expect(projectCandidateGuidanceScene(finished.world, personId)).toBeNull();
    expect(
      simulationMinutesBetween(
        reloaded.currentMoment,
        finished.world.currentMoment,
      ),
    ).toBe(30);
    expect(
      campaignLifeOutcomeRecords(finished.world).filter(
        (outcome) => outcome.activityId === record.id,
      ),
    ).toHaveLength(1);
  }, 120_000);

  it("leaves after asking without attendance credit and returns by the recorded route", () => {
    const { world, personId, record } = booked("candidate-guidance-leave");
    const first = attend(world, personId, record.scheduledActivityId);
    const asked = askCandidateGuidance(
      first.world,
      personId,
      record.scheduledActivityId,
      "filing",
    );
    expect(
      projectCandidateGuidanceScene(asked, personId)?.turns[0]?.response,
    ).toBe(
      plainCandidateGuidance(
        campaignGuidanceRecordText(projectCampaignGuidance(asked, personId), 4),
      ),
    );
    const left = leaveCandidateGuidance(
      asked,
      personId,
      record.scheduledActivityId,
    );
    expect(left).not.toBe(asked);
    expect(
      scheduledActivityState(left, record.scheduledActivityId).status,
    ).toBe("cancelled");
    expect(
      campaignLifeOutcomeRecords(left).filter(
        (outcome) => outcome.activityId === record.id,
      ),
    ).toHaveLength(0);
    expect(openingLifeLocation(left, personId)?.setting).toBe("home");
    expect(
      simulationMinutesBetween(asked.currentMoment, left.currentMoment),
    ).toBe(20);
  });

  it("the party work Attend action opens the same room before recording an outcome", () => {
    const { world, personId, record } = booked(
      "candidate-guidance-party-action",
    );
    const opened = attendPartyWork(world, personId, record.id, "attended");
    expect(projectCandidateGuidanceScene(opened, personId)?.activityId).toBe(
      record.scheduledActivityId,
    );
    expect(
      campaignLifeOutcomeRecords(opened).filter(
        (outcome) => outcome.activityId === record.id,
      ),
    ).toHaveLength(0);
  });
});
