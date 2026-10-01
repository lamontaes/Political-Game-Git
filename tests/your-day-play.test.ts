import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { projectToday } from "../src/presentation/day-overview";
import { projectPlayerCalendar } from "../src/presentation/player-calendar";
import {
  previewTimeCommand,
  submitTimeCommand,
  type TimeCommand,
} from "../src/presentation/time-command";
import { simulateCalendarDays } from "../src/presentation/calendar-time-control";
import {
  addDays,
  addSimulationMinutes,
  compareSimulationMoments,
} from "../src/simulation/dates";
import {
  createScheduledActivity,
  scheduledActivityState,
} from "../src/simulation/time-work";
import { deserializeWorld, serializeWorld } from "../src/simulation";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import { SeededRng, pickDistinct } from "../src/simulation/rng";
import type { EntityId, World } from "../src/simulation/types";

const SEED = "your-day-play-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const PLACE = state!.jurisdictionKey;

function life() {
  return smallWorld({ place: PLACE, seed: SEED, people: 4 });
}

function command(
  world: World,
  personId: EntityId,
  action: TimeCommand,
  id: string,
) {
  return {
    requestId: id,
    personId,
    sourceMoment: world.currentMoment,
    command: action,
  };
}

function withAppointment(kind: "confirmed" | "tentative") {
  const small = life();
  const start = addSimulationMinutes(small.world.currentMoment, 90);
  const world = createScheduledActivity(small.world, {
    stableKey: `your-day-play:${kind}`,
    title: "A recorded visit",
    summary:
      "A private visit written through the schedule writer for this play script.",
    kind,
    start,
    end: addSimulationMinutes(start, 30),
    participantPersonIds: [small.personId],
    responsiblePersonId: small.personId,
    location: {
      locationKey: "your-day-play:visit",
      label: "Visit",
      jurisdictionId: small.jurisdictionId,
    },
    sourceEntityIds: [small.personId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [small.personId] },
  });
  return {
    ...small,
    world,
    start,
    activityId: world.history.scheduledActivities.at(-1)!.id,
  };
}

// These are ordinary player entry functions on one small world, not browser
// acceptance or a completed-slice claim. Missing registered paths are TODOs.
describe(`Your Day play script in ${PLACE} (seed ${SEED})`, () => {
  it("step 1: reads the recorded next commitment without spending time or writing facts", () => {
    const { world, personId, activityId } = withAppointment("confirmed");
    const before = serializeWorld(world);
    const calendar = projectPlayerCalendar(world, personId);
    const entry = calendar.days
      .flatMap((day) => day.entries)
      .find((item) => item.activityId === activityId);
    expect(entry).toMatchObject({
      group: "yours",
      kind: "confirmed",
      status: "scheduled",
      title: "A recorded visit",
    });
    expect(projectToday(world, personId).next?.activityId).toBe(activityId);
    expect(serializeWorld(world)).toBe(before);
  });

  it("step 2: previews and advances one day, then a week, through the time command", () => {
    const { world, personId } = life();
    const dayPreview = previewTimeCommand(world, personId, {
      kind: "days",
      days: 1,
    });
    expect(dayPreview).not.toBeNull();
    const day = submitTimeCommand(
      world,
      command(world, personId, { kind: "days", days: 1 }, "your-day-play:day"),
    );
    expect(day.receipt.status).toBe("accepted");
    expect(day.receipt.stoppedEarly).toBe(false);
    expect(day.world.currentDate).toBe(addDays(world.currentDate, 1));
    expect(
      compareSimulationMoments(day.world.currentMoment, dayPreview!.target),
    ).toBe(0);
    const weekPreview = previewTimeCommand(day.world, personId, {
      kind: "days",
      days: 7,
    });
    expect(weekPreview).not.toBeNull();
    const week = submitTimeCommand(
      day.world,
      command(
        day.world,
        personId,
        { kind: "days", days: 7 },
        "your-day-play:week",
      ),
    );
    expect(week.receipt.status).toBe("accepted");
    expect(week.receipt.stoppedEarly).toBe(false);
    expect(week.world.currentDate).toBe(addDays(day.world.currentDate, 7));
    expect(
      compareSimulationMoments(week.world.currentMoment, weekPreview!.target),
    ).toBe(0);
  });

  it("step 3: a Calendar day stops at a confirmed appointment and Continue preserves that frontier", () => {
    const { world, personId, start, activityId } = withAppointment("confirmed");
    const stopped = simulateCalendarDays(world, personId, 1, {
      stopForTentativeHolds: false,
    });
    expect(compareSimulationMoments(stopped.reached, start)).toBe(0);
    expect(scheduledActivityState(stopped.world, activityId).status).toBe(
      "scheduled",
    );
    const continued = deserializeWorld(serializeWorld(stopped.world));
    expect(compareSimulationMoments(continued.currentMoment, start)).toBe(0);
    expect(projectPlayerCalendar(continued, personId)).toEqual(
      projectPlayerCalendar(stopped.world, personId),
    );
    expect(projectToday(continued, personId).next?.activityId).toBe(activityId);
    const again = simulateCalendarDays(continued, personId, 1, {
      stopForTentativeHolds: false,
    });
    expect(compareSimulationMoments(again.reached, start)).toBe(0);
    expect(
      again.world.history.scheduledActivities.filter(
        (item) => item.id === activityId,
      ),
    ).toHaveLength(1);
    expect(scheduledActivityState(again.world, activityId).status).toBe(
      "scheduled",
    );
  });

  it("step 4: a stale day click after Continue cannot spend the same time twice", () => {
    const { world, personId } = life();
    const request = command(
      world,
      personId,
      { kind: "days", days: 1 },
      "your-day-play:single-click",
    );
    const first = submitTimeCommand(world, request);
    expect(first.receipt.status).toBe("accepted");
    const continued = deserializeWorld(serializeWorld(first.world));
    const before = serializeWorld(continued);
    const repeated = submitTimeCommand(continued, request);
    expect(repeated.receipt.status).toBe("stale");
    expect(repeated.world).toBe(continued);
    expect(serializeWorld(repeated.world)).toBe(before);
  });

  it.todo(
    "step 5: an ordinary registered month settles the actual mortgage, living-cost and office-salary periods once; A5 candidate1353 and Overflow7 own orchestration, current-main admission pending",
  );
  it.todo(
    "step 6: the ordinary registered clock retells actual heard speech across three months and Continue; A9 candidate1665 exists, shared registration held by Ruling32 pending Claude handoff",
  );
});
