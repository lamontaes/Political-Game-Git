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
  desiredDistrictBinding,
  districtResidenceSince,
  selectDesiredDistrict,
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
  return result.world;
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
