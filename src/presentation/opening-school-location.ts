import {
  activeEducationEnrollmentsAt,
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
import {
  classmatesInClassAt,
  inClassAt,
} from "../simulation/living-world/school-presence";

const VERSION = "opening-school-location-v1";

/**
 * Initial placement of a pupil whose first moment falls in class: at their
 * school, with the classmates the enrollment records say are in the same grade
 * at the same school. Nobody is drawn and nobody is invented. Later location
 * belongs to the existing travel writers.
 */
export function recordOpeningSchoolLocation(
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
  const onShift = workSchedulesFor(world, personId).some((schedule) =>
    onShiftAt(schedule, world.currentMoment),
  );
  if (onShift || !inClassAt(world, personId)) return world;
  const enrollment = activeEducationEnrollmentsAt(world, personId).find(
    (entry) => entry.enrollment.programKind.startsWith("schooling:"),
  );
  if (!enrollment) return world;
  const organizationId = enrollment.enrollment.organizationId;
  const label =
    organizationProfileAt(world, organizationId, currentLifeCutoff(world))
      ?.name ?? "School";
  const classmates = classmatesInClassAt(world, personId);
  const jurisdictionId = world.people[personId]!.homeJurisdictionId;
  const reason = `You are in class at ${label}.`;
  return recordWorldEvent(world, {
    stableKey: `${VERSION}:${personId}`,
    type: "life.scene.arrived",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId, organizationId, ...classmates],
    participants: [
      { personId, role: "presence:participant", detail: reason },
      ...classmates.map((id) => ({
        personId: id,
        role: "presence:participant",
        detail: "In class with you",
      })),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      VERSION,
      "playtest65:initial-placement",
      `moment:${JSON.stringify(world.currentMoment)}`,
      "place:school",
    ],
    summary: reason,
    context: {
      location: { jurisdictionId, label, setting: "school" },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: reason,
      immediateReaction: null,
    },
  });
}
