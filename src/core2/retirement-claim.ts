/**
 * When someone claims Social Security retirement benefits: their own decision
 * inside the law's bounds (earliest at 62, the full retirement age for their
 * birth year, no gain from waiting past 70). Savings decide how long they can
 * wait; the person's traits pull later or earlier (every trait, through the
 * shared trait table, when the caller supplies the lean).
 * No roll decides it: the same person always claims at the same age.
 */
import type { SocialSecurityAges } from "./social-security-law";

export interface ClaimContext {
  /** The law's ages for this person: from the law in force, or as enacted on day one. */
  ages: SocialSecurityAges;
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

/**
 * The case for claiming after the full retirement age before personality, in
 * units of patience: the anchor and the pull of thin savings, over the years
 * one unit of patience moves the claim. Positive patience beyond it waits past
 * the full retirement age, so the claim age is a two-way score at the
 * decision's trait weight (`scripts/traits/trait-calibrate.ts` fits that
 * weight against the study of claiming age).
 */
export function claimWaitCase(
  bufferMonths: number,
  weights: ClaimWeights,
): number {
  const need = Math.max(
    0,
    1 - Math.max(0, bufferMonths) / weights.fullBufferMonths,
  );
  return weights.traitPullYears > 0
    ? (-weights.anchorYearsBeforeFull - need * weights.needPullYears) /
        weights.traitPullYears
    : 0;
}

/** The claim age in months, inside the law's bounds. */
export function retirementClaimAgeMonths(
  context: ClaimContext,
  weights: ClaimWeights,
): number {
  const { earliestMonths, fullMonths: full, delayedMaxMonths } = context.ages;
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
  return Math.max(earliestMonths, Math.min(delayedMaxMonths, months));
}
