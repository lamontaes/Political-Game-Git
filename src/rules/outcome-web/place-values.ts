export interface PlaceOutcomeMeasureBase {
  readonly name: string;
  readonly unit: string;
  readonly source: string;
  readonly places: Readonly<Record<string, number>>;
  readonly drift?: PlaceOutcomeDrift;
  /**
   * "share" (the default): a percent. "index": a level where 100 is the
   * place's start. "rate": a level in the measure's own unit (crimes per
   * 100,000 people, micrograms per cubic meter); `minPct` and `maxPct` are
   * then bounds in that unit. "level": a number in the measure's own unit
   * that can sit at or below zero (a state's borrowing cost over the
   * best-rated states, where a AAA state starts at 0), and a link adds to it
   * rather than multiplying it: a factor of 1.4 adds 0.4 of the unit, since
   * no multiplier moves a zero and a negative one would reverse.
   */
  readonly scale?: "share" | "index" | "rate" | "level";
  /** How a value reads in a report: "per 10,000 people". Shares read as %. */
  readonly shortUnit?: string;
  /**
   * An older index measure (100 at the start) this one replaces. A save made
   * before the change carries its level forward from that index, so the
   * place does not snap back to its base.
   */
  readonly replaces?: string;
}

export interface PlaceOutcomeDrift {
  readonly minPct: number;
  readonly maxPct: number;
}

export function placeOutcomeValue(
  definition: PlaceOutcomeMeasureBase,
  structural: number,
  multiplier: number,
  factors: readonly number[],
): number {
  return definition.scale === "level"
    ? factors.reduce((total, factor) => total + (factor - 1), structural)
    : structural * multiplier;
}

export function localWeightsFromFacts(
  facts: LocalPopulationFacts,
  stateKey: string,
  localKeys: readonly string[],
): ReadonlyMap<string, number | null> {
  const state = facts.areaResidents(stateKey);
  const weights = new Map<string, number | null>();
  const counties = new Set(
    localKeys.filter((key) => key.startsWith("county:")),
  );
  const inCounty = new Map<string, number>();
  const unknownCounties = new Set<string>();
  if (counties.size > 0) {
    for (const key of localKeys) {
      if (key.startsWith("county:")) continue;
      const people = facts.localResidents(key);
      const parts = /^\d{7}$/.test(key)
        ? facts.countyPopulationSharesForPlace(key)
        : [];
      for (const [county, share] of parts) {
        if (!counties.has(`county:${county}`)) continue;
        if (share === 0) continue;
        if (people === null || share === null) {
          unknownCounties.add(county);
          continue;
        }
        inCounty.set(county, (inCounty.get(county) ?? 0) + people * share);
      }
    }
  }
  for (const key of localKeys) {
    const people = facts.localResidents(key);
    if (
      state === null ||
      state <= 0 ||
      people === null ||
      (key.startsWith("county:") &&
        unknownCounties.has(key.slice("county:".length)))
    ) {
      weights.set(key, null);
      continue;
    }
    const own = key.startsWith("county:")
      ? Math.max(0, people - (inCounty.get(key.slice("county:".length)) ?? 0))
      : people;
    weights.set(key, own / state);
  }
  // Counts from different years can overshoot; the places never outweigh
  // their state.
  const total = [...weights.values()].reduce<number>(
    (sum, weight) => sum + (weight ?? 0),
    0,
  );
  if (total > 1)
    for (const [key, weight] of weights)
      if (weight !== null) weights.set(key, weight / total);
  return weights;
}

export interface LocalPopulationFacts {
  readonly areaResidents: (key: string) => number | null;
  readonly localResidents: (key: string) => number | null;
  readonly countyPopulationSharesForPlace: (
    key: string,
  ) => readonly (readonly [string, number | null])[];
}
