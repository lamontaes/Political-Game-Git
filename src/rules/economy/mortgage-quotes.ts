/** Full retained saved-month/central-bank/reference selection and opening mortgage principal math. */
import { macroConditionsAt } from "./macro-readings";
import { CRUNCH46_PROVISIONAL_POLICY } from "./macro-policy";
import { amortizedMonthlyPaymentMinor } from "../laws/public-benefits";
import {
  cappedAnnualRateBasisPoints,
  monthlyInterestMinor,
} from "../laws/loan-arithmetic";
import type { OpenHouseholdLoanInput } from "../../simulation/household-loans";
import type { EntityId, IsoDate, MoneyAmount } from "../../simulation/types";
import type {
  MacroEconomyStore,
  MacroScopeKey,
} from "../../simulation/macro-economy/types";
export interface MortgageFacts {
  readonly onDate: IsoDate;
  readonly store: MacroEconomyStore | undefined;
}
const macroScopeForJurisdiction = (id: string): MacroScopeKey =>
  `jurisdiction:${id}`;
// stopgapId: "economy.mortgage-term"
const FIXED_MORTGAGE_TERM_MONTHS = 30 * 12;
const MORTGAGE_SPREAD_REFERENCE = {
  key: "fred-mortgage-policy-spread:2025-12-31",
  mortgageRatePct: 6.15,
  policyLowerPct: 3.5,
  policyUpperPct: 3.75,
} as const;
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
  readonly rateBasis:
    "recorded-macro-month" | "recorded-central-bank" | "opening-game-reference";
  readonly scope: MacroScopeKey;
  readonly recordedAt: IsoDate;
}
// stopgapId: "economy.mortgage-saved-rate-pass-through"
export function mortgageFinancingQuote(
  facts: MortgageFacts,
  input: {
    readonly principal: MoneyAmount;
    readonly jurisdictionId: EntityId | null;
    readonly rateCap: OpenHouseholdLoanInput["rateCap"];
  },
): MortgageFinancingQuote | null {
  if (
    !Number.isSafeInteger(input.principal.minorUnits) ||
    input.principal.minorUnits < 0
  )
    return null;
  const store = facts.store;
  if (!store || store.start.effectiveDate > facts.onDate) return null;
  const local = input.jurisdictionId
    ? macroConditionsAt(
        { months: facts.store?.months ?? [], releases: [] },
        macroScopeForJurisdiction(input.jurisdictionId),
        facts.onDate,
      )
    : null;
  let month =
    local ??
    macroConditionsAt(
      { months: facts.store?.months ?? [], releases: [] },
      "national",
      facts.onDate,
    );
  const bank = store.centralBank;
  const bankIsCurrent =
    bank && (!bank.lastMeetingAt || bank.lastMeetingAt <= facts.onDate);
  const bankIsNewer =
    bankIsCurrent &&
    (!month ||
      (bank.lastMeetingAt !== null && bank.lastMeetingAt > month.recordedAt));
  if (bankIsNewer) month = null;
  const reference = CRUNCH46_PROVISIONAL_POLICY.baseline.policyRateRangePct;
  const { lowerPct, upperPct } =
    month?.policyRate ??
    (bankIsNewer
      ? bank.policyRate
      : {
          lowerPct: reference.lower,
          upperPct: reference.upper,
        });
  if (
    !Number.isFinite(lowerPct) ||
    !Number.isFinite(upperPct) ||
    lowerPct < 0 ||
    upperPct < lowerPct
  )
    return null;
  const policyAnnualRateBasisPoints = ((lowerPct + upperPct) / 2) * 100;
  const mortgageSpreadBasisPoints =
    MORTGAGE_SPREAD_REFERENCE.mortgageRatePct * 100 -
    (MORTGAGE_SPREAD_REFERENCE.policyLowerPct * 100 +
      MORTGAGE_SPREAD_REFERENCE.policyUpperPct * 100) /
      2;
  const marketAnnualRateBasisPoints =
    policyAnnualRateBasisPoints + mortgageSpreadBasisPoints;
  const annualRateBasisPoints = cappedAnnualRateBasisPoints(
    marketAnnualRateBasisPoints,
    input.rateCap?.capBasisPoints ?? null,
  );
  return {
    policyAnnualRateBasisPoints,
    mortgageSpreadBasisPoints,
    mortgageSpreadReferenceKey: MORTGAGE_SPREAD_REFERENCE.key,
    marketAnnualRateBasisPoints,
    annualRateBasisPoints,
    termMonths: FIXED_MORTGAGE_TERM_MONTHS,
    monthlyPaymentMinor: amortizedMonthlyPaymentMinor(
      input.principal.minorUnits,
      annualRateBasisPoints,
      FIXED_MORTGAGE_TERM_MONTHS,
    ),
    macroMonthKey: month?.key ?? null,
    rateReferenceKey:
      month?.key ??
      (bankIsNewer ? bank.policyRate.decisionEventId : null) ??
      store.policyVersion,
    rateBasis: month
      ? "recorded-macro-month"
      : bankIsNewer
        ? "recorded-central-bank"
        : "opening-game-reference",
    scope: month?.scope ?? "national",
    recordedAt:
      month?.recordedAt ??
      (bankIsNewer ? bank.lastMeetingAt : null) ??
      store.start.effectiveDate,
  };
}
export function openingMortgageFinancingQuote(
  facts: MortgageFacts,
  input: {
    readonly homePrice: MoneyAmount;
    readonly downPaymentShare: number;
    readonly paidMonths: number;
    readonly jurisdictionId: EntityId;
    readonly rateCap: OpenHouseholdLoanInput["rateCap"];
  },
):
  | (MortgageFinancingQuote & {
      readonly originalPrincipalMinor: number;
      readonly remainingPrincipalMinor: number;
      readonly paidMonths: number;
      readonly remainingTermMonths: number;
    })
  | null {
  if (
    !Number.isSafeInteger(input.homePrice.minorUnits) ||
    input.homePrice.minorUnits <= 0 ||
    !Number.isFinite(input.downPaymentShare) ||
    input.downPaymentShare < 0 ||
    input.downPaymentShare > 1 ||
    !Number.isSafeInteger(input.paidMonths) ||
    input.paidMonths < 0
  )
    return null;
  const originalPrincipalMinor = Math.round(
    input.homePrice.minorUnits * (1 - input.downPaymentShare),
  );
  const quote = mortgageFinancingQuote(facts, {
    principal: {
      currency: input.homePrice.currency,
      minorUnits: originalPrincipalMinor,
    },
    jurisdictionId: input.jurisdictionId,
    rateCap: input.rateCap,
  });
  if (!quote) return null;
  const paidMonths = Math.min(input.paidMonths, quote.termMonths);
  let remainingPrincipalMinor = originalPrincipalMinor;
  for (let month = 0; month < paidMonths; month += 1)
    remainingPrincipalMinor = Math.max(
      0,
      remainingPrincipalMinor +
        monthlyInterestMinor(
          remainingPrincipalMinor,
          quote.annualRateBasisPoints,
        ) -
        quote.monthlyPaymentMinor,
    );
  const remainingTermMonths = quote.termMonths - paidMonths;
  return {
    ...quote,
    originalPrincipalMinor,
    remainingPrincipalMinor,
    paidMonths,
    remainingTermMonths,
    monthlyPaymentMinor:
      remainingPrincipalMinor > 0 && remainingTermMonths > 0
        ? amortizedMonthlyPaymentMinor(
            remainingPrincipalMinor,
            quote.annualRateBasisPoints,
            remainingTermMonths,
          )
        : 0,
  };
}
