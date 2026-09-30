import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  organizationProfileAt,
  recordWorldEvent,
  type EntityId,
  type World,
} from "../simulation";
import {
  onShiftAt,
  workSchedulesFor,
} from "../simulation/living-world/work-schedules";

const VERSION = "opening-work-location-v1";

/** Initial placement only. Later location belongs to the existing travel writers. */
export function recordOpeningWorkLocation(
  world: World,
  personId: EntityId,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  if (
    world.history.events.some(
      (event) =>
        ["life.scene.arrived", "life.scene.opened"].includes(event.type) &&
        event.involvedEntityIds.includes(personId),
    )
  )
    return world;
  const jobs = activeWorkRelationshipsAt(world, personId);
  if (jobs.length === 0) return world;
  const schedules = workSchedulesFor(world, personId);
  const shift = schedules.find((schedule) =>
    onShiftAt(schedule, world.currentMoment),
  );
  const work = shift
    ? jobs.find((job) => job.relationship.id === shift.workRelationshipId)
    : null;
  // A missing role/schedule association cannot authorize a work location.
  if (shift && !work) return world;
  const organizationId = work?.relationship.organizationId ?? null;
  const profile = organizationId
    ? organizationProfileAt(world, organizationId, currentLifeCutoff(world))
    : null;
  const label = shift ? (profile?.name ?? work!.role.title) : "Home";
  const reason = shift
    ? `You are at ${label} for your scheduled shift.`
    : "You are home; your work schedule has no shift at this hour.";
  return recordWorldEvent(world, {
    stableKey: `${VERSION}:${personId}`,
    type: "life.scene.arrived",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId:
      work?.role.locationJurisdictionId ??
      world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [
      personId,
      ...jobs.map((job) => job.relationship.id),
      ...(organizationId ? [organizationId] : []),
    ],
    participants: [{ personId, role: "presence:participant", detail: reason }],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      VERSION,
      `moment:${JSON.stringify(world.currentMoment)}`,
      ...(shift
        ? [`work:${shift.workRelationshipId}`, `place:${shift.place}`]
        : ["place:home"]),
    ],
    summary: reason,
    context: {
      location: {
        jurisdictionId:
          work?.role.locationJurisdictionId ??
          world.people[personId]!.homeJurisdictionId,
        label,
        setting: shift ? "work" : "home",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: reason,
      immediateReaction: null,
    },
  });
}

/** Only the latest actual scene/arrival record can describe where the player is. */
export function openingWorkLocation(world: World, personId: EntityId) {
  const latest = world.history.events
    .filter(
      (event) =>
        ["life.scene.arrived", "life.scene.opened"].includes(event.type) &&
        event.occurredAt <= world.currentDate &&
        event.recordedAt <= world.currentDate &&
        event.sequence < world.history.nextSequence &&
        event.participants.some(
          (participant) => participant.personId === personId,
        ),
    )
    .at(-1);
  return latest?.tags.includes(VERSION) &&
    latest.occurredAt === world.currentDate
    ? latest
    : null;
}
