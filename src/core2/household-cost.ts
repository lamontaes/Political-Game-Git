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

/** The household's cost a day, rounded to a whole minor unit. */
export function householdDailyCostMinor(i: HouseholdCostInput): number {
  return Math.round(
    (householdMonthlyCostMinor(i) * i.parameter("monthsPerYear")) /
      i.parameter("daysPerMeanYear"),
  );
}
