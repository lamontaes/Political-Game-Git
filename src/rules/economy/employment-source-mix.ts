/** Retained KEEP source/helper closure; unchanged native public-owner proof is bounded. */
import type { EntityId } from "../../simulation/types";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import type { TOWN_EMPLOYMENT_META } from "../../simulation/living-world/town-employment.generated";
import type { TownEmploymentMix } from "../../simulation/living-world/town-employment";
export interface EmploymentSourceFacts {
  readonly countyRows: string;
  readonly stateRows: string;
  readonly meta: typeof TOWN_EMPLOYMENT_META;
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly countiesByGeoid: ReadonlyMap<string, readonly string[]>;
}
const readers = new WeakMap<
  EmploymentSourceFacts,
  ReturnType<typeof compileEmployment>
>();
function reader(facts: EmploymentSourceFacts) {
  let read = readers.get(facts);
  if (!read) {
    read = compileEmployment(facts);
    readers.set(facts, read);
  }
  return read;
}
export function townEmploymentMix(
  facts: EmploymentSourceFacts,
  town: EntityId,
): TownEmploymentMix {
  return reader(facts).mix(town);
}
export function townWorkplaceWeights(
  facts: EmploymentSourceFacts,
  town: EntityId,
) {
  return reader(facts).weights(town);
}
// stopgapId: "economy.employment-workplace-shares"
function compileEmployment(facts: EmploymentSourceFacts) {
  const TOWN_EMPLOYMENT_META = facts.meta,
    COUNTY_SECTOR_EMPLOYMENT = facts.countyRows,
    STATE_PUBLIC_EMPLOYMENT = facts.stateRows;
  const lifePlaceByJurisdictionId = (id: EntityId) =>
    facts.places.get(id) ?? null;
  const countyGeoidsForPlace = (id: string) =>
    facts.countiesByGeoid.get(id) ?? [];
  type Sector = (typeof TOWN_EMPLOYMENT_META.sectors)[number];
  type LocalGroup = (typeof TOWN_EMPLOYMENT_META.localGroups)[number];
  let countyTable: ReadonlyMap<string, readonly (number | null)[]> | null =
    null;
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
  type TownEmploymentBasis = "county" | "state" | "national";
  interface TownEmploymentMix {
    readonly basis: TownEmploymentBasis;
    readonly sectors: ReadonlyMap<Sector, number>;
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
  function computeTownEmploymentMix(town: EntityId): TownEmploymentMix {
    const place = lifePlaceByJurisdictionId(town);
    const geoid = place?.sourceGeoid ?? null;
    const stateFips = geoid?.slice(0, 2) ?? null;
    const sectors = new Map<Sector, number>();
    let basis: TownEmploymentBasis = "national";
    const parts = geoid ? countyGeoidsForPlace(geoid) : [];
    const found = parts.filter((county) => counties().has(county));
    if (found.length > 0) {
      basis = "county";
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
    const cityIsState = row[3] === null && row[2] !== null;
    const stateGov = cityIsState ? 0 : row[2];
    const local = cityIsState ? row[2] : row[3];
    const publicTotal = (federal ?? 0) + (stateGov ?? 0) + (local ?? 0);
    const scale =
      total && total > publicTotal ? privateTotal / (total - publicTotal) : 0;
    const localGroups = new Map<LocalGroup, number>();
    const groupCells = (cityIsState ? nationalPublicRow() : row).slice(4);
    const groupSum = groupCells.reduce<number>((a, b) => a + (b ?? 0), 0);
    TOWN_EMPLOYMENT_META.localGroups.forEach((group, n) => {
      const value = groupCells[n];
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
      if (cells.some((cell) => cell === null)) continue;
      cells.forEach((cell, n) => (sums[n] = (sums[n] ?? 0) + cell!));
    }
    return (nationalRow = sums);
  }
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
  function computeTownWorkplaceWeights(
    town: EntityId,
  ): ReadonlyMap<string, number> {
    const mix = computeTownEmploymentMix(town);
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
  return {
    mix: computeTownEmploymentMix,
    weights: computeTownWorkplaceWeights,
  };
}
