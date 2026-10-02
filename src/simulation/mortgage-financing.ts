import {
  openHouseholdLoan,
  type OpenHouseholdLoanInput,
} from "./household-loans";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "./macro-economy/readers";
import type { MacroScopeKey } from "./macro-economy/types";
import { CRUNCH46_PROVISIONAL_POLICY } from "./macro-economy/policy";
import {
  amortizedMonthlyPaymentMinor,
  cappedAnnualRateBasisPoints,
} from "./public-benefit-formulas";
import type { EntityId, IsoDate, MoneyAmount, World } from "./types";

/** Owner-approved fixed mortgage term; the rate remains a saved world input. */
const FIXED_MORTGAGE_TERM_MONTHS = 30 * 12;

export interface MortgageFinancingQuote {
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

/**
 * The approved game mortgage rate is the saved housing/macro rate midpoint.
 * It is a game financing rule, not a claim that a bank offered this rate.
 * A missing or invalid saved rate supplies no quote.
 */
export function mortgageFinancingQuote(
  world: World,
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
  const store = world.macroEconomy;
  if (!store || store.start.effectiveDate > world.currentDate) return null;
  const local = input.jurisdictionId
    ? macroConditionsAt(
        world,
        macroScopeForJurisdiction(input.jurisdictionId),
        world.currentDate,
      )
    : null;
  let month = local ?? macroConditionsAt(world, "national", world.currentDate);
  const bank = store.centralBank;
  const bankIsCurrent =
    bank && (!bank.lastMeetingAt || bank.lastMeetingAt <= world.currentDate);
  const bankIsNewer =
    bankIsCurrent &&
    (!month ||
      (bank.lastMeetingAt !== null && bank.lastMeetingAt > month.recordedAt));
  if (bankIsNewer) month = null;
  // Before the first month closes, reuse the macro producer's opening rate.
  // This is the approved game reference, not a researched bank offer.
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
  const marketAnnualRateBasisPoints = ((lowerPct + upperPct) / 2) * 100;
  const annualRateBasisPoints = cappedAnnualRateBasisPoints(
    marketAnnualRateBasisPoints,
    input.rateCap?.capBasisPoints ?? null,
  );
  return {
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

/** Reuse the household loan writer; the purchase caller supplies other terms. */
export function openMortgageFinancing(
  world: World,
  input: Omit<
    OpenHouseholdLoanInput,
    "kind" | "marketAnnualRateBasisPoints" | "repayment"
  >,
): World | null {
  const quote = mortgageFinancingQuote(world, input);
  if (!quote) return null;
  return openHouseholdLoan(world, {
    ...input,
    kind: "mortgage",
    marketAnnualRateBasisPoints: quote.marketAnnualRateBasisPoints,
    repayment: { kind: "installment", termMonths: quote.termMonths },
  });
}
