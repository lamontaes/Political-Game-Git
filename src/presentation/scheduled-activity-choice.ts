import {
  ACTIVITY_DECLINED_EVENT,
  ACTIVITY_LAPSED_EVENT,
  canPersonAccess,
  cancelScheduledActivity,
  CHOSEN_TAG,
  recordWorldEvent,
  scheduledActivityState,
  type EntityId,
  type ScheduledActivityRecord,
  type World,
} from "../simulation";

/**
 * The two different things that can happen to an optional hold.
 *
 * They used to be one. Passing ordinary time called `declineVenueActivity` to
 * get past a hold the player had never been shown, which wrote a refusal with
 * a fabricated choice of "Decline <title>" against their name. A refusal is
 * something the player does; time running out is something that happens to
 * them, and three systems downstream could not tell the difference because the
 * records were identical. See `src/simulation/scheduled-activity-answer.ts`.
 */

function releasableHold(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): ScheduledActivityRecord | null {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  if (
    !activity ||
    activity.kind !== "tentative" ||
    scheduledActivityState(world, activityId).status !== "scheduled" ||
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    !activity.participantPersonIds.includes(personId) ||
    !canPersonAccess(activity.access, personId)
  ) {
    return null;
  }
  return activity;
}

function releaseHold(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  let next = cancelScheduledActivity(world, activityId);
  for (const journey of next.history.scheduledActivities) {
    if (
      journey.kind === "travel" &&
      journey.responsiblePersonId === personId &&
      journey.sourceEntityIds.includes(activityId) &&
      scheduledActivityState(next, journey.id).status === "scheduled"
    )
      next = cancelScheduledActivity(next, journey.id);
  }
  return next;
}

/**
 * Time ran past an optional hold nobody answered.
 *
 * Not a refusal, and it says so. The player was never asked, so nothing is
 * recorded as their choice and no organizer is owed an answer they gave.
 */
export function lapseVenueActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const activity = releasableHold(world, personId, activityId);
  if (!activity) return world;
  const recorded = recordWorldEvent(world, {
    stableKey: `venue-activity:lapsed:${activityId}`,
    type: ACTIVITY_LAPSED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [personId, activityId],
    participants: [
      {
        personId,
        role: "focus:participant",
        detail: `Did not answer about ${activity.title}`,
      },
    ],
    personFactConstraints: [],
    visibility: activity.access.kind === "office" ? "limited" : "private",
    tags: ["scheduled-activity", "lapsed", "time-neutral"],
    summary: `The time for ${activity.title} passed without an answer, and its calendar hold was released.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      // No choice. This is the whole point: the player made none.
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return releaseHold(recorded, personId, activityId);
}

/** Explicitly releases an optional hold; no time passes and no work is faked. */
export function declineVenueActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const activity = releasableHold(world, personId, activityId);
  // Only the person who owes the answer can give it. A guest on somebody
  // else's hold declining it would be answering for them, which is the same
  // mistake as a lapse wearing a refusal's clothes. Time passing is not
  // subject to this: `lapseVenueActivity` releases the hold whoever owns it,
  // because nobody answered and nobody is claimed to have.
  if (
    !activity ||
    (activity.responsiblePersonId !== personId &&
      !(
        activity.responsiblePersonId === null &&
        activity.participantPersonIds.length === 1
      ))
  )
    return world;
  const recorded = recordWorldEvent(world, {
    stableKey: `venue-activity:declined:${activityId}`,
    type: ACTIVITY_DECLINED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [personId, activityId],
    participants: [
      {
        personId,
        role: "agency:participant",
        detail: `Declined ${activity.title}`,
      },
    ],
    personFactConstraints: [],
    visibility: activity.access.kind === "office" ? "limited" : "private",
    // `chosen` is what makes this a refusal rather than a record that merely
    // looks like one. Records written before the split carry no such tag and
    // read as unknown, which is the truth about them.
    tags: ["scheduled-activity", "declined", "time-neutral", CHOSEN_TAG],
    summary: `${activity.title} was declined and its calendar hold was released.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: `Decline ${activity.title}`,
      motivation: null,
      immediateReaction: null,
    },
  });
  return releaseHold(recorded, personId, activityId);
}

/**
 * Abandons a commitment the game has no way to let the player keep.
 *
 * This is a guard, not the answer to the question behind it. A committed
 * campaign session books a venue no ordinary life has an authored journey to,
 * so the calendar refuses to carry it out; every later entry then waits on it;
 * and time will not step over a confirmed commitment. The result was a life
 * with no legal move at all — measured on its first morning, in
 * `docs/playtest/committing-a-campaign-week-stops-time-2026-09-22.md`.
 *
 * Refusing to invent a journey is right and stays. What is not defensible is
 * the dead end, so a commitment the player cannot perform can now be dropped
 * on purpose, the way an optional hold already could. Whether such a session
 * should instead become performable is a separate decision and is not taken
 * here.
 *
 * The caller establishes that the activity cannot be performed; this function
 * establishes that it is the player's own scheduled commitment to drop.
 */
export function abandonUnperformableCommitment(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  if (
    !activity ||
    activity.kind === "tentative" ||
    activity.kind === "travel" ||
    scheduledActivityState(world, activityId).status !== "scheduled" ||
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    activity.responsiblePersonId !== personId ||
    !canPersonAccess(activity.access, personId)
  ) {
    return world;
  }
  const recorded = recordWorldEvent(world, {
    stableKey: `venue-activity:abandoned:${activityId}`,
    type: ACTIVITY_DECLINED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [personId, activityId],
    participants: [
      {
        personId,
        role: "agency:participant",
        detail: `Gave up on ${activity.title}`,
      },
    ],
    personFactConstraints: [],
    visibility: activity.access.kind === "office" ? "limited" : "private",
    // A choice, so it carries the chosen tag — but its own words, because what
    // happened is not the same as declining an invitation.
    tags: ["scheduled-activity", "abandoned", "time-neutral", CHOSEN_TAG],
    summary: `${activity.title} could not be carried out, and it was given up rather than kept on the calendar.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: `Give up on ${activity.title}`,
      motivation: null,
      immediateReaction: null,
    },
  });
  let next = cancelScheduledActivity(recorded, activityId);
  for (const journey of next.history.scheduledActivities) {
    if (
      journey.kind === "travel" &&
      journey.responsiblePersonId === personId &&
      journey.sourceEntityIds.includes(activityId) &&
      scheduledActivityState(next, journey.id).status === "scheduled"
    )
      next = cancelScheduledActivity(next, journey.id);
  }
  return next;
}
