import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
import {
  cancelScheduledActivity,
  scheduledActivityState,
} from "../simulation/time-work";
import { compareSimulationMoments } from "../simulation/dates";
import { recordWorldEvent } from "../simulation/world";
import type { EntityId, World } from "../simulation/types";

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
      activity.responsiblePersonId !== null ||
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
