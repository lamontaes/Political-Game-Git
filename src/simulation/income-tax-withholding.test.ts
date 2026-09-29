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

  it("taxes a head of household by its own brackets", () => {
    const head = FEDERAL_INCOME_TAX_2026["head-of-household"]!;
    expect(head.standardDeductionMinor).toBe(2_415_000);
    // $17,700 at 10% is $1,770; $22,300 more at 12% is $2,676: $4,446.
    expect(annualTax(4_000_000, head.brackets)).toBe(444_600);
    expect(head.brackets.at(-1)).toEqual({
      overMinor: 64_060_000,
      rateBasisPoints: 3700,
    });
    expect(head.sourceUrl).toMatch(/rp-25-32\.pdf$/);
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
  it("prices every state that taxes wages, estimating the parts not read", () => {
    let read = 0;
    const estimated: string[] = [];
    for (const key of RESEARCHED_PLACE_KEYS) {
      const place = placeWageIncomeTax(key);
      const single = stateIncomeTaxSchedule(key, "single", "seed");
      if (place.status === "not-imposed") {
        expect(single.kind, key).toBe("none");
        continue;
      }
      if (isTerritory(key)) {
        // The territories are outside the state compilation.
        expect(single.kind, key).toBe("unknown");
        continue;
      }
      if (single.kind !== "schedule") throw new Error(key);
      expect(single.schedule.brackets.length, key).toBeGreaterThan(0);
      expect(single.schedule.sourceUrl, key).toContain("taxfoundation.org");
      if (single.estimatedFromAverage) {
        estimated.push(key);
        expect(single.estimatedFromAverage).toMatch(
          /^ESTIMATED FROM AVERAGE: the state's personal exemptions/,
        );
      } else read += 1;
      // Joint returns and heads of household are estimated everywhere.
      for (const status of [
        "married-filing-jointly",
        "head-of-household",
      ] as const) {
        const other = stateIncomeTaxSchedule(key, status, "seed");
        if (other.kind !== "schedule") throw new Error(`${key} ${status}`);
        expect(other.estimatedFromAverage, key).toMatch(
          /^ESTIMATED FROM AVERAGE: /,
        );
      }
    }
    // 42 places tax wages; the 10 with personal exemptions or credits in
    // place of a standard deduction take the average deduction.
    expect(read).toBe(32);
    expect(estimated.sort()).toEqual(
      [
        "US-CT",
        "US-IL",
        "US-IN",
        "US-MA",
        "US-MI",
        "US-NJ",
        "US-OH",
        "US-PA",
        "US-UT",
        "US-WV",
      ].sort(),
    );
  });

  it("doubles a joint return and files a head of household as single", () => {
    const single = stateIncomeTaxSchedule("US-MT", "single", "seed");
    const joint = stateIncomeTaxSchedule(
      "US-MT",
      "married-filing-jointly",
      "seed",
    );
    const head = stateIncomeTaxSchedule("US-MT", "head-of-household", "seed");
    if (
      single.kind !== "schedule" ||
      joint.kind !== "schedule" ||
      head.kind !== "schedule"
    )
      throw new Error("Montana is not priced");
    expect(joint.schedule.standardDeductionMinor).toBe(
      single.schedule.standardDeductionMinor * 2,
    );
    expect(joint.schedule.brackets.map((row) => row.overMinor)).toEqual(
      single.schedule.brackets.map((row) => row.overMinor * 2),
    );
    expect(head.schedule).toEqual(single.schedule);
    expect(head.estimatedFromAverage).toMatch(
      /head of household files on the single schedule/,
    );
  });

  it("moves an unread deduction by the world's seed within the spread", () => {
    const deduction = (seed: string) => {
      const ohio = stateIncomeTaxSchedule("US-OH", "single", seed);
      if (ohio.kind !== "schedule") throw new Error("Ohio is not priced");
      return ohio.schedule.standardDeductionMinor;
    };
    expect(deduction("a")).toBe(deduction("a"));
    expect(deduction("a")).not.toBe(deduction("b"));
    for (const seed of ["a", "b", "c"]) {
      expect(deduction(seed)).toBeGreaterThan(0);
    }
  });

  it("taxes Montana's wages at its 2026 rates", () => {
    const montana = stateIncomeTaxSchedule("US-MT", "single", "seed");
    expect(montana.kind).toBe("schedule");
    if (montana.kind !== "schedule") return;
    expect(montana.schedule.brackets.map((row) => row.rateBasisPoints)).toEqual(
      [470, 565],
    );
  });
});
