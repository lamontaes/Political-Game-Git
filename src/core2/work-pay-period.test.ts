/** Proposed controlled arithmetic/guard fixtures. UNEXECUTED by packet author. */
import { describe, expect, it } from "vitest";
import { FinanceReadGuard } from "./finance-plan";
import { parameter as p } from "./parameters";
import {
  prepareWorkPayAccrual,
  prepareWorkPayrollRequest,
  prepareWorkPayrollSettlement,
  workPayPeriodOnDate,
} from "./work-pay-period";
import type {
  WorkEarnedShift,
  WorkPayrollBasis,
  WorkPayrollCalendarInput,
  WorkPayrollLedger,
} from "./work-pay-period";
import type { Source } from "./types";

const u = { zero: p("zero"), one: p("one"), monthsPerYear: p("monthsPerYear") };
const source: Source = {
  tag: "SOURCED",
  asOf: "2021-01-01",
  citation:
    "Explicit controlled payroll agreement fixture, not observed employer terms or an ordinary-world outcome.",
  estimatedFrom: "Retained optional fixture provenance.",
  generationPriorVintage: "Retained full fixture vintage.",
};
const calendar: WorkPayrollCalendarInput = {
  id: "fixture-calendar",
  organizationId: "fixture-employer",
  workCommitmentIds: ["fixture-commitment"],
  basisRecordIds: ["fixture-agreement"],
  rule: "fixed-days-after-inclusive-period-end",
  firstPeriodStartsAt: "2021-01-01",
  periodDays: p("daysPerWeek"),
  firstPaydayAt: "2021-01-08",
  effectiveFrom: "2021-01-01",
  arrearsRule: "carry-to-next-recorded-payday",
  nonbusinessDayRule: "no-adjustment",
  source,
};
const basis: WorkPayrollBasis = {
  calendarId: calendar.id,
  commitmentId: "fixture-commitment",
  jobId: "fixture-job",
  personId: "fixture-worker",
  organizationId: calendar.organizationId,
  jobSource: source,
  paySource: source,
  scheduleSource: source,
};
const shift = (
  date = "2021-01-02",
  earnedMinor = p("minorPerDollar"),
): WorkEarnedShift => ({
  id: `work-result:${date}:${basis.commitmentId}`,
  date,
  commitmentId: basis.commitmentId,
  jobId: basis.jobId,
  personId: basis.personId,
  organizationId: basis.organizationId,
  plannedMinutes: p("minutesPerHour"),
  attendedMinutes: p("minutesPerHour"),
  absentMinutes: p("zero"),
  earnedMinor,
  source,
});
const accrue = () =>
  prepareWorkPayAccrual(
    new FinanceReadGuard(),
    calendar,
    basis,
    undefined,
    undefined,
    shift(),
    "fixture-period:0",
    u,
  );

