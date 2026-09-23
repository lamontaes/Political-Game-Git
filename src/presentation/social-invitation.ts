import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
import {
  cancelScheduledActivity,
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "../simulation/time-work";
import {
  addSimulationMinutes,
  compareSimulationMoments,
} from "../simulation/dates";
import { personName } from "../simulation/people";
import { recordRelationshipInteraction } from "../simulation/records";
import { CHOSEN_TAG } from "../simulation/scheduled-activity-answer";
import { recordWorldEvent } from "../simulation/world";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  ScheduledActivityRecord,
  World,
} from "../simulation/types";

/** Where an accepted invitation takes place, and the walk there. */
export const SOCIAL_OCCASION_LOCATION_KEY = "life-opportunity:social-occasion";
export const SOCIAL_OCCASION_JOURNEY_KEY =
  "life-opportunity:social-occasion:journey";
/**
 * A short local trip. The world has no distance for it, so no fare either.
 * PLACEHOLDER, NOT RESEARCHED: filed as `what-ordinary-invitations-are-for`,
 * with the afternoon's hours and the asker's home as its place.
 */
const SOCIAL_OCCASION_JOURNEY_MINUTES = 15;

/** A tentative personal hold is an invitation, not organizer responsibility. */
export function socialInvitationsFor(world: World, personId: EntityId) {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return [];
  const invitations = lifeOpportunitiesFor(world, personId).filter(
    (entry) => entry.kind === "social-occasion",
  );
  return world.history.scheduledActivities.flatMap((activity) => {
    const invitation = invitations.find((entry) =>
      activity.sourceEntityIds.includes(entry.eventId),
    );
    if (
      !invitation ||
      activity.kind !== "tentative" ||
      // The hold belongs to the person who was asked, and to nobody else.
      // It may name them as the one responsible for it — an invitation they
      // mean to keep is theirs to walk to, and `performScheduledActivity`
      // refuses an activity with nobody responsible — or it may name nobody,
      // which is the same thing when they are its only participant. What must
      // not pass is a hold somebody else owes an answer for.
      (activity.responsiblePersonId !== null &&
        activity.responsiblePersonId !== personId) ||
      activity.participantPersonIds.length !== 1 ||
      activity.participantPersonIds[0] !== personId
    )
      return [];
    const source = world.history.events.find(
      (event) => event.id === invitation.eventId,
    );
    if (
      source?.type !== "life.social-occasion-invited" ||
      !source.participants.some(
        (entry) =>
          entry.personId === personId && entry.role === "focus:asked-of",
      )
    )
      return [];
    const state = scheduledActivityState(world, activity.id);
    if (
      state.status !== "scheduled" ||
      compareSimulationMoments(state.end, world.currentMoment) <= 0
    )
      return [];
    return [
      {
        activityId: activity.id,
        invitationEventId: invitation.eventId,
        counterpartPersonId: invitation.counterpartPersonId,
        title: activity.title,
        start: state.start,
        end: state.end,
        revision: state.id,
      },
    ];
  });
}

