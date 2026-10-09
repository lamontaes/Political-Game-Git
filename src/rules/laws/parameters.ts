/** Numeric assumptions for the standalone laws rules. */
export const LAWS_PARAMETERS = {
  monthsPerYear: {
    value: 12,
    basis: "SOURCED",
    source: "Calendar year contains 12 months",
    range: { minimum: 1, maximum: 12 },
  },
  basisPointsPerWholeRate: {
    value: 10_000,
    basis: "SOURCED",
    source: "One whole rate is 10,000 basis points",
    range: { minimum: 1, maximum: 100_000 },
  },
  jointScheduleThresholdMultiplier: {
    value: 2,
    basis: "SOURCED",
    source:
      "Married filing jointly applies double single-filer federal bracket thresholds in this state schedule estimate",
    range: { minimum: 1, maximum: 4 },
  },
  percentageMultiplier: {
    value: 100,
    basis: "SOURCED",
    source: "One whole is 100 percent",
    range: { minimum: 1, maximum: 1000 },
  },
  halfUpRoundingFactor: {
    value: 2,
    basis: "SOURCED",
    source: "Half-up rounding splits a unit into two equal halves",
    range: { minimum: 2, maximum: 2 },
  },
  nonMoneyFeltSizeMonthsOfPay: {
    value: 0.1,
    basis: "PLACEHOLDER",
    source:
      "Fable audit card L3; research question felt-size-of-non-money-law-effects",
    range: { minimum: 0, maximum: 1 },
  },
  referenceWeightExponent: {
    value: 1,
    basis: "TUNABLE",
    source:
      "Legacy similar-state tax deduction estimator uses reciprocal rank weights",
    range: { minimum: 0, maximum: 4 },
  },
  paidWorkdaysPerWeek: {
    value: 5,
    basis: "SOURCED",
    source:
      "Standard Monday-through-Friday workweek used to prorate weekly paid leave caps",
    range: { minimum: 1, maximum: 7 },
  },
  paidLeavePremiumRateUnitsPerWholeRate: {
    value: 1_000_000,
    basis: "SOURCED",
    source: "Paid-leave employee premium rates are stored in millionths",
    range: { minimum: 1, maximum: 100_000_000 },
  },
  defaultEnactmentDays: {
    value: 90,
    basis: "TUNABLE",
    range: { minimum: 0, maximum: 365 },
  },
  startingStateNoYieldOffset: {
    value: 0.5,
    basis: "TUNABLE",
    range: { minimum: 0, maximum: 1 },
  },
} as const;
