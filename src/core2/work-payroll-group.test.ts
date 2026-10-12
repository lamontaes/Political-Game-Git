import { resolveSavedTraceV1 } from "./saved-trace-v1";
/** Additive actual attendance/cash fixtures. UNEXECUTED by the source-only author. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { parameter as p } from "./parameters";
import { advanceDate } from "./calendar";
import { makeIsoDate } from "../simulation/dates";
import { createLifeCore, chooseAct } from "./life";
import { coreAPI } from "./state";
import { payrollStockObservables } from "./tooling/payroll-observables";
import { financeObservables } from "./tooling/finance-observables";
import { summarizeWorkObservables } from "./tooling/work-observables";
import {
  ensureWorkPayrollCashModule,
  settleWorkPayrollJournal,
  workPayrollCashSourceProvider,
  verifyCurrentWorkPayrollGroup,
} from "./work-payroll-cash";
import { ensureFinanceCashModule } from "./finance-cash";
import {
  registerControlledPersonV1,
  retireControlledPersonV1,
} from "./player-control-state-v1";
import type {
  WorkPayrollGroupReceipt,
  WorkPayrollGroupSourceState,
} from "./work-payroll-cash";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
import type {
  CoreAPI,
  CoreInput,
  CoreState,
  Source,
  WorkCommitmentInput,
} from "./types";
import type { BusinessBooksState, CreditFacilityState } from "./finance-types";

const employer = "group-fixture-employer",
  worker = "group-fixture-worker",
  jobA = "group-fixture-job-a",
  jobB = "group-fixture-job-b",
  a = "group-fixture-commitment-a",
  b = "group-fixture-commitment-b",
  calId = "group-fixture-calendar",
  unit = p("minorPerDollar"),
  half = unit / p("two");
const src = (): Source => ({
  tag: "SOURCED",
  asOf: "2020-12-01",
  citation:
    "Controlled supplied retained jobs and employer payroll calendar; fixture evidence only.",
  estimatedFrom: "Optional full fixture rationale preserved.",
  generationPriorVintage: "Optional full fixture vintage preserved.",
});
function fixture(cash = unit * p("two"), publicMode?: "direct" | "distinct") {
  const owner =
      publicMode === "distinct" ? "group-fixture-government-owner" : employer,
    facts = {
      governmentKind: "local-government",
      governmentKey: "group-fixture-government",
      governmentJurisdictionId: "group-fixture-jurisdiction",
    },
    authority = {
      id: "group-fixture-authority",
      ownerId: owner,
      governmentKey: facts.governmentKey,
      jurisdictionId: facts.governmentJurisdictionId,
      workCommitmentIds: [a, b],
      basisRecordIds: [employer],
      source: src(),
    },
    input: CoreInput = {
      seed: "controlled-same-worker-payroll-group",
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
          jobId: jobA,
          source: src(),
        },
      ],
      households: [
        { id: "home", placeId: "place", memberIds: [worker], source: src() },
      ],
      jobs: [
        {
          id: jobA,
          personId: worker,
          organizationId: employer,
          title: "Controlled retained old job",
          hoursDaily: p("one"),
          hourlyMinor: unit,
          wageDailyMinor: unit,
          source: src(),
        },
        {
          id: jobB,
          personId: worker,
          organizationId: employer,
          title: "Controlled replacement job",
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
          name: "Controlled employer",
          kind: "employer",
          liquidMinor: publicMode ? p("zero") : cash,
          source: src(),
          ...(publicMode
            ? {
                governmentFacts: facts,
                publicPayAuthority: authority,
                ...(publicMode === "direct" ? { outsideFlow: src() } : {}),
              }
            : {}),
        },
        {
          id: "group-fixture-lender",
          placeId: "place",
          name: "Controlled finite lender",
          kind: "institution",
          liquidMinor: unit * (p("two") + p("one")),
          source: src(),
        },
        ...(publicMode === "distinct"
          ? [
              {
                id: owner,
                placeId: "place",
                name: "Controlled public outside payer",
                kind: "institution",
                liquidMinor: p("zero"),
                governmentFacts: { ...facts },
                outsideFlow: src(),
                source: src(),
              },
            ]
          : []),
      ],
      workCommitments: [],
      workPayrollCalendars: [],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    };
  const core = createLifeCore(input, { data: DEFAULT_DATA }),
    api = coreAPI(core),
    commitment = (
      id: string,
      jobId: string,
      startsAt: string,
      endsAt?: string,
    ): WorkCommitmentInput => ({
      id,
      jobId,
      personId: worker,
      organizationId: employer,
      payrollCalendarId: calId,
      startsAt,
      ...(endsAt ? { endsAt } : {}),
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
      ...(publicMode ? { publicPayAuthorityId: authority.id } : {}),
    }),
    calendar: WorkPayrollCalendarInput = {
      id: calId,
      organizationId: employer,
      workCommitmentIds: [a, b],
      basisRecordIds: [employer, jobA, jobB, a, b],
      rule: "fixed-days-after-inclusive-period-end",
      periodDays: p("daysPerWeek"),
      firstPeriodStartsAt: "2021-01-01",
      firstPaydayAt: "2021-01-08",
      effectiveFrom: "2021-01-01",
      nonbusinessDayRule: "no-adjustment",
      arrearsRule: "carry-to-next-recorded-payday",
      source: src(),
    };
  // Controlled supplied-term enrollment precedes all attendance. Primary ownership is
  // set for each canonical commitment admission, then restored to the original job.
  api.addWorkCommitment(commitment(a, jobA, "2021-01-01", "2021-01-03"));
  core.people.get(worker)!.jobId = jobB;
  api.addWorkCommitment(commitment(b, jobB, "2021-01-04"));
  core.people.get(worker)!.jobId = jobA;
  api.addWorkPayrollCalendar(calendar);
  ensureWorkPayrollCashModule(core);
  ensureFinanceCashModule(core);
  return { core, api, owner, calendar, input };
}
function earn(
  f: ReturnType<typeof fixture>,
  id: string,
  date: string,
  absent = false,
) {
  advanceDate(f.core, makeIsoDate(date));
  // A supplied commitment may end in the future; a completed job end cannot.
  // Record the controlled fixture's old-job end only after its dated span ends.
  const oldEnd = f.core.work.commitments.get(a)!.endsAt;
  if (id === b && oldEnd !== undefined && oldEnd < f.core.date)
    f.core.jobs.get(jobA)!.endsAt = oldEnd;
  const row = f.core.work.commitments.get(id)!,
    actor = f.core.people.get(worker)!;
  actor.jobId = row.jobId;
  const cfg = f.core.data.work!,
    definition = absent ? cfg.absenceAction : cfg.attendanceAction,
    decision = chooseAct(f.core, worker, [
      {
        definition,
        targetId: id,
        availableHours: p("hoursPerDay") - p(cfg.sleepReserveParameter),
        effortHours: p("one"),
      },
    ]);
  return f.api.recordWorkAttendance({
    id: "work-result:" + date + ":" + id,
    date,
    commitmentId: id,
    jobId: row.jobId,
    personId: worker,
    organizationId: employer,
    plannedMinutes: p("minutesPerHour"),
    attendedMinutes: absent ? p("zero") : p("minutesPerHour"),
    absentMinutes: absent ? p("minutesPerHour") : p("zero"),
    earnedMinor: absent ? p("zero") : unit,
    payRemainderMinor: p("zero"),
    reasonKey: decision.reasonKey,
    decision,
    source: { ...src(), asOf: date },
  });
}
function earned(f: ReturnType<typeof fixture>, absent = false) {
  earn(f, a, "2021-01-02", absent);
  earn(f, b, "2021-01-04", absent);
  advanceDate(f.core, "2021-01-08");
  return f;
}
function group(f: ReturnType<typeof fixture>, id = a): WorkPayrollGroupReceipt {
  const result = settleWorkPayrollJournal(f.core, f.api, id);
  if (result.group !== true)
    throw new Error("Fixture expected actual retained group.");
  return result;
}
function snapshot(core: CoreState) {
  return structuredClone({
    people: core.people,
    organizations: core.organizations,
    jobs: core.jobs,
    work: core.work,
    finance: core.finance,
    journal: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
    durableLog: core.durableLog,
    eventIds: core.eventIds,
  });
}
function books(core: CoreState) {
  const row: BusinessBooksState = {
    organizationId: employer,
    kindId: "controlled-books",
    annualPayrollMinor: unit * p("two"),
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
/** A separately supplied finite standing transfer funds this controlled retry; no cash field is topped up. */
function fund(f: ReturnType<typeof fixture>, amountMinor: number) {
  const id = "group-fixture-supplied-funding:" + f.core.date;
  f.api.addFinanceContract({
    id,
    payerIds: ["group-fixture-lender"],
    payeeId: employer,
    kind: f.core.data.finance!.kinds.operating,
    amountMinor,
    dueAt: f.core.date,
    periodMonths: p("one"),
    accruesArrears: false,
    salesReceipt: false,
    settlementPhaseId: f.core.data.finance!.defaultPhases.funding,
    source: src(),
  });
  const receipt = f.api.settleFinanceContract(id);
  expect(receipt.paidMinor).toBe(amountMinor);
}
function betweenLookups(
  f: ReturnType<typeof fixture>,
  mutate: () => void,
  restore: () => void,
) {
  let calls = p("zero");
  const api: CoreAPI = {
    ...f.api,
    postJournal(input) {
      const providers = f.core.cashJournal.sourceProviders,
        original = providers.get(input.sourceRef.kind)!,
        wrapper = (ref: Readonly<typeof input.sourceRef>) => {
          calls += p("one");
          providers.set(input.sourceRef.kind, original);
          let slot;
          try {
            slot = original(ref);
          } finally {
            providers.set(input.sourceRef.kind, wrapper);
          }
          if (calls === p("one")) mutate();
          return slot;
        };
      providers.set(input.sourceRef.kind, wrapper);
      try {
        return f.api.postJournal(input);
      } finally {
        restore();
        providers.set(input.sourceRef.kind, original);
      }
    },
  };
  return { api, calls: () => calls };
}

