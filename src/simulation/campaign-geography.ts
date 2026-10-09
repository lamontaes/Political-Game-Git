import { districtIdentityCatalog } from "../districts/catalog";
import { districtIdentityByRecordId } from "../districts/query";
import {
  congressSeatIdentityForOfficeKey,
  congressionalDistrictName,
} from "./nationwide-world/congress-candidacy-packs";
import { stateNameForUsps } from "./state-reference";
import type { ElectiveOfficeRef } from "./types";

/**
 * The district a contested office represents, when it represents one: a bound
 * Gazetteer district, or a U.S. House seat, which is named by its own key and
 * carries no binding. Statewide and whole-jurisdiction offices return null and
 * keep the campaign jurisdiction as their geography. Pure.
 */
export interface CampaignDistrictGeography {
  readonly key: string;
  readonly label: string;
}

export function contestDistrictGeography(
  office: ElectiveOfficeRef,
): CampaignDistrictGeography | null {
  const binding = office.districtBinding ?? null;
  if (binding) {
    // The district's own Gazetteer name ("State House District 76",
    // "Assembly District 12"), after its state's name.
    const identity = districtIdentityByRecordId(
      districtIdentityCatalog(),
      binding.recordId,
    );
    const name =
      identity?.sourceName ??
      `${binding.chamber.replaceAll("-", " ")} district ${identity?.districtCode ?? binding.geoid}`;
    return {
      key: `district:${binding.vintage}:${binding.chamber}:${binding.geoid}`,
      label: `${stateNameForUsps(binding.stateUsps) ?? binding.stateUsps} ${name}`,
    };
  }
  const seat = congressSeatIdentityForOfficeKey(office.officeKey)?.seat;
  const label = seat ? congressionalDistrictName(seat) : null;
  return seat && label ? { key: `district:${seat.seatKey}`, label } : null;
}
