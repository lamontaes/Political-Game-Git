/**
 * When someone claims Social Security retirement benefits: their own decision
 * inside the law's bounds (earliest at 62, the full retirement age for their
 * birth year, no gain from waiting past 70). Savings decide how long they can
 * wait; the person's traits pull later or earlier (every trait, through the
 * shared trait table, when the caller supplies the lean).
 * No roll decides it: the same person always claims at the same age.
 */
import law from "./data/laws/social-security-ages.json" with { type: "json" };

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

/** A person's Social Security ages in months, as the laws module reports them. */
export interface SocialSecurityAgesMonths {
  earliestMonths: number;
  fullMonths: number;
  delayedMaxMonths: number;
}

const series = law.series;

/** The full retirement age, in months, for a birth year under the enacted law row (42 U.S.C. § 416(l)). */
export function fullRetirementAgeMonths(birthYear: number): number {
  const full = series["social-security-full-retirement-age"];
  const row = full.schedule.find((r) => birthYear <= r.bornThrough);
  return row?.months ?? Math.round(full.valueYears * 12);
}

/** The enacted ages, for an opening built before the laws module runs. */
export function enactedSocialSecurityAges(
  birthYear: number,
): SocialSecurityAgesMonths {
  return {
    earliestMonths: Math.round(
      series["social-security-earliest-claim-age"].valueYears * 12,
    ),
    fullMonths: fullRetirementAgeMonths(birthYear),
    delayedMaxMonths: Math.round(
      series["social-security-delayed-credit-age"].valueYears * 12,
    ),
  };
}

/** The claim age in months, inside the law's bounds (the law in force when given). */
export function retirementClaimAgeMonths(
  context: ClaimContext,
  weights: ClaimWeights,
  ages: SocialSecurityAgesMonths = enactedSocialSecurityAges(context.birthYear),
): number {
  const full = ages.fullMonths;
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
  return Math.max(ages.earliestMonths, Math.min(ages.delayedMaxMonths, months));
}
