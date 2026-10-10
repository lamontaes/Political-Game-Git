/** Small observation-boundary fixtures; no generated-world or calibration claim. */
import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../business-books";
import { DEFAULT_DATA, extendData } from "../data";
import { chooseAct } from "../life";
import { LIFE_MODULE } from "../modules/life";
import { runScheduledWork } from "../modules/work";
import { parameter as p } from "../parameters";
import { coreAPI, createCore } from "../state";
import type { FinanceContractInput } from "../finance-types";
import type { CoreInput, CoreState, PersonInput, Source } from "../types";
import { financeObservables } from "./finance-observables";

const opening = "2021-01-01",
  nextDay = "2021-01-02";
const worker = "fixture-worker",
  child = "fixture-child",
  employer = "fixture-employer",
  supplier = "fixture-supplier";
const jobId = "fixture-primary-job",
  commitmentId = "fixture-primary-commitment",
  facilityId = "fixture-approved-line";
const zeroInterestParameter = "fixtureFinanceObservableZeroInterest";
const source: Source = {
  tag: "ESTIMATED",
  asOf: opening,
  citation:
    "Explicit small technical ledger/schedule fixtures, not real firms, ordinary-world outcomes, observed schedules, or calibrated employment.",
  estimatedFrom:
    "Controlled source records used only to test the read-only observer and actual canonical writer invariants.",
};
const data = extendData(DEFAULT_DATA, {
  parameters: {
    [zeroInterestParameter]: {
      value: p("zero"),
      tag: "SOURCED",
      citation:
        "Explicit zero-interest term of this controlled test contract; not an empirical lending-rate estimate.",
    },
  },
});

interface Options {
  employerCash?: number;
  workerCash?: number;
  hours?: number;
  endsAt?: string;
  startsAt?: string;
  birthdayWorker?: boolean;
  unownedJob?: boolean;
  withFinance?: boolean;
  withCredit?: boolean;
  withBooks?: boolean;
  mixedKinds?: boolean;
}

