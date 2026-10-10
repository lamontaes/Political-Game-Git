import { ECONOMY_RULE_PARAMETERS } from "./parameters";

export type TownEmploymentMixBasis = "county" | "state" | "national";

export interface TownEmploymentMixFacts {
  readonly countyGeoids: readonly string[];
  readonly stateFips: string | null;
  readonly countyCellsByGeoid: ReadonlyMap<
    string,
    readonly (number | null | undefined)[]
  >;
  readonly statePublicRowsByFips: ReadonlyMap<
    string,
    readonly (number | null | undefined)[]
  >;
  readonly sectorKeys: readonly string[];
  readonly localGroupKeys: readonly string[];
}

export interface TownEmploymentMixResult {
  readonly basis: TownEmploymentMixBasis;
  readonly sectors: ReadonlyMap<string, number>;
  readonly federal: number;
  readonly state: number;
  readonly local: ReadonlyMap<string, number>;
}

const addSectorCells = (
  totals: Map<string, number>,
  sectorKeys: readonly string[],
  cells: readonly (number | null | undefined)[],
  weight: number,
) => {
  sectorKeys.forEach((sector, index) => {
    const value = cells[index];
    if (value !== null && value !== undefined) {
      totals.set(sector, (totals.get(sector) ?? 0) + value * weight);
    }
  });
};

const nationalPublicRow = (
  rows: ReadonlyMap<string, readonly (number | null | undefined)[]>,
) => {
  const totals: number[] = [];
  for (const cells of rows.values()) {
    if (cells.some((cell) => cell === null || cell === undefined)) continue;
    cells.forEach((cell, index) => {
      totals[index] = (totals[index] ?? 0) + cell!;
    });
  }
  return totals;
};

/** Select and scale caller-supplied county and public employment records. */
export function townEmploymentMixFromFacts(
  facts: TownEmploymentMixFacts,
): TownEmploymentMixResult {
  const sectors = new Map<string, number>();
  let basis: TownEmploymentMixBasis = "national";
  const foundCounties = facts.countyGeoids.filter((geoid) =>
    facts.countyCellsByGeoid.has(geoid),
  );

  if (foundCounties.length > 0) {
    basis = "county";
    // STOPGAP: economy.equal-county-employment-weighting
    const weight =
      ECONOMY_RULE_PARAMETERS.townCountyMixWeightNumerator.value /
      foundCounties.length;
    for (const geoid of foundCounties) {
      addSectorCells(
        sectors,
        facts.sectorKeys,
        facts.countyCellsByGeoid.get(geoid)!,
        weight,
      );
    }
  } else if (facts.stateFips) {
    for (const [geoid, cells] of facts.countyCellsByGeoid) {
      if (geoid.startsWith(facts.stateFips)) {
        addSectorCells(sectors, facts.sectorKeys, cells, 1);
      }
    }
    if (sectors.size > 0) basis = "state";
  }

  if (sectors.size === 0) {
    for (const cells of facts.countyCellsByGeoid.values()) {
      addSectorCells(sectors, facts.sectorKeys, cells, 1);
    }
  }

  const privateTotal = [...sectors.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const fallbackPublic = nationalPublicRow(facts.statePublicRowsByFips);
  const row =
    (facts.stateFips && facts.statePublicRowsByFips.get(facts.stateFips)) ??
    fallbackPublic;
  const [total, federal, stateCell, localCell] = row;
  const cityIsState =
    localCell === null && stateCell !== null && stateCell !== undefined;
  const stateGovernment = cityIsState ? 0 : stateCell;
  const localGovernment = cityIsState ? stateCell : localCell;
  const publicTotal =
    (federal ?? 0) + (stateGovernment ?? 0) + (localGovernment ?? 0);
  const scale =
    total && total > publicTotal ? privateTotal / (total - publicTotal) : 0;
  const groupCells = (cityIsState ? fallbackPublic : row).slice(4);
  const groupTotal = groupCells.reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const local = new Map<string, number>();
  facts.localGroupKeys.forEach((group, index) => {
    const value = groupCells[index];
    if (value !== null && value !== undefined && groupTotal > 0) {
      local.set(group, ((localGovernment ?? 0) * scale * value) / groupTotal);
    }
  });

  return {
    basis,
    sectors,
    federal: (federal ?? 0) * scale,
    state: (stateGovernment ?? 0) * scale,
    local,
  };
}
