import { describe, expect, it } from "vitest";
import {
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  deserializeWorld,
  homePartyChapters,
  lifePlaces,
  scheduledActivityState,
  serializeWorld,
  simulationMinutesBetween,
} from "../simulation";
import { attendPartyWork, requestPartyWork } from "./campaign-life-actions";
import {
  askCandidateGuidance,
  candidateGuidanceAnswerRecords,
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
  it("reads the same office-rule fields from every state and territory place", () => {
    const { world } = booked("candidate-guidance-all-jurisdictions");
    const jurisdictions = lifePlaces().filter(
      (place) => place.scope === "state",
    );
    const withRecords = jurisdictions.find(
      (place) =>
        candidateGuidanceAnswerRecords(
          world,
          place.context.jurisdiction.id,
          "requirements",
        ).length > 0,
    );
    expect(withRecords).toBeDefined();

    for (const place of jurisdictions) {
      const jurisdictionId = place.context.jurisdiction.id;
      const requirementRecords = candidateGuidanceAnswerRecords(
        world,
        jurisdictionId,
        "requirements",
      );
      const filingRecords = candidateGuidanceAnswerRecords(
        world,
        jurisdictionId,
        "filing",
      );

      expect(
        requirementRecords.every(
          (office) => office.minimumAge && office.residency,
        ),
      ).toBe(true);
      expect(filingRecords.every((office) => office.filing)).toBe(true);
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
    const turn = projectCandidateGuidanceScene(asked, personId)?.turns[0];
    expect(turn?.question).toBe("requirements");
    expect(turn?.answer).toBeDefined();
    expect(
      turn?.answer.every((office) => office.minimumAge && office.residency),
    ).toBe(true);
    expect(
      asked.history.events.find((event) => event.id === turn?.eventId)?.context
        .campaignGuidanceAnswer,
    ).toBe(JSON.stringify(turn?.answer));
    expect(
      asked.history.knowledge.find((item) => item.eventId === turn?.eventId)
        ?.believedSummary,
    ).toBe(JSON.stringify(turn?.answer));
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
  });

  it("leaves after asking without attendance credit and returns by the recorded route", () => {
    const { world, personId, record } = booked("candidate-guidance-leave");
    const first = attend(world, personId, record.scheduledActivityId);
    const asked = askCandidateGuidance(
      first.world,
      personId,
      record.scheduledActivityId,
      "filing",
    );
    const turn = projectCandidateGuidanceScene(asked, personId)?.turns[0];
    expect(turn?.question).toBe("filing");
    expect(turn?.answer).toBeDefined();
    expect(turn?.answer.every((office) => office.filing)).toBe(true);
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