describe("one conserving retained-commitment payroll group (SOURCE_ONLY, UNEXECUTED)", () => {
  it("pays the ended original job and replacement job in one journal with exact per-job views and no fresh act", () => {
    const f = earned(fixture()),
      beforeActs = f.core.people.get(worker)!.actCount,
      paid = group(f),
      row = f.core.work.payrollCashSources.get(
        paid.id,
      ) as WorkPayrollGroupSourceState;
    expect(paid.group).toBe(true);
    expect(paid.jobId).toBeUndefined();
    expect(paid.commitmentId).toBeUndefined();
    expect(paid.components.map((c) => c.commitmentId)).toEqual([a, b]);
    expect(paid.requestedMinor).toBe(unit * p("two"));
    expect(paid.paidMinor).toBe(unit * p("two"));
    expect(f.core.cashJournal.nextSequence).toBe(p("one"));
    expect(row.postings).toHaveLength(p("two"));
    expect(f.core.people.get(worker)!.liquidMinor).toBe(unit * p("two"));
    expect(f.core.organizations.get(employer)!.liquidMinor).toBe(p("zero"));
    expect(f.core.people.get(worker)!.actCount).toBe(beforeActs);
    expect(f.core.work.earnedPayPeriods.size).toBe(p("zero"));
    expect(f.core.work.payrollPeriodsByDue.has(f.core.date)).toBe(false);
    for (
      let index = p("zero");
      index < row.componentStates.length;
      index += p("one")
    ) {
      const state = row.componentStates[index]!,
        view = state.result;
      expect(row.result.components[index]).toBe(view);
      expect(f.core.work.latestPayrollByJob.get(view.jobId)).toBe(view);
      expect(view.paidMinor).toBe(unit);
      expect(
        f.core.work.payrollLedgerByCommitment.get(view.commitmentId),
      ).toEqual(state.ledgerAfter);
      expect(view.calendarSource).toEqual(f.calendar.source);
      expect(view.paySource.estimatedFrom).toBe(src().estimatedFrom);
      expect(view.paySource.generationPriorVintage).toBe(
        src().generationPriorVintage,
      );
    }
    expect(() =>
      verifyCurrentWorkPayrollGroup(f.api, row.result),
    ).not.toThrow();
    expect(
      workPayrollCashSourceProvider(f.api, { kind: row.kind, id: row.id })!
        .marker,
    ).toBe(row);
    const after = snapshot(f.core);
    expect(() => group(f, b)).toThrow(/Duplicate|stale/);
    expect(snapshot(f.core)).toEqual(after);
  });
  it("uses the same group identity and allocation whichever actual member triggers the group", () => {
    const left = earned(fixture(unit)),
      right = earned(fixture(unit)),
      x = group(left, a),
      y = group(right, b);
    expect(x).toEqual(y);
    expect(x.components.map((c) => c.paidMinor)).toEqual([unit, p("zero")]);
    expect(left.core.work.totalsByJob.get(jobA)!.paidMinor).toBe(unit);
    expect(left.core.work.totalsByJob.get(jobB)!.paidMinor).toBe(p("zero"));
  });
  it("conserves partial wages in each ledger and recognizes newly due book wages once", () => {
    const f = fixture(half),
      book = books(f.core);
    earned(f);
    const first = group(f);
    expect(first.components.map((c) => c.paidMinor)).toEqual([half, p("zero")]);
    expect(book.wagesRequestedMinor).toBe(unit * p("two"));
    expect(book.wagesPaidMinor).toBe(half);
    expect(book.wagesUnpaidMinor).toBe(unit * p("two") - half);
    expect(f.core.work.payrollArrearsByDue.get("2021-01-15")).toEqual(
      new Set([a, b]),
    );
    advanceDate(f.core, "2021-01-15");
    fund(f, unit);
    const second = group(f, b);
    expect(second.newlyDueMinor).toBe(p("zero"));
    expect(second.arrearsBeforeMinor).toBe(unit * p("two") - half);
    expect(second.components.map((c) => c.paidMinor)).toEqual([half, half]);
    expect(
      second.components.every((c) => c.priorPayrollReceiptId === first.id),
    ).toBe(true);
    expect(book.wagesRequestedMinor).toBe(unit * p("two"));
    expect(book.wagesUnpaidMinor).toBe(half);
    expect(f.core.people.get(worker)!.liquidMinor).toBe(unit + half);
    expect(f.core.cashJournal.nextSequence).toBe(p("two") + p("one"));
    const original = f.core.work.payrollCashSources.get(first.id)!;
    expect(
      workPayrollCashSourceProvider(f.api, {
        kind: original.kind,
        id: first.id,
      })!.marker,
    ).toBe(original);
  });
  it("attributes all aggregate arrears before any newly due wage, without claiming debt age", () => {
    const f = fixture(p("zero")),
      book = books(f.core);
    earned(f);
    group(f);
    earn(f, b, "2021-01-09");
    advanceDate(f.core, "2021-01-15");
    fund(f, unit * p("two") + half);
    const paid = group(f, b);
    expect(paid.newlyDueMinor).toBe(unit);
    expect(paid.arrearsBeforeMinor).toBe(unit * p("two"));
    expect(paid.paidArrearsMinor).toBe(unit * p("two"));
    expect(paid.paidNewlyDueMinor).toBe(half);
    expect(
      paid.components.map((c) => [c.paidArrearsMinor, c.paidNewlyDueMinor]),
    ).toEqual([
      [unit, p("zero")],
      [unit, half],
    ]);
    expect(paid.accountingAttributionRule).toBe(
      "arrears-then-newly-due-commitment-id",
    );
    expect(paid.attributionSource.tag).toBe("ESTIMATED");
    expect(paid.attributionSource.estimatedFrom).toMatch(
      /do not establish.*debt age/,
    );
    expect(book.wagesRequestedMinor).toBe(unit * (p("two") + p("one")));
    expect(book.wagesUnpaidMinor).toBe(half);
  });
  it("draws the actual finite credit facility once for the aggregate rather than once per retained job", () => {
    const f = fixture(p("zero"));
    books(f.core);
    const facility: CreditFacilityState = {
      id: "group-finite-facility",
      borrowerId: employer,
      lenderId: "group-fixture-lender",
      limitMinor: unit,
      active: true,
      annualInterestParameter: "zero",
      source: src(),
      principalMinor: p("zero"),
      interestArrearsMinor: p("zero"),
      lastInterestAt: f.core.date,
      interestRemainderMinor: p("zero"),
      unbilledInterestMinor: p("zero"),
      lastAccruedAt: f.core.date,
    };
    f.core.finance.facilities.set(facility.id, facility);
    f.core.finance.facilitiesByBorrower.set(employer, new Set([facility.id]));
    earned(f);
    const paid = group(f),
      row = f.core.work.payrollCashSources.get(paid.id)!;
    expect(row.credits).toHaveLength(p("one"));
    expect(
      f.core.finance.cashSources.get(row.credits[p("zero")]!.id)!.trigger.id,
    ).toBe(paid.id);
    expect(facility.principalMinor).toBe(unit);
    expect(paid.paidMinor).toBe(unit);
    expect(paid.shortfallMinor).toBe(unit);
    expect(f.core.cashJournal.nextSequence).toBe(p("one"));
    expect(f.core.organizations.get("group-fixture-lender")!.liquidMinor).toBe(
      unit * p("two"),
    );
  });
  it.each(["direct", "distinct"] as const)(
    "uses one %s zero-stock public authorization containing every actual component",
    (mode) => {
      const f = earned(fixture(p("zero"), mode)),
        paid = group(f),
        due = paid.publicPayDue!,
        row = f.core.work.payrollCashSources.get(paid.id)!;
      expect(due.components.map((c) => c.commitmentId)).toEqual([a, b]);
      expect(new Set(due.components.map((c) => c.id)).size).toBe(p("two"));
      expect(due.amountMinor).toBe(unit * p("two"));
      expect(
        due.components.every(
          (c) =>
            c.authorityId === due.authorityId &&
            c.ownerId === due.ownerId &&
            c.personId === worker,
        ),
      ).toBe(true);
      expect(paid.paidMinor).toBe(due.amountMinor);
      expect(f.core.organizations.get(f.owner)!.liquidMinor).toBe(p("zero"));
      expect(
        f.core.cashJournal.externalFlowsByOwner.get(f.owner)!.outgoingMinor,
      ).toBe(due.amountMinor);
      expect(
        f.core.cashJournal.externalFlowsByOwner.get(f.owner)!.netMinor,
      ).toBe(-due.amountMinor);
      expect(f.core.cashJournal.nextSequence).toBe(p("one"));
      expect(
        row.references.some(
          (ref) => ref.id === due.id && ref.kind === due.kind,
        ),
      ).toBe(true);
      for (const component of due.components)
        expect(row.references.some((ref) => ref.id === component.id)).toBe(
          true,
        );
    },
  );
  it("rejects a public group whose second actual retained commitment lacks the recorded authority link", () => {
    const f = earned(fixture(p("zero"), "distinct"));
    f.core.work.commitments.get(b)!.publicPayAuthorityId = undefined;
    const before = snapshot(f.core);
    expect(() => group(f)).toThrow(/actual owned work obligation/);
    expect(snapshot(f.core)).toEqual(before);
  });
  it("completes two genuine absence periods once with no wage lines, cash, fund movement or fake journal", () => {
    const f = earned(fixture(), true),
      beforeCash = f.core.organizations.get(employer)!.liquidMinor,
      paid = group(f),
      row = f.core.work.payrollCashSources.get(paid.id)!;
    expect(paid.requestedMinor).toBe(p("zero"));
    expect(paid.paidMinor).toBe(p("zero"));
    expect(row.completedAt).toBe(f.core.date);
    expect(row.postedJournalSequence).toBeUndefined();
    expect(row.postings).toHaveLength(p("zero"));
    expect(f.core.cashJournal.nextSequence).toBe(p("zero"));
    expect(f.core.organizations.get(employer)!.liquidMinor).toBe(beforeCash);
    expect(f.core.people.get(worker)!.liquidMinor).toBe(p("zero"));
    expect(f.core.work.earnedPayPeriods.size).toBe(p("zero"));
    const after = snapshot(f.core);
    expect(() => group(f, b)).toThrow(/Duplicate|stale/);
    expect(snapshot(f.core)).toEqual(after);
  });
  it.each(["source", "ledger", "earned"] as const)(
    "rejects second-member %s drift across genuine provider lookups without effects",
    (target) => {
      const f = earned(fixture()),
        actual = f.core.jobs.get(jobB)!,
        savedSource = actual.source,
        savedLedger = f.core.work.payrollLedgerByCommitment.get(b)!,
        periodId = f.core.work.earnedPayPeriodByCommitmentIndex
          .get(b)!
          .get(p("zero"))!,
        savedPeriod = f.core.work.earnedPayPeriods.get(periodId)!,
        before = snapshot(f.core),
        hook = betweenLookups(
          f,
          () => {
            if (target === "source")
              actual.source = {
                ...savedSource,
                citation: "Tampered second owned job Source",
              };
            else if (target === "ledger")
              f.core.work.payrollLedgerByCommitment.set(b, {
                ...savedLedger,
                earnedMinor: savedLedger.earnedMinor + p("one"),
                accruedMinor: savedLedger.accruedMinor + p("one"),
              });
            else
              f.core.work.earnedPayPeriods.set(periodId, {
                ...savedPeriod,
                source: {
                  ...savedPeriod.source,
                  citation: "Tampered actual earned record",
                },
              });
          },
          () => {
            actual.source = savedSource;
            f.core.work.payrollLedgerByCommitment.set(b, savedLedger);
            f.core.work.earnedPayPeriods.set(periodId, savedPeriod);
          },
        );
      expect(() => settleWorkPayrollJournal(f.core, hook.api, a)).toThrow();
      expect(hook.calls()).toBeGreaterThanOrEqual(p("one"));
      expect(hook.calls()).toBeLessThanOrEqual(p("two"));
      expect(snapshot(f.core)).toEqual(before);
    },
  );
  it("rejects actual public authority Source replacement after the first genuine group lookup", () => {
    const f = earned(fixture(p("zero"), "distinct")),
      actual = f.core.organizations.get(employer)!,
      original = actual.publicPayAuthority!,
      before = snapshot(f.core),
      hook = betweenLookups(
        f,
        () => {
          actual.publicPayAuthority = Object.freeze({
            ...original,
            source: Object.freeze({
              ...original.source,
              citation: "Tampered current group authority",
            }),
          });
        },
        () => {
          actual.publicPayAuthority = original;
        },
      );
    expect(() => settleWorkPayrollJournal(f.core, hook.api, a)).toThrow();
    expect(hook.calls()).toBeGreaterThanOrEqual(p("one"));
    expect(hook.calls()).toBeLessThanOrEqual(p("two"));
    expect(snapshot(f.core)).toEqual(before);
  });
  it("completes actual public absences without outside funding or fake zero payment lines", () => {
    const f = earned(fixture(p("zero"), "distinct"), true),
      before = structuredClone(f.core.cashJournal.externalFlowsByOwner),
      paid = group(f);
    expect(paid.publicPayDue!.amountMinor).toBe(p("zero"));
    expect(
      paid.publicPayDue!.components.every(
        (due) => due.amountMinor === p("zero"),
      ),
    ).toBe(true);
    expect(f.core.cashJournal.externalFlowsByOwner).toEqual(before);
    expect(f.core.cashJournal.nextSequence).toBe(p("zero"));
    expect(f.core.organizations.get(f.owner)!.liquidMinor).toBe(p("zero"));
  });
  it.each(["calendar", "organization"] as const)(
    "rejects second-member %s relabeling before any single or grouped payment",
    (field) => {
      const f = earned(fixture()),
        row = f.core.work.commitments.get(b)!;
      if (field === "calendar")
        row.payrollCalendarId = "unadmitted-relabelled-calendar";
      else row.organizationId = "unowned-relabelled-employer";
      const before = snapshot(f.core);
      expect(() => group(f)).toThrow(/actual admitted/);
      expect(snapshot(f.core)).toEqual(before);
    },
  );
  it.each(["period-index", "ledger-and-index", "zero-period-index"] as const)(
    "rejects omitted second-member %s before the first payment",
    (target) => {
      const f = earned(fixture(), target === "zero-period-index");
      f.core.work.earnedPayPeriodByCommitmentIndex.delete(b);
      if (target === "ledger-and-index")
        f.core.work.payrollLedgerByCommitment.delete(b);
      const before = snapshot(f.core);
      expect(() => settleWorkPayrollJournal(f.core, f.api, a)).toThrow(
        /retained member/,
      );
      expect(snapshot(f.core)).toEqual(before);
    },
  );
  it("rejects an omitted zero due period even after a later period replaces latest attendance", () => {
    const f = fixture();
    earn(f, a, "2021-01-02");
    earn(f, b, "2021-01-04", true);
    earn(f, b, "2021-01-08");
    f.core.work.earnedPayPeriodByCommitmentIndex.get(b)!.delete(p("zero"));
    const before = snapshot(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, a)).toThrow(
      /actual current due period index/,
    );
    expect(snapshot(f.core)).toEqual(before);
  });
  it("rejects a removed zero attendance period and index before paying another member", () => {
    const f = earned(fixture(), true),
      periodId = f.core.work.earnedPayPeriodByCommitmentIndex
        .get(b)!
        .get(p("zero"))!;
    f.core.work.earnedPayPeriods.delete(periodId);
    f.core.work.earnedPayPeriodByCommitmentIndex.delete(b);
    const before = snapshot(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, a)).toThrow(
      /retained member/,
    );
    expect(snapshot(f.core)).toEqual(before);
  });
  it("rejects an unrecognized zero attendance fact after its period and both indexes are lost", () => {
    const f = earned(fixture(), true),
      periodId = f.core.work.earnedPayPeriodByCommitmentIndex
        .get(b)!
        .get(p("zero"))!;
    f.core.work.earnedPayPeriods.delete(periodId);
    f.core.work.earnedPayPeriodByCommitmentIndex.delete(b);
    f.core.work.payrollPeriodsByDue.get(f.core.date)!.delete(periodId);
    const before = snapshot(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, a)).toThrow(
      /actual unrecognized attendance period/,
    );
    expect(snapshot(f.core)).toEqual(before);
  });
  it("rejects an equal cloned group job view before a retry payment", () => {
    const f = earned(fixture(half));
    group(f);
    advanceDate(f.core, "2021-01-15");
    f.core.work.latestPayrollByJob.set(
      jobB,
      structuredClone(f.core.work.latestPayrollByJob.get(jobB)!),
    );
    const before = snapshot(f.core);
    expect(() => settleWorkPayrollJournal(f.core, f.api, a)).toThrow(
      /actual completed group component/,
    );
    expect(snapshot(f.core)).toEqual(before);
  });
  it("retains the aggregate missed-payday closure cause and keeps original ended-job debt", () => {
    const f = fixture(p("zero"));
    books(f.core);
    earned(f);
    const missed = group(f),
      closure = f.api.closeEmployer(
        employer,
        missed.id,
        f.core.data.finance!.reasons.closure,
      );
    expect(closure.cause).toEqual(missed);
    expect(closure.sourceReceiptId).toBe(missed.id);
    expect(closure.cause).toMatchObject({
      requestedMinor: unit * p("two"),
      paidMinor: p("zero"),
    });
    expect(closure.endedJobIds).toContain(jobB);
    expect(f.core.work.payrollLedgerByCommitment.get(a)!.arrearsMinor).toBe(
      unit,
    );
    expect(f.core.work.payrollLedgerByCommitment.get(b)!.arrearsMinor).toBe(
      unit,
    );
  });
});

