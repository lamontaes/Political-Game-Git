/**
 * Pure benefit and loan arithmetic for public programs and household debt
 * (specs 10 and 11). Every dollar value, rate and threshold is a parameter:
 * the law in force supplies it, so a law that changes a bend point, a raise or
 * a rate cap changes the result without touching this file. Amounts are in
 * integer cents (`MoneyAmount.minorUnits`); rates are basis points.
 *
 * Nothing here reads the World, the clock or the research files.
 */

/** Social Security's primary insurance amount formula, per month. */
export interface PrimaryInsuranceFormula {
  /** First and second bend points, in cents of average indexed monthly earnings. */
  readonly bendPointsMinor: readonly [number, number];
  /** Replacement shares below, between and above the bend points (90/32/15 today). */
  readonly factorsBasisPoints: readonly [number, number, number];
}

/**
 * The monthly benefit at full retirement age, before any claiming adjustment.
 * The statute rounds the result down to the next lower dime.
 */
export function primaryInsuranceAmountMinor(
  averageIndexedMonthlyEarningsMinor: number,
  formula: PrimaryInsuranceFormula,
): number {
  const aime = Math.max(0, Math.floor(averageIndexedMonthlyEarningsMinor));
  const [first, second] = formula.bendPointsMinor;
  const [low, middle, high] = formula.factorsBasisPoints;
  if (!(first > 0 && second > first)) {
    throw new Error("Bend points must be positive and increasing.");
  }
  const lowSlice = Math.min(aime, first);
  const middleSlice = Math.min(Math.max(aime - first, 0), second - first);
  const highSlice = Math.max(aime - second, 0);
  const raw =
    (lowSlice * low + middleSlice * middle + highSlice * high) / 10_000;
  return Math.floor(raw / 10) * 10;
}

/**
 * Full retirement age in months for a birth year. Before 1938 it is 65; it
 * rises two months a year to 66 for 1943-1954, then two months a year again to
 * 67 for 1960 and later. A law that raises the age passes a different table.
 */
export function fullRetirementAgeMonths(birthYear: number): number {
  if (birthYear <= 1937) return 65 * 12;
  if (birthYear <= 1942) return 65 * 12 + (birthYear - 1937) * 2;
  if (birthYear <= 1954) return 66 * 12;
  if (birthYear <= 1959) return 66 * 12 + (birthYear - 1954) * 2;
  return 67 * 12;
}

export interface ClaimingAdjustmentRule {
  /** Reduction per month for the first `firstReductionMonths` months early. */
  readonly firstReductionPerMonthBasisPoints: number;
  readonly firstReductionMonths: number;
  /** Reduction per month for each month beyond that. */
  readonly laterReductionPerMonthBasisPoints: number;
  /** Delayed retirement credit per month after full retirement age. */
  readonly delayedCreditPerMonthBasisPoints: number;
  readonly earliestClaimAgeMonths: number;
  readonly latestCreditAgeMonths: number;
}

/**
 * Current law: 5/9 of 1% a month for 36 months, then 5/12 of 1%; 2/3 of 1% a
 * month of delay (8% a year). Basis points are exact to 1/100 of a point.
 */
export const CURRENT_CLAIMING_ADJUSTMENT: ClaimingAdjustmentRule = {
  firstReductionPerMonthBasisPoints: 500 / 9,
  firstReductionMonths: 36,
  laterReductionPerMonthBasisPoints: 500 / 12,
  delayedCreditPerMonthBasisPoints: 200 / 3,
  earliestClaimAgeMonths: 62 * 12,
  latestCreditAgeMonths: 70 * 12,
};

/**
 * The monthly retired-worker benefit when claimed at `claimAgeMonths`, rounded
 * down to the whole dollar as it is paid. Returns null before the earliest
 * claiming age: the person is not yet eligible, which is not a zero benefit.
 */
export function retiredWorkerBenefitMinor(
  primaryInsuranceMinor: number,
  claimAgeMonths: number,
  fullRetirementAge: number,
  rule: ClaimingAdjustmentRule = CURRENT_CLAIMING_ADJUSTMENT,
): number | null {
  if (claimAgeMonths < rule.earliestClaimAgeMonths) return null;
  let adjustmentBasisPoints = 0;
  if (claimAgeMonths < fullRetirementAge) {
    const early = fullRetirementAge - claimAgeMonths;
    const first = Math.min(early, rule.firstReductionMonths);
    const later = Math.max(early - rule.firstReductionMonths, 0);
    adjustmentBasisPoints = -(
      first * rule.firstReductionPerMonthBasisPoints +
      later * rule.laterReductionPerMonthBasisPoints
    );
  } else {
    const late =
      Math.min(claimAgeMonths, rule.latestCreditAgeMonths) - fullRetirementAge;
    adjustmentBasisPoints = late * rule.delayedCreditPerMonthBasisPoints;
  }
  const raw =
    (primaryInsuranceMinor * (10_000 + adjustmentBasisPoints)) / 10_000;
  return Math.floor(raw / 100) * 100;
}

