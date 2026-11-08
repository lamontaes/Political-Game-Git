/**
 * The one place map and its one reader. Every place (the country, a state,
 * D.C. or territory, a county area, a town) is one row of
 * `data/places/place-map.json`: its level, what it sits under, its name and
 * its form of government. Every system reads where a place is, what it sits
 * under and which laws, budget, offices and election calendar it has through
 * this module, never a lookup of its own.
 *
 */
import mapData from "./data/places/place-map.json" with { type: "json" };
import {
  corePlaceByJurisdictionId,
  corePlaceByKey,
  coreStateKeyOfJurisdictionId,
} from "./place-lookup";
import {
  countyGeoidsForPlace,
  countyLandSharesForPlace,
  countyPopulationSharesForPlace,
} from "./reference/government-units";

export type PlaceLevel = "country" | "state" | "county" | "town";

export interface PlaceRow {
  readonly id: string;
  readonly level: PlaceLevel;
  readonly parentId: string | null;
  readonly name: string;
  /** The government the place has: nation, state, district, territory, county, municipality, township or none. */
  readonly form: string;
}

let byId: ReadonlyMap<string, PlaceRow> | null = null;
let childrenOf: ReadonlyMap<string, readonly string[]> | null = null;

function load(): ReadonlyMap<string, PlaceRow> {
  if (byId) return byId;
  const rows = new Map<string, PlaceRow>();
  const kids = new Map<string, string[]>();
  for (const [id, level, parentId, name, form] of mapData.rows as [
    string,
    PlaceLevel,
    string | null,
    string,
    string,
  ][]) {
    rows.set(id, { id, level, parentId, name, form });
    if (parentId !== null) {
      const list = kids.get(parentId);
      if (list) list.push(id);
      else kids.set(parentId, [id]);
    }
  }
  childrenOf = kids;
  byId = rows;
  return rows;
}

/** Every place, country first, then states, counties and towns. */
export function allPlaces(): readonly PlaceRow[] {
  return [...load().values()];
}

/** One place by its id (a town's key, `county:<geoid>`, `US-<usps>` or `US`). */
export function placeRow(id: string): PlaceRow | null {
  return load().get(id) ?? null;
}

/** The places that sit directly under one place. */
export function placesUnder(id: string): readonly PlaceRow[] {
  load();
  return (childrenOf!.get(id) ?? []).map((child) => load().get(child)!);
}

/** What a place sits under, or null for the country. */
export function placeParent(id: string): PlaceRow | null {
  const parent = placeRow(id)?.parentId;
  return parent ? placeRow(parent) : null;
}

/** The place itself, then each place above it, up to the country. */
export function placeChain(id: string): readonly PlaceRow[] {
  const chain: PlaceRow[] = [];
  for (let row = placeRow(id); row; row = placeParent(row.id)) chain.push(row);
  return chain;
}

/** The state (or D.C. or territory) a place is in, as its row. */
export function placeState(id: string): PlaceRow | null {
  return placeChain(id).find((row) => row.level === "state") ?? null;
}

/**
 * The jurisdiction key ("US-GA") of the state a place is in, for any way the
 * game names a place: a town's key, a county id, a state's own key, or a
 * recorded jurisdiction id. Null where the place is in no state.
 */
export function placeStateKey(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const row = placeRow(ref);
  if (row) return placeState(ref)?.id ?? null;
  return (
    corePlaceByJurisdictionId(ref as never)?.stateJurisdictionKey ??
    coreStateKeyOfJurisdictionId(ref)
  );
}

/** The map's own county for a town named by its Census place code, as a five-digit code. */
function parentCountyGeoid(geoid: string): string | undefined {
  return placeCounty(geoid)?.id.slice("county:".length);
}

/**
 * The county areas a Census place lies in, largest land share first, for the
 * systems that weigh a place across its counties. Where the Census files hold
 * no county parts for a place (Puerto Rico's), its one county on the map.
 */
export function placeCountyGeoids(geoid: string): readonly string[] {
  const own = countyGeoidsForPlace(geoid);
  if (own.length > 0) return own;
  const parent = parentCountyGeoid(geoid);
  return parent ? [parent] : [];
}

/** The same counties with the share of the place's land in each. */
export function placeCountyLandShares(
  geoid: string,
): readonly (readonly [countyGeoid: string, share: number])[] {
  const own = countyLandSharesForPlace(geoid);
  if (own.length > 0) return own;
  const parent = parentCountyGeoid(geoid);
  return parent ? [[parent, 1]] : [];
}

/** The same counties with the share of the place's people in each (null where a multi-county place has no count). */
export function placeCountyPopulationShares(
  geoid: string,
): readonly (readonly [countyGeoid: string, share: number | null])[] {
  const own = countyPopulationSharesForPlace(geoid);
  if (own.length > 0) return own;
  const parent = parentCountyGeoid(geoid);
  return parent ? [[parent, 1]] : [];
}

/** The jurisdiction id a world records for a town named by its place key, or undefined. */
export function placeJurisdictionId(
  placeKey: string | null | undefined,
): string | undefined {
  return placeKey
    ? corePlaceByKey(placeKey)?.context.jurisdiction.id
    : undefined;
}

/** The county area a place sits in, or null where the map holds none. */
export function placeCounty(id: string): PlaceRow | null {
  return placeChain(id).find((row) => row.level === "county") ?? null;
}

/**
 * The nearest row (the place itself or one above it) that has a government.
 * A place with no government of its own is governed by the row it sits under.
 */
export function governingPlace(id: string): PlaceRow | null {
  return placeChain(id).find((row) => row.form !== "none") ?? null;
}
