import { describe, expect, it } from "vitest";
import {
  suppliedLegislativeSeat,
  endSuppliedSeat,
} from "../../tests/fixtures/supplied-legislative-seat";
import {
  addDays,
  cancelScheduledActivity,
  createScheduledActivity,
  assertWorldIntegrity,
  deserializeWorld,
  measurePosition,
  recordWorldEvent,
  serializeWorld,
  simulationMomentAtLocalTime,
  type World,
} from "../simulation";
import { standingAuthorities } from "../simulation/legislation-program-families";
import { fileDraftFromOffice } from "./legislation-docket";
import {
  authorizeLegislativeRoutinePlan,
  executeLegislativeRoutinePlan,
  type LegislativeRoutineStep,
} from "./legislative-routine-plan";
import { prepareRecordedLegislativeSitting } from "./legislative-authored-sitting";
import {
  resolveLegislativeAssignmentForMeasure,
  applyLegislativeCommand,
} from "./legislation-world";

function ordinaryBill(state = "US-AK") {
  const seat = suppliedLegislativeSeat(state, "house");
  const filed = fileDraftFromOffice(seat.world, {
    playerPersonId: seat.personId,
    scenarioKey: state === "US-AK" ? "alaska" : `institution:${seat.packId}`,
    jurisdictionId: seat.jurisdictionId,
    familyKey: "appropriations",
    variantKey: "single-programme",
    authorityKey: standingAuthorities().find(
      (record) => record.authorizesSpending,
    )!.authorityKey,
  });
  const input = {
    playerPersonId: seat.personId,
    measureId: filed.bill.measureId,
  };
  return { ...seat, ...filed, input };
}

