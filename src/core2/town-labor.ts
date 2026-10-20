/**
 * Who in a town can work, from recorded circumstances: the working-age
 * residents, their labor status and who holds an active job today. Moved
 * unchanged from the old living-world town-employment file; the opening
 * (`opening-employment.ts`, `population.ts`) reads these from the core.
 */
import { ageOnDate } from "./kernel/dates";
import {
  activeCareResponsibilitiesAt,
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../simulation/life-queries";
import type {
  EntityId,
  OrganizationClassification,
  World,
} from "../simulation/types";

/** The youngest and oldest ages the town's jobs are filled for. */
export const WORKING_AGE_MIN = 18;
export const WORKING_AGE_MAX = 66;

/* -------------------------------------------------------------------------- */
/* Labor status from recorded circumstances                                   */
/* -------------------------------------------------------------------------- */

export type TownLaborStatus =
  "employed" | "student" | "retired" | "parent-at-home" | "looking-for-work";

export interface Resident {
  readonly personId: EntityId;
  readonly age: number;
  readonly enrolled: boolean;
  readonly parentOfYoungChild: boolean;
}

export function laborStatus(world: World, resident: Resident): TownLaborStatus {
  // A saved job takes precedence over enrollment or household composition.
  if (activeWorkRelationshipsAt(world, resident.personId).length > 0)
    return "employed";
  if (activeEducationEnrollmentsAt(world, resident.personId).length > 0)
    return "student";
  if (
    resident.parentOfYoungChild &&
    activeCareResponsibilitiesAt(world, resident.personId).some(
      ({ state }) => state.share === "primary",
    )
  )
    return "parent-at-home";
  // Here employed means eligible for the existing job-matching path, not a
  // claim that a job exists. The summary counts only actual active jobs and
  // reports an unmatched candidate as looking for work. Age alone is not a
  // retirement record, and a seed supplies no evidence of unemployment.
  return "employed";
}

export function townOrganizationsOf(
  world: World,
  town: EntityId,
  classification: OrganizationClassification,
): readonly EntityId[] {
  return world.history.organizations
    .filter((organization) => {
      const profile = organizationProfileAt(world, organization.id);
      return (
        profile?.classification === classification &&
        profile.locationJurisdictionId === town
      );
    })
    .map((organization) => organization.id);
}

/** The town's written working-age residents, with what their status needs. */
export function townResidents(
  world: World,
  town: EntityId,
): readonly Resident[] {
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const enrolled = new Set(
    world.history.educationEnrollments.map((row) => row.personId),
  );
  const householdOf = new Map<EntityId, EntityId[]>();
  for (const membership of world.history.householdMemberships) {
    const list = householdOf.get(membership.householdId) ?? [];
    list.push(membership.personId);
    householdOf.set(membership.householdId, list);
  }
  const youngChildHouseholds = new Set<EntityId>();
  const partnered = new Set(
    world.history.partnerships.flatMap((row) => row.personIds),
  );
  const householdsOf = new Map<EntityId, EntityId[]>();
  for (const [household, members] of householdOf)
    for (const member of members) {
      const person = world.people[member];
      if (person && ageOnDate(person.birthDate, world.currentDate) < 6)
        youngChildHouseholds.add(household);
      const list = householdsOf.get(member) ?? [];
      list.push(household);
      householdsOf.set(member, list);
    }
  const residents: Resident[] = [];
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person || person.homeJurisdictionId !== town || dead.has(personId))
      continue;
    const age = ageOnDate(person.birthDate, world.currentDate);
    if (age < WORKING_AGE_MIN || age > WORKING_AGE_MAX) continue;
    residents.push({
      personId,
      age,
      enrolled: enrolled.has(personId),
      parentOfYoungChild:
        partnered.has(personId) &&
        (householdsOf.get(personId) ?? []).some((household) =>
          youngChildHouseholds.has(household),
        ),
    });
  }
  return residents;
}

/** Everyone with a job whose latest status today is active. */
export function activeWorkers(world: World): ReadonlySet<EntityId> {
  const personOf = new Map(
    world.history.workRelationships.map((row) => [row.id, row.personId]),
  );
  // A relationship's latest status decides whether it is active now.
  const latest = new Map<EntityId, string>();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= world.currentDate)
      latest.set(row.workRelationshipId, row.status);
  const working = new Set<EntityId>();
  for (const [relationshipId, status] of latest)
    if (status === "active") working.add(personOf.get(relationshipId)!);
  return working;
}