/** Explicit participant refusal; no attendance, time skip or organizer mutation. */
export function declineSocialInvitation(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly activityId: EntityId;
    readonly revision: EntityId;
  },
): World {
  const invitation = socialInvitationsFor(world, input.personId).find(
    (entry) => entry.activityId === input.activityId,
  );
  if (!invitation || invitation.revision !== input.revision)
    throw new Error("This invitation is no longer available to decline.");
  const activity = world.history.scheduledActivities.find(
    (entry) => entry.id === input.activityId,
  )!;
  const next = recordWorldEvent(world, {
    stableKey: `social-invitation:decline:${input.activityId}`,
    type: "life.social-invitation-declined",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [
      input.personId,
      activity.id,
      ...(invitation.counterpartPersonId
        ? [invitation.counterpartPersonId]
        : []),
    ],
    participants: [
      {
        personId: input.personId,
        role: "agency:actor",
        detail: "Declined the invitation",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "adult.weekend-invitation",
      "choice.stay-in",
      // The player pressed this. See `scheduled-activity-answer.ts`.
      CHOSEN_TAG,
      `invitation:${invitation.invitationEventId}`,
      `activity:${activity.id}`,
    ],
    summary:
      "You declined the invitation and released its hold on your calendar.",
    context: {
      location: null,
      socialContext: "An optional invitation.",
      pressure: null,
      choice: "Decline the invitation.",
      motivation: null,
      immediateReaction: null,
    },
  });
  return cancelScheduledActivity(next, activity.id);
}

type SocialInvitation = ReturnType<typeof socialInvitationsFor>[number];

function askerName(world: World, invitation: SocialInvitation): string | null {
  const asker = invitation.counterpartPersonId
    ? world.people[invitation.counterpartPersonId]
    : undefined;
  return asker ? personName(asker) : null;
}

/**
 * Turns the tentative hold into the player's own plan: a confirmed afternoon
 * and the short trip there, which is what lets it be kept rather than lapse.
 * Returns the world unchanged when the afternoon has already begun, since
 * there is no longer a trip to make before it.
 */
function confirmInvitation(
  world: World,
  personId: EntityId,
  invitation: SocialInvitation,
): World {
  const hold = world.history.scheduledActivities.find(
    (entry) => entry.id === invitation.activityId,
  )!;
  if (compareSimulationMoments(invitation.start, world.currentMoment) <= 0)
    return world;
  const asker = askerName(world, invitation);
  const access = { kind: "private" as const, personIds: [personId] };
  let next = cancelScheduledActivity(world, hold.id);
  next = createScheduledActivity(next, {
    stableKey: `social-invitation:accept:${hold.id}:occasion`,
    title: hold.title,
    summary: asker
      ? `${asker} asked you over, and you said you would come.`
      : "You were asked over, and you said you would come.",
    kind: "confirmed",
    start: invitation.start,
    end: invitation.end,
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: { ...hold.location, locationKey: SOCIAL_OCCASION_LOCATION_KEY },
    sourceEntityIds: [invitation.invitationEventId],
    flexibility: { kind: "fixed" },
    access,
  });
  const occasion = next.history.scheduledActivities.at(-1)!;
  const leaveAt = addSimulationMinutes(
    invitation.start,
    -SOCIAL_OCCASION_JOURNEY_MINUTES,
  );
  return createScheduledActivity(next, {
    stableKey: `social-invitation:accept:${hold.id}:journey`,
    title: `Trip to ${hold.location.label}`,
    summary:
      "A short local trip. Travel cost is not represented; no fare is charged.",
    kind: "travel",
    start:
      compareSimulationMoments(leaveAt, world.currentMoment) < 0
        ? world.currentMoment
        : leaveAt,
    end: invitation.start,
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: SOCIAL_OCCASION_JOURNEY_KEY,
      label: `On the way to ${hold.location.label}`,
      jurisdictionId: hold.location.jurisdictionId,
    },
    sourceEntityIds: [occasion.id],
    flexibility: { kind: "fixed" },
    access,
  });
}

/** The player says yes from the invitation itself. */
export function acceptSocialInvitation(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly activityId: EntityId;
    readonly revision: EntityId;
  },
): World {
  const invitation = socialInvitationsFor(world, input.personId).find(
    (entry) => entry.activityId === input.activityId,
  );
  if (!invitation || invitation.revision !== input.revision)
    throw new Error("This invitation is no longer available to accept.");
  if (compareSimulationMoments(invitation.start, world.currentMoment) <= 0)
    throw new Error("This invitation has already begun.");
  const activity = world.history.scheduledActivities.find(
    (entry) => entry.id === input.activityId,
  )!;
  const asker = askerName(world, invitation);
  const next = recordWorldEvent(world, {
    stableKey: `social-invitation:accept:${input.activityId}`,
    type: "life.social-invitation-accepted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [
      input.personId,
      activity.id,
      ...(invitation.counterpartPersonId
        ? [invitation.counterpartPersonId]
        : []),
    ],
    participants: [
      {
        personId: input.personId,
        role: "agency:actor",
        detail: "Accepted the invitation",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "adult.weekend-invitation",
      "choice.say-yes",
      `invitation:${invitation.invitationEventId}`,
      `activity:${activity.id}`,
    ],
    summary: asker
      ? `You told ${asker} you would come.`
      : "You said you would come.",
    context: {
      location: null,
      socialContext: "An optional invitation.",
      pressure: null,
      choice: "Accept the invitation.",
      motivation: null,
      immediateReaction: null,
    },
  });
  return confirmInvitation(next, input.personId, invitation);
}

/**
 * The same answer given in conversation. The scene has already written what
 * was said; this makes the calendar agree with it, so a yes is a plan and a no
 * frees the afternoon. `before` is the world the scene was offered in, where
 * the invitation it answered can still be found.
 */
