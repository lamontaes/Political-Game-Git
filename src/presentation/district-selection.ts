/**
 * Feature-local district selection and residence reads.
 *
 * A mounts this through the existing world/onWorldChange seam. It does not own
 * PlayerGame or global navigation.
 */

import { districtIdentityCatalog } from "../districts/catalog";
import {
  bindingFromIdentity,
  districtMembershipFromInteriorPoint,
  gazetteerChamberForOfficeChamberKey,
  listDistrictIdentities,
} from "../districts/query";
import type { DistrictIdentity, DistrictSeatBinding } from "../districts/types";
import { candidacyPackForJurisdiction } from "../simulation/candidacy";
import {
  districtResidenceSince,
  establishDistrictResidence,
} from "../simulation/district-residence";
import type { EntityId, World } from "../simulation/types";

export { districtMembershipFromInteriorPoint };

export function offeredDistricts(
  world: World,
  jurisdictionId: EntityId,
): readonly DistrictIdentity[] {
  const pack = candidacyPackForJurisdiction(jurisdictionId);
  const officeKey = pack?.offices[0]?.officeKey;
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

export function recordPlayerDistrictResidence(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
): World {
  const result = establishDistrictResidence(world, {
    personId,
    binding,
    startedOn: world.currentDate,
    provenance: {
      method: "player-selection",
      sourceEventId: null,
      note: "Player selected a published district identity. This is not a measured address and not a nearest-centroid assignment.",
    },
  });
  if (result.kind === "refused") {
    throw new Error(result.reason);
  }
  return result.world;
}

export function currentDistrictResidenceStart(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
) {
  return districtResidenceSince(world, personId, binding, world.currentDate);
}
