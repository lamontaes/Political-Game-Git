/** SOURCE-ONLY authored controlled fixtures. All cases UNEXECUTED by the author. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { createLifeCore, chooseAct } from "./life";
import { coreAPI } from "./state";
import { daysBetween, makeIsoDate } from "../simulation/dates";
import { parameter as p } from "./parameters";
import {
  enumerateDueWorkItems,
  prepareWorkChoice,
  commitWorkChoice,
  notifyWorkChoice,
  runScheduledWork,
  plannedWorkMinutesOnDate,
  discretionaryHours,
  hasDailyWorkRefresh,
} from "./modules/work";
import type {
  ActOffer,
  CoreAPI,
  CoreInput,
  CoreState,
  DecisionContext,
  DecisionResult,
  PersonState,
  Source,
} from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
const remainder = (value: number, period: number) =>
  ((value % period) + period) % period;
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
function fresh(minutes?: number, focused = false) {
  const data = fixture(minutes);
  if (focused) data.focusPersonIds = ["worker"];
  const core = createLifeCore(data);
  advanceDate(core, "2021-01-02");
  return core;
}

function consequences(core: CoreState) {
  return structuredClone({
    actorCash: [...core.people].map(([id, row]) => [id, row.liquidMinor]),
    employerCash: [...core.organizations].map(([id, row]) => [
      id,
      row.liquidMinor,
    ]),
    attendance: core.work.lastAttendanceByJob,
    detailed: core.work.detailedAttendance,
    periods: core.work.earnedPayPeriods,
    ledgers: core.work.payrollLedgerByCommitment,
    due: core.work.payrollPeriodsByDue,
    totals: core.work.totalsByJob,
    time: core.work.timeByPerson,
    acts: core.actCounters,
    logs: core.durableLog,
    finance: core.finance,
    journalTotals: core.cashJournal.totals,
    journalDetails: core.cashJournal.detailedReceipts,
    journalSequence: core.cashJournal.nextSequence,
  });
}
function autonomousSnapshot(core: CoreState) {
  return structuredClone({
    people: core.people,
    organizations: core.organizations,
    work: core.work,
    consequences: consequences(core),
    knowledge: core.knowledgeByPerson,
    gaps: core.gaps,
  });
}
function attendedDecision(
  core: CoreState,
  offers: readonly ActOffer[],
  context?: DecisionContext,
) {
  return chooseAct(
    core,
    "worker",
    offers.filter(
      (offer) => offer.definition === core.data.work!.attendanceAction,
    ),
    context,
  );
}
function prepared(core: CoreState) {
  const api = coreAPI(core),
    item = enumerateDueWorkItems(api)[p("zero")]!,
    choice = prepareWorkChoice(api, item, () => undefined)!;
  return {
    api,
    choice,
    decision: attendedDecision(core, choice.offers, choice.context),
  };
}

/** Exact original body retained here solely as a controlled autonomous preservation oracle. */
/** Work decisions use the same recorded named reasons and trait pulls as other acts. */
function originalAutonomousWork(
  api: CoreAPI,
  decide: (
    personId: string,
    offers: readonly ActOffer[],
    context?: DecisionContext,
  ) => DecisionResult,
  refresh: (
    actor: PersonState,
    needIds?: readonly string[],
  ) => DecisionContext | undefined,
): { decisions: number; acts: number } {
  const data = api.state.data.work;
  if (!data)
    return { decisions: api.parameter("zero"), acts: api.parameter("zero") };
  let decisions = api.parameter("zero"),
    acts = api.parameter("zero");
  const p = api.parameter;
  const elapsed = daysBetween(
    makeIsoDate(api.state.startedAt),
    makeIsoDate(api.state.date),
  );
  const due = new Set<string>();
  for (const [period, residues] of api.state.work.byPeriodResidue)
    for (const id of residues.get(remainder(elapsed, period)) ?? [])
      due.add(id);
  // Dated same-payer order is stable and explicitly a prototype accounting policy.
  const ordered = [...due]
    .map((id) => api.state.work.commitments.get(id)!)
    .sort(
      (a, b) =>
        a.organizationId.localeCompare(b.organizationId) ||
        a.jobId.localeCompare(b.jobId),
    );
  for (const row of ordered) {
    const actor = api.state.people.get(row.personId);
    const job = api.state.jobs.get(row.jobId);
    if (
      !actor?.alive ||
      actor.jobId !== row.jobId ||
      job?.personId !== actor.id
    )
      continue;
    const previous = api.state.work.lastAttendanceByJob.get(row.jobId);
    if (previous?.date === api.state.date) continue;
    const planned = plannedWorkMinutesOnDate(api, row);
    if (planned <= p("zero")) continue;
    api.stopgap("SG-P8-attendance-choice");
    api.stopgap("SG-P8-work-pay-terms");
    const context = hasDailyWorkRefresh(api, actor)
      ? refresh(actor)
      : refresh(actor, [data.attendanceAction.need, data.absenceAction.need]);
    const available = discretionaryHours(api, actor.id);
    const hours = planned / p("minutesPerHour");
    const absence: ActOffer = {
      definition: data.absenceAction,
      targetId: row.id,
      availableHours: available,
      effortHours: p("zero"),
    };
    const attendance: ActOffer = {
      definition: data.attendanceAction,
      targetId: row.id,
      availableHours: available,
      effortHours: hours,
    };
    const offers =
      hours <= available && available > p("zero")
        ? [attendance, absence]
        : [absence];
    const decision = decide(actor.id, offers, context);
    if (!decision.selected)
      throw new Error("Work attendance has no admitted decision.");
    const attended =
      decision.selected.definition.effect === data.attendanceAction.effect
        ? planned
        : p("zero");
    const exact =
      (previous?.payRemainderMinor ?? p("zero")) +
      (row.hourlyMinor * attended) / p("minutesPerHour");
    const requested = Math.floor(exact),
      carry = exact - requested;
    const result = {
      id: `work-result:${api.state.date}:${row.id}`,
      commitmentId: row.id,
      jobId: row.jobId,
      personId: actor.id,
      organizationId: row.organizationId,
      date: api.state.date,
      plannedMinutes: planned,
      attendedMinutes: attended,
      absentMinutes: planned - attended,
      earnedMinor: requested,
      payRemainderMinor: carry,
      reasonKey: decision.reasonKey,
      decision,
      source: {
        tag: "SOURCED" as const,
        asOf: api.state.date,
        citation:
          "Actual prototype owned-job attendance decision, occupied minutes and earned pay; cash follows the separately recorded employer payday. Fictional schedule/pay inputs retain their own source estimates.",
      },
    };
    const committed = api.recordWorkAttendance(result);
    decisions += p("one");
    acts += p("one");
    for (const module of api.state.modules.values())
      module.onWorkAttendance?.(api, committed);
    // No financial-pressure event or civic drive is synthesized by this module.
  }
  return { decisions, acts };
}

