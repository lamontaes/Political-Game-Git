import { ECONOMY_RULE_PARAMETERS as parameters } from "./parameters";

export interface MortgageRateFacts {
  readonly macroStarted: boolean;
  readonly principalMinor: number;
  readonly rateCapBasisPoints: number | null;
  readonly policyLowerPercent: number;
  readonly policyUpperPercent: number;
  readonly macroMonthKey: string | null;
  readonly rateReferenceKey: string;
  readonly rateBasis:
    "recorded-macro-month" | "recorded-central-bank" | "opening-game-reference";
  readonly scope: string;
  readonly recordedAt: string;
}

export interface MortgageFinancingQuote {
  readonly policyAnnualRateBasisPoints: number;
  readonly mortgageSpreadBasisPoints: number;
  readonly mortgageSpreadReferenceKey: string;
  readonly marketAnnualRateBasisPoints: number;
  readonly annualRateBasisPoints: number;
  readonly termMonths: number;
  readonly monthlyPaymentMinor: number;
  readonly macroMonthKey: string | null;
  readonly rateReferenceKey: string;
  readonly rateBasis: MortgageRateFacts["rateBasis"];
  readonly scope: string;
  readonly recordedAt: string;
}

/** Calculate the quote once a reader has selected the policy-rate facts. */
export function mortgageQuoteFromFacts(
  facts: MortgageRateFacts,
): MortgageFinancingQuote | null {
  if (
    !facts.macroStarted ||
    !Number.isSafeInteger(facts.principalMinor) ||
    facts.principalMinor < 0
  )
    return null;
  const {
    mortgageRatePercent,
    policyLowerPercent,
    policyUpperPercent,
    referenceKey,
  } = parameters.mortgageSpreadReference.value;
  if (
    !Number.isFinite(facts.policyLowerPercent) ||
    !Number.isFinite(facts.policyUpperPercent) ||
    facts.policyLowerPercent < 0 ||
    facts.policyUpperPercent < facts.policyLowerPercent
  )
    return null;

  const policyAnnualRateBasisPoints =
    ((facts.policyLowerPercent + facts.policyUpperPercent) / 2) *
    parameters.basisPointsPerPercent.value;
  const mortgageSpreadBasisPoints =
    mortgageRatePercent * parameters.basisPointsPerPercent.value -
    ((policyLowerPercent + policyUpperPercent) *
      parameters.basisPointsPerPercent.value) /
      2;
  const marketAnnualRateBasisPoints =
    policyAnnualRateBasisPoints + mortgageSpreadBasisPoints;
  const annualRateBasisPoints =
    facts.rateCapBasisPoints === null
      ? marketAnnualRateBasisPoints
      : Math.min(marketAnnualRateBasisPoints, facts.rateCapBasisPoints);
  const termMonths = parameters.mortgageTermMonths.value;

  return {
    policyAnnualRateBasisPoints,
    mortgageSpreadBasisPoints,
    mortgageSpreadReferenceKey: referenceKey,
    marketAnnualRateBasisPoints,
    annualRateBasisPoints,
    termMonths,
    monthlyPaymentMinor: amortizedMonthlyPaymentMinor(
      facts.principalMinor,
      annualRateBasisPoints,
      termMonths,
    ),
    macroMonthKey: facts.macroMonthKey,
    rateReferenceKey: facts.rateReferenceKey,
    rateBasis: facts.rateBasis,
    scope: facts.scope,
    recordedAt: facts.recordedAt,
  };
}

function amortizedMonthlyPaymentMinor(
  principalMinor: number,
  annualRateBasisPoints: number,
  termMonths: number,
): number {
  if (principalMinor <= 0) return 0;
  const monthly =
    annualRateBasisPoints /
    parameters.basisPointsPerWholeRate.value /
    parameters.monthsPerYear.value;
  if (monthly === 0) return Math.ceil(principalMinor / termMonths);
  const factor = Math.pow(1 + monthly, termMonths);
  return Math.ceil((principalMinor * monthly * factor) / (factor - 1));
}
