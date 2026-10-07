import { countyGovernmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import {
  sittingCountyRowOfficers,
  type SeatedCountyRowOfficer,
} from "../living-world/local-government-seats";
import type { CountyRowOfficeKey } from "../nationwide-world/county-row-offices";
import type { EntityId, World } from "../types";
import { juryCountyForPlace } from "./jury-catchment";

/**
 * The county a town's justice work belongs to, and who holds its sheriff and
 * prosecutor offices (CO-4).
 *
 * One rule for every place: a town's county is the county holding most of its
 * people (the same reading the trial-jury catchment uses), and the holders are
 * whoever the county's own organization records as sitting in the office
 * (`sittingCountyRowOfficers`, CO-2). A town with no county government in the
 * game's list, or a county that elects no such office, has no holder and
 * nothing here invents one.
 */

/** The role an arrest event gives the officer who made it. */
export const ARRESTING_OFFICER_ROLE = "other:arresting-officer" as const;

/** The county government a town's arrests, referrals and jail terms fall under. */
export function countyUnitForJurisdiction(
  jurisdictionId: EntityId | null,
): GovernmentUnitIdentity | null {
  if (!jurisdictionId) return null;
  const geoid = juryCountyForPlace(jurisdictionId);
  return geoid ? countyGovernmentUnit(geoid) : null;
}

/** The person sitting in this county office for a town today, or null. */
export function countyRowOfficerForJurisdiction(
  world: World,
  jurisdictionId: EntityId | null,
  office: CountyRowOfficeKey,
): SeatedCountyRowOfficer | null {
  const unit = countyUnitForJurisdiction(jurisdictionId);
  if (!unit) return null;
  const holders = sittingCountyRowOfficers(world, unit).filter(
    (row) => row.office === office,
  );
  return holders.length === 1 ? holders[0]! : null;
}
