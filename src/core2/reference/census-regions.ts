/**
 * The Census Bureau's four statistical regions. An institutional
 * classification used only to share a regional political factor; it says
 * nothing about any state's politics.
 */
export const CENSUS_REGIONS_SOURCE =
  "https://www2.census.gov/geo/pdfs/maps-data/maps/reference/us_regdiv.pdf";

export type CensusRegion = "northeast" | "midwest" | "south" | "west";

export const CENSUS_REGION_ORDER: readonly CensusRegion[] = [
  "northeast",
  "midwest",
  "south",
  "west",
];

const MEMBERS: Readonly<Record<CensusRegion, readonly string[]>> = {
  northeast: ["CT", "MA", "ME", "NH", "NJ", "NY", "PA", "RI", "VT"],
  midwest: [
    "IA",
    "IL",
    "IN",
    "KS",
    "MI",
    "MN",
    "MO",
    "ND",
    "NE",
    "OH",
    "SD",
    "WI",
  ],
  south: [
    "AL",
    "AR",
    "DC",
    "DE",
    "FL",
    "GA",
    "KY",
    "LA",
    "MD",
    "MS",
    "NC",
    "OK",
    "SC",
    "TN",
    "TX",
    "VA",
    "WV",
  ],
  west: [
    "AK",
    "AZ",
    "CA",
    "CO",
    "HI",
    "ID",
    "MT",
    "NM",
    "NV",
    "OR",
    "UT",
    "WA",
    "WY",
  ],
};

const BY_STATE: ReadonlyMap<string, CensusRegion> = new Map(
  CENSUS_REGION_ORDER.flatMap((region) =>
    MEMBERS[region].map((usps) => [usps, region] as const),
  ),
);

export function censusRegionOf(stateUsps: string): CensusRegion {
  const region = BY_STATE.get(stateUsps);
  if (!region) throw new Error(`No Census region for ${stateUsps}.`);
  return region;
}

/** Fifty states plus DC, sorted. */
export function censusRegionStates(): readonly string[] {
  return [...BY_STATE.keys()].sort();
}
