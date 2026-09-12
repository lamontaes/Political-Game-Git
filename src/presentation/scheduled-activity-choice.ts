import {
  canPersonAccess,
  cancelScheduledActivity,
  recordWorldEvent,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";

/** Explicitly releases an optional hold; no time passes and no work is faked. */
export function declineVenueActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
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
  )
    return world;
  const recorded = recordWorldEvent(world, {
    stableKey: `venue-activity:declined:${activityId}`,
    type: "life.scheduled-activity-declined",
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
    tags: ["scheduled-activity", "declined", "time-neutral"],
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
  return cancelScheduledActivity(recorded, activityId);
}
