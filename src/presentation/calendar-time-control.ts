import {
  addDays,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
  scheduledActivityState,
  simulationMinutesBetween,
  advanceWorldMinutes,
  controlledCommitmentsBlockingMinuteAdvance,
  type EntityId,
  type SimulationMoment,
  type World,
} from "../simulation";
import {
  callOffContactMeeting,
  CONTACT_LOCATION_KEY,
} from "../simulation/people-contact";
import { interruptionHandlers } from "./interruption-policy";
import {
  arriveAtCandidateGuidance,
  projectCandidateGuidanceScene,
} from "./candidate-guidance-scene";
import { arriveAtOrdinaryMeeting } from "./ordinary-meeting-actions";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { PUBLIC_MEETING_KEY } from "../simulation/life-opportunities";
import { campaignLifeActivityForScheduledActivity } from "../simulation/campaign-life-activities";
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
import { callOffCampaignLifeAppointment } from "./scheduled-activity-choice";
import { attendChapterMeeting } from "./party-chapter-actions";
import { calendarEntryFor } from "./player-calendar";

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
    // The direct Calendar day/week controls use the same civic stop boundary.
    stopForCivicHolds: true,
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

/*
 * A chapter's open meeting is a venue activity too, but attending it also
 * records that the player was there and met the organizer, which is what the
 * chapter's follow-up and its later scenes read. Played from the Calendar it
 * used to take only the venue route, so the meeting passed and was never
 * counted as attended.
 */
function playVenueOrChapterMeeting(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const attended = attendChapterMeeting(world, personId, activityId);
  return attended !== world
    ? attended
    : performVenueActivity(world, personId, activityId);
}

/**
 * The calendar entry the player must settle before time can move on: the
 * controlled commitment that stops the clock now, or, when that is a journey
 * the calendar does not list, the event the journey leads to. Read-only.
 */
export function blockingCalendarActivityId(
  world: World,
  personId: EntityId,
): EntityId | null {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  for (const id of controlledCommitmentsBlockingMinuteAdvance(world, 1)) {
    if (calendarEntryFor(world, personId, id)) return id;
    const activity = world.history.scheduledActivities.find(
      (record) => record.id === id,
    );
    // Only an event still ahead of the player, so the calendar opens on
    // something that can still be played or declined.
    const destination = activity?.sourceEntityIds.find(
      (source) =>
        world.history.scheduledActivities.some(
          (record) => record.id === source,
        ) &&
        scheduledActivityState(world, source).status === "scheduled" &&
        calendarEntryFor(world, personId, source),
    );
    if (destination) return destination;
  }
  return null;
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
  let next: World;
  try {
    const openingMeeting =
      entry?.activity.stableKey === `${PUBLIC_MEETING_KEY}:activity` &&
      projectOrdinaryMeetingScene(world, personId)?.phase !== "active";
    const openingGuidance =
      campaignLifeActivityForScheduledActivity(world, activityId)?.form ===
        "candidate-guidance" &&
      projectCandidateGuidanceScene(world, personId)?.activityId !== activityId;
    next = openingMeeting
      ? arriveAtOrdinaryMeeting(world, personId, activityId)
      : openingGuidance
        ? arriveAtCandidateGuidance(world, personId, activityId)
        : playVenueOrChapterMeeting(world, personId, activityId);
  } catch (error) {
    // A writer that refuses (a buy the committee can no longer pay for, a
    // session that is not the week's next) says why, and nothing is written:
    // the wait before it is discarded with the refusal.
    return {
      world,
      reached: world.currentMoment,
      outcome:
        error instanceof Error
          ? error.message
          : "This event could not be played now.",
    };
  }
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
      projectOrdinaryMeetingScene(next, personId)?.phase === "active"
        ? projectOrdinaryMeetingScene(next, personId)!.caption
        : projectCandidateGuidanceScene(next, personId)?.activityId ===
            activityId
          ? projectCandidateGuidanceScene(next, personId)!.caption
          : (activityCompletionOutcome(next, personId, activityId) ??
            describeRoutineOutcome(before, next, personId)),
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
      reason:
        "This activity does not run on its own. Advance and Play stay distinct.",
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
  /*
   * A meeting two people agreed to is not an optional hold, but it can still
   * be called off: the other person is told, and it goes in their history.
   * Before this, Decline on one refused and time could not pass it
   * (New Jersey and New Hampshire playtests, 2026-09-23).
   */
  const meeting = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  if (
    meeting?.kind === "confirmed" &&
    meeting.location.locationKey === CONTACT_LOCATION_KEY &&
    world.control.kind === "person" &&
    world.control.personId === personId
  ) {
    const calledOff = callOffContactMeeting(world, { personId, activityId });
    const otherId = meeting.participantPersonIds.find((id) => id !== personId);
    const given = otherId ? world.people[otherId]?.givenName : null;
    return {
      world: calledOff,
      reached: calledOff.currentMoment,
      outcome: `You called it off${given ? `, and ${given} knows` : ""}. No time passed.`,
    };
  }
  const calledOff = callOffCampaignLifeAppointment(world, personId, activityId);
  if (calledOff !== world) {
    return {
      world: calledOff,
      reached: calledOff.currentMoment,
      outcome:
        "You called off the appointment and released its calendar hold and journey. No time passed. The record does not say the host was notified.",
    };
  }
  const next = declineVenueActivity(world, personId, activityId);
  if (next === world) {
    return {
      world,
      reached: world.currentMoment,
      outcome:
        "You can only decline something you might go to. A confirmed commitment stays until it happens or is settled.",
    };
  }
  return {
    world: next,
    reached: next.currentMoment,
    outcome: "You won't go. No time passed.",
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
