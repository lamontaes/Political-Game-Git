import { isCountyServiceProgram } from "./law-consequences/service-delivered-data";
import { juryCountyForPlace } from "./justice/jury-catchment";
import { organizationProfileAt } from "./life-queries";
import { publicProgramRecords } from "./public-program-integrity";
import type { StandingProgramAuthority } from "./law-consequence-types";
import type { EntityId, IsoDate, World } from "./types";

/** Readers for the county services (CO-9); see `county-services.ts`. */

/**
 * Read the saved county service appropriation for the shared service handler:
 * a program of one of the county families, adopted by the board's own measure,
 * open today. It resolves no attendance and creates no service row.
 */
export function standingCountyAuthority(
  world: World,
  appropriationId: EntityId,
  onDate: IsoDate,
): StandingProgramAuthority | null {
  const record = publicProgramRecords(world).find(
    (candidate) => candidate.id === appropriationId,
  );
  if (
    record?.kind !== "appropriation" ||
    !isCountyServiceProgram(record.programKey) ||
    record.sourceMeasureId == null ||
    !record.basis.note.trim() ||
    record.recordedAt > onDate ||
    record.availableFrom > onDate ||
    record.availableThrough < onDate
  )
    return null;
  return {
    kind: "standing-program-appropriation",
    appropriationId: record.id,
    programKey: record.programKey,
    jurisdictionId: record.jurisdictionId,
    accountOrganizationId: record.accountOrganizationId,
    publicGovernmentIdentity: record.publicGovernmentIdentity
      ? { ...record.publicGovernmentIdentity }
      : undefined,
    availableFrom: record.availableFrom,
    availableThrough: record.availableThrough,
    sourceBasis: { ...record.basis },
  };
}

/**
 * An organization already at work in this county: located in the county's own
 * jurisdiction, or in a place whose jurors the county seats. The same-state
 * reach a state program uses would pay another county's department.
 */
export function organizationServesCounty(
  world: World,
  organizationId: EntityId,
  programKey: string,
  countyJurisdictionId: EntityId,
): boolean {
  const geoid = programKey.split(":")[1] ?? "";
  const at = organizationProfileAt(
    world,
    organizationId,
  )?.locationJurisdictionId;
  if (!at) return false;
  if (at === countyJurisdictionId) return true;
  return geoid !== "" && juryCountyForPlace(at) === geoid;
}

/** A resident of this county's service: the person's home place is in it. */
export function residentOfCounty(
  world: World,
  personId: EntityId,
  programKey: string,
): boolean {
  const home = world.people[personId]?.homeJurisdictionId;
  const geoid = programKey.split(":")[1] ?? "";
  return !!home && geoid !== "" && juryCountyForPlace(home) === geoid;
}
