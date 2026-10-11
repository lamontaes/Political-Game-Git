// Lifted unchanged from src/simulation/government-units.ts; RULES-3, 2026-10-11.
import {
  GOVERNMENT_UNITS_META,
  GOVERNMENT_UNITS_ROWS,
} from "../../simulation/government-units.generated";
import { PLACE_COUNTY_RELATIONS_ROWS } from "../../simulation/place-county-relations.generated";

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

export type Row = [
  string,
  string,
  1 | 2 | 3,
  string,
  string | null,
  string | null,
  string | null,
  0 | 1,
];

export const TYPES: Readonly<Record<1 | 2 | 3, GovernmentUnitType>> = {
  1: "county",
  2: "municipality",
  3: "township",
};

export interface Index {
  readonly byId: ReadonlyMap<string, GovernmentUnitIdentity>;
  readonly byPlace: ReadonlyMap<string, readonly GovernmentUnitIdentity[]>;
  readonly byState: ReadonlyMap<string, readonly GovernmentUnitIdentity[]>;
  readonly byCounty: ReadonlyMap<string, GovernmentUnitIdentity>;
}

export let index: Index | null = null;

export function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function load(): Index {
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
