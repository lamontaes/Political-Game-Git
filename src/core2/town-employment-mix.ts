/**
 * The sourced employment mix of a town: private sectors from its counties
 * (Census 2023 County Business Patterns), public employment from its state
 * (BLS May 2025 state ownership estimates), and the workplaces that stand for
 * each sector. Moved from the old engine's town-employment so the opening
 * reads it without the old world type. Which workplaces stand for a sector,
 * and in what shares, are GAME ASSUMPTIONS.
 */

import { corePlaceByJurisdictionId } from "./place-lookup";
import { countyGeoidsForPlace } from "./reference/government-units";
import {
  COUNTY_SECTOR_EMPLOYMENT,
  STATE_PUBLIC_EMPLOYMENT,
  TOWN_EMPLOYMENT_META,
} from "./reference/town-employment.generated";
import type { EntityId } from "./kernel/brands";

type Sector = (typeof TOWN_EMPLOYMENT_META.sectors)[number];
type LocalGroup = (typeof TOWN_EMPLOYMENT_META.localGroups)[number];

let countyTable: ReadonlyMap<string, readonly (number | null)[]> | null = null;
let stateTable: ReadonlyMap<string, readonly (number | null)[]> | null = null;

const parseCells = (cells: string) =>
  cells.split(",").map((value) => (value === "" ? null : Number(value)));

function counties() {
  if (countyTable) return countyTable;
  const map = new Map<string, readonly (number | null)[]>();
  for (const row of COUNTY_SECTOR_EMPLOYMENT.split(";")) {
    const colon = row.indexOf(":");
    map.set(row.slice(0, colon), parseCells(row.slice(colon + 1)));
  }
  return (countyTable = map);
}

function states() {
  if (stateTable) return stateTable;
  const map = new Map<string, readonly (number | null)[]>();
  for (const row of STATE_PUBLIC_EMPLOYMENT.split(";")) {
    const colon = row.indexOf(":");
    map.set(row.slice(0, colon), parseCells(row.slice(colon + 1)));
  }
  return (stateTable = map);
}

/** Where a town's industry mix was read from. */
export type TownEmploymentBasis = "county" | "state" | "national";

export interface TownEmploymentMix {
  readonly basis: TownEmploymentBasis;
  /** Private employment by two-digit sector; a withheld cell counts nothing. */
  readonly sectors: ReadonlyMap<Sector, number>;
  /** Public employment on the same scale as `sectors`. */
  readonly federal: number;
  readonly state: number;
  readonly local: ReadonlyMap<LocalGroup, number>;
}

function addSectors(
  into: Map<Sector, number>,
  cells: readonly (number | null)[],
  weight: number,
) {
  TOWN_EMPLOYMENT_META.sectors.forEach((sector, n) => {
    const value = cells[n];
    if (value !== null && value !== undefined)
      into.set(sector, (into.get(sector) ?? 0) + value * weight);
  });
}

/**
 * The town's employment mix: private sectors from its counties, public
 * employment from its state. Pure, and cheap after the first call.
 */
export function townEmploymentMix(town: EntityId): TownEmploymentMix {
  const place = corePlaceByJurisdictionId(town);
  const geoid = place?.sourceGeoid ?? null;
  const stateFips = geoid?.slice(0, 2) ?? null;
  const sectors = new Map<Sector, number>();
  let basis: TownEmploymentBasis = "national";
  const parts = geoid ? countyGeoidsForPlace(geoid) : [];
  const found = parts.filter((county) => counties().has(county));
  if (found.length > 0) {
    basis = "county";
    // Each county the town lies in, evenly: the index lists counties largest
    // share first but a county's size is not its share of the town's jobs.
    for (const county of found)
      addSectors(sectors, counties().get(county)!, 1 / found.length);
  } else if (stateFips) {
    for (const [county, cells] of counties())
      if (county.startsWith(stateFips)) addSectors(sectors, cells, 1);
    if (sectors.size > 0) basis = "state";
  }
  if (sectors.size === 0)
    for (const cells of counties().values()) addSectors(sectors, cells, 1);

  const privateTotal = [...sectors.values()].reduce((a, b) => a + b, 0);
  const row = (stateFips && states().get(stateFips)) || nationalPublicRow();
  const [total, federal] = row;
  // The District of Columbia publishes no local government: its city
  // government is counted as state government. There the state figure is the
  // local one, split as local government is nationally.
  const cityIsState = row[3] === null && row[2] !== null;
  const stateGov = cityIsState ? 0 : row[2];
  const local = cityIsState ? row[2] : row[3];
  const publicTotal = (federal ?? 0) + (stateGov ?? 0) + (local ?? 0);
  // Public jobs stand to the county's private jobs as they do in the state.
  const scale =
    total && total > publicTotal ? privateTotal / (total - publicTotal) : 0;
  const localGroups = new Map<LocalGroup, number>();
  const groupCells = (cityIsState ? nationalPublicRow() : row).slice(4);
  const groupSum = groupCells.reduce<number>((a, b) => a + (b ?? 0), 0);
  TOWN_EMPLOYMENT_META.localGroups.forEach((group, n) => {
    const value = groupCells[n];
    // Local government's groups share its whole total, so the ones BLS
    // withheld do not shrink it.
    if (value !== null && value !== undefined && groupSum > 0)
      localGroups.set(group, ((local ?? 0) * scale * value) / groupSum);
  });
  return {
    basis,
    sectors,
    federal: (federal ?? 0) * scale,
    state: (stateGov ?? 0) * scale,
    local: localGroups,
  };
}

