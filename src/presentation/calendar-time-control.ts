import {
  addDays,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
  scheduledActivityState,
  simulationMinutesBetween,
  advanceWorldMinutes,
  type EntityId,
  type SimulationMoment,
  type World,
} from "../simulation";
import { interruptionHandlers } from "./interruption-policy";
import { ORDINARY_DAY_START_MINUTE, passOrdinaryDays } from "./ordinary-life";
import { describeRoutineOutcome } from "./routine-outcome";
import {
  DEFAULT_INTERRUPTIONS,
  type InterruptionPreferences,
} from "./shell-navigation";
import {
  declineVenueActivity,
  performVenueActivity,
  venueActivities,
} from "./venue-activity";

/**
 * Calendar day/week/advance-to-event, using the existing advance/interrupt
 * contract. Not a second clock.
 */

export interface CalendarTimeResult {
  readonly world: World;
  readonly reached: SimulationMoment;
  readonly outcome: string;
}

export function simulateCalendarDays(
  world: World,
  personId: EntityId,
  days: 1 | 7,
  interruptions: InterruptionPreferences = DEFAULT_INTERRUPTIONS,
): CalendarTimeResult {
  const before = world;
  const next = passOrdinaryDays(world, days, {
    handlers: interruptionHandlers(interruptions),
    stopForTentativeHolds: interruptions.stopForTentativeHolds,
  });
  // The canonical day skip ends at the requested morning, not 24 hours
  // from the current time. Report that same target, including offset changes.
  const target = simulationMomentAtLocalTime({
    date: addDays(before.currentDate, days),
    minuteOfDay: ORDINARY_DAY_START_MINUTE,
    timeZone: before.currentMoment.timeZone,
    preferredUtcOffsetMinutes: before.currentMoment.utcOffsetMinutes,
  });
  const requestedMinutes = simulationMinutesBetween(
    before.currentMoment,
    target,
  );
  return {
    world: next,
    reached: next.currentMoment,
    outcome: describeRoutineOutcome(before, next, personId, requestedMinutes),
  };
}

export function advanceCalendarToActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  interruptions: InterruptionPreferences = DEFAULT_INTERRUPTIONS,
): CalendarTimeResult {
  const state = scheduledActivityState(world, activityId);
  const before = world;
  if (compareSimulationMoments(world.currentMoment, state.start) >= 0) {
    return {
      world,
      reached: world.currentMoment,
      outcome: `Already at ${world.currentDate}. The selected event does not start later than now.`,
    };
  }
  const minutes = simulationMinutesBetween(world.currentMoment, state.start);
  const next = advanceWorldMinutes(
    world,
    minutes,
    interruptionHandlers(interruptions),
  );
  return {
    world: next,
    reached: next.currentMoment,
    outcome: describeRoutineOutcome(before, next, personId, minutes),
  };
}

export function playCalendarActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): CalendarTimeResult {
  const before = world;
  const entry = venueActivities(world, personId).find(
    (candidate) => candidate.activity.id === activityId,
  );
  if (entry?.refusal) {
    return {
      world,
      reached: world.currentMoment,
      outcome: entry.refusal,
    };
  }
  const next = performVenueActivity(world, personId, activityId);
  if (next === world) {
    return {
      world,
      reached: world.currentMoment,
      outcome:
        "This event could not be played now. Simulation and decline stay distinct from play.",
    };
  }
  return {
    world: next,
    reached: next.currentMoment,
    outcome:
      activityCompletionOutcome(next, personId, activityId) ??
      describeRoutineOutcome(before, next, personId),
  };
}

export function authorizeCalendarSimulation(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  interruptions: InterruptionPreferences = DEFAULT_INTERRUPTIONS,
): { readonly authorized: boolean; readonly reason: string } {
  const activity = world.history.scheduledActivities.find(
    (record) => record.id === activityId,
  );
  if (!activity) {
    return {
      authorized: false,
      reason: "That event is not on the recorded calendar.",
    };
  }
  if (!activity.participantPersonIds.includes(personId)) {
    return {
      authorized: false,
      reason:
        "You are not a participant. Simulation does not invent attendance.",
    };
  }
  const venue = venueActivities(world, personId).find(
    (candidate) => candidate.activity.id === activityId,
  );
  if (!venue) {
    return {
      authorized: false,
      reason:
        "This event is not a supported activity to simulate in play. Advance and Play stay distinct.",
    };
  }
  if (venue.refusal) {
    return { authorized: false, reason: venue.refusal };
  }
  const handlers = interruptionHandlers(interruptions);
  if (!handlers.routine?.isAutoResolvableActivity(world, activityId)) {
    return {
      authorized: false,
      reason: interruptions.stopForWorkShifts
        ? "Your interruption preferences ask to stop for work shifts, so attendance is not simulated. Play it, or change the preference."
        : "Standing preferences did not authorize simulated attendance. Advance and Play stay distinct.",
    };
  }
  return {
    authorized: true,
    reason: "Authorized to simulate attendance.",
  };
}

export function simulateAuthorizedCalendarActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  interruptions: InterruptionPreferences = DEFAULT_INTERRUPTIONS,
): CalendarTimeResult {
  const gate = authorizeCalendarSimulation(
    world,
    personId,
    activityId,
    interruptions,
  );
  if (!gate.authorized) {
    return {
      world,
      reached: world.currentMoment,
      outcome: gate.reason,
    };
  }
  return playCalendarActivity(world, personId, activityId);
}

export function declineCalendarActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): CalendarTimeResult {
  const next = declineVenueActivity(world, personId, activityId);
  if (next === world) {
    return {
      world,
      reached: world.currentMoment,
      outcome:
        "Decline applies to a tentative hold you own. Confirmed commitments stay until they are played or otherwise resolved.",
    };
  }
  return {
    world: next,
    reached: next.currentMoment,
    outcome: "The tentative hold was released. No time passed.",
  };
}

export function activityCompletionOutcome(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): string | null {
  const activity = world.history.scheduledActivities.find(
    (item) => item.id === activityId,
  );
  if (!activity || !activity.participantPersonIds.includes(personId))
    return null;
  if (scheduledActivityState(world, activityId).status !== "completed")
    return null;
  return `You completed ${activity.title} at ${activity.location.label}.`;
}
