import { describe, expect, it } from "vitest";
import stateIncomeTax2026 from "../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import stateHouseholdIncome2023 from "../../data/research/money/state-household-income-cps-2023.json" with { type: "json" };
import {
  FEDERAL_INCOME_TAX_2026,
  annualTax,
  reciprocalRankedReferences,
  weightedReferenceMean,
  payPeriodsPerYear,
  stateDeductionEstimate,
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
  it("ranks similar states for Connecticut's unread deduction", () => {
    const result = stateIncomeTaxSchedule("US-CT", "single", "seed");
    if (result.kind !== "schedule")
      throw new Error("Connecticut is not priced");
    expect(result.schedule.standardDeductionMinor).toBe(892_600);
    // Census H-8, 2023 current dollars: CT $92,240; VT $85,190;
    // RI $81,860; NY $81,600; ME $75,740; MN $90,340.
    // The four Northeast graduated-tax references precede closer-income MN.
    const estimate = stateDeductionEstimate("US-CT");
    expect(estimate.references).toHaveLength(32);
    expect(estimate.references.slice(0, 5).map((ref) => ref.stateKey)).toEqual([
      "US-VT",
      "US-RI",
      "US-NY",
      "US-ME",
      "US-MN",
    ]);
    expect(
      estimate.references.slice(0, 5).map((ref) => ref.incomeDistanceDollars),
    ).toEqual([7050, 10_380, 10_640, 16_500, 1900]);
    expect(estimate.references.slice(0, 5).map((ref) => ref.weight)).toEqual([
      1,
      1 / 2,
      1 / 3,
      1 / 4,
      1 / 5,
    ]);
    expect(result.estimatedFromAverage).toContain("reciprocal ranks");
    expect(result.estimatedFromAverage).toContain("authored estimation rule");
    expect(result.estimatedFromAverage).toContain("CPS ASEC Table H-8, 2023");
    expect(
      Object.keys(stateHouseholdIncome2023.medianHouseholdIncomeDollarsByState),
    ).toHaveLength(51);
    expect(
      stateHouseholdIncome2023.medianHouseholdIncomeDollarsByState["US-CT"],
    ).toBe(92_240);
  });

  it("puts matching tax structure ahead of region and region ahead of income", () => {
    const references = stateDeductionEstimate("US-IL").references;
    // All nine flat-tax references precede every graduated-tax reference,
    // including graduated-tax states in Illinois's Midwest region.
    expect(references.slice(0, 9).every((ref) => ref.sameTaxStructure)).toBe(
      true,
    );
    expect(references.slice(9).every((ref) => !ref.sameTaxStructure)).toBe(
      true,
    );
    expect(references[0]).toMatchObject({
      stateKey: "US-IA",
      sameRegion: true,
      incomeDistanceDollars: 6960,
    });
    expect(references[1]).toMatchObject({
      stateKey: "US-AZ",
      sameRegion: false,
      incomeDistanceDollars: 5160,
    });
    expect(references.slice(9).some((ref) => ref.sameRegion)).toBe(true);
  });

  it("gives equally close income references equal weights", () => {
    // MA $106,500 is equally distant from DC $111,000 and MD $102,000.
    // Both have the target's graduated structure and a different region.
    const references = stateDeductionEstimate("US-MA").references;
    expect(references.slice(4, 6)).toMatchObject([
      {
        stateKey: "US-DC",
        incomeDistanceDollars: 4500,
        rank: 5,
        weight: 1 / 5,
      },
      {
        stateKey: "US-MD",
        incomeDistanceDollars: 4500,
        rank: 5,
        weight: 1 / 5,
      },
    ]);
    expect(references[6]?.rank).toBe(7);
  });

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

  it("keeps known deductions and ranked estimates unchanged across world seeds", () => {
    const estimatedDollars: Readonly<Record<string, number>> = {
      "US-CT": 8926,
      "US-IL": 11_822,
      "US-IN": 12_204,
      "US-MA": 8952,
      "US-MI": 12_204,
      "US-NJ": 8923,
      "US-OH": 12_204,
      "US-PA": 11_740,
      "US-UT": 11_679,
      "US-WV": 6857,
    };
    for (const [key, place] of Object.entries(stateIncomeTax2026.places)) {
      if (place.wageIncomeTax === "none") continue;
      const expectedDollars =
        place.standardDeductionSingle ?? estimatedDollars[key];
      expect(expectedDollars, key).toBeDefined();
      for (const seed of ["a", "b", "c"]) {
        const result = stateIncomeTaxSchedule(key, "single", seed);
        if (result.kind !== "schedule") throw new Error(`${key} is not priced`);
        expect(result.schedule.standardDeductionMinor, `${key} ${seed}`).toBe(
          expectedDollars! * 100,
        );
        expect(result.schedule.sourceUrl).toBe(stateIncomeTax2026.source.url);
        // The actual paycheck base stays the same; an unread deduction cannot
        // make its withholding depend on the world seed.
        const reference = stateIncomeTaxSchedule(key, "single", "a");
        if (reference.kind !== "schedule") throw new Error(key);
        expect(withholdingForPaycheck(100_000, 52, result.schedule)).toEqual(
          withholdingForPaycheck(100_000, 52, reference.schedule),
        );
        if (place.standardDeductionSingle === null) {
          expect(result.estimatedFromAverage).toContain(
            "weighted average of the 32 read deductions",
          );
          expect(result.estimatedFromAverage).not.toMatch(/seed|spread/);
        }
      }
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

describe("shared similar-state estimation method", () => {
  it("keeps ties equally weighted without using their display order as evidence", () => {
    const source = [
      { key: "second", closeness: 0, value: 40 },
      { key: "farther", closeness: 1, value: 100 },
      { key: "first", closeness: 0, value: 20 },
    ];
    const rows = reciprocalRankedReferences(
      source,
      (a, b) => a.closeness - b.closeness,
      (row) => row.key,
    );
    expect(rows.map((row) => [row.key, row.rank, row.weight])).toEqual([
      ["first", 1, 1],
      ["second", 1, 1],
      ["farther", 3, 1 / 3],
    ]);
    expect(weightedReferenceMean(rows, (row) => row.value)).toBeCloseTo(40);
    expect(source.map((row) => row.key)).toEqual([
      "second",
      "farther",
      "first",
    ]);
    const reversed = reciprocalRankedReferences(
      [...source].reverse(),
      (a, b) => a.closeness - b.closeness,
      (row) => row.key,
    );
    expect(reversed).toEqual(rows);
    expect(() => weightedReferenceMean([], () => 0)).toThrow(
      /No sourced references/,
    );
  });
});
