import { expect, it } from "vitest";
import { seatedChamberMember } from "../../tests/fixtures/seated-chamber-member";
import {
  addDays,
  availableMeasureSteps,
  cancelScheduledActivity,
  createScheduledActivity,
  daysBetween,
  deserializeWorld,
  measurePosition,
  scheduledActivityState,
  serializeWorld,
  simulationMomentAtLocalTime,
} from "../simulation";
import { legislativeRulePackForWorld } from "../simulation/legislative-procedure-world";
import { fileDraftFromOffice } from "./legislation-docket";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import { regularSessionActionRefusal } from "./legislative-session-window";
import { passOrdinaryDays } from "./ordinary-life";

it("names a protected commitment, reports a repeated wait truthfully, and resumes after resolution and reload", () => {
  // A supplied election fixture isolates the wait bridge, not campaign proof.
  const seat = seatedChamberMember("KY");
  const entry = resolveLegislativeFilingEntry(seat.world, seat.personId);
  if (entry.kind !== "available") throw new Error(entry.reason);
  const pack = legislativeRulePackForWorld(
    seat.world,
    entry.seat.legislativeRulePackId,
  );
  let sessionDate = seat.world.currentDate;
  for (
    let day = 0;
    day < 370 && regularSessionActionRefusal(pack, sessionDate);
    day++
  )
    sessionDate = addDays(sessionDate, 1);
  expect(regularSessionActionRefusal(pack, sessionDate)).toBeNull();
  const inSession =
    sessionDate > seat.world.currentDate
      ? passOrdinaryDays(
          seat.world,
          daysBetween(seat.world.currentDate, sessionDate),
        )
      : seat.world;
  const filed = fileDraftFromOffice(inSession, {
    playerPersonId: seat.personId,
    scenarioKey: entry.scenarioKey,
    jurisdictionId: entry.jurisdictionId,
    familyKey: "broadband-access",
    variantKey: "unserved-buildout",
  });
  const resolved = resolveLegislativeAssignmentForMeasure(filed.world, {
    measureId: filed.bill.measureId,
    playerPersonId: seat.personId,
  });
  if (resolved.kind !== "available") throw new Error(resolved.reason);
  const { assignment } = resolved;
  let world = filed.world;
  let step = availableMeasureSteps(world, assignment.measureId)[0]!;
  for (
    let turn = 0;
    turn < 8 && !institutionOwnsStep(world, assignment, step);
    turn++
  ) {
    world = applyLegislativeCommand(world, assignment, {
      kind: "take-step",
      step,
    }).world;
    step = availableMeasureSteps(world, assignment.measureId).find(
      (key) => key !== "offer-amendment",
    )!;
  }
  expect(institutionOwnsStep(world, assignment, step)).toBe(true);
  const moment = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      ...world.currentMoment,
      date: addDays(world.currentDate, 1),
      minuteOfDay,
    });
  const start = moment(600);
  const booked = createScheduledActivity(world, {
    stableKey: "legislative-wait:appointment",
    title: "Care appointment",
    summary: "Explicit confirmed appointment for the interruption regression.",
    kind: "confirmed",
    start,
    end: moment(660),
    participantPersonIds: [seat.personId],
    responsiblePersonId: seat.personId,
    location: {
      locationKey: "legislative-wait:care",
      label: "Appointment",
      jurisdictionId: null,
    },
    sourceEntityIds: [seat.personId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [seat.personId] },
  });
  const activityId = booked.history.scheduledActivities.at(-1)!.id;
  const command = { kind: "await-institution", step } as const;
  const stopped = applyLegislativeCommand(booked, assignment, command);
  expect(stopped.world.currentMoment).toEqual(start);
  // The stop names what stopped the clock, in the words the routine outcome
  // uses for every interrupted wait.
  expect(stopped.message).toContain("Care appointment comes first.");
  expect(measurePosition(stopped.world, assignment.measureId)).toEqual(
    measurePosition(booked, assignment.measureId),
  );
  const reloaded = deserializeWorld(serializeWorld(stopped.world));
  const repeated = applyLegislativeCommand(reloaded, assignment, command);
  expect(repeated.world.currentMoment).toEqual(start);
  expect(repeated.message).toContain("No time passed.");
  expect(repeated.message).not.toContain("Time passed.");
  expect(scheduledActivityState(repeated.world, activityId).status).toBe(
    "scheduled",
  );
  const resolvedWorld = cancelScheduledActivity(repeated.world, activityId);
  const resumed = applyLegislativeCommand(resolvedWorld, assignment, command);
  expect(resumed.world.currentDate > repeated.world.currentDate).toBe(true);
  // This institutional act schedules a hearing; holding it is a later act.
  const hearing = resumed.world.history.futureDueItems.find(
    (item) =>
      item.entityIds.includes(assignment.measureId) &&
      item.transitionKey === "legislation:committee-hearing",
  );
  expect(hearing).toBeDefined();
  expect(
    repeated.world.history.futureDueItems.some(
      (item) => item.id === hearing!.id,
    ),
  ).toBe(false);
  expect(resumed.message).not.toContain("comes first.");
  const hearingHeld = applyLegislativeCommand(
    resumed.world,
    assignment,
    command,
  );
  expect(measurePosition(hearingHeld.world, assignment.measureId)).not.toEqual(
    measurePosition(repeated.world, assignment.measureId),
  );
});
