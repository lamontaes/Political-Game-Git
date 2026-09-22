import {
  cancelScheduledActivity,
  recordWorldEvent,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";
import { meetingHomeRoute, meetingDepartureRoute } from "./meeting-home-route";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { travelToPlace } from "./place-travel";

/** Same real endpoint/duration disclosure without prospective cancellation. */
export function ordinaryMeetingLeaveOffer(
  world: World,
  personId: EntityId,
  activityId: EntityId,
) {
  const scene = projectOrdinaryMeetingScene(world, personId);
  if (scene?.phase !== "active" || scene.activityId !== activityId)
    return {
      kind: "unavailable" as const,
      reason: "You are not attending this meeting.",
    };
  return meetingDepartureRoute(world, personId);
}

/** An explicit alternative to staying through the meeting. Cancelled activity
 * carries no completion credit. A blocked return commits none of this action. */
export function leaveOrdinaryMeeting(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  const scene = projectOrdinaryMeetingScene(world, personId);
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    scene?.phase !== "active" ||
    scene.activityId !== activityId
  )
    return world;
  const cancelled = cancelScheduledActivity(world, activityId);
  if (meetingHomeRoute(cancelled, personId).kind !== "available") return world;
  const departed = recordWorldEvent(cancelled, {
    stableKey: `ordinary-meeting:left:${activityId}:${scene.eventId}`,
    type: "civic.meeting-left",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: scene.location.jurisdictionId,
    involvedEntityIds: [personId, activityId],
    participants: [
      {
        personId,
        role: "agency:actor",
        detail: "Chose to leave without staying through the meeting",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `entry:${scene.eventId}`,
      `activity:${activityId}`,
      "attendance:not-completed",
    ],
    summary: "You left without staying through the posted public meeting.",
    context: {
      location: {
        jurisdictionId: scene.location.jurisdictionId,
        label: scene.location.label,
        setting: "community room",
      },
      socialContext: null,
      pressure: null,
      choice: "Leave the meeting and return home",
      motivation: null,
      immediateReaction: null,
    },
  });
  const traveled = travelToPlace(
    departed,
    personId,
    "home",
    (current, actor, destination) =>
      destination === "home"
        ? meetingHomeRoute(current, actor)
        : { kind: "unavailable", reason: "This action returns home." },
    handlers,
  );
  return traveled === departed ? world : traveled;
}
