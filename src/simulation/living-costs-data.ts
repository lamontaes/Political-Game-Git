/**
 * Representative 2024 national Consumer Expenditure Survey spending, not
 * an observed person's bill. The owner approved a recent national estimate.
 * Miscellaneous is the BLS category, not the residual of all omitted spending.
 * Housing, tuition, contributions and retirement are outside this basket.
 */
export const LIVING_COSTS_SOURCE =
  "https://www.bls.gov/cex/tables/calendar-year/mean-item-share-average-standard-error/cu-region-1-year-average-2024.xlsx";

export const REPRESENTATIVE_LIVING_COSTS = {
  source: LIVING_COSTS_SOURCE,
  sourceYear: 2024,
  // Table 1800 A637 gives December 2025, not an exact publication day.
  // This month-end cutoff is conservative availability, not publication day.
  sourceAvailableBy: "2025-12-31",
  coverage: "national consumer units",
  annualUsdPerConsumerUnit: {
    food: 10_169,
    transportation: 13_318,
    healthCare: 6_197,
    apparelAndServices: 2_001,
    miscellaneous: 1_218,
  },
  // Table 1800 rounds both averages to one decimal; this is a derived average,
  // not a count of adults in any actual household.
  peoplePerConsumerUnit: 2.4,
  childrenUnder18PerConsumerUnit: 0.6,
  currency: "USD",
} as const;

/** One final rounding to currency minor units, after the annual conversion. */
export function representativeMonthlyLivingCostsMinor(): number {
  const annual = Object.values(
    REPRESENTATIVE_LIVING_COSTS.annualUsdPerConsumerUnit,
  ).reduce((sum, amount) => sum + amount, 0);
  const adults =
    REPRESENTATIVE_LIVING_COSTS.peoplePerConsumerUnit -
    REPRESENTATIVE_LIVING_COSTS.childrenUnder18PerConsumerUnit;
  return Math.round((annual * 100) / (adults * 12));
}
