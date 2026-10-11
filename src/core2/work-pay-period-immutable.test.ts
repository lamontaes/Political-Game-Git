/** Source-only proposed immutable-calendar regressions; packet author did not execute. */
import { describe, expect, it, vi } from "vitest";
import { FinanceReadGuard } from "./finance-plan";
import { parameter as p } from "./parameters";
import {
  createImmutableWorkPayrollCalendar,
  nextWorkPayrollPeriod,
  prepareWorkPayAccrual,
  prepareWorkPayrollRequest,
  workPayPeriodAtIndex,
  workPayPeriodOnDate,
} from "./work-pay-period";
import type {
  WorkPayrollBasis,
  WorkPayrollCalendarInput,
} from "./work-pay-period";
import type { Source } from "./types";

const units = () => ({
  zero: p("zero"),
  one: p("one"),
  monthsPerYear: p("monthsPerYear"),
});
const source = (): Source => ({
  tag: "SOURCED",
  asOf: "2021-01-01",
  citation:
    "Supplied controlled payroll calendar; not an observed employer or a generated-world result.",
  estimatedFrom: "Retained optional original rationale.",
  generationPriorVintage: "Retained original fixture vintage.",
});
const fixture = (): WorkPayrollCalendarInput => ({
  id: "immutable-pay-calendar",
  organizationId: "immutable-employer",
  workCommitmentIds: ["immutable-commitment"],
  basisRecordIds: ["immutable-employer"],
  rule: "fixed-days-after-inclusive-period-end",
  firstPeriodStartsAt: "2021-01-01",
  periodDays: p("daysPerWeek"),
  firstPaydayAt: "2021-01-08",
  effectiveFrom: "2021-01-01",
  nonbusinessDayRule: "no-adjustment",
  arrearsRule: "carry-to-next-recorded-payday",
  source: source(),
});
const monthly = (
  first = "2021-01-31",
  firstDue = "2021-02-28",
): WorkPayrollCalendarInput => ({
  ...fixture(),
  rule: "calendar-months-after-inclusive-period-end",
  periodDays: undefined,
  periodMonths: p("one"),
  firstPeriodStartsAt: first,
  firstPaydayAt: firstDue,
  nominalBoundaryDays: [new Date(`${first}T00:00:00.000Z`).getUTCDate()],
  shortMonthRule: "clamp-to-calendar-month-end",
});
const semi = (): WorkPayrollCalendarInput => ({
  ...fixture(),
  rule: "twice-calendar-month-after-inclusive-period-end",
  periodDays: undefined,
  nominalBoundaryDays: [
    p("one"),
    new Date("2021-01-16T00:00:00.000Z").getUTCDate(),
  ],
  shortMonthRule: "clamp-to-calendar-month-end",
  firstPaydayAt: "2021-01-16",
});
const owner = (calendar: WorkPayrollCalendarInput): WorkPayrollBasis => ({
  calendarId: calendar.id,
  commitmentId: "immutable-commitment",
  jobId: "immutable-job",
  personId: "immutable-worker",
  organizationId: calendar.organizationId,
  jobSource: source(),
  paySource: source(),
  scheduleSource: source(),
});

