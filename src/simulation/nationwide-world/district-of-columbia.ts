import { governmentUnitsForState } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { lifePlaceByKey } from "../life-places";
import type { EntityId, Jurisdiction } from "../types";

/**
 * The District of Columbia, as one government.
 *
 * NATIONWIDE1 asks for the District separately from the fifty states, and for
 * exactly one canonical identity where a single authority governs a territory
 * two indexes describe. Both halves matter here:
 *
 * - The District is not a state, and its chief executive is not a governor. It
 *   has a Mayor and a Council, under the District of Columbia Home Rule Act as
 *   the official Code carries it. Nothing in this file copies a state's
 *   governor-and-legislature template onto it.
 * - The Census government-unit listing records ONE general-purpose government
 *   for the District — the city — and no county government for the county area
 *   11001. The statewide key `US-DC` and that city unit are therefore the same
 *   government, and they resolve to the same jurisdiction, so the District gets
 *   one treasury, one office and one public account rather than a district-wide
 *   shadow of a city that is already there.
 *
 * What this file does NOT claim: how the Mayor is elected, when a term begins,
 * what the Council may pass, or what Congress may do with any of it. Those are
 * rules, and they come from the rules-capability port or, where the game has
 * read nothing, from the disclosed game profile that says so.
 */

export * from "./district-of-columbia-identity";

import {
  DISTRICT_OF_COLUMBIA_PLACE_GEOID,
  DISTRICT_OF_COLUMBIA_USPS,
} from "./district-of-columbia-identity";

/**
 * The District's single general-purpose government unit, from the listing.
 * Null where the listing carries none, which is reported rather than filled in.
 */
export function districtOfColumbiaGovernmentUnit(): GovernmentUnitIdentity | null {
  const units = governmentUnitsForState(DISTRICT_OF_COLUMBIA_USPS).filter(
    (unit) => unit.placeGeoid === DISTRICT_OF_COLUMBIA_PLACE_GEOID,
  );
  // More than one would mean the listing describes two governments for the
  // same place; that is a source question, not something to resolve by picking.
  return units.length === 1 ? units[0]! : null;
}

/**
 * The one jurisdiction the District governs from. Everything district-wide and
 * everything citywide names this, which is what keeps them one government.
 */
export function districtOfColumbiaJurisdiction(): Jurisdiction | null {
  return (
    lifePlaceByKey(DISTRICT_OF_COLUMBIA_PLACE_GEOID)?.context.jurisdiction ??
    null
  );
}

export function districtOfColumbiaJurisdictionId(): EntityId | null {
  return districtOfColumbiaJurisdiction()?.id ?? null;
}
