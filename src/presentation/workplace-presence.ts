import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  isPersonAliveAt,
  type EntityId,
  type World,
} from "../simulation";
import {
  peopleAtWorkAt,
  whereaboutsAt,
} from "../simulation/living-world/work-schedules";
import { openingWorkLocation } from "./opening-work-location";
import { recordsByStringField } from "../simulation/history-index";

/** Actual opening arrival plus the existing recorded-job shift/presence model. */
export function workplacePresence(world: World, personId: EntityId) {
  const arrival = openingWorkLocation(world, personId);
  if (arrival?.context.location?.setting !== "work") return null;
  const workTag = arrival.tags.find((tag) => tag.startsWith("work:"));
  const place = arrival.tags.find((tag) => tag.startsWith("place:"))?.slice(6);
  if (!workTag || !place) return null;
  const cutoff = currentLifeCutoff(world);
  const job = activeWorkRelationshipsAt(world, personId, cutoff).find(
    (entry) => `work:${entry.relationship.id}` === workTag,
  );
  if (!job) return null;
  const where = whereaboutsAt(world, personId);
  if (
    where.kind !== "work" ||
    where.workRelationshipId !== job.relationship.id ||
    where.place !== place
  )
    return null;
  const town = job.role.locationJurisdictionId;
  if (!town || town !== arrival.context.location.jurisdictionId) return null;
  const latestLocations = new Map<
    EntityId,
    (typeof world.history.events)[number]
  >();
  for (const event of recordsByStringField(
    world.history.events,
    "occurredAt",
    world.currentDate,
  )) {
    if (
      event.recordedAt > world.currentDate ||
      event.sequence >= world.history.nextSequence ||
      !event.context.location ||
      (event.type !== "life.scene.arrived" &&
        event.type !== "life.scene.opened")
    )
      continue;
    for (const participant of event.participants)
      latestLocations.set(participant.personId, event);
  }
  // A place picture alone cannot put employees of different employers together.
  const coworkers =
    job.relationship.organizationId === null
      ? []
      : peopleAtWorkAt(world, town, place).filter((other) => {
          if (
            other.personId === personId ||
            other.organizationId !== job.relationship.organizationId ||
            !isPersonAliveAt(world, other.personId, cutoff)
          )
            return false;
          // Any actual incompatible location overrides the ordinary shift assumption.
          const latest = latestLocations.get(other.personId);
          return (
            !latest ||
            (latest.context.location?.setting === "work" &&
              latest.context.location.jurisdictionId === town &&
              latest.tags.includes(`work:${other.workRelationshipId}`) &&
              latest.tags.includes(`place:${place}`))
          );
        });
  return {
    eventId: arrival.id,
    arrival,
    workRelationshipId: job.relationship.id,
    workRoleId: job.role.id,
    organizationId: job.relationship.organizationId,
    place,
    locationKey: workTag,
    location: arrival.context.location,
    personIds: [personId, ...coworkers.map((other) => other.personId)],
    sourceRecordIds: [
      arrival.id,
      job.relationship.id,
      job.role.id,
      ...coworkers.map((other) => other.workRelationshipId),
    ],
  };
}
