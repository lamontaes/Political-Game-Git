import { describe, expect, it } from "vitest";
import {
  FEDERAL_INCOME_TAX_2026,
  annualTax,
  payPeriodsPerYear,
  stateIncomeTaxSchedule,
  withholdingForPaycheck,
} from "./income-tax-withholding";
import {
  RESEARCHED_PLACE_KEYS,
  isTerritory,
  placeWageIncomeTax,
} from "./statutory-tax-rules";

describe("federal income tax, 2026", () => {
  it("taxes a single filer and a joint return by their own brackets", () => {
    const single = FEDERAL_INCOME_TAX_2026.single!;
    // $12,400 at 10% is $1,240; $37,600 more at 12% is $4,512: $5,752.
    expect(annualTax(5_000_000, single.brackets)).toBe(575_200);
    const joint = FEDERAL_INCOME_TAX_2026["married-filing-jointly"]!;
    // $24,800 at 10% is $2,480; $75,200 more at 12% is $9,024: $11,504.
    expect(annualTax(10_000_000, joint.brackets)).toBe(1_150_400);
    expect(single.standardDeductionMinor).toBe(1_610_000);
    expect(joint.standardDeductionMinor).toBe(3_220_000);
    expect(annualTax(0, single.brackets)).toBe(0);
  });

  it("leaves head of household UNKNOWN until its schedule is read", () => {
    expect(FEDERAL_INCOME_TAX_2026["head-of-household"]).toBeNull();
  });

  it("withholds a weekly paycheck by annualizing it", () => {
    // $1,000 a week is $52,000 a year; less $16,100 is $35,900, which owes
    // $1,240 plus 12% of $23,500 ($2,820): $4,060 a year, $78.08 a week.
    expect(
      withholdingForPaycheck(100_000, 52, FEDERAL_INCOME_TAX_2026.single!),
    ).toEqual({ taxableMinor: 69_038, withheldMinor: 7_808 });
    // Pay below the deduction withholds nothing.
    expect(
      withholdingForPaycheck(20_000, 52, FEDERAL_INCOME_TAX_2026.single!)
        .withheldMinor,
    ).toBe(0);
  });

  it("counts pay periods from the period the pay covered", () => {
    const period = (start: string, end: string) =>
      payPeriodsPerYear({
        periodStartsAt: start as never,
        periodEndsAt: end as never,
      });
    expect(period("2026-03-02", "2026-03-02")).toBe(260);
    expect(period("2026-03-02", "2026-03-08")).toBe(52);
    expect(period("2026-03-02", "2026-03-15")).toBe(26);
    expect(period("2026-03-01", "2026-03-15")).toBe(24);
    expect(period("2026-03-01", "2026-03-31")).toBe(12);
    expect(period("2026-03-01", "2026-03-28")).toBe(12);
  });
});

describe("state income tax, all 56 places", () => {
  it("prices a place only where its schedule was read, and never guesses", () => {
    let priced = 0;
    for (const key of RESEARCHED_PLACE_KEYS) {
      const place = placeWageIncomeTax(key);
      const single = stateIncomeTaxSchedule(key, "single");
      if (place.status === "not-imposed") {
        expect(single.kind, key).toBe("none");
        continue;
      }
      if (isTerritory(key)) {
        // The territories are outside the state compilation.
        expect(single.kind, key).toBe("unknown");
        continue;
      }
      expect(single.kind, key).not.toBe("none");
      if (single.kind === "schedule") {
        priced += 1;
        expect(single.schedule.brackets.length, key).toBeGreaterThan(0);
        expect(single.schedule.sourceUrl, key).toContain("taxfoundation.org");
      } else if (single.kind === "unknown") {
        expect(single.researchQuestionId, key).toBeTruthy();
      }
      // Married and head-of-household schedules have not been read anywhere.
      expect(stateIncomeTaxSchedule(key, "married-filing-jointly").kind).toBe(
        "unknown",
      );
      expect(stateIncomeTaxSchedule(key, "head-of-household").kind).toBe(
        "unknown",
      );
    }
    // 42 places tax wages; the 10 with personal exemptions or credits in
    // place of a standard deduction stay UNKNOWN until those are read.
    expect(priced).toBe(32);
  });

  it("taxes Montana's wages at its 2026 rates", () => {
    const montana = stateIncomeTaxSchedule("US-MT", "single");
    expect(montana.kind).toBe("schedule");
    if (montana.kind !== "schedule") return;
    expect(montana.schedule.brackets.map((row) => row.rateBasisPoints)).toEqual(
      [470, 565],
    );
  });
});
