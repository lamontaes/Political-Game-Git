import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
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
      "Journey to the public meeting",
    );
    expect(scheduledActivityState(firstStop.world, meeting.id).status).toBe(
      "scheduled",
    );
    const calendarWeek = simulateCalendarDays(world, personId, 7);
    expect(calendarWeek.reached).toEqual(firstStop.world.currentMoment);
    expect(calendarWeek.outcome).toContain("Journey to the public meeting");
    const arrived = press(firstStop.world, personId, {
      kind: "attend-activity",
      activityId: meeting.id,
    });
    expect(arrived.receipt.status).toBe("accepted");
    expect(projectOrdinaryMeetingScene(arrived.world, personId)?.phase).toBe(
      "active",
    );
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
    const home = press(stayed.world, personId, {
      kind: "walk",
      destination: "home",
    });
    expect(home.receipt.status).toBe("accepted");

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
  });
});