export function settleSocialInvitationFromScene(
  before: World,
  after: World,
  input: {
    readonly personId: EntityId;
    readonly counterpartPersonId: EntityId | null;
    readonly accepted: boolean;
  },
): World {
  const invitation = socialInvitationsFor(before, input.personId).find(
    (entry) => entry.counterpartPersonId === input.counterpartPersonId,
  );
  if (
    !invitation ||
    scheduledActivityState(after, invitation.activityId).status !== "scheduled"
  )
    return after;
  return input.accepted
    ? confirmInvitation(after, input.personId, invitation)
    : cancelScheduledActivity(after, invitation.activityId);
}

/**
 * Having gone. Once the afternoon is kept, it is recorded as time spent with
 * the person who asked, which is what the saying yes was for. Any other
 * activity returns the same world.
 */
export function recordSocialOccasionAttendance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const activity: ScheduledActivityRecord | undefined =
    world.history.scheduledActivities.find((entry) => entry.id === activityId);
  if (
    !activity ||
    activity.kind !== "confirmed" ||
    activity.location.locationKey !== SOCIAL_OCCASION_LOCATION_KEY ||
    scheduledActivityState(world, activityId).status !== "completed"
  )
    return world;
  const stableKey = `social-occasion:attended:${activityId}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  const asking = world.history.events.find(
    (event) =>
      activity.sourceEntityIds.includes(event.id) &&
      event.type === "life.social-occasion-invited",
  );
  const askerId = asking?.participants.find(
    (entry) => entry.role === "agency:asked",
  )?.personId;
  const asker = askerId ? world.people[askerId] : undefined;
  if (!askerId || !asker || askerId === personId) return world;
  const next = recordWorldEvent(world, {
    stableKey,
    type: "life.social-occasion-attended",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [personId, askerId, activity.id],
    participants: [
      { personId, role: "presence:participant", detail: "Came over" },
      { personId: askerId, role: "presence:host", detail: "Had them over" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["adult.weekend-invitation", `activity:${activity.id}`],
    summary: `You spent the afternoon at ${personName(asker)}'s.`,
    context: {
      location: {
        jurisdictionId: activity.location.jurisdictionId,
        label: activity.location.label,
        setting: "home",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return recordRelationshipInteraction(next, {
    stableKey: `${stableKey}:interaction`,
    personIds: [personId, askerId],
    eventId: next.history.events.at(-1)!.id,
    occurredAt: world.currentDate,
    kind: "contact:neighbourhood",
    change: "strengthened",
    significance: "minor",
    summary: "Spent an afternoon together at home.",
    tags: ["adult.weekend-invitation"],
  });
}

/**
 * A Saturday the player said yes to, kept when the time comes.
 *
 * Passing time over it is going, the way passing time over a work shift is
 * working: saying yes was the choice, and a plan that stopped the clock until
 * somebody found the right button would turn a yes into a trap. The trip and
 * the afternoon are performed in order, then recorded as time spent with the
 * person who asked. Returns the same world when nothing is due at this moment.
 */
export function keepAcceptedSocialOccasion(
  world: World,
  personId: EntityId,
  handlers: FutureTransitionHandlerRegistry,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  const due = (activity: ScheduledActivityRecord) => {
    const state = scheduledActivityState(world, activity.id);
    return (
      state.status === "scheduled" &&
      activity.responsiblePersonId === personId &&
      compareSimulationMoments(state.start, world.currentMoment) === 0
    );
  };
  const occasions = world.history.scheduledActivities.filter(
    (activity) =>
      activity.kind === "confirmed" &&
      activity.location.locationKey === SOCIAL_OCCASION_LOCATION_KEY &&
      scheduledActivityState(world, activity.id).status === "scheduled",
  );
  for (const occasion of occasions) {
    const journey = world.history.scheduledActivities.find(
      (activity) =>
        activity.kind === "travel" &&
        activity.location.locationKey === SOCIAL_OCCASION_JOURNEY_KEY &&
        activity.sourceEntityIds.includes(occasion.id),
    );
    const journeyDue = journey !== undefined && due(journey);
    if (!journeyDue && !due(occasion)) continue;
    let next = journeyDue
      ? performScheduledActivity(world, journey.id, handlers)
      : world;
    if (
      journeyDue &&
      scheduledActivityState(next, journey.id).status !== "completed"
    )
      return world;
    next = performScheduledActivity(next, occasion.id, handlers);
    if (scheduledActivityState(next, occasion.id).status !== "completed")
      return world;
    return recordSocialOccasionAttendance(next, personId, occasion.id);
  }
  return world;
}
