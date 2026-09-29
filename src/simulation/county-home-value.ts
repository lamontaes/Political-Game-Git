import { countyGeoidsForPlace } from "./government-units";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  COUNTY_HOME_VALUE_META,
  COUNTY_HOME_VALUE_ROWS,
} from "./county-home-value.generated";
import type { EntityId } from "./types";

export { COUNTY_HOME_VALUE_META };

/**
 * What a home costs where the player lives.
 *
 * The median value of an owner-occupied home in the county, from the Census
 * Bureau's 2020-2024 American Community Survey (table B25077), locked in
 * `data/source/acs-county-housing-commute`. A town in several counties
 * takes the mean of their medians, evenly, as the town's employment mix
 * does. A county the survey withheld falls back to the median of its state's
 * published counties, and a place with no county at all to the median of
 * every published county. The `basis` says which, so nothing reads a
 * fallback as the town's own figure.
 *
 * The survey's dollars are 2020-2024 dollars. The game treats them as the
 * price in the world's first month, which is how the home-purchase terms
 * have always been read (the world's own price level moves them from there).
 */
export type HomeValueBasis = "county" | "state" | "national";

export interface CountyHomeValue {
  readonly dollars: number;
  readonly basis: HomeValueBasis;
}

let countyTable: ReadonlyMap<string, number> | null = null;

function counties(): ReadonlyMap<string, number> {
  if (countyTable) return countyTable;
  const map = new Map<string, number>();
  for (const row of COUNTY_HOME_VALUE_ROWS.split(";")) {
    const colon = row.indexOf(":");
    map.set(row.slice(0, colon), Number(row.slice(colon + 1)));
  }
  return (countyTable = map);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

/** The median of every published county: the fallback with no place. */
export function nationalMedianHomeValue(): number {
  return median([...counties().values()]);
}

/**
 * The home value for a place the game lives in; the nation's when the place
 * is unknown or is not in a county the survey covers.
 */
export function homeValueForJurisdiction(
  jurisdictionId: EntityId | null,
): CountyHomeValue {
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  const geoid = place?.sourceGeoid ?? null;
  if (geoid) {
    const found = countyGeoidsForPlace(geoid)
      .map((county) => counties().get(county))
      .filter((value): value is number => value !== undefined);
    if (found.length > 0)
      return {
        dollars: Math.round(found.reduce((a, b) => a + b, 0) / found.length),
        basis: "county",
      };
    const stateFips = geoid.slice(0, 2);
    const inState = [...counties()]
      .filter(([county]) => county.startsWith(stateFips))
      .map(([, value]) => value);
    if (inState.length > 0) return { dollars: median(inState), basis: "state" };
  }
  return { dollars: nationalMedianHomeValue(), basis: "national" };
}
