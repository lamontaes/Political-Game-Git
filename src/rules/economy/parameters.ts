export const ECONOMY_RULE_PARAMETERS = {
  noHousingEventPriceEffectLogPoints: {
    value: 0,
    basis: "TUNABLE",
    source: "No housing event is supplied for this macro month",
    range: { minimum: -1, maximum: 1 },
  },
  housingPriceWindowMonths: {
    value: 12,
    basis: "SOURCED",
    source:
      "The home-price rule compares and carries the previous twelve monthly records",
    range: { minimum: 1, maximum: 36 },
  },
  housingPriceCoefficients: {
    value: {
      lastGrowth: 0.63,
      incomeGrowth: 0.38,
      rateChangePerPoint: -0.0046,
      priceToIncomeGap: -0.12,
    },
    basis: "SOURCED",
    source:
      "FHFA state house-price indexes, state income per person, and 30-year mortgage rate, 1980-2024; n=2,244 state-years",
    range: { minimum: -2, maximum: 2 },
  },
  quartersPerYear: {
    value: 4,
    basis: "SOURCED",
    source: "Calendar year has four fiscal quarters",
    range: { minimum: 1, maximum: 8 },
  },
  noAveragePayEstimateDollars: {
    value: 0,
    basis: "TUNABLE",
    source:
      "Legacy hiring rule has no town pay estimate unless caller supplies one",
    range: { minimum: 0, maximum: 1_000_000 },
  },
  annualWorkHours: {
    value: 2080,
    basis: "SOURCED",
    source: "Standard annualization of 40 hours per week for 52 weeks",
    range: { minimum: 1, maximum: 8760 },
  },
  macroPrecisionDecimalPlaces: {
    value: 6,
    basis: "TUNABLE",
    source: "Legacy persisted macro precision retained for replay equivalence",
    range: { minimum: 0, maximum: 12 },
  },
  minorUnitsPerDollar: {
    value: 100,
    basis: "SOURCED",
    source: "One U.S. dollar contains 100 cents",
    range: { minimum: 1, maximum: 1000 },
  },
  homePriceRoundingStepMinor: {
    value: 100_000,
    basis: "TUNABLE",
    source:
      "Legacy home purchase price rounding retained for golden equivalence",
    range: { minimum: 1, maximum: 100_000_000 },
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
  publicHousingRentIncomeShare: {
    value: 0.3,
    basis: "SOURCED",
    source:
      "Brooke rule: public housing rent is 30 percent of household monthly income",
    range: { minimum: 0, maximum: 1 },
  },
  publicHousingMinimumRentMinor: {
    value: 5_000,
    basis: "SOURCED",
    source: "24 CFR 5.630 caps a housing authority's minimum rent at $50",
    range: { minimum: 0, maximum: 100_000 },
  },
  publicHousingFlatRentFmrShare: {
    value: 0.8,
    basis: "SOURCED",
    source:
      "Public Law 113-235 sets flat rent at no less than 80 percent of HUD Fair Market Rent",
    range: { minimum: 0, maximum: 1 },
  },
  rentRoundingIncrementMinor: {
    value: 100,
    basis: "SOURCED",
    source:
      "Public housing rent amounts are rounded to the nearest whole dollar",
    range: { minimum: 1, maximum: 10_000 },
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
  mortgageTermMonths: {
    value: 360,
    basis: "TUNABLE",
    source: "Owner-approved fixed mortgage term in the legacy rule",
    range: { minimum: 1, maximum: 600 },
  },
  mortgageSpreadReference: {
    value: {
      mortgageRatePercent: 6.15,
      policyLowerPercent: 3.5,
      policyUpperPercent: 3.75,
      referenceKey: "fred-mortgage-policy-spread:2025-12-31",
    },
    basis: "SOURCED",
    source:
      "Freddie Mac PMMS via FRED MORTGAGE30US and Federal Reserve FRED DFEDTARL/DFEDTARU, December 31, 2025",
    range: { minimum: 0, maximum: 20 },
  },
  basisPointsPerPercent: {
    value: 100,
    basis: "SOURCED",
    source: "One percentage point is 100 basis points",
    range: { minimum: 1, maximum: 1000 },
  },
  basisPointsPerWholeRate: {
    value: 10000,
    basis: "SOURCED",
    source: "One whole rate is 10,000 basis points",
    range: { minimum: 1, maximum: 100000 },
  },
  monthsPerYear: {
    value: 12,
    basis: "SOURCED",
    source: "Calendar year contains 12 months",
    range: { minimum: 1, maximum: 12 },
  },
} as const;