describe("separate recorded payroll periods (proposed; author did not execute)", () => {
  it("uses the independent recorded payroll cadence/phase and retains full Sources", () => {
    const actual = workPayPeriodOnDate(
      new FinanceReadGuard(),
      calendar,
      "2021-01-07",
      u,
    );
    expect(actual).toEqual({
      index: p("zero"),
      fromAt: "2021-01-01",
      throughAt: "2021-01-07",
      dueAt: "2021-01-08",
    });
    const earned = accrue();
    expect(earned.period.paySource).toEqual(source);
    expect(earned.ledger.accruedMinor).toBe(shift().earnedMinor);
    expect(earned.ledger.dueRecognizedMinor).toBe(p("zero"));
    expect(earned.ledger.paidMinor).toBe(p("zero"));
    expect(earned.ledger.arrearsMinor).toBe(p("zero"));
  });

  it("conserves several dated earned amounts, with no cash fields or payment prediction", () => {
    const first = accrue();
    const second = prepareWorkPayAccrual(
      new FinanceReadGuard(),
      calendar,
      basis,
      first.ledger,
      first.period,
      shift("2021-01-03"),
      first.period.id,
      u,
    );
    expect(second.period.earnedMinor).toBe(p("two") * p("minorPerDollar"));
    expect(second.period.segmentCount).toBe(p("two"));
    expect(second.ledger.accruedMinor).toBe(second.ledger.earnedMinor);
    expect(Object.hasOwn(second.period, "paidMinor")).toBe(false);
    expect(Object.hasOwn(second.period, "payerCashAfterMinor")).toBe(false);
    expect(second.ledger.paidMinor).toBe(p("zero"));
  });

  it("uses true monthly boundaries, including February, without a 30-day approximation", () => {
    const actual: WorkPayrollCalendarInput = {
      ...calendar,
      rule: "calendar-months-after-inclusive-period-end",
      periodDays: undefined,
      periodMonths: p("one"),
      nominalBoundaryDays: [p("one")],
      shortMonthRule: "clamp-to-calendar-month-end",
      firstPaydayAt: "2021-02-01",
    };
    expect(
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-02-28", u),
    ).toEqual({
      index: p("one"),
      fromAt: "2021-02-01",
      throughAt: "2021-02-28",
      dueAt: "2021-03-01",
    });
    expect(
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-03-01", u)
        .dueAt,
    ).toBe("2021-04-01");
  });

  it("keeps a supplied month-end nominal boundary after a short month without date drift", () => {
    const januaryLastDay = new Date("2021-01-31T00:00:00.000Z").getUTCDate();
    const actual: WorkPayrollCalendarInput = {
      ...calendar,
      rule: "calendar-months-after-inclusive-period-end",
      periodDays: undefined,
      periodMonths: p("one"),
      nominalBoundaryDays: [januaryLastDay],
      shortMonthRule: "clamp-to-calendar-month-end",
      firstPeriodStartsAt: "2021-01-31",
      firstPaydayAt: "2021-02-28",
    };
    expect(
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-02-28", u),
    ).toEqual({
      index: p("one"),
      fromAt: "2021-02-28",
      throughAt: "2021-03-30",
      dueAt: "2021-03-31",
    });
    expect(
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-03-31", u)
        .fromAt,
    ).toBe("2021-03-31");
  });

  it("uses separately supplied twice-month nominal dates, not fixed 15-day periods", () => {
    const secondBoundary = new Date("2021-01-16T00:00:00.000Z").getUTCDate();
    const actual: WorkPayrollCalendarInput = {
      ...calendar,
      rule: "twice-calendar-month-after-inclusive-period-end",
      periodDays: undefined,
      nominalBoundaryDays: [p("one"), secondBoundary],
      shortMonthRule: "clamp-to-calendar-month-end",
      firstPaydayAt: "2021-01-16",
    };
    const period = workPayPeriodOnDate(
      new FinanceReadGuard(),
      actual,
      "2021-02-28",
      u,
    );
    expect(period.fromAt).toBe("2021-02-16");
    expect(period.throughAt).toBe("2021-02-28");
    expect(period.dueAt).toBe("2021-03-01");
    expect(() =>
      workPayPeriodOnDate(
        new FinanceReadGuard(),
        {
          ...actual,
          nominalBoundaryDays: [
            new Date("2021-01-30T00:00:00.000Z").getUTCDate(),
            new Date("2021-01-31T00:00:00.000Z").getUTCDate(),
          ],
          firstPeriodStartsAt: "2021-01-30",
          firstPaydayAt: "2021-01-31",
        },
        "2021-02-28",
        u,
      ),
    ).toThrow("collapse");
  });

  it("records absence/time without an unpaid payroll event before the payday", () => {
    const actual = shift();
    actual.attendedMinutes = p("zero");
    actual.absentMinutes = actual.plannedMinutes;
    actual.earnedMinor = p("zero");
    const earned = prepareWorkPayAccrual(
      new FinanceReadGuard(),
      calendar,
      basis,
      undefined,
      undefined,
      actual,
      "fixture-period:0",
      u,
    );
    expect(earned.period.attendedMinutes).toBe(p("zero"));
    expect(earned.period.earnedMinor).toBe(p("zero"));
    expect(earned.ledger.arrearsMinor).toBe(p("zero"));
  });

  it("rejects duplicate work/date ownership without clearing existing accrual", () => {
    const earned = accrue(),
      before = structuredClone(earned);
    expect(() =>
      prepareWorkPayAccrual(
        new FinanceReadGuard(),
        calendar,
        basis,
        earned.ledger,
        earned.period,
        shift(),
        earned.period.id,
        u,
      ),
    ).toThrow("Invalid, duplicate");
    expect(() =>
      prepareWorkPayAccrual(
        new FinanceReadGuard(),
        calendar,
        basis,
        earned.ledger,
        earned.period,
        { ...shift("2021-01-03"), personId: "unrelated-worker" },
        earned.period.id,
        u,
      ),
    ).toThrow("another actual owner");
    expect(earned).toEqual(before);
  });

  it("rejects wrong employer/calendar membership and future calendar evidence", () => {
    expect(() =>
      accrueWith({ ...calendar, workCommitmentIds: ["other-commitment"] }),
    ).toThrow("membership");
    expect(() =>
      accrueWith({ ...calendar, organizationId: "other-employer" }),
    ).toThrow("membership");
    expect(() =>
      accrueWith({ ...calendar, source: { ...source, asOf: "2021-01-03" } }),
    ).toThrow("dated Source");
  });

  it("recognizes current pay once and leaves an actual partial-pay stock separately", () => {
    const earned = accrue(),
      r = new FinanceReadGuard();
    const request = prepareWorkPayrollRequest(
      r,
      calendar,
      basis,
      earned.ledger,
      earned.period,
      "2021-01-08",
      "fixture-payroll:0",
      u,
    );
    const paid = p("minorPerDollar") / p("two");
    const actual = prepareWorkPayrollSettlement(
      r,
      calendar,
      basis,
      earned.ledger,
      earned.period,
      request,
      paid,
      u,
    );
    expect(actual.ledger.dueRecognizedMinor).toBe(earned.period.earnedMinor);
    expect(actual.ledger.accruedMinor).toBe(p("zero"));
    expect(actual.ledger.arrearsMinor).toBe(earned.period.earnedMinor - paid);
    expect(actual.receipt.shortfallMinor).toBe(
      actual.receipt.arrearsAfterMinor,
    );
    expect(actual.receipt.missedNewlyDueMinor).toBe(
      actual.receipt.shortfallMinor,
    );
    expect(earned.ledger.accruedMinor).toBe(earned.period.earnedMinor);
  });

  it("retries prior arrears on the next recorded payday without recognizing wages twice", () => {
    const earned = accrue(),
      r = new FinanceReadGuard();
    const first = prepareWorkPayrollRequest(
      r,
      calendar,
      basis,
      earned.ledger,
      earned.period,
      "2021-01-08",
      "fixture-payroll:0",
      u,
    );
    const missed = prepareWorkPayrollSettlement(
      r,
      calendar,
      basis,
      earned.ledger,
      earned.period,
      first,
      p("zero"),
      u,
    );
    const next = prepareWorkPayrollRequest(
      new FinanceReadGuard(),
      calendar,
      basis,
      missed.ledger,
      undefined,
      "2021-01-15",
      "fixture-payroll:1",
      u,
    );
    expect(next.newlyDueMinor).toBe(p("zero"));
    expect(next.arrearsBeforeMinor).toBe(first.requestedMinor);
    const recovered = prepareWorkPayrollSettlement(
      new FinanceReadGuard(),
      calendar,
      basis,
      missed.ledger,
      undefined,
      next,
      next.requestedMinor,
      u,
    );
    expect(recovered.ledger.dueRecognizedMinor).toBe(first.requestedMinor);
    expect(recovered.ledger.paidMinor).toBe(first.requestedMinor);
    expect(recovered.ledger.arrearsMinor).toBe(p("zero"));
    expect(recovered.receipt.paidArrearsMinor).toBe(first.requestedMinor);
  });

  it("allocates partial cash to older arrears first without discarding newly earned wages", () => {
    const earned = accrue(),
      r = new FinanceReadGuard();
    const first = prepareWorkPayrollRequest(
      r,
      calendar,
      basis,
      earned.ledger,
      earned.period,
      "2021-01-08",
      "fixture-payroll:0",
      u,
    );
    const missed = prepareWorkPayrollSettlement(
      r,
      calendar,
      basis,
      earned.ledger,
      earned.period,
      first,
      p("zero"),
      u,
    );
    const nextEarned = prepareWorkPayAccrual(
      new FinanceReadGuard(),
      calendar,
      basis,
      missed.ledger,
      undefined,
      shift("2021-01-09"),
      "fixture-period:1",
      u,
    );
    const next = prepareWorkPayrollRequest(
      new FinanceReadGuard(),
      calendar,
      basis,
      nextEarned.ledger,
      nextEarned.period,
      "2021-01-15",
      "fixture-payroll:1",
      u,
    );
    const actual = prepareWorkPayrollSettlement(
      new FinanceReadGuard(),
      calendar,
      basis,
      nextEarned.ledger,
      nextEarned.period,
      next,
      first.requestedMinor,
      u,
    );
    expect(actual.receipt.paidArrearsMinor).toBe(first.requestedMinor);
    expect(actual.receipt.paidNewlyDueMinor).toBe(p("zero"));
    expect(actual.ledger.arrearsMinor).toBe(next.newlyDueMinor);
    expect(actual.ledger.dueRecognizedMinor).toBe(
      nextEarned.ledger.earnedMinor,
    );
  });

  it("rejects off-payday and repeat settlement rather than manufacture cash or retry daily", () => {
    const earned = accrue(),
      r = new FinanceReadGuard();
    expect(() =>
      prepareWorkPayrollRequest(
        r,
        calendar,
        basis,
        earned.ledger,
        earned.period,
        "2021-01-07",
        "fixture-early",
        u,
      ),
    ).toThrow("recorded payday");
    const due = prepareWorkPayrollRequest(
      r,
      calendar,
      basis,
      earned.ledger,
      earned.period,
      "2021-01-08",
      "fixture-payroll:0",
      u,
    );
    const actual = prepareWorkPayrollSettlement(
      r,
      calendar,
      basis,
      earned.ledger,
      earned.period,
      due,
      p("zero"),
      u,
    );
    expect(() =>
      prepareWorkPayrollRequest(
        new FinanceReadGuard(),
        calendar,
        basis,
        actual.ledger,
        undefined,
        "2021-01-08",
        "fixture-duplicate",
        u,
      ),
    ).toThrow("Duplicate or stale");
    expect(() =>
      prepareWorkPayrollSettlement(
        new FinanceReadGuard(),
        calendar,
        basis,
        earned.ledger,
        earned.period,
        due,
        due.requestedMinor + p("one"),
        u,
      ),
    ).toThrow("paid exceeds");
  });

  it("preserves a final earned period when calendar earning eligibility ends before payday", () => {
    const bounded = { ...calendar, effectiveUntil: "2021-01-04" };
    const earned = accrueWith(bounded);
    expect(() =>
      prepareWorkPayAccrual(
        new FinanceReadGuard(),
        bounded,
        basis,
        earned.ledger,
        earned.period,
        shift("2021-01-04"),
        earned.period.id,
        u,
      ),
    ).toThrow("outside");
    const due = prepareWorkPayrollRequest(
      new FinanceReadGuard(),
      bounded,
      basis,
      earned.ledger,
      earned.period,
      "2021-01-08",
      "fixture-final-payroll",
      u,
    );
    expect(due.newlyDueMinor).toBe(earned.period.earnedMinor);
    expect(due.dueAt).toBe(calendar.firstPaydayAt);
    // Ended-job/death ownership is an additional owning-writer fixture, not proven here.
  });

  it("rejects full Source and owning amount/date tampering, retaining all original input", () => {
    const earned = accrue(),
      before = structuredClone(earned);
    for (const corrupted of [
      { ...earned.period, dueAt: "2021-01-09" },
      {
        ...earned.period,
        paySource: {
          ...source,
          generationPriorVintage: "Changed actual vintage",
        },
      },
      {
        ...earned.period,
        source: {
          ...earned.period.source,
          citation: "Changed actual earned evidence",
        },
      },
    ])
      expect(() =>
        prepareWorkPayrollRequest(
          new FinanceReadGuard(),
          calendar,
          basis,
          earned.ledger,
          corrupted,
          "2021-01-08",
          "fixture-tampered",
          u,
        ),
      ).toThrow();
    const due = prepareWorkPayrollRequest(
      new FinanceReadGuard(),
      calendar,
      basis,
      earned.ledger,
      earned.period,
      "2021-01-08",
      "fixture-payroll:0",
      u,
    );
    expect(() =>
      prepareWorkPayrollSettlement(
        new FinanceReadGuard(),
        calendar,
        basis,
        earned.ledger,
        earned.period,
        {
          ...due,
          paySource: { ...source, estimatedFrom: "Changed original rationale" },
        },
        p("zero"),
        u,
      ),
    ).toThrow("full Source evidence");
    expect(earned).toEqual(before);
  });

  it("rejects own accessors without invoking them", () => {
    let calls = p("zero");
    const bad = { ...calendar };
    Object.defineProperty(bad, "firstPaydayAt", {
      enumerable: true,
      get() {
        calls += p("one");
        return calendar.firstPaydayAt;
      },
    });
    expect(() => accrueWith(bad)).toThrow("direct own data");
    expect(calls).toBe(p("zero"));
  });

  it("keeps original descriptor/read guards sensitive to Source, owner and proxy drift", () => {
    for (const key of ["firstPaydayAt", "organizationId"] as const) {
      const r = new FinanceReadGuard(),
        actual = { ...calendar };
      prepareWorkPayAccrual(
        r,
        actual,
        basis,
        undefined,
        undefined,
        shift(),
        "fixture-period:0",
        u,
      );
      if (key === "firstPaydayAt") actual[key] = "2021-01-09";
      else actual[key] = "other-employer";
      expect(() => r.verify()).toThrow("Stale finance");
    }
    let changed = false;
    const r = new FinanceReadGuard(),
      original = { ...source };
    const proxy = new Proxy(original, {
      getOwnPropertyDescriptor(target, key) {
        const d = Reflect.getOwnPropertyDescriptor(target, key);
        return changed && key === "citation" && d
          ? { ...d, value: "Changed provider-time Source" }
          : d;
      },
    });
    prepareWorkPayAccrual(
      r,
      { ...calendar, source: proxy },
      basis,
      undefined,
      undefined,
      shift(),
      "fixture-period:0",
      u,
    );
    changed = true;
    expect(() => r.verify()).toThrow("Stale finance");
  });

  it("does not calculate dates or amounts from a proxy get trap instead of captured own fields", () => {
    let calls = p("zero");
    const r = new FinanceReadGuard();
    const proxy = new Proxy(
      { ...calendar },
      {
        get() {
          calls += p("one");
          throw new Error("Uncaptured property read");
        },
      },
    );
    const actual = prepareWorkPayAccrual(
      r,
      proxy,
      basis,
      undefined,
      undefined,
      shift(),
      "fixture-period:0",
      u,
    );
    expect(actual.period.dueAt).toBe(calendar.firstPaydayAt);
    expect(actual.period.earnedMinor).toBe(shift().earnedMinor);
    expect(calls).toBe(p("zero"));
    r.verify();
  });

  it("rejects incoherent ledger stocks and partial completion markers", () => {
    const earned = accrue();
    for (const broken of [
      { ...earned.ledger, arrearsMinor: p("one") },
      { ...earned.ledger, accruedMinor: earned.ledger.accruedMinor + p("one") },
      { ...earned.ledger, lastSettledAt: "2021-01-08" },
    ] satisfies WorkPayrollLedger[])
      expect(() =>
        prepareWorkPayrollRequest(
          new FinanceReadGuard(),
          calendar,
          basis,
          broken,
          earned.period,
          "2021-01-08",
          "fixture-corrupt",
          u,
        ),
      ).toThrow();
  });
});

function accrueWith(actual: WorkPayrollCalendarInput) {
  return prepareWorkPayAccrual(
    new FinanceReadGuard(),
    actual,
    basis,
    undefined,
    undefined,
    shift(),
    "fixture-period:0",
    u,
  );
}
