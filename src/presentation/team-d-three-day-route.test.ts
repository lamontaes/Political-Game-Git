import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  advanceWorldMinutes,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  cancelScheduledActivity,
  deserializeWorld,
  homePartyChapters,
  scheduledActivityState,
  serializeWorld,
} from "../simulation";
import { requestPartyWork } from "./campaign-life-actions";
import { simulateCalendarDays } from "./calendar-time-control";
import {
  askCandidateGuidance,
  projectCandidateGuidanceScene,
} from "./candidate-guidance-scene";
import { speakAtOrdinaryMeeting } from "../simulation/ordinary-meeting-presence";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import {
  goBrieflyToOrdinaryMeeting,
  leaveOrdinaryMeeting,
  planOrdinaryMeetingAttendance,
} from "./ordinary-meeting-actions";
import { openOrdinaryLife } from "./ordinary-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { submitTimeCommand, type TimeCommand } from "./time-command";
import type { EntityId, World } from "../simulation";

function press(world: World, personId: EntityId, command: TimeCommand) {
  return submitTimeCommand(world, {
    requestId: `team-d-three-day:${world.history.nextSequence}`,
    personId,
    sourceMoment: world.currentMoment,
    command,
  });
}

describe("a three-day ordinary-player route", () => {
  it("reaches both real rooms, saves their choices and passes no routine chore", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "team-d-three-day",
        startAge: 34,
        startKind: "custom",
        placeKey: "0406260",
      }),
    ).game!;
    const personId = game.playerPersonId;
    let world = openOrdinaryLife(game.world, personId);
    const startDate = world.currentDate;
    const meeting = world.history.scheduledActivities.find(
      (activity) => activity.title === "Posted public meeting",
    )!;
    const chapter = homePartyChapters(world)[0]!;
    world = requestPartyWork(
      world,
      personId,
      "candidate-guidance",
      chapter.organizationId,
    );
    const guidance = campaignLifeActivityRecords(world).at(-1)!;
    expect(
      world.history.workItems.some((item) =>
        item.stableKey.startsWith("ordinary-life:household-errands"),
      ),
    ).toBe(false);
    expect(scheduledActivityState(world, meeting.id).start.date).toBe(
      "2026-01-06",
    );
    expect(
      scheduledActivityState(world, guidance.scheduledActivityId).start.date,
    ).toBe("2026-01-07");

    const firstStop = press(world, personId, { kind: "days", days: 3 });
    expect(firstStop.world.currentDate).toBe("2026-01-06");
    expect(firstStop.world.currentMoment.minuteOfDay).toBe(18 * 60 + 10);
    expect(firstStop.receipt.stoppedEarly).toBe(true);
    expect(firstStop.receipt.outcome).toContain(
      "The public meeting starts at 6:30 p.m.",
    );
    expect(firstStop.receipt.outcome).not.toContain("Journey to");
    expect(
      firstStop.world.history.events.filter(
        (event) =>
          event.type === "life.scene.arrived" &&
          event.involvedEntityIds.includes(meeting.id),
      ),
    ).toHaveLength(0);
    expect(scheduledActivityState(firstStop.world, meeting.id).status).toBe(
      "scheduled",
    );
    const calendarWeek = simulateCalendarDays(world, personId, 7);
    expect(calendarWeek.reached).toEqual(firstStop.world.currentMoment);
    expect(calendarWeek.outcome).toContain(
      "The public meeting starts at 6:30 p.m.",
    );
    const arrived = press(firstStop.world, personId, {
      kind: "attend-activity",
      activityId: meeting.id,
    });
    expect(arrived.receipt.status).toBe("accepted");
    expect(arrived.world.currentMoment.minuteOfDay).toBe(18 * 60 + 30);
    expect(
      arrived.world.history.events.some(
        (event) =>
          event.type === "life.scene.arrived" &&
          event.involvedEntityIds.includes(meeting.id),
      ),
    ).toBe(true);
    expect(projectOrdinaryMeetingScene(arrived.world, personId)?.phase).toBe(
      "active",
    );
    const left = leaveOrdinaryMeeting(arrived.world, personId, meeting.id);
    expect(scheduledActivityState(left, meeting.id).status).toBe("cancelled");
    expect(left.currentMoment.minuteOfDay).toBe(18 * 60 + 50);
    const brief = goBrieflyToOrdinaryMeeting(
      arrived.world,
      personId,
      meeting.id,
    );
    const briefEvent = brief.history.events.find(
      (event) => event.type === "civic.meeting-brief-visit",
    );
    expect(briefEvent?.summary).toContain("opening discussion");
    const spoken = speakAtOrdinaryMeeting(
      arrived.world,
      personId,
      meeting.id,
      "ask",
    );
    const savedMeeting = deserializeWorld(serializeWorld(spoken));
    expect(
      projectOrdinaryMeetingScene(savedMeeting, personId)?.spokenWords,
    ).toBe(projectOrdinaryMeetingScene(spoken, personId)?.spokenWords);
    const stayed = press(savedMeeting, personId, {
      kind: "attend-activity",
      activityId: meeting.id,
    });
    expect(scheduledActivityState(stayed.world, meeting.id).status).toBe(
      "completed",
    );
    expect(stayed.world.currentMoment.minuteOfDay).toBe(19 * 60 + 45);
    expect(
      stayed.world.history.events.find(
        (event) =>
          event.stableKey === `ordinary-meeting-presence-v1:${meeting.id}`,
      )?.tags,
    ).not.toContain("attendance:late-entry");
    const home = press(stayed.world, personId, {
      kind: "walk",
      destination: "home",
    });
    expect(home.receipt.status).toBe("accepted");
    expect(home.world.currentMoment.minuteOfDay).toBe(20 * 60 + 5);

    const secondStop = press(home.world, personId, { kind: "days", days: 2 });
    expect(secondStop.world.currentDate).toBe("2026-01-07");
    const atParty = press(secondStop.world, personId, {
      kind: "attend-activity",
      activityId: guidance.scheduledActivityId,
    });
    expect(atParty.receipt.status).toBe("accepted");
    const room = projectCandidateGuidanceScene(atParty.world, personId)!;
    expect(room.actors[0]?.personId).toBe(guidance.hostPersonId);
    const asked = askCandidateGuidance(
      atParty.world,
      personId,
      guidance.scheduledActivityId,
      "requirements",
    );
    const savedParty = deserializeWorld(serializeWorld(asked));
    expect(
      projectCandidateGuidanceScene(savedParty, personId)?.turns,
    ).toHaveLength(1);
    const finished = press(savedParty, personId, {
      kind: "attend-activity",
      activityId: guidance.scheduledActivityId,
    });
    expect(
      scheduledActivityState(finished.world, guidance.scheduledActivityId)
        .status,
    ).toBe("completed");
    expect(
      campaignLifeOutcomeRecords(finished.world).filter(
        (outcome) => outcome.activityId === guidance.id,
      ),
    ).toHaveLength(1);
    expect(finished.world.currentDate).toBe("2026-01-07");
    expect(finished.world.currentDate).not.toBe(startDate);
    assertWorldIntegrity(finished.world);
  }, 10_000); // Two-room save/reload took 5.39–5.68 s under shared-host checks.

  it("takes a saved plan on Day/Week and preserves a real late route", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "team-e-three-meeting-paths",
        startAge: 34,
        startKind: "custom",
        placeKey: "0406260",
      }),
    ).game!;
    const personId = game.playerPersonId;
    const world = openOrdinaryLife(game.world, personId);
    const meeting = world.history.scheduledActivities.find(
      (item) => item.title === "Posted public meeting",
    )!;
    const journey = world.history.scheduledActivities.find(
      (item) =>
        item.kind === "travel" && item.sourceEntityIds.includes(meeting.id),
    )!;
    const planned = planOrdinaryMeetingAttendance(world, personId, meeting.id);
    expect(planned).not.toBe(world);
    expect(planned.currentMoment).toEqual(world.currentMoment);
    const savedPlan = deserializeWorld(serializeWorld(planned));
    const committed = press(savedPlan, personId, { kind: "days", days: 3 });
    expect(committed.world.currentMoment.minuteOfDay).toBe(18 * 60 + 30);
    expect(scheduledActivityState(committed.world, journey.id).status).toBe(
      "completed",
    );
    expect(projectOrdinaryMeetingScene(committed.world, personId)?.phase).toBe(
      "active",
    );

    const choice = press(world, personId, { kind: "days", days: 3 }).world;
    const missedJourney = cancelScheduledActivity(choice, journey.id);
    const lateDecision = advanceWorldMinutes(missedJourney, 10);
    expect(lateDecision.currentMoment.minuteOfDay).toBe(18 * 60 + 20);
    const lateAttempt = press(lateDecision, personId, {
      kind: "attend-activity",
      activityId: meeting.id,
    });
    expect(lateAttempt.receipt.status).toBe("accepted");
    const lateArrival = lateAttempt.world;
    expect(lateArrival.currentMoment.minuteOfDay).toBe(18 * 60 + 40);
    expect(projectOrdinaryMeetingScene(lateArrival, personId)?.phase).toBe(
      "active",
    );
    expect(
      scheduledActivityState(lateArrival, meeting.id).end.minuteOfDay,
    ).toBe(19 * 60 + 45);
    expect(
      lateArrival.history.events.some(
        (event) =>
          event.type === "life.scene.arrived" &&
          event.tags.includes("travel:late-meeting"),
      ),
    ).toBe(true);
  }, 10_000);
});