describe("explicit non-voting legislative routine plans", () => {
  it("refuses altered plan definitions and colliding receipt identities without acting", () => {
    const bill = ordinaryBill();
    const plan = authorizeLegislativeRoutinePlan(bill.world, {
      ...bill.input,
      steps: ["request-referral"],
    });
    const admitted = plan.world.history.events.find(
      (event) => event.id === plan.planId,
    )!;
    const altered: World = {
      ...plan.world,
      history: {
        ...plan.world.history,
        events: plan.world.history.events.map((event) =>
          event.id === plan.planId
            ? {
                ...event,
                context: {
                  ...event.context,
                  choice: JSON.stringify({
                    ...JSON.parse(event.context.choice!),
                    steps: ["request-committee-hearing"],
                  }),
                },
              }
            : event,
        ),
      },
    };
    const collision = recordWorldEvent(plan.world, {
      stableKey: `legislative-routine-plan:${plan.planId}:step:0`,
      type: "legislation.routine-plan-unrelated",
      occurredAt: plan.world.currentDate,
      recordedAt: plan.world.currentDate,
      jurisdictionId: admitted.jurisdictionId,
      involvedEntityIds: [bill.personId, bill.input.measureId],
      participants: admitted.participants,
      personFactConstraints: [],
      visibility: "private",
      tags: ["legislation"],
      summary: "Supplied unrelated receipt identity control.",
      context: { ...admitted.context, choice: null },
    });
    for (const current of [altered, collision]) {
      const before = serializeWorld(current);
      const result = executeLegislativeRoutinePlan(current, plan.planId);
      expect(result.status).toBe("refused");
      expect(result.world).toBe(current);
      expect(serializeWorld(result.world)).toBe(before);
    }
  });

  it("runs available routine stages, stops for a meaningful vote and resumes after reload", () => {
    const bill = ordinaryBill();
    const admitted = prepareRecordedLegislativeSitting(bill.world, {
      ...bill.input,
      playerBallot: "yea",
    });
    const authorized = authorizeLegislativeRoutinePlan(admitted, {
      ...bill.input,
      steps: [
        "request-referral",
        "request-committee-hearing",
        "request-calendar-placement",
      ],
    });
    expect(measurePosition(authorized.world, bill.input.measureId).phase).toBe(
      "awaiting-referral",
    );
    expect(authorized.world.currentMoment).toEqual(admitted.currentMoment);
    expect(
      authorizeLegislativeRoutinePlan(authorized.world, {
        ...bill.input,
        steps: [
          "request-referral",
          "request-committee-hearing",
          "request-calendar-placement",
        ],
      }).world,
    ).toBe(authorized.world);
    const ran = executeLegislativeRoutinePlan(
      authorized.world,
      authorized.planId,
    );
    expect(ran.status).toBe("decision-required");
    expect(ran.completedSteps).toEqual([
      "request-referral",
      "request-committee-hearing",
    ]);
    expect(measurePosition(ran.world, bill.input.measureId).hearingHeld).toBe(
      true,
    );
    expect(ran.world.history.legislativeVotes).toEqual(
      authorized.world.history.legislativeVotes,
    );
    const entry = resolveLegislativeAssignmentForMeasure(ran.world, bill.input);
    if (entry.kind !== "available") throw new Error(entry.reason);
    // The separately explicit authored ballot/command, never a plan preference.
    const voted = applyLegislativeCommand(ran.world, entry.assignment, {
      kind: "take-step",
      step: "move-committee-report",
    }).world;
    const restored = deserializeWorld(serializeWorld(voted));
    const resumed = executeLegislativeRoutinePlan(restored, authorized.planId);
    expect(resumed.status).toBe("completed");
    expect(measurePosition(resumed.world, bill.input.measureId).phase).toBe(
      "on-floor",
    );
    expect(resumed.world.history.legislativeVotes).toEqual(
      restored.history.legislativeVotes,
    );
    expect(
      executeLegislativeRoutinePlan(resumed.world, authorized.planId).world,
    ).toBe(resumed.world);
    expect(resumed.world.history.decisionTraces).toEqual(
      admitted.history.decisionTraces,
    );
    assertWorldIntegrity(resumed.world);
  });

  it("refuses changed exact text or ended office before changing any state", () => {
    const bill = ordinaryBill();
    const plan = authorizeLegislativeRoutinePlan(bill.world, {
      ...bill.input,
      steps: ["request-referral"],
    });
    const changed: World = {
      ...plan.world,
      history: {
        ...plan.world.history,
        legislativeProvisions: plan.world.history.legislativeProvisions!.map(
          (record) =>
            record.measureId === bill.input.measureId
              ? {
                  ...record,
                  text: record.text + " Supplied changed-text control.",
                }
              : record,
        ),
      },
    };
    for (const current of [changed, endSuppliedSeat(plan.world)]) {
      const before = serializeWorld(current);
      const result = executeLegislativeRoutinePlan(current, plan.planId);
      expect(result.status).toBe("refused");
      expect(result.world).toBe(current);
      expect(serializeWorld(current)).toBe(before);
    }
  });

  it("never turns a routine preference into a vote or invents an unsupported committee", () => {
    const bill = ordinaryBill("US-IL");
    expect(() =>
      authorizeLegislativeRoutinePlan(bill.world, {
        ...bill.input,
        steps: ["move-floor-vote" as LegislativeRoutineStep],
      }),
    ).toThrow(/cannot supply a vote/);
    const plan = authorizeLegislativeRoutinePlan(bill.world, {
      ...bill.input,
      steps: ["request-referral"],
    });
    const before = serializeWorld(plan.world);
    const result = executeLegislativeRoutinePlan(plan.world, plan.planId);
    expect(result.status).toBe("refused");
    expect(result.reason).toMatch(/committee identity/);
    expect(serializeWorld(result.world)).toBe(before);
    expect(result.world.history.legislativeVotes).toEqual(
      plan.world.history.legislativeVotes,
    );
  });

  it("keeps an interrupted hearing's cursor pending and resumes the same due item once", () => {
    const bill = ordinaryBill();
    const start = simulationMomentAtLocalTime({
      ...bill.world.currentMoment,
      date: addDays(bill.world.currentDate, 1),
      minuteOfDay: 600,
    });
    const end = simulationMomentAtLocalTime({ ...start, minuteOfDay: 660 });
    const booked = createScheduledActivity(bill.world, {
      stableKey: "routine-plan:confirmed-care",
      title: "Care appointment",
      summary: "Explicit commitment-boundary fixture.",
      kind: "confirmed",
      start,
      end,
      participantPersonIds: [bill.personId],
      responsiblePersonId: bill.personId,
      location: {
        locationKey: "routine-plan:care",
        label: "Appointment",
        jurisdictionId: null,
      },
      sourceEntityIds: [bill.personId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [bill.personId] },
    });
    const activityId = booked.history.scheduledActivities.at(-1)!.id;
    const plan = authorizeLegislativeRoutinePlan(booked, {
      ...bill.input,
      steps: ["request-referral", "request-committee-hearing"],
    });
    const stopped = executeLegislativeRoutinePlan(plan.world, plan.planId);
    expect(stopped.status).toBe("clock-stopped");
    expect(stopped.completedSteps).toEqual(["request-referral"]);
    expect(stopped.world.currentMoment).toEqual(start);
    const hearing = stopped.world.history.futureDueItems.find(
      (item) => item.transitionKey === "legislation:committee-hearing",
    )!;
    const loaded = deserializeWorld(serializeWorld(stopped.world));
    const resumed = executeLegislativeRoutinePlan(
      cancelScheduledActivity(loaded, activityId),
      plan.planId,
    );
    expect(resumed.status).toBe("completed");
    expect(
      resumed.world.history.futureDueItems
        .filter((item) => item.transitionKey === hearing.transitionKey)
        .map((item) => item.id),
    ).toEqual([hearing.id]);
    expect(
      executeLegislativeRoutinePlan(resumed.world, plan.planId).world,
    ).toBe(resumed.world);
    assertWorldIntegrity(resumed.world);
  });
});
