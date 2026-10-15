/** Controlled owning graphs only. Author has not executed these cases. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { createLifeCore, chooseAct } from "./life";
import { coreAPI, createCore } from "./state";
import {
  runScheduledWork,
  WORK_MODULE,
  plannedWorkMinutesOnDate,
} from "./modules/work";
import { LIFE_MODULE } from "./modules/life";
import { carryTraitScores } from "./choice";
import { admittedWorkPayrollCalendarMatches } from "./work-attendance";
import { validateDatedWorkResult } from "./work-state";
import { ensureWorkCashModule } from "./work-cash";
import { ensureFinanceCashModule } from "./finance-cash";
import { parameter as p } from "./parameters";
import {
  registerControlledPersonV1,
  retireControlledPersonV1,
} from "./player-control-state-v1";
import type {
  CoreAPI,
  CoreInput,
  CoreState,
  Source,
  WorkAttendanceInput,
  WorkResultInput,
} from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";

const source: Source = {
  tag: "SOURCED",
  asOf: "2020-12-01",
  citation:
    "Controlled independently saved worker, job, schedule and employer pay-calendar fixture; not ordinary-town evidence.",
};
function fixture(minutes = p("minutesPerHour")): CoreInput {
  const calendar: WorkPayrollCalendarInput = {
    id: "recorded-pay-calendar",
    organizationId: "employer",
    workCommitmentIds: ["work"],
    basisRecordIds: ["employer", "job", "work"],
    rule: "fixed-days-after-inclusive-period-end",
    firstPeriodStartsAt: "2021-01-01",
    periodDays: p("daysPerWeek"),
    firstPaydayAt: "2021-01-08",
    effectiveFrom: "2021-01-01",
    nonbusinessDayRule: "no-adjustment",
    arrearsRule: "carry-to-next-recorded-payday",
    source,
  };
  return {
    seed: "controlled-attendance-accrual",
    startedAt: "2021-01-01",
    people: [
      {
        id: "worker",
        givenName: "Controlled",
        familyName: "Worker",
        birthDate: "1980-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("zero"),
        source,
        familyIds: [],
        knownIds: [],
        jobId: "job",
      },
    ],
    households: [
      { id: "home", placeId: "place", memberIds: ["worker"], source },
    ],
    organizations: [
      {
        id: "employer",
        placeId: "place",
        name: "Controlled employer",
        kind: "employer",
        liquidMinor: p("zero"),
        source,
      },
    ],
    jobs: [
      {
        id: "job",
        personId: "worker",
        organizationId: "employer",
        title: "Actual saved fixture job",
        hoursDaily: p("one"),
        hourlyMinor: 1001,
        wageDailyMinor: 1001,
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
        periodDays: p("one"),
        expectedWeeklyMinutes: minutes * p("daysPerWeek"),
        hourlyMinor: 1001,
        slots: [{ offsetDays: p("zero"), startMinute: p("zero"), minutes }],
        paySource: source,
        scheduleSource: source,
      },
    ],
    workPayrollCalendars: [calendar],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function money(core: CoreState) {
  return structuredClone({
    organizations: core.organizations,
    residentCash: [...core.people].map(([id, row]) => [id, row.liquidMinor]),
    finance: core.finance,
    cash: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
    cashSources: core.work.cashSources,
    cashSelections: core.work.cashActSelections,
    legacy: core.work.latestLegacyCashResultByPerson,
    oldResults: core.work.lastResultByJob,
  });
}
function saved(core: CoreState) {
  return structuredClone({
    people: core.people,
    work: core.work,
    acts: core.actCounters,
    monthActs: core.actsByMonthKind,
    monthIndex: core.actCountersByMonth,
    knowledge: core.knowledgeByPerson,
    logs: core.durableLog,
    byPerson: core.logByPerson,
    byKind: core.logByKind,
    byPlace: core.logByPlace,
    money: money(core),
  });
}
function input(core: CoreState, attended = true): WorkAttendanceInput {
  const row = core.work.commitments.get("work")!,
    cfg = core.data.work!,
    action = attended ? cfg.attendanceAction : cfg.absenceAction,
    offer = {
      definition: action,
      targetId: row.id,
      availableHours: p("hoursPerDay") - p(cfg.sleepReserveParameter),
      effortHours: attended
        ? row.slots[p("zero")]!.minutes / p("minutesPerHour")
        : p("zero"),
    },
    decision = chooseAct(core, "worker", [offer]),
    planned = row.slots[p("zero")]!.minutes,
    minutes = attended ? planned : p("zero"),
    previous = core.work.lastAttendanceByJob.get("job"),
    exact =
      (previous?.payRemainderMinor ?? p("zero")) +
      (row.hourlyMinor * minutes) / p("minutesPerHour"),
    earned = Math.floor(exact);
  return {
    id: "work-result:" + core.date + ":work",
    commitmentId: "work",
    jobId: "job",
    personId: "worker",
    organizationId: "employer",
    date: core.date,
    plannedMinutes: planned,
    attendedMinutes: minutes,
    absentMinutes: planned - minutes,
    earnedMinor: earned,
    payRemainderMinor: exact - earned,
    reasonKey: decision.reasonKey,
    decision,
    source: { ...source, asOf: core.date },
  };
}
function fresh(minutes?: number, focused = false) {
  const data = fixture(minutes);
  if (focused) data.focusPersonIds = ["worker"];
  const core = createLifeCore(data);
  advanceDate(core, "2021-01-02");
  return core;
}

describe("source-only proposed light attendance and payroll accrual", () => {
  it("commits actual earned/time/choice once at zero-stock employer without journal, credit or overdue shortfall", () => {
    const core = fresh(),
      api = coreAPI(core),
      beforeMoney = money(core),
      oldActor = core.people.get("worker")!,
      receipt = api.recordWorkAttendance(input(core));
    expect(receipt.earnedMinor).toBe(1001);
    expect(receipt).not.toHaveProperty("paidMinor");
    expect(receipt).not.toHaveProperty("shortfallMinor");
    expect(receipt).not.toHaveProperty("payerCashBeforeMinor");
    expect(money(core)).toEqual(beforeMoney);
    const ledger = core.work.payrollLedgerByCommitment.get("work")!;
    expect(ledger).toMatchObject({
      earnedMinor: 1001,
      accruedMinor: 1001,
      dueRecognizedMinor: 0,
      paidMinor: 0,
      arrearsMinor: 0,
    });
    expect(core.work.totalsByJob.get("job")).toMatchObject({
      requestedMinor: 1001,
      paidMinor: 0,
      workedDays: 1,
      missedDays: 0,
    });
    expect(core.work.timeByPerson.get("worker")!.workMinutes).toBe(
      p("minutesPerHour"),
    );
    expect(core.work.lastAttendanceByJob.get("job")!.decision).toBeUndefined();
    expect(core.work.detailedAttendance.size).toBe(p("zero"));
    const newActor = core.people.get("worker")!;
    expect(newActor).not.toBe(oldActor);
    expect(newActor.actCount).toBe(oldActor.actCount + p("one"));
    for (const key of [
      "traits",
      "goals",
      "drives",
      "needs",
      "affect",
      "source",
      "knownIds",
      "familyIds",
    ] as const)
      expect(newActor[key]).toBe(oldActor[key]);
    const after = saved(core);
    expect(() => api.recordWorkAttendance(input(core))).toThrow();
    expect(saved(core)).toEqual(after);
  });
  it("normal WORK exclusively notifies attendance hooks and never falls back to per-shift cash", () => {
    const core = fresh(),
      api = coreAPI(core),
      beforeMoney = money(core);
    let calls = 0;
    core.modules.set("controlled-consumer", {
      id: "controlled-consumer",
      onWorkAttendance(_api, row) {
        expect(row.earnedMinor).toBe(1001);
        calls++;
      },
      onWorkResult() {
        throw new Error("No shift cash receipt may be emitted.");
      },
    });
    runScheduledWork(
      api,
      (id, offers) =>
        chooseAct(
          core,
          id,
          offers.filter(
            (row) =>
              row.definition.effect === core.data.work!.attendanceAction.effect,
          ),
        ),
      () => undefined,
    );
    expect(calls).toBe(p("one"));
    expect(money(core)).toEqual(beforeMoney);
  });
  it("absence earns zero and records actual missed/time counts without declaring cash unpaid", () => {
    const core = fresh(),
      beforeMoney = money(core),
      receipt = coreAPI(core).recordWorkAttendance(input(core, false));
    expect(receipt.earnedMinor).toBe(p("zero"));
    expect(core.work.totalsByJob.get("job")).toMatchObject({
      workedDays: 0,
      missedDays: 1,
      requestedMinor: 0,
      paidMinor: 0,
    });
    expect(core.work.payrollLedgerByCommitment.get("work")!.arrearsMinor).toBe(
      p("zero"),
    );
    expect(money(core)).toEqual(beforeMoney);
  });
  it("keeps hourly fractional carry across dated one-minute attendance, with unchanged actual payday and no payment", () => {
    const core = fresh(p("one")),
      beforeMoney = money(core),
      api = coreAPI(core);
    let earned = p("zero"),
      carry = p("zero");
    const dates = ["2021-01-02", "2021-01-03", "2021-01-04"];
    for (const date of dates) {
      if (core.date !== date) advanceDate(core, date);
      const row = api.recordWorkAttendance(input(core));
      earned += row.earnedMinor;
      carry = row.payRemainderMinor;
    }
    const exact = (1001 * dates.length) / p("minutesPerHour");
    expect(earned).toBe(Math.floor(exact));
    expect(carry).toBeCloseTo(exact - earned);
    expect(core.work.payrollLedgerByCommitment.get("work")!.accruedMinor).toBe(
      earned,
    );
    expect([...core.work.earnedPayPeriods.values()][p("zero")]!.dueAt).toBe(
      "2021-01-08",
    );
    expect(money(core)).toEqual(beforeMoney);
  });
  it("retains full detached focused decision/knowledge/trace, preserving existing known facts", () => {
    const core = fresh(undefined, true),
      api = coreAPI(core),
      provided = input(core),
      beforeKnown = new Map(core.knowledgeByPerson.get("worker")),
      receipt = api.recordWorkAttendance(provided);
    expect(receipt.decision).toEqual(provided.decision);
    expect(receipt.decision).not.toBe(provided.decision);
    expect(core.work.detailedAttendance.get(receipt.id)!.decision).toEqual(
      provided.decision,
    );
    expect(core.durableLog.get(receipt.sourceActId)!.decision).toEqual(
      provided.decision,
    );
    for (const [id, fact] of beforeKnown)
      expect(core.knowledgeByPerson.get("worker")!.get(id)).toEqual(fact);
    expect(
      core.knowledgeByPerson
        .get("worker")!
        .get("job:job:latest-work-attendance")!.value,
    ).toContain("earnedMinor");
    expect(Object.isFrozen(receipt)).toBe(true);
  });
  it("rejects wrong amount, carry, minutes, selected action and future job Source before all modeled effects", () => {
    for (const mutate of [
      (row: WorkAttendanceInput) => {
        row.earnedMinor++;
      },
      (row: WorkAttendanceInput) => {
        row.payRemainderMinor += p("one");
      },
      (row: WorkAttendanceInput) => {
        row.attendedMinutes /= p("two");
        row.absentMinutes = row.plannedMinutes - row.attendedMinutes;
      },
      (row: WorkAttendanceInput) => {
        row.decision = {
          ...row.decision!,
          selected: {
            ...row.decision!.selected!,
            definition: {
              ...row.decision!.selected!.definition,
              id: "invented-action",
            },
          },
        };
      },
    ]) {
      const core = fresh(),
        row = input(core);
      mutate(row);
      const before = saved(core);
      expect(() => coreAPI(core).recordWorkAttendance(row)).toThrow();
      expect(saved(core)).toEqual(before);
    }
    const core = fresh();
    core.jobs.get("job")!.source = { ...source, asOf: "2021-01-03" };
    const before = saved(core);
    expect(() => coreAPI(core).recordWorkAttendance(input(core))).toThrow();
    expect(saved(core)).toEqual(before);
  });
  it("rejects getter fields without executing them, and proxy get/late ownKeys traps without partial work or cash", () => {
    {
      const core = fresh(),
        row = input(core),
        before = saved(core);
      let gets = 0;
      Object.defineProperty(row, "earnedMinor", {
        get() {
          gets++;
          throw new Error("getter");
        },
      });
      expect(() => coreAPI(core).recordWorkAttendance(row)).toThrow();
      expect(gets).toBe(p("zero"));
      expect(saved(core)).toEqual(before);
    }
    {
      const core = fresh(),
        row = input(core),
        before = saved(core);
      let gets = 0;
      const proxy = new Proxy(row, {
        get() {
          gets++;
          throw new Error("raw get");
        },
      });
      const receipt = coreAPI(core).recordWorkAttendance(proxy);
      expect(receipt.earnedMinor).toBe(1001);
      expect(gets).toBe(p("zero"));
      expect(money(core)).toEqual(before.money);
    }
    {
      const core = fresh(),
        row = input(core),
        before = saved(core);
      let keys = 0;
      const proxy = new Proxy(row, {
        ownKeys(target) {
          keys++;
          if (keys > p("one")) throw new Error("late original preflight");
          return Reflect.ownKeys(target);
        },
      });
      expect(() => coreAPI(core).recordWorkAttendance(proxy)).toThrow(
        /late original preflight/,
      );
      expect(saved(core)).toEqual(before);
    }
  });
  it("rejects replaced native ownership tables, missing calendar evidence and contradictory period indexes without effects", () => {
    {
      const core = fresh(),
        calendar = core.work.payrollCalendars.get("recorded-pay-calendar")!,
        copy = structuredClone(calendar);
      Object.freeze(copy);
      expect(admittedWorkPayrollCalendarMatches(core, calendar.id, copy)).toBe(
        false,
      );
      core.work.payrollCalendars.set(calendar.id, copy);
      const before = saved(core);
      expect(() => coreAPI(core).recordWorkAttendance(input(core))).toThrow(
        /payroll calendar/,
      );
      expect(saved(core)).toEqual(before);
    }
    {
      const core = fresh(),
        original = core.work.payrollLedgerByCommitment;
      core.work.payrollLedgerByCommitment = new Map();
      const before = saved(core);
      expect(() => coreAPI(core).recordWorkAttendance(input(core))).toThrow(
        /table was replaced/,
      );
      expect(saved(core)).toEqual(before);
      core.work.payrollLedgerByCommitment = original;
    }
    {
      const f = fixture();
      f.workPayrollCalendars = [];
      expect(() => createLifeCore(f)).toThrow(/supplied payroll calendar link/);
      const core = createCore(f, { modules: [LIFE_MODULE, WORK_MODULE] });
      advanceDate(core, "2021-01-02");
      const before = saved(core);
      expect(() => coreAPI(core).recordWorkAttendance(input(core))).toThrow(
        /payroll calendar/,
      );
      expect(saved(core)).toEqual(before);
    }
    {
      const core = fresh(),
        api = coreAPI(core);
      api.recordWorkAttendance(input(core));
      advanceDate(core, "2021-01-03");
      core.work.earnedPayPeriodByCommitmentIndex.get("work")!.clear();
      const before = saved(core);
      expect(() => api.recordWorkAttendance(input(core))).toThrow(
        /index ownership/,
      );
      expect(saved(core)).toEqual(before);
    }
  });
  it("keeps direct original cash APIs guarded and rejects accrual-enrolled jobs instead of double paying", () => {
    const core = fresh(),
      api = coreAPI(core),
      row = input(core),
      legacy = { ...row, requestedMinor: row.earnedMinor } as WorkResultInput;
    // Existing cash APIs install their owning providers before preparation; prime that original registration separately.
    ensureWorkCashModule(core);
    ensureFinanceCashModule(core);
    const before = saved(core);
    expect(() => api.settleWorkResult(legacy)).toThrow(/per-shift cash/);
    expect(saved(core)).toEqual(before);
  });
  it("admits only independently sourced actual calendars, rejecting unsupported basis and undated evidence without mutations", () => {
    const f = fixture(),
      calendar = f.workPayrollCalendars![p("zero")]!;
    f.workPayrollCalendars = [];
    const core = createCore(f, { modules: [LIFE_MODULE, WORK_MODULE] }),
      api = coreAPI(core),
      before = saved(core);
    for (const wrong of [
      { ...calendar, basisRecordIds: ["unsupported-agreement"] },
      { ...calendar, source: { ...source, asOf: undefined } },
      { ...calendar, workCommitmentIds: ["absent-commitment"] },
      { ...calendar, firstPaydayAt: "2021-01-06" },
    ]) {
      expect(() =>
        api.addWorkPayrollCalendar(
          wrong as unknown as WorkPayrollCalendarInput,
        ),
      ).toThrow();
      expect(saved(core)).toEqual(before);
    }
    api.addWorkPayrollCalendar(calendar);
    expect(core.work.payrollCalendarByCommitment.get("work")).toBe(calendar.id);
    const actual = core.work.payrollCalendars.get(calendar.id)!;
    expect(admittedWorkPayrollCalendarMatches(core, calendar.id, actual)).toBe(
      true,
    );
    expect(actual).not.toBe(calendar);
    expect(Object.isFrozen(actual)).toBe(true);
    expect(Object.isFrozen(actual.source)).toBe(true);
    const enrolled = saved(core);
    expect(() => api.addWorkPayrollCalendar(calendar)).toThrow();
    expect(saved(core)).toEqual(enrolled);
  });
  it("preserves cached utility only for the identical traits object across actor replacement", () => {
    const core = fresh(),
      actor = core.people.get("worker")!;
    let reads = 0;
    Object.defineProperty(actor.traits, "fixture-trait", {
      get() {
        reads++;
        return p("one");
      },
      enumerable: true,
    });
    const row = input(core);
    expect(reads).toBeGreaterThan(p("zero"));
    reads = p("zero");
    coreAPI(core).recordWorkAttendance(row);
    input(core);
    expect(reads).toBe(p("zero"));
    expect(() =>
      carryTraitScores(actor, { ...actor, traits: { ...actor.traits } }),
    ).toThrow(/unchanged traits/);
  });
});

// Caller-visible results must not permit corruption of retained evidence.
it.each([false, true])(
  "returns immutable attendance for focus=%s without exposing writable evidence",
  (focused) => {
    const core = fresh(undefined, focused),
      receipt = coreAPI(core).recordWorkAttendance(input(core));
    const stored = core.work.lastAttendanceByJob.get("job")!;
    expect(receipt).toBe(stored);
    expect(Reflect.set(receipt, "earnedMinor", p("zero"))).toBe(false);
    expect(
      Reflect.set(receipt.source, "citation", "corrupted caller evidence"),
    ).toBe(false);
    expect(stored.earnedMinor).toBe(1001);
    if (focused) {
      expect(receipt.decision).toBeDefined();
      expect(
        Reflect.set(receipt.decision!, "reasonKey", "corrupted caller reason"),
      ).toBe(false);
    }
    expect(core.work.payrollLedgerByCommitment.get("work")!.earnedMinor).toBe(
      1001,
    );
  },
);

/** Additive A counterexamples. Existing assertions above are unchanged. */
describe("selective attendance validation retains actual authority and atomicity", () => {
  it("ignores unused quiet validation metadata without invoking its getters or changing outcomes", () => {
    const baseline = fresh(),
      core = fresh(),
      api = coreAPI(core);
    const originalPolicy = core.data.work!;
    core.data = {
      ...core.data,
      work: {
        ...originalPolicy,
        attendanceAction: { ...originalPolicy.attendanceAction },
        absenceAction: { ...originalPolicy.absenceAction },
      },
    };
    const provided = input(core),
      row = core.work.commitments.get("work")!,
      job = core.jobs.get("job")!,
      policy = core.data.work!;
    let gets = p("zero");
    const restores: (() => void)[] = [];
    const poison = (target: object, key: string) => {
      const descriptor = Object.getOwnPropertyDescriptor(target, key)!;
      restores.push(() => Object.defineProperty(target, key, descriptor));
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
          gets++;
          throw new Error("Unused attendance metadata was read: " + key);
        },
      });
    };
    poison(row, "expectedWeeklyMinutes");
    poison(job, "title");
    poison(policy, "patterns");
    poison(policy.attendanceAction, "goalKinds");
    poison(provided.decision!, "scores");
    let receipt: ReturnType<CoreAPI["recordWorkAttendance"]> | undefined;
    try {
      receipt = api.recordWorkAttendance(provided);
    } finally {
      for (const restore of restores.reverse()) restore();
    }
    const expected = coreAPI(baseline).recordWorkAttendance(input(baseline));
    expect(gets).toBe(p("zero"));
    expect(receipt).toEqual(expected);
    expect(saved(core)).toEqual(saved(baseline));
  });

  it("preserves every unrelated actor field/reference while replacing the actual actor", () => {
    const core = fresh(),
      api = coreAPI(core),
      actor = core.people.get("worker")!,
      annotation = { ownerRecordId: "worker" };
    Object.defineProperty(actor, "fixturePrivateAnnotation", {
      value: annotation,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    actor.said = ["Already recorded statement"];
    const beforeSaid = actor.said,
      beforeSource = actor.source,
      beforeNeeds = actor.needs;
    api.recordWorkAttendance(input(core));
    const current = core.people.get("worker")!;
    expect(current).not.toBe(actor);
    expect(current.said).toBe(beforeSaid);
    expect(current.source).toBe(beforeSource);
    expect(current.needs).toBe(beforeNeeds);
    expect(
      Object.getOwnPropertyDescriptor(current, "fixturePrivateAnnotation"),
    ).toMatchObject({ value: annotation, enumerable: false });
    expect(
      Object.getOwnPropertyDescriptor(actor, "fixturePrivateAnnotation")!.value,
    ).toBe(annotation);
  });

  it("rejects a late unrelated actor replacement instead of losing that update", () => {
    const core = fresh(),
      api = coreAPI(core),
      actor = core.people.get("worker")!;
    actor.said = ["First owned actor preimage"];
    const originalSaid = actor.said,
      provided = input(core),
      before = saved(core);
    let changed = false;
    provided.source = new Proxy(provided.source, {
      ownKeys(target) {
        if (!changed) {
          changed = true;
          actor.said = ["Late actor update"];
        }
        return Reflect.ownKeys(target);
      },
    });
    expect(() => api.recordWorkAttendance(provided)).toThrow(/stale/i);
    expect(core.people.get("worker")).toBe(actor);
    expect(actor.said).toEqual(["Late actor update"]);
    actor.said = originalSaid;
    expect(saved(core)).toEqual(before);
  });

  it("keeps full owning pay Source metadata guarded even when it does not change the amount", () => {
    const core = fresh(),
      api = coreAPI(core),
      row = core.work.commitments.get("work")!;
    const evidence = { recordId: "work", note: "Original owning pay evidence" };
    row.paySource = { ...row.paySource, fixtureEvidence: evidence } as Source;
    const provided = input(core),
      before = saved(core);
    let changed = false;
    provided.source = new Proxy(provided.source, {
      ownKeys(target) {
        if (!changed) {
          changed = true;
          evidence.note = "Replaced owning pay evidence";
        }
        return Reflect.ownKeys(target);
      },
    });
    expect(() => api.recordWorkAttendance(provided)).toThrow(
      /stale|payload descriptor changed/i,
    );
    evidence.note = "Original owning pay evidence";
    expect(saved(core)).toEqual(before);
  });

  it("rejects owning Source getters without invoking them or leaving partial attendance", () => {
    const core = fresh(),
      api = coreAPI(core),
      row = core.work.commitments.get("work")!,
      provided = input(core),
      before = saved(core);
    const descriptor = Object.getOwnPropertyDescriptor(
      row.scheduleSource,
      "citation",
    )!;
    let gets = p("zero");
    Object.defineProperty(row.scheduleSource, "citation", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() {
        gets++;
        throw new Error("Owning Source getter");
      },
    });
    try {
      expect(() => api.recordWorkAttendance(provided)).toThrow();
      expect(gets).toBe(p("zero"));
    } finally {
      Object.defineProperty(row.scheduleSource, "citation", descriptor);
    }
    expect(saved(core)).toEqual(before);
  });

  it("keeps pay Source cycle rejection after removing the full commitment copy", () => {
    const core = fresh(),
      api = coreAPI(core),
      row = core.work.commitments.get("work")!,
      original = row.paySource,
      provided = input(core);
    const cyclic: Source & { fixtureCycle?: unknown } = { ...original };
    cyclic.fixtureCycle = cyclic;
    row.paySource = cyclic;
    // Snapshot the canonical graph before the externally installed invalid Source.
    row.paySource = original;
    const before = saved(core);
    row.paySource = cyclic;
    expect(() => api.recordWorkAttendance(provided)).toThrow(/cycle/i);
    row.paySource = original;
    expect(saved(core)).toEqual(before);
  });

  it("retains first-day overnight slot arithmetic and the original validator's later-day result", () => {
    const supplied = fixture(),
      half = p("minutesPerHour") / p("two"),
      day = p("hoursPerDay") * p("minutesPerHour");
    supplied.workCommitments = supplied.workCommitments!.map((row) => ({
      ...row,
      startsAt: "2021-01-02",
      slots: [
        {
          offsetDays: p("zero"),
          startMinute: day - half,
          minutes: p("minutesPerHour"),
        },
      ],
    }));
    const core = createLifeCore(supplied),
      api = coreAPI(core);
    advanceDate(core, "2021-01-02");
    const row = core.work.commitments.get("work")!,
      firstPlanned = plannedWorkMinutesOnDate(api, row),
      provided = input(core);
    expect(firstPlanned).toBe(half);
    const offer = {
      ...provided.decision!.selected!,
      effortHours: firstPlanned / p("minutesPerHour"),
    };
    provided.decision = chooseAct(core, "worker", [offer]);
    provided.reasonKey = provided.decision.reasonKey;
    provided.plannedMinutes = firstPlanned;
    provided.attendedMinutes = firstPlanned;
    provided.absentMinutes = p("zero");
    const exact = (row.hourlyMinor * firstPlanned) / p("minutesPerHour");
    provided.earnedMinor = Math.floor(exact);
    provided.payRemainderMinor = exact - provided.earnedMinor;
    expect(() =>
      validateDatedWorkResult(core, api, {
        ...provided,
        requestedMinor: provided.earnedMinor,
      } as WorkResultInput),
    ).not.toThrow();
    const first = api.recordWorkAttendance(provided);
    expect(first.attendedMinutes).toBe(firstPlanned);
    expect(first.earnedMinor).toBe(Math.floor(exact));
    advanceDate(core, "2021-01-03");
    const nextPlanned = plannedWorkMinutesOnDate(api, row),
      later = input(core);
    expect(nextPlanned).toBe(p("minutesPerHour"));
    const laterReceipt = api.recordWorkAttendance(later);
    expect(laterReceipt.attendedMinutes).toBe(nextPlanned);
    expect(core.work.payrollLedgerByCommitment.get("work")!.earnedMinor).toBe(
      first.earnedMinor + laterReceipt.earnedMinor,
    );
    expect(core.people.get("worker")!.liquidMinor).toBe(p("zero"));
  });

  it("rejects a relevant slot getter without executing it", () => {
    const core = fresh(),
      api = coreAPI(core),
      provided = input(core),
      slot = core.work.commitments.get("work")!.slots[p("zero")]!,
      before = saved(core);
    const descriptor = Object.getOwnPropertyDescriptor(slot, "minutes")!;
    let gets = p("zero");
    Object.defineProperty(slot, "minutes", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() {
        gets++;
        throw new Error("Actual slot quantity getter");
      },
    });
    try {
      expect(() => api.recordWorkAttendance(provided)).toThrow();
      expect(gets).toBe(p("zero"));
    } finally {
      Object.defineProperty(slot, "minutes", descriptor);
    }
    expect(saved(core)).toEqual(before);
  });

  it("rejects late current calendar or planned-residue index drift before any native commit", () => {
    for (const kind of ["calendar", "planned"] as const) {
      const core = fresh(),
        api = coreAPI(core),
        provided = input(core),
        before = saved(core);
      const calendarId = core.work.payrollCalendarByCommitment.get("work")!,
        planned = core.work.plannedByCommitmentResidue.get("work")!,
        originalPlanned = planned.get(p("zero"))!;
      let changed = false;
      provided.source = new Proxy(provided.source, {
        ownKeys(target) {
          if (!changed) {
            changed = true;
            if (kind === "calendar")
              core.work.payrollCalendarByCommitment.set(
                "work",
                "replaced-calendar",
              );
            else planned.set(p("zero"), originalPlanned + p("one"));
          }
          return Reflect.ownKeys(target);
        },
      });
      expect(() => api.recordWorkAttendance(provided)).toThrow(/stale/i);
      if (kind === "calendar")
        core.work.payrollCalendarByCommitment.set("work", calendarId);
      else planned.set(p("zero"), originalPlanned);
      expect(saved(core)).toEqual(before);
    }
  });

  it("rejects late selected-offer target or available-time drift", () => {
    for (const key of ["targetId", "availableHours"] as const) {
      const core = fresh(),
        api = coreAPI(core),
        provided = input(core),
        offer = provided.decision!.selected!,
        before = saved(core),
        originalTarget = offer.targetId,
        originalHours = offer.availableHours;
      let changed = false;
      provided.source = new Proxy(provided.source, {
        ownKeys(target) {
          if (!changed) {
            changed = true;
            if (key === "targetId") offer.targetId = "another-commitment";
            else offer.availableHours = originalHours + p("one");
          }
          return Reflect.ownKeys(target);
        },
      });
      expect(() => api.recordWorkAttendance(provided)).toThrow(/stale/i);
      offer.targetId = originalTarget;
      offer.availableHours = originalHours;
      expect(saved(core)).toEqual(before);
    }
  });

  it("rejects a replaced genuine prior attendance/carry record during preparation", () => {
    const core = fresh(p("one")),
      api = coreAPI(core);
    api.recordWorkAttendance(input(core));
    advanceDate(core, "2021-01-03");
    const previous = core.work.lastAttendanceByJob.get("job")!,
      provided = input(core),
      before = saved(core);
    let changed = false;
    provided.source = new Proxy(provided.source, {
      ownKeys(target) {
        if (!changed) {
          changed = true;
          core.work.lastAttendanceByJob.set("job", {
            ...previous,
            payRemainderMinor: previous.payRemainderMinor + p("one"),
          });
        }
        return Reflect.ownKeys(target);
      },
    });
    expect(() => api.recordWorkAttendance(provided)).toThrow(/stale/i);
    core.work.lastAttendanceByJob.set("job", previous);
    expect(saved(core)).toEqual(before);
  });

  it("rejects caller-frozen decision evidence getters without invoking them or partially writing", () => {
    const core = fresh(undefined, true),
      provided = input(core),
      before = saved(core);
    let reads = p("zero");
    const annotation = Object.freeze({
      get sourceRecordIds() {
        reads++;
        return ["work"];
      },
    });
    Object.assign(provided.decision!, { fixtureAnnotation: annotation });
    Object.freeze(provided.decision!);
    expect(() => coreAPI(core).recordWorkAttendance(provided)).toThrow();
    expect(reads).toBe(p("zero"));
    expect(saved(core)).toEqual(before);
  });

  it("retains the full focused original decision graph and detaches it from caller mutation", () => {
    const core = fresh(undefined, true),
      api = coreAPI(core),
      provided = input(core);
    const annotation = {
      sourceRecordIds: ["work", "job"],
      note: "Actual recorded fixture evidence",
    };
    Object.assign(provided.decision!, { fixtureAnnotation: annotation });
    // Freezing a caller's outer record does not make its nested evidence owned.
    Object.freeze(provided.decision!);
    const originalDecision = structuredClone(provided.decision);
    const receipt = api.recordWorkAttendance(provided);
    expect(receipt.decision).toEqual(originalDecision);
    expect(core.work.detailedAttendance.get(receipt.id)!.decision).toEqual(
      originalDecision,
    );
    expect(core.durableLog.get(receipt.sourceActId)!.decision).toEqual(
      originalDecision,
    );
    annotation.note = "Caller rewrote its annotation";
    annotation.sourceRecordIds.push("caller-only");
    expect(receipt.decision).toEqual(originalDecision);
    expect(core.work.detailedAttendance.get(receipt.id)!.decision).toEqual(
      originalDecision,
    );
    expect(Object.isFrozen(receipt.decision)).toBe(true);
  });
});