it("returns a frozen grouped payment without exposing mutable components", () => {
  const f = earned(fixture()),
    receipt = group(f);
  expect(Reflect.set(receipt, "paidMinor", p("zero"))).toBe(false);
  expect(
    Reflect.set(receipt.components[p("zero")]!, "paidMinor", p("zero")),
  ).toBe(false);
  expect(
    Reflect.set(
      receipt.calendarSource,
      "citation",
      "corrupted caller calendar",
    ),
  ).toBe(false);
  const row = f.core.work.payrollCashSources.get(
    receipt.id,
  ) as WorkPayrollGroupSourceState;
  expect(row.result.paidMinor).toBe(unit * p("two"));
  expect(row.result.components[p("zero")]!.paidMinor).toBe(unit);
  expect(() => verifyCurrentWorkPayrollGroup(f.api, row.result)).not.toThrow();
});

it("reads grouped wages once in payroll, finance and original-roster observations", () => {
  const f = fixture(half);
  books(f.core);
  earned(f);
  const paid = group(f);
  const stocks = {
    earnedMinor: unit * p("two"),
    dueRecognizedMinor: unit * p("two"),
    paidMinor: half,
    accruedMinor: p("zero"),
    arrearsMinor: unit * p("two") - half,
  };
  expect(payrollStockObservables(f.core)).toMatchObject(stocks);
  expect(financeObservables(f.core).wages).toMatchObject(stocks);
  expect(summarizeWorkObservables(f.input, f.core).money).toMatchObject({
    ...stocks,
    cashAndExternalFlowsConserved: true,
  });
  f.api.closeEmployer(employer, paid.id, f.core.data.finance!.reasons.closure);
  const observed = financeObservables(f.core);
  expect(observed.wages).toMatchObject(stocks);
  expect(observed.closures[0]!.cause).toMatchObject({
    id: paid.id,
    kind: "work-payroll",
    requestedMinor: unit * p("two"),
    paidMinor: half,
  });
});

