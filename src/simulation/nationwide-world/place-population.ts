import {
  censusDemographicObservation,
  decennialPopulation,
  populationReference,
  censusDemographics,
  representedPopulation,
} from "./represented-population";
import { lifePlaceByKey } from "../life-places";
import type { World } from "../types";
import acsPlaces from "../../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import {
  PLACE_POPULATION_META,
  PLACE_POPULATION_ROWS,
} from "./place-population.generated";

/** Annual incorporated-place observations stay separate from the game's
 * generated counts. CDPs, counties and territories use their own reference
 * sources and broad comparable distributions at the game reader boundary. */
let table: ReadonlyMap<string, number> | null = null;

function load(): ReadonlyMap<string, number> {
  if (table) return table;
  const map = new Map<string, number>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const colon = pair.indexOf(":");
    map.set(pair.slice(0, colon), Number(pair.slice(colon + 1)));
  }
  table = map;
  return table;
}

/** World-aware count when available; otherwise a researched reference anchor.
 * Missing observations use the national comparable distribution, never zero. */
export function placePopulation(placeGeoid: string, world?: World): number {
  const place = world
    ? (lifePlaceByKey(placeGeoid) ?? lifePlaceByKey(`county:${placeGeoid}`))
    : null;
  if (place && world)
    return representedPopulation(world, place.context.jurisdiction.id)
      .population;
  return (
    load().get(placeGeoid) ??
    populationReference(placeGeoid).population ??
    censusDemographics(placeGeoid, world).counts.population!
  );
}

/** Raw annual observation, for source classification and pre-world fixtures.
 * A missing observation is not an empty place or a generated population. */
export function placePopulationObservation(placeGeoid: string): number | null {
  return load().get(placeGeoid) ?? null;
}

let ranked: readonly number[] | null = null;

/**
 * The population of the place at `rank` (1 is the largest) among every place
 * the table holds, or null past the end of the table.
 */
export function populationAtRank(rank: number): number | null {
  ranked ??= [...load().values()].sort((a, b) => b - a);
  return ranked[rank - 1] ?? null;
}

/** How many towns the table covers. */
export function placePopulationCoverage(): number {
  return load().size;
}

export const PLACE_POPULATION_SOURCE = PLACE_POPULATION_META;

const ACS_PLACE_POPULATION = acsPlaces.places as Readonly<
  Record<string, number>
>;

/** Which published figure a town's reference population comes from. */
export type PlacePopulationSource =
  | "census-estimate-2025"
  | "acs-2020-2024"
  | "decennial-census-2020"
  | "island-census-2020"
  | "researched-calibration-anchor"
  | "researched-comparable-distribution";

/**
 * A town's reference population from its published figure or a labeled
 * comparable-distribution anchor where no observation exists.
 *
 * The Vintage 2025 estimate covers incorporated places only. A
 * census-designated place, such as Kittery, Maine, Urban Honolulu or East Los
 * Angeles, has no annual estimate; for those the Bureau publishes the American
 * Community Survey 2020-2024 five-year estimate (table B01003, in
 * `data/research/money/place-population-acs-2024.json`, the table the public
 * budgets already size those places by). The estimate wins where both exist.
 */
export function placeReferencePopulation(placeGeoid: string): {
  readonly value: number;
  readonly source: PlacePopulationSource;
} {
  const estimate = load().get(placeGeoid);
  if (estimate !== undefined)
    return { value: estimate, source: "census-estimate-2025" };
  const acs =
    censusDemographicObservation(placeGeoid)?.counts.population ??
    ACS_PLACE_POPULATION[placeGeoid];
  if (acs !== undefined && acs > 0)
    return { value: acs, source: "acs-2020-2024" };
  // A rolling survey zero does not erase residents enumerated by the Census.
  // A published annual zero above remains a real zero.
  const enumerated = decennialPopulation(placeGeoid)?.[0];
  if (enumerated !== undefined && Number.isFinite(enumerated) && enumerated > 0)
    return { value: enumerated, source: "decennial-census-2020" };
  const reference = populationReference(placeGeoid);
  return {
    value:
      reference.population ?? censusDemographics(placeGeoid).counts.population!,
    source:
      reference.source === "unknown"
        ? "researched-comparable-distribution"
        : reference.source,
  };
}
