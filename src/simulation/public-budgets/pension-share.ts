import paid from "../../../data/research/money/pension-contribution-paid.json" with { type: "json" };
import { SeededRng } from "../rng";
import type { World } from "../types";
import { PUBLIC_BUDGETS_VERSION, type BudgetLawReading } from "./store";

/**
 * The share of its required pension contribution a government pays when no
 * law requires the full amount (Claude CTO, September 28, 2026, 10:32 p.m.
 * EDT, from Lamontae's notes): it starts from the national average with a
 * realistic spread per government, and drifts over time. Officials will
 * change it through budget bills once budgets pass as bills.
 *
 * ESTIMATED FROM AVERAGE. Both the spread and the drift are measured: the
 * Public Plans Database's share of the required contribution each plan
 * received, fiscal 2022 to 2024 (the spread), and each plan's change in that
 * share from one year to the next, fiscal 2019 to 2024 (the drift)
 * (`data/research/money/pension-contribution-paid.json`, written by
 * `scripts/research/export-pension-contribution-paid.py`). A government's
 * share is read at a point of that measured distribution, so most pay the
 * full amount, as most plans did, and a few pay far less or more.
 */

const SHARE: readonly number[] = paid.share.values;
const CHANGE: readonly number[] = paid.yearlyChange.values;

/** The measured median share: what a world without a seed uses. */
export const MEDIAN_PAID_SHARE: number = paid.share.median;

/** The value at point `at` (0 to 1) of an evenly spaced quantile table. */
function at(table: readonly number[], point: number): number {
  const position = Math.min(Math.max(point, 0), 1) * (table.length - 1);
  const low = Math.floor(position);
  const high = Math.min(low + 1, table.length - 1);
  return table[low]! + (table[high]! - table[low]!) * (position - low);
}

function point(world: World, key: string): number | null {
  if (!world.seed) return null;
  return new SeededRng(world.seed)
    .fork(`${PUBLIC_BUDGETS_VERSION}:pension-share:${key}`)
    .next();
}

/** A government's share when the world opens. */
export function openingPaidShare(world: World, governmentKey: string): number {
  const drawn = point(world, `${governmentKey}:open`);
  return round(drawn === null ? MEDIAN_PAID_SHARE : at(SHARE, drawn));
}

/** Its share for the next fiscal year: last year's, moved by one year's drift. */
export function driftedPaidShare(
  world: World,
  governmentKey: string,
  fiscalYear: number,
  share: number,
): number {
  const drawn = point(world, `${governmentKey}:${fiscalYear}`);
  if (drawn === null) return share;
  const moved = share + at(CHANGE, drawn);
  return round(Math.min(Math.max(moved, SHARE[0]!), SHARE.at(-1)!));
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

function round(share: number): number {
  return Math.round(share * 10_000) / 10_000;
}
