/** Twenty additive actual-writer cases. SOURCE ONLY; author has not executed them. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { chooseAct } from "./choice";
import { DEFAULT_DATA, extendData } from "./data";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import { resolveSavedTraceV1 } from "./saved-trace-v1";
import type {
  CoreInput,
  CoreState,
  DecisionResult,
  Source,
  WorkAttendanceInput,
} from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";

const source: Source = {
  tag: "ESTIMATED",
  asOf: "2020-12-01",
  citation:
    "Controlled independently supplied saved-record fixture, not ordinary-town evidence.",
  estimatedFrom:
    "Actual canonical writers exercised conditionally with named fixture inputs only.",
  generationPriorVintage:
    "Controlled technical input, not an observed historical actor contract.",
};
const rate = "savedTraceFixtureInterest";
const data = extendData(DEFAULT_DATA, {
  parameters: {
    [rate]: {
      value: p("zero"),
      tag: "SOURCED",
      citation:
        "This explicit controlled loan agreement specifies zero interest.",
    },
  },
});
function input(employerCash = 2000): CoreInput {
  const calendar: WorkPayrollCalendarInput = {
    id: "recorded-calendar",
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
    seed: "actual-saved-trace-fixture",
    startedAt: "2021-01-01",
    people: ["worker", "other"].map((id) => ({
      id,
      givenName: "Controlled",
      familyName: id,
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
      ...(id === "worker" ? { jobId: "job" } : {}),
    })),
    households: [
      { id: "home", placeId: "place", memberIds: ["worker", "other"], source },
    ],
    organizations: [
      { id: "employer", liquidMinor: employerCash },
      { id: "supplier", liquidMinor: p("zero") },
      { id: "lender", liquidMinor: 1000 },
    ].map((row) => ({
      ...row,
      placeId: "place",
      name: row.id,
      kind: "employer",
      source,
    })),
    jobs: [
      {
        id: "job",
        personId: "worker",
        organizationId: "employer",
        title: "Actual fixture job",
        hoursDaily: p("one"),
        hourlyMinor: 100,
        wageDailyMinor: 100,
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
        expectedWeeklyMinutes: p("minutesPerHour") * p("daysPerWeek"),
        hourlyMinor: 100,
        slots: [
          {
            offsetDays: p("zero"),
            startMinute: p("zero"),
            minutes: p("minutesPerHour"),
          },
        ],
        paySource: source,
        scheduleSource: source,
      },
    ],
    workPayrollCalendars: [calendar],
    finance: {
      contracts: [
        {
          id: "standing-term",
          payerIds: ["employer"],
          payeeId: "supplier",
          kind: data.finance!.kinds.operating,
          amountMinor: 200,
          dueAt: "2021-01-01",
          periodMonths: p("one"),
          accruesArrears: true,
          creditFacilityId: "recorded-facility",
          source,
        },
      ],
      facilities: [
        {
          id: "recorded-facility",
          borrowerId: "employer",
          lenderId: "lender",
          limitMinor: 1000,
          active: true,
          annualInterestParameter: rate,
          source,
        },
      ],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function fresh(observer = true, employerCash?: number): CoreState {
  return createCore(input(employerCash), { data, observer });
}
function savedAct(core: CoreState, ids: readonly string[] = ["job"]) {
  core.reasonProviders.set("recorded-fixture", () => ({
    value: p("one"),
    sourceIds: ids,
  }));
  const offer = {
      definition: core.data.actions.find((row) => row.id === "rest")!,
      targetId: "worker",
      availableHours: p("hoursPerDay"),
      reasonBindings: [
        {
          id: "recorded-pull",
          provider: "recorded-fixture",
          weightParameter: "one",
          arguments: { owningRecord: "job" },
        },
      ],
    },
    decision = chooseAct(core, "worker", [offer]),
    id = coreAPI(core).recordAct(
      "worker",
      decision.selected!,
      core.date,
      decision,
    );
  return { id, decision };
}
function attendance(core: CoreState): WorkAttendanceInput {
  const commitment = core.work.commitments.get("work")!,
    cfg = core.data.work!,
    offer = {
      definition: cfg.attendanceAction,
      targetId: commitment.id,
      availableHours: p("hoursPerDay") - p(cfg.sleepReserveParameter),
      effortHours: p("one"),
    },
    decision = chooseAct(core, "worker", [offer]);
  return {
    id: "work-result:" + core.date + ":work",
    date: core.date,
    commitmentId: "work",
    jobId: "job",
    personId: "worker",
    organizationId: "employer",
    plannedMinutes: p("minutesPerHour"),
    attendedMinutes: p("minutesPerHour"),
    absentMinutes: p("zero"),
    earnedMinor: 100,
    payRemainderMinor: p("zero"),
    decision,
    reasonKey: decision.reasonKey,
    source: { ...source, asOf: core.date },
  };
}
function earn(core: CoreState) {
  advanceDate(core, "2021-01-02");
  return coreAPI(core).recordWorkAttendance(attendance(core));
}
function ref(
  trace: ReturnType<typeof resolveSavedTraceV1>,
  id: string,
  kind?: string,
) {
  return trace.savedSources.find(
    (row) =>
      row.recordedRef.id === id &&
      (kind === undefined || row.recordedRef.kind === kind),
  );
}
function boundary(core: CoreState) {
  return {
    date: core.date,
    sequence: core.sequence,
    journal: core.cashJournal.nextSequence,
    acts: core.people.get("worker")!.actCount,
    employerCash: core.organizations.get("employer")!.liquidMinor,
    workerCash: core.people.get("worker")!.liquidMinor,
    ledger: core.work.payrollLedgerByCommitment.get("work"),
    durable: core.durableLog.size,
    payrollRows: core.work.payrollCashSources.size,
    financeRows: core.finance.cashSources.size,
    attendanceRows: core.work.currentAttendanceJobByRecordId.size,
  };
}

describe("saved trace v1: actual saved-record queries, unexecuted by author", () => {
  it("01 returns the actual retained act's reasons, terms and scores without reevaluating current motive", () => {
    const core = fresh(),
      { id, decision } = savedAct(core),
      before = boundary(core);
    coreAPI(core).updatePerson("worker", {
      lastReason: "changed-current-motive",
    });
    const trace = resolveSavedTraceV1(core, id);
    expect(trace).toMatchObject({
      version: "core2-part1b-v1",
      recordId: id,
      status: "saved",
      recordKind: "person.acted",
      reasonKey: decision.reasonKey,
      reasons: decision.selectedReasons,
      reasonTerms: decision.selectedReasonTerms,
      scores: decision.scores,
      scoresStatus: "saved",
    });
    expect(ref(trace, "job", "untyped-saved-id")?.status).toBe(
      "resolved-saved-record",
    );
    expect(boundary(core)).toEqual(before);
  });
  it("02 resolves focused attendance and its actual retained act, job, calendar and open-period links", () => {
    const core = fresh(),
      row = earn(core),
      before = boundary(core),
      trace = resolveSavedTraceV1(core, row.id);
    expect(trace).toMatchObject({
      status: "saved",
      recordKind: "work.attendance",
      reasonKey: row.reasonKey,
      scoresStatus: "saved",
      scores: row.decision!.scores,
    });
    for (const id of [
      row.sourceActId,
      row.jobId,
      row.payrollCalendarId,
      row.earnedPayPeriodId,
    ])
      expect(ref(trace, id)?.status).toBe("resolved-saved-record");
    expect(boundary(core)).toEqual(before);
  });
  it("03 resolves quiet current attendance by the writer's actual record-ID index without inventing scores", () => {
    const core = fresh(false),
      row = earn(core),
      trace = resolveSavedTraceV1(core, row.id);
    expect(core.work.detailedAttendance.has(row.id)).toBe(false);
    expect(core.work.currentAttendanceJobByRecordId.get(row.id)).toBe(
      row.jobId,
    );
    expect(trace).toMatchObject({
      status: "saved",
      recordKind: "work.attendance",
      reasonKey: row.reasonKey,
      scoresStatus: "none-saved",
    });
    expect(trace).not.toHaveProperty("scores");
    expect(ref(trace, row.sourceActId)?.status).toBe("missing-record");
    core.work.currentAttendanceJobByRecordId.set(row.id, "not-the-owning-job");
    const before = boundary(core);
    expect(() => resolveSavedTraceV1(core, row.id)).toThrow(/index|owning/);
    expect(boundary(core)).toEqual(before);
  });
  it("04 removes only the superseded quiet index entry and keeps the new current record queryable", () => {
    const core = fresh(false),
      first = earn(core);
    advanceDate(core, "2021-01-03");
    const second = coreAPI(core).recordWorkAttendance(attendance(core));
    expect(core.work.currentAttendanceJobByRecordId.size).toBe(p("one"));
    expect(core.work.currentAttendanceJobByRecordId.has(first.id)).toBe(false);
    expect(resolveSavedTraceV1(core, first.id).status).toBe("record-not-found");
    expect(resolveSavedTraceV1(core, second.id)).toMatchObject({
      status: "saved",
      reasonKey: second.reasonKey,
    });
  });
  it("05 keeps focused historical attendance queryable after the current job index moves", () => {
    const core = fresh(),
      first = earn(core);
    advanceDate(core, "2021-01-03");
    coreAPI(core).recordWorkAttendance(attendance(core));
    expect(core.work.currentAttendanceJobByRecordId.has(first.id)).toBe(false);
    expect(core.work.detailedAttendance.has(first.id)).toBe(true);
    expect(resolveSavedTraceV1(core, first.id)).toMatchObject({
      status: "saved",
      scoresStatus: "saved",
    });
  });
  it("06 returns actual payday accounting links without manufacturing a payday decision", () => {
    const core = fresh();
    earn(core);
    advanceDate(core, "2021-01-08");
    const row = coreAPI(core).settleWorkPayroll("work"),
      before = boundary(core),
      trace = resolveSavedTraceV1(core, row.id);
    expect(trace).toMatchObject({
      status: "no-saved-reason",
      recordKind: core.data.work!.journalSourceKinds.payroll,
      scoresStatus: "none-saved",
      sourcesStatus: "saved",
    });
    expect(ref(trace, "work")?.status).toBe("resolved-saved-record");
    expect(ref(trace, "recorded-calendar")?.status).toBe(
      "resolved-saved-record",
    );
    expect(trace).not.toHaveProperty("reasonKey");
    expect(boundary(core)).toEqual(before);
  });
  it("07 resolves an actual standing receipt via saved contract metadata with no actor motive", () => {
    const core = fresh(),
      row = coreAPI(core).settleFinanceContract("standing-term"),
      before = boundary(core),
      trace = resolveSavedTraceV1(core, row.id);
    expect(trace).toMatchObject({
      status: "no-saved-reason",
      recordKind: core.data.finance!.cashJournal.sourceKinds.contract,
      scoresStatus: "none-saved",
    });
    expect(
      ref(
        trace,
        row.contractId,
        core.data.finance!.cashJournal.relatedKinds.terms,
      )?.status,
    ).toBe("resolved-saved-record");
    expect(boundary(core)).toEqual(before);
  });
  it("08 returns the saved credit reason key and owning facility after a genuine bounded contract draw", () => {
    const core = fresh(true, p("zero")),
      row = coreAPI(core).drawCredit(
        "recorded-facility",
        100,
        core.data.finance!.reasons.borrowing,
        "standing-term",
      ),
      before = boundary(core),
      trace = resolveSavedTraceV1(core, row.id);
    expect(trace).toMatchObject({
      status: "saved",
      recordKind: core.data.finance!.cashJournal.sourceKinds.credit,
      reasonKey: row.reasonKey,
      scoresStatus: "none-saved",
    });
    expect(trace).not.toHaveProperty("reasons");
    expect(ref(trace, row.facilityId)?.status).toBe("resolved-saved-record");
    expect(boundary(core)).toEqual(before);
  });
  it("09 returns the actual journal's typed primary and related links without leaking its mutable maps", () => {
    const core = fresh(),
      row = coreAPI(core).settleFinanceContract("standing-term"),
      journal = [...core.cashJournal.detailedReceipts.values()].find(
        (item) => item.sourceRef.id === row.id,
      )!;
    const trace = resolveSavedTraceV1(core, journal.id);
    expect(trace).toMatchObject({
      status: "no-saved-reason",
      recordKind: "cash-journal",
    });
    for (const saved of [journal.sourceRef, ...journal.relatedRecords])
      expect(ref(trace, saved.id, saved.kind)?.recordedRef).toEqual({
        kind: saved.kind,
        id: saved.id,
      });
    expect(trace).not.toHaveProperty("owners");
    expect(trace).not.toHaveProperty("accounts");
    expect(trace).not.toHaveProperty("postings");
  });
  it("10 distinguishes an actual current relationship from a nonexistent historical relationship change", () => {
    const core = fresh(),
      api = coreAPI(core);
    api.relationship("worker", "other", "contact", p("one"));
    const row = [...core.relationships.values()][p("zero")]!;
    api.updatePerson("worker", {
      lastReason: "current-unsaved-relationship-motive",
    });
    expect(resolveSavedTraceV1(core, row.id)).toMatchObject({
      status: "no-saved-reason",
      recordKind: "relationship",
    });
    expect(
      resolveSavedTraceV1(core, "unrecorded-relationship-change").status,
    ).toBe("record-not-found");
  });
  it("11 preserves the membership's recorded sourceDriveId and labels its unresolved saved link honestly", () => {
    const core = fresh();
    coreAPI(core).join("worker", "employer", "unsaved-drive-id");
    const row = [...core.memberships.values()][p("zero")]!,
      trace = resolveSavedTraceV1(core, row.id);
    expect(trace).toMatchObject({
      status: "no-saved-reason",
      recordKind: "membership",
      sourcesStatus: "saved",
    });
    expect(ref(trace, row.sourceDriveId!, "untyped-saved-id")?.status).toBe(
      "missing-record",
    );
  });
  it("12 resolves factual records without current motive and merges the actual cash selection with its retained act log", () => {
    const core = fresh();
    coreAPI(core).updatePerson("worker", { lastReason: "current-only" });
    for (const [id, kind] of [
      ["worker", "person"],
      ["home", "household"],
      ["job", "job"],
    ]) {
      const trace = resolveSavedTraceV1(core, id!);
      expect(trace).toMatchObject({
        status: "no-saved-reason",
        recordKind: kind,
      });
      expect(trace).not.toHaveProperty("reasonKey");
    }
    const opening = input();
    opening.workCommitments = [];
    opening.workPayrollCalendars = [];
    const legacy = createCore(opening, { data, observer: true });
    advanceDate(legacy, "2021-01-02");
    const offer = {
        definition: legacy.data.actions.find((row) => row.id === "work-shift")!,
        targetId: "job",
        availableHours: p("hoursPerDay"),
        effortHours: p("one"),
      },
      decision = chooseAct(legacy, "worker", [offer]),
      row = coreAPI(legacy).settleLegacyWorkResult({
        personId: "worker",
        date: legacy.date,
        days: p("one"),
        offer: decision.selected!,
        decision,
      }),
      trace = resolveSavedTraceV1(legacy, row.sourceActId);
    expect(legacy.work.cashActSelections.has(row.sourceActId)).toBe(true);
    expect(legacy.durableLog.has(row.sourceActId)).toBe(true);
    expect(trace).toMatchObject({
      status: "saved",
      recordKind: "person.acted",
      scoresStatus: "saved",
      reasonKey: decision.reasonKey,
      scores: decision.scores,
    });
    expect(ref(trace, row.id)?.status).toBe("resolved-saved-record");
  });
  it("13 returns actual admitted commitment and calendar links with their genuine original basis IDs", () => {
    const core = fresh(),
      commitment = core.work.commitments.get("work")!,
      calendar = core.work.payrollCalendars.get("recorded-calendar")!;
    expect(resolveSavedTraceV1(core, commitment.id)).toMatchObject({
      status: "no-saved-reason",
      recordKind: core.data.work!.journalSourceKinds.commitment,
    });
    const trace = resolveSavedTraceV1(core, calendar.id);
    expect(trace).toMatchObject({
      status: "no-saved-reason",
      recordKind: core.data.work!.journalSourceKinds.payrollCalendar,
    });
    for (const id of calendar.basisRecordIds)
      expect(ref(trace, id, "untyped-saved-id")?.status).toBe(
        "resolved-saved-record",
      );
  });
  it("14 resolves the actual open earned period without claiming a paycheck or a decision was saved on it", () => {
    const core = fresh(),
      attendanceRow = earn(core),
      period = core.work.earnedPayPeriods.get(attendanceRow.earnedPayPeriodId)!;
    const trace = resolveSavedTraceV1(core, period.id);
    expect(trace).toMatchObject({
      status: "no-saved-reason",
      recordKind: core.data.work!.journalSourceKinds.earnedPayPeriod,
    });
    expect(core.work.payrollCashSources.size).toBe(p("zero"));
    expect(core.people.get("worker")!.liquidMinor).toBe(p("zero"));
    expect(ref(trace, period.calendarId)?.status).toBe("resolved-saved-record");
  });
  it("15 returns an actual emitted retained event and explicit absence when it contains no saved reason", () => {
    const core = fresh();
    coreAPI(core).emit({
      id: "actual-saved-event",
      date: core.date,
      kind: "controlled-notice",
      personIds: ["worker"],
      placeId: "place",
      source,
      publicRecord: true,
    });
    expect(resolveSavedTraceV1(core, "actual-saved-event")).toMatchObject({
      status: "no-saved-reason",
      recordKind: "controlled-notice",
      scoresStatus: "none-saved",
      sourcesStatus: "none-saved",
    });
  });
  it("16 preserves real reason-provider source IDs even when the actual referenced record is missing", () => {
    const core = fresh(),
      { id, decision } = savedAct(core, ["job", "not-saved-anywhere"]),
      trace = resolveSavedTraceV1(core, id);
    expect(trace.status).toBe("saved");
    if (trace.status !== "saved")
      throw new Error("Expected actual saved decision.");
    expect(trace.reasonTerms).toEqual(decision.selectedReasonTerms);
    expect(ref(trace, "not-saved-anywhere")?.status).toBe("missing-record");
    expect(ref(trace, "job")?.status).toBe("resolved-saved-record");
  });
  it("17 detects a genuine cross-table ID collision and an ambiguous untyped source without choosing a row", () => {
    const core = fresh(),
      api = coreAPI(core);
    api.relationship("worker", "other", "contact", p("one"));
    const relationship = [...core.relationships.values()][p("zero")]!;
    api.emit({
      id: relationship.id,
      date: core.date,
      kind: "different-saved-record",
      personIds: ["worker"],
      placeId: "place",
      source,
      publicRecord: true,
    });
    expect(resolveSavedTraceV1(core, relationship.id).status).toBe(
      "ambiguous-record",
    );
    const { id } = savedAct(core, [relationship.id]);
    expect(ref(resolveSavedTraceV1(core, id), relationship.id)?.status).toBe(
      "ambiguous-record",
    );
  });
  it("18 returns deeply frozen detached ordinary evidence that cannot alias the caller's retained decision graph", () => {
    const core = fresh(),
      { id, decision } = savedAct(core),
      trace = resolveSavedTraceV1(core, id);
    expect(trace.status).toBe("saved");
    if (trace.status !== "saved")
      throw new Error("Expected actual saved decision.");
    expect(trace.reasons).not.toBe(decision.selectedReasons);
    expect(trace.reasonTerms).not.toBe(decision.selectedReasonTerms);
    expect(trace.scores).not.toBe(decision.scores);
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.savedSources)).toBe(true);
    expect(Object.isFrozen(trace.reasonTerms![p("zero")]!.arguments)).toBe(
      true,
    );
    const old = trace.reasons!.need;
    decision.selectedReasons!.need += p("one");
    expect(trace.reasons!.need).toBe(old);
    expect(Reflect.set(trace.reasons!, "need", old + p("one"))).toBe(false);
    // This test promises detached query output, not historical ownership of old by-reference recordAct input.
  });
  it("19 rejects getter, executable, cyclic and mutable-map saved evidence without invoking getters or writing state", () => {
    for (const mode of [
      "getter",
      "function",
      "cycle",
      "map",
      "source-getter",
      "source-drift",
    ] as const) {
      const core = fresh(),
        { id } = savedAct(core),
        log = core.durableLog.get(id)!,
        before = boundary(core);
      let calls = p("zero");
      const reasons = { ...log.decision!.selectedReasons! } as Record<
        string,
        unknown
      >;
      if (mode === "getter")
        Object.defineProperty(reasons, "need", {
          get() {
            calls += p("one");
            return p("one");
          },
        });
      else if (mode === "function")
        reasons.bad = () => {
          calls += p("one");
        };
      else if (mode === "cycle") reasons.bad = reasons;
      else if (mode === "map") reasons.bad = new Map([["mutable", p("one")]]);
      else if (mode === "source-getter") {
        const owned = { ...log.source };
        Object.defineProperty(owned, "citation", {
          get() {
            calls += p("one");
            return "not read";
          },
        });
        log.source = owned;
      } else {
        let probes = p("zero");
        log.source = new Proxy(
          { ...log.source },
          {
            getOwnPropertyDescriptor(target, key) {
              const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
              if (key !== "citation" || !descriptor) return descriptor;
              probes += p("one");
              return {
                ...descriptor,
                value:
                  probes === p("one")
                    ? target.citation
                    : "changed during query",
              };
            },
          },
        );
      }
      log.decision = {
        ...log.decision!,
        selectedReasons: reasons as unknown as NonNullable<
          DecisionResult["selectedReasons"]
        >,
      };
      expect(() => resolveSavedTraceV1(core, id)).toThrow();
      expect(calls).toBe(p("zero"));
      expect(boundary(core)).toEqual(before);
    }
  });
  it("20 uses native direct lookups and never scans history, invokes module queries/providers, or consults current motives", () => {
    const core = fresh(),
      { id } = savedAct(core),
      before = boundary(core);
    let calls = p("zero");
    const forbidden = () => {
      calls += p("one");
      throw new Error("Query attempted actor/module/provider reconstruction.");
    };
    core.reasonProviders.set("recorded-fixture", forbidden);
    for (const table of [
      core.durableLog,
      core.jobs,
      core.work.lastAttendanceByJob,
      core.finance.latestReceiptsByContract,
    ]) {
      Object.defineProperty(table, "get", {
        value: forbidden,
        configurable: true,
      });
      Object.defineProperty(table, Symbol.iterator, {
        value: forbidden,
        configurable: true,
      });
      Object.defineProperty(table, "entries", {
        value: forbidden,
        configurable: true,
      });
      Object.defineProperty(table, "values", {
        value: forbidden,
        configurable: true,
      });
    }
    Object.defineProperty(core, "modules", {
      get: forbidden,
      configurable: true,
    });
    Object.defineProperty(core.people.get("worker")!, "lastReason", {
      get: forbidden,
      configurable: true,
    });
    expect(resolveSavedTraceV1(core, id)).toMatchObject({
      status: "saved",
      scoresStatus: "saved",
    });
    expect(calls).toBe(p("zero"));
    expect(boundary(core)).toEqual(before);
  });
});

/** Additional mandatory-reference cases; SOURCE-ONLY, UNEXECUTED. Original 20 cases are intact. */
function mandatoryReferenceSnapshot(core: CoreState) {
  return structuredClone({
    date: core.date,
    sequence: core.sequence,
    people: core.people,
    organizations: core.organizations,
    jobs: core.jobs,
    work: core.work,
    finance: core.finance,
    durableLog: core.durableLog,
    actCounters: core.actCounters,
    actCountersByMonth: core.actCountersByMonth,
    actsByMonthKind: core.actsByMonthKind,
    knowledge: core.knowledgeByPerson,
    accounts: core.cashJournal.accounts,
    journalReceipts: core.cashJournal.detailedReceipts,
    journalNextSequence: core.cashJournal.nextSequence,
    journalTotals: core.cashJournal.totals,
    externalFlows: core.cashJournal.externalFlowsByOwner,
  });
}

