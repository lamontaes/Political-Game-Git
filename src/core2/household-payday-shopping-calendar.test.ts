/** Controlled owning graphs, SOURCE-ONLY and UNEXECUTED by the author. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { cashJournalParameters } from "./cash-host";
import { chooseAct, createLifeCore } from "./life";
import financeData from "./data/finance.json" with { type: "json" };
import { FinancePlanningSession, FinanceReadGuard } from "./finance-plan";
import {
  createHouseholdPurchaseCalendarMarker,
  nextHouseholdPurchaseDate,
} from "./household-purchase-calendar";
import {
  createOpeningPurchaseCalendar,
  DEFAULT_OPENING_PURCHASE_CALENDAR_DATA,
} from "./opening-purchase-calendar";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import { admittedWorkPayrollCalendarMatches } from "./work-attendance";
import { nextWorkPayrollPeriod } from "./work-pay-period";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
import type {
  CoreInput,
  CoreState,
  Source,
  WorkAttendanceInput,
} from "./types";

const zero = p("zero"),
  one = p("one"),
  unit = p("minorPerDollar");
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2020-11-01",
  citation:
    "Controlled saved household, job, schedule and employer payroll calendar; not ordinary-world proof.",
  estimatedFrom:
    "Exact fixture records and registered units only; no attendance, payment or employer authority is inferred.",
};
interface Options {
  openingAt?: string;
  firstDueAt?: string;
  startsAt?: string;
  commitmentEndsAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  firstPeriodStartsAt?: string;
  firstPaydayAt?: string;
}
function input(options: Options = {}): CoreInput {
  const at = options.openingAt ?? "2021-01-01",
    dueAt = options.firstDueAt ?? at,
    calendar: WorkPayrollCalendarInput = {
      id: "pay-calendar",
      organizationId: "employer",
      workCommitmentIds: ["work"],
      basisRecordIds: ["employer", "job", "work"],
      rule: "fixed-days-after-inclusive-period-end",
      periodDays: p("daysPerWeek"),
      firstPeriodStartsAt: options.firstPeriodStartsAt ?? "2021-01-01",
      firstPaydayAt: options.firstPaydayAt ?? "2021-01-08",
      effectiveFrom: options.effectiveFrom ?? "2021-01-01",
      ...(options.effectiveUntil
        ? { effectiveUntil: options.effectiveUntil }
        : {}),
      nonbusinessDayRule: "no-adjustment",
      arrearsRule: "carry-to-next-recorded-payday",
      source,
    };
  return {
    seed: "controlled-payday-shopping-calendar",
    startedAt: at,
    people: [
      {
        id: "worker",
        givenName: "Calendar",
        familyName: "Fixture",
        birthDate: "1980-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: unit * p("monthsPerYear"),
        livingCostDailyMinor: zero,
        familyIds: [],
        knownIds: [],
        jobId: "job",
        source,
      },
    ],
    households: [
      { id: "home", placeId: "place", memberIds: ["worker"], source },
    ],
    organizations: ["employer", "supplier"].map((id) => ({
      id,
      name: id,
      kind: "employer",
      placeId: "place",
      liquidMinor: zero,
      source,
    })),
    jobs: [
      {
        id: "job",
        personId: "worker",
        organizationId: "employer",
        title: "Actual controlled job",
        hoursDaily: one,
        hourlyMinor: unit,
        wageDailyMinor: unit,
        source,
      },
    ],
    workCommitments: [
      {
        id: "work",
        jobId: "job",
        personId: "worker",
        organizationId: "employer",
        payrollCalendarId: calendar.id,
        startsAt: options.startsAt ?? "2021-01-01",
        anchorDate: "2021-01-01",
        periodDays: one,
        expectedWeeklyMinutes: p("minutesPerHour") * p("daysPerWeek"),
        hourlyMinor: unit,
        slots: [
          { offsetDays: zero, startMinute: zero, minutes: p("minutesPerHour") },
        ],
        scheduleSource: source,
        paySource: source,
        ...(options.commitmentEndsAt
          ? { endsAt: options.commitmentEndsAt }
          : {}),
      },
    ],
    workPayrollCalendars: [calendar],
    finance: {
      contracts: [
        {
          id: "purchase",
          householdId: "home",
          payerIds: ["worker"],
          payeeId: "supplier",
          kind: financeData.kinds.purchase,
          amountMinor: unit,
          dueAt,
          periodMonths: one,
          accruesArrears: false,
          salesReceipt: true,
          source,
          householdPurchaseCalendar: createHouseholdPurchaseCalendarMarker(
            "home",
            { dueAt, source, basisIds: ["job", "work", calendar.id], gaps: [] },
            DEFAULT_OPENING_PURCHASE_CALENDAR_DATA,
          ),
        },
      ],
      facilities: [],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function query(
  core: CoreState,
  nominal = "2021-02-01",
  following = "2021-03-01",
) {
  const session = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    row = core.finance.contracts.get("purchase")!,
    result = nextHouseholdPurchaseDate(session, row, nominal, following)!;
  session.reads.verify();
  return result;
}
function saved(core: CoreState) {
  return structuredClone({
    people: core.people,
    organizations: core.organizations,
    work: core.work,
    finance: core.finance,
    counts: core.actCounters,
    durable: core.durableLog,
    accounts: core.cashJournal.accounts,
    sequence: core.cashJournal.nextSequence,
    journalTotals: core.cashJournal.totals,
    external: core.cashJournal.externalFlowsByOwner,
  });
}
function firstOpeningChoice(data: CoreInput) {
  return createOpeningPurchaseCalendar(data, []).household(
    data.households[zero]!,
  );
}
function attendance(core: CoreState): WorkAttendanceInput {
  const api = coreAPI(core),
    row = core.work.commitments.get("work")!,
    cfg = core.data.work!,
    minutes = p("minutesPerHour"),
    decision = chooseAct(core, "worker", [
      {
        definition: cfg.attendanceAction,
        targetId: row.id,
        availableHours:
          p("hoursPerDay") - api.parameter(cfg.sleepReserveParameter),
        effortHours: one,
      },
    ]);
  return {
    id: "work-result:" + core.date + ":" + row.id,
    commitmentId: row.id,
    jobId: "job",
    personId: "worker",
    organizationId: "employer",
    date: core.date,
    plannedMinutes: minutes,
    attendedMinutes: minutes,
    absentMinutes: zero,
    earnedMinor: unit,
    payRemainderMinor: zero,
    reasonKey: decision.reasonKey,
    decision,
    source: { ...source, asOf: core.date },
  };
}

describe("bounded actual employer-payday shopping calendar (UNEXECUTED)", () => {
  it("skips Feb5 without eligible work and uses actual Feb12 after a Feb6 commitment start", () => {
    const data = input({ startsAt: "2021-02-06" }),
      original = structuredClone(data),
      core = createCore(data),
      before = saved(core),
      result = query(core),
      row = core.finance.contracts.get("purchase")!;
    expect(result).toMatchObject({
      nominalDueAt: "2021-02-01",
      effectiveDueAt: "2021-02-12",
      mode: "work",
    });
    expect(result.references.map((ref) => ref.id)).toEqual([
      "job",
      "work",
      "pay-calendar",
    ]);
    expect(result.references[zero + one + one]!.source).toEqual(source);
    expect(firstOpeningChoice(data).dueAt).toBe("2021-02-12");
    expect(data).toEqual(original);
    expect(saved(core)).toEqual(before);
    expect(row.amountMinor).toBe(unit);
    expect(row.periodMonths).toBe(one);
    expect(row.firstDueAt).toBe("2021-01-01");
    expect(row.endsAt).toBeUndefined();
    expect(row.source).toEqual(source);
  });
  it("settles exact original cash once and records the later actual payday as the next purchase date", () => {
    const core = createCore(input({ startsAt: "2021-02-06" })),
      api = coreAPI(core),
      beforeCash = core.people.get("worker")!.liquidMinor,
      receipt = api.settleFinanceContract("purchase");
    expect(receipt.paidMinor).toBe(unit);
    expect(receipt.nextHouseholdPurchaseCalendarBasis).toMatchObject({
      nominalDueAt: "2021-02-01",
      effectiveDueAt: "2021-02-12",
      mode: "work",
    });
    expect(core.people.get("worker")!.liquidMinor).toBe(beforeCash - unit);
    expect(core.organizations.get("supplier")!.liquidMinor).toBe(unit);
    const after = saved(core);
    expect(() => api.settleFinanceContract("purchase")).toThrow();
    expect(saved(core)).toEqual(after);
  });
  it("respects separately recorded effectiveFrom and firstPeriodStartsAt at opening and renewal", () => {
    for (const [options, expected] of [
      [{ effectiveFrom: "2021-02-06" }, "2021-02-12"],
      [
        { firstPeriodStartsAt: "2021-02-06", firstPaydayAt: "2021-02-13" },
        "2021-02-13",
      ],
    ] as const) {
      const data = input(options),
        core = createCore(data),
        before = saved(core);
      expect(query(core).effectiveDueAt).toBe(expected);
      expect(firstOpeningChoice(data).dueAt).toBe(expected);
      expect(saved(core)).toEqual(before);
    }
  });
  it("excludes work exactly at effectiveUntil but preserves an eligible earlier earning period's later payday", () => {
    for (const [end, expectedMode, expectedDate] of [
      ["2021-02-06", "missing-income", "2021-02-01"],
      ["2021-02-07", "work", "2021-02-12"],
    ] as const) {
      const data = input({ startsAt: "2021-02-06", effectiveUntil: end }),
        core = createCore(data),
        before = saved(core),
        result = query(core);
      expect(result.mode).toBe(expectedMode);
      expect(result.effectiveDueAt).toBe(expectedDate);
      const opening = firstOpeningChoice(data);
      expect(opening.dueAt).toBe(expectedDate);
      expect(
        opening.gaps.some((gap) =>
          gap.includes(DEFAULT_OPENING_PURCHASE_CALENDAR_DATA.missingIncomeGap),
        ),
      ).toBe(expectedMode === "missing-income");
      expect(saved(core)).toEqual(before);
    }
  });
  it("does not find a new wage opportunity in a later window after all recorded earning eligibility ended", () => {
    const core = createCore(
        input({ firstDueAt: "2021-01-12", effectiveUntil: "2021-02-01" }),
      ),
      before = saved(core),
      result = query(core, "2021-02-12", "2021-03-12");
    expect(result).toMatchObject({
      nominalDueAt: "2021-02-12",
      effectiveDueAt: "2021-02-12",
      mode: "missing-income",
      references: [],
    });
    expect(saved(core)).toEqual(before);
  });
  it("keeps inclusive supplied commitment end and original full schedule/pay Sources", () => {
    const data = input({
        startsAt: "2021-02-06",
        commitmentEndsAt: "2021-02-06",
        effectiveUntil: "2021-02-07",
      }),
      core = createCore(data),
      before = saved(core);
    expect(query(core).effectiveDueAt).toBe("2021-02-12");
    expect(firstOpeningChoice(data).dueAt).toBe("2021-02-12");
    expect(core.work.commitments.get("work")!.scheduleSource).toEqual(source);
    expect(core.work.commitments.get("work")!.paySource).toEqual(source);
    expect(saved(core)).toEqual(before);
  });
  it("retains genuine already-earned wages and their recorded payday after calendar earning end without making cash due early", () => {
    const core = createLifeCore(
      input({
        openingAt: "2020-12-08",
        firstDueAt: "2020-12-08",
        effectiveUntil: "2021-01-03",
      }),
      { observer: false },
    );
    advanceDate(core, "2021-01-02");
    const row = coreAPI(core).recordWorkAttendance(attendance(core)),
      before = saved(core),
      period = core.work.earnedPayPeriods.get(row.earnedPayPeriodId)!;
    expect(period.dueAt).toBe("2021-01-08");
    expect(query(core, "2021-01-08", "2021-02-08").effectiveDueAt).toBe(
      period.dueAt,
    );
    const reads = new FinanceReadGuard(),
      calendar = core.work.payrollCalendars.get("pay-calendar")!;
    expect(
      nextWorkPayrollPeriod(reads, calendar, period.dueAt, core.date, {
        zero,
        one,
        monthsPerYear: p("monthsPerYear"),
      }).dueAt,
    ).toBe(period.dueAt);
    reads.verify();
    expect(core.work.payrollLedgerByCommitment.get("work")).toMatchObject({
      earnedMinor: unit,
      accruedMinor: unit,
      dueRecognizedMinor: zero,
      paidMinor: zero,
      arrearsMinor: zero,
    });
    expect(saved(core)).toEqual(before);
  });
  it("rejects detached frozen calendar identities and stale by-job/commitment bindings without effects", () => {
    for (const tamper of [
      (core: CoreState) => {
        const actual = core.work.payrollCalendars.get("pay-calendar")!,
          copy = Object.freeze({
            ...actual,
            source: { ...actual.source, citation: "Unadmitted altered source" },
          });
        expect(admittedWorkPayrollCalendarMatches(core, actual.id, copy)).toBe(
          false,
        );
        core.work.payrollCalendars.set(actual.id, copy);
      },
      (core: CoreState) => {
        core.work.payrollCalendarByJob.delete("job");
      },
      (core: CoreState) => {
        core.work.payrollCalendarByJob.set("job", "other-calendar");
      },
      (core: CoreState) => {
        core.work.payrollCalendarByCommitment.set("work", "other-calendar");
      },
      (core: CoreState) => {
        const actual = core.work.payrollCalendars.get("pay-calendar")!;
        core.work.payrollCalendars.set(
          actual.id,
          Object.freeze({ ...actual, id: "other-calendar" }),
        );
      },
    ]) {
      const core = createCore(input());
      tamper(core);
      const before = saved(core);
      expect(() => query(core)).toThrow(/admitted employer payday calendar/);
      expect(saved(core)).toEqual(before);
    }
  });
  it("captures owning links for the original final read guard and rejects accessor identities without running getters", () => {
    const core = createCore(input()),
      session = new FinancePlanningSession(
        core,
        core.cashJournal,
        cashJournalParameters(core),
      );
    nextHouseholdPurchaseDate(
      session,
      core.finance.contracts.get("purchase")!,
      "2021-02-01",
      "2021-03-01",
    );
    core.work.payrollCalendarByJob.set("job", "changed-after-preparation");
    const afterTamper = saved(core);
    expect(() => session.reads.verify()).toThrow(/Stale finance/);
    expect(saved(core)).toEqual(afterTamper);
    const guarded = createCore(input()),
      beforeAccessor = saved(guarded),
      commitment = guarded.work.commitments.get("work")!;
    let calls = zero;
    Object.defineProperty(commitment, "payrollCalendarId", {
      configurable: true,
      get() {
        calls += one;
        throw new Error("getter must not run");
      },
    });
    expect(() => query(guarded)).toThrow();
    expect(calls).toBe(zero);
    Object.defineProperty(commitment, "payrollCalendarId", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: "pay-calendar",
    });
    expect(query(guarded).mode).toBe("work");
    expect(saved(guarded)).toEqual(beforeAccessor);
  });
  it("preserves complete original slot and overlap rejection before selecting any eligible payday", () => {
    for (const tamper of [
      (core: CoreState) => {
        core.work.commitments.get("work")!.slots = [
          {
            offsetDays: zero,
            startMinute: p("hoursPerDay") * p("minutesPerHour"),
            minutes: one,
          },
        ];
      },
      (core: CoreState) => {
        const row = core.work.commitments.get("work")!;
        row.slots = [row.slots[zero]!, { ...row.slots[zero]! }];
      },
    ]) {
      const core = createCore(input());
      tamper(core);
      const before = saved(core);
      expect(() => query(core)).toThrow(/slot|overlap/);
      expect(saved(core)).toEqual(before);
    }
  });
  it("retains a supplied custom full payroll Source exactly on its owner and renewal references", () => {
    const data = input(),
      full: Source = {
        ...source,
        citation: "Actual fixture employer custom calendar citation",
        estimatedFrom:
          "Full custom calendar rationale with independently saved work and employer basis.",
        generationPriorVintage: "fixture-vintage",
      };
    data.workPayrollCalendars = [
      { ...data.workPayrollCalendars![zero]!, source: full },
    ];
    const original = structuredClone(data),
      core = createCore(data),
      before = saved(core),
      result = query(core);
    expect(
      result.references.find((ref) => ref.kind === "payroll-calendar")!.source,
    ).toEqual(full);
    expect(core.work.payrollCalendars.get("pay-calendar")!.source).toEqual(
      full,
    );
    expect(firstOpeningChoice(data).basisIds).toEqual([
      "job",
      "work",
      "pay-calendar",
    ]);
    expect(data).toEqual(original);
    expect(saved(core)).toEqual(before);
  });
  it("requires actual independently saved opening calendar basis and Source, and rejects future/current-source getters", () => {
    for (const tamper of [
      (data: CoreInput) => {
        data.workPayrollCalendars = [
          {
            ...data.workPayrollCalendars![zero]!,
            basisRecordIds: ["invented-owner"],
          },
        ];
      },
      (data: CoreInput) => {
        data.workPayrollCalendars = [
          {
            ...data.workPayrollCalendars![zero]!,
            source: { ...source, asOf: "2021-01-02" },
          },
        ];
      },
      (data: CoreInput) => {
        data.workPayrollCalendars = [
          {
            ...data.workPayrollCalendars![zero]!,
            source: { ...source, citation: "" },
          },
        ];
      },
      (data: CoreInput) => {
        data.workPayrollCalendars = [
          { ...data.workPayrollCalendars![zero]!, organizationId: "supplier" },
        ];
      },
    ]) {
      const data = input();
      tamper(data);
      const before = structuredClone(data);
      expect(() => firstOpeningChoice(data)).toThrow();
      expect(data).toEqual(before);
    }
    const data = input(),
      calendar = data.workPayrollCalendars![zero]!;
    let calls = zero;
    Object.defineProperty(calendar, "effectiveFrom", {
      configurable: true,
      get() {
        calls += one;
        throw new Error("opening calendar getter must not run");
      },
    });
    expect(() => firstOpeningChoice(data)).toThrow();
    expect(calls).toBe(zero);
  });
});
