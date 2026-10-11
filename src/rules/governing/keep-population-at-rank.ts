// Lifted unchanged from src/simulation/nationwide-world/place-population.ts; RULES-3, 2026-10-11.
import { PLACE_POPULATION_ROWS } from "../../simulation/nationwide-world/place-population.generated";

export let table: ReadonlyMap<string, number> | null = null;

export function load(): ReadonlyMap<string, number> {
  if (table) return table;
  const map = new Map<string, number>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const colon = pair.indexOf(":");
    map.set(pair.slice(0, colon), Number(pair.slice(colon + 1)));
  }
  table = map;
  return table;
}

export let ranked: readonly number[] | null = null;

export function populationAtRank(rank: number): number | null {
  ranked ??= [...load().values()].sort((a, b) => b - a);
  return ranked[rank - 1] ?? null;
}
