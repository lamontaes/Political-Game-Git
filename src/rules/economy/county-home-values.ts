import type { EntityId } from "../../simulation/types";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import type { CountyHomeValue } from "../../simulation/county-home-value";
export interface CountyValueFacts {
  readonly countyRows: string;
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly countiesByGeoid: ReadonlyMap<string, readonly string[]>;
}
const countyReaders = new WeakMap<
  CountyValueFacts,
  (id: EntityId | null) => CountyHomeValue
>();
export function homeValueForJurisdiction(
  facts: CountyValueFacts,
  id: EntityId | null,
): CountyHomeValue {
  let read = countyReaders.get(facts);
  if (!read) {
    read = compileCountyValue(facts);
    countyReaders.set(facts, read);
  }
  return read(id);
}
// stopgapId: "economy.county-home-equal-weight"
function compileCountyValue(facts: CountyValueFacts) {
  const COUNTY_HOME_VALUE_ROWS = facts.countyRows;
  const lifePlaceByJurisdictionId = (id: EntityId) =>
    facts.places.get(id) ?? null;
  const countyGeoidsForPlace = (geoid: string) =>
    facts.countiesByGeoid.get(geoid) ?? [];
  type HomeValueBasis = "county" | "state" | "national";

  interface CountyHomeValue {
    readonly dollars: number;
    readonly basis: HomeValueBasis;
  }

  let countyTable: ReadonlyMap<string, number> | null = null;

  function counties(): ReadonlyMap<string, number> {
    if (countyTable) return countyTable;
    const map = new Map<string, number>();
    for (const row of COUNTY_HOME_VALUE_ROWS.split(";")) {
      const colon = row.indexOf(":");
      map.set(row.slice(0, colon), Number(row.slice(colon + 1)));
    }
    return (countyTable = map);
  }

  function median(values: readonly number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]!
      : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
  }

  function nationalMedianHomeValue(): number {
    return median([...counties().values()]);
  }

  function computeHomeValue(jurisdictionId: EntityId | null): CountyHomeValue {
    const place = jurisdictionId
      ? lifePlaceByJurisdictionId(jurisdictionId)
      : null;
    const geoid = place?.sourceGeoid ?? null;
    if (geoid) {
      const found = countyGeoidsForPlace(geoid)
        .map((county) => counties().get(county))
        .filter((value): value is number => value !== undefined);
      if (found.length > 0)
        return {
          dollars: Math.round(found.reduce((a, b) => a + b, 0) / found.length),
          basis: "county",
        };
      const stateFips = geoid.slice(0, 2);
      const inState = [...counties()]
        .filter(([county]) => county.startsWith(stateFips))
        .map(([, value]) => value);
      if (inState.length > 0)
        return { dollars: median(inState), basis: "state" };
    }
    return { dollars: nationalMedianHomeValue(), basis: "national" };
  }
  return computeHomeValue;
}
