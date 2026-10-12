import { ECONOMY_RULE_PARAMETERS as parameters } from "./parameters";

export interface HomePurchasePriceFacts {
  readonly openingPriceDollars: number;
  readonly housingFactor: number;
  readonly downPaymentShare: number;
}

export interface HomePurchasePriceTerms {
  readonly priceMinor: number;
  readonly downPaymentMinor: number;
  readonly mortgagePrincipalMinor: number;
}

/** Price and down-payment arithmetic after place and buyer facts are selected. */
export function homePurchasePriceFromFacts(
  facts: HomePurchasePriceFacts,
): HomePurchasePriceTerms | null {
  if (
    !Number.isFinite(facts.openingPriceDollars) ||
    facts.openingPriceDollars <= 0 ||
    !Number.isFinite(facts.housingFactor) ||
    facts.housingFactor <= 0 ||
    !Number.isFinite(facts.downPaymentShare) ||
    facts.downPaymentShare < 0 ||
    facts.downPaymentShare > 1
  )
    return null;

  const unroundedPriceMinor =
    facts.openingPriceDollars *
    parameters.minorUnitsPerDollar.value *
    facts.housingFactor;
  const step = parameters.homePriceRoundingStepMinor.value;
  const priceMinor = Math.max(
    step,
    Math.round(unroundedPriceMinor / step) * step,
  );
  const downPaymentMinor = Math.round(priceMinor * facts.downPaymentShare);
  return {
    priceMinor,
    downPaymentMinor,
    mortgagePrincipalMinor: priceMinor - downPaymentMinor,
  };
}
