// Lifted unchanged from src/simulation/government-units.ts; RULES-3, 2026-10-11.
import { PLACE_COUNTY_RELATIONS_ROWS } from "../../simulation/place-county-relations.generated";

export function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export let partsByPlace: ReadonlyMap<
  string,
  readonly (readonly [county: string, land: number, population: number])[]
> | null = null;

export function loadPlaceCountyParts(): ReadonlyMap<
  string,
  readonly (readonly [county: string, land: number, population: number])[]
> {
  if (partsByPlace) return partsByPlace;
  const map = new Map<string, [string, number, number][]>();
  for (const [place, county, land, population] of JSON.parse(
    PLACE_COUNTY_RELATIONS_ROWS,
  ) as [string, string, number, number][]) {
    push(map, place, [county, land, population]);
  }
  partsByPlace = map;
  return partsByPlace;
}

export function countyGeoidsForPlace(placeGeoid: string): readonly string[] {
  return [...(loadPlaceCountyParts().get(placeGeoid) ?? [])]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([countyGeoid]) => countyGeoid);
}