describe("saved trace mandatory typed-reference shape (SOURCE_ONLY, UNEXECUTED)", () => {
  it("21 rejects a pruned mandatory primary Source ID from an actual journal receipt before any trace can omit it", () => {
    const core = fresh(),
      settled = coreAPI(core).settleFinanceContract("standing-term"),
      actual = [...core.cashJournal.detailedReceipts.values()].find(
        (row) => row.sourceRef.id === settled.id,
      );
    expect(actual).toBeDefined();
    const captured = structuredClone(actual!);
    expect(captured.sourceRef.id).toBe(settled.id);
    expect(Reflect.deleteProperty(captured.sourceRef, "id")).toBe(true);
    // Tamper only metadata of the genuine emitted receipt; no payment is fabricated.
    core.cashJournal.detailedReceipts.set(captured.id, captured);
    const before = mandatoryReferenceSnapshot(core);
    expect(() => resolveSavedTraceV1(core, captured.id)).toThrow(
      /malformed recorded identity/,
    );
    expect(mandatoryReferenceSnapshot(core)).toEqual(before);
  });

  it("22 requires both mandatory kind and ID on the actual retained payroll typed references", () => {
    for (const field of ["kind", "id"] as const) {
      const core = fresh();
      earn(core);
      advanceDate(core, "2021-01-08");
      const paid = coreAPI(core).settleWorkPayroll("work"),
        actual = core.work.payrollCashSources.get(paid.id);
      expect(actual).toBeDefined();
      const captured = structuredClone(actual!),
        reference = captured.references.find(
          (row) =>
            row.kind === core.data.work!.journalSourceKinds.commitment &&
            row.id === "work",
        );
      expect(reference).toBeDefined();
      expect(Reflect.deleteProperty(reference!, field)).toBe(true);
      // Keep the actual completed receipt/amounts/Sources and every other recorded link intact.
      core.work.payrollCashSources.set(captured.id, captured);
      const before = mandatoryReferenceSnapshot(core);
      expect(() => resolveSavedTraceV1(core, paid.id)).toThrow(
        /malformed recorded identity/,
      );
      expect(mandatoryReferenceSnapshot(core)).toEqual(before);
    }
  });
});
