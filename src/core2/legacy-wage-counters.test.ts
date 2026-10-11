/** Actual canonical writers only; SOURCE-ONLY author has not executed these fixtures. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { daysBetween, makeIsoDate } from "../simulation/dates";
import { chooseAct, createLifeCore } from "./life";
import { parameter as p } from "./parameters";
import { coreAPI } from "./state";
import {
  ensureWorkCashModule,
  settleLegacyWorkResultJournal,
} from "./work-cash";
import { ensureFinanceCashModule } from "./finance-cash";
import { settleWorkPayrollJournal } from "./work-payroll-cash";
import { financeObservables } from "./tooling/finance-observables";
import { payrollStockObservables } from "./tooling/payroll-observables";
import { summarizeWorkObservables } from "./tooling/work-observables";
import type { CoreAPI, CoreInput, CoreState, Source } from "./types";
import type { LegacyWorkCashInput } from "./work-cash";
import type { CashJournalSourceRef } from "./journal";

const zero = p("zero"),
  one = p("one"),
  unit = p("minorPerDollar"),
  half = unit / p("two"),
  opening = "2021-01-01";
const source: Source = {
  tag: "SOURCED",
  asOf: "2020-12-01",
  citation:
    "Controlled supplied jobs, wages and capital; fixture evidence only.",
};
function fixture(
  cash = unit * (p("two") + one),
  wage = unit,
  scheduled = false,
) {
  const input: CoreInput = {
    seed: "actual-legacy-wage-counters",
    startedAt: opening,
    people: ["legacy", ...(scheduled ? ["scheduled"] : [])].map((id) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId: "place",
      householdId: "home:" + id,
      tier: "weekly",
      traits: {},
      liquidMinor: zero,
      livingCostDailyMinor: zero,
      familyIds: [],
      knownIds: [],
      jobId: "job:" + id,
      source,
    })),
    households: ["legacy", ...(scheduled ? ["scheduled"] : [])].map((id) => ({
      id: "home:" + id,
      placeId: "place",
      memberIds: [id],
      source,
    })),
    jobs: ["legacy", ...(scheduled ? ["scheduled"] : [])].map((id) => ({
      id: "job:" + id,
      personId: id,
      organizationId: "employer",
      title: "Actual supplied fixture job",
      hoursDaily: one,
      hourlyMinor: unit,
      wageDailyMinor: id === "legacy" ? wage : unit,
      source,
    })),
    organizations: [
      {
        id: "employer",
        placeId: "place",
        name: "Fixture employer",
        kind: "employer",
        liquidMinor: cash,
        source,
      },
    ],
    workCommitments: scheduled
      ? [
          {
            id: "scheduled-work",
            personId: "scheduled",
            jobId: "job:scheduled",
            organizationId: "employer",
            payrollCalendarId: "calendar",
            startsAt: opening,
            anchorDate: opening,
            periodDays: one,
            hourlyMinor: unit,
            expectedWeeklyMinutes: p("minutesPerHour") * p("daysPerWeek"),
            slots: [
              {
                offsetDays: zero,
                startMinute: zero,
                minutes: p("minutesPerHour"),
              },
            ],
            paySource: source,
            scheduleSource: source,
          },
        ]
      : [],
    workPayrollCalendars: scheduled
      ? [
          {
            id: "calendar",
            organizationId: "employer",
            workCommitmentIds: ["scheduled-work"],
            basisRecordIds: ["employer", "job:scheduled", "scheduled-work"],
            rule: "fixed-days-after-inclusive-period-end",
            periodDays: p("daysPerWeek"),
            firstPeriodStartsAt: opening,
            firstPaydayAt: "2021-01-08",
            effectiveFrom: opening,
            arrearsRule: "carry-to-next-recorded-payday",
            nonbusinessDayRule: "no-adjustment",
            source,
          },
        ]
      : [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const original = structuredClone(input),
    core = createLifeCore(input, { observer: false, scheduledWork: scheduled }),
    api = coreAPI(core);
  ensureWorkCashModule(core);
  ensureFinanceCashModule(core);
  return { input, original, core, api };
}
function legacyInput(
  core: CoreState,
  personId = "legacy",
): LegacyWorkCashInput {
  const offer = {
    definition: core.data.actions.find((row) => row.effect === "paid-work")!,
    targetId: "job:" + personId,
    availableHours: p("hoursPerDay"),
    effortHours: one,
  };
  const decision = chooseAct(core, personId, [offer]);
  expect(decision.selected).toBe(offer);
  return {
    personId,
    offer,
    decision,
    date: core.date,
    days: daysBetween(
      makeIsoDate(core.people.get(personId)!.lastActDate),
      makeIsoDate(core.date),
    ),
  };
}
function saved(core: CoreState) {
  return structuredClone({
    people: core.people,
    jobs: core.jobs,
    organizations: core.organizations,
    work: core.work,
    finance: core.finance,
    durableLog: core.durableLog,
    eventIds: core.eventIds,
    actCounters: core.actCounters,
    journal: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
  });
}
function betweenLookups(core: CoreState, mutate: () => void) {
  const original = coreAPI(core),
    providers = core.cashJournal.sourceProviders;
  let calls = zero;
  const execute = <T>(
    reference: CashJournalSourceRef,
    complete: () => T,
  ): T => {
    const provider = providers.get(reference.kind)!;
    providers.set(reference.kind, (ref) => {
      const slot = provider(ref);
      calls += one;
      if (calls === one) mutate();
      return slot;
    });
    try {
      return complete();
    } finally {
      providers.set(reference.kind, provider);
    }
  };
  const api: CoreAPI = {
    ...original,
    postJournal(input) {
      return execute(input.sourceRef, () => original.postJournal(input));
    },
    completeJournalSource(reference) {
      return execute(reference, () =>
        original.completeJournalSource(reference),
      );
    },
  };
  return { api, calls: () => calls };
}

describe("actual legacy discretionary wage counters (SOURCE_ONLY, UNEXECUTED)", () => {
  it("counts distinct actual completions beyond quiet prior-source pruning, not latest rows", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-02");
    const first = f.api.settleLegacyWorkResult(legacyInput(f.core));
    advanceDate(f.core, "2021-01-03");
    const second = f.api.settleLegacyWorkResult(legacyInput(f.core));
    expect(second.id).not.toBe(first.id);
    expect(f.core.work.latestLegacyCashResultByPerson.get("legacy")!.id).toBe(
      second.id,
    );
    expect(f.core.work.cashSources.has(first.id)).toBe(false);
    expect(f.core.work.totalsByJob.size).toBe(zero);
    expect(f.core.work.legacyDiscretionaryWages).toEqual({
      earnedMinor: unit * p("two"),
      paidMinor: unit * p("two"),
      shortfallMinor: zero,
      completedReceiptCount: p("two"),
    });
    expect(f.core.people.get("legacy")!.liquidMinor).toBe(unit * p("two"));
    expect(f.core.organizations.get("employer")!.liquidMinor).toBe(unit);
    expect(f.core.cashJournal.nextSequence).toBe(p("two"));
    const before = saved(f.core),
      stocks = payrollStockObservables(f.core),
      finance = financeObservables(f.core).wages,
      work = summarizeWorkObservables(f.input, f.core).money;
    for (const observation of [stocks, finance, work]) {
      expect(observation).toMatchObject({
        earnedMinor: unit * p("two"),
        dueRecognizedMinor: unit * p("two"),
        paidMinor: unit * p("two"),
        accruedMinor: zero,
        arrearsMinor: zero,
        legacyDiscretionaryCompletedReceiptCount: p("two"),
      });
    }
    expect(finance.requestedMinor).toBe(unit * p("two"));
    expect(work.requestedMinor).toBe(unit * p("two"));
    expect(saved(f.core)).toEqual(before);
    expect(f.input).toEqual(f.original);
  });
  it("distinguishes unretried discretionary shortfall from scheduled arrears and preserves real cash", () => {
    const f = fixture(half);
    advanceDate(f.core, "2021-01-02");
    const receipt = f.api.settleLegacyWorkResult(legacyInput(f.core));
    expect(receipt).toMatchObject({
      requestedMinor: unit,
      paidMinor: half,
      shortfallMinor: half,
    });
    expect(f.core.work.legacyDiscretionaryWages).toEqual({
      earnedMinor: unit,
      paidMinor: half,
      shortfallMinor: half,
      completedReceiptCount: one,
    });
    expect(payrollStockObservables(f.core)).toMatchObject({
      earnedMinor: unit,
      dueRecognizedMinor: unit,
      paidMinor: half,
      accruedMinor: zero,
      arrearsMinor: zero,
      legacyDiscretionaryShortfallMinor: half,
    });
    expect(financeObservables(f.core).wages.unpaidMinor).toBe(half);
    expect(f.core.work.payrollArrearsByDue.size).toBe(zero);
    expect(f.core.people.get("legacy")!.liquidMinor).toBe(half);
    expect(f.core.organizations.get("employer")!.liquidMinor).toBe(zero);
    const before = saved(f.core);
    expect(() => f.api.settleLegacyWorkResult(legacyInput(f.core))).toThrow(
      /positive elapsed days/,
    );
    expect(saved(f.core)).toEqual(before);
  });
  it("counts zero-line completion once without inventing a journal or payment", () => {
    const f = fixture(zero, zero);
    advanceDate(f.core, "2021-01-02");
    const hook = betweenLookups(f.core, () => undefined),
      result = settleLegacyWorkResultJournal(
        f.core,
        hook.api,
        legacyInput(f.core),
      );
    expect(hook.calls()).toBe(p("two"));
    expect(result).toMatchObject({
      requestedMinor: zero,
      paidMinor: zero,
      shortfallMinor: zero,
    });
    expect(f.core.work.legacyDiscretionaryWages).toEqual({
      earnedMinor: zero,
      paidMinor: zero,
      shortfallMinor: zero,
      completedReceiptCount: one,
    });
    expect(f.core.work.cashSources.get(result.id)!.completedAt).toBe(
      f.core.date,
    );
    expect(
      f.core.work.cashSources.get(result.id)!.postedJournalSequence,
    ).toBeUndefined();
    expect(f.core.cashJournal.nextSequence).toBe(zero);
    const before = saved(f.core);
    expect(() => f.api.settleLegacyWorkResult(legacyInput(f.core))).toThrow();
    expect(saved(f.core)).toEqual(before);
  });
  it("combines scheduled accrual and retained retry with discretionary counters exactly once", () => {
    const f = fixture(half, unit, true);
    advanceDate(f.core, "2021-01-02");
    f.api.settleLegacyWorkResult(legacyInput(f.core));
    const cfg = f.core.data.work!,
      offer = {
        definition: cfg.attendanceAction,
        targetId: "scheduled-work",
        availableHours:
          p("hoursPerDay") - f.api.parameter(cfg.sleepReserveParameter),
        effortHours: one,
      },
      decision = chooseAct(f.core, "scheduled", [offer]);
    f.api.recordWorkAttendance({
      id: `work-result:${f.core.date}:scheduled-work`,
      date: f.core.date,
      commitmentId: "scheduled-work",
      jobId: "job:scheduled",
      personId: "scheduled",
      organizationId: "employer",
      plannedMinutes: p("minutesPerHour"),
      attendedMinutes: p("minutesPerHour"),
      absentMinutes: zero,
      earnedMinor: unit,
      payRemainderMinor: zero,
      decision,
      reasonKey: decision.reasonKey,
      source: { ...source, asOf: f.core.date },
    });
    expect(f.core.work.totalsByJob.size).toBe(one);
    expect(payrollStockObservables(f.core)).toMatchObject({
      earnedMinor: unit * p("two"),
      dueRecognizedMinor: unit,
      paidMinor: half,
      accruedMinor: unit,
      arrearsMinor: zero,
      legacyDiscretionaryCompletedReceiptCount: one,
      legacyDiscretionaryShortfallMinor: half,
    });
    advanceDate(f.core, "2021-01-08");
    settleWorkPayrollJournal(f.core, f.api, "scheduled-work");
    advanceDate(f.core, "2021-01-15");
    const retry = settleWorkPayrollJournal(f.core, f.api, "scheduled-work");
    expect(retry.newlyDueMinor).toBe(zero);
    expect(payrollStockObservables(f.core)).toMatchObject({
      earnedMinor: unit * p("two"),
      dueRecognizedMinor: unit * p("two"),
      paidMinor: half,
      accruedMinor: zero,
      arrearsMinor: unit,
      legacyDiscretionaryShortfallMinor: half,
      legacyDiscretionaryCompletedReceiptCount: one,
    });
    const before = saved(f.core);
    expect(() =>
      f.api.settleLegacyWorkResult(legacyInput(f.core, "scheduled")),
    ).toThrow(/accrual-enrolled/);
    expect(saved(f.core)).toEqual(before);
    expect(f.input).toEqual(f.original);
  });
  it.each([false, true])(
    "rejects counter replacement between both provider lookups atomically (%s zero)",
    (zeroPay) => {
      const f = fixture(unit, zeroPay ? zero : unit);
      advanceDate(f.core, "2021-01-02");
      const input = legacyInput(f.core),
        before = saved(f.core),
        replacement = {
          earnedMinor: unit,
          paidMinor: zero,
          shortfallMinor: unit,
          completedReceiptCount: one,
        },
        hook = betweenLookups(f.core, () => {
          f.core.work.legacyDiscretionaryWages = replacement;
        });
      expect(() =>
        settleLegacyWorkResultJournal(f.core, hook.api, input),
      ).toThrow();
      before.work.legacyDiscretionaryWages = replacement;
      expect(saved(f.core)).toEqual(before);
      expect(f.core.cashJournal.nextSequence).toBe(zero);
    },
  );
  it.each([
    {
      earnedMinor: -one,
      paidMinor: zero,
      shortfallMinor: zero,
      completedReceiptCount: zero,
    },
    {
      earnedMinor: one,
      paidMinor: zero,
      shortfallMinor: zero,
      completedReceiptCount: one,
    },
    {
      earnedMinor: one,
      paidMinor: zero,
      shortfallMinor: one,
      completedReceiptCount: zero,
    },
    {
      earnedMinor: zero,
      paidMinor: zero,
      shortfallMinor: zero,
      completedReceiptCount: one / p("two"),
    },
    {
      earnedMinor: zero,
      paidMinor: zero,
      shortfallMinor: zero,
      completedReceiptCount: Number.NaN,
    },
  ])(
    "rejects malformed/coordinated-incoherent counters without effects (%o)",
    (totals) => {
      const f = fixture();
      advanceDate(f.core, "2021-01-02");
      f.core.work.legacyDiscretionaryWages = totals;
      const input = legacyInput(f.core),
        before = saved(f.core);
      expect(() => f.api.settleLegacyWorkResult(input)).toThrow(
        /legacy discretionary wage counters/,
      );
      expect(() => payrollStockObservables(f.core)).toThrow(
        /legacy discretionary wage counters/,
      );
      expect(saved(f.core)).toEqual(before);
    },
  );
  it("rejects a missing canonical counter record instead of inventing zero wages", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-02");
    Reflect.deleteProperty(f.core.work, "legacyDiscretionaryWages");
    const input = legacyInput(f.core),
      before = saved(f.core);
    expect(() => f.api.settleLegacyWorkResult(input)).toThrow(
      /Missing canonical legacy/,
    );
    expect(() => payrollStockObservables(f.core)).toThrow(
      /Missing canonical legacy/,
    );
    expect(saved(f.core)).toEqual(before);
  });
  it("rejects a counter accessor without invoking it or changing state", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-02");
    const input = legacyInput(f.core),
      before = saved(f.core),
      original = f.core.work.legacyDiscretionaryWages;
    let calls = zero;
    f.core.work.legacyDiscretionaryWages = { ...original };
    Object.defineProperty(f.core.work.legacyDiscretionaryWages, "earnedMinor", {
      get() {
        calls += one;
        throw new Error("must not invoke");
      },
      enumerable: true,
    });
    expect(() => f.api.settleLegacyWorkResult(input)).toThrow();
    expect(() => payrollStockObservables(f.core)).toThrow();
    expect(calls).toBe(zero);
    f.core.work.legacyDiscretionaryWages = original;
    expect(saved(f.core)).toEqual(before);
  });
  it("rejects receipt-count overflow before cash or actor commit", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-02");
    f.core.work.legacyDiscretionaryWages = {
      earnedMinor: zero,
      paidMinor: zero,
      shortfallMinor: zero,
      completedReceiptCount: Number.MAX_SAFE_INTEGER,
    };
    const input = legacyInput(f.core),
      before = saved(f.core);
    expect(() => f.api.settleLegacyWorkResult(input)).toThrow(/overflow/);
    expect(saved(f.core)).toEqual(before);
  });
  it("rejects a nonworker-owned job target instead of measuring another cash role", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-02");
    const input = legacyInput(f.core),
      actor = f.core.people.get("legacy")!;
    delete actor.jobId;
    const before = saved(f.core);
    expect(() => f.api.settleLegacyWorkResult(input)).toThrow(/owned job/);
    expect(saved(f.core)).toEqual(before);
  });
});
