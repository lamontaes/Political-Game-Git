/**
 * A medical debt's parts on the credit report (health-medical-debt-record):
 * each part reaches the report the reporting wait after its own bill's first
 * delinquency and leaves it seven years after that day, and a part seven
 * years past its delinquency is folded off the record's list of parts, so the
 * list never holds more than seven years of them. The parameters are the
 * credit engine's own (creditMedicalReportDays, creditReportYears).
 */
import { describe, expect, it } from "vitest";
import credit from "./data/credit/parameters.json" with { type: "json" };
import jobs from "./data/jobs/parameters.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  foldAgedParts,
  reportedMedicalMinor,
  type MedicalDebtPart,
} from "./modules/credit";

const VALUES: Record<string, number> = {
  creditMedicalReportDays: credit.creditMedicalReportDays.value,
  creditReportYears: credit.creditReportYears.value,
  jobsDaysPerYear: jobs.jobsDaysPerYear.value,
};
const p = (key: string) => {
  const value = VALUES[key];
  if (value === undefined) throw new Error(`no parameter ${key}`);
  return value;
};
const WAIT = VALUES.creditMedicalReportDays!;
const SEVEN_YEARS = VALUES.creditReportYears! * VALUES.jobsDaysPerYear!;
const day = (from: string, days: number) => addDays(makeIsoDate(from), days);

describe("a medical debt on the credit report, part by part", () => {
  const first: MedicalDebtPart = { delinquentSince: "2025-02-01", minor: 500 };
  const later: MedicalDebtPart = { delinquentSince: "2027-06-01", minor: 300 };
  const row = { placed: [first, later] };

  it("reports each part from its own wait until seven years after its own delinquency", () => {
    // Before either part's wait: nothing reported.
    expect(
      reportedMedicalMinor(row, day(first.delinquentSince, WAIT - 1), p),
    ).toBe(0);
    // The first part's wait has run, the later one's has not.
    expect(reportedMedicalMinor(row, day(first.delinquentSince, WAIT), p)).toBe(
      500,
    );
    // Both reported.
    expect(reportedMedicalMinor(row, day(later.delinquentSince, WAIT), p)).toBe(
      800,
    );
    // The first part leaves seven years after its own delinquency; the later
    // one stays on the report.
    expect(
      reportedMedicalMinor(row, day(first.delinquentSince, SEVEN_YEARS), p),
    ).toBe(300);
    expect(
      reportedMedicalMinor(row, day(later.delinquentSince, SEVEN_YEARS - 1), p),
    ).toBe(300);
    expect(
      reportedMedicalMinor(row, day(later.delinquentSince, SEVEN_YEARS), p),
    ).toBe(0);
  });

  it("folds a part seven years past its delinquency off the list, so the list stays bounded", () => {
    const at = day(first.delinquentSince, SEVEN_YEARS);
    const { placed, folded } = foldAgedParts([first, later], at, p);
    expect(placed).toEqual([later]);
    expect(folded).toEqual([first]);
    // A part placed every month for twenty years: at most seven years of
    // them stay on the list at any time.
    let parts: MedicalDebtPart[] = [];
    let longest = 0;
    let today = "2025-02-01";
    for (let month = 0; month < 240; month += 1) {
      today = day(today, 30);
      parts = foldAgedParts(
        [...parts, { delinquentSince: day(today, -WAIT), minor: 100 }],
        today,
        p,
      ).placed;
      longest = Math.max(longest, parts.length);
    }
    expect(longest).toBeLessThanOrEqual(Math.ceil(SEVEN_YEARS / 30));
    expect(longest).toBeGreaterThan(Math.floor((SEVEN_YEARS - WAIT) / 30) - 1);
  });
});
