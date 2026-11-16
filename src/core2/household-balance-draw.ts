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
import { stableHash } from "./kernel/ids";

/** σ: the spread of the log balance among families alike in income (ESTIMATED from the survey's mean over median). */
export function balanceSpreadLog(): number {
  return (COUNTED_ROWS as unknown as Record<string, { value: number }>)
    .countedSavingsSpreadLog!.value;
}

/** The household's standard normal draw, from the world's seed and its id. */
export function balanceDrawZ(seed: string, householdId: string): number {
  const uniform = (key: string) =>
    (Number.parseInt(stableHash(key).slice(0, 12), 16) + 0.5) / 16 ** 12;
  const key = `${seed}:counted-saving:${householdId}`;
  return (
    Math.sqrt(-2 * Math.log(uniform(`${key}:a`))) *
    Math.cos(2 * Math.PI * uniform(`${key}:b`))
  );
}

/** The household's balance against its median: exp(σz), whose median is one. */
export function householdBalanceDraw(
  seed: string,
  householdId: string,
): number {
  return Math.exp(balanceSpreadLog() * balanceDrawZ(seed, householdId));
}
