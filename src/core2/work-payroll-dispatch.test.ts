/** Proposed integration regressions. Author did not execute any fixture. */
import { describe, it, expect } from "vitest";
import { DEFAULT_DATA } from "./data";
import { parameter as p } from "./parameters";
import { advanceDate } from "./calendar";
import { createLifeCore, chooseAct } from "./life";
import { coreAPI, registerModule } from "./state";
import { WORK_MODULE } from "./modules/work";
import { FINANCE_MODULE } from "./modules/finance";
import { ensureWorkPayrollCashModule } from "./work-payroll-cash";
import {
  runWorkPayrollDay,
  observeWorkPayrollForFinance,
} from "./work-payroll-dispatch";
import type { BusinessBooksState } from "./finance-types";
import type { CoreInput, CoreState, Source } from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
const employer = "cash-fixture-employer",
  worker = "cash-fixture-worker",
  job = "cash-fixture-job",
  commitment = "cash-fixture-work",
  unit = p("minorPerDollar");
const evidence: Source = {
  tag: "SOURCED",
  asOf: "2020-12-01",
  citation:
    "Explicit controlled owned payroll calendar and wage fixture; not an ordinary employer observation.",
  estimatedFrom: "Complete optional fixture rationale retained.",
  generationPriorVintage: "Complete optional fixture vintage retained.",
};
const src = (): Source => ({ ...evidence });
function fixture(
  cash = unit,
  financePolicy = false,
  publicMode?: "direct" | "distinct",
  group = false,
) {
  const owner =
      publicMode === "distinct" ? "actual-fixture-government-owner" : employer,
    governmentFacts = {
      governmentKind: "local-government",
      governmentKey: "actual-fixture-government",
      governmentJurisdictionId: "actual-fixture-jurisdiction",
    },
    calendar: WorkPayrollCalendarInput = {
      id: "actual-fixture-pay-calendar",
      organizationId: employer,
      workCommitmentIds: [commitment],
      basisRecordIds: [employer, job, commitment],
      rule: "fixed-days-after-inclusive-period-end",
      firstPeriodStartsAt: "2021-01-01",
      periodDays: p("daysPerWeek"),
      firstPaydayAt: "2021-01-08",
      effectiveFrom: "2021-01-01",
      nonbusinessDayRule: "no-adjustment",
      arrearsRule: "carry-to-next-recorded-payday",
      source: src(),
    };
  const input: CoreInput = {
    seed: "controlled-primary-payday-cash",
    startedAt: "2021-01-01",
    people: [
      {
        id: worker,
        givenName: "Controlled",
        familyName: "Worker",
        birthDate: "1980-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("zero"),
        familyIds: [],
        knownIds: [],
        jobId: job,
        source: src(),
      },
    ],
    households: [
      { id: "home", placeId: "place", memberIds: [worker], source: src() },
    ],
    jobs: [
      {
        id: job,
        personId: worker,
        organizationId: employer,
        title: "Controlled actual owned job",
        hoursDaily: p("one"),
        hourlyMinor: unit,
        wageDailyMinor: unit,
        source: src(),
      },
    ],
    organizations: [
      {
        id: employer,
        placeId: "place",
        name: "Controlled actual employer",
        kind: "employer",
        liquidMinor: publicMode ? p("zero") : cash,
        source: src(),
        ...(publicMode
          ? {
              governmentFacts,
              ...(publicMode === "direct" ? { outsideFlow: src() } : {}),
              publicPayAuthority: {
                id: "actual-fixture-public-authority",
                ownerId: owner,
                governmentKey: governmentFacts.governmentKey,
                jurisdictionId: governmentFacts.governmentJurisdictionId,
                workCommitmentIds: [commitment],
                basisRecordIds: [employer],
                source: src(),
              },
            }
          : {}),
      },
      {
        id: "cash-fixture-lender",
        placeId: "place",
        name: "Actual controlled finite lender",
        kind: "institution",
        liquidMinor: unit,
        source: src(),
      },
      ...(publicMode === "distinct"
        ? [
            {
              id: owner,
              placeId: "place",
              name: "Actual government zero-stock payer",
              kind: "institution",
              liquidMinor: p("zero"),
              governmentFacts: { ...governmentFacts },
              outsideFlow: src(),
              source: src(),
            },
          ]
        : []),
    ],
    workCommitments: [
      {
        id: commitment,
        payrollCalendarId: calendar.id,
        jobId: job,
        personId: worker,
        organizationId: employer,
        startsAt: "2021-01-01",
        anchorDate: "2021-01-01",
        periodDays: p("one"),
        expectedWeeklyMinutes: p("daysPerWeek") * p("minutesPerHour"),
        hourlyMinor: unit,
        slots: [
          {
            offsetDays: p("zero"),
            startMinute: p("zero"),
            minutes: p("minutesPerHour"),
          },
        ],
        paySource: src(),
        scheduleSource: src(),
        ...(publicMode
          ? { publicPayAuthorityId: "actual-fixture-public-authority" }
          : {}),
      },
    ],
    workPayrollCalendars: [calendar],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const workData = {
    ...DEFAULT_DATA.work!,
    payrollCashModuleId: "work-payroll-cash",
    payrollReceiptIdPrefix: "work-payroll:",
    payrollReceiptCitation:
      "Actual controlled payday cash and accrued wages; no new person choice or guaranteed funding.",
    publicPayrollPayDueCitation:
      "Actual controlled accrued wages due on this recorded payday, no deficit refill or observed appropriation.",
    payrollDispatchCitation:
      "Actual current recorded payday due routing; attendance and cash are distinct.",
    payrollDeceasedHoldCitation:
      "Actual due wages held unchanged because independent deceased-payee authority is pending; no new paid/unpaid cash result.",
    payrollGroupHoldCitation:
      "Actual compatible retained payroll components held unchanged pending one worker/employer/calendar/payday conserving group; no split payments.",
    payrollDispatchOrderRule: "organization-job-commitment-id" as const,
    journalSourceKinds: {
      ...DEFAULT_DATA.work!.journalSourceKinds,
      payroll: "work-payroll",
      payrollCalendar: "work-payroll-calendar",
      earnedPayPeriod: "work-earned-pay-period",
    },
  };
  const firstRow = input.workCommitments![p("zero")]!;
  if (group) {
    input.jobs = [
      ...input.jobs,
      {
        ...input.jobs[p("zero")]!,
        id: "cash-fixture-second-job",
        source: src(),
      },
    ];
    input.workCommitments = [];
    input.workPayrollCalendars = [];
    calendar.workCommitmentIds = [commitment, "cash-fixture-second-work"];
  }
  const core = createLifeCore(input, {
      data: {
        ...DEFAULT_DATA,
        work: workData,
        finance: financePolicy ? DEFAULT_DATA.finance : undefined,
      },
    }),
    api = coreAPI(core);
  if (group) {
    api.addWorkCommitment({ ...firstRow, endsAt: "2021-01-03" });
    api.updatePerson(worker, { jobId: "cash-fixture-second-job" });
    api.addWorkCommitment({
      ...firstRow,
      id: "cash-fixture-second-work",
      jobId: "cash-fixture-second-job",
    });
    api.addWorkPayrollCalendar(calendar);
    api.updatePerson(worker, { jobId: job });
  }
  advanceDate(core, "2021-01-02");
  const action = core.data.work!.attendanceAction,
    row = core.work.commitments.get(commitment)!,
    offer = {
      definition: action,
      targetId: commitment,
      availableHours:
        p("hoursPerDay") - p(core.data.work!.sleepReserveParameter),
      effortHours: p("one"),
    },
    decision = chooseAct(core, worker, [offer]);
  const earned = api.recordWorkAttendance({
    id: `work-result:${core.date}:${commitment}`,
    date: core.date,
    commitmentId: commitment,
    jobId: job,
    personId: worker,
    organizationId: employer,
    plannedMinutes: row.slots[p("zero")]!.minutes,
    attendedMinutes: p("minutesPerHour"),
    absentMinutes: p("zero"),
    earnedMinor: unit,
    payRemainderMinor: p("zero"),
    reasonKey: decision.reasonKey,
    decision,
    source: { ...src(), asOf: core.date },
  });
  ensureWorkPayrollCashModule(core);
  return { core, api, earned, owner, calendar };
}

function books(core: CoreState): BusinessBooksState {
  const row: BusinessBooksState = {
    organizationId: employer,
    kindId: "controlled-books",
    annualPayrollMinor: unit,
    annualDemandMinor: unit,
    annualOtherCostsMinor: p("zero"),
    openingTownIncomeMinor: unit,
    capacityMinor: unit,
    price: p("one"),
    costContractIds: [],
    source: src(),
    lastReviewedAt: core.date,
    reachedIncomeRatio: p("one"),
    anchorAnnualDemandMinor: unit,
    anchorAnnualOtherCostsMinor: p("zero"),
    anchorPrice: p("one"),
    lastGeneralPriceFactor: p("one"),
    lastWagePriceFactor: p("one"),
    nextReviewedAt: "2021-02-01",
    receivedMinor: p("zero"),
    salesReceivedMinor: p("zero"),
    operatingPaidMinor: p("zero"),
    wagesRequestedMinor: p("zero"),
    wagesPaidMinor: p("zero"),
    wagesUnpaidMinor: p("zero"),
  };
  core.finance.businesses.set(employer, row);
  return row;
}
function snapshot(core: CoreState) {
  return structuredClone({
    work: core.work,
    finance: core.finance,
    cash: [...core.organizations].map(([id, row]) => [id, row.liquidMinor]),
    people: [...core.people].map(([id, row]) => [
      id,
      row.liquidMinor,
      row.actCount,
    ]),
    journal: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
  });
}
function earned(
  f: ReturnType<typeof fixture>,
  at: string,
  jid = job,
  cid = commitment,
  absent = false,
) {
  advanceDate(f.core, at);
  const action = absent
      ? f.core.data.work!.absenceAction
      : f.core.data.work!.attendanceAction,
    decision = chooseAct(f.core, worker, [
      {
        definition: action,
        targetId: cid,
        availableHours:
          p("hoursPerDay") - p(f.core.data.work!.sleepReserveParameter),
        effortHours: absent ? p("zero") : p("one"),
      },
    ]);
  return f.api.recordWorkAttendance({
    id: "work-result:" + at + ":" + cid,
    date: at,
    commitmentId: cid,
    jobId: jid,
    personId: worker,
    organizationId: employer,
    plannedMinutes: p("minutesPerHour"),
    attendedMinutes: absent ? p("zero") : p("minutesPerHour"),
    absentMinutes: absent ? p("minutesPerHour") : p("zero"),
    earnedMinor: absent ? p("zero") : unit,
    payRemainderMinor: p("zero"),
    reasonKey: decision.reasonKey,
    decision,
    source: { ...src(), asOf: at },
  });
}
describe("proposed actual WORK payday dispatcher (UNEXECUTED by author)", () => {
  it("has no cash, source or choice effect off recorded payday", () => {
    const f = fixture(),
      before = snapshot(f.core),
      result = runWorkPayrollDay(f.api)!;
    expect(result.settled).toBe(p("zero"));
    expect(result.held).toEqual([]);
    expect(snapshot(f.core)).toEqual(before);
  });
  it("dispatches once after attendance under WORK, with distinct callback and no added payday choice/act", () => {
    const f = fixture();
    let attended = p("zero"),
      payroll = p("zero"),
      legacy = p("zero");
    registerModule(f.core, {
      id: "controlled-payroll-subscriber",
      onWorkAttendance() {
        attended += p("one");
      },
      onWorkPayroll(api, row) {
        payroll += p("one");
        expect(api.state.work.payrollCashSources.get(row.id)!.result).toBe(row);
      },
      onWorkResult() {
        legacy += p("one");
      },
    });
    advanceDate(f.core, "2021-01-08");
    const count = f.core.people.get(worker)!.actCount;
    let choices = p("zero");
    const result = WORK_MODULE.onDay!(
      f.api,
      (person, offers, context) => {
        choices += p("one");
        return chooseAct(
          f.core,
          person,
          offers.filter(
            (offer) =>
              offer.definition.effect ===
              f.core.data.work!.attendanceAction.effect,
          ),
          context,
        );
      },
      () => undefined,
    )!;
    expect(result).toEqual({ decisions: p("one"), acts: p("one") });
    expect(choices).toBe(p("one"));
    expect(payroll).toBe(p("one"));
    expect(attended).toBe(p("one"));
    expect(legacy).toBe(p("zero"));
    expect(f.core.people.get(worker)!.actCount).toBe(count + p("one"));
    expect(f.core.people.get(worker)!.liquidMinor).toBe(unit);
    expect(
      f.core.work.payrollLedgerByCommitment.get(commitment)!.accruedMinor,
    ).toBe(unit);
    const after = snapshot(f.core);
    expect(runWorkPayrollDay(f.api)!.settled).toBe(p("zero"));
    expect(snapshot(f.core)).toEqual(after);
    expect(payroll).toBe(p("one"));
  });
  it("settles actual payday with WORK and no FINANCE module or policy", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-08");
    expect(f.core.modules.has(FINANCE_MODULE.id)).toBe(false);
    expect(f.core.data.finance).toBeUndefined();
    expect(runWorkPayrollDay(f.api)!.settled).toBe(p("one"));
    expect(f.core.people.get(worker)!.liquidMinor).toBe(unit);
    expect(f.core.cashJournal.nextSequence).toBe(p("one"));
  });
  it("dispatches retained ended-job debt independently of active person.jobId", () => {
    const f = fixture();
    f.core.jobs.get(job)!.endsAt = "2021-01-04";
    f.core.work.commitments.get(commitment)!.endsAt = "2021-01-04";
    f.api.updatePerson(worker, { jobId: undefined });
    advanceDate(f.core, "2021-01-08");
    expect(runWorkPayrollDay(f.api)!.settled).toBe(p("one"));
    expect(f.core.people.get(worker)!.liquidMinor).toBe(unit);
  });
  it("keeps older arrears routable even when the latest actual shift is absence-only", () => {
    const f = fixture(p("zero"));
    advanceDate(f.core, "2021-01-08");
    runWorkPayrollDay(f.api);
    earned(f, "2021-01-09", job, commitment, true);
    advanceDate(f.core, "2021-01-15");
    const result = runWorkPayrollDay(f.api)!;
    expect(result.settled).toBe(p("one"));
    expect(f.core.work.latestPayrollByJob.get(job)).toMatchObject({
      newlyDueMinor: 0,
      requestedMinor: unit,
      paidMinor: 0,
      shortfallMinor: unit,
    });
    expect(
      f.core.work.payrollLedgerByCommitment.get(commitment)!.earnedMinor,
    ).toBe(unit);
    expect(
      f.core.work.payrollLedgerByCommitment.get(commitment)!.arrearsMinor,
    ).toBe(unit);
  });
  it("holds a deceased payee's genuine due without world abort, source/queue mutation or false closure", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-08");
    f.api.updatePerson(worker, { alive: false });
    const before = snapshot(f.core);
    const result = runWorkPayrollDay(f.api)!;
    expect(result.settled).toBe(p("zero"));
    expect(result.held).toMatchObject([
      { commitmentId: commitment, reason: "deceased-payee-authority-pending" },
    ]);
    expect(snapshot(f.core)).toEqual(before);
    expect(f.core.work.payrollCashSources.size).toBe(p("zero"));
    expect(f.core.finance.unfundedBusinessReceipts.size).toBe(p("zero"));
  });
  it("holds a later period of a payee who died with a held retry, instead of throwing", () => {
    const f = fixture(p("zero"));
    advanceDate(f.core, "2021-01-08");
    runWorkPayrollDay(f.api);
    f.api.updatePerson(worker, { alive: false });
    advanceDate(f.core, "2021-01-15");
    expect(runWorkPayrollDay(f.api)!.held).toHaveLength(p("one"));
    // The later period's shifts were recorded while the worker was alive; only the payday finds the payee dead.
    f.api.updatePerson(worker, { alive: true });
    earned(f, "2021-01-16", job, commitment);
    f.api.updatePerson(worker, { alive: false });
    advanceDate(f.core, "2021-01-22");
    const result = runWorkPayrollDay(f.api)!;
    expect(result.settled).toBe(p("zero"));
    expect(result.held).toMatchObject([
      { commitmentId: commitment, reason: "deceased-payee-authority-pending" },
    ]);
  });
  it("holds the whole compatible retained-job group atomically when its actual payee has died", () => {
    const f = fixture(unit, false, undefined, true);
    f.api.updatePerson(worker, { jobId: "cash-fixture-second-job" });
    earned(
      f,
      "2021-01-03",
      "cash-fixture-second-job",
      "cash-fixture-second-work",
    );
    advanceDate(f.core, "2021-01-08");
    f.api.updatePerson(worker, { alive: false });
    const before = snapshot(f.core),
      result = runWorkPayrollDay(f.api)!;
    expect(result.settled).toBe(p("zero"));
    expect(result.held).toHaveLength(p("two"));
    expect(
      result.held.every(
        (row) => row.reason === "deceased-payee-authority-pending",
      ),
    ).toBe(true);
    expect(snapshot(f.core)).toEqual(before);
    expect(f.core.work.payrollCashSources.size).toBe(p("zero"));
    expect(f.core.cashJournal.nextSequence).toBe(p("zero"));
  });
  it("dispatches compatible retained jobs once, conserving one aggregate payment and both obligations", () => {
    const f = fixture(unit, false, undefined, true);
    f.api.updatePerson(worker, { jobId: "cash-fixture-second-job" });
    earned(
      f,
      "2021-01-03",
      "cash-fixture-second-job",
      "cash-fixture-second-work",
    );
    advanceDate(f.core, "2021-01-08");
    const acts = f.core.people.get(worker)!.actCount;
    const result = runWorkPayrollDay(f.api)!;
    expect(result.settled).toBe(p("one"));
    expect(result.held).toEqual([]);
    expect(f.core.work.payrollCashSources.size).toBe(p("one"));
    expect(f.core.cashJournal.nextSequence).toBe(p("one"));
    const receipt = f.core.work.latestPayrollByJob.get(job)!;
    expect(receipt).toMatchObject({ requestedMinor: unit });
    const other = f.core.work.latestPayrollByJob.get(
      "cash-fixture-second-job",
    )!;
    expect(receipt.id).toBe(other.id);
    expect(f.core.people.get(worker)!.liquidMinor).toBe(unit);
    expect(f.core.people.get(worker)!.actCount).toBe(acts);
    const ledgers = [...f.core.work.payrollLedgerByCommitment.values()];
    expect(
      ledgers.reduce((n, row) => n + row.dueRecognizedMinor, p("zero")),
    ).toBe(unit * p("two"));
    expect(ledgers.reduce((n, row) => n + row.paidMinor, p("zero"))).toBe(unit);
    expect(ledgers.reduce((n, row) => n + row.arrearsMinor, p("zero"))).toBe(
      unit,
    );
    const after = snapshot(f.core);
    expect(runWorkPayrollDay(f.api)!.settled).toBe(p("zero"));
    expect(snapshot(f.core)).toEqual(after);
  });

  it.each(["dangling", "wrong-date", "lost-reverse-index"] as const)(
    "rejects %s due corruption before money or receipt/index mutation",
    (kind) => {
      const f = fixture();
      advanceDate(f.core, "2021-01-08");
      const period = f.core.work.earnedPayPeriods.get(
        f.earned.earnedPayPeriodId,
      )!;
      if (kind === "dangling") f.core.work.earnedPayPeriods.delete(period.id);
      else if (kind === "wrong-date")
        f.core.work.earnedPayPeriods.set(period.id, {
          ...period,
          dueAt: "2021-01-09",
        });
      else
        f.core.work.earnedPayPeriodByCommitmentIndex
          .get(commitment)!
          .delete(period.index);
      const before = snapshot(f.core);
      expect(() => runWorkPayrollDay(f.api)).toThrow(/due|index|route/);
      expect(snapshot(f.core)).toEqual(before);
    },
  );
  it("rejects an actual payee-state accessor without invoking it or creating a held/cash result", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-08");
    const person = f.core.people.get(worker)!,
      descriptor = Object.getOwnPropertyDescriptor(person, "alive")!;
    let calls = p("zero");
    const before = snapshot(f.core);
    Object.defineProperty(person, "alive", {
      get() {
        calls += p("one");
        return false;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => runWorkPayrollDay(f.api)).toThrow(/accessor|direct own data/);
    expect(calls).toBe(p("zero"));
    Object.defineProperty(person, "alive", descriptor);
    expect(snapshot(f.core)).toEqual(before);
  });
  it("rejects a forged FINANCE payroll callback and closes only its genuine staged positive miss under existing exhausted-cash/credit rules", () => {
    const f = fixture(p("zero"), true);
    books(f.core);
    if (!f.core.modules.has(FINANCE_MODULE.id))
      registerModule(f.core, FINANCE_MODULE);
    advanceDate(f.core, "2021-01-08");
    runWorkPayrollDay(f.api);
    const actual = f.core.work.latestPayrollByJob.get(job)!;
    if (!("payerCashBeforeMinor" in actual))
      throw new Error(
        "Fixture requires its actual single payday cash receipt.",
      );
    expect(f.core.finance.unfundedBusinessReceipts.get(employer)).toEqual({
      date: f.core.date,
      id: actual.id,
    });
    const before = snapshot(f.core);
    expect(() => observeWorkPayrollForFinance(f.api, { ...actual })).toThrow(
      /completed wage source/,
    );
    expect(snapshot(f.core)).toEqual(before);
    FINANCE_MODULE.onAfterDay!(f.api);
    expect(f.core.finance.businesses.get(employer)!.closedAt).toBe(
      "2021-01-08",
    );
    expect(f.core.finance.closures.get(employer)!.sourceReceiptId).toBe(
      actual.id,
    );
    expect(f.core.work.lastResultByJob.size).toBe(p("zero"));
    expect(
      f.core.work.payrollLedgerByCommitment.get(commitment)!.arrearsMinor,
    ).toBe(unit);
  });
});
