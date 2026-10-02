import { countyGeoidsForPlace } from "../government-units";
import { COUNTY_PLACE_POPULATION_ROWS } from "./county-place-population.generated";

export { COUNTY_PLACE_POPULATION_META } from "./county-place-population.generated";

type CountyPart = readonly [countyGeoid: string, population: number];
let partsByPlace: ReadonlyMap<string, readonly CountyPart[]> | null = null;

/**
 * Population shares inside each county, from Census Day 2020 county parts.
 * Applied to the game's newer place total without inventing newer boundaries
 * or migration between the parts. Null shares mean a measured zero total;
 * an empty list means the existing geography does not cover this place.
 * These are geographic areas, not permission to exercise county authority.
 */
export function countyPopulationSharesForPlace(
  placeGeoid: string,
): readonly (readonly [countyGeoid: string, share: number | null])[] {
  partsByPlace ??= new Map(
    JSON.parse(COUNTY_PLACE_POPULATION_ROWS) as [string, CountyPart[]][],
  );
  const parts = partsByPlace.get(placeGeoid);
  if (!parts) {
    const counties = countyGeoidsForPlace(placeGeoid);
    return counties.length === 1 ? [[counties[0]!, 1]] : [];
  }
  const population = parts.reduce((sum, [, people]) => sum + people, 0);
  return parts.map(([county, people]) => [
    county,
    population > 0 ? people / population : null,
  ]);
}
