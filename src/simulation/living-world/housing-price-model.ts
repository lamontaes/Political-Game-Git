/**
 * How a place's home prices move, month to month.
 *
 * Pure arithmetic, no draws. The coefficients are measured: an annual panel of
 * every state, 1980 to 2024 (2,244 state-years), Federal Housing Finance Agency
 * house price indexes against state income per person and the 30-year mortgage
 * rate. Within-state R-squared 0.55 (0.77 for 1992 to 2019); residual standard
 * deviation 3.6 percent a year. The residual is not drawn here: what the model
 * leaves out is the town's own events, which Build 10's housing market passes in
 * as `housingLawEffect`.
 *
 * Measured, per year, on the change in a state's log home price:
 *   0.63 x last year's change (standard error 0.02)
 *   0.38 x the year's growth in income per person
 *  -0.0046 x the change in the 30-year rate, in percentage points (se 0.0008)
 *  -0.12 x last year's log gap between price-to-income and the state's own mean
 *
 * Not measured yet: how fast a place can build when prices rise (supply
 * elasticity, research request housing-supply-elasticity-by-place). Until it is
 * read, the model has no supply term and says so.
 */

export const HOUSING_PRICE_COEFFICIENTS = {
  lastGrowth: 0.63,
  incomeGrowth: 0.38,
  rateChangePerPoint: -0.0046,
  priceToIncomeGap: -0.12,
  /** 1980-2024 annual state panel, n = 2,244. */
  measuredOn:
    "FHFA state house price indexes, state income per person, 30-year mortgage rate, 1980-2024",
  residualSdPerYear: 0.036,
  supplyTerm:
    "NOT READ: housing-supply-elasticity-by-place research request is open",
} as const;

export interface HousingPriceInputs {
  /** Change in the place's log home price over the last twelve months. */
  lastGrowth: number;
  /** Change in the place's log income per person over the last twelve months. */
  incomeGrowth: number;
  /** Change in the 30-year mortgage rate over the last twelve months, in percentage points. */
  rateChangePp: number;
  /** Last year's log price-to-income ratio minus the place's own long-run mean of it. */
  priceToIncomeGapLog: number;
  /** Movement the town's own events add this month, in log points (zero when there is none). */
  housingLawEffect: number;
}

const MONTHS_PER_YEAR = 12;

/** The log change in the place's home price for one month. */
export function priceGrowthMonthly(inputs: HousingPriceInputs): number {
  const c = HOUSING_PRICE_COEFFICIENTS;
  const perYear =
    c.lastGrowth * inputs.lastGrowth +
    c.incomeGrowth * inputs.incomeGrowth +
    c.rateChangePerPoint * inputs.rateChangePp +
    c.priceToIncomeGap * inputs.priceToIncomeGapLog;
  return perYear / MONTHS_PER_YEAR + inputs.housingLawEffect;
}
