/**
 * A named official's household: what living costs them and what they keep in
 * the bank. Officials are filled in as one-person households with no cost
 * and no cash; the engines that read a person's cushion (a bribe, a diverted
 * dollar, a choice of what to give up) then see someone who needs nothing.
 *
 * The cost is the BLS Consumer Expenditure Survey basket for one person in
 * the official's region plus the HUD fair market rent of a studio in their
 * state, as the opening gives every household. The cash is what the Survey of
 * Consumer Finances says a family at their pay keeps in checking and savings.
 */
import {
  estimatedMonthlyHouseholdLivingCosts,
  livingCostsRegionForState,
} from "./reference/living-costs-data";
import { bedroomsForHousehold, hudStateRentRow } from "./hud-rents";
import { medianTransactionBalance } from "./starting-cash";
import type { CoreAPI } from "./types";

export interface OfficialHousehold {
  readonly livingCostDailyMinor: number;
  readonly savingsMinor: number;
}

/** A one-person household at the official's pay, in the state they serve. */
export function officialHousehold(
  api: CoreAPI,
  stateKey: string,
  annualPayMinor: number,
): OfficialHousehold {
  const p = (key: string) => api.parameter(key);
  const everyday = estimatedMonthlyHouseholdLivingCosts(
    livingCostsRegionForState(stateKey),
    p("one"),
  ).monthlyMinor;
  const shelter =
    hudStateRentRow(stateKey).rents[bedroomsForHousehold(p("one"))]! *
    p("minorPerDollar");
  return {
    livingCostDailyMinor: Math.round(
      ((everyday + shelter) * p("monthsPerYear")) / p("daysPerMeanYear"),
    ),
    savingsMinor: Math.round(
      medianTransactionBalance(annualPayMinor / p("minorPerDollar")) *
        p("minorPerDollar"),
    ),
  };
}