// Additive explicit control retention fixtures. SOURCE ONLY; UNEXECUTED.
describe("explicitly controlled quiet aggregate payroll retention", () => {
  it("retains the canonical aggregate and exact per-job component identities with the unchanged single conserving journal", () => {
    const f = fixture(),
      baseline = fixture(),
      token = registerControlledPersonV1(f.core, worker);
    earned(f);
    earned(baseline);
    const result = group(f),
      ordinary = group(baseline),
      row = f.core.work.payrollCashSources.get(
        result.id,
      ) as WorkPayrollGroupSourceState;
    expect(result.paidMinor).toBe(ordinary.paidMinor);
    expect(result.requestedMinor).toBe(ordinary.requestedMinor);
    expect(f.core.work.payrollLedgerByCommitment).toEqual(
      baseline.core.work.payrollLedgerByCommitment,
    );
    expect(f.core.work.detailedPayroll.get(row.id)).toBe(row.result);
    for (
      let index = p("zero");
      index < row.componentStates.length;
      index += p("one")
    ) {
      const component = row.componentStates[index]!.result;
      expect(row.result.components[index]).toBe(component);
      expect(f.core.work.latestPayrollByJob.get(component.jobId)).toBe(
        component,
      );
    }
    const journalId = f.core.cashJournal.requiredBySource
      .get(row.kind)!
      .get(row.id)!;
    expect(
      f.core.cashJournal.detailedReceipts.get(journalId)!.sourceRef.id,
    ).toBe(row.id);
    expect(f.core.cashJournal.nextSequence).toBe(p("one"));
    expect(f.core.work.detailedAttendance.size).toBe(p("two"));
    expect(f.core.playerId).toBeUndefined();
    expect(f.core.focusPersonIds.size).toBe(p("zero"));
    expect(f.core.people.get(worker)!.tier).toBe("weekly");
    retireControlledPersonV1(f.core, token);
    expect(
      workPayrollCashSourceProvider(f.api, { kind: row.kind, id: row.id })!
        .retainFull,
    ).toBe(true);
    expect(() =>
      verifyCurrentWorkPayrollGroup(f.api, row.result),
    ).not.toThrow();
  });
  it("rejects control retirement between actual aggregate lookups without a split or partial commit", () => {
    const f = fixture(),
      token = registerControlledPersonV1(f.core, worker);
    earned(f);
    const before = snapshot(f.core),
      hook = betweenLookups(
        f,
        () => retireControlledPersonV1(f.core, token),
        () => undefined,
      );
    expect(() => settleWorkPayrollJournal(f.core, hook.api, a)).toThrow(
      /Explicit control changed/,
    );
    expect(hook.calls()).toBeGreaterThanOrEqual(p("two"));
    expect(snapshot(f.core)).toEqual(before);
  });
});

