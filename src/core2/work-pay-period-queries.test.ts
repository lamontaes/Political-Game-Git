/** Recorded-calendar queries; these queries never create attendance or cash. */
import { describe, expect, it } from "vitest";
import { FinanceReadGuard } from "./finance-plan";
import { parameter as p } from "./parameters";
import { nextWorkPayrollPeriod, workPayPeriodAtIndex } from "./work-pay-period";
import type { WorkPayrollCalendarInput } from "./work-pay-period";

const units = {
  zero: p("zero"),
  one: p("one"),
  monthsPerYear: p("monthsPerYear"),
};
const fixture = (): WorkPayrollCalendarInput => ({
  id: "recorded-query-calendar",
  organizationId: "recorded-query-employer",
  workCommitmentIds: ["recorded-query-commitment"],
  basisRecordIds: ["recorded-query-agreement"],
  rule: "fixed-days-after-inclusive-period-end",
  firstPeriodStartsAt: "2021-01-01",
  periodDays: p("daysPerWeek"),
  firstPaydayAt: "2021-01-08",
  effectiveFrom: "2021-01-01",
  nonbusinessDayRule: "no-adjustment",
  arrearsRule: "carry-to-next-recorded-payday",
  source: {
    tag: "SOURCED",
    asOf: "2021-01-01",
    citation:
      "Explicit calendar query fixture; no observed employer or ordinary-world outcome.",
  },
});

describe("recorded payroll queries with separate evidence availability", () => {
  it("returns today's exact payday and the next recorded payday after it", () => {
    const calendar = fixture(),
      before = structuredClone(calendar),
      r = new FinanceReadGuard();
    expect(
      nextWorkPayrollPeriod(r, calendar, "2021-01-08", "2021-01-01", units),
    ).toEqual({
      index: p("zero"),
      fromAt: "2021-01-01",
      throughAt: "2021-01-07",
      dueAt: "2021-01-08",
    });
    expect(
      nextWorkPayrollPeriod(r, calendar, "2021-01-09", "2021-01-01", units)
        .dueAt,
    ).toBe("2021-01-15");
    r.verify();
    expect(calendar).toEqual(before);
    expect(Object.hasOwn(calendar, "paidMinor")).toBe(false);
  });

  it("keeps a recorded month-end boundary across February", () => {
    const calendar: WorkPayrollCalendarInput = {
      ...fixture(),
      rule: "calendar-months-after-inclusive-period-end",
      periodDays: undefined,
      periodMonths: p("one"),
      firstPeriodStartsAt: "2021-01-31",
      firstPaydayAt: "2021-02-28",
      nominalBoundaryDays: [new Date("2021-01-31T00:00:00.000Z").getUTCDate()],
      shortMonthRule: "clamp-to-calendar-month-end",
    };
    expect(
      workPayPeriodAtIndex(
        new FinanceReadGuard(),
        calendar,
        p("one"),
        "2021-01-01",
        units,
      ),
    ).toEqual({
      index: p("one"),
      fromAt: "2021-02-28",
      throughAt: "2021-03-30",
      dueAt: "2021-03-31",
    });
    expect(
      nextWorkPayrollPeriod(
        new FinanceReadGuard(),
        calendar,
        "2021-03-01",
        "2021-01-01",
        units,
      ).dueAt,
    ).toBe("2021-03-31");
  });

  it("does not admit future evidence by querying a future payment date", () => {
    const calendar = fixture();
    calendar.source = { ...calendar.source, asOf: "2021-02-01" };
    expect(() =>
      nextWorkPayrollPeriod(
        new FinanceReadGuard(),
        calendar,
        "2021-04-01",
        "2021-01-01",
        units,
      ),
    ).toThrow("dated Source");
    expect(() =>
      workPayPeriodAtIndex(
        new FinanceReadGuard(),
        calendar,
        p("one"),
        "2021-01-01",
        units,
      ),
    ).toThrow("dated Source");
  });

  it("retains full Source and descriptor checks until the caller's final verification", () => {
    const calendar = fixture(),
      r = new FinanceReadGuard();
    nextWorkPayrollPeriod(r, calendar, "2021-03-01", "2021-01-01", units);
    calendar.source.citation = "A different agreement after the query.";
    expect(() => r.verify()).toThrow();
    const another = fixture(),
      guard = new FinanceReadGuard();
    workPayPeriodAtIndex(guard, another, p("one"), "2021-01-01", units);
    Object.defineProperty(another, "periodDays", {
      value: another.periodDays,
      writable: false,
    });
    expect(() => guard.verify()).toThrow();
  });
});
