import observations from "../../data/research/transit/ntd-2023-rural-demand-response-costs.json";
import type { ExactQuantity, MoneyAmount } from "./types";

/** Calibration only. Actual expenses divided by actual delivered hours.
 * This never chooses a price, budget, service quantity or person's action.
 */
export function checkRuralTransitOperatingCost(
  expenses: MoneyAmount,
  deliveredHours: ExactQuantity,
) {
  if (
    expenses.currency !== "USD" ||
    expenses.minorUnits < 0 ||
    deliveredHours.unit !== "duration:vehicle-service-hour" ||
    deliveredHours.numerator <= 0 ||
    deliveredHours.denominator <= 0
  )
    return null;
  const usdPerHour =
    expenses.minorUnits /
    100 /
    (deliveredHours.numerator / deliveredHours.denominator);
  return {
    actualUSDPerVehicleRevenueHour: usdPerHour,
    observedRange: [observations.summary.min, observations.summary.max],
    withinObservedRange:
      usdPerHour >= observations.summary.min &&
      usdPerHour <= observations.summary.max,
    sourceYear: 2023,
  };
}
