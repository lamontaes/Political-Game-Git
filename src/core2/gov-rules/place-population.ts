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
import territoryPlaces from "../data/places/territory-places.json" with { type: "json" };
import acsPlaces from "../../../data/research/money/place-population-acs-2024.json" with { type: "json" };
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

/**
 * The American Community Survey's 2020-2024 five-year count for the places
 * the 2025 estimate leaves out (census-designated places and the like).
 */
const ACS_PLACE_POPULATION = acsPlaces.places as Readonly<
  Record<string, number>
>;

export type PlacePopulationSource =
  "census-estimate-2025" | "acs-2020-2024" | "census-2020-island-areas";

/** The 2020 Census count of each island-area village, by its Census GEOID. */
const ISLAND_AREA_POPULATION = new Map(
  (
    territoryPlaces.rows as unknown as readonly [
      string,
      string,
      string,
      string | null,
      string,
      number,
    ][]
  ).map((row) => [row[4], row[5]] as const),
);

/** The 2025 estimate where one exists, else the ACS count, else an island-area village's 2020 count, else null. */
export function placeReferencePopulation(
  placeGeoid: string,
): { readonly value: number; readonly source: PlacePopulationSource } | null {
  const estimate = placePopulation(placeGeoid);
  if (estimate !== null)
    return { value: estimate, source: "census-estimate-2025" };
  const acs = ACS_PLACE_POPULATION[placeGeoid];
  if (acs !== undefined) return { value: acs, source: "acs-2020-2024" };
  const island = ISLAND_AREA_POPULATION.get(placeGeoid);
  return island === undefined
    ? null
    : { value: island, source: "census-2020-island-areas" };
}
