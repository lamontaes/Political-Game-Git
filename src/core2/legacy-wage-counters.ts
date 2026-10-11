/** Read canonical cumulative legacy receipts; no latest/history summation or cash effect. */
import type { FinanceReadGuard } from "./finance-plan";
import type { LegacyDiscretionaryWageTotals, WorkRuntime } from "./types";

export function readLegacyDiscretionaryWages(
  reads: FinanceReadGuard,
  work: Pick<WorkRuntime, "legacyDiscretionaryWages">,
  zero: number,
  one: number,
): LegacyDiscretionaryWageTotals {
  const actual = reads.field(work, "legacyDiscretionaryWages");
  if (!actual || typeof actual !== "object")
    throw new Error("Missing canonical legacy discretionary wage counters.");
  reads.payload(actual, zero, one);
  const earnedMinor = reads.field(actual, "earnedMinor"),
    paidMinor = reads.field(actual, "paidMinor"),
    shortfallMinor = reads.field(actual, "shortfallMinor"),
    completedReceiptCount = reads.field(actual, "completedReceiptCount");
  if (
    [earnedMinor, paidMinor, shortfallMinor, completedReceiptCount].some(
      (value) => !Number.isSafeInteger(value) || value < zero,
    )
  )
    throw new Error("Malformed canonical legacy discretionary wage counters.");
  if (
    earnedMinor - paidMinor !== shortfallMinor ||
    (completedReceiptCount === zero &&
      (earnedMinor !== zero || paidMinor !== zero))
  )
    throw new Error(
      "Nonconserving canonical legacy discretionary wage counters.",
    );
  return { earnedMinor, paidMinor, shortfallMinor, completedReceiptCount };
}
