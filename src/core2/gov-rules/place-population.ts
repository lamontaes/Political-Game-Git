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

import { parameter as p } from "../parameters";
import { worldLevel, worldOffsetShare } from "../world-draw";

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

/** The town's published reference population (calibration), or null where the game does not hold it. */
export function publishedPlacePopulation(placeGeoid: string): number | null {
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

/** The published count (calibration): the 2025 estimate where one exists, else the ACS count, else an island-area village's 2020 count, else null. */
export function publishedPlaceReferencePopulation(
  placeGeoid: string,
): { readonly value: number; readonly source: PlacePopulationSource } | null {
  const estimate = publishedPlacePopulation(placeGeoid);
  if (estimate !== null)
    return { value: estimate, source: "census-estimate-2025" };
  const acs = ACS_PLACE_POPULATION[placeGeoid];
  if (acs !== undefined) return { value: acs, source: "acs-2020-2024" };
  const island = ISLAND_AREA_POPULATION.get(placeGeoid);
  return island === undefined
    ? null
    : { value: island, source: "census-2020-island-areas" };
}

/** This world's count for a place whose published count is `published`: drawn around it once per world and place from the seed, whole and never below 1 (a place the Census holds as empty stays 0). */
function worldPopulationOf(
  placeGeoid: string,
  seed: string,
  published: number,
): number {
  if (!(published > p("zero"))) return published;
  const key = `world-place-population:${placeGeoid}`;
  const spread = "worldPopulationSpreadShare";
  const drawn = Math.max(
    p("one"),
    Math.round(worldLevel(published, seed, key, spread)),
  );
  // A small count can round back onto itself; step it one person the way
  // the world's offset points.
  if (drawn !== published || published < p("two")) return drawn;
  return worldOffsetShare(seed, key, spread) < p("zero")
    ? drawn - p("one")
    : drawn + p("one");
}

/**
 * The town's population in this world (realistic, not real; owner, Oct 27):
 * the published reference population is the center of a per-world spread, and
 * every engine that reads a town's size reads this, never the published count.
 */
export function placeReferencePopulation(
  placeGeoid: string,
  seed: string,
): { readonly value: number; readonly source: PlacePopulationSource } | null {
  const published = publishedPlaceReferencePopulation(placeGeoid);
  return published
    ? {
        value: worldPopulationOf(placeGeoid, seed, published.value),
        source: published.source,
      }
    : null;
}

/** This world's count from the Census estimate alone, or null where there is none. */
export function placePopulation(
  placeGeoid: string,
  seed: string,
): number | null {
  const published = publishedPlacePopulation(placeGeoid);
  return published === null
    ? null
    : worldPopulationOf(placeGeoid, seed, published);
}