describe("scheduled work has an explicit choice continuation", () => {
  it("excludes the controlled worker from the autonomous batch without choosing or writing", () => {
    const core = fresh(),
      api = coreAPI(core),
      before = consequences(core);
    let choices = 0,
      refreshes = 0;
    expect(
      runScheduledWork(
        api,
        () => {
          choices++;
          throw new Error("Controlled work was chosen automatically.");
        },
        () => {
          refreshes++;
          return undefined;
        },
        "worker",
      ),
    ).toEqual({ decisions: 0, acts: 0 });
    expect(choices).toBe(0);
    expect(refreshes).toBe(0);
    expect(consequences(core)).toEqual(before);
    expect(
      runScheduledWork(
        api,
        (_id, offers, context) => attendedDecision(core, offers, context),
        () => undefined,
      ),
    ).toEqual({ decisions: 1, acts: 1 });
    expect(core.work.lastAttendanceByJob.get("job")!.attendedMinutes).toBe(
      p("minutesPerHour"),
    );
  });

  it("enumerates two actual owners in the original employer/job order without choosing or writing", () => {
    const data = fixture(),
      second = fixture();
    second.people = second.people.map((row) => ({
      ...row,
      id: "a-worker",
      householdId: "a-home",
      jobId: "a-job",
    }));
    second.households = second.households.map((row) => ({
      ...row,
      id: "a-home",
      memberIds: ["a-worker"],
    }));
    second.organizations = second.organizations.map((row) => ({
      ...row,
      id: "a-employer",
    }));
    second.jobs = second.jobs.map((row) => ({
      ...row,
      id: "a-job",
      personId: "a-worker",
      organizationId: "a-employer",
    }));
    second.workCommitments = second.workCommitments!.map((row) => ({
      ...row,
      id: "a-work",
      jobId: "a-job",
      personId: "a-worker",
      organizationId: "a-employer",
      payrollCalendarId: "a-calendar",
    }));
    second.workPayrollCalendars = second.workPayrollCalendars!.map((row) => ({
      ...row,
      id: "a-calendar",
      organizationId: "a-employer",
      workCommitmentIds: ["a-work"],
      basisRecordIds: ["a-employer", "a-job", "a-work"],
    }));
    data.people = [...data.people, ...second.people];
    data.households = [...data.households, ...second.households];
    data.organizations = [...data.organizations, ...second.organizations];
    data.jobs = [...data.jobs, ...second.jobs];
    data.workCommitments = [
      ...data.workCommitments!,
      ...second.workCommitments!,
    ];
    data.workPayrollCalendars = [
      ...data.workPayrollCalendars!,
      ...second.workPayrollCalendars!,
    ];
    const core = createLifeCore(data);
    advanceDate(core, "2021-01-02");
    const before = consequences(core),
      items = enumerateDueWorkItems(coreAPI(core));
    expect(items.map((row) => row.id)).toEqual(["a-work", "work"]);
    expect(items[p("zero")]).toBe(core.work.commitments.get("a-work"));
    expect(consequences(core)).toEqual(before);
  });
  it("rejects an older pending choice after another genuine canonical attendance consumes the day", () => {
    const core = fresh(),
      first = prepared(core),
      second = prepared(core);
    const committed = commitWorkChoice(
        second.api,
        second.choice,
        second.decision,
      ),
      after = consequences(core);
    expect(core.work.lastAttendanceByJob.get("job")).toBe(committed);
    expect(() =>
      commitWorkChoice(first.api, first.choice, first.decision),
    ).toThrow(/Stale/);
    expect(consequences(core)).toEqual(after);
  });

  it("preserves the original autonomous choice, refresh, arithmetic, counters and hook order", () => {
    const original = fresh(),
      candidate = fresh(),
      originalCalls: string[] = [],
      candidateCalls: string[] = [];
    function callbacks(core: CoreState, calls: string[]) {
      const api = coreAPI(core);
      core.modules.set("saved-attendance-consumer", {
        id: "saved-attendance-consumer",
        onWorkAttendance(_api, result) {
          calls.push("notify:" + result.id);
        },
      });
      return {
        decide(
          id: string,
          offers: readonly ActOffer[],
          context?: DecisionContext,
        ) {
          calls.push("choose:" + id);
          return attendedDecision(core, offers, context);
        },
        refresh(actor: PersonState, needs?: readonly string[]) {
          calls.push(
            "refresh:" + actor.id + ":" + (needs?.join(",") ?? "full"),
          );
          return undefined;
        },
        api,
      };
    }
    const before = callbacks(original, originalCalls),
      after = callbacks(candidate, candidateCalls);
    expect(runScheduledWork(after.api, after.decide, after.refresh)).toEqual(
      originalAutonomousWork(before.api, before.decide, before.refresh),
    );
    expect(candidateCalls).toEqual(originalCalls);
    expect(autonomousSnapshot(candidate)).toEqual(autonomousSnapshot(original));
  });
  it("prepares once without choosing, recording attendance, notifying or moving money", () => {
    const core = fresh(),
      api = coreAPI(core),
      before = consequences(core);
    let refreshes = p("zero"),
      notifications = p("zero");
    core.modules.set("consumer", {
      id: "consumer",
      onWorkAttendance() {
        notifications++;
      },
    });
    const item = enumerateDueWorkItems(api)[p("zero")]!;
    const choice = prepareWorkChoice(api, item, (_actor, needs) => {
      refreshes++;
      expect(needs).toEqual([
        core.data.work!.attendanceAction.need,
        core.data.work!.absenceAction.need,
      ]);
      return undefined;
    })!;
    expect(refreshes).toBe(p("one"));
    expect(choice.offers.map((offer) => offer.definition.id)).toEqual([
      core.data.work!.attendanceAction.id,
      core.data.work!.absenceAction.id,
    ]);
    expect(consequences(core)).toEqual(before);
    expect(notifications).toBe(p("zero"));
  });
  it("binds the actual current actor after a full refresh updates it and supplies its replacement", () => {
    const core = fresh(undefined, true),
      api = coreAPI(core),
      oldActor = core.people.get("worker")!;
    let calls = p("zero");
    const choice = prepareWorkChoice(
      api,
      enumerateDueWorkItems(api)[p("zero")]!,
      (actor, ids) => {
        calls++;
        expect(actor).toBe(oldActor);
        expect(ids).toBeUndefined();
        api.updatePerson(actor.id, {
          affect: { ...actor.affect, at: core.date },
        });
        // Controlled callback replaces the actual row, preserving every existing field and Source.
        core.people.set(actor.id, { ...core.people.get(actor.id)! });
        return undefined;
      },
    )!;
    expect(core.people.get("worker")).not.toBe(oldActor);
    const decision = attendedDecision(core, choice.offers);
    expect(commitWorkChoice(api, choice, decision).earnedMinor).toBe(1001);
    expect(calls).toBe(p("one"));
  });
  it("commits an actual selected offer exactly once and delivers callbacks separately exactly once", () => {
    const core = fresh(),
      api = coreAPI(core),
      writer = api.recordWorkAttendance;
    let writes = p("zero"),
      notices = p("zero");
    api.recordWorkAttendance = (input) => {
      writes++;
      return writer(input);
    };
    core.modules.set("consumer", {
      id: "consumer",
      onWorkAttendance(_api, result) {
        expect(result).toBe(core.work.lastAttendanceByJob.get("job"));
        notices++;
      },
    });
    const { choice, decision } = prepared(core),
      result = commitWorkChoice(api, choice, decision);
    expect(result.earnedMinor).toBe(1001);
    expect(result.plannedMinutes).toBe(p("minutesPerHour"));
    expect(result.attendedMinutes).toBe(result.plannedMinutes);
    expect(result.absentMinutes).toBe(p("zero"));
    expect(notices).toBe(p("zero"));
    notifyWorkChoice(api, choice);
    expect(notices).toBe(p("one"));
    const after = consequences(core);
    expect(() => commitWorkChoice(api, choice, decision)).toThrow(
      /already consumed/,
    );
    expect(() => notifyWorkChoice(api, choice)).toThrow(/already delivered/);
    expect(writes).toBe(p("one"));
    expect(consequences(core)).toEqual(after);
  });
  it("records absence with the original full-or-zero result and no payroll payment", () => {
    const core = fresh(),
      api = coreAPI(core),
      choice = prepareWorkChoice(
        api,
        enumerateDueWorkItems(api)[p("zero")]!,
        () => undefined,
      )!,
      decision = chooseAct(
        core,
        "worker",
        choice.offers.filter(
          (offer) => offer.definition === core.data.work!.absenceAction,
        ),
      ),
      balances = [...core.people].map(([id, row]) => [id, row.liquidMinor]);
    const result = commitWorkChoice(api, choice, decision);
    expect(result.attendedMinutes).toBe(p("zero"));
    expect(result.absentMinutes).toBe(result.plannedMinutes);
    expect(result.earnedMinor).toBe(p("zero"));
    expect([...core.people].map(([id, row]) => [id, row.liquidMinor])).toEqual(
      balances,
    );
    expect(core.work.latestPayrollByJob.size).toBe(p("zero"));
  });
  it("keeps exact fractional carry when consecutive dated full plans finish", () => {
    const core = fresh(p("one"));
    const first = prepared(core),
      receipt = commitWorkChoice(first.api, first.choice, first.decision);
    advanceDate(core, "2021-01-03");
    const second = prepared(core),
      next = commitWorkChoice(second.api, second.choice, second.decision),
      exact = receipt.payRemainderMinor + 1001 / p("minutesPerHour");
    expect(next.earnedMinor).toBe(Math.floor(exact));
    expect(next.payRemainderMinor).toBe(exact - Math.floor(exact));
    expect(next.attendedMinutes).toBe(p("one"));
    expect(core.work.latestPayrollByJob.size).toBe(p("zero"));
  });
  it("refuses a copied item, copied prepared token or structurally copied selected offer before effects", () => {
    const core = fresh(),
      api = coreAPI(core),
      item = enumerateDueWorkItems(api)[p("zero")]!,
      before = consequences(core);
    expect(() => prepareWorkChoice(api, { ...item }, () => undefined)).toThrow(
      /actual owned commitment/,
    );
    const choice = prepareWorkChoice(api, item, () => undefined)!,
      decision = attendedDecision(core, choice.offers);
    expect(() => commitWorkChoice(api, { ...choice }, decision)).toThrow(
      /foreign/,
    );
    expect(() =>
      commitWorkChoice(api, choice, {
        ...decision,
        selected: { ...decision.selected! },
      }),
    ).toThrow(/original actual offer/);
    expect(consequences(core)).toEqual(before);
  });
  it("refuses wrong saved actor/date or target instead of accepting another actual-looking offer", () => {
    const core = fresh(),
      { api, choice, decision } = prepared(core),
      before = consequences(core);
    for (const changed of [
      { ...decision, actorId: "different-worker" },
      { ...decision, date: "2021-01-03" },
      {
        ...decision,
        selected: { ...decision.selected!, targetId: "different-work" },
      },
    ])
      expect(() => commitWorkChoice(api, choice, changed)).toThrow(
        /original actual offer/,
      );
    expect(consequences(core)).toEqual(before);
  });
  it("rejects a stale date, job ownership, calendar, due membership, time or Source without recording attendance", () => {
    const changes: ((core: CoreState) => void)[] = [
      (core) => advanceDate(core, "2021-01-03"),
      (core) => {
        core.jobs.set("job", {
          ...core.jobs.get("job")!,
          organizationId: "different-employer",
        });
      },
      (core) => {
        core.work.payrollCalendars.set("recorded-pay-calendar", {
          ...core.work.payrollCalendars.get("recorded-pay-calendar")!,
        });
      },
      (core) => {
        core.work.byPeriodResidue.get(p("one"))!.get(p("zero"))!.delete("work");
      },
      (core) => {
        core.work.timeByPerson.set("worker", {
          date: core.date,
          workMinutes: p("one"),
          discretionaryMinutes: p("zero"),
        });
      },
      (core) => {
        core.work.commitments.get("work")!.paySource.citation =
          "Changed full owning pay Source";
      },
    ];
    for (const change of changes) {
      const core = fresh(),
        { api, choice, decision } = prepared(core);
      change(core);
      const afterChange = consequences(core);
      expect(() => commitWorkChoice(api, choice, decision)).toThrow(
        /Invalid or duplicate dated work result.*Stale/,
      );
      expect(consequences(core)).toEqual(afterChange);
    }
  });
  it("rejects changed in-place utility inputs or selected unit rows instead of reinterpreting the original answer", () => {
    for (const change of [
      (core: CoreState) => {
        const needs = core.people.get("worker")!.needs,
          id = core.data.work!.attendanceAction.need,
          before = needs[id];
        if (before === undefined)
          throw new Error("Fixture lacks its actual attendance need.");
        needs[id] = before + p("one");
      },
      (core: CoreState) => {
        core.data.parameters = {
          ...core.data.parameters,
          minutesPerHour: {
            ...core.data.parameters.minutesPerHour!,
            value: p("minutesPerHour") + p("one"),
          },
        };
      },
    ]) {
      const core = fresh(),
        { api, choice, decision } = prepared(core);
      change(core);
      const afterChange = consequences(core);
      expect(() => commitWorkChoice(api, choice, decision)).toThrow(
        /Invalid or duplicate dated work result.*Stale/,
      );
      expect(consequences(core)).toEqual(afterChange);
    }
  });
  it("does not invoke Source or saved-decision accessors and rejects executable/cyclic evidence", () => {
    const core = fresh(),
      row = core.work.commitments.get("work")!,
      api = coreAPI(core);
    let getters = p("zero");
    Object.defineProperty(row.paySource, "citation", {
      configurable: true,
      get() {
        getters++;
        return "Getter must not run";
      },
    });
    const before = consequences(core);
    expect(() => prepareWorkChoice(api, row, () => undefined)).toThrow(
      /direct own data/,
    );
    expect(getters).toBe(p("zero"));
    expect(consequences(core)).toEqual(before);
    const clean = fresh(),
      saved = prepared(clean),
      bad = { ...saved.decision };
    Object.defineProperty(bad, "reasonKey", {
      get() {
        getters++;
        return "unowned";
      },
    });
    expect(() => commitWorkChoice(saved.api, saved.choice, bad)).toThrow(
      /direct own data/,
    );
    expect(getters).toBe(p("zero"));
    const cyclic = { ...saved.decision, extra: {} as { back?: unknown } };
    cyclic.extra.back = cyclic;
    expect(() => commitWorkChoice(saved.api, saved.choice, cyclic)).toThrow(
      /cycle/,
    );
    const executable = { ...saved.decision, extra: () => undefined };
    expect(() => commitWorkChoice(saved.api, saved.choice, executable)).toThrow(
      /ordinary data/,
    );
    expect(clean.work.lastAttendanceByJob.size).toBe(p("zero"));
  });
  it("rechecks original reads after a proxy descriptor trap changes a real pay term", () => {
    const core = fresh(),
      { api, choice, decision } = prepared(core),
      row = core.work.commitments.get("work")!;
    let traps = p("zero");
    const trapped = new Proxy(decision, {
      ownKeys(target) {
        traps++;
        row.hourlyMinor += p("one");
        return Reflect.ownKeys(target);
      },
    });
    expect(() => commitWorkChoice(api, choice, trapped)).toThrow(/Stale/);
    expect(traps).toBeGreaterThan(p("zero"));
    expect(core.work.lastAttendanceByJob.size).toBe(p("zero"));
    expect(core.work.earnedPayPeriods.size).toBe(p("zero"));
    expect(core.people.get("worker")!.liquidMinor).toBe(p("zero"));
  });
});
