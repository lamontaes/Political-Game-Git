/**
 * A household's daily cost of living, in one place: the region's Consumer
 * Expenditure basket for its size, plus a HUD shelter budget for the bedrooms
 * it needs (none for a room an institution houses), over a mean year's days.
 * The town's households, a relative's household outside the town and an
 * official's one-person household are all costed here, so the same size in the
 * same region and rent row costs the same everywhere.
 */
import { bedroomsForHousehold, type HudRentRow } from "./hud-rents";
import {
  livingCostsRegionForState,
  worldMonthlyHouseholdLivingCosts,
} from "./reference/living-costs-data";

export interface HouseholdCostInput {
  readonly seed: string;
  /** The state whose region sets the basket. */
  readonly stateKey: string | null;
  /** People in the household. */
  readonly size: number;
  /** The HUD row for the shelter budget; none means no shelter cost. */
  readonly rent: HudRentRow | null | undefined;
  /** The basket for the whole household, when the caller costs it differently (a group-quarters room). */
  readonly everydayMonthlyMinor?: number;
  /**
   * The household's pay in a year, for a household that spends by its pay (an
   * official's, with no other writer of what they buy). Left out, the cost is
   * the region's basket for the size, as for every town household today.
   */
  readonly annualPayMinor?: number;
  /** Reads a registered parameter (`minorPerDollar`, `monthsPerYear`, `daysPerMeanYear`). */
  readonly parameter: (key: string) => number;
}

/** The household's monthly cost: the basket plus the shelter budget, in minor units. */
export function householdMonthlyCostMinor(i: HouseholdCostInput): number {
  const everyday =
    i.everydayMonthlyMinor ??
    worldMonthlyHouseholdLivingCosts(
      i.seed,
      livingCostsRegionForState(i.stateKey),
      i.size,
    ).monthlyMinor;
  const shelter = i.rent
    ? i.rent.rents[bedroomsForHousehold(i.size)]! *
      i.parameter("minorPerDollar")
    : 0;
  return everyday + shelter;
}

/**
 * The household's cost a day, rounded to a whole minor unit. Given its pay, the
 * larger of the basket and what the Consumer Expenditure Survey's curve of
 * spending against income says a household at that pay spends (a smooth power,
 * no step), never more than most of the pay itself: the curve runs above
 * income at low pay because those households draw on transfers.
 */
export function householdDailyCostMinor(i: HouseholdCostInput): number {
  const p = i.parameter;
  const basketDaily =
    (householdMonthlyCostMinor(i) * p("monthsPerYear")) / p("daysPerMeanYear");
  if (i.annualPayMinor === undefined) return Math.round(basketDaily);
  const payUsd = Math.max(i.annualPayMinor, 0) / p("minorPerDollar");
  const curveDaily =
    (p("householdSpendingAtReferencePayUsd") *
      p("minorPerDollar") *
      (payUsd / p("householdSpendingReferencePayUsd")) **
        p("householdSpendingPayElasticity")) /
    p("daysPerMeanYear");
  const ceilingDaily =
    (i.annualPayMinor * p("householdSpendingMostOfPayShare")) /
    p("daysPerMeanYear");
  return Math.round(Math.max(basketDaily, Math.min(curveDaily, ceilingDaily)));
}
