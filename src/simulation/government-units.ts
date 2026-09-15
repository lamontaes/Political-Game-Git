/**
 * The Census Bureau's 2025 general-purpose governments, as identities.
 *
 * Every county, municipality and township the 2025 Government Units listing
 * carries, read once from the generated index. An entry says a government
 * exists, what kind it is, which state it is in, which county area it sits in
 * and — for a municipality only, and only where the national places corpus
 * confirms it — which Census place it governs.
 *
 * It says nothing else. A form of government, a council size, a power or a
 * rule is not here and is never inferred from a name or a type; those come
 * from the rule domains through the capability resolver. A statistical place
 * with no government of its own (a census-designated place) has no entry, and
 * the lookup returns nothing for it rather than a fictional city.
 */

import {
  GOVERNMENT_UNITS_META,
  GOVERNMENT_UNITS_ROWS,
} from "./government-units.generated";
import {
  PLACE_COUNTY_RELATIONS_META,
  PLACE_COUNTY_RELATIONS_ROWS,
} from "./place-county-relations.generated";

export { GOVERNMENT_UNITS_META, PLACE_COUNTY_RELATIONS_META };

export type GovernmentUnitType = "county" | "municipality" | "township";

export interface GovernmentUnitIdentity {
  /** `gus2025:<PID6>`; the publisher's identifier, never a name. */
  readonly id: string;
  readonly publisherId: string;
  /** The publisher's own name for the unit, verbatim. */
  readonly name: string;
  readonly unitType: GovernmentUnitType;
  readonly stateUsps: string;
  /** The county AREA the unit sits in (5-digit GEOID); not a governing parent. */
  readonly countyGeoid: string | null;
  /** The Census place a municipality governs, where the places corpus confirms it. */
  readonly placeGeoid: string | null;
  /** A township's publisher place code, kept for audit; not a verified place. */
  readonly publisherPlaceCode: string | null;
  readonly functionalActive: boolean;
  readonly asOf: typeof GOVERNMENT_UNITS_META.asOf;
}

type Row = [
  string,
  string,
  1 | 2 | 3,
  string,
  string | null,
  string | null,
  string | null,
  0 | 1,
];

const TYPES: Readonly<Record<1 | 2 | 3, GovernmentUnitType>> = {
  1: "county",
  2: "municipality",
  3: "township",
};

interface Index {
  readonly byId: ReadonlyMap<string, GovernmentUnitIdentity>;
  readonly byPlace: ReadonlyMap<string, readonly GovernmentUnitIdentity[]>;
  readonly byState: ReadonlyMap<string, readonly GovernmentUnitIdentity[]>;
  readonly byCounty: ReadonlyMap<string, GovernmentUnitIdentity>;
}

let index: Index | null = null;

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function load(): Index {
  if (index) return index;
  const byId = new Map<string, GovernmentUnitIdentity>();
  const byPlace = new Map<string, GovernmentUnitIdentity[]>();
  const byState = new Map<string, GovernmentUnitIdentity[]>();
  const byCounty = new Map<string, GovernmentUnitIdentity>();
  for (const row of JSON.parse(GOVERNMENT_UNITS_ROWS) as Row[]) {
    const unit: GovernmentUnitIdentity = {
      id: `gus2025:${row[0]}`,
      publisherId: row[0],
      name: row[1],
      unitType: TYPES[row[2]],
      stateUsps: row[3],
      countyGeoid: row[4],
      placeGeoid: row[5],
      publisherPlaceCode: row[6],
      functionalActive: row[7] === 1,
      asOf: GOVERNMENT_UNITS_META.asOf,
    };
    byId.set(unit.id, unit);
    push(byState, unit.stateUsps, unit);
    if (unit.placeGeoid) push(byPlace, unit.placeGeoid, unit);
    if (unit.unitType === "county" && unit.countyGeoid) {
      byCounty.set(unit.countyGeoid, unit);
    }
  }
  index = { byId, byPlace, byState, byCounty };
  return index;
}

/** One government by its `gus2025:<PID6>` id, or null. */
export function governmentUnit(id: string): GovernmentUnitIdentity | null {
  return load().byId.get(id) ?? null;
}

/** The municipal government(s) of a Census place; empty for a statistical place. */
export function governmentUnitsForPlace(
  placeGeoid: string,
): readonly GovernmentUnitIdentity[] {
  return load().byPlace.get(placeGeoid) ?? [];
}

/** Every general-purpose government the listing carries for one state. */
export function governmentUnitsForState(
  stateUsps: string,
): readonly GovernmentUnitIdentity[] {
  return load().byState.get(stateUsps) ?? [];
}

/**
 * The county government whose area has this GEOID, if the county has one.
 * Some county areas (consolidated or dissolved counties, independent cities'
 * county equivalents) have no county government in the listing.
 */
export function countyGovernmentUnit(
  countyGeoid: string,
): GovernmentUnitIdentity | null {
  return load().byCounty.get(countyGeoid) ?? null;
}

export interface CountyGovernmentShare {
  readonly unit: GovernmentUnitIdentity;
  /** The part of the place's 2020 land area lying in this county's area. */
  readonly landAreaShare: number;
}

let partsByPlace: ReadonlyMap<
  string,
  readonly (readonly [string, number])[]
> | null = null;

function loadPlaceCountyParts(): ReadonlyMap<
  string,
  readonly (readonly [string, number])[]
> {
  if (partsByPlace) return partsByPlace;
  const map = new Map<string, [string, number][]>();
  for (const [place, county, land] of JSON.parse(
    PLACE_COUNTY_RELATIONS_ROWS,
  ) as [string, string, number][]) {
    push(map, place, [county, land]);
  }
  partsByPlace = map;
  return partsByPlace;
}

/**
 * The county governments whose areas a Census place lies in, with the share of
 * the place's land in each.
 *
 * Read from the 2020 redistricting files' place-within-county parts, so a place
 * across four counties returns four entries, largest share first; nothing
 * picks one. A part whose county area has no county government in the 2025
 * listing (a Virginia independent city, a consolidated city-county the listing
 * files as a municipality, Connecticut) contributes no entry, so shares sum to
 * less than one when only some parts have one, and the result is empty when
 * none do or the place is not in the 2020 files.
 */
export function countyGovernmentUnitsForPlace(
  placeGeoid: string,
): readonly CountyGovernmentShare[] {
  const parts = loadPlaceCountyParts().get(placeGeoid) ?? [];
  const placeLand = parts.reduce((sum, [, land]) => sum + land, 0);
  const shares: CountyGovernmentShare[] = [];
  for (const [countyGeoid, land] of parts) {
    const unit = countyGovernmentUnit(countyGeoid);
    if (unit) shares.push({ unit, landAreaShare: land / placeLand });
  }
  return shares.sort(
    (left, right) =>
      right.landAreaShare - left.landAreaShare ||
      left.unit.id.localeCompare(right.unit.id),
  );
}

/** Every unit, in publisher id order. */
export function allGovernmentUnits(): readonly GovernmentUnitIdentity[] {
  return [...load().byId.values()];
}
