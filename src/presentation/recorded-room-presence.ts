import {
  compareSimulationMoments,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import {
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../simulation/life-queries";
import { whereaboutsAt } from "../simulation/living-world/work-schedules";

/** Immediate presence comes from scene/arrival records, never shared membership. */
export function recordedRoomPresence(world: World, personId: EntityId) {
  const places = world.history.events.filter(
    (event) =>
      (event.type === "life.scene.opened" ||
        event.type === "life.scene.arrived") &&
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
  if (!event || event.occurredAt !== world.currentDate)
    return householdAtHome(world, personId);
  if (event.type === "life.scene.opened") {
    if (!event.tags.includes(`moment:${JSON.stringify(world.currentMoment)}`))
      return householdAtHome(world, personId);
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
    ...new Set(event.participants.map((p) => p.personId)),
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

/**
 * With no scene or arrival recorded for this moment, a person who is at home
 * (no recorded activity, no shift, no recorded absence) is in the household's
 * home with the members who are also at home now. Read from the household
 * membership and location records and the work schedules; nothing is written.
 */
function householdAtHome(world: World, personId: EntityId) {
  if (whereaboutsAt(world, personId).kind !== "home") return null;
  const home = householdMembershipsAt(world, personId).find(
    (membership) => membership.location !== null,
  );
  if (!home?.location) return null;
  const personIds = peopleInHouseholdAt(world, home.household.id).filter(
    (id) =>
      world.people[id] !== undefined &&
      !world.history.personDeaths.some(
        (death) => death.personId === id && death.diedAt <= world.currentDate,
      ) &&
      (id === personId || whereaboutsAt(world, id).kind === "home"),
  );
  if (!personIds.includes(personId)) return null;
  return {
    eventId: home.location.id,
    location: {
      jurisdictionId: home.location.jurisdictionId,
      label: home.location.label,
      setting: "home",
    },
    personIds,
  };
}
