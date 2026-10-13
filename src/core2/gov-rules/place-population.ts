/**
 * A town's population, where the game holds it. Ported from the old engine's
 * `nationwide-world/place-population.ts`, reading the same rows from their
 * JSON table (`data/tables/place-population.json`).
 *
 * The Census Bureau's Vintage 2025 estimate for July 1, 2025, for every
 * incorporated place in the fifty states and D.C., keyed by 7-digit place
 * GEOID. A place with no estimate reads null, never 0; the few places the
 * Census Bureau itself counts as 0 read 0. This is the reference figure the
 * world starts from, not a live count.
 */
import placePopulationTable from "../../../data/tables/place-population.json" with { type: "json" };

let table: ReadonlyMap<string, number> | null = null;

function load(): ReadonlyMap<string, number> {
  if (table) return table;
  const map = new Map<string, number>();
  for (const pair of placePopulationTable.PLACE_POPULATION_ROWS.split(";")) {
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
