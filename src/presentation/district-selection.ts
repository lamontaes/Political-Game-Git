/**
 * Feature-local district selection and residence reads.
 *
 * A mounts this through the existing world/onWorldChange seam. It does not own
 * PlayerGame or global navigation. Selecting a district is not home membership.
 */

import { districtIdentityCatalog } from "../districts/catalog";
import {
  bindingFromIdentity,
  districtMembershipFromCanonicalHome,
  districtMembershipFromInteriorPoint,
  gazetteerChamberForOfficeChamberKey,
  listDistrictIdentities,
} from "../districts/query";
import type { DistrictIdentity, DistrictSeatBinding } from "../districts/types";
import { candidacyPackForJurisdiction } from "../simulation/candidacy";
import {
  chooseSplitHomeDistrict,
  desiredDistrictBinding,
  districtResidenceSince,
  recordedDistrictMembership,
  selectDesiredDistrict,
  splitHomeDistricts,
} from "../simulation/district-residence";
import type { EntityId, World } from "../simulation/types";

export {
  districtMembershipFromCanonicalHome,
  districtMembershipFromInteriorPoint,
};

export function offeredDistricts(
  world: World,
  jurisdictionId: EntityId,
  selectedOfficeKey: string | null = null,
): readonly DistrictIdentity[] {
  const pack = candidacyPackForJurisdiction(jurisdictionId);
  const officeKey = pack?.offices.find(
    (office) => office.officeKey === selectedOfficeKey,
  )?.officeKey;
  if (!pack || !officeKey) return [];
  const chamberKey = officeKey.split(":").at(-1) ?? "";
  const chamber = gazetteerChamberForOfficeChamberKey(chamberKey);
  if (!chamber) return [];
  return listDistrictIdentities(districtIdentityCatalog(), {
    stateUsps: pack.jurisdictionKey.replace(/^US-/, ""),
    chamber,
  });
}

export function bindingForDistrict(
  identity: DistrictIdentity,
): DistrictSeatBinding {
  return bindingFromIdentity(identity);
}

export function recordDesiredDistrict(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
): World {
  const result = selectDesiredDistrict(world, personId, binding);
  if (result.kind === "refused") {
    throw new Error(result.reason);
  }
  // In a town that crosses several districts, naming one of the town's own
  // districts is saying which part of town the home is in. Anywhere else a
  // choice stays a seat intent and proves nothing about the home.
  const crossesTown = splitHomeDistricts(
    result.world,
    personId,
    binding.chamber,
  ).some((identity) => identity.recordId === binding.recordId);
  if (!crossesTown) return result.world;
  const placed = chooseSplitHomeDistrict(result.world, personId, binding);
  if (placed.kind === "refused") throw new Error(placed.reason);
  return placed.world;
}

export function currentDesiredDistrict(
  world: World,
  personId: EntityId,
): DistrictSeatBinding | null {
  return desiredDistrictBinding(world, personId);
}

export function currentDistrictResidenceStart(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
) {
  return districtResidenceSince(world, personId, binding, world.currentDate);
}

export interface RecordedDistrictForOffice {
  readonly binding: DistrictSeatBinding;
  readonly startedOn: string;
  /**
   * The districts crossing this person's town, when the town is split. The
   * player may say their home is in any of these; empty for a whole place.
   */
  readonly townDistrictRecordIds: readonly string[];
}

/** Record ids of the districts crossing a split home town, for this office. */
export function townDistrictsForOffice(
  world: World,
  personId: EntityId,
  officeKey: string | null,
): readonly string[] {
  const chamberKey = officeKey?.split(":").at(-1) ?? null;
  const chamber =
    chamberKey === null
      ? null
      : gazetteerChamberForOfficeChamberKey(chamberKey);
  if (!chamber) return [];
  return splitHomeDistricts(world, personId, chamber).map(
    (identity) => identity.recordId,
  );
}

/**
 * The district this person is already recorded as living in, for the chamber
 * this office sits in. Null where the world never wrote one — a city split
 * across districts, or a save from before the join existed — and null is the
 * right answer there rather than a district picked for them.
 */
export function recordedDistrictForOffice(
  world: World,
  personId: EntityId,
  officeKey: string | null,
): RecordedDistrictForOffice | null {
  const chamberKey = officeKey?.split(":").at(-1) ?? null;
  const chamber =
    chamberKey === null
      ? null
      : gazetteerChamberForOfficeChamberKey(chamberKey);
  if (!chamber) return null;
  const interval = recordedDistrictMembership(
    world,
    personId,
    chamber,
    world.currentDate,
  );
  if (!interval) return null;
  return {
    binding: interval.binding,
    // The residence clock's own answer, which reads the household records;
    // the interval's start can be the day the record was written.
    startedOn:
      districtResidenceSince(
        world,
        personId,
        interval.binding,
        world.currentDate,
      ) ?? interval.startedOn,
    townDistrictRecordIds: townDistrictsForOffice(world, personId, officeKey),
  };
}
