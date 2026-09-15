import { describe, expect, it } from "vitest";
import {
  addDays,
  cancelScheduledActivity,
  createScheduledActivity,
  authoredScenarioSeatCount,
  legislativeBlueprint,
  personName,
  seatBodyForPack,
  deserializeWorld,
  measurePosition,
  serializeWorld,
  simulationMomentAtLocalTime,
} from "../simulation";
import type { World } from "../simulation";
import {
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "../simulation/future-transitions";
import { applyLegislativeStep } from "./legislation-session";
import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import { fileDraftFromOffice } from "./legislation-docket";
import { standingAuthorities } from "../simulation/legislation-program-families";

function suppliedProcedure(
  state = "US-AK",
  scenarioKey = "alaska",
  chamberKey = "house",
) {
  const seat = suppliedLegislativeSeat(state, chamberKey);
  const filed = fileDraftFromOffice(seat.world, {
    playerPersonId: seat.personId,
    scenarioKey,
    jurisdictionId: seat.jurisdictionId,
    familyKey: "appropriations",
    variantKey: "single-programme",
    authorityKey: standingAuthorities().find(
      (entry) => entry.authorizesSpending,
    )!.authorityKey,
  });
  const source = legislativeBlueprint(scenarioKey);
  return {
    ...source,
    world: filed.world,
    measureId: filed.bill.measureId,
    committeeMemberCount: null,
    bodies: source.pack.chambers.map((chamber) =>
      seatBodyForPack(
        chamber.chamberKey,
        chamber.name,
        authoredScenarioSeatCount(source.pack, chamber.chamberKey),
        chamber.chamberKey === chamberKey
          ? [
              {
                personId: seat.personId,
                name: personName(filed.world.people[seat.personId]!),
              },
            ]
          : [],
        source.nonpartisan,
      ),
    ),
  };
}

function appointment(world: World, days: number) {
  if (world.control.kind !== "person")
    throw new Error("Person control required.");
  const personId = world.control.personId;
  const moment = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      ...world.currentMoment,
      date: addDays(world.currentDate, days),
      minuteOfDay,
    });
  const next = createScheduledActivity(world, {
    stableKey: "legislative-clock:care-appointment",
    title: "Care appointment",
    summary: "A confirmed appointment used to prove the shared clock boundary.",
    kind: "confirmed",
    start: moment(600),
    end: moment(660),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "legislative-clock:care",
      label: "Appointment",
      jurisdictionId: null,
    },
    sourceEntityIds: [personId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  return {
    world: next,
    start: moment(600),
    activityId: next.history.scheduledActivities.at(-1)!.id,
  };
}

describe("legislative waits use the shared protected ordinary clock", () => {
  it("consumes another existing canonical due family instead of dropping its handler", () => {
    const fixture = suppliedProcedure();
    let world = applyLegislativeStep(
      fixture,
      fixture.world,
      "request-referral",
    ).world;
    if (world.control.kind !== "person")
      throw new Error("Person control required.");
    // An intentionally incomplete diagnostic callback must be blocked by its
    // existing handler. No political or personal decision evaluator is invoked.
    world = scheduleFutureDueItem(world, {
      stableKey: "legislative-clock:diagnostic-callback",
      dueAt: addDays(world.currentDate, 3),
      transitionKey: "life:callback",
      entityIds: [world.control.personId],
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Incomplete diagnostic callback fixture; no decision evaluation.",
      },
    });
    const callbackId = world.history.futureDueItems.at(-1)!.id;
    const traces = world.history.decisionTraces;
    const result = applyLegislativeStep(
      fixture,
      world,
      "request-committee-hearing",
    );
    expect(measurePosition(result.world, fixture.measureId).hearingHeld).toBe(
      true,
    );
    expect(
      futureDueItemStateAt(result.world, callbackId, {
        asOfDate: result.world.currentDate,
        historySequenceExclusive: result.world.history.nextSequence,
      })?.status,
    ).toBe("blocked");
    expect(result.world.history.decisionTraces).toEqual(traces);
    expect(deserializeWorld(serializeWorld(result.world)).currentDate).toBe(
      result.world.currentDate,
    );
  });

  it("stops at a confirmed appointment and resumes the same pending hearing after reload", () => {
    const fixture = suppliedProcedure();
    const referred = applyLegislativeStep(
      fixture,
      fixture.world,
      "request-referral",
    ).world;
    const booked = appointment(referred, 2);
    const stopped = applyLegislativeStep(
      fixture,
      booked.world,
      "request-committee-hearing",
    );
    expect(stopped.world.currentMoment).toEqual(booked.start);
    expect(measurePosition(stopped.world, fixture.measureId).hearingHeld).toBe(
      false,
    );
    expect(stopped.message).toMatch(/remains scheduled/);
    const hearing = stopped.world.history.futureDueItems.find(
      (item) => item.transitionKey === "legislation:committee-hearing",
    )!;
    const loaded = deserializeWorld(serializeWorld(stopped.world));
    const cancelled = cancelScheduledActivity(loaded, booked.activityId);
    const resumed = applyLegislativeStep(
      fixture,
      cancelled,
      "request-committee-hearing",
    );
    expect(measurePosition(resumed.world, fixture.measureId).hearingHeld).toBe(
      true,
    );
    expect(resumed.world.currentDate).toBe(hearing.dueAt);
    expect(
      resumed.world.history.futureDueItems.filter(
        (item) => item.transitionKey === hearing.transitionKey,
      ),
    ).toHaveLength(1);
  });

  it("does not claim a later floor day was reached when a commitment interrupts the wait", () => {
    const fixture = suppliedProcedure("US-NE", "nebraska", "legislature");
    let world = fixture.world;
    for (const action of [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
    ] as const) {
      world = applyLegislativeStep(fixture, world, action).world;
    }
    const until = measurePosition(
      world,
      fixture.measureId,
    ).earliestNextFloorDate!;
    const booked = appointment(world, 0);
    const stopped = applyLegislativeStep(
      fixture,
      booked.world,
      "await-next-legislative-day",
    );
    expect(stopped.world.currentMoment).toEqual(booked.start);
    expect(stopped.world.currentDate < until).toBe(true);
    expect(stopped.message).toMatch(/still waiting/);
  });
});
