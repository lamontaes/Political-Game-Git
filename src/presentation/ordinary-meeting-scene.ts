import { livingSceneStagePacket } from "./living-scene-prose";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { personName, type EntityId, type World } from "../simulation";
import {
  ORDINARY_MEETING_PRESENCE,
  ordinaryMeetingEntry,
} from "../simulation/ordinary-meeting-presence";
import { completedActivityHere } from "./scene-venues";

/** Read explicit entry or current aftermath; a calendar invite is never presence. */
export function projectOrdinaryMeetingScene(world: World, personId: EntityId) {
  const aftermath = completedActivityHere(world, personId);
  const active = world.history.scheduledActivities
    .filter(
      (candidate) =>
        candidate.location.locationKey === "ordinary-life:meeting-room",
    )
    .map((candidate) => ordinaryMeetingEntry(world, personId, candidate.id))
    .find(Boolean);
  const activity =
    aftermath?.location.locationKey === "ordinary-life:meeting-room"
      ? aftermath
      : active?.activity;
  if (!activity) return null;
  const phase =
    aftermath?.id === activity.id
      ? ("immediate-aftermath" as const)
      : ("active" as const);
  const stableKey = `${ORDINARY_MEETING_PRESENCE}:${activity.id}${phase === "active" ? ":entry" : ""}`;
  const event = world.history.events.find(
    (entry) =>
      entry.stableKey === stableKey &&
      entry.involvedEntityIds.includes(activity.id) &&
      entry.participants.some(
        (actor) =>
          actor.personId === personId && actor.role === "presence:participant",
      ),
  );
  if (
    !event ||
    (phase === "active" &&
      (event.occurredAt !== world.currentDate ||
        !event.tags.includes(`minute:${world.currentMoment.minuteOfDay}`) ||
        !active ||
        !event.tags.includes(`arrival:${active.arrival.id}`))) ||
    !world.history.knowledge.some(
      (knowledge) =>
        knowledge.eventId === event.id &&
        knowledge.personId === personId &&
        knowledge.accuracy === "accurate" &&
        knowledge.source.kind === "direct" &&
        knowledge.learnedAt <= world.currentDate,
    )
  )
    return null;
  const chair = event.participants.find(
    (actor) =>
      actor.role === "coordination:chair" &&
      actor.personId !== personId &&
      world.people[actor.personId] &&
      event.participants.some(
        (present) =>
          present.personId === actor.personId &&
          present.role === "presence:participant",
      ) &&
      !world.history.personDeaths.some(
        (death) =>
          death.personId === actor.personId &&
          death.diedAt <= world.currentDate,
      ),
  );
  if (!chair) return null;
  return {
    phase,
    activityId: activity.id,
    eventId: event.id,
    location: activity.location,
    actors: [
      {
        personId: chair.personId,
        name: personName(world.people[chair.personId]!),
        role: "Meeting chair",
        recordIds: [event.id],
      },
    ],
    caption:
      phase === "active"
        ? `${personName(world.people[chair.personId]!)} chairs the meeting.`
        : `The meeting has ended. ${personName(world.people[chair.personId]!)} chaired it.`,
    stage:
      phase === "active"
        ? livingSceneStagePacket({
            family: "seated-civic-meeting",
            roles: [
              {
                slotKey: "meeting-chair",
                personId: chair.personId,
                name: personName(world.people[chair.personId]!),
              },
            ],
            publicFacts: ["The meeting is starting."],
            asOf: world.currentDate,
            regionKey: activity.location.jurisdictionId
              ? (lifePlaceByJurisdictionId(activity.location.jurisdictionId)
                  ?.key ?? null)
              : null,
            fallback: `${personName(world.people[chair.personId]!)} chairs the meeting.`,
          })
        : null,
    agendaSelection: { kind: "agenda" as const, activityId: activity.id },
  };
}
