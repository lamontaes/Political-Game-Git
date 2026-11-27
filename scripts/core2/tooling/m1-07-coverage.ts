/**
 * Which per-resident comparison M1-07 can hold a place to: the Census state
 * and local finance ranges for the 50 states and D.C., the territory's own
 * published all-funds spending for an island area (the median of those that
 * publish where its own is not published), or none, which the check reports
 * as unchecked mandatory work and fails on.
 */
export type Coverage = "census" | "territory" | "none";

interface BasesPlace {
  readonly state?: unknown;
  readonly territoryAllFundsSpendingFY2025Millions?: number | null;
  readonly population2024?: number | null;
  readonly puertoRicoPopulation2025?: number | null;
  readonly islandAreaPopulation2020?: number | null;
}

export function coverageOf(
  stateKey: string,
  censusPlaces: Readonly<Record<string, unknown>>,
  bases: Readonly<Record<string, BasesPlace>>,
): Coverage {
  if (censusPlaces[stateKey]) return "census";
  const own = bases[stateKey];
  return own && !own.state ? "territory" : "none";
}

/** An island area's residents, as the budgets read them. */
const residentsOf = (place: BasesPlace): number =>
  place.population2024 ??
  place.puertoRicoPopulation2025 ??
  place.islandAreaPopulation2020 ??
  0;

/**
 * Dollars per resident the island area is expected to spend: its own
 * published all-funds figure, else the median of the island areas that
 * publish one (the same rule the budgets build on).
 */
export function territorySpendingPerResident(
  stateKey: string,
  bases: Readonly<Record<string, BasesPlace>>,
): number {
  const perResident = (place: BasesPlace) =>
    (place.territoryAllFundsSpendingFY2025Millions! * 1_000_000) /
    residentsOf(place);
  const published = Object.values(bases)
    .filter(
      (row) =>
        !row.state &&
        typeof row.territoryAllFundsSpendingFY2025Millions === "number" &&
        residentsOf(row) > 0,
    )
    .map(perResident)
    .sort((a, b) => a - b);
  const own = bases[stateKey];
  return own &&
    typeof own.territoryAllFundsSpendingFY2025Millions === "number" &&
    residentsOf(own) > 0
    ? perResident(own)
    : (published[Math.floor((published.length - 1) / 2)] ?? 0);
}

/** The exit code: any failed clause or any mandatory work left unchecked fails the run. */
export function exitCodeOf(
  failures: readonly string[],
  unchecked: readonly string[],
): number {
  return failures.length || unchecked.length ? 1 : 0;
}
