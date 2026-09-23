/**
 * A town's resident population today, where the game holds it.
 *
 * EMPTY TODAY. No place-level population ships with the game: the only
 * population series is BEA's county headcount, which a city is never given in
 * place of its own. The owner asked on 2026-09-22 that starting figures be
 * accurate to today, and on 2026-09-23 made a rule that turns on a city's size
 * (see `local-chief-executive-rules.ts`), so the table is the one place that
 * rule reads. PLACEHOLDER pending research question `place-population-today`:
 * the Census Bureau's current population estimate for every incorporated
 * place, keyed by the 7-digit place GEOID. Until it lands, every town reads as
 * of unknown size and nothing that depends on size is applied.
 */
const PLACE_POPULATION: ReadonlyMap<string, number> = new Map();

/** The town's population, or null where the game does not hold it. */
export function placePopulation(placeGeoid: string): number | null {
  return PLACE_POPULATION.get(placeGeoid) ?? null;
}

/** How many towns the table covers, so a test can see it is still empty. */
export function placePopulationCoverage(): number {
  return PLACE_POPULATION.size;
}
