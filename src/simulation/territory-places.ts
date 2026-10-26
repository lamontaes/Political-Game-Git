/**
 * Where a life can start on Guam, the U.S. Virgin Islands, American Samoa and
 * the Northern Mariana Islands: the villages and towns of the Census 2020
 * Island Areas lists, read from the core's place data (one list, not two).
 * Each territory is its own government and electorate. Nothing here, or
 * anything that reads it, may lend a territory a state's rules.
 */
import territoryPlaces from "../core2/data/places/territory-places.json" with { type: "json" };

export const TERRITORY_PLACES_META = {
  asOf: null,
  source:
    "Census 2020 Island Areas Demographic and Housing Characteristics files",
  status: "approved",
} as const;

/** `[key, resident-facing name, USPS code, plain spelling for search, Census GEOID, 2020 population]`. */
export type TerritoryPlaceRow = readonly [
  key: string,
  displayName: string,
  usps: string,
  searchAlias: string | null,
  censusGeoid: string,
  population2020: number,
];

export const TERRITORY_PLACE_ROWS =
  territoryPlaces.rows as unknown as readonly TerritoryPlaceRow[];

/** The four territories this list seats. Puerto Rico is in the Gazetteer. */
export const PLACEHOLDER_TERRITORY_USPS: ReadonlySet<string> = new Set([
  "GU",
  "VI",
  "AS",
  "MP",
]);
