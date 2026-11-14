/**
 * The year of community events by place type. The type comes from the
 * place's population (the world's reference count, never a name), so every
 * place resolves and no town is named in logic. Events and seasons are data
 * in `src/core2/data/world/community-events.json`, each row SOURCED or ESTIMATED.
 */
import table from "./data/world/community-events.json" with { type: "json" };
import { corePlaceByKey } from "./place-lookup";
import { publishedPlaceReferencePopulation } from "./gov-rules/place-population";

export interface CommunityEvent {
  readonly id: string;
  readonly name: string;
  readonly rule: Readonly<Record<string, unknown>>;
  readonly types: readonly string[];
  readonly scaleByType: Readonly<Record<string, number>>;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly source: string;
}

export const COMMUNITY_PLACE_TYPES = table.placeTypes.map((row) => row.id);

/** The type for a population: the first band it falls below. */
export function communityPlaceTypeForPopulation(population: number): string {
  for (const band of table.placeTypes)
    if (band.belowPopulation === null || population < band.belowPopulation)
      return band.id;
  return table.placeTypes[table.placeTypes.length - 1]!.id;
}

/**
 * The type of a place by key. A place the Census holds no count for reads as
 * the smallest type (an estimate, never unknown).
 */
export function communityPlaceType(placeKey: string): string {
  const geoid = corePlaceByKey(placeKey)?.sourceGeoid;
  const known = geoid ? publishedPlaceReferencePopulation(geoid) : null;
  return communityPlaceTypeForPopulation(known?.value ?? 0);
}

/** The events a place type holds across the year. */
export function communityEventsFor(type: string): readonly CommunityEvent[] {
  return (table.events as unknown as readonly CommunityEvent[]).filter((row) =>
    row.types.includes(type),
  );
}
