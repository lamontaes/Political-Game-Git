/**
 * The country tier's day one, from the figures the repository already holds: each state's people,
 * jobs by sector, budget lines and surveyed moves. The share out of work, pay and prices are the
 * world's own opening figures (the regional rows, already moved by the world's draw), passed in.
 */
import budgetBases from "../../data/research/money/public-budget-bases.json" with { type: "json" };
import moverRates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import {
  COUNTRY_SECTORS,
  type CountryOpening,
  type CountrySector,
  type CountryStateOpening,
} from "./country-model";
import type { MacroParameter } from "./macro-model";
import { REGIONS, REGION_STATES } from "./regional-model";

/** The survey's age bands that make up each of the tier's four. */
const MOVE_BANDS = [
  ["18-19", "20-24", "25-29"],
  ["30-34", "35-39", "40-44"],
  ["45-49", "50-54", "55-59", "60-64"],
  ["65-69", "70-74", "75+"],
] as const;

type Lines = Record<string, number>;
interface BudgetPlace {
  state?: { spending: Lines };
  local?: { spending: Lines };
}
interface MoverPlace {
  departurePerYearByAge: Record<string, number>;
  arrivalsPerResidentPerYear: number;
}
const BUDGETS = budgetBases as unknown as {
  calibration: { factor: number };
  places: Record<string, BudgetPlace>;
};
const MOVERS = moverRates as unknown as {
  national: MoverPlace;
  places: Record<string, MoverPlace>;
};

const total = (lines: Lines | undefined) =>
  Object.values(lines ?? {}).reduce((sum, value) => sum + value, 0);

/** What a state's figures were at the world's opening month, by state FIPS. */
export interface StateOpeningFigures {
  unemploymentPct: number;
  hourlyPay: number;
  /** Prices against the nation's, percent (100 is the nation). */
  priceLevelPct: number;
}

/** Every state's day one for the tier. */
export function countryOpening(
  figures: (stateFips: string) => StateOpeningFigures,
  national: {
    unemploymentPct: number;
    policyRatePct: number;
    expectedInflationPct: number;
  },
  p: MacroParameter,
): CountryOpening {
  const hundred = p("macroHundred");
  const interstate = p("countryInterstateShareOfMoves");
  const states = Object.entries(REGION_STATES).map(
    ([fips, state]): CountryStateOpening => {
      const key = `US-${state.usps}`;
      // The state's jobs by sector: its regions' mixes weighted by their people.
      const mix: Partial<Record<CountrySector, number>> = {};
      let weight = 0;
      for (const region of REGIONS) {
        if (region.stateFips !== fips || !Object.keys(region.mix).length)
          continue;
        weight += region.population;
        for (const sector of COUNTRY_SECTORS)
          mix[sector] =
            (mix[sector] ?? 0) + (region.mix[sector] ?? 0) * region.population;
      }
      if (weight > 0)
        for (const sector of COUNTRY_SECTORS) mix[sector]! /= weight;
      const budget = BUDGETS.places[key];
      // State and local spending together; what the state passes to its local governments is counted once.
      const perHead = budget?.state
        ? total(budget.state.spending) +
          total(budget.local?.spending) -
          (budget.state.spending.localAid ?? 0)
        : p("countryBudgetPerHeadFallback");
      const movers = MOVERS.places[key] ?? MOVERS.national;
      const own = figures(fips);
      return {
        key,
        fips,
        usps: state.usps,
        population: state.population,
        unemploymentPct: own.unemploymentPct,
        hourlyPay: own.hourlyPay,
        priceLevel: own.priceLevelPct / hundred,
        mix,
        budgetYear: perHead * state.population * BUDGETS.calibration.factor,
        leaveYear: MOVE_BANDS.map(
          (ages) =>
            (ages.reduce(
              (sum, age) =>
                sum +
                (movers.departurePerYearByAge[age] ??
                  MOVERS.national.departurePerYearByAge[age]!),
              0,
            ) /
              ages.length) *
            interstate,
        ),
        arrivalsYear:
          movers.arrivalsPerResidentPerYear * interstate * state.population,
      };
    },
  );
  // The states' shares out of work, weighted by their people, are the nation's on day one: every
  // state's is scaled alike so the sum of the states opens on the national figure.
  const people = states.reduce((sum, state) => sum + state.population, 0);
  const summed =
    states.reduce(
      (sum, state) => sum + state.unemploymentPct * state.population,
      0,
    ) / (people || 1);
  if (summed > 0)
    for (const state of states)
      state.unemploymentPct *= national.unemploymentPct / summed;
  return {
    states,
    policyRate: national.policyRatePct / hundred,
    expectedInflation: national.expectedInflationPct / hundred,
  };
}
