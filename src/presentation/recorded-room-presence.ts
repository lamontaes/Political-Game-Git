import {
  compareSimulationMoments,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import { ordinaryMeetingEntry } from "../simulation/ordinary-meeting-presence";

/** Immediate presence comes from scene/arrival records, never shared membership. */
export function recordedRoomPresence(world: World, personId: EntityId) {
  const places = world.history.events.filter(
    (event) =>
      (event.type === "life.scene.opened" ||
        event.type === "life.scene.arrived" ||
        event.type === "civic.meeting-entered" ||
        event.type === "civic.meeting-attended") &&
      event.context.location !== null &&
      event.occurredAt <= world.currentDate,
  );
  const event = places
    .filter((entry) =>
      entry.participants.some(
        (participant) => participant.personId === personId,
      ),
    )
    .at(-1);
  if (!event || event.occurredAt !== world.currentDate) return null;
  if (event.type === "civic.meeting-entered") {
    const activity = world.history.scheduledActivities.find(
      (row) =>
        event.involvedEntityIds.includes(row.id) && row.kind !== "travel",
    );
    const entry =
      activity && ordinaryMeetingEntry(world, personId, activity.id);
    if (
      !entry ||
      !event.tags.includes(`arrival:${entry.arrival.id}`) ||
      !event.tags.includes(`minute:${world.currentMoment.minuteOfDay}`)
    )
      return null;
  } else if (event.type === "civic.meeting-attended") {
    const activity = world.history.scheduledActivities.find(
      (row) =>
        event.involvedEntityIds.includes(row.id) && row.kind !== "travel",
    );
    if (!activity) return null;
    const state = scheduledActivityState(world, activity.id);
    if (
      state.status !== "completed" ||
      compareSimulationMoments(state.end, world.currentMoment) !== 0
    )
      return null;
  } else if (
    event.type === "life.scene.opened" ||
    event.tags.includes("playtest65:initial-placement")
  ) {
    if (!event.tags.includes(`moment:${JSON.stringify(world.currentMoment)}`))
      return null;
  } else {
    const journey = world.history.scheduledActivities.find((activity) =>
      event.involvedEntityIds.includes(activity.id),
    );
    if (!journey) return null;
    const state = scheduledActivityState(world, journey.id);
    if (
      state.status !== "completed" ||
      compareSimulationMoments(state.end, world.currentMoment) !== 0
    )
      return null;
  }
  const personIds = [
    ...new Set(
      event.participants
        .filter(
          (participant) =>
            !event.type.startsWith("civic.meeting-") ||
            participant.role === "presence:participant",
        )
        .map((p) => p.personId),
    ),
  ].filter(
    (id) =>
      world.people[id] !== undefined &&
      !world.history.personDeaths.some(
        (death) => death.personId === id && death.diedAt <= world.currentDate,
      ) &&
      !places.some(
        (later) =>
          later.sequence > event.sequence &&
          later.participants.some((participant) => participant.personId === id),
      ),
  );
  if (!personIds.includes(personId)) return null;
  return { eventId: event.id, location: event.context.location!, personIds };
}
