// The registries engines fill at import time for the treasury: the in-town
// engines that pay a budget line this month without a payday (the law-reach
// benefits, the office day's lines), the laws that raise a line, and the fiscal
// rules a treasury reads as it budgets. A leaf module with no imports of
// engines: they register at import time, so the registry must exist before any
// of them loads, whichever file is entered first.
import type { CoreAPI } from "./types";
import type { GovernmentRow } from "./modules/budgets";

/** Lines in-town engines pay this month without a payday (law-reach benefits). */
export type LinePayer = (
  api: CoreAPI,
  gov: GovernmentRow,
) => Record<string, number>;

export const linePayers: LinePayer[] = [];

export function registerLinePayments(payer: LinePayer): void {
  if (!linePayers.includes(payer)) linePayers.push(payer);
}

/** A line raised in the budget in force by a law's own amount (a share of the line), as the law-reach engine that raised it records it. */
export interface LineAddition {
  readonly line: string;
  /** The law's policy key. */
  readonly key: string;
  /** The law row that raised the line. */
  readonly lawId: string;
  /** What the law added to the line this fiscal year, in minor units. */
  readonly annualMinor: number;
  /** What the treasury's payment is recorded as (ends in "-paid"). */
  readonly what: string;
}

export const lineAdders: {
  keys: readonly string[];
  additions: (api: CoreAPI, gov: GovernmentRow) => readonly LineAddition[];
}[] = [];

/** Law reach says which laws raise a line by their own amount, so the treasury can record whom their share of the line pays. */
export function registerLineAdditions(
  adder: (typeof lineAdders)[number],
): void {
  if (!lineAdders.some((a) => a.additions === adder.additions))
    lineAdders.push(adder);
}

/**
 * What another government's bills add to a government's own spending line
 * (a federal grant line a bill raised, paid on to the states and towns that
 * receive it, raises the line each of them spends it on). Registered by the
 * treasury; read when a budget is built and again when a bill amends the
 * federal budget. Each returns dollars to add to a line, and a negative
 * number takes from it.
 */
export type BudgetPassThrough = (
  api: CoreAPI,
  gov: GovernmentRow,
  revenueMinor: Readonly<Record<string, number>>,
) => Readonly<Record<string, number>>;
export const budgetPassThroughs: BudgetPassThrough[] = [];
export function registerBudgetPassThrough(through: BudgetPassThrough): void {
  if (!budgetPassThroughs.includes(through)) budgetPassThroughs.push(through);
}

/**
 * The fiscal rules a treasury reads as it budgets (a balanced budget, pension
 * funding, a minimum reserve): each month's close reads the rules in force and
 * applies them to the budget it then pays from, before any line is paid.
 */
type TreasuryRule = (api: CoreAPI) => void;
export const treasuryRules: TreasuryRule[] = [];
export function registerTreasuryRule(rule: TreasuryRule): void {
  if (!treasuryRules.includes(rule)) treasuryRules.push(rule);
}
