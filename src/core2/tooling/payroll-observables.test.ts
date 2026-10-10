/** Controlled owning graphs; SOURCE-ONLY, UNEXECUTED by this packet's author. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "../calendar";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../business-books";
import { chooseAct, createLifeCore } from "../life";
import { LIFE_MODULE } from "../modules/life";
import { parameter as p } from "../parameters";
import { coreAPI, createCore } from "../state";
import { settleWorkPayrollJournal } from "../work-payroll-cash";
import type {
  CoreInput,
  CoreState,
  Source,
  WorkAttendanceInput,
} from "../types";
import type { WorkPayrollCalendarInput } from "../work-pay-period";
import { financeObservables } from "./finance-observables";
import { payrollStockObservables } from "./payroll-observables";

const zero = p("zero"),
  one = p("one"),
  unit = p("minorPerDollar"),
  half = unit / p("two");
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2020-11-01",
  citation:
    "Independent controlled worker/job/employer/schedule/pay-calendar records; no ordinary-world proof.",
  estimatedFrom:
    "Exact fixture records, dates and registered units. Only actual committed attendance earns wages; only genuine payday sources recognize due cash.",
  generationPriorVintage: "controlled-stock-fixture",
};
function fixture(employerCash = half, book = false): CoreInput {
  const calendar: WorkPayrollCalendarInput = {
    id: "calendar",
    organizationId: "employer",
    workCommitmentIds: ["work"],
    basisRecordIds: ["employer", "job", "work"],
    rule: "fixed-days-after-inclusive-period-end",
    periodDays: p("daysPerWeek"),
    firstPeriodStartsAt: "2021-01-01",
    firstPaydayAt: "2021-01-08",
    effectiveFrom: "2021-01-01",
    nonbusinessDayRule: "no-adjustment",
    arrearsRule: "carry-to-next-recorded-payday",
    source,
  };
  return {
    seed: "controlled-payroll-stock-observer",
    startedAt: "2021-01-01",
    people: [
      {
        id: "worker",
        givenName: "Stock",
        familyName: "Fixture",
        birthDate: "1980-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: zero,
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
    organizations: [
      {
        id: "employer",
        name: "Controlled employer",
        kind: "employer",
        placeId: "place",
        liquidMinor: employerCash,
        source,
      },
    ],
    jobs: [
      {
        id: "job",
        personId: "worker",
        organizationId: "employer",
        title: "Actual saved controlled job",
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
        startsAt: "2021-01-01",
        anchorDate: "2021-01-01",
        periodDays: one,
        hourlyMinor: unit,
        expectedWeeklyMinutes: p("minutesPerHour") * p("daysPerWeek"),
        slots: [
          { offsetDays: zero, startMinute: zero, minutes: p("minutesPerHour") },
        ],
        scheduleSource: source,
        paySource: source,
      },
    ],
    workPayrollCalendars: [calendar],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    ...(book
      ? {
          finance: {
            contracts: [],
            facilities: [],
            gaps: [],
            businesses: [
              {
                organizationId: "employer",
                kindId: DEFAULT_BUSINESS_BOOKS_DATA.kinds[zero]!.id,
                annualPayrollMinor: unit * p("monthsPerYear"),
                annualDemandMinor: unit * p("monthsPerYear") * p("two"),
                annualOtherCostsMinor: zero,
                openingTownIncomeMinor: unit * p("monthsPerYear"),
                capacityMinor: unit * p("monthsPerYear") * p("two"),
                price: one,
                costContractIds: [],
                source,
              },
            ],
          },
        }
      : {}),
  };
}
function saved(core: CoreState) {
  return structuredClone({
    people: core.people,
    organizations: core.organizations,
    jobs: core.jobs,
    work: core.work,
    finance: core.finance,
    counters: core.actCounters,
    durable: core.durableLog,
    knowledge: core.knowledgeByPerson,
    accounts: core.cashJournal.accounts,
    sequence: core.cashJournal.nextSequence,
    totals: core.cashJournal.totals,
    externalFlows: core.cashJournal.externalFlowsByOwner,
  });
}
function attendance(core: CoreState, present = true): WorkAttendanceInput {
  const cfg = core.data.work!,
    api = coreAPI(core),
    row = core.work.commitments.get("work")!,
    planned = p("minutesPerHour"),
    attended = present ? planned : zero,
    decision = chooseAct(core, "worker", [
      {
        definition: present ? cfg.attendanceAction : cfg.absenceAction,
        targetId: row.id,
        availableHours:
          p("hoursPerDay") - api.parameter(cfg.sleepReserveParameter),
        effortHours: present ? one : zero,
      },
    ]);
  return {
    id: `work-result:${core.date}:work`,
    date: core.date,
    commitmentId: "work",
    jobId: "job",
    personId: "worker",
    organizationId: "employer",
    plannedMinutes: planned,
    attendedMinutes: attended,
    absentMinutes: planned - attended,
    earnedMinor: present ? unit : zero,
    payRemainderMinor: zero,
    decision,
    reasonKey: decision.reasonKey,
    source: { ...source, asOf: core.date },
  };
}
function earned(employerCash = half, present = true, book = false) {
  const data = fixture(employerCash, book),
    original = structuredClone(data),
    core = createLifeCore(data, { observer: false });
  advanceDate(core, "2021-01-02");
  const row = coreAPI(core).recordWorkAttendance(attendance(core, present));
  expect(data).toEqual(original);
  return { core, row };
}
function due(book = false) {
  const { core } = earned(half, true, book);
  advanceDate(core, "2021-01-08");
  const receipt = settleWorkPayrollJournal(core, coreAPI(core), "work");
  expect(receipt).toMatchObject({
    requestedMinor: unit,
    newlyDueMinor: unit,
    paidMinor: half,
    arrearsAfterMinor: half,
  });
  return { core, receipt };
}
function rejectsUnchanged(core: CoreState, pattern: RegExp) {
  const before = saved(core);
  expect(() => payrollStockObservables(core)).toThrow(pattern);
  expect(saved(core)).toEqual(before);
}

describe("actual payroll stocks and original work-total labels (UNEXECUTED)", () => {
  it("reports earned accrual before due and genuine partial payday debt without changing original requested/paid labels", () => {
    const { core } = earned(),
      before = saved(core),
      earnedStocks = payrollStockObservables(core),
      first = financeObservables(core).wages;
    expect(earnedStocks).toMatchObject({
      earnedMinor: unit,
      dueRecognizedMinor: zero,
      accruedMinor: unit,
      paidMinor: zero,
      arrearsMinor: zero,
      legacyUnpaidMinor: zero,
    });
    expect(first).toMatchObject({
      requestedMinor: unit,
      paidMinor: zero,
      unpaidMinor: unit,
      earnedMinor: unit,
      accruedMinor: unit,
      arrearsMinor: zero,
    });
    expect(saved(core)).toEqual(before);
    advanceDate(core, "2021-01-08");
    settleWorkPayrollJournal(core, coreAPI(core), "work");
    const afterCash = saved(core);
    expect(payrollStockObservables(core)).toMatchObject({
      earnedMinor: unit,
      dueRecognizedMinor: unit,
      accruedMinor: zero,
      paidMinor: half,
      arrearsMinor: half,
      legacyUnpaidMinor: zero,
    });
    expect(financeObservables(core).wages).toMatchObject({
      requestedMinor: unit,
      paidMinor: half,
      unpaidMinor: half,
      accruedMinor: zero,
      arrearsMinor: half,
    });
    expect(core.people.get("worker")!.liquidMinor).toBe(half);
    expect(core.organizations.get("employer")!.liquidMinor).toBe(zero);
    expect(saved(core)).toEqual(afterCash);
  });
  it("rejects lost enrolled ledgers even when every open-period index was pruned, instead of silently calling earned pay legacy unpaid", () => {
    const { core } = earned();
    core.work.payrollLedgerByCommitment.clear();
    core.work.earnedPayPeriods.clear();
    core.work.earnedPayPeriodByCommitmentIndex.clear();
    core.work.payrollPeriodsByDue.clear();
    expect(core.work.totalsByJob.get("job")!.requestedMinor).toBe(unit);
    rejectsUnchanged(core, /enrolled actual earned ledger/);
    const { core: recognized } = due();
    recognized.work.payrollLedgerByCommitment.clear();
    recognized.work.payrollArrearsByDue.clear();
    rejectsUnchanged(recognized, /enrolled actual earned ledger/);
  });
  it("also rejects a lost zero-earned absence ledger, while genuine absence has neither earned nor overdue money", () => {
    const { core } = earned(half, false);
    expect(payrollStockObservables(core)).toMatchObject({
      earnedMinor: zero,
      dueRecognizedMinor: zero,
      paidMinor: zero,
      accruedMinor: zero,
      arrearsMinor: zero,
    });
    core.work.payrollLedgerByCommitment.clear();
    core.work.earnedPayPeriods.clear();
    core.work.earnedPayPeriodByCommitmentIndex.clear();
    core.work.payrollPeriodsByDue.clear();
    rejectsUnchanged(core, /enrolled actual earned ledger/);
  });
  it("rejects privately unadmitted replacements and either broken owning calendar link", () => {
    for (const tamper of [
      (core: CoreState) => {
        core.work.payrollCalendars.set(
          "calendar",
          Object.freeze({ ...core.work.payrollCalendars.get("calendar")! }),
        );
      },
      (core: CoreState) => {
        core.work.payrollCalendarByJob.delete("job");
      },
      (core: CoreState) => {
        core.work.payrollCalendarByCommitment.set("work", "foreign");
      },
    ]) {
      const { core } = earned();
      tamper(core);
      rejectsUnchanged(core, /admitted retained calendar/);
    }
  });
  it("rejects a jointly moved due record/index and altered inclusive period boundary that remain numerically coherent", () => {
    for (const tamper of [
      (core: CoreState, id: string) => {
        const period = core.work.earnedPayPeriods.get(id)!;
        core.work.earnedPayPeriods.set(id, { ...period, dueAt: "2021-01-09" });
        core.work.payrollPeriodsByDue.delete("2021-01-08");
        core.work.payrollPeriodsByDue.set("2021-01-09", new Set([id]));
      },
      (core: CoreState, id: string) => {
        const period = core.work.earnedPayPeriods.get(id)!;
        core.work.earnedPayPeriods.set(id, {
          ...period,
          throughAt: "2021-01-06",
        });
      },
    ]) {
      const { core, row } = earned();
      tamper(core, row.earnedPayPeriodId);
      rejectsUnchanged(core, /actual recorded payday period/);
    }
  });
  it("rejects a missing/foreign original period index and impossible cumulative cash while preserving the malformed graph", () => {
    for (const tamper of [
      (core: CoreState) => {
        core.work.earnedPayPeriodByCommitmentIndex.get("work")!.clear();
      },
      (core: CoreState) => {
        core.work.payrollPeriodsByDue.get("2021-01-08")!.add("nonexistent");
      },
      (core: CoreState) => {
        core.work.totalsByJob.get("job")!.paidMinor = unit + one;
      },
    ]) {
      const { core } = earned();
      tamper(core);
      rejectsUnchanged(core, /observer|Payroll stocks/);
    }
  });
  it("rejects missing/shifted/duplicated arrears retry indexes and foreign or spent zero-debt members", () => {
    for (const tamper of [
      (core: CoreState) => {
        core.work.payrollArrearsByDue.clear();
      },
      (core: CoreState) => {
        core.work.payrollArrearsByDue.clear();
        core.work.payrollArrearsByDue.set("2021-01-16", new Set(["work"]));
      },
      (core: CoreState) => {
        core.work.payrollArrearsByDue.set("2021-01-16", new Set(["work"]));
      },
      (core: CoreState) => {
        core.work.payrollArrearsByDue.get("2021-01-15")!.add("foreign-work");
      },
    ]) {
      const { core } = due();
      tamper(core);
      rejectsUnchanged(core, /retry/);
    }
    const { core } = earned(unit);
    advanceDate(core, "2021-01-08");
    settleWorkPayrollJournal(core, coreAPI(core), "work");
    core.work.payrollArrearsByDue.set("2021-01-15", new Set(["work"]));
    rejectsUnchanged(core, /spent, foreign or shifted/);
  });
  it("does not recognize a retry as new earnings or new original due; actual recorded zero-cash retry retains debt and its next date", () => {
    const { core } = due(),
      before = saved(core);
    advanceDate(core, "2021-01-15");
    const retry = settleWorkPayrollJournal(core, coreAPI(core), "work");
    expect(retry).toMatchObject({
      newlyDueMinor: zero,
      arrearsBeforeMinor: half,
      paidMinor: zero,
      arrearsAfterMinor: half,
    });
    expect(payrollStockObservables(core)).toMatchObject({
      earnedMinor: unit,
      dueRecognizedMinor: unit,
      paidMinor: half,
      accruedMinor: zero,
      arrearsMinor: half,
    });
    expect(core.work.payrollArrearsByDue.get("2021-01-22")!.has("work")).toBe(
      true,
    );
    expect(core.work.payrollArrearsByDue.has("2021-01-15")).toBe(false);
    expect(core.people.get("worker")!.liquidMinor).toBe(half);
    expect(before.work.totalsByJob.get("job")!.requestedMinor).toBe(
      core.work.totalsByJob.get("job")!.requestedMinor,
    );
  });
  it("rejects fake recognition markers and missing/uncompleted/foreign canonical cash sources without deriving cash from attendance", () => {
    for (const tamper of [
      (core: CoreState) => {
        const ledger = core.work.payrollLedgerByCommitment.get("work")!;
        core.work.payrollLedgerByCommitment.set("work", {
          ...ledger,
          lastSettledAt: "2021-01-09",
        });
      },
      (core: CoreState) => {
        core.work.payrollCashSources.clear();
      },
      (core: CoreState) => {
        const ledger = core.work.payrollLedgerByCommitment.get("work")!,
          row = core.work.payrollCashSources.get(ledger.lastPayrollReceiptId!)!;
        core.work.payrollCashSources.set(row.id, {
          ...row,
          postedJournalSequence: undefined,
          completedAt: undefined,
        });
      },
      (core: CoreState) => {
        const ledger = core.work.payrollLedgerByCommitment.get("work")!,
          row = core.work.payrollCashSources.get(ledger.lastPayrollReceiptId!)!;
        if (row.group === true)
          throw new Error("Fixture requires its actual single payday source.");
        core.work.payrollCashSources.set(row.id, {
          ...row,
          ledgerAfter: {
            ...row.ledgerAfter,
            arrearsMinor: row.ledgerAfter.arrearsMinor + one,
          },
        });
      },
    ]) {
      const { core } = due();
      tamper(core);
      rejectsUnchanged(
        core,
        /settlement marker|actual payday source|completed payday source/,
      );
    }
  });
  it("retains real payday arrears after actual exhausted-firm closure clears the current job, including later observer dates", () => {
    const { core, receipt } = due(true);
    coreAPI(core).closeEmployer(
      "employer",
      receipt.id,
      "controlled-real-missed-payday",
    );
    expect(core.people.get("worker")!.jobId).toBeUndefined();
    expect(core.jobs.get("job")!.endsAt).toBe("2021-01-08");
    advanceDate(core, "2021-01-10");
    const before = saved(core);
    expect(payrollStockObservables(core)).toMatchObject({
      earnedMinor: unit,
      dueRecognizedMinor: unit,
      paidMinor: half,
      accruedMinor: zero,
      arrearsMinor: half,
      legacyUnpaidMinor: zero,
    });
    expect(core.work.payrollArrearsByDue.get("2021-01-15")!.has("work")).toBe(
      true,
    );
    expect(saved(core)).toEqual(before);
  });
  it("keeps an actual unenrolled explicit legacy cash receipt and every original requested/paid/unpaid label", () => {
    const data = fixture(half);
    data.workPayrollCalendars = [];
    data.workCommitments = data.workCommitments!.map((row) => {
      const copy = { ...row };
      delete copy.payrollCalendarId;
      return copy;
    });
    const core = createCore(data, { modules: [LIFE_MODULE] });
    advanceDate(core, "2021-01-02");
    const { earnedMinor, ...row } = attendance(core),
      result = coreAPI(core).settleWorkResult({
        ...row,
        requestedMinor: earnedMinor,
      });
    expect(result).toMatchObject({
      requestedMinor: unit,
      paidMinor: half,
      shortfallMinor: half,
    });
    const before = saved(core);
    expect(payrollStockObservables(core)).toMatchObject({
      earnedMinor: unit,
      dueRecognizedMinor: unit,
      paidMinor: half,
      accruedMinor: zero,
      arrearsMinor: half,
      legacyUnpaidMinor: half,
      retainedPayrollLedgers: zero,
    });
    expect(financeObservables(core).wages).toMatchObject({
      requestedMinor: unit,
      paidMinor: half,
      unpaidMinor: half,
      legacyUnpaidMinor: half,
    });
    expect(saved(core)).toEqual(before);
  });
  it("rejects an owning identity accessor without invoking its getter or altering actual observations", () => {
    const { core } = earned(),
      original = saved(core),
      row = core.work.commitments.get("work")!;
    let calls = zero;
    Object.defineProperty(row, "payrollCalendarId", {
      configurable: true,
      get() {
        calls += one;
        throw new Error("getter must not run");
      },
    });
    expect(() => payrollStockObservables(core)).toThrow();
    expect(calls).toBe(zero);
    Object.defineProperty(row, "payrollCalendarId", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: "calendar",
    });
    expect(saved(core)).toEqual(original);
  });
});
