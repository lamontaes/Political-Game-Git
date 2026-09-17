import {
  CHAPTER_INVITATION_EVENT,
  CHAPTER_MEETING_ATTENDED_EVENT,
  LIVING_WORLD_WRITER_VERSION,
  ensureCampaignLifeOutreach,
  homePartyChapters,
  recordRelationshipInteraction,
  recordWorldEvent,
  scheduledActivityState,
} from "../simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation";
import { performVenueActivity } from "./venue-activity";

/**
 * Attends a chapter meeting through the ordinary venue action: the journey,
 * the wait and the meeting's own time all pass on the canonical clock. Only
 * a meeting that actually completed records that the player was there and
 * met the organizer. Nothing is joined, registered or endorsed.
 */
export function attendChapterMeeting(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  const meeting = world.history.scheduledActivities.find(
    (activity) => activity.id === activityId,
  );
  const invitation = meeting
    ? world.history.events.find(
        (event) =>
          event.type === CHAPTER_INVITATION_EVENT &&
          meeting.sourceEntityIds.includes(event.id),
      )
    : undefined;
  const chapter = invitation
    ? homePartyChapters(world).find((candidate) =>
        invitation.involvedEntityIds.includes(candidate.organizationId),
      )
    : undefined;
  if (!meeting || !invitation || !chapter?.organizerPersonId) return world;
  const performed = handlers
    ? performVenueActivity(world, personId, activityId, handlers)
    : performVenueActivity(world, personId, activityId);
  if (scheduledActivityState(performed, activityId).status !== "completed")
    return performed;
  const organizerId = chapter.organizerPersonId;
  const organizerAlive =
    performed.people[organizerId] &&
    !performed.history.personDeaths.some(
      (death) =>
        death.personId === organizerId && death.diedAt <= performed.currentDate,
    );
  const stableKey = `${invitation.stableKey}:attended`;
  const attended = recordWorldEvent(performed, {
    stableKey,
    type: CHAPTER_MEETING_ATTENDED_EVENT,
    occurredAt: performed.currentDate,
    recordedAt: performed.currentDate,
    jurisdictionId: chapter.jurisdictionId,
    involvedEntityIds: [
      personId,
      chapter.organizationId,
      activityId,
      ...(organizerAlive ? [organizerId] : []),
    ],
    participants: [
      {
        personId,
        role: "presence:participant",
        detail: "Attended the open meeting",
      },
      ...(organizerAlive
        ? [
            {
              personId: organizerId,
              role: "presence:participant" as const,
              detail: "Ran the open meeting",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      LIVING_WORLD_WRITER_VERSION,
      `invitation:${invitation.id}`,
      `chapter:${chapter.organizationId}`,
    ],
    summary: `You attended the ${chapter.name} open meeting.`,
    context: {
      location: {
        jurisdictionId: meeting.location.jurisdictionId,
        label: meeting.location.label,
        setting: "community room",
      },
      socialContext: "An open chapter meeting.",
      pressure: null,
      choice: "Attend the meeting",
      motivation: null,
      immediateReaction: null,
    },
  });
  if (!organizerAlive) return attended;
  const met = attended.history.events.at(-1)!;
  const before = attended.history.relationshipInteractions.some(
    (interaction) =>
      interaction.personIds.includes(personId) &&
      interaction.personIds.includes(organizerId),
  );
  const recorded = recordRelationshipInteraction(attended, {
    stableKey: `${stableKey}:met-organizer`,
    personIds: [personId, organizerId],
    eventId: met.id,
    occurredAt: attended.currentDate,
    kind: "contact:chapter-meeting",
    change: before ? "maintained" : "formed",
    significance: "minor",
    summary: before
      ? "Saw the organizer again at a chapter meeting."
      : "Met the organizer at a chapter meeting.",
    tags: [LIVING_WORLD_WRITER_VERSION],
  });
  // The living organizer's follow-up work (a canvass, a phone shift, a town
  // hall) begins only after an attended and recorded meeting. Returns the same
  // World when an outreach is already pending.
  return ensureCampaignLifeOutreach(recorded, personId, chapter.organizationId);
}
