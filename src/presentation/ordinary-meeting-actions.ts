import {
  addSimulationMinutes,
  advanceWorldMinutes,
  advanceWhileJoiningScheduledActivity,
  cancelScheduledActivity,
  canPersonAccess,
  compareSimulationMoments,
  createCampaignElectionTransitionRegistry,
  recordWorldEvent,
  scheduledActivityState,
  simulationMinutesBetween,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";
import { PUBLIC_MEETING_KEY } from "../simulation/life-opportunities";
import { enterOrdinaryMeeting } from "../simulation/ordinary-meeting-presence";
import { meetingHomeRoute, meetingDepartureRoute } from "./meeting-home-route";
import { openingLifeLocation } from "./life-scene-flow";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { travelToPlace } from "./place-travel";
import { performVenueActivity, venueActivities } from "./venue-activity";

const meetingPlanKey = (activityId: EntityId, personId: EntityId) =>
  `ordinary-meeting:plan:${activityId}:${personId}`;

/** Only an explicit saved choice counts as a commitment to make this trip. */
export function plannedOrdinaryMeetingAttendance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): boolean {
  return world.history.events.some(
    (event) =>
      event.stableKey === meetingPlanKey(activityId, personId) &&
      event.type === "civic.meeting-attendance-planned" &&
      event.involvedEntityIds.includes(activityId) &&
      event.involvedEntityIds.includes(personId),
  );
}

/** Read-only prospect for an on-time meeting plan. */
export function canPlanOrdinaryMeetingAttendance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): boolean {
  const activity = world.history.scheduledActivities.find(
    (item) => item.id === activityId,
  );
  const journey = world.history.scheduledActivities.find(
    (item) =>
      item.kind === "travel" &&
      item.location.locationKey === "ordinary-life:to-meeting-room" &&
      item.sourceEntityIds.includes(activityId) &&
      item.responsiblePersonId === personId,
  );
  const origin = openingLifeLocation(world, personId);
  return (
    !!activity &&
    activity.stableKey === `${PUBLIC_MEETING_KEY}:activity` &&
    activity.responsiblePersonId === personId &&
    canPersonAccess(activity.access, personId) &&
    scheduledActivityState(world, activityId).status === "scheduled" &&
    !!journey &&
    scheduledActivityState(world, journey.id).status === "scheduled" &&
    compareSimulationMoments(
      world.currentMoment,
      scheduledActivityState(world, journey.id).start,
    ) < 0 &&
    origin?.setting === "home" &&
    origin.jurisdictionId === activity.location.jurisdictionId &&
    world.control.kind === "person" &&
    world.control.personId === personId &&
    !plannedOrdinaryMeetingAttendance(world, personId, activityId)
  );
}

