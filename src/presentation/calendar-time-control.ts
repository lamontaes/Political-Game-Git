import {
  compareSimulationMoments,
  createCampaignElectionTransitionRegistry,
  scheduledActivityState,
  simulationMinutesBetween,
  advanceWorldMinutes,
  type EntityId,
  type SimulationMoment,
  type World,
} from "../simulation";
import { passOrdinaryDays } from "./ordinary-life";
import { describeRoutineOutcome } from "./routine-outcome";
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
): CalendarTimeResult {
  const before = world;
  const next = passOrdinaryDays(world, days);
  const requestedMinutes = days * 24 * 60;
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
  const handlers = createCampaignElectionTransitionRegistry();
  const next = advanceWorldMinutes(world, minutes, handlers);
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
    outcome: describeRoutineOutcome(before, next, personId),
  };
}

export function simulateAuthorizedCalendarActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): CalendarTimeResult {
  const advanced = advanceCalendarToActivity(world, personId, activityId);
  const handlers = createCampaignElectionTransitionRegistry();
  if (handlers.routine?.isAutoResolvableActivity(advanced.world, activityId)) {
    return playCalendarActivity(advanced.world, personId, activityId);
  }
  return {
    world: advanced.world,
    reached: advanced.reached,
    outcome: `${advanced.outcome} Play attendance is still required; standing preferences did not authorize this event.`,
  };
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
