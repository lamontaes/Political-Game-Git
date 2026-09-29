import acsPlaces from "../../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import {
  PLACE_POPULATION_META,
  PLACE_POPULATION_ROWS,
} from "./place-population.generated";

/**
 * A town's population, where the game holds it.
 *
 * The Census Bureau's Vintage 2025 estimate for July 1, 2025, for every
 * incorporated place in the fifty states and D.C., keyed by 7-digit place
 * GEOID (research answer `place-population-today`). A place with no estimate
 * reads null, never 0; the few places the Census Bureau itself counts as 0
 * read 0.
 *
 * This is the reference figure the world starts from, not a live count. The
 * owner decided on 2026-09-23 that the game applies realistic drift at start
 * and then lets its own people and events move a town's size; how much drift
 * is not set yet, so no drift is applied here. Never show this number to the
 * player as the town's exact population today.
 *
 * Not covered: Urban Honolulu, a census-designated place, and Puerto Rico,
 * which has no incorporated places (its municipios are not game governments).
 */
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

/** The town's reference population, or null where the game does not hold it. */
export function placePopulation(placeGeoid: string): number | null {
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
export type PlacePopulationSource = "census-estimate-2025" | "acs-2020-2024";

/**
 * A town's reference population from the best figure the Census Bureau
 * publishes for it, or null where the game holds none.
 *
 * The Vintage 2025 estimate covers incorporated places only. A
 * census-designated place, such as Kittery, Maine, Urban Honolulu or East Los
 * Angeles, has no annual estimate; for those the Bureau publishes the American
 * Community Survey 2020-2024 five-year estimate (table B01003, in
 * `data/research/money/place-population-acs-2024.json`, the table the public
 * budgets already size those places by). The estimate wins where both exist.
 */
export function placeReferencePopulation(
  placeGeoid: string,
): { readonly value: number; readonly source: PlacePopulationSource } | null {
  const estimate = placePopulation(placeGeoid);
  if (estimate !== null)
    return { value: estimate, source: "census-estimate-2025" };
  const acs = ACS_PLACE_POPULATION[placeGeoid];
  return acs === undefined ? null : { value: acs, source: "acs-2020-2024" };
}
