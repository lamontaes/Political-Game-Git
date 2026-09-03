/**
 * District GEOID grammars and the edge cases that break naive readers.
 *
 * All vectors below are read from the Census Bureau's published files and code
 * conventions. The at-large, delegate, unicameral and residual cases are the
 * ones an implementation invents its way past, so they are the ones pinned.
 */

export const CONGRESSIONAL_GEOIDFQ_PREFIX = "5001900US";
export const STATE_LOWER_GEOIDFQ_PREFIX = "620L900US";
export const STATE_UPPER_GEOIDFQ_PREFIX = "610U900US";

export const CONGRESSIONAL_GEOID_PATTERN = /^\d{2}(\d{2}|ZZ)$/;
/**
 * State legislative district codes are three characters, and they are not all
 * digits. Vermont publishes 69 house districts as a letter, a hyphen and an
 * alphanumeric ("50A-1", "50C-F", "50E-O"), and Census marks unassigned
 * territory "ZZZ". A grammar of `[0-9A-Z]{3}` looks right and silently drops
 * every Vermont house district.
 */
export const STATE_LEGISLATIVE_GEOID_PATTERN = /^\d{2}[0-9A-Z-]{3}$/;

/** Nebraska's legislature is unicameral: it has an upper chamber and no lower one. */
export const NEBRASKA_STATE_FIPS = "31";
export const NEBRASKA_UPPER_DISTRICT_COUNT = 49;

/**
 * The six states that elect a single at-large representative, published with
 * district code `00`.
 */
export const AT_LARGE_STATE_USPS: readonly string[] = ["AK", "DE", "ND", "SD", "VT", "WY"];

/**
 * District of Columbia and Puerto Rico appear in the congressional file with
 * code `98`. Their delegate and resident commissioner are not voting members of
 * the House; the code records the geography, not a seat.
 */
export const NON_VOTING_DELEGATE_DISTRICT_CODE = "98";

/** `ZZ`/`ZZZ` mark territory the Census assigns to no district. */
export function isUnassignedResidualCode(districtCode: string): boolean {
  return districtCode === "ZZ" || districtCode === "ZZZ";
}

export interface DistrictIdentityVector {
  readonly chamber: "congressional" | "state-lower" | "state-upper";
  readonly geoid: string;
  readonly stateUsps: string;
  readonly districtCode: string;
  readonly sourceName: string | null;
  readonly note: string;
}

export const OFFICIAL_DISTRICT_VECTORS: readonly DistrictIdentityVector[] = [
  {
    chamber: "congressional",
    geoid: "0200",
    stateUsps: "AK",
    districtCode: "00",
    sourceName: null,
    note: "At-large congressional district; code 00, and no NAME column exists in this product.",
  },
  {
    chamber: "congressional",
    geoid: "1198",
    stateUsps: "DC",
    districtCode: "98",
    sourceName: null,
    note: "District of Columbia delegate geography, published as code 98.",
  },
  {
    chamber: "congressional",
    geoid: "7298",
    stateUsps: "PR",
    districtCode: "98",
    sourceName: null,
    note: "Puerto Rico resident commissioner geography, published as code 98.",
  },
  {
    chamber: "congressional",
    geoid: "09ZZ",
    stateUsps: "CT",
    districtCode: "ZZ",
    sourceName: null,
    note: "Connecticut residual: territory assigned to no congressional district.",
  },
  {
    chamber: "congressional",
    geoid: "0101",
    stateUsps: "AL",
    districtCode: "01",
    sourceName: null,
    note: "An ordinary numbered congressional district.",
  },
  {
    chamber: "state-upper",
    geoid: "31001",
    stateUsps: "NE",
    districtCode: "001",
    sourceName: "State Senate District 1",
    note: "Nebraska's unicameral legislature is published in the upper-chamber file, under the Census's standard senate-district naming.",
  },
  {
    chamber: "state-lower",
    geoid: "01001",
    stateUsps: "AL",
    districtCode: "001",
    sourceName: "State House District 1",
    note: "An ordinary lower-chamber district.",
  },
  {
    chamber: "state-upper",
    geoid: "11001",
    stateUsps: "DC",
    districtCode: "001",
    sourceName: "Ward 1",
    note: "The District of Columbia's wards are published in the upper-chamber file.",
  },
  {
    chamber: "state-lower",
    geoid: "50A-1",
    stateUsps: "VT",
    districtCode: "A-1",
    sourceName: "Addison-1 State House District",
    note: "Vermont publishes hyphenated house-district codes; an alphanumeric-only grammar drops all 69 of them.",
  },
  {
    chamber: "state-lower",
    geoid: "25ZZZ",
    stateUsps: "MA",
    districtCode: "ZZZ",
    sourceName: "State House Districts not defined",
    note: "Massachusetts residual: territory assigned to no state house district.",
  },
];