/** Additive first-observation closure pin cases; SOURCE-ONLY, UNEXECUTED. */
describe("canonical grouped-payday closure evidence before its first observation", () => {
  it("rejects altered captured aggregate/component Sources, original claims and period terms before an initial snapshot can self-authorize them", () => {
    const changes: readonly ((cause: WorkPayrollGroupReceipt) => void)[] = [
      (cause) => {
        cause.calendarSource.citation += " Altered captured calendar.";
      },
      (cause) => {
        cause.source.citation += " Altered captured aggregate.";
      },
      (cause) => {
        cause.components[p("zero")]!.paySource.citation +=
          " Altered captured pay.";
      },
      (cause) => {
        expect(
          cause.components[p("zero")]!.scheduleSource.estimatedFrom,
        ).toBeDefined();
        delete cause.components[p("zero")]!.scheduleSource.estimatedFrom;
      },
      (cause) => {
        cause.components[p("zero")]!.claimId += ":altered-claim";
      },
      (cause) => {
        cause.components[p("zero")]!.index += p("one");
      },
      (cause) => {
        cause.components[p("zero")]!.fromAt = "2020-12-31";
      },
      (cause) => {
        cause.components[p("zero")]!.paidArrearsMinor += p("one");
      },
    ];
    for (const change of changes) {
      const f = fixture(half);
      books(f.core);
      earned(f);
      const paid = group(f),
        canonical = f.core.work.payrollCashSources.get(paid.id)!,
        original = structuredClone(canonical.result),
        closure = f.api.closeEmployer(
          employer,
          paid.id,
          f.core.data.finance!.reasons.closure,
        ),
        cause = closure.cause;
      if (!("calendarId" in cause) || cause.group !== true)
        throw new Error("Actual captured group payday required.");
      change(cause);
      const before = snapshot(f.core);
      // Only the actual retained canonical receipt can supply this first expectation.
      expect(() => financeObservables(f.core)).toThrow(
        /retained canonical full receipt/,
      );
      expect(f.core.work.payrollCashSources.get(paid.id)).toBe(canonical);
      expect(canonical.result).toEqual(original);
      expect(snapshot(f.core)).toEqual(before);
    }
  });

  it("retains original group component Sources when a genuine later retry moves every latest per-job view", () => {
    const f = fixture(half);
    books(f.core);
    earned(f);
    const paid = group(f),
      original = structuredClone(paid);
    f.api.closeEmployer(
      employer,
      paid.id,
      f.core.data.finance!.reasons.closure,
    );
    advanceDate(f.core, "2021-01-15");
    const retry = group(f);
    expect(retry.id).not.toBe(paid.id);
    for (const component of retry.components)
      expect(f.core.work.latestPayrollByJob.get(component.jobId)!.id).toBe(
        retry.id,
      );
    const before = snapshot(f.core),
      observed = financeObservables(f.core).closures[p("zero")]!.cause;
    expect(observed.stillLatestInOwnIndex).toBe(false);
    expect(observed.source).toEqual(original.source);
    expect(observed.payrollComponents).toEqual(
      original.components.map((component) => ({
        id: component.id,
        date: component.date,
        groupReceiptId: component.groupReceiptId,
        claimId: component.claimId,
        commitmentId: component.commitmentId,
        jobId: component.jobId,
        personId: component.personId,
        organizationId: component.organizationId,
        calendarId: component.calendarId,
        index: component.index,
        fromAt: component.fromAt,
        throughAt: component.throughAt,
        dueAt: component.dueAt,
        requestedMinor: component.requestedMinor,
        newlyDueMinor: component.newlyDueMinor,
        arrearsBeforeMinor: component.arrearsBeforeMinor,
        paidMinor: component.paidMinor,
        shortfallMinor: component.shortfallMinor,
        paidArrearsMinor: component.paidArrearsMinor,
        paidNewlyDueMinor: component.paidNewlyDueMinor,
        missedNewlyDueMinor: component.missedNewlyDueMinor,
        arrearsAfterMinor: component.arrearsAfterMinor,
        source: component.source,
        jobSource: component.jobSource,
        paySource: component.paySource,
        scheduleSource: component.scheduleSource,
        calendarSource: component.calendarSource,
        ...(component.earnedPeriodSource
          ? { earnedPeriodSource: component.earnedPeriodSource }
          : {}),
      })),
    );
    expect(snapshot(f.core)).toEqual(before);
  });
});

