import paid from "../../../data/research/money/pension-contribution-paid.json" with { type: "json" };
import funded from "../../../data/research/money/pension-funded-ratio.json" with { type: "json" };
import type { BudgetLevel, BudgetLawReading } from "./store";

/**
 * The share of its required pension contribution a government pays when no
 * law requires the full amount. It starts from the government's own real
 * reported payment (Claude CTO, September 29, 2026, 12:54 a.m. EDT): each
 * state's from the plans its government administers, and each county's and
 * city's from its own plans, in the Public Plans Database, the latest year
 * reported, weighted by each plan's liability
 * (`data/research/money/pension-contribution-paid.json`, written by
 * `scripts/research/export-pension-contribution-paid.py`). A government the
 * database does not list pays the measured median of every plan, fiscal
 * 2022 to 2024: ESTIMATED FROM AVERAGE.
 *
 * The share stays where it starts until officials change it through budget
 * bills (HARDWIRED until budgets pass as bills).
 */

/** The measured median share: what an unlisted government pays. */
export const MEDIAN_PAID_SHARE: number = paid.share.median;

const BY_STATE: Readonly<Record<string, { readonly share: number }>> =
  paid.byState;
const BY_LOCAL = new Map(
  paid.byLocal.map((row) => [
    `${row.state}|${row.kind}|${row.name.toLowerCase()}`,
    row.share,
  ]),
);

export interface PaidShareSource {
  readonly share: number;
  /** Reported by the government's own plans, or the median of all plans. */
  readonly basis: "reported" | "estimated-from-average";
}

/**
 * A government's share when the world opens. `name` is the government's
 * display name ("Cook County, Illinois"); the part before the comma is
 * matched against the plans' names.
 */
export function openingPaidShare(
  stateKey: string,
  level: BudgetLevel,
  name: string,
): PaidShareSource {
  const usps = stateKey.replace(/^US-/, "");
  const reported =
    level === "state"
      ? BY_STATE[usps]?.share
      : BY_LOCAL.get(
          `${usps}|${level}|${name.split(",")[0]!.trim().toLowerCase()}`,
        );
  return reported === undefined
    ? { share: MEDIAN_PAID_SHARE, basis: "estimated-from-average" }
    : { share: reported, basis: "reported" };
}

/** The measured median funded ratio: what an unlisted government opens at. */
export const MEDIAN_FUNDED_RATIO: number = funded.median;

const FUNDED_BY_STATE: Readonly<
  Record<string, { readonly fundedRatio: number }>
> = funded.byState;
const FUNDED_BY_LOCAL = new Map(
  funded.byLocal.map((row) => [
    `${row.state}|${row.kind}|${row.name.toLowerCase()}`,
    row.fundedRatio,
  ]),
);

export interface FundedRatioSource {
  readonly fundedRatio: number;
  /** Reported by the government's own plans, or the median of all plans. */
  readonly basis: "reported" | "estimated-from-average";
}

/**
 * The share of its pension liability a government's plans hold in assets
 * when the world opens: each state's from the plans its government
 * administers, each county's and city's from its own plans, the latest year
 * the Public Plans Database reports (`pension-funded-ratio.json`, written by
 * `scripts/research/export-pension-funded-ratio.py`). A government the
 * database does not list opens at the median of every plan: ESTIMATED FROM
 * AVERAGE.
 */
export function openingFundedRatio(
  stateKey: string,
  level: BudgetLevel,
  name: string,
): FundedRatioSource {
  const usps = stateKey.replace(/^US-/, "");
  const reported =
    level === "state"
      ? FUNDED_BY_STATE[usps]?.fundedRatio
      : FUNDED_BY_LOCAL.get(
          `${usps}|${level}|${name.split(",")[0]!.trim().toLowerCase()}`,
        );
  return reported === undefined
    ? { fundedRatio: MEDIAN_FUNDED_RATIO, basis: "estimated-from-average" }
    : { fundedRatio: reported, basis: "reported" };
}

/**
 * The contribution the budget pays: at least the full amount under a law
 * requiring it, and the government's own share otherwise.
 */
export function pensionPayment(
  required: number,
  share: number,
  law: BudgetLawReading,
): number {
  return Math.round(
    required * (law.answer === "yes" ? Math.max(1, share) : share),
  );
}
