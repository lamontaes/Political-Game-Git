/**
 * What the District of Columbia is called, as plain values.
 *
 * This module imports nothing, on purpose. `district-of-columbia.ts` reaches
 * the Census listing and the place index to answer which government and which
 * jurisdiction the District is, and those pull in `life-places`, which pulls in
 * the legislative rule packs, which pull in the chief-executive lists — a cycle
 * back to a module that needs the District's USPS code while it is still
 * initializing. Under ESM that resolved by luck of ordering; under CommonJS it
 * threw outright.
 *
 * Keeping the bare names here breaks the cycle at its only load-bearing edge,
 * and duplicates nothing: every other module reads these from here.
 */

export const DISTRICT_OF_COLUMBIA_USPS = "DC";

export const DISTRICT_OF_COLUMBIA_JURISDICTION_KEY = "US-DC";

/** The Census place the District's one general-purpose government governs. */
export const DISTRICT_OF_COLUMBIA_PLACE_GEOID = "1150000";

/** The county AREA. The listing records no county government for it. */
export const DISTRICT_OF_COLUMBIA_COUNTY_GEOID = "11001";

export const DISTRICT_OF_COLUMBIA_OFFICE_KEY = "dc-mayor";

export const DISTRICT_OF_COLUMBIA_OFFICE_TITLE = "Mayor";

export const DISTRICT_OF_COLUMBIA_OFFICE_DISPLAY_NAME =
  "Mayor of the District of Columbia";

export const DISTRICT_OF_COLUMBIA_CONSOLIDATION_NOTE =
  "The District of Columbia is one government. Its citywide and district-wide identities are the same authority, so it has one chief executive, one jurisdiction and one public account — not a mayor beside a governor.";

/** The Home Rule Act section the Mayor and Council are established by. */
export const DISTRICT_OF_COLUMBIA_STRUCTURE_SOURCE =
  "https://code.dccouncil.gov/us/dc/council/code/sections/1-204.01";

export function isDistrictOfColumbia(jurisdictionKey: string): boolean {
  return (
    jurisdictionKey === DISTRICT_OF_COLUMBIA_USPS ||
    jurisdictionKey === DISTRICT_OF_COLUMBIA_JURISDICTION_KEY
  );
}