// Additive explicit control retention fixtures. SOURCE ONLY; UNEXECUTED.
describe("explicitly controlled quiet attendance retention", () => {
  it("retains actual original scored attendance while preserving zero-cash earned/time outcomes", () => {
    const core = fresh(),
      baseline = fresh(),
      beforeMoney = money(core);
    registerControlledPersonV1(core, "worker");
    const provided = input(core),
      decisionBefore = structuredClone(provided.decision!),
      row = coreAPI(core).recordWorkAttendance(provided),
      ordinary = coreAPI(baseline).recordWorkAttendance(input(baseline));
    expect(provided.decision!.scores).toHaveLength(p("one"));
    expect(row.decision).toEqual(decisionBefore);
    expect(row.decision).not.toBe(provided.decision);
    expect(core.work.detailedAttendance.get(row.id)).toBe(row);
    expect(Object.isFrozen(row.decision)).toBe(true);
    expect(Object.isFrozen(row.decision!.scores)).toBe(true);
    expect(core.durableLog.get(row.sourceActId)!.decision).toBe(row.decision);
    expect(core.logByPerson.get("worker")).toContain(row.sourceActId);
    expect(row.earnedMinor).toBe(ordinary.earnedMinor);
    expect(core.work.payrollLedgerByCommitment).toEqual(
      baseline.work.payrollLedgerByCommitment,
    );
    expect(core.work.totalsByJob).toEqual(baseline.work.totalsByJob);
    expect(core.work.timeByPerson).toEqual(baseline.work.timeByPerson);
    expect(money(core)).toEqual(beforeMoney);
    expect(core.playerId).toBeUndefined();
    expect(core.focusPersonIds.size).toBe(p("zero"));
    expect(core.people.get("worker")!.tier).toBe("weekly");
    provided.decision!.reasonKey = "caller-rewrite-after-attendance";
    expect(core.work.detailedAttendance.get(row.id)!.decision).toEqual(
      decisionBefore,
    );
    expect(core.durableLog.get(row.sourceActId)!.decision).toEqual(
      decisionBefore,
    );
  });
  it("rejects private control retirement during final reflected attendance validation before native writes", () => {
    const core = fresh(),
      token = registerControlledPersonV1(core, "worker"),
      provided = input(core),
      before = saved(core);
    let calls = p("zero");
    const raw = new Proxy(provided, {
      ownKeys(target) {
        calls += p("one");
        if (calls === p("two")) retireControlledPersonV1(core, token);
        return Reflect.ownKeys(target);
      },
    });
    expect(() => coreAPI(core).recordWorkAttendance(raw)).toThrow(
      /Explicit control changed/,
    );
    expect(calls).toBeGreaterThanOrEqual(p("two"));
    expect(saved(core)).toEqual(before);
  });
});
