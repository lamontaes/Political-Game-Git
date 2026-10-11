export interface MoneyAmount {
  readonly minorUnits: number;
  readonly currency: string;
}
interface LawExposureRecord {
  readonly direction: "cost" | "gain" | "none";
  readonly amount: MoneyAmount | null;
}
// STOPGAP RULES4-OW-001: preserve legacy non-money estimate; see stopgaps.json.
export const NON_MONEY_FELT_SIZE = {
  monthsOfPay: 0.1,
  basis: "PLACEHOLDER",
  researchQuestionId: "felt-size-of-non-money-law-effects",
} as const;

export type LawExposureFeltSize =
  /** The share of a month's pay; `estimated` for a non-money effect. */
  | { readonly share: number; readonly estimated: boolean }
  /** Money whose size next to pay is unknown: the pay is not on record. */
  | "unmeasured"
  /** No side to feel: a non-money effect neither a loss nor a gain. */
  | null;

export function rightsOrEligibilityLoss(
  exposure: Pick<LawExposureRecord, "direction" | "amount">,
): boolean {
  return exposure.direction === "cost" && exposure.amount === null;
}

export function lawExposureFeltSize(
  exposure: Pick<LawExposureRecord, "direction" | "amount">,
  monthlyPayMinor: number,
): LawExposureFeltSize {
  if (exposure.direction === "none") return null;
  // A right or an eligibility lost, or one gained (the remaining exposure
  // with no amount), is felt at the same size.
  if (rightsOrEligibilityLoss(exposure) || exposure.amount === null)
    return { share: NON_MONEY_FELT_SIZE.monthsOfPay, estimated: true };
  if (monthlyPayMinor <= 0) return "unmeasured";
  return {
    share: exposure.amount.minorUnits / monthlyPayMinor,
    estimated: false,
  };
}

import { addDays } from "./calendar";
// STOPGAP RULES4-OW-002: retain the 28-day monthly-pay extrapolation and currency behavior.
export const PAY_WINDOW_DAYS = 28;
export const DAYS_PER_MONTH = 365.25 / 12;
export interface MonthlyPayFacts {
  readonly tracked: boolean;
  readonly openingCurrency: string;
  /** Only recorded work flows to this person; caller supplies the indexed set. */
  readonly workFlowIds: ReadonlySet<string>;
  readonly transfers: readonly {
    readonly resourceFlowId: string;
    readonly occurredAt: string;
    readonly transferredAmount: MoneyAmount;
  }[];
}
export function monthlyPayFromFacts(
  facts: MonthlyPayFacts,
  at: string,
): MoneyAmount | null {
  if (!facts.tracked) return null;
  const from = addDays(at, -PAY_WINDOW_DAYS);
  let total = 0;
  let currency: string | null = null;
  for (const outcome of facts.transfers) {
    if (!facts.workFlowIds.has(outcome.resourceFlowId)) continue;
    if (outcome.occurredAt <= from || outcome.occurredAt > at) continue;
    total += outcome.transferredAmount.minorUnits;
    currency = outcome.transferredAmount.currency;
  }
  return {
    minorUnits: Math.round((total * DAYS_PER_MONTH) / PAY_WINDOW_DAYS),
    currency: currency ?? facts.openingCurrency,
  };
}
