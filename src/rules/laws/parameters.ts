/** Numeric assumptions for the standalone laws rules. */
export const LAWS_PARAMETERS = {
  referenceWeightExponent: {
    value: 1,
    basis: "TUNABLE",
    source:
      "Legacy similar-state tax deduction estimator uses reciprocal rank weights",
    range: { minimum: 0, maximum: 4 },
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
