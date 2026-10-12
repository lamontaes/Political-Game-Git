import type {
  CannabisRetailMechanismInputs,
  CannabisRetailMechanismReading,
} from "../../simulation/public-budgets/cannabis-sales-revenue";
// stopgapId: "economy.cannabis-missing-source-keys"
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