/**
 * A cost-of-living raise applied to a benefit, rounded down to the dime as the
 * statute does for the primary insurance amount.
 */
export function applyCostOfLivingRaiseMinor(
  benefitMinor: number,
  raiseBasisPoints: number,
): number {
  const raw = (benefitMinor * (10_000 + raiseBasisPoints)) / 10_000;
  return Math.floor(raw / 10) * 10;
}

/** SNAP's benefit rule for one household size in one place and year. */
export interface FoodAidRule {
  readonly maximumAllotmentMinor: number;
  /** Paid to one- and two-person households that qualify but compute lower. */
  readonly minimumBenefitMinor: number;
  readonly minimumBenefitMaxHouseholdSize: number;
  /** The share of net income a household is expected to spend on food. */
  readonly expectedContributionBasisPoints: number;
}

/**
 * The monthly SNAP benefit: the maximum allotment minus the expected
 * contribution from net income. The contribution is rounded up to the whole
 * dollar and the benefit down, as the regulation does. Returns 0 when the
 * formula leaves nothing and the minimum does not apply; eligibility (the
 * income tests and work rules) is decided before this is called.
 */
export function foodAidBenefitMinor(
  netMonthlyIncomeMinor: number,
  householdSize: number,
  rule: FoodAidRule,
): number {
  const contribution =
    Math.ceil(
      (Math.max(0, netMonthlyIncomeMinor) *
        rule.expectedContributionBasisPoints) /
        10_000 /
        100,
    ) * 100;
  const computed = Math.max(0, rule.maximumAllotmentMinor - contribution);
  const floored = Math.floor(computed / 100) * 100;
  if (householdSize <= rule.minimumBenefitMaxHouseholdSize) {
    return Math.max(floored, rule.minimumBenefitMinor);
  }
  return floored;
}

/**
 * Whether monthly income is at or under a share of the poverty line, the test
 * every income-limited program uses (138% for expansion Medicaid, 130% gross
 * and 100% net for SNAP). The poverty line is a parameter of the year.
 */
export function withinPovertyShare(
  monthlyIncomeMinor: number,
  annualPovertyLineMinor: number,
  shareBasisPoints: number,
): boolean {
  return (
    monthlyIncomeMinor * 12 * 10_000 <=
    annualPovertyLineMinor * shareBasisPoints
  );
}

/** The poverty line for a household: the first person plus each added person. */
export function povertyLineMinor(
  householdSize: number,
  firstPersonMinor: number,
  eachAddedPersonMinor: number,
): number {
  if (householdSize < 1)
    throw new Error("A household has at least one person.");
  return firstPersonMinor + (householdSize - 1) * eachAddedPersonMinor;
}

/**
 * The level monthly payment that pays off `principalMinor` over `termMonths`
 * at an annual rate, rounded up to the cent so the loan does not outlive its
 * term. A zero rate divides the principal evenly.
 */
export function amortizedMonthlyPaymentMinor(
  principalMinor: number,
  annualRateBasisPoints: number,
  termMonths: number,
): number {
  if (termMonths <= 0) throw new Error("A loan term must be at least a month.");
  if (principalMinor <= 0) return 0;
  const monthly = annualRateBasisPoints / 10_000 / 12;
  if (monthly === 0) return Math.ceil(principalMinor / termMonths);
  const factor = Math.pow(1 + monthly, termMonths);
  return Math.ceil((principalMinor * monthly * factor) / (factor - 1));
}

/** One month's interest on a balance, rounded to the nearest cent. */
export function monthlyInterestMinor(
  balanceMinor: number,
  annualRateBasisPoints: number,
): number {
  if (balanceMinor <= 0) return 0;
  return Math.round((balanceMinor * annualRateBasisPoints) / 10_000 / 12);
}

/**
 * A revolving account's minimum payment: a share of the balance plus the
 * month's interest, never less than a floor, never more than the balance.
 */
export function revolvingMinimumPaymentMinor(
  balanceMinor: number,
  annualRateBasisPoints: number,
  principalShareBasisPoints: number,
  floorMinor: number,
): number {
  if (balanceMinor <= 0) return 0;
  const interest = monthlyInterestMinor(balanceMinor, annualRateBasisPoints);
  const share = Math.ceil((balanceMinor * principalShareBasisPoints) / 10_000);
  return Math.min(
    balanceMinor + interest,
    Math.max(floorMinor, share + interest),
  );
}

/**
 * The rate a new loan may carry under a cap in force: the market rate, or the
 * cap when the market rate is above it. A null cap means no cap applies; an
 * unknown cap is the caller's to handle before this is reached.
 */
export function cappedAnnualRateBasisPoints(
  marketRateBasisPoints: number,
  capBasisPoints: number | null,
): number {
  return capBasisPoints === null
    ? marketRateBasisPoints
    : Math.min(marketRateBasisPoints, capBasisPoints);
}
