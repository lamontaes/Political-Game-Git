import {
  currentLifeCutoff,
  educationEnrollmentStateAt,
  organizationParticipationStateAt,
} from "./life-queries";
import { kindergartenYear } from "./school-stages";
import type {
  EducationEnrollment,
  EntityId,
  HistoricalCutoff,
  OrganizationParticipation,
  World,
} from "./types";

/**
 * The people someone knows from the places they share now: the bodies and
 * groups they meet in (a town council, a congregation, a club), and the
 * parents of their children's classmates.
 *
 * Nothing is drawn. Two people know each other here because the world records
 * them in the same room at the same time: both hold an active membership,
 * activity or leadership place in one organization, or each has a child
 * enrolled at the same school in the same class. A party registration is an
 * affiliation, not a room, so it makes no acquaintance. The class is the fall
 * the child starts kindergarten, from the calendar that moves children through
 * school (`school-stages.ts`).
 *
 * Neighbors are not found here: a home has no place on a street on record yet
 * (`town-homes.ts` records its kind and tenure only), so neighbors are the
 * recorded neighbor contacts. Coworkers and housemates are read by
 * `peopleKnownTo`, which adds these.
 */
export function sharedPlaceAcquaintances(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  if (!world.people[personId]) return [];
  const cutoff = currentLifeCutoff(world);
  const known = new Set<EntityId>();

  const rooms = new Set(
    world.history.organizationParticipations
      .filter(
        (row) =>
          row.personId === personId &&
          meetsInPerson(row) &&
          participationActive(world, row, cutoff),
      )
      .map((row) => row.organizationId),
  );
  if (rooms.size > 0)
    for (const row of world.history.organizationParticipations)
      if (
        row.personId !== personId &&
        rooms.has(row.organizationId) &&
        meetsInPerson(row) &&
        world.people[row.personId] &&
        participationActive(world, row, cutoff)
      )
        known.add(row.personId);

  const classes = new Set<string>();
  for (const child of childrenOf(world, personId))
    for (const key of classKeys(world, child, cutoff)) classes.add(key);
  if (classes.size > 0)
    for (const row of world.history.educationEnrollments) {
      if (!world.people[row.personId]) continue;
      const key = classKey(world, row);
      if (!key || !classes.has(key) || !enrollmentActive(world, row, cutoff))
        continue;
      for (const parent of parentsOf(world, row.personId))
        if (world.people[parent]) known.add(parent);
    }

  known.delete(personId);
  return [...known].sort();
}

/** A place where people meet: not an affiliation such as a party registration. */
function meetsInPerson(row: OrganizationParticipation): boolean {
  return (
    row.kind.startsWith("membership:") ||
    row.kind.startsWith("activity:") ||
    row.kind.startsWith("leadership:")
  );
}

function participationActive(
  world: World,
  row: OrganizationParticipation,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    row.sequence < cutoff.historySequenceExclusive &&
    row.startedAt <= cutoff.asOfDate &&
    organizationParticipationStateAt(world, row.id, cutoff)?.status === "active"
  );
}

function enrollmentActive(
  world: World,
  row: EducationEnrollment,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    row.sequence < cutoff.historySequenceExclusive &&
    row.startedAt <= cutoff.asOfDate &&
    educationEnrollmentStateAt(world, row.id, cutoff)?.status === "active"
  );
}

/** A school class: the school and the fall its children started kindergarten. */
function classKey(world: World, row: EducationEnrollment): string | null {
  if (!row.programKind.startsWith("schooling:")) return null;
  const child = world.people[row.personId];
  if (!child) return null;
  return `${row.organizationId}:${kindergartenYear(child.birthDate)}`;
}

function classKeys(
  world: World,
  childId: EntityId,
  cutoff: HistoricalCutoff,
): readonly string[] {
  return world.history.educationEnrollments.flatMap((row) => {
    if (row.personId !== childId || !enrollmentActive(world, row, cutoff))
      return [];
    const key = classKey(world, row);
    return key ? [key] : [];
  });
}

function parentChildOthers(world: World, personId: EntityId): EntityId[] {
  return world.history.kinshipRelationships
    .filter(
      (row) =>
        row.personIds.includes(personId) &&
        row.kind.startsWith("lineal:") &&
        row.kind.includes("parent-child"),
    )
    .map((row) => row.personIds.find((id) => id !== personId)!)
    .filter((id) => id !== undefined && world.people[id] !== undefined);
}

/** The recorded children: the younger side of a parent–child link. */
function childrenOf(world: World, personId: EntityId): EntityId[] {
  const born = world.people[personId]!.birthDate;
  return parentChildOthers(world, personId).filter(
    (id) => world.people[id]!.birthDate > born,
  );
}

/** The recorded parents: the elder side of a parent–child link. */
function parentsOf(world: World, personId: EntityId): EntityId[] {
  const born = world.people[personId]!.birthDate;
  return parentChildOthers(world, personId).filter(
    (id) => world.people[id]!.birthDate < born,
  );
}