// SOURCE_ONLY, UNEXECUTED. Append to work-payroll-group.test.ts; add a normal static import
// of resolveSavedTraceV1 from ./saved-trace-v1. Existing fixture, earned, group and snapshot are used.
it("projects every actual retained group component while preserving aggregate no-choice accounting", () => {
  const f = earned(fixture(unit)),
    paid = group(f),
    before = snapshot(f.core);
  const trace = resolveSavedTraceV1(f.core, paid.id),
    cause = trace.paymentCause!;
  expect(trace.status).toBe("no-saved-reason");
  expect(trace.scoresStatus).toBe("none-saved");
  expect(cause.amounts.requestedMinor).toBe(paid.requestedMinor);
  expect(cause.amounts.paidMinor).toBe(paid.paidMinor);
  expect(cause.accountingAttributionRule).toBe(paid.accountingAttributionRule);
  expect(cause.components).toHaveLength(paid.components.length);
  for (const component of paid.components) {
    const saved = cause.components!.find(
      (row) =>
        row.receiptId === component.id &&
        row.ownerRefs.some(
          (ref) =>
            ref.kind === f.core.data.work!.journalSourceKinds.commitment &&
            ref.id === component.commitmentId,
        ),
    )!;
    expect(saved.amounts.paidArrearsMinor).toBe(component.paidArrearsMinor);
    expect(saved.amounts.paidNewlyDueMinor).toBe(component.paidNewlyDueMinor);
    expect(saved.sources.paySource).toEqual(component.paySource);
    expect(saved.ownerRefs).toContainEqual({
      kind: f.core.data.work!.journalSourceKinds.commitment,
      id: component.commitmentId,
    });
  }
  expect(snapshot(f.core)).toEqual(before);
});
