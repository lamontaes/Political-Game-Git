import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "../dates";
import { SeededRng } from "../rng";
import {
  FIXED_LN2,
  FIXED_SCALE,
  fixedFromDecimal,
  fixedLn,
  hazardFromAnnualProbability,
  survivalThresholdFromDraws,
} from "./fixed-point";
import {
  cumulativeHazardUnits,
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
  type HazardProfile,
} from "./hazard";
import {
  doubledAgeYearHazard,
  ssa2023AnnualProbability,
  SSA_2023_SOURCE,
} from "./mortality-table";

const d = makeIsoDate;
const near = (value: bigint, expected: number, tolerance = 1e-12) =>
  expect(Math.abs(Number(value) / 1e18 - expected)).toBeLessThan(tolerance);

describe("CRISIS K1 fixed-point hazard", () => {
  it("computes logarithms deterministically and accurately", () => {
    near(FIXED_LN2, Math.LN2);
    near(fixedLn(FIXED_SCALE), 0);
    near(fixedLn(FIXED_SCALE / 10n), Math.log(0.1));
    near(fixedLn(7n * 10n ** 13n), Math.log(7e-5), 1e-11);
    expect(fixedLn(123456789n * 10n ** 9n)).toBe(
      fixedLn(123456789n * 10n ** 9n),
    );
  });

  it("carries the SSA 2023 table exactly, including the packet samples", () => {
    expect(SSA_2023_SOURCE.url).toBe(
      "https://www.ssa.gov/oact/STATS/table4c6.html",
    );
    expect(ssa2023AnnualProbability(26, "male")).toBe("0.001685");
    expect(ssa2023AnnualProbability(26, "female")).toBe("0.000641");
    expect(ssa2023AnnualProbability(80, "male")).toBe("0.055633");
    expect(ssa2023AnnualProbability(80, "female")).toBe("0.041183");
    near(
      hazardFromAnnualProbability(fixedFromDecimal("0.055633")),
      -Math.log(1 - 0.055633),
    );
    expect(doubledAgeYearHazard(80, "equal-mixture")).toBe(
      (doubledAgeYearHazard(80, "male") + doubledAgeYearHazard(80, "female")) /
        2n,
    );
    // Ages past the published table reuse age 119.
    expect(doubledAgeYearHazard(131, "male")).toBe(
      doubledAgeYearHazard(119, "male"),
    );
  });

  it("accumulates one full age-year to exactly that year's hazard", () => {
    const profile: HazardProfile = {
      birthDate: d("1946-03-10"),
      category: "male",
      exposureStart: d("2026-03-10"),
      multipliers: [],
    };
    // Age 80 year: 2026-03-10 → 2027-03-10.
    const expected =
      doubledAgeYearHazard(80, "male") * BigInt(MULTIPLIER_ONE) * 133_590n;
    expect(cumulativeHazardUnits(profile, d("2027-03-10"))).toBe(expected);
    expect(cumulativeHazardUnits(profile, d("2026-01-01"))).toBe(0n);
  });

  it("is partition invariant: any split of the span finds the same day", () => {
    const profile: HazardProfile = {
      birthDate: d("1940-02-29"),
      category: "equal-mixture",
      exposureStart: d("2026-01-05"),
      multipliers: [{ effectiveAt: d("2027-06-01"), micros: 2_500_000 }],
    };
    const threshold = thresholdUnits(
      survivalThresholdFromDraws(2 ** 32 - 900_000_000, 9),
    );
    const end = d("2040-01-01");
    const whole = firstThresholdDay(profile, threshold, d("2026-01-05"), end);
    expect(whole).not.toBeNull();
    for (const step of [1, 7, 30, 31, 90, 365, 1000]) {
      let found: string | null = null;
      for (let from = d("2026-01-05"); from < end && !found;) {
        const to = addDays(from, step) < end ? addDays(from, step) : end;
        found = firstThresholdDay(profile, threshold, from, to);
        from = to;
      }
      expect(found).toBe(whole);
    }
    // The crossing day is exactly where the cumulative total first reaches it.
    expect(cumulativeHazardUnits(profile, whole!)).toBeLessThan(threshold);
    expect(
      cumulativeHazardUnits(profile, addDays(whole!, 1)),
    ).toBeGreaterThanOrEqual(threshold);
  });

  it("gives higher hazard an earlier or equal crossing and zero hazard none", () => {
    const base: HazardProfile = {
      birthDate: d("1950-07-01"),
      category: "female",
      exposureStart: d("2026-01-05"),
      multipliers: [],
    };
    const threshold = thresholdUnits(survivalThresholdFromDraws(2 ** 31, 5));
    const plain = firstThresholdDay(
      base,
      threshold,
      base.exposureStart,
      d("2080-01-01"),
    );
    const doubled = firstThresholdDay(
      {
        ...base,
        multipliers: [{ effectiveAt: base.exposureStart, micros: 2_000_000 }],
      },
      threshold,
      base.exposureStart,
      d("2080-01-01"),
    );
    expect(plain && doubled && doubled <= plain).toBe(true);
    expect(
      firstThresholdDay(
        {
          ...base,
          multipliers: [{ effectiveAt: base.exposureStart, micros: 0 }],
        },
        threshold,
        base.exposureStart,
        d("2080-01-01"),
      ),
    ).toBeNull();
  });

  it("matches the annual survival probability across many thresholds", () => {
    // Fraction of thresholds crossed within one age-80 year ≈ qx.
    const profile: HazardProfile = {
      birthDate: d("1946-01-10"),
      category: "male",
      exposureStart: d("2026-01-10"),
      multipliers: [],
    };
    const yearUnits = cumulativeHazardUnits(profile, d("2027-01-10"));
    let died = 0;
    const n = 4000;
    const rng = new SeededRng("crisis-hazard-calibration");
    for (let i = 0; i < n; i += 1) {
      const t = thresholdUnits(
        survivalThresholdFromDraws(rng.nextUint32(), rng.nextUint32()),
      );
      if (t <= yearUnits) died += 1;
    }
    expect(Math.abs(died / n - 0.055633)).toBeLessThan(0.01);
  });
});