let nationalRow: readonly (number | null)[] | null = null;
function nationalPublicRow(): readonly (number | null)[] {
  if (nationalRow) return nationalRow;
  const sums: number[] = [];
  for (const cells of states().values()) {
    // Only states that publish every figure, so the sums stay comparable.
    if (cells.some((cell) => cell === null)) continue;
    cells.forEach((cell, n) => (sums[n] = (sums[n] ?? 0) + cell!));
  }
  return (nationalRow = sums);
}

/* -------------------------------------------------------------------------- */
/* Workplaces and roles (GAME ASSUMPTION)                                      */
/** GAME ASSUMPTION: which workplaces stand for each sector, and in what shares. */
const SECTOR_WORKPLACES: Readonly<
  Record<Sector, readonly (readonly [string, number])[]>
> = {
  "11": [["farm", 1]],
  "21": [["quarry", 1]],
  "22": [["utility", 1]],
  "23": [["construction", 1]],
  "31": [["manufacturing", 1]],
  "42": [["wholesale", 1]],
  "44": [["retail", 1]],
  "48": [["trucking", 1]],
  "51": [["information", 1]],
  "52": [
    ["bank", 2],
    ["insurance", 1],
  ],
  "53": [["realty", 1]],
  "54": [["professional", 1]],
  "55": [["regional-office", 1]],
  "56": [["building-services", 1]],
  "61": [["private-school", 1]],
  "62": [
    ["hospital", 4],
    ["clinic", 3],
    ["care-home", 2],
  ],
  "71": [["recreation", 1]],
  "72": [
    ["restaurant", 6],
    ["inn", 1],
  ],
  "81": [
    ["repair", 3],
    ["personal-care", 2],
    ["congregation", 2],
    ["organizing", 1],
    ["union", 1],
    ["party-office", 1],
    ["campaign-staff", 1],
  ],
};

/** GAME ASSUMPTION: which local workplaces each major group works in. */
const LOCAL_GROUP_WORKPLACES: Readonly<
  Record<LocalGroup, readonly (readonly [string, number])[]>
> = {
  "11": [
    ["city-hall", 1],
    ["public-school", 1],
  ],
  "13": [["city-hall", 1]],
  "21": [["public-health", 1]],
  "25": [["public-school", 1]],
  "29": [["public-health", 1]],
  "31": [["public-health", 1]],
  "33": [
    ["police", 3],
    ["fire", 2],
  ],
  "37": [
    ["public-works", 1],
    ["public-school", 1],
  ],
  "43": [["city-hall", 1]],
  "47": [["public-works", 1]],
  "49": [["public-works", 1]],
  "53": [["public-works", 1]],
};

/** Every workplace's share of the town's jobs, from the sourced mix. */
export function townWorkplaceWeights(
  town: EntityId,
): ReadonlyMap<string, number> {
  const mix = townEmploymentMix(town);
  const weights = new Map<string, number>();
  const spread = (
    amount: number,
    places: readonly (readonly [string, number])[],
  ) => {
    const sum = places.reduce((total, [, share]) => total + share, 0);
    for (const [key, share] of places)
      weights.set(key, (weights.get(key) ?? 0) + (amount * share) / sum);
  };
  for (const [sector, amount] of mix.sectors)
    spread(amount, SECTOR_WORKPLACES[sector]);
  for (const [group, amount] of mix.local)
    spread(amount, LOCAL_GROUP_WORKPLACES[group]);
  spread(mix.state, [["state-office", 1]]);
  spread(mix.federal, [["post-office", 1]]);
  return weights;
}
