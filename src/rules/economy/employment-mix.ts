/** Add selected weighted sector values without mutating the caller's map. */
export function addWeightedSectorValuesFromFacts(
  currentValues: ReadonlyMap<string, number>,
  sectors: readonly string[],
  cells: readonly (number | null | undefined)[],
  weight: number,
): ReadonlyMap<string, number> {
  const totals = new Map(currentValues);
  sectors.forEach((sector, index) => {
    const value = cells[index];
    if (value !== null && value !== undefined) {
      totals.set(sector, (totals.get(sector) ?? 0) + value * weight);
    }
  });
  return totals;
}

export interface EmploymentMixFacts {
  readonly sectors: ReadonlyMap<string, number>;
  readonly federal: number;
  readonly state: number;
  readonly local: ReadonlyMap<string, number>;
}

export interface WorkplaceShareRows {
  readonly sectorWorkplaces: ReadonlyMap<
    string,
    readonly (readonly [string, number])[]
  >;
  readonly localWorkplaces: ReadonlyMap<
    string,
    readonly (readonly [string, number])[]
  >;
  readonly stateOffice: readonly (readonly [string, number])[];
  readonly federalOffice: readonly (readonly [string, number])[];
}

/** Spread caller-selected employment mix through supplied workplace shares. */
export function workplaceWeightsFromFacts(
  mix: EmploymentMixFacts,
  rows: WorkplaceShareRows,
): ReadonlyMap<string, number> {
  const weights = new Map<string, number>();
  const spread = (
    amount: number,
    workplaces: readonly (readonly [string, number])[],
  ) => {
    const shareTotal = workplaces.reduce(
      (total, [, share]) => total + share,
      0,
    );
    for (const [key, share] of workplaces) {
      weights.set(key, (weights.get(key) ?? 0) + (amount * share) / shareTotal);
    }
  };
  for (const [sector, amount] of mix.sectors) {
    const workplaces = rows.sectorWorkplaces.get(sector);
    if (!workplaces) throw new Error(`Missing workplace shares for ${sector}.`);
    spread(amount, workplaces);
  }
  for (const [group, amount] of mix.local) {
    const workplaces = rows.localWorkplaces.get(group);
    if (!workplaces) throw new Error(`Missing workplace shares for ${group}.`);
    spread(amount, workplaces);
  }
  spread(mix.state, rows.stateOffice);
  spread(mix.federal, rows.federalOffice);
  return weights;
}
