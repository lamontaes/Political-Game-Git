import { describe, expect, it } from "vitest";

import {
  addSimulationMinutes,
  advanceWorld,
  advanceWorldMinutes,
  assertWorldIntegrity,
  controlledCommitmentsBlockingActivityPerformance,
  controlledCommitmentsBlockingMinuteAdvance,
  createFutureTransitionHandlerRegistry,
  createScheduledActivity,
  deserializeWorld,
  futureDueItemStateAt,
  makeSimulationMoment,
  performScheduledActivity,
  recordWorldEvent,
  rescheduleScheduledActivity,
  scheduleFutureDueItem,
  scheduledActivityState,
  scheduledActivityPerformanceTiming,
  serializeWorld,
  simulationMinutesBetween,
  workItemState,
  type EntityId,
  type FutureTransitionHandler,
  type World,
} from "../simulation";
import { createRunDUiState, runDUiReducer } from "./run-d-lite-state";
import {
  createRunDLiteFixture,
  delegateRunDMeetingBrief,
  hiddenRunDStateIsFiltered,
  performRunDScheduledActivity,
  projectRunDLite,
  rescheduleRunDFlexibleBlock,
  RUN_D_LITE_TIME_ZONE,
  RUN_D_LITE_UTC_OFFSET_MINUTES,
} from "./run-d-lite";

function fixtureMoment(
  world: World,
  hour: number,
  minute: number,
  date = world.currentDate,
) {
  return makeSimulationMoment({
    date,
    minuteOfDay: hour * 60 + minute,
    timeZone: RUN_D_LITE_TIME_ZONE,
    utcOffsetMinutes: RUN_D_LITE_UTC_OFFSET_MINUTES,
  });
}

