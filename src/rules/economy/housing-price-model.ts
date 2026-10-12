/** Retained supporting housing-price coefficient contract; source spread/caveats remain registered. */
export const HOUSING_PRICE_COEFFICIENTS = {
  lastGrowth: 0.63,
  incomeGrowth: 0.38,
  rateChangePerPoint: -0.0046,
  priceToIncomeGap: -0.12,
  measuredOn:
    "FHFA state house price indexes, state income per person, 30-year mortgage rate, 1980-2024",
  residualSdPerYear: 0.036,
  supplyTerm:
    "NOT READ: housing-supply-elasticity-by-place research request is open",
} as const;
export interface HousingPriceInputs {
  lastGrowth: number;
  incomeGrowth: number;
  rateChangePp: number;
  priceToIncomeGapLog: number;
  housingLawEffect: number;
}
const MONTHS_PER_YEAR = 12;
// stopgapId: "economy.home-price-supply-elasticity"
export function priceGrowthMonthly(inputs: HousingPriceInputs): number {
  const c = HOUSING_PRICE_COEFFICIENTS;
  const perYear =
    c.lastGrowth * inputs.lastGrowth +
    c.incomeGrowth * inputs.incomeGrowth +
    c.rateChangePerPoint * inputs.rateChangePp +
    c.priceToIncomeGap * inputs.priceToIncomeGapLog;
  return perYear / MONTHS_PER_YEAR + inputs.housingLawEffect;
}
