import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  addSimulationMinutes,
  compareSimulationMoments,
} from "../simulation/dates";
import {
  createScheduledActivity,
  scheduledActivityState,
} from "../simulation/time-work";
import { scheduledActivityAnswer } from "../simulation/scheduled-activity-answer";
import { simulateCalendarDays } from "./calendar-time-control";

function calendarHold(kind: "tentative" | "confirmed") {
  const created = smallWorld({
    place: "NH",
    people: 4,
    seed: "a7-calendar-preferences",
  });
  const start = addSimulationMinutes(created.world.currentMoment, 90);
  const world = createScheduledActivity(created.world, {
    stableKey: `a7-calendar-preferences:${kind}`,
    title: "A visit",
    summary: "A recorded private visit for the calendar preference regression.",
    kind,
    start,
    end: addSimulationMinutes(start, 30),
    participantPersonIds: [created.personId],
    responsiblePersonId: created.personId,
    location: {
      locationKey: "a7-calendar-preferences:visit",
      label: "Visit",
      jurisdictionId: created.jurisdictionId,
    },
    sourceEntityIds: [created.personId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [created.personId] },
  });
  return {
    world,
    personId: created.personId,
    start,
    activityId: world.history.scheduledActivities.at(-1)!.id,
  };
}

describe("saved Calendar interruption preferences", () => {
  it("lets a muted optional hold lapse without inventing a refusal", () => {
    const { world, personId, start, activityId } = calendarHold("tentative");
    const result = simulateCalendarDays(world, personId, 1, {
      stopForTentativeHolds: false,
    });
    expect(compareSimulationMoments(result.reached, start)).toBeGreaterThan(0);
    expect(scheduledActivityState(result.world, activityId).status).toBe(
      "cancelled",
    );
    expect(scheduledActivityAnswer(result.world, [activityId])).toBe("lapsed");
    expect(scheduledActivityState(world, activityId).status).toBe("scheduled");
  });

  it("stops with the same optional hold unanswered when its preference is on", () => {
    const { world, personId, start, activityId } = calendarHold("tentative");
    const result = simulateCalendarDays(world, personId, 1, {
      stopForTentativeHolds: true,
    });
    expect(compareSimulationMoments(result.reached, start)).toBe(0);
    expect(scheduledActivityState(result.world, activityId).status).toBe(
      "scheduled",
    );
    expect(scheduledActivityAnswer(result.world, [activityId])).toBe(
      "unanswered",
    );
    const muted = simulateCalendarDays(result.world, personId, 1, {
      stopForTentativeHolds: false,
    });
    expect(compareSimulationMoments(muted.reached, start)).toBeGreaterThan(0);
    expect(scheduledActivityAnswer(muted.world, [activityId])).toBe("lapsed");
  });

  it("keeps a confirmed commitment mandatory with optional stops muted", () => {
    const { world, personId, start, activityId } = calendarHold("confirmed");
    const result = simulateCalendarDays(world, personId, 1, {
      stopForTentativeHolds: false,
    });
    expect(compareSimulationMoments(result.reached, start)).toBe(0);
    expect(scheduledActivityState(result.world, activityId).status).toBe(
      "scheduled",
    );
    expect(scheduledActivityAnswer(result.world, [activityId])).toBe(
      "unanswered",
    );
  });
});