function eventHandler(calls: string[]): FutureTransitionHandler {
  return (world, item) => {
    calls.push(item.stableKey);
    const next = recordWorldEvent(world, {
      stableKey: `${item.stableKey}:run-d-lite-outcome`,
      type: "simulation.synthetic-transition-resolved",
      occurredAt: item.dueAt,
      recordedAt: item.dueAt,
      jurisdictionId: item.jurisdictionId,
      involvedEntityIds: [item.id, ...item.entityIds],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["simulation.future-transition", "run-d-lite.test"],
      summary: "Resolved the bounded D-Lite midnight transition.",
      context: {
        location: null,
        socialContext: "D-Lite exact-time compatibility proof.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return {
      world: next,
      status: "resolved",
      reasonKey: null,
      context: "Resolved once at the date frontier.",
      outcomeEventId: next.history.events.at(-1)!.id,
    };
  };
}

describe("Stage 6.5 Run D-Lite canonical moment", () => {
  it("stores a deterministic zoned minute and keeps currentDate consistent", () => {
    const first = createRunDLiteFixture().world;
    const second = createRunDLiteFixture().world;
    expect(first.currentMoment).toStrictEqual({
      date: "2026-01-05",
      minuteOfDay: 550,
      timeZone: "America/New_York",
      utcOffsetMinutes: -300,
    });
    expect(second.currentMoment).toStrictEqual(first.currentMoment);
    expect(first.currentDate).toBe(first.currentMoment.date);
    expect(first.actionSequence).toBe(0);
  });

  it("rejects invalid minutes, timezones, offsets, and date/moment contradictions", () => {
    expect(() =>
      makeSimulationMoment({
        date: "2026-01-05",
        minuteOfDay: 1_440,
        timeZone: "America/New_York",
        utcOffsetMinutes: -300,
      }),
    ).toThrow(/minute-of-day/i);
    expect(() =>
      makeSimulationMoment({
        date: "2026-01-05",
        minuteOfDay: 550,
        timeZone: "EST",
        utcOffsetMinutes: -300,
      }),
    ).toThrow(/timezone/i);
    expect(() =>
      makeSimulationMoment({
        date: "2026-01-05",
        minuteOfDay: 550,
        timeZone: "Fake/Zone",
        utcOffsetMinutes: -300,
      }),
    ).toThrow(/timezone/i);
    expect(() =>
      makeSimulationMoment({
        date: "2026-07-05",
        minuteOfDay: 550,
        timeZone: "America/New_York",
        utcOffsetMinutes: -300,
      }),
    ).toThrow(/offset/i);
    expect(() =>
      makeSimulationMoment({
        date: "2026-01-05",
        minuteOfDay: 550,
        timeZone: "America/New_York",
        utcOffsetMinutes: -900,
      }),
    ).toThrow(/offset/i);
    const malformed = structuredClone(
      createRunDLiteFixture().world,
    ) as unknown as {
      currentMoment: { date: string };
    };
    malformed.currentMoment.date = "2026-01-06";
    expect(() => assertWorldIntegrity(malformed as unknown as World)).toThrow(
      /current date.*moment/i,
    );
  });

  it("compares deterministic instants without discarding zone context", () => {
    const lexington = makeSimulationMoment({
      date: "2026-01-05",
      minuteOfDay: 9 * 60 + 10,
      timeZone: "America/New_York",
      utcOffsetMinutes: -300,
    });
    const utc = makeSimulationMoment({
      date: "2026-01-05",
      minuteOfDay: 14 * 60 + 10,
      timeZone: "Etc/UTC",
      utcOffsetMinutes: 0,
    });
    expect(simulationMinutesBetween(lexington, utc)).toBe(0);
  });

  it("round-trips exact time, agenda, work, and state histories", () => {
    const fixture = createRunDLiteFixture();
    const loaded = deserializeWorld(serializeWorld(fixture.world));
    expect(loaded).toStrictEqual(fixture.world);
    expect(loaded.schemaVersion).toBe(15);
    expect(JSON.parse(serializeWorld(loaded)).formatVersion).toBe(14);
    expect(loaded.history.scheduledActivities).toHaveLength(6);
    expect(loaded.history.workItems).toHaveLength(5);
  });

  it("preserves the local minute and timezone through whole-day advancement", () => {
    const world = createRunDLiteFixture().world;
    const advanced = advanceWorld(world, 2);
    expect(advanced.currentDate).toBe("2026-01-07");
    expect(advanced.currentMoment).toStrictEqual({
      ...world.currentMoment,
      date: "2026-01-07",
    });
    expect(advanced.actionSequence).toBe(1);
  });

  it("resolves the target-date offset while preserving local time across DST", () => {
    const fixture = createRunDLiteFixture();
    const currentMoment = makeSimulationMoment({
      date: "2026-03-07",
      minuteOfDay: 9 * 60 + 10,
      timeZone: "America/New_York",
      utcOffsetMinutes: -300,
    });
    const world: World = {
      ...fixture.world,
      currentDate: currentMoment.date,
      currentMoment,
    };
    assertWorldIntegrity(world);
    const advanced = advanceWorld(world, 1);
    expect(advanced.currentMoment).toStrictEqual({
      date: "2026-03-08",
      minuteOfDay: 9 * 60 + 10,
      timeZone: "America/New_York",
      utcOffsetMinutes: -240,
    });
    expect(
      simulationMinutesBetween(world.currentMoment, advanced.currentMoment),
    ).toBe(23 * 60);
  });

  it("adds exact elapsed minutes through both New York DST transitions", () => {
    const springStart = makeSimulationMoment({
      date: "2026-03-08",
      minuteOfDay: 90,
      timeZone: "America/New_York",
      utcOffsetMinutes: -300,
    });
    const springEnd = addSimulationMinutes(springStart, 60);
    expect(springEnd).toStrictEqual({
      date: "2026-03-08",
      minuteOfDay: 210,
      timeZone: "America/New_York",
      utcOffsetMinutes: -240,
    });
    expect(simulationMinutesBetween(springStart, springEnd)).toBe(60);

    const fallStart = makeSimulationMoment({
      date: "2026-11-01",
      minuteOfDay: 90,
      timeZone: "America/New_York",
      utcOffsetMinutes: -240,
    });
    const fallEnd = addSimulationMinutes(fallStart, 60);
    expect(fallEnd).toStrictEqual({
      date: "2026-11-01",
      minuteOfDay: 90,
      timeZone: "America/New_York",
      utcOffsetMinutes: -300,
    });
    expect(simulationMinutesBetween(fallStart, fallEnd)).toBe(60);
  });

  it("crosses midnight and resolves date-level due work exactly once", () => {
    let world = createRunDLiteFixture().world;
    world = scheduleFutureDueItem(world, {
      stableKey: "run-d-lite:test:current-date-due",
      dueAt: "2026-01-06",
      transitionKey: "custom:run-d-lite-midnight",
      entityIds: [world.jurisdictionOrder[0]!],
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: { kind: "authored", note: "D-Lite current-date test." },
    });
    const currentDateDueItem = world.history.futureDueItems.at(-1)!;
    world = scheduleFutureDueItem(world, {
      stableKey: "run-d-lite:test:midnight-due",
      dueAt: "2026-01-07",
      transitionKey: "custom:run-d-lite-midnight",
      entityIds: [world.jurisdictionOrder[0]!],
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: { kind: "authored", note: "D-Lite midnight test." },
    });
    const dueItem = world.history.futureDueItems.at(-1)!;
    const calls: string[] = [];
    const registry = createFutureTransitionHandlerRegistry([
      ["custom:run-d-lite-midnight", eventHandler(calls)],
    ]);
    const resumedMoment = addSimulationMinutes(world.currentMoment, 2_325);
    world = {
      ...world,
      currentDate: resumedMoment.date,
      currentMoment: resumedMoment,
    };
    assertWorldIntegrity(world);
    const crossed = advanceWorldMinutes(world, 10, registry);
    expect(crossed.currentMoment).toMatchObject({
      date: "2026-01-07",
      minuteOfDay: 5,
    });
    expect(
      futureDueItemStateAt(crossed, currentDateDueItem.id, {
        asOfDate: crossed.currentDate,
        historySequenceExclusive: crossed.history.nextSequence,
      })?.status,
    ).toBe("resolved");
    expect(
      futureDueItemStateAt(crossed, dueItem.id, {
        asOfDate: crossed.currentDate,
        historySequenceExclusive: crossed.history.nextSequence,
      })?.status,
    ).toBe("resolved");
    expect(calls).toStrictEqual([
      "run-d-lite:test:current-date-due",
      "run-d-lite:test:midnight-due",
    ]);
    advanceWorldMinutes(crossed, 10, registry);
    expect(calls).toStrictEqual([
      "run-d-lite:test:current-date-due",
      "run-d-lite:test:midnight-due",
    ]);
  });
});

describe("Stage 6.5 Run D-Lite canonical agenda", () => {
  it("creates deterministic activity IDs, real duration, and chronological order", () => {
    const first = createRunDLiteFixture();
    const second = createRunDLiteFixture();
    expect(first.dLite).toStrictEqual(second.dLite);
    const projection = projectRunDLite(first.world, first);
    expect(
      projection.agenda.map((entry) => entry.durationMinutes),
    ).toStrictEqual([45, 60, 20, 75, 30]);
    expect(
      projection.agenda.map((entry) => entry.state.start.minuteOfDay),
    ).toStrictEqual([570, 630, 820, 840, 930]);
  });

  it("detects overlapping fixed commitments from canonical intervals", () => {
    const fixture = createRunDLiteFixture();
    expect(() =>
      createScheduledActivity(fixture.world, {
        stableKey: "run-d-lite:test:overlapping-fixed",
        title: "Impossible fixed overlap",
        summary: "This fixture must be rejected.",
        kind: "confirmed",
        start: fixtureMoment(fixture.world, 9, 45),
        end: fixtureMoment(fixture.world, 10, 30),
        participantPersonIds: [fixture.playerPersonId],
        responsiblePersonId: fixture.playerPersonId,
        location: {
          locationKey: "lexington-legislative-office",
          label: "Legislative Office",
          jurisdictionId: fixture.roomContext.jurisdictionId,
        },
        sourceEntityIds: [fixture.officeEventId],
        flexibility: { kind: "fixed" },
        access: { kind: "office" },
      }),
    ).toThrow(/conflict/i);
  });

  it("moves a flexible block through an explicit successful action", () => {
    const fixture = createRunDLiteFixture();
    const result = rescheduleRunDFlexibleBlock(fixture.world, fixture, "valid");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({
      change: "rescheduled",
      status: "scheduled",
      start: { minuteOfDay: 660 },
      end: { minuteOfDay: 720 },
    });
    expect(result.world.currentMoment).toStrictEqual(
      fixture.world.currentMoment,
    );
    expect(result.world.actionSequence).toBe(fixture.world.actionSequence);
  });

  it("rejects a travel conflict deterministically and leaves World unchanged", () => {
    const fixture = createRunDLiteFixture();
    const valid = rescheduleRunDFlexibleBlock(fixture.world, fixture, "valid");
    if (!valid.ok) throw new Error("Expected valid fixture reschedule.");
    const before = JSON.stringify(valid.world);
    const result = rescheduleRunDFlexibleBlock(
      valid.world,
      fixture,
      "travel-conflict",
    );
    expect(result).toMatchObject({ ok: false, reason: "conflict" });
    if (result.ok) return;
    expect(result.world).toBe(valid.world);
    expect(JSON.stringify(result.world)).toBe(before);
    expect(result.conflictingActivityIds).toContain(
      fixture.dLite.travelActivityId,
    );
    expect(
      scheduledActivityState(result.world, fixture.dLite.flexibleActivityId)
        .start.minuteOfDay,
    ).toBe(660);
  });

  it("does not silently move fixed commitments", () => {
    const fixture = createRunDLiteFixture();
    const state = scheduledActivityState(
      fixture.world,
      fixture.dLite.briefingActivityId,
    );
    const result = rescheduleScheduledActivity(fixture.world, {
      stableKey: "run-d-lite:test:move-fixed",
      activityId: fixture.dLite.briefingActivityId,
      start: addSimulationMinutes(state.start, 15),
      end: addSimulationMinutes(state.end, 15),
    });
    expect(result).toMatchObject({ ok: false, reason: "fixed-commitment" });
    expect(result.world).toBe(fixture.world);
  });

  it("stops generic minute advancement at an unresolved player commitment", () => {
    const fixture = createRunDLiteFixture();
    const before = JSON.stringify(fixture.world);
    expect(
      controlledCommitmentsBlockingMinuteAdvance(fixture.world, 21),
    ).toStrictEqual([fixture.dLite.briefingActivityId]);
    const rejected = advanceWorldMinutes(fixture.world, 21);
    expect(rejected).toBe(fixture.world);
    expect(JSON.stringify(rejected)).toBe(before);

    const atBoundary = advanceWorldMinutes(fixture.world, 20);
    expect(atBoundary).not.toBe(fixture.world);
    expect(atBoundary.currentMoment.minuteOfDay).toBe(570);
    expect(advanceWorldMinutes(atBoundary, 1)).toBe(atBoundary);
  });

  it("does not perform a later commitment through earlier unresolved work or travel", () => {
    const fixture = createRunDLiteFixture();
    const blockers = controlledCommitmentsBlockingActivityPerformance(
      fixture.world,
      fixture.dLite.meetingActivityId,
    );
    expect(blockers).toContain(fixture.dLite.briefingActivityId);
    expect(blockers).toContain(fixture.dLite.flexibleActivityId);
    expect(blockers).toContain(fixture.dLite.travelActivityId);
    expect(
      performScheduledActivity(fixture.world, fixture.dLite.meetingActivityId),
    ).toBe(fixture.world);

    const currentMoment = fixtureMoment(fixture.world, 13, 30);
    const beforeTravel: World = {
      ...fixture.world,
      currentDate: currentMoment.date,
      currentMoment,
    };
    assertWorldIntegrity(beforeTravel);
    expect(
      controlledCommitmentsBlockingMinuteAdvance(beforeTravel, 15),
    ).toStrictEqual([fixture.dLite.travelActivityId]);
    expect(advanceWorldMinutes(beforeTravel, 15)).toBe(beforeTravel);
    expect(
      performScheduledActivity(beforeTravel, fixture.dLite.meetingActivityId),
    ).toBe(beforeTravel);
  });

  it("keeps Calendar, Work/Pending, and event inspection time-neutral", () => {
    const fixture = createRunDLiteFixture();
    const before = JSON.stringify(fixture.world);
    let state = createRunDUiState();
    state = runDUiReducer(state, { type: "open-calendar" });
    state = runDUiReducer(state, {
      type: "select-activity",
      activityId: fixture.dLite.briefingActivityId,
    });
    state = runDUiReducer(state, { type: "open-work" });
    expect(state.mode).toBe("work");
    expect(JSON.stringify(fixture.world)).toBe(before);
  });

  it("performs one meaningful activity and records exact chronological resolution", () => {
    const fixture = createRunDLiteFixture();
    const timing = scheduledActivityPerformanceTiming(
      fixture.world,
      fixture.dLite.briefingActivityId,
    );
    const projectedBriefing = projectRunDLite(
      fixture.world,
      fixture,
    ).agenda.find(
      (entry) => entry.activity.id === fixture.dLite.briefingActivityId,
    );
    expect(timing).toMatchObject({
      waitMinutes: 20,
      activityMinutes: 45,
      totalElapsedMinutes: 65,
      targetMoment: { minuteOfDay: 615 },
    });
    expect(projectedBriefing).toMatchObject({
      durationMinutes: 45,
      execution: {
        verb: "Attend",
        waitMinutes: 20,
        activityMinutes: 45,
        totalElapsedMinutes: 65,
        resultingMoment: { minuteOfDay: 615 },
        blockingActivityIds: [],
        canPerform: true,
      },
    });
    const result = performRunDScheduledActivity(
      fixture.world,
      fixture,
      fixture.dLite.briefingActivityId,
    );
    expect(
      simulationMinutesBetween(
        fixture.world.currentMoment,
        result.currentMoment,
      ),
    ).toBe(65);
    expect(result.currentMoment.minuteOfDay).toBe(615);
    expect(result.actionSequence).toBe(1);
    const briefingState = scheduledActivityState(
      result,
      fixture.dLite.briefingActivityId,
    );
    expect(
      simulationMinutesBetween(briefingState.start, briefingState.end),
    ).toBe(45);
    expect(briefingState.status).toBe("completed");
    const staffState = workItemState(result, fixture.dLite.staffWorkItemId);
    expect(staffState.recordedAt.minuteOfDay).toBe(600);
    expect(staffState.sequence).toBeLessThan(briefingState.sequence);
    expect(projectRunDLite(result, fixture).nextCommitment?.activity.id).toBe(
      fixture.dLite.flexibleActivityId,
    );
  });

  it("continues canonically through flexible work, travel, and a later meeting", () => {
    const fixture = createRunDLiteFixture();
    let world = delegateRunDMeetingBrief(fixture.world, fixture);

    const initialProjection = projectRunDLite(world, fixture);
    expect(
      initialProjection.agenda.find(
        (entry) => entry.activity.id === fixture.dLite.flexibleActivityId,
      )?.execution,
    ).toMatchObject({
      verb: "Work",
      canPerform: false,
      blockingActivityIds: [fixture.dLite.briefingActivityId],
    });
    const beforeBlockedMeeting = JSON.stringify(world);
    expect(
      performRunDScheduledActivity(
        world,
        fixture,
        fixture.dLite.meetingActivityId,
      ),
    ).toBe(world);
    expect(JSON.stringify(world)).toBe(beforeBlockedMeeting);

    world = performRunDScheduledActivity(
      world,
      fixture,
      fixture.dLite.briefingActivityId,
    );
    expect(world.currentMoment.minuteOfDay).toBe(615);
    expect(
      scheduledActivityState(world, fixture.dLite.briefingActivityId).status,
    ).toBe("completed");
    expect(projectRunDLite(world, fixture).nextCommitment?.activity.id).toBe(
      fixture.dLite.flexibleActivityId,
    );
    expect(workItemState(world, fixture.dLite.staffWorkItemId)).toMatchObject({
      status: "ready-for-review",
      completedEffortMinutes: 50,
      recordedAt: { minuteOfDay: 600 },
    });
    expect(
      workItemState(world, fixture.dLite.delegableWorkItemId),
    ).toMatchObject({ status: "active", completedEffortMinutes: 65 });

    const afterBriefing = JSON.stringify(world);
    expect(() =>
      performRunDScheduledActivity(
        world,
        fixture,
        fixture.dLite.briefingActivityId,
      ),
    ).toThrow(/cannot perform/i);
    expect(JSON.stringify(world)).toBe(afterBriefing);

    const flexibleExecution = projectRunDLite(world, fixture).agenda.find(
      (entry) => entry.activity.id === fixture.dLite.flexibleActivityId,
    )?.execution;
    expect(flexibleExecution).toMatchObject({
      verb: "Work",
      waitMinutes: 15,
      activityMinutes: 60,
      totalElapsedMinutes: 75,
      resultingMoment: { minuteOfDay: 690 },
      blockingActivityIds: [],
      canPerform: true,
    });
    world = performRunDScheduledActivity(
      world,
      fixture,
      fixture.dLite.flexibleActivityId,
    );
    expect(world.currentMoment.minuteOfDay).toBe(690);
    expect(
      scheduledActivityState(world, fixture.dLite.flexibleActivityId).status,
    ).toBe("completed");
    expect(projectRunDLite(world, fixture).nextCommitment?.activity.id).toBe(
      fixture.dLite.travelActivityId,
    );
    expect(
      workItemState(world, fixture.dLite.delegableWorkItemId),
    ).toMatchObject({
      status: "ready-for-review",
      completedEffortMinutes: 90,
      recordedAt: { minuteOfDay: 640 },
    });

    const beforeBlockedTravelSkip = JSON.stringify(world);
    expect(
      performRunDScheduledActivity(
        world,
        fixture,
        fixture.dLite.meetingActivityId,
      ),
    ).toBe(world);
    expect(JSON.stringify(world)).toBe(beforeBlockedTravelSkip);
    expect(
      projectRunDLite(world, fixture).agenda.find(
        (entry) => entry.activity.id === fixture.dLite.meetingActivityId,
      )?.execution,
    ).toMatchObject({
      verb: "Attend",
      blockingActivityIds: [fixture.dLite.travelActivityId],
      canPerform: false,
    });

    expect(
      projectRunDLite(world, fixture).agenda.find(
        (entry) => entry.activity.id === fixture.dLite.travelActivityId,
      )?.execution,
    ).toMatchObject({
      verb: "Travel",
      waitMinutes: 130,
      activityMinutes: 20,
      totalElapsedMinutes: 150,
      resultingMoment: { minuteOfDay: 840 },
      canPerform: true,
    });
    world = performRunDScheduledActivity(
      world,
      fixture,
      fixture.dLite.travelActivityId,
    );
    expect(world.currentMoment.minuteOfDay).toBe(840);
    expect(
      scheduledActivityState(world, fixture.dLite.travelActivityId).status,
    ).toBe("completed");
    expect(projectRunDLite(world, fixture).nextCommitment?.activity.id).toBe(
      fixture.dLite.meetingActivityId,
    );

    expect(
      projectRunDLite(world, fixture).agenda.find(
        (entry) => entry.activity.id === fixture.dLite.meetingActivityId,
      )?.execution,
    ).toMatchObject({
      verb: "Attend",
      waitMinutes: 0,
      activityMinutes: 75,
      totalElapsedMinutes: 75,
      resultingMoment: { minuteOfDay: 915 },
      canPerform: true,
    });
    world = performRunDScheduledActivity(
      world,
      fixture,
      fixture.dLite.meetingActivityId,
    );
    expect(world.currentMoment.minuteOfDay).toBe(915);
    expect(
      scheduledActivityState(world, fixture.dLite.meetingActivityId).status,
    ).toBe("completed");
    expect(projectRunDLite(world, fixture).nextCommitment?.activity.id).toBe(
      fixture.dLite.tentativeActivityId,
    );
    expect(world.actionSequence).toBe(4);
    assertWorldIntegrity(world);
  });
});

describe("Stage 6.5 Run D-Lite Work/Pending", () => {
  it("derives Needs you, Waiting on others, and Staff handling from real state", () => {
    const fixture = createRunDLiteFixture();
    const entries = projectRunDLite(fixture.world, fixture).work;
    expect(
      entries.find(
        (entry) => entry.item.id === fixture.dLite.documentWorkItemId,
      ),
    ).toMatchObject({
      group: "needs-you",
      state: { playerRequirement: "decision" },
    });
    expect(
      entries.find(
        (entry) => entry.item.id === fixture.dLite.waitingWorkItemId,
      ),
    ).toMatchObject({
      group: "waiting-on-others",
      state: {
        playerRequirement: "none",
        waitingOnPersonIds: [fixture.dLite.reedPersonId],
      },
    });
    expect(
      entries.find((entry) => entry.item.id === fixture.dLite.staffWorkItemId),
    ).toMatchObject({
      group: "staff-handling",
      state: { assignedPersonIds: [fixture.dLite.collinsPersonId] },
    });
    expect(entries.every((entry) => !("bucket" in entry.item))).toBe(true);
  });

  it("does not let waiting-on-Reed work masquerade as player-completable", () => {
    const fixture = createRunDLiteFixture();
    const before = JSON.stringify(fixture.world);
    expect(() =>
      delegateRunDMeetingBrief(fixture.world, {
        ...fixture,
        dLite: {
          ...fixture.dLite,
          delegableWorkItemId: fixture.dLite.waitingWorkItemId,
        },
      }),
    ).toThrow(/controlled-person work/i);
    expect(JSON.stringify(fixture.world)).toBe(before);
  });

  it("records a deterministic real delegation to Collins", () => {
    const fixture = createRunDLiteFixture();
    const first = delegateRunDMeetingBrief(fixture.world, fixture);
    const second = delegateRunDMeetingBrief(fixture.world, fixture);
    expect(first).toStrictEqual(second);
    expect(
      workItemState(first, fixture.dLite.delegableWorkItemId),
    ).toMatchObject({
      status: "active",
      assignedPersonIds: [fixture.dLite.collinsPersonId],
      playerRequirement: "none",
    });
    expect(
      first.history.events.filter(
        (event) => event.type === "work.item-assigned",
      ),
    ).toHaveLength(1);
  });

  it("lets staff finish in parallel without consuming the player's work interval", () => {
    const fixture = createRunDLiteFixture();
    const result = performRunDScheduledActivity(
      fixture.world,
      fixture,
      fixture.dLite.briefingActivityId,
    );
    const staffState = workItemState(result, fixture.dLite.staffWorkItemId);
    const completionEvent = result.history.events.find(
      (event) => event.id === staffState.outcomeEventId,
    );
    expect(staffState).toMatchObject({
      status: "ready-for-review",
      completedEffortMinutes: 50,
    });
    expect(
      completionEvent?.participants.map((participant) => participant.personId),
    ).toStrictEqual([fixture.dLite.collinsPersonId]);
    expect(completionEvent?.participants).not.toContainEqual(
      expect.objectContaining({ personId: fixture.playerPersonId }),
    );
    expect(
      projectRunDLite(result, fixture).work.find(
        (entry) => entry.item.id === fixture.dLite.staffWorkItemId,
      )?.group,
    ).toBe("completed-ready");
  });

  it("does not duplicate staff completion on later time advancement", () => {
    const fixture = createRunDLiteFixture();
    const completed = performRunDScheduledActivity(
      fixture.world,
      fixture,
      fixture.dLite.briefingActivityId,
    );
    const later = advanceWorldMinutes(completed, 5);
    expect(
      later.history.events.filter(
        (event) =>
          event.type === "work.item-ready-for-review" &&
          event.involvedEntityIds.includes(fixture.dLite.staffWorkItemId),
      ),
    ).toHaveLength(1);
    expect(
      later.history.workItemStates.filter(
        (state) =>
          state.workItemId === fixture.dLite.staffWorkItemId &&
          state.status === "ready-for-review",
      ),
    ).toHaveLength(1);
  });

  it("filters hidden NPC schedule and work from the player projection", () => {
    const fixture = createRunDLiteFixture();
    const projection = projectRunDLite(fixture.world, fixture);
    expect(hiddenRunDStateIsFiltered(fixture.world, fixture)).toBe(true);
    expect(projection.agenda.map((entry) => entry.activity.id)).not.toContain(
      fixture.dLite.hiddenActivityId,
    );
    expect(projection.work.map((entry) => entry.item.id)).not.toContain(
      fixture.dLite.hiddenWorkItemId,
    );
    expect(JSON.stringify(projection)).not.toContain("Undisclosed Reed note");
    expect(JSON.stringify(projection)).not.toContain("Private Reed follow-up");
  });

  it("preserves work provenance and real focus targets through transitions", () => {
    const fixture = createRunDLiteFixture();
    const delegated = delegateRunDMeetingBrief(fixture.world, fixture);
    const item = delegated.history.workItems.find(
      (candidate) => candidate.id === fixture.dLite.delegableWorkItemId,
    )!;
    expect(item.sourceEntityIds).toContain(fixture.policy.wideAlternativeId);
    expect(item.focus).toStrictEqual({
      kind: "calendar-item",
      scheduledActivityId: fixture.dLite.meetingActivityId,
    });
    expect(deserializeWorld(serializeWorld(delegated))).toStrictEqual(
      delegated,
    );
  });

  it("rejects malformed time/work relationships at integrity and load boundaries", () => {
    const fixture = createRunDLiteFixture();
    const malformed = structuredClone(fixture.world) as unknown as {
      history: {
        workItemStates: Array<{
          assignedPersonIds: EntityId[];
        }>;
      };
    };
    malformed.history.workItemStates[0]!.assignedPersonIds = [
      "person_missing" as EntityId,
    ];
    expect(() => assertWorldIntegrity(malformed as unknown as World)).toThrow(
      /missing person/i,
    );
    const overlapping = structuredClone(fixture.world) as unknown as {
      history: {
        scheduledActivityStates: Array<{
          activityId: EntityId;
          start: ReturnType<typeof fixtureMoment>;
          end: ReturnType<typeof fixtureMoment>;
        }>;
      };
    };
    const flexibleState = overlapping.history.scheduledActivityStates.findLast(
      (state) => state.activityId === fixture.dLite.flexibleActivityId,
    )!;
    flexibleState.start = fixtureMoment(fixture.world, 13, 0);
    flexibleState.end = fixtureMoment(fixture.world, 14, 0);
    expect(() => assertWorldIntegrity(overlapping as unknown as World)).toThrow(
      /overlap/i,
    );
    const envelope = JSON.parse(serializeWorld(fixture.world));
    envelope.world.history.workItems[0].focus.sourceEntityId = "policy_missing";
    expect(() => deserializeWorld(JSON.stringify(envelope))).toThrow();
  });

  it("replays identical scheduling, assignment, and time input identically", () => {
    function scenario() {
      const fixture = createRunDLiteFixture();
      const moved = rescheduleRunDFlexibleBlock(
        fixture.world,
        fixture,
        "valid",
      );
      if (!moved.ok) throw new Error("Expected valid reschedule.");
      return performRunDScheduledActivity(
        delegateRunDMeetingBrief(moved.world, fixture),
        fixture,
        fixture.dLite.briefingActivityId,
      );
    }
    expect(scenario()).toStrictEqual(scenario());
  });
});
