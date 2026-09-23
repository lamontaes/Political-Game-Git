import {
  congressSeatIdentityForOfficeKey,
  congressionalDistrictName,
} from "./nationwide-world/congress-candidacy-packs";
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
    return {
      key: `district:${binding.vintage}:${binding.chamber}:${binding.geoid}`,
      label: `${binding.stateUsps} ${binding.chamber.replaceAll("-", " ")} district ${binding.geoid}`,
    };
  }
  const seat = congressSeatIdentityForOfficeKey(office.officeKey)?.seat;
  const label = seat ? congressionalDistrictName(seat) : null;
  return seat && label ? { key: `district:${seat.seatKey}`, label } : null;
}
