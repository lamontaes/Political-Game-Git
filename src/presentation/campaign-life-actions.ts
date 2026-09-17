import {
  acceptCampaignLifeActivity,
  advanceWorldMinutes,
  commitCampaignWeek,
  compareSimulationMoments,
  controlledCommitmentsBlockingActivityPerformance,
  performCampaignWeekSession,
  performScheduledActivity,
  projectCampaignLifeActivities,
  recordCampaignLifeAttendance,
  releaseCampaignWeekSession,
  requestCampaignLifeActivity,
  runCondensedCampaignWeek,
  scheduledActivityState,
  simulationMinutesBetween,
  type CampaignLifeActivityView,
  type CampaignLifeAttendance,
  type CampaignLifeForm,
  type CommitCampaignWeekInput,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { declineVenueActivity } from "./scheduled-activity-choice";
import { performVenueActivity, venueActivities } from "./venue-activity";

/**
 * The player's party and campaign choices, as World writers for the surfaces.
 *
 * Each returns a World or throws one plain sentence. A writer that returns the
 * very same World means nothing happened — usually because something already
 * on the calendar comes first — and `partyWorkBlockedReason` says why.
 */

const NOTHING_TO_DO = "That activity is no longer waiting on you.";

function lifeView(
  world: World,
  personId: EntityId,
  lifeActivityId: EntityId,
): CampaignLifeActivityView {
  const view = projectCampaignLifeActivities(world, personId).find(
    (candidate) => candidate.lifeActivityId === lifeActivityId,
  );
  if (!view) throw new Error("That activity is not on your calendar.");
  return view;
}

export function acceptPartyWork(
  world: World,
  personId: EntityId,
  lifeActivityId: EntityId,
): World {
  const view = lifeView(world, personId, lifeActivityId);
  if (view.state !== "offered") throw new Error(NOTHING_TO_DO);
  const next = acceptCampaignLifeActivity(world, personId, lifeActivityId);
  if (next === world) {
    throw new Error("It is too late to say yes to that now.");
  }
  return next;
}

export function declinePartyWork(
  world: World,
  personId: EntityId,
  lifeActivityId: EntityId,
): World {
  const view = lifeView(world, personId, lifeActivityId);
  if (view.state !== "offered") throw new Error(NOTHING_TO_DO);
  const next = declineVenueActivity(world, personId, view.scheduledActivityId);
  if (next === world) throw new Error("That can no longer be declined.");
  return next;
}

/**
 * Why going (or taking the shift) cannot happen right now, or null. Uses the
 * ordinary venue refusal for in-person work, and the same earlier-commitment
 * rule for a phone shift worked from home.
 */
export function partyWorkBlockedReason(
  world: World,
  personId: EntityId,
  lifeActivityId: EntityId,
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): string | null {
  const view = lifeView(world, personId, lifeActivityId);
  if (view.state === "completed") return null;
  if (view.state !== "accepted" && view.state !== "offered")
    return NOTHING_TO_DO;
  if (view.presence === "in-person") {
    const entry = venueActivities(world, personId, handlers).find(
      ({ activity }) => activity.id === view.scheduledActivityId,
    );
    return entry
      ? entry.refusal
      : "That activity cannot be reached from here right now.";
  }
  return remoteBlockers(world, view.scheduledActivityId, handlers).length > 0
    ? "An earlier commitment must be resolved first."
    : null;
}

function remoteBlockers(
  world: World,
  holdId: EntityId,
  handlers: FutureTransitionHandlerRegistry,
): readonly EntityId[] {
  return controlledCommitmentsBlockingActivityPerformance(world, holdId).filter(
    (id) => !handlers.routine?.isAutoResolvableActivity(world, id),
  );
}

/** A phone shift from home: wait for it, work it, then record what happened. */
function takeRemoteShift(
  world: World,
  personId: EntityId,
  holdId: EntityId,
  attendance: CampaignLifeAttendance,
  handlers: FutureTransitionHandlerRegistry,
): World {
  if (remoteBlockers(world, holdId, handlers).length > 0) return world;
  const start = scheduledActivityState(world, holdId).start;
  const waitMinutes = simulationMinutesBetween(world.currentMoment, start);
  const waited =
    waitMinutes > 0 ? advanceWorldMinutes(world, waitMinutes, handlers) : world;
  // Something legitimately stopped the clock on the way: keep what happened.
  if (compareSimulationMoments(waited.currentMoment, start) < 0) return waited;
  if (scheduledActivityState(waited, holdId).status !== "scheduled")
    return waited;
  const worked = performScheduledActivity(waited, holdId, handlers);
  if (scheduledActivityState(worked, holdId).status !== "completed")
    return worked;
  return recordCampaignLifeAttendance(worked, personId, holdId, attendance);
}

/**
 * Goes to (or works) an accepted activity and records what came of it.
 *
 * In person, this is the ordinary venue action with the domain hook; from
 * home, the calendar hold itself. Returns the same World when an earlier
 * commitment comes first. A journey a real event interrupts returns the World
 * as far as it got, never a false arrival. When the calendar already passed
 * through the activity, only what happened is recorded.
 */
export function attendPartyWork(
  world: World,
  personId: EntityId,
  lifeActivityId: EntityId,
  attendance: CampaignLifeAttendance,
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): World {
  const view = lifeView(world, personId, lifeActivityId);
  if (view.state === "completed") {
    if (view.outcome) throw new Error("What happened there is already known.");
    return recordCampaignLifeAttendance(
      world,
      personId,
      view.scheduledActivityId,
      attendance,
    );
  }
  if (view.state !== "accepted") {
    throw new Error(
      view.state === "offered" ? "Say you will do it first." : NOTHING_TO_DO,
    );
  }
  if (view.presence === "remote") {
    return takeRemoteShift(
      world,
      personId,
      view.scheduledActivityId,
      attendance,
      handlers,
    );
  }
  return performVenueActivity(
    world,
    personId,
    view.scheduledActivityId,
    handlers,
    { attendance },
  );
}

export function requestPartyWork(
  world: World,
  personId: EntityId,
  form: CampaignLifeForm,
  hostOrganizationId: EntityId,
): World {
  return requestCampaignLifeActivity(world, personId, {
    form,
    hostOrganizationId,
  });
}

/* -------------------------------------------------------------------------- */
/* The week                                                                   */
/* -------------------------------------------------------------------------- */

export function commitWeek(
  world: World,
  personId: EntityId,
  input: CommitCampaignWeekInput,
): World {
  return commitCampaignWeek(world, personId, input);
}

/** Same World back means an earlier commitment comes first. */
export function doWeekSession(
  world: World,
  personId: EntityId,
  actionId: EntityId,
): World {
  return performCampaignWeekSession(world, personId, actionId);
}

export function letWeekSessionGo(
  world: World,
  personId: EntityId,
  actionId: EntityId,
): World {
  return releaseCampaignWeekSession(world, personId, actionId);
}

/** Same outcomes as doing each session in turn; stops at the first blocked. */
export function runWeekCondensed(
  world: World,
  personId: EntityId,
  planId: EntityId,
): World {
  return runCondensedCampaignWeek(world, personId, planId);
}
