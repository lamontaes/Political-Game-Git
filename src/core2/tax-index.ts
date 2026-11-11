/**
 * How far prices and pay have moved since the world opened, for the dollar
 * amounts a law indexes (money-tax-brackets-and-benefits-not-indexed-to-prices):
 * a schedule's brackets and standard deduction move with prices, the Social
 * Security wage base with pay, where the law row's terms say so
 * (`terms.indexed`, src/core2/laws-starting.ts). Read from the economy
 * engine's own months (src/core2/modules/macro.ts) by its table ids, so any
 * engine can read it without importing the economy: the latest month against
 * the opening month. One when the economy does not run or has not moved.
 */
import type { CoreAPI } from "./types";

/** The economy engine's module id and its state row (src/core2/modules/macro.ts). */
const MACRO = "macro";
const STATE_ID = "macro:state";

export interface TaxIndex {
  /** Prices now over prices at the opening. */
  readonly prices: number;
  /** Average hourly pay now over pay at the opening. */
  readonly wages: number;
}

export const NO_INDEX: TaxIndex = { prices: 1, wages: 1 };

export function taxIndexNow(api: CoreAPI): TaxIndex {
  if (!api.state.modules.has(MACRO)) return NO_INDEX;
  const store = api.moduleState(MACRO);
  const state = store.table("state").get(STATE_ID) as
    { openingMonth?: string; latestMonth?: string } | undefined;
  if (!state?.openingMonth || !state.latestMonth) return NO_INDEX;
  const month = (key: string) =>
    store.table("months").get(`macro-month:${key}`) as
      { priceIndex?: number; hourlyEarnings?: number } | undefined;
  const opening = month(state.openingMonth);
  const latest = month(state.latestMonth);
  const ratio = (now?: number, then?: number) =>
    now && then && now > 0 && then > 0 ? now / then : 1;
  return {
    prices: ratio(latest?.priceIndex, opening?.priceIndex),
    wages: ratio(latest?.hourlyEarnings, opening?.hourlyEarnings),
  };
}