function fixtureInput(options: Options = {}): CoreInput {
  const hours = options.hours ?? p("financeObservableFullTimeHours");
  const people: PersonInput[] = [
    {
      id: worker,
      birthDate: options.birthdayWorker ? "1996-01-02" : "1980-01-01",
      jobId,
    },
    { id: child, birthDate: "2010-01-01" },
  ].map((row) => ({
    ...row,
    givenName: row.id,
    familyName: "Fixture",
    placeId: "fixture-place",
    householdId: `household:${row.id}`,
    tier: "weekly",
    traits: {},
    liquidMinor:
      row.id === worker
        ? (options.workerCash ?? p("minorPerDollar"))
        : p("zero"),
    livingCostDailyMinor: p("minorPerDollar"),
    familyIds: [],
    knownIds: [],
    source,
  }));
  const primaryJob = {
    id: jobId,
    personId: worker,
    organizationId: employer,
    title: "Recorded primary fixture job",
    wageDailyMinor: (hours * p("minorPerDollar")) / p("daysPerWeek"),
    hoursDaily: hours / p("daysPerWeek"),
    hourlyMinor: p("minorPerDollar"),
    source,
  };
  const contracts: FinanceContractInput[] = options.withFinance
    ? [
        {
          id: "fixture-purchase-budget",
          householdId: `household:${worker}`,
          payerIds: [worker],
          payeeId: employer,
          kind: "fixture-open-purchase-kind",
          amountMinor: p("two") * p("minorPerDollar"),
          dueAt: opening,
          periodMonths: p("one"),
          accruesArrears: false,
          source,
        },
        {
          id: "fixture-operating-obligation",
          payerIds: [employer],
          payeeId: supplier,
          kind: options.mixedKinds
            ? "fixture-open-purchase-kind"
            : "fixture-open-obligation-kind",
          amountMinor: p("two") * p("minorPerDollar"),
          dueAt: opening,
          periodMonths: p("one"),
          accruesArrears: true,
          ...(options.withCredit ? { creditFacilityId: facilityId } : {}),
          source,
        },
      ]
    : [];
  return {
    seed: "finance-observables-technical-fixture",
    startedAt: opening,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId: row.placeId,
      memberIds: [row.id],
      source,
    })),
    jobs: options.unownedJob
      ? [primaryJob, { ...primaryJob, id: "fixture-unowned-retained-job" }]
      : [primaryJob],
    workCommitments: [
      {
        id: commitmentId,
        jobId,
        personId: worker,
        organizationId: employer,
        startsAt: options.startsAt ?? opening,
        endsAt: options.endsAt,
        anchorDate: opening,
        periodDays: p("daysPerWeek"),
        expectedWeeklyMinutes: hours * p("minutesPerHour"),
        hourlyMinor: p("minorPerDollar"),
        slots: [...Array(p("daysPerWeek")).keys()].map((offsetDays) => ({
          offsetDays,
          startMinute: p("workMorningStartMinute"),
          minutes: (hours * p("minutesPerHour")) / p("daysPerWeek"),
        })),
        scheduleSource: source,
        paySource: source,
      },
    ],
    organizations: [
      {
        id: employer,
        liquidMinor: options.employerCash ?? p("minorPerDollar"),
      },
      { id: supplier, liquidMinor: p("minorPerDollar") * p("hoursPerDay") },
    ].map((row) => ({
      ...row,
      name: row.id,
      placeId: "fixture-place",
      kind: "employer",
      source,
    })),
    finance: {
      contracts,
      facilities: options.withCredit
        ? [
            {
              id: facilityId,
              borrowerId: employer,
              lenderId: supplier,
              limitMinor: p("minorPerDollar") * p("daysPerWeek"),
              active: true,
              annualInterestParameter: zeroInterestParameter,
              source,
            },
          ]
        : [],
      businesses: options.withBooks
        ? [
            {
              organizationId: employer,
              kindId: DEFAULT_BUSINESS_BOOKS_DATA.kinds[p("zero")]!.id,
              annualPayrollMinor: p("minorPerDollar") * p("monthsPerYear"),
              annualDemandMinor:
                p("minorPerDollar") * p("monthsPerYear") * p("two"),
              annualOtherCostsMinor: p("zero"),
              openingTownIncomeMinor: p("minorPerDollar") * p("monthsPerYear"),
              capacityMinor:
                p("minorPerDollar") * p("monthsPerYear") * p("two"),
              price: p("one"),
              costContractIds: [],
              source,
            },
          ]
        : [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

function fixture(options: Options = {}): CoreState {
  return createCore(fixtureInput(options), { data, modules: [LIFE_MODULE] });
}
const age = (core: CoreState, id: string) =>
  financeObservables(core).employment.byAge.find((row) => row.ageId === id)!;
const allRows = (core: CoreState): string =>
  JSON.stringify(core, (_key, value: unknown) =>
    value instanceof Map || value instanceof Set ? [...value] : value,
  );

describe("read-only authoritative finance observables", () => {
  it("attributes actual commuting wages to the worker's recorded residence rather than the employer town", () => {
    const core = fixture({
      employerCash: p("minorPerDollar") * p("daysPerWeek"),
    });
    core.organizations.get(employer)!.placeId =
      "fixture:commuter-employer-town";
    const api = coreAPI(core);
    runScheduledWork(
      api,
      (id, offers, context) => chooseAct(core, id, offers, context),
      () => undefined,
    );
    const paid = core.work.lastResultByJob.get(jobId)!.paidMinor;
    expect(paid).toBeGreaterThan(p("zero"));
    expect(
      core.finance.paidIncomeByPlaceMonth.get("2021-01:fixture-place"),
    ).toBe(paid);
    expect(
      core.finance.paidIncomeByPlaceMonthKind.get("2021-01:fixture-place:wage"),
    ).toBe(paid);
    expect(
      core.finance.paidIncomeByPlaceMonth.has(
        "2021-01:fixture:commuter-employer-town",
      ),
    ).toBe(false);
  });

  it("counts only authoritative cash, excludes forecasts and debt, and reads an actual finite credit draw", () => {
    const core = fixture({
      withBooks: true,
      withCredit: true,
      withFinance: true,
    });
    const before = financeObservables(core);
    const draw = coreAPI(core).drawCredit(
      facilityId,
      p("minorPerDollar"),
      data.finance!.reasons.borrowing,
      "fixture-operating-obligation",
    );
    const after = financeObservables(core);
    expect(draw.transferredMinor).toBe(p("minorPerDollar"));
    expect(after.cash.totalLiquidMinor).toBe(before.cash.totalLiquidMinor);
    expect(after.debt.principalMinor).toBe(draw.transferredMinor);
    expect(after.debt.borrowedMinor).toBe(draw.transferredMinor);
    expect(after.firmTotals.receivedMinor).toBe(p("zero"));
    expect(after.cash.conservationStatus).toContain("Single-date stock");
  });

  it("uses completed birthday ages and includes nonholders and children without asserting unemployment", () => {
    const core = fixture({ birthdayWorker: true });
    expect(age(core, "atus-age-20").liveJobHolders).toBe(p("one"));
    expect(age(core, "outside-configured-age-cohorts").livingResidents).toBe(
      p("one"),
    );
    core.date = nextDay;
    expect(age(core, "atus-age-20").liveJobHolders).toBe(p("zero"));
    expect(age(core, "atus-age-25").liveJobHolders).toBe(p("one"));
    expect(
      financeObservables(core).employment.livingResidentsWithoutLiveOwnedJob,
    ).toBe(p("one"));
    expect(financeObservables(core).gaps.join(" ")).toContain(
      "not asserted unemployed",
    );
  });

  it("uses the inclusive final schedule date while rejecting unowned retained jobs as employment", () => {
    const core = fixture({ endsAt: opening, unownedJob: true });
    const onEndDate = financeObservables(core);
    expect(onEndDate.employment.liveJobs).toBe(p("two"));
    expect(onEndDate.employment.liveOwnedJobs).toBe(p("one"));
    expect(onEndDate.employment.liveUnownedJobRecords).toBe(p("one"));
    expect(onEndDate.employment.liveJobHolders).toBe(p("one"));
    expect(onEndDate.employment.liveJobsWithActiveSchedule).toBe(p("one"));
    core.date = nextDay;
    const afterEndDate = financeObservables(core);
    expect(afterEndDate.employment.liveJobsWithoutActiveSchedule).toBe(
      p("one"),
    );
    expect(
      afterEndDate.employment.byAge.find((row) => row.ageId === "atus-age-35")!
        .holdersWithMissingSchedules,
    ).toBe(p("one"));
  });

  it("keeps future/missing schedules unclassified and uses the tagged full-time definition only as a proxy", () => {
    const full = fixture();
    const half = fixture({
      hours: p("financeObservableFullTimeHours") / p("two"),
    });
    expect(age(full, "atus-age-35").usualFullTimeProxyHolders).toBe(p("one"));
    expect(age(half, "atus-age-35").usualPartTimeProxyHolders).toBe(p("one"));
    const future = fixture({ startsAt: nextDay });
    expect(age(future, "atus-age-35").holdersWithMissingSchedules).toBe(
      p("one"),
    );
    expect(
      age(future, "atus-age-35").completeHolderMeanExpectedWeeklyHours,
    ).toBeNull();
    full.work.commitments.clear();
    expect(age(full, "atus-age-35").usualFullTimeProxyHolders).toBe(p("zero"));
    expect(
      financeObservables(full).employment.usualHoursProxy.status,
    ).toContain("not secondary-job ownership");
  });

  it("reports schedule mismatch directly and does not replace recorded expected minutes with slot minutes", () => {
    const core = fixture();
    core.work.commitments.get(commitmentId)!.expectedWeeklyMinutes /= p("two");
    const report = financeObservables(core);
    expect(report.employment.expectedSlotWeeklyMismatchJobs).toBe(p("one"));
    expect(
      report.employment.bySchedulePeriod[p("zero")]!.slotMeanWeeklyMinutes,
    ).toBe(
      p("two") *
        report.employment.bySchedulePeriod[p("zero")]!.expectedWeeklyMinutes,
    );
    expect(age(core, "atus-age-35").usualPartTimeProxyHolders).toBe(p("one"));
  });

  it("reads actual paid/unfilled purchase budgets separately from arrears and cumulatively repeated requests", () => {
    const core = fixture({ withFinance: true, employerCash: p("zero") });
    const api = coreAPI(core);
    const budget = api.settleFinanceContract("fixture-purchase-budget");
    const obligation = api.settleFinanceContract(
      "fixture-operating-obligation",
    );
    const report = financeObservables(core);
    expect(report.contractFlows.classifiedPurchaseBudgetPaidMinor).toBe(
      budget.paidMinor,
    );
    expect(report.contractFlows.classifiedPurchaseBudgetUnfilledMinor).toBe(
      budget.unfundedMinor,
    );
    expect(report.debt.nonInterestContractArrearsMinor).toBe(
      obligation.arrearsMinor,
    );
    expect(report.contractFlows.cumulativePaidMinor).toBe(
      budget.paidMinor + obligation.paidMinor,
    );
    expect(report.contractFlows.attributionComplete).toBe(true);
    expect(report.contractFlows.scope).toContain("not outstanding debt");
    expect(report.receipts.latestFinanceReceipts).toBe(p("two"));
    core.date = "2021-02-01";
    const repeated = api.settleFinanceContract("fixture-operating-obligation");
    const afterRepeat = financeObservables(core);
    expect(afterRepeat.debt.nonInterestContractArrearsMinor).toBe(
      repeated.arrearsMinor,
    );
    expect(
      afterRepeat.contractFlows.byKind.find(
        (row) => row.kind === obligation.kind,
      )!.unfundedMinor,
    ).toBe(obligation.unfundedMinor + repeated.unfundedMinor);
    expect(afterRepeat.contractFlows.cumulativeUnfundedMinor).toBeGreaterThan(
      afterRepeat.debt.contractArrearsMinor,
    );
  });

  it("does not invent a purchase-budget split when open kind totals combine different contract terms", () => {
    const core = fixture({
      withFinance: true,
      mixedKinds: true,
      employerCash: p("zero"),
    });
    const api = coreAPI(core);
    api.settleFinanceContract("fixture-purchase-budget");
    api.settleFinanceContract("fixture-operating-obligation");
    const report = financeObservables(core);
    expect(report.contractFlows.attributionComplete).toBe(false);
    expect(report.contractFlows.classifiedPurchaseBudgetPaidMinor).toBe(
      p("zero"),
    );
    expect(report.contractFlows.unattributedPaidMinor).toBe(
      report.contractFlows.cumulativePaidMinor,
    );
    expect(report.contractFlows.byKind[p("zero")]!.attribution).toBe(
      "mixed-or-unattributed",
    );
  });

  it("reports linked interest mirrors without adding them twice or accruing observation-time interest", () => {
    const core = fixture({ withCredit: true });
    const facility = core.finance.facilities.get(facilityId)!;
    const interest = [...core.finance.contracts.values()].find(
      (row) => row.interestFacilityId === facilityId,
    )!;
    // Explicit retained-ledger boundary values, not simulated missed interest bills.
    facility.interestArrearsMinor = p("minorPerDollar");
    interest.arrearsMinor = p("minorPerDollar");
    facility.unbilledInterestMinor = p("one") / p("two");
    facility.interestRemainderMinor = p("one") / p("two");
    const before = allRows(core),
      report = financeObservables(core);
    expect(report.debt.contractArrearsMinor).toBe(p("minorPerDollar"));
    expect(report.debt.interestContractArrearsMinor).toBe(p("minorPerDollar"));
    expect(report.debt.facilityInterestArrearsMinor).toBe(p("minorPerDollar"));
    expect(report.debt.nonInterestContractArrearsMinor).toBe(p("zero"));
    expect(report.debt.interestMirrorMismatchFacilities).toBe(p("zero"));
    expect(report.debt.recordedUnbilledInterestMinor).toBe(p("one") / p("two"));
    expect(allRows(core)).toBe(before);
  });

  it("retains historical actual wages and the actual closure cause after the latest result index is unavailable", () => {
    const core = fixture({ withBooks: true, employerCash: p("zero") });
    const api = coreAPI(core);
    // Actual shared chooser and canonical conserving writer, never a forced attendance result.
    runScheduledWork(
      api,
      (id, offers, context) => chooseAct(core, id, offers, context),
      () => undefined,
    );
    const result = core.work.lastResultByJob.get(jobId)!;
    expect(result.shortfallMinor).toBeGreaterThan(p("zero"));
    const closure = api.closeEmployer(
      employer,
      result.id,
      "fixture-cash-and-credit-exhausted",
    );
    // Controlled retention-edge condition: the pinned actual receipt remains available.
    core.work.lastResultByJob.clear();
    const report = financeObservables(core);
    expect(report.employment.endedJobs).toBe(p("one"));
    expect(report.employment.liveJobHolders).toBe(p("zero"));
    expect(report.wages.requestedMinor).toBe(result.requestedMinor);
    expect(report.wages.unpaidMinor).toBe(result.shortfallMinor);
    expect(report.firmTotals.wagesUnpaidMinor).toBe(result.shortfallMinor);
    expect(report.closures[p("zero")]!.sourceReceiptId).toBe(
      closure.sourceReceiptId,
    );
    expect(report.closures[p("zero")]!.cause.sourceActId).toBe(
      result.sourceActId,
    );
    expect(report.closures[p("zero")]!.cause.stillLatestInOwnIndex).toBe(false);
    expect(report.receipts.latestWorkResults).toBe(p("zero"));
    const broken = core.finance.closures.get(employer)!;
    broken.sourceReceiptId = "fixture-missing-source-receipt";
    expect(() => financeObservables(core)).toThrow(
      "actual matching pinned cause",
    );
  });

  it("returns detached plain JSON and does not treat absent observation as a calibrated zero", () => {
    const core = fixture({ withBooks: true });
    const before = allRows(core),
      report = financeObservables(core);
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
    expect(allRows(core)).toBe(before);
    report.firms[p("zero")]!.source.citation = "edited detached output";
    expect(core.finance.businesses.get(employer)!.source.citation).toBe(
      source.citation,
    );
    const disabled = createCore(fixtureInput(), {
      data: { ...data, work: undefined },
      modules: [LIFE_MODULE],
    });
    const disabledReport = financeObservables(disabled);
    expect(disabledReport.wages.scheduledWorkEnabled).toBe(false);
    expect(disabledReport.employment.usualHoursProxy.status).toContain(
      "not surveyed",
    );
    expect(disabledReport.gaps.join(" ")).toContain(
      "not an equality/calibration pass",
    );
  });

  it("fails on missing tagged definition, impossible unpaid totals, or duplicate authoritative cash identities", () => {
    const core = fixture();
    const registry = { ...core.data.parameters };
    delete registry.financeObservableFullTimeHours;
    core.data = { ...core.data, parameters: registry };
    expect(() => financeObservables(core)).toThrow(
      "Untagged numeric parameter",
    );
    const wrong = fixture();
    wrong.work.totalsByJob.set(jobId, {
      requestedMinor: p("zero"),
      paidMinor: p("one"),
      plannedMinutes: p("zero"),
      attendedMinutes: p("zero"),
      workedDays: p("zero"),
      missedDays: p("zero"),
    });
    expect(() => financeObservables(wrong)).toThrow(
      "exceed their actual requested/planned",
    );
    const collision = fixture();
    collision.organizations.set(worker, {
      ...collision.organizations.get(employer)!,
      id: worker,
    });
    expect(() => financeObservables(collision)).toThrow(
      "unique consistent IDs",
    );
  });
});
