/**
 * Every state's published bases (name, fiscal year start, people), read from
 * the Census-based budget bases. A module of its own so the engines that read
 * a state's size (the outside budgets, the climate's weights) do not import
 * each other.
 */
import budgetBases from "../../data/research/money/public-budget-bases.json" with { type: "json" };

export interface StateBase {
  readonly name: string;
  readonly fiscalYearStart: string;
  readonly population2024?: number;
  readonly puertoRicoPopulation2025?: number;
  readonly islandAreaPopulation2020?: number;
}

/** A state's residents: its 2024 count, or the territory's own latest. */
export const residentsOf = (base: StateBase) =>
  base.population2024 ??
  base.puertoRicoPopulation2025 ??
  base.islandAreaPopulation2020 ??
  0;

/** Each state's base, by jurisdiction key (US-XX). */
export const STATES = (
  budgetBases as unknown as { places: Record<string, StateBase> }
).places;
