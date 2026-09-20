import { personName, type EntityId, type World } from "../simulation";
import { ORDINARY_MEETING_PRESENCE } from "../simulation/ordinary-meeting-presence";
import { completedActivityHere } from "./scene-venues";

/** Read the current recorded aftermath; a calendar invite is never presence. */
export function projectOrdinaryMeetingScene(world: World, personId: EntityId) {
  const activity = completedActivityHere(world, personId);
  if (activity?.location.locationKey !== "ordinary-life:meeting-room")
    return null;
  const event = world.history.events.find(
    (entry) =>
      entry.stableKey === `${ORDINARY_MEETING_PRESENCE}:${activity.id}` &&
      entry.involvedEntityIds.includes(activity.id) &&
      entry.participants.some(
        (actor) =>
          actor.personId === personId && actor.role === "presence:participant",
      ),
  );
  if (
    !event ||
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
    phase: "immediate-aftermath" as const,
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
    caption: `The meeting has ended. ${personName(world.people[chair.personId]!)} chaired it.`,
    agendaSelection: { kind: "agenda" as const, activityId: activity.id },
  };
}
