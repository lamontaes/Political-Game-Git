/** Full retained household source-table parser, source precedence and count-share math. */
import type { EntityId } from "../../simulation/types";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
export interface HouseholdSourceFacts {
  readonly rows: string;
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
}
const readers = new WeakMap<HouseholdSourceFacts, ReturnType<typeof compile>>();
export function householdMixForJurisdiction(
  facts: HouseholdSourceFacts,
  id: EntityId | null,
) {
  let read = readers.get(facts);
  if (!read) {
    read = compile(facts);
    readers.set(facts, read);
  }
  return read(id);
}
// stopgapId: "economy.household-source-fallback"
type HouseholdShape =
  | "alone"
  | "couple"
  | "couple-with-children"
  | "parent-with-children"
  | "housemates";
type HouseholdMixBasis = "place" | "state" | "national";
export interface HouseholdMix {
  readonly shares: readonly (readonly [HouseholdShape, number])[];
  readonly basis: HouseholdMixBasis;
}
function compile(facts: HouseholdSourceFacts) {
  const HOUSEHOLD_SHAPE_ORDER: readonly HouseholdShape[] = [
    "alone",
    "couple",
    "couple-with-children",
    "parent-with-children",
    "housemates",
  ];
  let table: ReadonlyMap<string, readonly number[]> | null = null;
  function rows(): ReadonlyMap<string, readonly number[]> {
    if (table) return table;
    const map = new Map<string, readonly number[]>();
    for (const row of facts.rows.split(";")) {
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
  function readMix(jurisdictionId: EntityId | null): HouseholdMix {
    const geoid = jurisdictionId
      ? (facts.places.get(jurisdictionId)?.sourceGeoid ?? null)
      : null;
    if (geoid) {
      const place = rows().get(geoid);
      if (place && geoid.length === 7) return mixOf(place, "place");
      const state = rows().get(geoid.slice(0, 2));
      if (state) return mixOf(state, "state");
    }
    return mixOf(rows().get("US")!, "national");
  }
  return readMix;
}