describe("own admitted immutable payroll calculation", () => {
  it("creates an independent deeply frozen graph with complete optional Source data", () => {
    const raw = fixture(),
      detail = { references: ["actual-fixture-basis"] };
    Object.defineProperty(raw.source, "additionalEvidence", {
      value: detail,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    const before = structuredClone(raw),
      actual = createImmutableWorkPayrollCalendar(raw, "2021-01-01", units()),
      evidence = Object.getOwnPropertyDescriptor(
        actual.source,
        "additionalEvidence",
      )!;
    expect(actual).not.toBe(raw);
    expect(actual.source).not.toBe(raw.source);
    expect(actual.workCommitmentIds).not.toBe(raw.workCommitmentIds);
    expect(actual.basisRecordIds).not.toBe(raw.basisRecordIds);
    expect(Object.isFrozen(actual)).toBe(true);
    expect(Object.isFrozen(actual.source)).toBe(true);
    expect(Object.isFrozen(actual.workCommitmentIds)).toBe(true);
    expect(Object.isFrozen(actual.basisRecordIds)).toBe(true);
    expect(evidence.enumerable).toBe(false);
    expect(evidence.value).not.toBe(detail);
    expect(Object.isFrozen(evidence.value)).toBe(true);
    expect(Object.isFrozen(evidence.value.references)).toBe(true);
    expect(actual.source.estimatedFrom).toBe(raw.source.estimatedFrom);
    expect(actual.source.generationPriorVintage).toBe(
      raw.source.generationPriorVintage,
    );
    expect(raw).toEqual(before);
    expect(Object.isFrozen(raw)).toBe(false);
    detail.references.push("later-caller-only-basis");
    raw.source.citation = "Later caller source";
    expect(evidence.value.references).toEqual(["actual-fixture-basis"]);
    expect(actual.source.citation).toBe(before.source.citation);
    expect(Reflect.set(actual, "periodDays", p("one"))).toBe(false);
  });

  it("skips membership-array copying only on the exact factory identity and still reads its full Source", () => {
    const raw = fixture(),
      actual = createImmutableWorkPayrollCalendar(raw, "2021-01-01", units()),
      r = new FinanceReadGuard(),
      arrays = vi.spyOn(r, "array"),
      payloads = vi.spyOn(r, "payload");
    const result = workPayPeriodOnDate(r, actual, "2021-01-07", units());
    expect(result).toEqual(
      workPayPeriodOnDate(new FinanceReadGuard(), raw, "2021-01-07", units()),
    );
    expect(arrays).not.toHaveBeenCalled();
    expect(
      payloads.mock.calls.some(([target]) => target === actual.source),
    ).toBe(true);
    expect(payloads.mock.calls.some(([target]) => target === actual)).toBe(
      false,
    );
    r.seal();
  });

  it("keeps caller-frozen calendars on the original guarded path until final Source verification", () => {
    const caller = Object.freeze(fixture()),
      r = new FinanceReadGuard(),
      arrays = vi.spyOn(r, "array");
    workPayPeriodOnDate(r, caller, "2021-01-07", units());
    expect(arrays).toHaveBeenCalled();
    caller.source.citation = "Changed source on a shallow caller freeze";
    expect(() => r.verify()).toThrow("Stale finance");
  });

  it("does not transfer the private brand through a clone or proxy wrapper", () => {
    const actual = createImmutableWorkPayrollCalendar(
      fixture(),
      "2021-01-01",
      units(),
    );
    let gets = p("zero");
    const proxy = new Proxy(actual, {
      get() {
        gets += p("one");
        throw new Error("Raw proxy get");
      },
    });
    for (const copied of [structuredClone(actual), proxy]) {
      const r = new FinanceReadGuard(),
        arrays = vi.spyOn(r, "array");
      expect(workPayPeriodOnDate(r, copied, "2021-01-07", units()).dueAt).toBe(
        "2021-01-08",
      );
      expect(arrays).toHaveBeenCalled();
      r.verify();
    }
    expect(gets).toBe(p("zero"));
  });

  it("builds its own calendar from captured descriptors without invoking a raw proxy get trap", () => {
    let gets = p("zero");
    const raw = fixture(),
      proxy = new Proxy(raw, {
        get() {
          gets += p("one");
          throw new Error("Raw get");
        },
      }),
      actual = createImmutableWorkPayrollCalendar(proxy, "2021-01-01", units());
    expect(Object.is(actual, proxy)).toBe(false);
    expect(actual.source).not.toBe(raw.source);
    expect(
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-01-07", units())
        .dueAt,
    ).toBe("2021-01-08");
    expect(gets).toBe(p("zero"));
  });

  it("runs the complete original membership, cadence and boundary validation before branding", () => {
    const raw = fixture();
    for (const wrong of [
      {
        ...raw,
        workCommitmentIds: ["immutable-commitment", "immutable-commitment"],
      },
      { ...raw, basisRecordIds: ["immutable-employer", "immutable-employer"] },
      { ...raw, periodDays: p("zero") },
      { ...raw, firstPaydayAt: "2021-01-06" },
      { ...raw, effectiveUntil: raw.effectiveFrom },
      { ...raw, firstPeriodStartsAt: "2021-02-30" },
    ])
      expect(() =>
        createImmutableWorkPayrollCalendar(wrong, "2021-01-01", units()),
      ).toThrow();
  });

  it("rejects Source and unit accessors without invoking them", () => {
    let gets = p("zero");
    const raw = fixture(),
      supplied = units();
    Object.defineProperty(raw.source, "citation", {
      get() {
        gets += p("one");
        return "Accessor source";
      },
    });
    expect(() =>
      createImmutableWorkPayrollCalendar(raw, "2021-01-01", units()),
    ).toThrow("direct own data");
    Object.defineProperty(supplied, "one", {
      get() {
        gets += p("one");
        return p("one");
      },
    });
    expect(() =>
      createImmutableWorkPayrollCalendar(fixture(), "2021-01-01", supplied),
    ).toThrow("direct own data");
    expect(gets).toBe(p("zero"));
  });

  it("rejects fake frozen mutable collections, cycles, sparse evidence arrays and custom prototypes", () => {
    const variants = [
      Object.freeze(new Map([["basis", "mutable-map-entry"]])),
      Object.freeze(new Set(["mutable-set-entry"])),
      Object.freeze(new Date("2021-01-01T00:00:00.000Z")),
      Object.create({ inheritedEvidence: "caller-owned-prototype" }),
    ];
    let inheritedGets = p("zero");
    const inherited: unknown[] = [],
      prototype = Object.create(Array.prototype);
    Object.defineProperty(prototype, p("zero"), {
      get() {
        inheritedGets += p("one");
        return "Inherited value";
      },
    });
    inherited.length = p("one");
    Object.setPrototypeOf(inherited, prototype);
    variants.push(inherited);
    const sparse: unknown[] = [];
    sparse.length = p("one");
    variants.push(sparse);
    const cycle: { again?: unknown } = {};
    cycle.again = cycle;
    variants.push(cycle);
    for (const additionalEvidence of variants) {
      const raw = fixture();
      Object.defineProperty(raw.source, "additionalEvidence", {
        value: additionalEvidence,
      });
      expect(() =>
        createImmutableWorkPayrollCalendar(raw, "2021-01-01", units()),
      ).toThrow();
    }
    expect(inheritedGets).toBe(p("zero"));
  });

  it("rejects a changed original Source before factory branding and retains unbranded transient-shape rejection", () => {
    const raw = fixture(),
      original = raw.source;
    let sourceKeys = p("zero");
    raw.source = new Proxy(original, {
      ownKeys(target) {
        sourceKeys += p("one");
        if (sourceKeys === p("two"))
          target.citation = "Changed during original validation";
        return Reflect.ownKeys(target);
      },
    });
    expect(() =>
      createImmutableWorkPayrollCalendar(raw, "2021-01-01", units()),
    ).toThrow(/changed while copying|Stale finance/);
    const mutable = fixture(),
      target = { ...mutable.source } as Source & { temporary?: string };
    let keys = p("zero");
    mutable.source = new Proxy(target, {
      ownKeys(value) {
        keys += p("one");
        if (keys === p("two")) {
          value.temporary = "Transient shape";
          const result = Reflect.ownKeys(value);
          delete value.temporary;
          return result;
        }
        return Reflect.ownKeys(value);
      },
    });
    const r = new FinanceReadGuard();
    workPayPeriodOnDate(r, mutable, "2021-01-07", units());
    expect(Object.hasOwn(target, "temporary")).toBe(false);
    expect(() => r.verify()).toThrow("Stale finance");
  });

  it("checks evidence availability at each earning/query date, even after later successful admission", () => {
    const incompleteEstimate = fixture();
    incompleteEstimate.source = {
      ...source(),
      tag: "ESTIMATED",
      estimatedFrom: undefined,
    };
    expect(() =>
      createImmutableWorkPayrollCalendar(
        incompleteEstimate,
        "2021-01-01",
        units(),
      ),
    ).toThrow("dated Source");
    const raw = fixture();
    raw.source = { ...source(), asOf: "2021-01-03" };
    expect(() =>
      createImmutableWorkPayrollCalendar(raw, "2021-01-01", units()),
    ).toThrow("dated Source");
    const actual = createImmutableWorkPayrollCalendar(
      raw,
      "2021-01-03",
      units(),
    );
    expect(() =>
      workPayPeriodOnDate(
        new FinanceReadGuard(),
        actual,
        "2021-01-02",
        units(),
      ),
    ).toThrow("dated Source");
    expect(() =>
      workPayPeriodAtIndex(
        new FinanceReadGuard(),
        actual,
        p("one"),
        "2021-01-02",
        units(),
      ),
    ).toThrow("dated Source");
    expect(() =>
      nextWorkPayrollPeriod(
        new FinanceReadGuard(),
        actual,
        "2021-04-01",
        "2021-01-02",
        units(),
      ),
    ).toThrow("dated Source");
    expect(
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-01-03", units())
        .dueAt,
    ).toBe("2021-01-08");
  });

  it("retains effective earning bounds while allowing the actual final earned period to become due later", () => {
    const raw = {
        ...fixture(),
        effectiveFrom: "2021-01-02",
        effectiveUntil: "2021-01-04",
      },
      actual = createImmutableWorkPayrollCalendar(raw, "2021-01-01", units()),
      b = owner(actual);
    expect(() =>
      workPayPeriodOnDate(
        new FinanceReadGuard(),
        actual,
        "2021-01-01",
        units(),
      ),
    ).toThrow("outside");
    expect(() =>
      workPayPeriodOnDate(
        new FinanceReadGuard(),
        actual,
        "2021-01-04",
        units(),
      ),
    ).toThrow("outside");
    const earned = prepareWorkPayAccrual(
      new FinanceReadGuard(),
      actual,
      b,
      undefined,
      undefined,
      {
        id: "actual-earned-shift",
        date: "2021-01-03",
        commitmentId: b.commitmentId,
        jobId: b.jobId,
        personId: b.personId,
        organizationId: b.organizationId,
        plannedMinutes: p("minutesPerHour"),
        attendedMinutes: p("minutesPerHour"),
        absentMinutes: p("zero"),
        earnedMinor: p("minorPerDollar"),
        source: source(),
      },
      "actual-earned-period",
      units(),
    );
    const due = prepareWorkPayrollRequest(
      new FinanceReadGuard(),
      actual,
      b,
      earned.ledger,
      earned.period,
      "2021-01-08",
      "actual-payday-request",
      units(),
    );
    expect(due.newlyDueMinor).toBe(earned.period.earnedMinor);
    expect(due.dueAt).toBe("2021-01-08");
    expect(earned.ledger.paidMinor).toBe(p("zero"));
  });

  it("binds exact registered units and preserves their original final descriptor guards", () => {
    for (const wrong of [
      { ...units(), zero: p("one") },
      { ...units(), one: p("two") },
      { ...units(), monthsPerYear: p("monthsPerYear") + p("one") },
    ])
      expect(() =>
        createImmutableWorkPayrollCalendar(fixture(), "2021-01-01", wrong),
      ).toThrow("registered exact");
    const actual = createImmutableWorkPayrollCalendar(
        fixture(),
        "2021-01-01",
        units(),
      ),
      r = new FinanceReadGuard(),
      supplied = units();
    workPayPeriodOnDate(r, actual, "2021-01-07", supplied);
    Object.defineProperty(supplied, "one", {
      value: supplied.one,
      writable: false,
    });
    expect(() => r.verify()).toThrow("Stale finance");
    expect(() =>
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-01-07", {
        ...units(),
        zero: -p("zero"),
      }),
    ).toThrow("units differ");
  });

  it("keeps monthly end dates and next-payday results identical across leap and nonleap short months", () => {
    for (const [raw, dates] of [
      [monthly(), ["2021-02-28", "2021-03-31", "2021-04-30"]],
      [
        {
          ...monthly("2020-01-31", "2020-02-29"),
          source: { ...source(), asOf: "2020-01-01" },
          effectiveFrom: "2020-01-01",
        },
        ["2020-02-29", "2020-03-31", "2020-04-30"],
      ],
    ] as const) {
      const actual = createImmutableWorkPayrollCalendar(
        raw,
        raw.source.asOf,
        units(),
      );
      for (const at of dates) {
        expect(
          workPayPeriodOnDate(new FinanceReadGuard(), actual, at, units()),
        ).toEqual(
          workPayPeriodOnDate(new FinanceReadGuard(), raw, at, units()),
        );
        expect(
          nextWorkPayrollPeriod(
            new FinanceReadGuard(),
            actual,
            at,
            raw.source.asOf,
            units(),
          ),
        ).toEqual(
          nextWorkPayrollPeriod(
            new FinanceReadGuard(),
            raw,
            at,
            raw.source.asOf,
            units(),
          ),
        );
      }
    }
    const actual = createImmutableWorkPayrollCalendar(
      monthly(),
      "2021-01-01",
      units(),
    );
    expect(
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-02-28", units())
        .fromAt,
    ).toBe("2021-02-28");
    expect(
      workPayPeriodOnDate(new FinanceReadGuard(), actual, "2021-03-31", units())
        .fromAt,
    ).toBe("2021-03-31");
    expect(
      workPayPeriodAtIndex(
        new FinanceReadGuard(),
        actual,
        p("one"),
        "2021-01-01",
        units(),
      ).dueAt,
    ).toBe("2021-03-31");
  });

  it("validates twice-month short-month collapse at admission and retains valid real boundaries", () => {
    const raw = semi(),
      actual = createImmutableWorkPayrollCalendar(raw, "2021-01-01", units());
    for (const at of ["2021-02-16", "2021-02-28", "2021-03-01"])
      expect(
        workPayPeriodOnDate(new FinanceReadGuard(), actual, at, units()),
      ).toEqual(workPayPeriodOnDate(new FinanceReadGuard(), raw, at, units()));
    expect(
      workPayPeriodOnDate(
        new FinanceReadGuard(),
        actual,
        "2021-02-28",
        units(),
      ),
    ).toMatchObject({
      fromAt: "2021-02-16",
      throughAt: "2021-02-28",
      dueAt: "2021-03-01",
    });
    const collapsed: WorkPayrollCalendarInput = {
      ...raw,
      firstPeriodStartsAt: "2021-01-28",
      firstPaydayAt: "2021-01-31",
      nominalBoundaryDays: [
        new Date("2021-01-28T00:00:00.000Z").getUTCDate(),
        new Date("2021-01-31T00:00:00.000Z").getUTCDate(),
      ],
    };
    expect(() =>
      createImmutableWorkPayrollCalendar(collapsed, "2021-01-01", units()),
    ).toThrow("collapse");
  });

  it("does not bypass an original guard Source failure after recognizing an immutable calendar", () => {
    const actual = createImmutableWorkPayrollCalendar(
        fixture(),
        "2021-01-01",
        units(),
      ),
      r = new FinanceReadGuard(),
      original = r.payload.bind(r);
    vi.spyOn(r, "payload").mockImplementation((target, zero, one, seen) => {
      if (target === actual.source)
        throw new Error("Original full Source guard rejected");
      original(target, zero, one, seen);
    });
    expect(() => workPayPeriodOnDate(r, actual, "2021-01-07", units())).toThrow(
      "Original full Source guard rejected",
    );
  });

  it("validates again and produces a fresh private identity when the factory receives an existing factory output", () => {
    const first = createImmutableWorkPayrollCalendar(
        fixture(),
        "2021-01-01",
        units(),
      ),
      second = createImmutableWorkPayrollCalendar(first, "2021-01-01", units());
    expect(second).not.toBe(first);
    expect(second.source).not.toBe(first.source);
    expect(second.workCommitmentIds).not.toBe(first.workCommitmentIds);
    expect(second).toEqual(first);
    expect(() =>
      createImmutableWorkPayrollCalendar(first, "2020-12-31", units()),
    ).toThrow("dated Source");
  });
});
