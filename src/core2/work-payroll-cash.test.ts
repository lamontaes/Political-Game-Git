/** Source-only proposed real attendance/journal regressions; author did not execute. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { parameter as p } from "./parameters";
import { advanceDate } from "./calendar";
import { createLifeCore, chooseAct } from "./life";
import { coreAPI } from "./state";
import {
  registerControlledPersonV1,
  retireControlledPersonV1,
} from "./player-control-state-v1";
import {
  ensureWorkPayrollCashModule,
  settleWorkPayrollJournal,
  workPayrollCashSourceProvider,
} from "./work-payroll-cash";
import { nextWorkPayrollPeriod, workPayPeriodAtIndex } from "./work-pay-period";
import {
  FinanceReadGuard,
  FinancePlanningSession,
  prepareWorkFinancePlan,
} from "./finance-plan";
import { cashJournalParameters } from "./cash-host";
import type { BusinessBooksState, CreditFacilityState } from "./finance-types";
import type { CoreAPI, CoreInput, CoreState, Source } from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";

const employer = "cash-fixture-employer",
  worker = "cash-fixture-worker",
  job = "cash-fixture-job",
  commitment = "cash-fixture-work",
  unit = p("minorPerDollar"),
  half = unit / p("two");
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
    journalSourceKinds: {
      ...DEFAULT_DATA.work!.journalSourceKinds,
      payroll: "work-payroll",
      payrollCalendar: "work-payroll-calendar",
      earnedPayPeriod: "work-earned-pay-period",
    },
  };
  const core = createLifeCore(input, {
      data: {
        ...DEFAULT_DATA,
        work: workData,
        finance: financePolicy ? DEFAULT_DATA.finance : undefined,
      },
    }),
    api = coreAPI(core);
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
    id: "work-result:" + core.date + ":" + commitment,
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
function state(core: CoreState) {
  return structuredClone({
    cash: [...core.organizations].map(([id, row]) => [id, row.liquidMinor]),
    people: [...core.people].map(([id, row]) => [
      id,
      row.liquidMinor,
      row.actCount,
    ]),
    finance: core.finance,
    work: core.work,
    journal: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
  });
}
function finiteCredit(core: CoreState) {
  const row: CreditFacilityState = {
    id: "actual-fixture-finite-credit",
    borrowerId: employer,
    lenderId: "cash-fixture-lender",
    limitMinor: half,
    active: true,
    annualInterestParameter: "zero",
    source: src(),
    principalMinor: p("zero"),
    interestArrearsMinor: p("zero"),
    lastInterestAt: core.date,
    interestRemainderMinor: p("zero"),
    unbilledInterestMinor: p("zero"),
    lastAccruedAt: core.date,
  };
  core.finance.facilities.set(row.id, row);
  core.finance.facilitiesByBorrower.set(employer, new Set([row.id]));
  return row;
}
function betweenLookups(
  f: ReturnType<typeof fixture>,
  mutate: () => void,
  restore: () => void,
) {
  let calls = p("zero");
  const guarded: CoreAPI = {
    ...f.api,
    postJournal(input) {
      const table = f.core.cashJournal.sourceProviders,
        original = table.get(input.sourceRef.kind)!;
      const wrapper = (reference: Readonly<typeof input.sourceRef>) => {
        calls += p("one");
        table.set(input.sourceRef.kind, original);
        let slot;
        try {
          slot = original(reference);
        } finally {
          table.set(input.sourceRef.kind, wrapper);
        }
        if (calls === p("one")) mutate();
        return slot;
      };
      table.set(input.sourceRef.kind, wrapper);
      try {
        return f.api.postJournal(input);
      } finally {
        restore();
        table.set(input.sourceRef.kind, original);
      }
    },
  };
  return { guarded, calls: () => calls };
}

describe("proposed recorded-payday actual cash writer (UNEXECUTED by author)", () => {
  it("leaves actual attendance earned with no cash, and rejects a nonpayday with no model effect", () => {
    const f = fixture();
    expect(f.core.people.get(worker)!.liquidMinor).toBe(p("zero"));
    expect(f.earned.earnedMinor).toBe(unit);
    expect(f.core.cashJournal.nextSequence).toBe(p("zero"));
    const before = state(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow(
      /recorded payday/,
    );
    expect(state(f.core)).toEqual(before);
  });
  it("uses one conserving journal and no extra person choice with WORK and no FINANCE module/policy", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-08");
    const count = f.core.people.get(worker)!.actCount,
      receipt = settleWorkPayrollJournal(f.core, f.api, commitment);
    expect(f.core.data.finance).toBeUndefined();
    expect(f.core.people.get(worker)!.actCount).toBe(count);
    expect(receipt).toMatchObject({
      requestedMinor: unit,
      newlyDueMinor: unit,
      paidMinor: unit,
      shortfallMinor: 0,
      arrearsAfterMinor: 0,
    });
    expect(f.core.people.get(worker)!.liquidMinor).toBe(unit);
    expect(f.core.organizations.get(employer)!.liquidMinor).toBe(p("zero"));
    expect(f.core.work.payrollLedgerByCommitment.get(commitment)).toMatchObject(
      {
        earnedMinor: unit,
        dueRecognizedMinor: unit,
        paidMinor: unit,
        accruedMinor: 0,
        arrearsMinor: 0,
      },
    );
    expect(f.core.work.earnedPayPeriods.size).toBe(p("zero"));
    expect(f.core.work.payrollPeriodsByDue.size).toBe(p("zero"));
    expect(f.core.work.totalsByJob.get(job)).toMatchObject({
      requestedMinor: unit,
      paidMinor: unit,
    });
    expect(f.core.cashJournal.nextSequence).toBe(p("one"));
    const after = state(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow();
    expect(state(f.core)).toEqual(after);
    if (receipt.group === true)
      throw new Error("Fixture requires its actual single payday receipt.");
    expect(receipt.calendarSource).toEqual(f.calendar.source);
    expect(receipt.paySource.generationPriorVintage).toBe(
      evidence.generationPriorVintage,
    );
  });
  it("recognizes newly due once and pays old arrears by genuine finite credit on the next actual payday", () => {
    const f = fixture(half, true);
    books(f.core);
    advanceDate(f.core, "2021-01-08");
    const first = settleWorkPayrollJournal(f.core, f.api, commitment);
    expect(first).toMatchObject({
      paidMinor: half,
      shortfallMinor: half,
      newlyDueMinor: unit,
    });
    expect(f.core.finance.businesses.get(employer)).toMatchObject({
      wagesRequestedMinor: unit,
      wagesPaidMinor: half,
      wagesUnpaidMinor: half,
    });
    advanceDate(f.core, "2021-01-15");
    const facility = finiteCredit(f.core),
      next = settleWorkPayrollJournal(f.core, f.api, commitment);
    expect(next).toMatchObject({
      newlyDueMinor: 0,
      arrearsBeforeMinor: half,
      requestedMinor: half,
      paidMinor: half,
      paidArrearsMinor: half,
      shortfallMinor: 0,
    });
    expect(f.core.finance.businesses.get(employer)).toMatchObject({
      wagesRequestedMinor: unit,
      wagesPaidMinor: unit,
      wagesUnpaidMinor: 0,
    });
    expect(f.core.finance.facilities.get(facility.id)!.principalMinor).toBe(
      half,
    );
    expect(f.core.organizations.get("cash-fixture-lender")!.liquidMinor).toBe(
      half,
    );
    const actualCredit = f.core.finance.latestCreditByFacility.get(
      facility.id,
    )!;
    expect(f.core.finance.cashSources.get(actualCredit.id)!.trigger.id).toBe(
      next.id,
    );
    expect(f.core.work.payrollArrearsByDue.size).toBe(p("zero"));
    expect(f.core.people.get(worker)!.liquidMinor).toBe(unit);
  });
  it("keeps a zero-cash retry completed once without inventing a journal or recognizing wages twice", () => {
    const f = fixture(p("zero"), true);
    books(f.core);
    advanceDate(f.core, "2021-01-08");
    settleWorkPayrollJournal(f.core, f.api, commitment);
    advanceDate(f.core, "2021-01-15");
    const receipt = settleWorkPayrollJournal(f.core, f.api, commitment);
    expect(receipt).toMatchObject({
      newlyDueMinor: 0,
      requestedMinor: unit,
      paidMinor: 0,
      shortfallMinor: unit,
    });
    expect(f.core.finance.businesses.get(employer)!.wagesRequestedMinor).toBe(
      unit,
    );
    expect(f.core.finance.businesses.get(employer)!.wagesUnpaidMinor).toBe(
      unit,
    );
    expect(f.core.cashJournal.nextSequence).toBe(p("zero"));
    expect(f.core.work.payrollCashSources.get(receipt.id)!.completedAt).toBe(
      "2021-01-15",
    );
    const before = state(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow();
    expect(state(f.core)).toEqual(before);
  });
  it("pays a retained ended job on its own payday and holds deceased-payee debt without a fictional cash shortfall", () => {
    const f = fixture();
    f.core.jobs.get(job)!.endsAt = "2021-01-04";
    f.core.work.commitments.get(commitment)!.endsAt = "2021-01-04";
    delete f.core.people.get(worker)!.jobId;
    advanceDate(f.core, "2021-01-08");
    expect(settleWorkPayrollJournal(f.core, f.api, commitment).paidMinor).toBe(
      unit,
    );
    const dead = fixture();
    advanceDate(dead.core, "2021-01-08");
    dead.core.people.get(worker)!.alive = false;
    const before = state(dead.core);
    expect(() =>
      settleWorkPayrollJournal(dead.core, dead.api, commitment),
    ).toThrow(/deceased-payee/);
    expect(state(dead.core)).toEqual(before);
    expect(
      dead.core.work.payrollLedgerByCommitment.get(commitment)!.accruedMinor,
    ).toBe(unit);
  });
  it("keeps genuine same-day accrued wages after an actual missed-payday closure, with an inclusive commitment end", () => {
    const f = fixture(p("zero"), true);
    books(f.core);
    advanceDate(f.core, "2021-01-08");
    const action = f.core.data.work!.attendanceAction,
      decision = chooseAct(f.core, worker, [
        {
          definition: action,
          targetId: commitment,
          availableHours:
            p("hoursPerDay") - p(f.core.data.work!.sleepReserveParameter),
          effortHours: p("one"),
        },
      ]);
    const final = f.api.recordWorkAttendance({
      id: "work-result:" + f.core.date + ":" + commitment,
      date: f.core.date,
      commitmentId: commitment,
      jobId: job,
      personId: worker,
      organizationId: employer,
      plannedMinutes: p("minutesPerHour"),
      attendedMinutes: p("minutesPerHour"),
      absentMinutes: p("zero"),
      earnedMinor: unit,
      payRemainderMinor: p("zero"),
      reasonKey: decision.reasonKey,
      decision,
      source: { ...src(), asOf: f.core.date },
    });
    const missed = settleWorkPayrollJournal(f.core, f.api, commitment);
    expect(missed.shortfallMinor).toBe(unit);
    const closure = f.api.closeEmployer(
      employer,
      missed.id,
      f.core.data.finance!.reasons.closure,
    );
    expect(closure.endedJobIds).toContain(job);
    expect(f.core.jobs.get(job)!.endsAt).toBe(final.date);
    expect(f.core.work.commitments.get(commitment)!.endsAt).toBe(final.date);
    advanceDate(f.core, "2021-01-15");
    const retained = f.core.finance.closures.get(employer)!,
      savedSource = retained.source,
      savedJobs = retained.endedJobIds;
    retained.source = { ...savedSource, asOf: "2021-01-16" };
    let before = state(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow(
      /Source is unavailable/,
    );
    expect(state(f.core)).toEqual(before);
    retained.source = savedSource;
    retained.endedJobIds = [];
    before = state(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow(
      /retained attendance and closure/,
    );
    expect(state(f.core)).toEqual(before);
    retained.endedJobIds = savedJobs;
    const paid = settleWorkPayrollJournal(f.core, f.api, commitment);
    expect(paid.newlyDueMinor).toBe(unit);
    expect(paid.arrearsBeforeMinor).toBe(unit);
    expect(paid.paidMinor).toBe(p("zero"));
    expect(f.core.work.payrollLedgerByCommitment.get(commitment)).toMatchObject(
      {
        earnedMinor: unit * p("two"),
        dueRecognizedMinor: unit * p("two"),
        paidMinor: p("zero"),
        arrearsMinor: unit * p("two"),
      },
    );
    expect(f.core.finance.businesses.get(employer)!.wagesUnpaidMinor).toBe(
      unit * p("two"),
    );
  });
  it("rejects an ordinary ended-job final-day record without genuine closure, and rejects future unearned bounds", () => {
    const f = fixture();
    f.core.jobs.get(job)!.endsAt = f.earned.date;
    f.core.work.commitments.get(commitment)!.endsAt = f.earned.date;
    advanceDate(f.core, "2021-01-08");
    const before = state(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow(
      /retained attendance and closure/,
    );
    expect(state(f.core)).toEqual(before);
    const future = fixture();
    future.core.work.commitments.get(commitment)!.endsAt = "2021-01-01";
    advanceDate(future.core, "2021-01-08");
    const original = state(future.core);
    expect(() =>
      settleWorkPayrollJournal(future.core, future.api, commitment),
    ).toThrow(/employment bounds/);
    expect(state(future.core)).toEqual(original);
  });
  it.each(["direct", "distinct"] as const)(
    "funds only actual recorded public payday wages through zero-stock %s owner",
    (mode) => {
      const f = fixture(p("zero"), false, mode);
      advanceDate(f.core, "2021-01-08");
      const receipt = settleWorkPayrollJournal(f.core, f.api, commitment);
      expect(receipt.publicPayDue!.amountMinor).toBe(unit);
      expect(receipt.publicPayDue!.ownerId).toBe(f.owner);
      expect(f.core.organizations.get(f.owner)!.liquidMinor).toBe(p("zero"));
      expect(f.core.people.get(worker)!.liquidMinor).toBe(unit);
      expect(
        f.core.cashJournal.externalFlowsByOwner.get(f.owner)!.outgoingMinor,
      ).toBe(unit);
      expect(
        f.core.cashJournal.externalFlowsByOwner.get(f.owner)!.netMinor,
      ).toBe(-unit);
      const row = f.core.work.payrollCashSources.get(receipt.id)!;
      expect(row.references.some((ref) => ref.id === receipt.calendarId)).toBe(
        true,
      );
      expect(
        row.references.some((ref) => ref.id === receipt.earnedPeriodId),
      ).toBe(true);
      expect(
        row.references.some(
          (ref) => ref.id === receipt.publicPayDue!.authorityId,
        ),
      ).toBe(true);
    },
  );
  it("rejects a changed calendar identity even with all copied terms/Sources, and rejects lost due membership", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-08");
    const saved = f.core.work.payrollCalendars.get(f.calendar.id)!;
    f.core.work.payrollCalendars.set(
      saved.id,
      Object.freeze({ ...saved, source: Object.freeze({ ...saved.source }) }),
    );
    const before = state(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow(
      /genuine owning admission/,
    );
    expect(state(f.core)).toEqual(before);
    f.core.work.payrollCalendars.set(saved.id, saved);
    const members = f.core.work.payrollPeriodsByDue.get(f.core.date)!;
    members.clear();
    const lost = state(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow(
      /actual due index/,
    );
    expect(state(f.core)).toEqual(lost);
  });
  it("rejects Source accessor without invocation, and ignores Proxy get misinformation at all guarded earned-period reads", () => {
    const f = fixture();
    advanceDate(f.core, "2021-01-08");
    const actual = f.core.jobs.get(job)!,
      descriptor = Object.getOwnPropertyDescriptor(actual, "source")!;
    let calls = p("zero");
    Object.defineProperty(actual, "source", {
      get() {
        calls += p("one");
        return src();
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => settleWorkPayrollJournal(f.core, f.api, commitment)).toThrow(
      /accessor|direct own data/,
    );
    expect(calls).toBe(p("zero"));
    Object.defineProperty(actual, "source", descriptor);
    const periodId = f.earned.earnedPayPeriodId,
      original = f.core.work.earnedPayPeriods.get(periodId)!;
    let gets = p("zero");
    f.core.work.earnedPayPeriods.set(
      periodId,
      new Proxy(original, {
        get() {
          gets += p("one");
          throw new Error("Raw proxy get must not supply payroll evidence.");
        },
      }),
    );
    expect(settleWorkPayrollJournal(f.core, f.api, commitment).paidMinor).toBe(
      unit,
    );
    expect(gets).toBe(p("zero"));
  });
  it.each(["ledger", "source"] as const)(
    "rejects %s drift after the first real provider lookup, before cash/metadata/markers",
    (target) => {
      const f = fixture();
      advanceDate(f.core, "2021-01-08");
      const ledger = f.core.work.payrollLedgerByCommitment.get(commitment)!,
        actualJob = f.core.jobs.get(job)!,
        originalSource = actualJob.source,
        before = state(f.core);
      const hooks = betweenLookups(
        f,
        () => {
          if (target === "ledger")
            f.core.work.payrollLedgerByCommitment.set(commitment, {
              ...ledger,
              earnedMinor: ledger.earnedMinor + p("one"),
              accruedMinor: ledger.accruedMinor + p("one"),
            });
          else
            actualJob.source = {
              ...originalSource,
              citation: "Wrong actual Source after first real lookup",
            };
        },
        () => {
          f.core.work.payrollLedgerByCommitment.set(commitment, ledger);
          actualJob.source = originalSource;
        },
      );
      expect(() =>
        settleWorkPayrollJournal(f.core, hooks.guarded, commitment),
      ).toThrow();
      // Ledger replacement is rejected by the original journal metadata preflight
      // before lookup two. A changed job Source is rejected at lookup two.
      expect(hooks.calls()).toBe(target === "ledger" ? p("one") : p("two"));
      expect(state(f.core)).toEqual(before);
    },
  );
  it("preserves default requested recognition and rejects a negative unpaid book on an invalid arrears projection", () => {
    const f = fixture(unit, true);
    books(f.core);
    advanceDate(f.core, "2021-01-08");
    const regular = new FinancePlanningSession(
      f.core,
      f.core.cashJournal,
      cashJournalParameters(f.core),
    );
    prepareWorkFinancePlan(
      regular,
      employer,
      worker,
      unit,
      "controlled-default-request",
    );
    expect(f.core.finance.businesses.get(employer)!.wagesRequestedMinor).toBe(
      p("zero"),
    );
    expect(
      regular.metadata.field(
        f.core.finance.businesses.get(employer)!,
        "wagesRequestedMinor",
      ),
    ).toBe(unit);
    const invalid = new FinancePlanningSession(
        f.core,
        f.core.cashJournal,
        cashJournalParameters(f.core),
      ),
      before = state(f.core);
    expect(() =>
      prepareWorkFinancePlan(
        invalid,
        employer,
        worker,
        unit,
        "controlled-invalid-arrears",
        p("zero"),
      ),
    ).toThrow();
    expect(state(f.core)).toEqual(before);
  });
  it("shares the exact true monthly payday query and rejects unavailable future calendar evidence", () => {
    const monthly: WorkPayrollCalendarInput = {
        ...fixture().calendar,
        rule: "calendar-months-after-inclusive-period-end",
        periodDays: undefined,
        periodMonths: p("one"),
        nominalBoundaryDays: [p("one")],
        shortMonthRule: "clamp-to-calendar-month-end",
        firstPaydayAt: "2021-02-01",
      },
      u = { zero: p("zero"), one: p("one"), monthsPerYear: p("monthsPerYear") };
    expect(
      nextWorkPayrollPeriod(
        new FinanceReadGuard(),
        monthly,
        "2021-02-02",
        "2021-01-02",
        u,
      ).dueAt,
    ).toBe("2021-03-01");
    expect(
      workPayPeriodAtIndex(
        new FinanceReadGuard(),
        monthly,
        p("one"),
        "2021-01-02",
        u,
      ).throughAt,
    ).toBe("2021-02-28");
    expect(() =>
      nextWorkPayrollPeriod(
        new FinanceReadGuard(),
        { ...monthly, source: { ...monthly.source, asOf: "2021-02-01" } },
        "2021-02-02",
        "2021-01-02",
        u,
      ),
    ).toThrow(/available/);
  });
});

it("returns a frozen payday result that cannot corrupt retained monetary evidence", () => {
  const f = fixture();
  advanceDate(f.core, "2021-01-08");
  const receipt = settleWorkPayrollJournal(f.core, f.api, commitment),
    row = f.core.work.payrollCashSources.get(receipt.id)!;
  expect(Reflect.set(receipt, "paidMinor", p("zero"))).toBe(false);
  expect(
    Reflect.set(
      receipt.calendarSource,
      "citation",
      "corrupted caller calendar",
    ),
  ).toBe(false);
  expect(row.result.paidMinor).toBe(unit);
  expect(f.core.people.get(worker)!.liquidMinor).toBe(unit);
  expect(
    workPayrollCashSourceProvider(f.api, { kind: row.kind, id: row.id })!
      .marker,
  ).toBe(row);
});

// Additive explicit control retention fixtures. SOURCE ONLY; UNEXECUTED.
describe("explicitly controlled quiet single payroll retention", () => {
  it("keeps the actual canonical job receipt and full journal after retirement without changing payment", () => {
    const f = fixture(),
      baseline = fixture(),
      token = registerControlledPersonV1(f.core, worker);
    advanceDate(f.core, "2021-01-08");
    advanceDate(baseline.core, "2021-01-08");
    const result = settleWorkPayrollJournal(f.core, f.api, commitment),
      ordinary = settleWorkPayrollJournal(
        baseline.core,
        baseline.api,
        commitment,
      ),
      canonical = f.core.work.payrollCashSources.get(result.id)!;
    expect(result.paidMinor).toBe(ordinary.paidMinor);
    expect(result.requestedMinor).toBe(ordinary.requestedMinor);
    expect(f.core.work.payrollLedgerByCommitment).toEqual(
      baseline.core.work.payrollLedgerByCommitment,
    );
    expect(f.core.work.detailedPayroll.get(result.id)).toBe(canonical.result);
    expect(f.core.work.latestPayrollByJob.get(job)).toBe(canonical.result);
    const journalId = f.core.cashJournal.requiredBySource
      .get(canonical.kind)!
      .get(result.id)!;
    expect(journalId).toBeDefined();
    expect(
      f.core.cashJournal.detailedReceipts.get(journalId)!.sourceRef.id,
    ).toBe(result.id);
    expect(f.core.playerId).toBeUndefined();
    expect(f.core.focusPersonIds.size).toBe(p("zero"));
    expect(f.core.people.get(worker)!.tier).toBe("weekly");
    retireControlledPersonV1(f.core, token);
    expect(
      workPayrollCashSourceProvider(f.api, {
        kind: canonical.kind,
        id: canonical.id,
      })!.retainFull,
    ).toBe(true);
    expect(
      f.core.cashJournal.requiredBySource.get(canonical.kind)!.get(result.id),
    ).toBe(journalId);
  });
  it("retains an actual zero-payment completion and arrears without a fake journal", () => {
    const f = fixture(p("zero"));
    registerControlledPersonV1(f.core, worker);
    advanceDate(f.core, "2021-01-08");
    const before = structuredClone(f.core.cashJournal.totals),
      sequence = f.core.cashJournal.nextSequence,
      result = settleWorkPayrollJournal(f.core, f.api, commitment),
      canonical = f.core.work.payrollCashSources.get(result.id)!;
    expect(result.paidMinor).toBe(p("zero"));
    expect(result.shortfallMinor).toBe(unit);
    expect(f.core.work.detailedPayroll.get(result.id)).toBe(canonical.result);
    expect(canonical.completedAt).toBe(f.core.date);
    expect(canonical.postedJournalSequence).toBeUndefined();
    expect(f.core.cashJournal.totals).toEqual(before);
    expect(f.core.cashJournal.nextSequence).toBe(sequence);
    expect(f.core.cashJournal.detailedReceipts.size).toBe(p("zero"));
    expect(
      f.core.work.payrollLedgerByCommitment.get(commitment)!.arrearsMinor,
    ).toBe(unit);
  });
  it("rejects control retirement between genuine payroll provider lookups without changing any money or work row", () => {
    const f = fixture(),
      token = registerControlledPersonV1(f.core, worker);
    advanceDate(f.core, "2021-01-08");
    const before = state(f.core),
      hook = betweenLookups(
        f,
        () => retireControlledPersonV1(f.core, token),
        () => undefined,
      );
    expect(() =>
      settleWorkPayrollJournal(f.core, hook.guarded, commitment),
    ).toThrow(/Explicit control changed/);
    expect(hook.calls()).toBeGreaterThanOrEqual(p("two"));
    expect(state(f.core)).toEqual(before);
  });
});
