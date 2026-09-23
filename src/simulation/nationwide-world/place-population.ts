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

/** How many towns the table covers. */
export function placePopulationCoverage(): number {
  return load().size;
}

export const PLACE_POPULATION_SOURCE = PLACE_POPULATION_META;
