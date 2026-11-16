/**
 * A household's own draw of savings against the survey's median for a family
 * like it (`medianTransactionBalance`, starting-cash.ts). Families alike in
 * income and age still hold very different balances (the Survey of Consumer
 * Finances' mean runs far above its median), so each household's balance is
 * its median times exp(σz), σ the survey's spread within an income group
 * (`countedSavingsSpreadLog`), z drawn once from the world's seed and the
 * household's id: who exists, not what anyone does, and never redrawn.
 *
 * Every household's opening cash is its median times this draw, full or
 * counted, and a counted group's account is shared by `savingWeight`, the same
 * draw over its mean (counted-money.ts), so collapsing a household into the
 * counts keeps its money and its share.
 */
import COUNTED_ROWS from "./data/counted/parameters.json" with { type: "json" };
import { seededFineUnit } from "./seeded";

/** σ: the spread of the log balance among families alike in income (ESTIMATED from the survey's mean over median). */
export function balanceSpreadLog(): number {
  return (COUNTED_ROWS as unknown as Record<string, { value: number }>)
    .countedSavingsSpreadLog!.value;
}

/**
 * The household's standard normal draw, from the world's seed and its id, by
 * Box-Muller on two of the world's seeded units (seeded.ts, SHA-256), which
 * are independent (pool item counted-saving-draw-not-normal).
 */
export function balanceDrawZ(seed: string, householdId: string): number {
  const key = `counted-saving:${householdId}`;
  // Half a step above zero, so the logarithm is finite.
  const u = seededFineUnit(seed, `${key}:a`) + 2 ** -53;
  return (
    Math.sqrt(-2 * Math.log(u)) *
    Math.cos(2 * Math.PI * seededFineUnit(seed, `${key}:b`))
  );
}

/** The household's balance against its median: exp(σz), whose median is one. */
export function householdBalanceDraw(
  seed: string,
  householdId: string,
): number {
  return Math.exp(balanceSpreadLog() * balanceDrawZ(seed, householdId));
}
