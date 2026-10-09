/** Numeric assumptions for the standalone laws rules. */
export const LAWS_PARAMETERS = {
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
