/**
 * The HUD Fair Market Rent row for a place, and the bedrooms a household
 * leases. Moved from the old engine's `living-world/town-rent.ts`; read by
 * the opening, births and the shelter stand-in.
 */
import { countyGeoidsForPlace } from "./reference/government-units";
import {
  TOWN_RENT_COUNTIES,
  TOWN_RENT_META,
  TOWN_RENT_STATES,
  TOWN_RENT_TOWNS,
} from "./reference/town-rent.generated";
import { corePlaceByJurisdictionId } from "./place-lookup";
import type { EntityId } from "./kernel/brands";

// ─── HUD rents ──────────────────────────────────────────────────────────

export interface HudRentRow {
  /** Fair Market Rent, dollars a month, efficiency through four bedrooms. */
  readonly rents: readonly [number, number, number, number, number];
  /** Very low (50%) income limit for a family of four, dollars a year. */
  readonly veryLow4: number | null;
  readonly low4: number | null;
  readonly population: number | null;
  /** The HUD area it was read from: a county code, or county and town. */
  readonly area: string;
  /** Whether this row is an estimate composed from published HUD areas. */
  readonly estimated: boolean;
  /** Source and scaling basis for an estimate; kept out of player text. */
  readonly estimateBasis: string | null;
}

function parseRow(
  area: string,
  cells: string,
  estimateBasis: string | null = null,
): HudRentRow {
  const values = cells
    .split("/")
    .map((cell) => (cell === "" ? null : Number(cell)));
  return {
    area,
    rents: [
      values[0] ?? 0,
      values[1] ?? 0,
      values[2] ?? 0,
      values[3] ?? 0,
      values[4] ?? 0,
    ],
    veryLow4: values[5] ?? null,
    low4: values[6] ?? null,
    population: values[7] ?? null,
    estimated: estimateBasis !== null,
    estimateBasis,
  };
}

let countyRows: ReadonlyMap<string, HudRentRow> | null = null;
let townRows: ReadonlyMap<string, readonly [string, HudRentRow][]> | null =
  null;
let stateRows: ReadonlyMap<string, HudRentRow> | null = null;
function loadRows() {
  if (countyRows && townRows && stateRows) return;
  const counties = new Map<string, HudRentRow>();
  for (const entry of TOWN_RENT_COUNTIES.split(";")) {
    const [county, cells] = entry.split(":") as [string, string];
    counties.set(county, parseRow(county, cells));
  }
  const towns = new Map<string, [string, HudRentRow][]>();
  for (const entry of TOWN_RENT_TOWNS.split(";")) {
    const split = entry.lastIndexOf(":");
    const key = entry.slice(0, split);
    const [county, town] = key.split("|") as [string, string];
    const list = towns.get(county) ?? [];
    list.push([town, parseRow(key, entry.slice(split + 1))]);
    towns.set(county, list);
  }
  const states = new Map<string, HudRentRow>();
  for (const entry of TOWN_RENT_STATES.split(";")) {
    const split = entry.indexOf(":");
    const state = entry.slice(0, split);
    const vintage =
      TOWN_RENT_META.fairMarketRents.match(/HUD (FY\d+)/)?.[1] ?? "published";
    const basis = `ESTIMATED FROM AVERAGE: no HUD county link for this playable place; population-weighted HUD ${vintage} county rents for ${state}.`;
    states.set(
      state,
      parseRow(`state:${state}`, entry.slice(split + 1), basis),
    );
  }
  countyRows = counties;
  townRows = towns;
  stateRows = states;
}

/**
 * A state's population-weighted HUD rents, marked estimated; a territory HUD
 * has no row for takes the average of the states' rows.
 */
export function hudStateRentRow(stateKey: string): HudRentRow {
  loadRows();
  const own = stateRows!.get(stateKey.replace(/^US-/, ""));
  if (own) return own;
  const rows = [...stateRows!.values()];
  return {
    area: "states",
    rents: [0, 1, 2, 3, 4].map((bedrooms) =>
      Math.round(
        rows.reduce((sum, row) => sum + row.rents[bedrooms]!, 0) / rows.length,
      ),
    ) as unknown as HudRentRow["rents"],
    veryLow4: null,
    low4: null,
    population: null,
    estimated: true,
    estimateBasis:
      "ESTIMATED FROM AVERAGE: HUD publishes no row for this place; the average of the states' population-weighted HUD rents.",
  };
}

const TOWN_SUFFIX = / (town|city|village|plantation|borough|gore|grant)$/i;

/**
 * The HUD row for a place: its county's, or where HUD publishes a New England
 * county's towns instead, the town of the same name, else the towns weighed
 * by population. A playable place without a Census county link uses its
 * population-weighted same-state or territory HUD baseline, marked estimated.
 */
export function hudRentRowFor(jurisdictionId: EntityId): HudRentRow | null {
  const place = corePlaceByJurisdictionId(jurisdictionId);
  const geoid =
    place?.sourceGeoid && /^\d{7}$/.test(place.sourceGeoid)
      ? place.sourceGeoid
      : null;
  if (!place) return null;
  loadRows();
  const state = place.stateJurisdictionKey?.replace(/^US-/, "") ?? null;
  const countiesForPlace = geoid ? countyGeoidsForPlace(geoid) : [];
  for (const county of countiesForPlace) {
    const whole = countyRows!.get(county);
    if (whole) return whole;
    const towns = townRows!.get(county);
    if (!towns || towns.length === 0) continue;
    const name = (place.displayName.split(",")[0] ?? "").trim().toLowerCase();
    const same = towns.find(
      ([town]) => town.replace(TOWN_SUFFIX, "").toLowerCase() === name,
    );
    if (same) return same[1];
    const weighted = populationWeightedTownRow(county, towns);
    if (weighted) return weighted;
  }
  return state ? (stateRows!.get(state) ?? null) : null;
}

function populationWeightedTownRow(
  county: string,
  towns: readonly [string, HudRentRow][],
): HudRentRow | null {
  let weight = 0;
  const rents = [0, 0, 0, 0, 0];
  let veryLow = 0;
  let low = 0;
  let limitWeight = 0;
  for (const [, row] of towns) {
    const w = Math.max(1, row.population ?? 1);
    weight += w;
    row.rents.forEach((rent, index) => (rents[index]! += rent * w));
    if (row.veryLow4 !== null && row.low4 !== null) {
      veryLow += row.veryLow4 * w;
      low += row.low4 * w;
      limitWeight += w;
    }
  }
  if (weight === 0) return null;
  const basis = `ESTIMATED FROM AVERAGE: no HUD town row for this place; population-weighted HUD FY2025 town rents in county ${county}.`;
  return {
    area: county,
    rents: rents.map((sum) => Math.round(sum / weight)) as unknown as [
      number,
      number,
      number,
      number,
      number,
    ],
    veryLow4: limitWeight > 0 ? Math.round(veryLow / limitWeight) : null,
    low4: limitWeight > 0 ? Math.round(low / limitWeight) : null,
    population: null,
    estimated: true,
    estimateBasis: basis,
  };
}

/**
 * Representative occupancy rule for a first lease, not measured unit geometry.
 * Preserve the existing two-people-per-bedroom rule and HUD table's 0–4 range.
 * Once recorded, the home's bedrooms survive later leases and renewals.
 */
export function bedroomsForHousehold(people: number): number {
  if (!Number.isSafeInteger(people) || people < 1)
    throw new Error("First lease requires recorded household members");
  return people === 1 ? 0 : Math.min(4, Math.ceil(people / 2));
}
