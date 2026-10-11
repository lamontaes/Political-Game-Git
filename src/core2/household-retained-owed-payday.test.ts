/** Controlled current owning graphs. SOURCE-ONLY; every case is UNEXECUTED by the author. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "./business-books";
import { cashJournalParameters } from "./cash-host";
import financeData from "./data/finance.json" with { type: "json" };
import financeCatalog from "./data/opening-finance.json" with { type: "json" };
import { FinancePlanningSession } from "./finance-plan";
import {
  createHouseholdPurchaseCalendarMarker,
  currentHouseholdPurchaseCalendarBasis,
  nextHouseholdPurchaseDate,
} from "./household-purchase-calendar";
import {
  compactGeneratedHouseholdSource,
  generatedHouseholdSourceBasis,
  resolveGeneratedHouseholdSource,
} from "./generated-household-source";
import { chooseAct, createLifeCore } from "./life";
import { DEFAULT_OPENING_PURCHASE_CALENDAR_DATA } from "./opening-purchase-calendar";
import { parameter as p, PARAMETERS } from "./parameters";
import { coreAPI } from "./state";
import { settleWorkPayrollJournal } from "./work-payroll-cash";
import { admittedWorkPayrollCalendarMatches } from "./work-attendance";
import type {
  CoreInput,
  CoreState,
  Source,
  WorkAttendanceInput,
} from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
import { makeIsoDate } from "../simulation/dates";

const zero = p("zero"),
  one = p("one"),
  unit = p("minorPerDollar"),
  half = unit / p("two");
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2020-11-01",
  citation:
    "Controlled independently saved household, job, employer, schedule and pay-calendar evidence; not ordinary-world proof.",
  estimatedFrom:
    "Exact fixture terms only. Actual attendance/absence and completed due Sources are created by the canonical writers; no future earnings or cash are manufactured.",
  generationPriorVintage: "controlled-owed-fixture",
};
function fixture(): CoreInput {
  const dueAt = "2020-12-16",
    calendar: WorkPayrollCalendarInput = {
      id: "calendar",
      organizationId: "employer",
      workCommitmentIds: ["work"],
      basisRecordIds: ["employer", "job", "work"],
      rule: "fixed-days-after-inclusive-period-end",
      periodDays: p("daysPerWeek"),
      firstPeriodStartsAt: "2021-01-01",
      firstPaydayAt: "2021-01-15",
      effectiveFrom: "2021-01-01",
      nonbusinessDayRule: "no-adjustment",
      arrearsRule: "carry-to-next-recorded-payday",
      source,
    };
  return {
    seed: "controlled-retained-owed-calendar",
    startedAt: dueAt,
    people: [
      {
        id: "worker",
        givenName: "Owed",
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
    organizations: [
      {
        id: "employer",
        name: "Actual controlled firm",
        kind: "employer",
        placeId: "place",
        liquidMinor: half,
        source,
      },
      {
        id: "supplier",
        name: "Actual controlled supplier",
        kind: "employer",
        placeId: "place",
        liquidMinor: zero,
        source,
      },
    ],
    jobs: [
      {
        id: "job",
        personId: "worker",
        organizationId: "employer",
        title: "Recorded owned job",
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
        payrollCalendarId: "calendar",
        startsAt: "2021-01-01",
        anchorDate: "2021-01-01",
        periodDays: one,
        hourlyMinor: unit,
        expectedWeeklyMinutes: p("minutesPerHour") * p("daysPerWeek"),
        slots: [
          { offsetDays: zero, startMinute: zero, minutes: p("minutesPerHour") },
        ],
        paySource: source,
        scheduleSource: source,
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
            { dueAt, source, basisIds: ["job", "work", "calendar"], gaps: [] },
            DEFAULT_OPENING_PURCHASE_CALENDAR_DATA,
          ),
        },
        {
          id: "actual-cost",
          payerIds: ["employer"],
          payeeId: "supplier",
          kind: "controlled-operating-obligation",
          amountMinor: unit,
          dueAt: "2021-01-15",
          periodMonths: one,
          accruesArrears: true,
          source,
        },
      ],
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
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
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
    logs: core.durableLog,
    knowledge: core.knowledgeByPerson,
    accounts: core.cashJournal.accounts,
    sequence: core.cashJournal.nextSequence,
    cashTotals: core.cashJournal.totals,
    external: core.cashJournal.externalFlowsByOwner,
  });
}
function attendance(core: CoreState, present: boolean): WorkAttendanceInput {
  const api = coreAPI(core),
    cfg = core.data.work!,
    planned = p("minutesPerHour"),
    attended = present ? planned : zero,
    decision = chooseAct(core, "worker", [
      {
        definition: present ? cfg.attendanceAction : cfg.absenceAction,
        targetId: "work",
        availableHours:
          p("hoursPerDay") - api.parameter(cfg.sleepReserveParameter),
        effortHours: present ? one : zero,
      },
    ]);
  return {
    id: `work-result:${core.date}:work`,
    commitmentId: "work",
    jobId: "job",
    personId: "worker",
    organizationId: "employer",
    date: core.date,
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
function ended(firstPresent = true, secondPresent = true, typedMarker = false) {
  const input = fixture();
  if (!firstPresent)
    input.organizations = input.organizations.map((row) =>
      row.id === "employer" ? { ...row, liquidMinor: zero } : row,
    );
  if (typedMarker) {
    const household = input.households[zero]!,
      basis = generatedHouseholdSourceBasis({
        domain: "category",
        household,
        key: "food",
        region: "northeast",
        sizeColumn: "1",
        parameterRefs: [
          financeCatalog.periodMonthsParameter,
          "daysPerMeanYear",
          "monthsPerYear",
          "minorPerDollar",
        ],
        calendarDueAt: input.startedAt,
        calendarBasisIds: ["job"],
        missingIncome: false,
      }),
      compact = compactGeneratedHouseholdSource(
        basis,
        input.startedAt,
        "controlled-full-typed-basis",
      );
    expect(
      resolveGeneratedHouseholdSource(compact, {
        households: new Map([[household.id, household]]),
        calendarRecords: new Map([
          ["job", { householdId: household.id, sources: [source] }],
        ]),
        parameters: PARAMETERS,
      }).householdSource,
    ).toEqual(household.source);
    input.finance!.contracts = input.finance!.contracts.map((row) =>
      row.id === "purchase"
        ? {
            ...row,
            householdPurchaseCalendar: {
              ...row.householdPurchaseCalendar!,
              source: compact,
            },
          }
        : row,
    );
  }
  const original = structuredClone(input),
    core = createLifeCore(input, { observer: false });
  advanceDate(core, "2021-01-02");
  coreAPI(core).recordWorkAttendance(attendance(core, firstPresent));
  advanceDate(core, "2021-01-09");
  const later = coreAPI(core).recordWorkAttendance(
    attendance(core, secondPresent),
  );
  advanceDate(core, "2021-01-15");
  const payday = settleWorkPayrollJournal(core, coreAPI(core), "work");
  if (payday.shortfallMinor > zero)
    coreAPI(core).closeEmployer(
      "employer",
      payday.id,
      "controlled-actual-missed-payday",
    );
  else {
    const cost = coreAPI(core).settleFinanceContract("actual-cost");
    expect(cost.unfundedMinor).toBe(unit);
    coreAPI(core).closeEmployer(
      "employer",
      cost.id,
      "controlled-actual-unpaid-cost",
    );
  }
  expect(core.people.get("worker")!.jobId).toBeUndefined();
  expect(core.jobs.get("job")!.endsAt).toBe(core.date);
  expect(input).toEqual(original);
  return { core, later, payday };
}
function query(
  core: CoreState,
  nominal = "2021-01-16",
  following = "2021-02-16",
) {
  const session = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    row = core.finance.contracts.get("purchase")!,
    basis = nextHouseholdPurchaseDate(session, row, nominal, following)!;
  session.reads.verify();
  return { session, basis };
}
function rejectsUnchanged(core: CoreState) {
  const before = saved(core);
  expect(() => query(core)).toThrow();
  expect(saved(core)).toEqual(before);
}

describe("bounded retained genuinely owed payday renewal (UNEXECUTED)", () => {
  it("keeps the actual future earned paycheck after genuine closure clears the current job, without new work or money", () => {
    const { core, later } = ended(),
      before = saved(core),
      { basis } = query(core);
    expect(core.work.earnedPayPeriods.get(later.earnedPayPeriodId)!.dueAt).toBe(
      "2021-01-22",
    );
    expect(basis).toMatchObject({
      nominalDueAt: "2021-01-16",
      effectiveDueAt: "2021-01-22",
      mode: "work",
    });
    expect(
      basis.references.some(
        (ref) =>
          ref.kind === "earned-pay-period" || ref.kind === "payroll-receipt",
      ),
    ).toBe(true);
    expect(core.work.payrollLedgerByCommitment.get("work")).toMatchObject({
      earnedMinor: unit * p("two"),
      accruedMinor: unit,
      dueRecognizedMinor: unit,
      paidMinor: half,
      arrearsMinor: half,
    });
    expect(core.finance.contracts.get("purchase")).toMatchObject({
      amountMinor: unit,
      periodMonths: one,
      firstDueAt: "2020-12-16",
      source,
    });
    expect(saved(core)).toEqual(before);
  });
  it("keeps a retry owed from a completed actual payday when a later zero-earned absence cannot supply a future work opportunity", () => {
    const { core, payday } = ended(true, false),
      before = saved(core),
      { basis } = query(core);
    expect(basis.effectiveDueAt).toBe("2021-01-22");
    expect(basis.mode).toBe("work");
    expect(
      basis.references.find((ref) => ref.kind === "payroll-receipt")!.id,
    ).toBe(payday.id);
    expect(
      basis.references.some((ref) => ref.kind === "earned-pay-period"),
    ).toBe(false);
    expect(core.work.payrollLedgerByCommitment.get("work")!.accruedMinor).toBe(
      zero,
    );
    expect(saved(core)).toEqual(before);
  });
  it("zero-earned absence and a real cost-caused ending create no fictional wage or retry anchor", () => {
    const { core } = ended(false, false),
      before = saved(core),
      { basis } = query(core);
    expect(core.work.payrollLedgerByCommitment.get("work")).toMatchObject({
      earnedMinor: zero,
      accruedMinor: zero,
      dueRecognizedMinor: zero,
      paidMinor: zero,
      arrearsMinor: zero,
    });
    expect(basis).toMatchObject({
      effectiveDueAt: "2021-01-16",
      mode: "missing-income",
      references: [],
    });
    expect(saved(core)).toEqual(before);
  });
  it("uses only the half-open nominal window; later source opportunities are not pulled forward and overdue retries are not rolled to new dates", () => {
    const { core } = ended();
    expect(query(core, "2021-01-16", "2021-01-22").basis).toMatchObject({
      effectiveDueAt: "2021-01-16",
      mode: "missing-income",
    });
    expect(query(core, "2021-01-22", "2021-02-22").basis.effectiveDueAt).toBe(
      "2021-01-22",
    );
    expect(query(core, "2021-02-16", "2021-03-16").basis).toMatchObject({
      effectiveDueAt: "2021-02-16",
      mode: "missing-income",
    });
  });
  it("rejects unadmitted calendar copies, either owner index loss, missing actual periods/ledgers and canonical retry Source pruning", () => {
    for (const change of [
      (core: CoreState) => {
        const actual = core.work.payrollCalendars.get("calendar")!;
        const copy = Object.freeze({ ...actual });
        expect(admittedWorkPayrollCalendarMatches(core, actual.id, copy)).toBe(
          false,
        );
        core.work.payrollCalendars.set(actual.id, copy);
      },
      (core: CoreState) => {
        core.work.payrollCalendarByJob.delete("job");
      },
      (core: CoreState) => {
        core.work.payrollCalendarByCommitment.delete("work");
      },
      (core: CoreState) => {
        core.work.earnedPayPeriods.clear();
      },
      (core: CoreState) => {
        core.work.payrollLedgerByCommitment.clear();
        core.work.earnedPayPeriodByCommitmentIndex.clear();
      },
      (core: CoreState) => {
        core.work.payrollCashSources.clear();
      },
      (core: CoreState) => {
        core.work.payrollArrearsByDue.clear();
      },
    ]) {
      const { core } = ended();
      change(core);
      rejectsUnchanged(core);
    }
  });
  it("rejects coordinated period/due-index and earned amount changes against the independent actual calendar, full Sources and work totals", () => {
    for (const change of [
      (core: CoreState, id: string) => {
        const period = core.work.earnedPayPeriods.get(id)!;
        core.work.earnedPayPeriods.set(id, { ...period, dueAt: "2021-01-23" });
        core.work.payrollPeriodsByDue.delete(makeIsoDate("2021-01-22"));
        core.work.payrollPeriodsByDue.set(
          makeIsoDate("2021-01-23"),
          new Set([id]),
        );
      },
      (core: CoreState, id: string) => {
        const period = core.work.earnedPayPeriods.get(id)!,
          ledger = core.work.payrollLedgerByCommitment.get("work")!;
        core.work.earnedPayPeriods.set(id, {
          ...period,
          earnedMinor: period.earnedMinor + one,
        });
        core.work.payrollLedgerByCommitment.set("work", {
          ...ledger,
          earnedMinor: ledger.earnedMinor + one,
          accruedMinor: ledger.accruedMinor + one,
        });
      },
      (core: CoreState, id: string) => {
        const period = core.work.earnedPayPeriods.get(id)!;
        core.work.earnedPayPeriods.set(id, {
          ...period,
          paySource: {
            ...period.paySource,
            citation: "Coordinated invented pay evidence",
          },
        });
      },
    ]) {
      const { core, later } = ended();
      change(core, later.earnedPayPeriodId);
      rejectsUnchanged(core);
    }
  });
  it("preserves the complete optional typed household Source basis on both renewal and the guarded completed-receipt copy", () => {
    const { core } = ended(true, true, true),
      before = saved(core),
      actual =
        core.finance.contracts.get("purchase")!.householdPurchaseCalendar!
          .source,
      { basis } = query(core);
    expect(basis.source.generatedHouseholdBasis).toEqual(
      actual.generatedHouseholdBasis,
    );
    expect(basis.source.generationPriorVintage).toBe(
      actual.generationPriorVintage,
    );
    expect(basis.source.citation).toBe(actual.citation);
    const session = new FinancePlanningSession(
        core,
        core.cashJournal,
        cashJournalParameters(core),
      ),
      row = core.finance.contracts.get("purchase")!;
    session.metadata.write(row, "householdPurchaseCalendarBasis", basis);
    session.metadata.write(row, "nominalDueAt", basis.nominalDueAt);
    session.metadata.write(row, "dueAt", basis.effectiveDueAt);
    const receiptBasis = currentHouseholdPurchaseCalendarBasis(session, row)!;
    expect(receiptBasis).toEqual(basis);
    expect(receiptBasis.source.generatedHouseholdBasis).not.toBe(
      actual.generatedHouseholdBasis,
    );
    session.reads.verify();
    session.nextReads.verify();
    expect(saved(core)).toEqual(before);
  });
  it("captures the original owning period/retry membership for final preflight and rejects a Source child getter without invoking it", () => {
    const { core, later } = ended(),
      session = new FinancePlanningSession(
        core,
        core.cashJournal,
        cashJournalParameters(core),
      );
    nextHouseholdPurchaseDate(
      session,
      core.finance.contracts.get("purchase")!,
      "2021-01-16",
      "2021-02-16",
    );
    core.work.payrollPeriodsByDue
      .get(makeIsoDate("2021-01-22"))!
      .delete(later.earnedPayPeriodId);
    const afterTamper = saved(core);
    expect(() => session.reads.verify()).toThrow();
    expect(saved(core)).toEqual(afterTamper);
    const typed = ended(true, true, true).core,
      actualRow = typed.finance.contracts.get("purchase")!,
      marker = actualRow.householdPurchaseCalendar!,
      original = marker.source,
      originalGraph = saved(typed);
    let calls = zero;
    const child = { ...original.generatedHouseholdBasis! };
    Object.defineProperty(child, "calendarBasisIds", {
      get() {
        calls += one;
        throw new Error("must not run");
      },
    });
    typed.finance.contracts.set(actualRow.id, {
      ...actualRow,
      householdPurchaseCalendar: {
        ...marker,
        source: { ...original, generatedHouseholdBasis: child },
      },
    });
    expect(() => query(typed)).toThrow();
    expect(calls).toBe(zero);
    typed.finance.contracts.set(actualRow.id, actualRow);
    expect(saved(typed)).toEqual(originalGraph);
    typed.finance.contracts.set(actualRow.id, {
      ...actualRow,
      householdPurchaseCalendar: {
        ...marker,
        source: {
          ...original,
          unsupportedNestedProvenance: { flag: "cannot authorize anything" },
        } as Source,
      },
    });
    expect(() => query(typed)).toThrow(/scalar provenance/);
    typed.finance.contracts.set(actualRow.id, actualRow);
    expect(saved(typed)).toEqual(originalGraph);
  });
  it("does not supply an estate opportunity for a deceased member from retained earned or recognized debt", () => {
    const { core } = ended(),
      actual = core.people.get("worker")!;
    core.people.set(actual.id, { ...actual, alive: false });
    const before = saved(core);
    expect(query(core).basis).toMatchObject({
      effectiveDueAt: "2021-01-16",
      mode: "missing-income",
      references: [],
    });
    expect(saved(core)).toEqual(before);
  });
});

/** Two bounded regressions for the separately reviewed repairs. UNEXECUTED by this author. */
describe("retained earned dates and actual grouped retry provenance (UNEXECUTED)", () => {
  it("rejects a future completed job end at opening without changing the supplied input", () => {
    const input = fixture();
    input.jobs = input.jobs.map((row) => ({ ...row, endsAt: "2021-01-31" }));
    const original = structuredClone(input);
    expect(() => createLifeCore(input, { observer: false })).toThrow(
      /Opening job end cannot be a future completed fact/,
    );
    expect(input).toEqual(original);
  });

  it("keeps ended-job group arrears after genuine closure and cites the actual aggregate Source and ID", () => {
    const input = fixture(),
      firstJob = input.jobs[zero]!,
      firstCommitment = input.workCommitments![zero]!,
      suppliedCalendar = input.workPayrollCalendars![zero]!,
      replacementJobId = "replacement-job",
      replacementId = "replacement-work";
    input.jobs = [
      { ...firstJob },
      {
        ...firstJob,
        id: replacementJobId,
        title: "Controlled actual replacement job",
      },
    ];
    // Explicit empty inputs prevent default enrollment; every owning record is admitted below.
    input.workCommitments = [];
    input.workPayrollCalendars = [];
    const original = structuredClone(input),
      core = createLifeCore(input, { observer: false }),
      api = coreAPI(core),
      worker = () => core.people.get("worker")!;
    api.addWorkCommitment({ ...firstCommitment, endsAt: "2021-01-03" });
    worker().jobId = replacementJobId;
    api.addWorkCommitment({
      ...firstCommitment,
      id: replacementId,
      jobId: replacementJobId,
      startsAt: "2021-01-04",
    });
    worker().jobId = "job";
    api.addWorkPayrollCalendar({
      ...suppliedCalendar,
      workCommitmentIds: ["work", replacementId],
      basisRecordIds: [
        "employer",
        "job",
        replacementJobId,
        "work",
        replacementId,
      ],
    });
    expect(
      admittedWorkPayrollCalendarMatches(
        core,
        suppliedCalendar.id,
        core.work.payrollCalendars.get(suppliedCalendar.id)!,
      ),
    ).toBe(true);

    advanceDate(core, "2021-01-02");
    api.recordWorkAttendance(attendance(core, true));
    worker().jobId = replacementJobId;
    const replacementAttendance = (present: boolean): WorkAttendanceInput => {
      const cfg = core.data.work!,
        planned = p("minutesPerHour"),
        attended = present ? planned : zero,
        decision = chooseAct(core, "worker", [
          {
            definition: present ? cfg.attendanceAction : cfg.absenceAction,
            targetId: replacementId,
            availableHours:
              p("hoursPerDay") - api.parameter(cfg.sleepReserveParameter),
            effortHours: present ? one : zero,
          },
        ]);
      return {
        id: `work-result:${core.date}:${replacementId}`,
        commitmentId: replacementId,
        jobId: replacementJobId,
        personId: "worker",
        organizationId: "employer",
        date: core.date,
        plannedMinutes: planned,
        attendedMinutes: attended,
        absentMinutes: planned - attended,
        earnedMinor: present ? unit : zero,
        payRemainderMinor: zero,
        decision,
        reasonKey: decision.reasonKey,
        source: { ...source, asOf: core.date },
      };
    };
    advanceDate(core, "2021-01-04");
    core.jobs.get("job")!.endsAt = "2021-01-03";
    api.recordWorkAttendance(replacementAttendance(true));
    // The later recorded absence owns a real zero-earned open period; it is not a paycheck opportunity.
    advanceDate(core, "2021-01-09");
    const later = api.recordWorkAttendance(replacementAttendance(false));
    expect(
      core.work.earnedPayPeriods.get(later.earnedPayPeriodId)!.earnedMinor,
    ).toBe(zero);
    expect(core.work.payrollCashSources.size).toBe(zero);
    expect(core.cashJournal.nextSequence).toBe(zero);

    advanceDate(core, "2021-01-15");
    const sequenceBefore = core.cashJournal.nextSequence,
      actsBefore = worker().actCount,
      payday = settleWorkPayrollJournal(core, api, "work");
    if (payday.group !== true)
      throw new Error(
        "Fixture requires the actual canonical grouped payday writer.",
      );
    const canonical = core.work.payrollCashSources.get(payday.id);
    if (!canonical || canonical.group !== true)
      throw new Error(
        "Fixture requires the genuine completed canonical group Source.",
      );
    expect(canonical.postedJournalSequence).toBe(sequenceBefore);
    expect(canonical.result).toEqual(payday);
    expect(canonical.result.components).toHaveLength(p("two"));
    expect(core.cashJournal.nextSequence).toBe(sequenceBefore + one);
    expect(worker().actCount).toBe(actsBefore);
    expect(payday).toMatchObject({
      date: "2021-01-15",
      requestedMinor: unit * p("two"),
      paidMinor: half,
      newlyDueMinor: unit * p("two"),
      arrearsAfterMinor: unit * p("two") - half,
    });
    for (const state of canonical.componentStates) {
      const component = state.result,
        ledger = core.work.payrollLedgerByCommitment.get(
          component.commitmentId,
        )!;
      expect(
        canonical.result.components.find(
          (row) => row.commitmentId === component.commitmentId,
        ),
      ).toBe(component);
      expect(core.work.latestPayrollByJob.get(component.jobId)).toBe(component);
      expect(ledger).toEqual(state.ledgerAfter);
      expect(ledger.lastPayrollReceiptId).toBe(payday.id);
      expect(ledger.arrearsMinor).toBeGreaterThan(zero);
      expect(
        core.work.payrollArrearsByDue
          .get(makeIsoDate("2021-01-22"))!
          .has(component.commitmentId),
      ).toBe(true);
      expect(component.jobSource).toEqual(
        core.jobs.get(component.jobId)!.source,
      );
      expect(component.paySource).toEqual(
        core.work.commitments.get(component.commitmentId)!.paySource,
      );
      expect(component.scheduleSource).toEqual(
        core.work.commitments.get(component.commitmentId)!.scheduleSource,
      );
    }
    const closure = api.closeEmployer(
      "employer",
      payday.id,
      core.data.finance!.reasons.closure,
    );
    expect(closure.sourceReceiptId).toBe(payday.id);
    expect(closure.cause).toEqual(canonical.result);
    expect(worker().jobId).toBeUndefined();
    expect(core.jobs.get("job")!.endsAt).toBe("2021-01-03");
    expect(core.jobs.get(replacementJobId)!.endsAt).toBe("2021-01-15");
    expect(core.organizations.get("employer")!.liquidMinor).toBe(zero);

    const before = saved(core),
      { basis } = query(core),
      payrollReference = basis.references.find(
        (ref) => ref.kind === "payroll-receipt",
      )!;
    expect(basis).toMatchObject({
      nominalDueAt: "2021-01-16",
      effectiveDueAt: "2021-01-22",
      mode: "work",
    });
    expect(
      basis.references.some((ref) => ref.kind === "earned-pay-period"),
    ).toBe(false);
    expect(payrollReference.id).toBe(payday.id);
    expect(payrollReference.source).toEqual(canonical.result.source);
    const jobReference = basis.references.find((ref) => ref.kind === "job")!,
      actualComponent = canonical.componentStates.find(
        (state) => state.result.jobId === jobReference.id,
      )!;
    expect(actualComponent.result.groupReceiptId).toBe(payrollReference.id);
    expect(payrollReference.source).not.toEqual(actualComponent.result.source);
    expect(core.date).toBe("2021-01-15");
    expect(core.cashJournal.nextSequence).toBe(sequenceBefore + one);
    expect(saved(core)).toEqual(before);
    expect(input).toEqual(original);
  });
});
