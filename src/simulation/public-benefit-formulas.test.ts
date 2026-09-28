import { describe, expect, it } from "vitest";
import {
  amortizedMonthlyPaymentMinor,
  applyCostOfLivingRaiseMinor,
  cappedAnnualRateBasisPoints,
  foodAidBenefitMinor,
  fullRetirementAgeMonths,
  monthlyInterestMinor,
  povertyLineMinor,
  primaryInsuranceAmountMinor,
  retiredWorkerBenefitMinor,
  revolvingMinimumPaymentMinor,
  withinPovertyShare,
  type FoodAidRule,
  type PrimaryInsuranceFormula,
} from "./public-benefit-formulas";

// Test fixtures only: the shape of current law with the researched 2026
// values, so the arithmetic is checked against hand-worked cases.
const FORMULA_2026: PrimaryInsuranceFormula = {
  bendPointsMinor: [128_600, 774_900],
  factorsBasisPoints: [9_000, 3_200, 1_500],
};

describe("Social Security arithmetic", () => {
  it("applies the three replacement shares and rounds down to the dime", () => {
    // 90% of $1,286 = $1,157.40; 32% of $3,714 = $1,188.48; total $2,345.88.
    expect(primaryInsuranceAmountMinor(500_000, FORMULA_2026)).toBe(234_580);
    // All three slices: $1,157.40 + 32% of $6,463 ($2,068.16) + 15% of
    // $2,251 ($337.65) = $3,563.21, rounded down to $3,563.20.
    expect(primaryInsuranceAmountMinor(1_000_000, FORMULA_2026)).toBe(356_320);
    expect(primaryInsuranceAmountMinor(0, FORMULA_2026)).toBe(0);
  });

  it("uses the full retirement age table by birth year", () => {
    expect(fullRetirementAgeMonths(1950)).toBe(66 * 12);
    expect(fullRetirementAgeMonths(1957)).toBe(66 * 12 + 6);
    expect(fullRetirementAgeMonths(1960)).toBe(67 * 12);
    expect(fullRetirementAgeMonths(1990)).toBe(67 * 12);
  });

  it("cuts 30% at 62 and adds 24% at 70 for a full age of 67", () => {
    const fra = 67 * 12;
    expect(retiredWorkerBenefitMinor(234_580, 62 * 12, fra)).toBe(164_200);
    expect(retiredWorkerBenefitMinor(234_580, fra, fra)).toBe(234_500);
    expect(retiredWorkerBenefitMinor(234_580, 70 * 12, fra)).toBe(290_800);
    // Credits stop at 70.
    expect(retiredWorkerBenefitMinor(234_580, 72 * 12, fra)).toBe(290_800);
  });

  it("is not eligible before the earliest claiming age, which is not zero", () => {
    expect(retiredWorkerBenefitMinor(234_580, 61 * 12, 67 * 12)).toBeNull();
  });

  it("applies a yearly raise", () => {
    expect(applyCostOfLivingRaiseMinor(201_500, 280)).toBe(207_140);
  });
});

describe("SNAP arithmetic", () => {
  const family: FoodAidRule = {
    maximumAllotmentMinor: 99_400,
    minimumBenefitMinor: 2_400,
    minimumBenefitMaxHouseholdSize: 2,
    expectedContributionBasisPoints: 3_000,
  };
  const single: FoodAidRule = { ...family, maximumAllotmentMinor: 29_800 };

  it("subtracts 30% of net income from the maximum", () => {
    expect(foodAidBenefitMinor(100_000, 4, family)).toBe(69_400);
    expect(foodAidBenefitMinor(0, 4, family)).toBe(99_400);
  });

  it("rounds the contribution up to the whole dollar", () => {
    // 30% of $1,000.01 is $300.003, which rounds up to $301.
    expect(foodAidBenefitMinor(100_001, 4, family)).toBe(69_300);
  });

  it("pays the minimum only to small households", () => {
    expect(foodAidBenefitMinor(100_000, 1, single)).toBe(2_400);
    expect(foodAidBenefitMinor(400_000, 4, family)).toBe(0);
  });

  it("tests income against a share of the poverty line", () => {
    const fourPerson = povertyLineMinor(4, 1_596_000, 568_000);
    expect(fourPerson).toBe(3_300_000);
    // 130% of $33,000 a year is $3,575 a month.
    expect(withinPovertyShare(357_500, fourPerson, 13_000)).toBe(true);
    expect(withinPovertyShare(357_501, fourPerson, 13_000)).toBe(false);
  });
});

describe("loan arithmetic", () => {
  it("pays a 30-year mortgage off level", () => {
    // $100,000 at 6% for 360 months is $599.55 a month, rounded up.
    expect(amortizedMonthlyPaymentMinor(10_000_000, 600, 360)).toBe(59_956);
    expect(amortizedMonthlyPaymentMinor(120_000, 0, 12)).toBe(10_000);
    expect(amortizedMonthlyPaymentMinor(0, 700, 60)).toBe(0);
  });

  it("the level payment retires the balance within its term", () => {
    let balance = 2_000_000;
    const rate = 747;
    const payment = amortizedMonthlyPaymentMinor(balance, rate, 48);
    for (let month = 0; month < 48; month += 1) {
      balance += monthlyInterestMinor(balance, rate);
      balance -= Math.min(balance, payment);
    }
    expect(balance).toBe(0);
  });

  it("charges a card's minimum as a share plus interest, with a floor", () => {
    // $2,700 at 22.15%: interest $49.84, 1% share $27.
    expect(revolvingMinimumPaymentMinor(270_000, 2_215, 100, 2_500)).toBe(
      4_984 + 2_700,
    );
    expect(revolvingMinimumPaymentMinor(1_000, 2_215, 100, 2_500)).toBe(1_018);
  });

  it("holds a new loan's rate at the cap in force", () => {
    expect(cappedAnnualRateBasisPoints(39_100, 3_600)).toBe(3_600);
    expect(cappedAnnualRateBasisPoints(2_215, 3_600)).toBe(2_215);
    expect(cappedAnnualRateBasisPoints(2_215, null)).toBe(2_215);
  });
});
