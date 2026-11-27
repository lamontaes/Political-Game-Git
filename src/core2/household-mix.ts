import { corePlaceByJurisdictionId } from "./place-lookup";
import mixData from "./data/household-mix.json" with { type: "json" };
import type { EntityId } from "./kernel/brands";

/** Where the counts came from, and how many geographies the survey gave and withheld. */
export const HOUSEHOLD_MIX_META = mixData.meta;

/** The shapes a town's households are drawn in. */
export type HouseholdShape =
  | "alone"
  | "couple"
  | "couple-with-children"
  | "parent-with-children"
  | "housemates";

/** In the order the generated rows list them. */
export const HOUSEHOLD_SHAPE_ORDER: readonly HouseholdShape[] = [
  "alone",
  "couple",
  "couple-with-children",
  "parent-with-children",
  "housemates",
];

/** Which record the shares came from, so no fallback reads as the town's own. */
export type HouseholdMixBasis = "place" | "state" | "national";

export interface HouseholdMix {
  /** Share of households of each shape, in `HOUSEHOLD_SHAPE_ORDER`, summing to 1. */
  readonly shares: readonly (readonly [HouseholdShape, number])[];
  readonly basis: HouseholdMixBasis;
}

let table: ReadonlyMap<string, readonly number[]> | null = null;

function rows(): ReadonlyMap<string, readonly number[]> {
  if (table) return table;
  const map = new Map<string, readonly number[]>();
  for (const [geography, ...counts] of mixData.rows as readonly (
    string | number
  )[][])
    map.set(geography as string, counts as number[]);
  return (table = map);
}

function mixOf(counts: readonly number[], basis: HouseholdMixBasis) {
  const total = counts.reduce((sum, n) => sum + n, 0);
  return {
    shares: HOUSEHOLD_SHAPE_ORDER.map(
      (shape, index) => [shape, counts[index]! / total] as const,
    ),
    basis,
  };
}

/**
 * What kinds of households a town has: the Census Bureau's 2020-2024
 * American Community Survey counts of households by shape (tables B11001 and
 * B11003), for the town itself, else its state, else the nation. Other
 * families with no children under 18 count as housemates. Never shown to the
 * player.
 */
export function householdMixForJurisdiction(
  jurisdictionId: EntityId | null,
): HouseholdMix {
  const geoid = jurisdictionId
    ? (corePlaceByJurisdictionId(jurisdictionId)?.sourceGeoid ?? null)
    : null;
  if (geoid) {
    const place = rows().get(geoid);
    if (place && geoid.length === 7) return mixOf(place, "place");
    const state = rows().get(geoid.slice(0, 2));
    if (state) return mixOf(state, "state");
  }
  return mixOf(rows().get("US")!, "national");
}
