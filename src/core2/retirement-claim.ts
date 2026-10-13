/**
 * When someone claims Social Security retirement benefits: their own decision
 * inside the law's bounds (earliest at 62, the full retirement age for their
 * birth year, no gain from waiting past 70). Savings decide how long they can
 * wait; the person's traits pull later or earlier (every trait, through the
 * shared trait table, when the caller supplies the lean).
 * No roll decides it: the same person always claims at the same age.
 */
import ages from "./data/social-security-ages.json" with { type: "json" };
import { stopgap } from "./stopgaps";

export interface ClaimContext {
  birthYear: number;
  /** Months the household's cash covers its living costs. */
  bufferMonths: number;
  /**
   * Every trait's lean toward waiting over claiming now (about −1..1, from
   * the shared trait table). When given, it replaces the three-trait mean.
   */
  patience?: number;
  /** Traits on the −1..1 scale; missing ones count as 0. */
  deliberation?: number;
  reliability?: number;
  risk?: number;
  /**
   * The person's ages under the law in force, in months (GOV's
   * `socialSecurityAges`). Without it, the core's table of the same statute.
   */
  law?: {
    earliestMonths: number;
    fullMonths: number;
    delayedMaxMonths: number;
  };
}

export interface ClaimWeights {
  /** Years before full retirement age a person with no pull either way claims. */
  anchorYearsBeforeFull: number;
  /** Years later per unit of patience (mean of deliberation, reliability, −risk). */
  traitPullYears: number;
  /** Years earlier for someone with no savings, shrinking to 0 at a full buffer. */
  needPullYears: number;
  /** Months of living costs at which savings no longer push an early claim. */
  fullBufferMonths: number;
}

/** The full retirement age, in months, for a birth year (Social Security Act §216(l)). */
export function fullRetirementAgeMonths(birthYear: number): number {
  stopgap(ages.stopgapId);
  const row = ages.fullRetirementAge.find((r) => birthYear <= r.bornThrough);
  if (!row) throw new Error(`No full retirement age for ${birthYear}`);
  return row.ageMonths;
}

/** The claim age in months, inside the law's bounds. */
export function retirementClaimAgeMonths(
  context: ClaimContext,
  weights: ClaimWeights,
): number {
  const full =
    context.law?.fullMonths ?? fullRetirementAgeMonths(context.birthYear);
  const patience =
    context.patience ??
    ((context.deliberation ?? 0) +
      (context.reliability ?? 0) -
      (context.risk ?? 0)) /
      3;
  const need = Math.max(
    0,
    1 - Math.max(0, context.bufferMonths) / weights.fullBufferMonths,
  );
  const years =
    -weights.anchorYearsBeforeFull +
    patience * weights.traitPullYears -
    need * weights.needPullYears;
  const months = Math.round(full + years * 12);
  return Math.max(
    context.law?.earliestMonths ?? ages.earliestClaimAgeMonths,
    Math.min(
      context.law?.delayedMaxMonths ?? ages.latestCreditAgeMonths,
      months,
    ),
  );
}
