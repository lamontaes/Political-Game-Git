import { describe, expect, it } from "vitest";
import {
  HOUSING_PRICE_COEFFICIENTS,
  priceGrowthMonthly,
} from "./housing-price-model";

const still = {
  lastGrowth: 0,
  incomeGrowth: 0,
  rateChangePp: 0,
  priceToIncomeGapLog: 0,
  housingLawEffect: 0,
};

describe("home price growth", () => {
  it("does not move a place whose inputs are all still", () => {
    expect(priceGrowthMonthly(still)).toBe(0);
  });

  it("carries momentum and follows income", () => {
    expect(priceGrowthMonthly({ ...still, lastGrowth: 0.12 })).toBeCloseTo(
      (0.63 * 0.12) / 12,
      10,
    );
    expect(priceGrowthMonthly({ ...still, incomeGrowth: 0.04 })).toBeCloseTo(
      (0.38 * 0.04) / 12,
      10,
    );
  });

  it("falls when the mortgage rate rises and when prices run above income", () => {
    expect(priceGrowthMonthly({ ...still, rateChangePp: 2 })).toBeLessThan(0);
    expect(
      priceGrowthMonthly({ ...still, priceToIncomeGapLog: 0.2 }),
    ).toBeLessThan(0);
    expect(
      priceGrowthMonthly({ ...still, priceToIncomeGapLog: -0.2 }),
    ).toBeGreaterThan(0);
  });

  it("adds the town's own events on top of the measured model", () => {
    expect(
      priceGrowthMonthly({ ...still, housingLawEffect: 0.004 }),
    ).toBeCloseTo(0.004, 10);
  });

  it("compounds twelve still months of a steady year to the annual model", () => {
    const yearly = 0.63 * 0.06 + 0.38 * 0.03;
    const monthly = priceGrowthMonthly({
      ...still,
      lastGrowth: 0.06,
      incomeGrowth: 0.03,
    });
    expect(monthly * 12).toBeCloseTo(yearly, 10);
  });

  it("records where the coefficients came from and what is not read", () => {
    expect(HOUSING_PRICE_COEFFICIENTS.measuredOn).toMatch(/1980-2024/);
    expect(HOUSING_PRICE_COEFFICIENTS.supplyTerm).toMatch(/NOT READ/);
  });
});