/** Record the player's future choice without moving time or attending yet. */
export function planOrdinaryMeetingAttendance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  if (!canPlanOrdinaryMeetingAttendance(world, personId, activityId))
    return world;
  const journey = world.history.scheduledActivities.find(
    (item) =>
      item.kind === "travel" &&
      item.sourceEntityIds.includes(activityId) &&
      item.location.locationKey === "ordinary-life:to-meeting-room",
  )!;
  const activity = world.history.scheduledActivities.find(
    (item) => item.id === activityId,
  )!;
  return recordWorldEvent(world, {
    stableKey: meetingPlanKey(activityId, personId),
    type: "civic.meeting-attendance-planned",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [activityId, journey.id, personId],
    participants: [
      {
        personId,
        role: "agency:actor",
        detail: "Chose to attend the posted meeting",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "ordinary-meeting-plan-v1",
      "choice:attend",
      `journey:${journey.id}`,
    ],
    summary: "You plan to go to the posted public meeting.",
    context: {
      location: openingLifeLocation(world, personId),
      socialContext: null,
      pressure: null,
      choice: "Plan to attend the posted public meeting",
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** Attend takes the existing journey and opens the meeting at its start.
 * Staying through the scheduled interval remains a separate player choice. */
export function arriveAtOrdinaryMeeting(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  if (activity?.stableKey !== `${PUBLIC_MEETING_KEY}:activity`) return world;
  const entered = enterOrdinaryMeeting(world, personId, activityId);
  if (entered !== world) return entered;
  const state = scheduledActivityState(world, activityId);
  const journey = world.history.scheduledActivities.find(
    (candidate) =>
      candidate.kind === "travel" &&
      candidate.location.locationKey === "ordinary-life:to-meeting-room" &&
      candidate.sourceEntityIds.includes(activityId) &&
      candidate.responsiblePersonId === personId,
  );
  if (
    state.status === "scheduled" &&
    journey &&
    compareSimulationMoments(
      world.currentMoment,
      scheduledActivityState(world, journey.id).start,
    ) > 0 &&
    compareSimulationMoments(world.currentMoment, state.end) < 0
  ) {
    const origin = openingLifeLocation(world, personId);
    if (
      !journey ||
      origin?.setting !== "home" ||
      origin.jurisdictionId !== activity.location.jurisdictionId
    )
      return world;
    const journeyState = scheduledActivityState(world, journey.id);
    const minutes = simulationMinutesBetween(
      journeyState.start,
      journeyState.end,
    );
    if (
      (journeyState.status !== "cancelled" &&
        !(
          journeyState.status === "scheduled" &&
          compareSimulationMoments(world.currentMoment, journeyState.start) > 0
        )) ||
      compareSimulationMoments(journeyState.end, state.start) !== 0 ||
      !Number.isSafeInteger(minutes) ||
      minutes <= 0
    )
      return world;
    const departure =
      journeyState.status === "scheduled"
        ? cancelScheduledActivity(world, journey.id)
        : world;
    const arrived = advanceWhileJoiningScheduledActivity(
      departure,
      activityId,
      minutes,
      handlers ?? createCampaignElectionTransitionRegistry(),
    );
    if (arrived === departure) return world;
    const placed = recordWorldEvent(arrived, {
      stableKey: `ordinary-meeting:late-arrival:${activityId}:${journey.id}`,
      type: "life.scene.arrived",
      occurredAt: arrived.currentDate,
      recordedAt: arrived.currentDate,
      jurisdictionId: activity.location.jurisdictionId,
      involvedEntityIds: [journey.id, activityId, personId],
      participants: [
        {
          personId,
          role: "presence:participant",
          detail: "Arrived at the posted public meeting",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        "travel:late-meeting",
        "route:ordinary-life:to-meeting-room",
        "place:ordinary-life:meeting-room",
        `duration-minutes:${minutes}`,
      ],
      summary: `You traveled ${minutes} minutes and arrived at the public meeting after it began.`,
      context: {
        location: {
          jurisdictionId: activity.location.jurisdictionId,
          label: activity.location.label,
          setting: "community room",
        },
        socialContext: null,
        pressure: null,
        choice: "Attend the posted public meeting",
        motivation: null,
        immediateReaction: null,
      },
    });
    return enterOrdinaryMeeting(placed, personId, activityId);
  }
  const offer = venueActivities(world, personId, handlers).find(
    (candidate) => candidate.activity.id === activityId,
  );
  if (!offer || offer.refusal) return world;
  if (!offer.journey) {
    // An older save can already place the player in the room without an open
    // travel leg. Play may wait for the meeting there, then open the same
    // conversation; it cannot turn that wait into completed attendance.
    const start = scheduledActivityState(world, activityId).start;
    const minutes = simulationMinutesBetween(world.currentMoment, start);
    if (minutes < 0) return world;
    const waited = advanceWorldMinutes(
      world,
      minutes,
      handlers ?? createCampaignElectionTransitionRegistry(),
    );
    return compareSimulationMoments(waited.currentMoment, start) === 0
      ? enterOrdinaryMeeting(waited, personId, activityId)
      : world;
  }
  const arrived = offer.journey.alreadyCompleted
    ? world
    : performVenueActivity(
        world,
        personId,
        offer.journey.activity.id,
        handlers,
      );
  return enterOrdinaryMeeting(arrived, personId, activityId);
}

/** A short visit hears the opening discussion, then returns home. It cannot
 * earn full attendance or witness an outcome after the player has left. */
export function goBrieflyToOrdinaryMeeting(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): World {
  const scene = projectOrdinaryMeetingScene(world, personId);
  if (scene?.phase !== "active" || scene.activityId !== activityId)
    return world;
  if (meetingDepartureRoute(world, personId).kind !== "available") return world;
  const lateEntry = world.history.events.some(
    (event) =>
      event.id === scene.eventId &&
      event.tags.includes("attendance:late-entry"),
  );
  // COPY-PENDING(wave2): A late arrival has not heard the opening discussion.
  // PLACEHOLDER(overnight): Fifteen minutes is the authored short-visit
  // duration until the owner sets a scene pacing rule; it is never a fare or
  // a claim about an actual public body's meeting procedure.
  const briefMinutes = 15;
  const target = addSimulationMinutes(world.currentMoment, briefMinutes);
  const cancelled = cancelScheduledActivity(world, activityId);
  const spent = advanceWorldMinutes(cancelled, briefMinutes, handlers);
  if (compareSimulationMoments(spent.currentMoment, target) !== 0) return world;
  const noted = recordWorldEvent(spent, {
    stableKey: `ordinary-meeting:brief:${activityId}:${scene.eventId}`,
    type: "civic.meeting-brief-visit",
    occurredAt: spent.currentDate,
    recordedAt: spent.currentDate,
    jurisdictionId: scene.location.jurisdictionId,
    involvedEntityIds: [
      personId,
      activityId,
      ...scene.actors.map((actor) => actor.personId),
    ],
    participants: [
      {
        personId,
        role: "agency:actor",
        detail: lateEntry
          ? "Heard part of the discussion, then left"
          : "Stayed for the opening discussion, then left",
      },
      ...scene.actors.map((actor) => ({
        personId: actor.personId,
        role: "presence:participant" as const,
        detail: lateEntry
          ? "Present during part of the discussion"
          : "Present during the opening discussion",
      })),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `entry:${scene.eventId}`,
      `activity:${activityId}`,
      "attendance:brief",
      "attendance:not-completed",
    ],
    summary: lateEntry
      ? "You heard part of the discussion and left after a short visit. You did not stay for the outcome."
      : "You heard the opening discussion and left after a short visit. You did not stay for the outcome.",
    context: {
      location: {
        jurisdictionId: scene.location.jurisdictionId,
        label: scene.location.label,
        setting: "community room",
      },
      socialContext: scene.agendaText,
      pressure: null,
      choice: "Go briefly and return home",
      motivation: null,
      immediateReaction: null,
    },
  });
  const home = travelToPlace(
    noted,
    personId,
    "home",
    (current, actor, destination) =>
      destination === "home"
        ? meetingHomeRoute(current, actor)
        : { kind: "unavailable", reason: "This action returns home." },
    handlers,
  );
  return home === noted ? world : home;
}

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

/** An explicit alternative to staying through the meeting. Canceled activity
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
