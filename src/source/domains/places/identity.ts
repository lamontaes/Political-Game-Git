/**
 * Place GEOID grammar and official vectors.
 *
 * The vectors are official identifiers with their official published names and
 * classes. They are the oracle: a corpus that disagrees with them is wrong
 * regardless of how self-consistent it is.
 */

export const PLACE_GEOID_PATTERN = /^\d{2}\d{5}$/;
export const PLACE_GEOIDFQ_PREFIX = "1600000US";

export function isPlaceGeoid(value: string): boolean {
  return PLACE_GEOID_PATTERN.test(value);
}

export function placeGeoidFq(geoid: string): string {
  return `${PLACE_GEOIDFQ_PREFIX}${geoid}`;
}

export interface PlaceIdentityVector {
  readonly geoid: string;
  readonly stateUsps: string;
  readonly sourceName: string;
  readonly lsad: string;
  readonly note: string;
}

export const OFFICIAL_PLACE_VECTORS: readonly PlaceIdentityVector[] = [
  {
    geoid: "0100100",
    stateUsps: "AL",
    sourceName: "Abanda CDP",
    lsad: "57",
    note: "First record in the national file; a census designated place, LSAD 57.",
  },
  {
    geoid: "3651000",
    stateUsps: "NY",
    sourceName: "New York city",
    lsad: "25",
    note: "The largest incorporated place; LSAD 25 'city'.",
  },
  {
    geoid: "1150000",
    stateUsps: "DC",
    sourceName: "Washington city",
    lsad: "25",
    note: "The District of Columbia appears as a place as well as a state-equivalent.",
  },
  {
    geoid: "7276770",
    stateUsps: "PR",
    sourceName: "San Juan zona urbana",
    lsad: "62",
    note: "Puerto Rico zona urbana, LSAD 62 — a two-word class that exists in no state.",
  },
  {
    geoid: "0902690",
    stateUsps: "CT",
    sourceName: "Bantam borough",
    lsad: "21",
    note: "LSAD 21 borough; boroughs are places, not the county-equivalent boroughs of Alaska.",
  },
  {
    geoid: "0644000",
    stateUsps: "CA",
    sourceName: "Los Angeles city",
    lsad: "25",
    note: "Shares its name with Los Angeles County; place and county identity are separate universes.",
  },
  {
    geoid: "2743000",
    stateUsps: "MN",
    sourceName: "Minneapolis city",
    lsad: "25",
    note: "An ordinary large city, held as a stable mid-file vector.",
  },
];
