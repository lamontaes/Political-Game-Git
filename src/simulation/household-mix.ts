import { lifePlaceByJurisdictionId } from "./life-places";
import {
  HOUSEHOLD_MIX_META,
  HOUSEHOLD_MIX_ROWS,
} from "./household-mix.generated";
import type { EntityId } from "./types";

export { HOUSEHOLD_MIX_META };

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
  for (const row of HOUSEHOLD_MIX_ROWS.split(";")) {
    const colon = row.indexOf(":");
    map.set(
      row.slice(0, colon),
      row
        .slice(colon + 1)
        .split(",")
        .map(Number),
    );
  }
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
    ? (lifePlaceByJurisdictionId(jurisdictionId)?.sourceGeoid ?? null)
    : null;
  if (geoid) {
    const place = rows().get(geoid);
    if (place && geoid.length === 7) return mixOf(place, "place");
    const state = rows().get(geoid.slice(0, 2));
    if (state) return mixOf(state, "state");
  }
  return mixOf(rows().get("US")!, "national");
}
