export const ECONOMY_RULE_PARAMETERS = {
  annualWorkHours: {
    value: 2080,
    basis: "SOURCED",
    source: "Standard annualization of 40 hours per week for 52 weeks",
    range: { minimum: 1, maximum: 8760 },
  },
  minorUnitsPerDollar: {
    value: 100,
    basis: "SOURCED",
    source: "One U.S. dollar contains 100 cents",
    range: { minimum: 1, maximum: 1000 },
  },
  wagePercentiles: {
    value: [10, 25, 50, 75, 90],
    basis: "SOURCED",
    source: "BLS OEWS published wage percentile columns",
    range: { minimum: 0, maximum: 100 },
  },
  newHirePayPercentile: {
    value: 25,
    basis: "TUNABLE",
    source: "Legacy tenure calibration, retained for golden equivalence",
    range: { minimum: 0, maximum: 100 },
  },
  experiencedPayPercentile: {
    value: 75,
    basis: "TUNABLE",
    source: "Legacy tenure calibration, retained for golden equivalence",
    range: { minimum: 0, maximum: 100 },
  },
  yearsToExperiencedPayPercentile: {
    value: 20,
    basis: "TUNABLE",
    source: "Legacy tenure calibration, retained for golden equivalence",
    range: { minimum: 1, maximum: 80 },
  },
  hudBedroomColumns: {
    value: { minimum: 0, maximum: 4 },
    basis: "SOURCED",
    source:
      "HUD Fair Market Rent rows publish efficiency through four bedrooms",
    range: { minimum: 0, maximum: 10 },
  },
  evictionLawyerMonthsBehind: {
    value: 4,
    basis: "ESTIMATED",
    source:
      "Legacy estimate checked against Eviction Lab and NYC Office of Civil Justice records",
    range: { minimum: 0, maximum: 12 },
  },
  evictionLenientJudgeMonthsBehind: {
    value: 2,
    basis: "ESTIMATED",
    source: "Legacy estimated case rule; retained for golden equivalence",
    range: { minimum: 0, maximum: 12 },
  },
} as const;
