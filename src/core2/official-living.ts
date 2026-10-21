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
import { outsideGovernment } from "./outside-governments";
import { outsideAccountOf } from "./budgets-treasury";
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

/**
 * Gives someone with no household cost of their own a one-person household:
 * the cost above and the savings a family at their pay keeps, paid in from
 * the outside government that employs them. False when they already had a cost.
 */
export function giveLivingCost(
  api: CoreAPI,
  input: {
    readonly personId: string;
    readonly stateKey: string;
    readonly annualMinor: number;
    /** The outside government whose account the savings come from. */
    readonly governmentKey: string;
  },
): boolean {
  const person = api.state.people.get(input.personId);
  if (!person || person.livingCostDailyMinor > 0) return false;
  const home = officialHousehold(api, input.stateKey, input.annualMinor);
  api.updatePerson(input.personId, {
    livingCostDailyMinor: home.livingCostDailyMinor,
  });
  if (home.savingsMinor > 0) {
    const accounts = api.accounts();
    accounts.transfer({
      id: `savings:${input.personId}:${api.state.date}`,
      from: accounts.main(outsideGovernment(api, input.governmentKey)),
      to: accounts.main(input.personId),
      amountMinor: home.savingsMinor,
      reasonKey: "official.savings",
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `What a family at ${input.annualMinor} a year keeps in checking and savings (SCF 2022).`,
        estimatedFrom: "scf-transaction-accounts-2022",
      },
    });
  }
  return true;
}

/** What someone spends on living for a number of days, out of what they hold, to the outside account. */
export function spendLivingCost(
  api: CoreAPI,
  personId: string,
  days: number,
): void {
  const person = api.state.people.get(personId);
  const outside = outsideAccountOf(api);
  if (!person?.alive || !outside || days <= 0) return;
  const accounts = api.accounts();
  accounts.transfer({
    id: `living:${personId}:${api.state.date}`,
    from: accounts.main(personId),
    to: accounts.main(outside),
    amountMinor: person.livingCostDailyMinor * days,
    reasonKey: "official.living",
    partial: true,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `${days} days of the household's living cost (official-living).`,
      estimatedFrom: "BLS Consumer Expenditure Survey and HUD fair market rent",
    },
  });
}
