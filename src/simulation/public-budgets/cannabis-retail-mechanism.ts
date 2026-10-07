/** Every value must come from operative law terms or the actual world base. */
export interface CannabisRetailMechanismInputs {
  readonly adultResidents: number;
  /** Buyers on the same adult denominator, not merely respondents reporting use. */
  readonly buyerShare: number;
  /** Annual pretax spending using the same buyer definition and price-year. */
  readonly annualPretaxSpendingPerBuyer: number;
  /** From actual buyer/retail records or a researched market mechanism, never a pick. */
  readonly legalMarketShare: number;
  readonly exciseRate: number;
  readonly stateSalesTaxRate: number;
  readonly salesTaxIncludesExcise: boolean;
  readonly sources: {
    readonly lawTerms: string;
    readonly adultBuyerBase: string;
    readonly spending: string;
    readonly legalMarketShare: string;
  };
}

export interface CannabisRetailMechanismReading {
  readonly annualPotentialPretaxSpending: number;
  readonly annualLegalPretaxSales: number;
  readonly annualStateExciseRevenue: number;
  readonly annualStateSalesTaxRevenue: number;
  readonly annualStateRevenue: number;
}

/**
 * Core accounting only; no production adapter or legal-share producer yet.
 * Missing sources fail explicitly. No draws, invented response curves, outcome
 * bounds or calibration clamp. Binding the operative terms and actual market
 * records is required before this can replace the existing amount reader.
 */
export function cannabisRetailRevenue(
  input: CannabisRetailMechanismInputs,
): CannabisRetailMechanismReading {
  for (const [name, value] of Object.entries(input.sources)) {
    if (!value.trim()) throw new Error(`Missing cannabis source: ${name}`);
  }
  for (const name of [
    "adultResidents",
    "annualPretaxSpendingPerBuyer",
  ] as const) {
    if (!Number.isFinite(input[name]) || input[name] < 0)
      throw new Error(`Invalid cannabis input: ${name}`);
  }
  for (const name of [
    "buyerShare",
    "legalMarketShare",
    "exciseRate",
    "stateSalesTaxRate",
  ] as const) {
    if (!Number.isFinite(input[name]) || input[name] < 0 || input[name] > 1)
      throw new Error(`Invalid cannabis input: ${name}`);
  }
  const annualPotentialPretaxSpending =
    input.adultResidents *
    input.buyerShare *
    input.annualPretaxSpendingPerBuyer;
  const annualLegalPretaxSales =
    annualPotentialPretaxSpending * input.legalMarketShare;
  const annualStateExciseRevenue = annualLegalPretaxSales * input.exciseRate;
  const salesTaxBase = input.salesTaxIncludesExcise
    ? annualLegalPretaxSales + annualStateExciseRevenue
    : annualLegalPretaxSales;
  const annualStateSalesTaxRevenue = salesTaxBase * input.stateSalesTaxRate;
  return {
    annualPotentialPretaxSpending,
    annualLegalPretaxSales,
    annualStateExciseRevenue,
    annualStateSalesTaxRevenue,
    annualStateRevenue: annualStateExciseRevenue + annualStateSalesTaxRevenue,
  };
}
