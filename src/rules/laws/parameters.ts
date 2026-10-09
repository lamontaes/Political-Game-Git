/** Numeric assumptions for the standalone laws rules. */
export const LAWS_PARAMETERS = {
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
