/**
 * The arithmetic of a person's own records on their death hazard
 * (health-own.ts), on the paper's numbers and nothing else: no world is
 * played here; law-wiring-mortality-web.test.ts proves each read in a played
 * world.
 */
import { describe, expect, it } from "vitest";
import displacement from "./data/health/displacement.json" with { type: "json" };
import {
  combineOwn,
  displacementExcess,
  displacementFactor,
  longHoursFactor,
  ownCoverageFactor,
  readsOwnCoverage,
} from "./health-own";
import { WEB_LINKS } from "./outcome-web-model";

const coverage = WEB_LINKS.find(
  (row) => row.key === "coverage-to-mortality-55-64",
)!;

describe("coverage-to-mortality-55-64, read from a person's own coverage", () => {
  const spell = { from: "2025-02-10", to: null, obligationIds: ["ob-1"] };
  const first = { date: "2025-01-04", covered: false };

  it("moves nobody before the link's lag has passed", () => {
    const early = ownCoverageFactor({
      spells: [spell],
      today: "2026-02-04",
      firstLook: first,
    });
    // Twelve months back is 2025-02-04, six days before the coverage began.
    expect(early.factor).toBe(1);
    expect(early.parts[0]).toMatchObject({
      covered: false,
      baseCovered: false,
    });
  });

  it("cuts a covered person's hazard by the link's size after the lag", () => {
    const after = ownCoverageFactor({
      spells: [spell],
      today: "2026-03-04",
      firstLook: first,
    });
    expect(coverage.lagMonths).toBe(12);
    expect(after.factor).toBeCloseTo(1 + coverage.size!, 12);
    expect(after.parts[0]).toMatchObject({
      covered: true,
      readOn: "2025-03-04",
      obligationIds: ["ob-1"],
    });
  });

  it("holds the table's own coverage at one and raises the hazard of a person who loses it", () => {
    const held = { date: "2025-01-04", covered: true };
    const kept = ownCoverageFactor({
      spells: [{ from: "2024-06-01", to: null, obligationIds: [] }],
      today: "2026-03-04",
      firstLook: held,
    });
    expect(kept.factor).toBe(1);
    const lost = ownCoverageFactor({
      spells: [{ from: "2024-06-01", to: "2025-02-01", obligationIds: [] }],
      today: "2026-03-04",
      firstLook: held,
    });
    expect(lost.factor).toBeCloseTo(1 / (1 + coverage.size!), 12);
  });

  it("reads ages 55 to 64 and no others", () => {
    expect([54, 55, 64, 65].map(readsOwnCoverage)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});

describe("job-loss-to-death-risk, read from a displacement the jobs engine recorded", () => {
  it("passes through each of the paper's points", () => {
    for (const point of displacement.points)
      expect(displacementExcess(point.yearsSince)).toBeCloseTo(
        point.excess,
        12,
      );
  });

  it("is linear between points, held before the first and after the last", () => {
    const [a, b] = displacement.points;
    const middle = (a!.yearsSince + b!.yearsSince) / 2;
    expect(displacementExcess(middle)).toBeCloseTo(
      (a!.excess + b!.excess) / 2,
      12,
    );
    expect(displacementExcess(0)).toBe(a!.excess);
    expect(displacementExcess(60)).toBe(displacement.points.at(-1)!.excess);
  });

  it("scales the excess by tenure up to the paper's six years", () => {
    const row = (tenureYears: number) => ({
      recordId: "job-change:2025-02-06:j:closure",
      date: "2025-02-06",
      jobId: "j",
      organizationId: "o",
      tenureYears,
    });
    const at = (tenureYears: number) =>
      displacementFactor({
        displaced: [row(tenureYears)],
        today: "2025-02-06",
        daysPerYear: 365.25,
      })!;
    expect(at(6).factor).toBeCloseTo(1 + 0.847, 12);
    expect(at(12).factor).toBeCloseTo(1 + 0.847, 12);
    expect(at(3).factor).toBeCloseTo(1 + 0.847 / 2, 12);
    expect(at(6).parts[0]).toMatchObject({ recordId: row(6).recordId });
    expect(
      displacementFactor({
        displaced: [],
        today: "2025-02-06",
        daysPerYear: 365.25,
      }),
    ).toBeUndefined();
    // A displacement that has not happened yet moves nobody.
    expect(
      displacementFactor({
        displaced: [row(9)],
        today: "2025-01-01",
        daysPerYear: 365.25,
      }),
    ).toBeUndefined();
  });
});

describe("long-hours-to-heart-and-stroke, read from the hours on a job", () => {
  it("moves nobody at the reference hours", () => {
    expect(
      longHoursFactor({ weeklyHours: 40, age: 50, jobId: "j" }),
    ).toBeUndefined();
    expect(
      longHoursFactor({ weeklyHours: undefined, age: 50, jobId: "j" }),
    ).toBeUndefined();
  });

  it("adds the paper's relative risks to the two causes' shares of deaths at 55 hours", () => {
    const at = longHoursFactor({ weeklyHours: 59.5, age: 60, jobId: "j" })!;
    const part = at.parts[0]!;
    if (!("heartRisk" in part)) throw new Error("not an hours part");
    expect(part.heartRisk).toBeCloseTo(1.17, 12);
    expect(part.strokeRisk).toBeCloseTo(1.35, 12);
    // NVSR 74(10) Table 1, ages 55-64: heart disease 79,726 and stroke 13,425 of 376,534 deaths.
    expect(part.heartShare).toBeCloseTo(79_726 / 376_534, 12);
    expect(part.strokeShare).toBeCloseTo(13_425 / 376_534, 12);
    expect(at.factor).toBeCloseTo(
      1 + (79_726 / 376_534) * 0.17 + (13_425 / 376_534) * 0.35,
      12,
    );
  });

  it("rises with the hours and never falls below one", () => {
    const factor = (weeklyHours: number) =>
      longHoursFactor({ weeklyHours, age: 60, jobId: "j" })?.factor ?? 1;
    expect(factor(44.5)).toBeGreaterThanOrEqual(1);
    expect(factor(51.5)).toBeGreaterThan(factor(44.5));
    expect(factor(55)).toBeGreaterThan(factor(51.5));
    expect(factor(70)).toBeCloseTo(factor(55), 12);
  });
});

describe("a person's own factors together", () => {
  it("multiply, and keep every reason", () => {
    const a = { factor: 0.75, parts: [] };
    const b = { factor: 1.2, parts: [] };
    expect(combineOwn(a, undefined, b)!.factor).toBeCloseTo(0.9, 12);
    expect(combineOwn(undefined, undefined)).toBeUndefined();
  });
});
