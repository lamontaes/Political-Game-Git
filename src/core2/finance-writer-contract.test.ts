/**
 * Source-only candidate for the owner's published API/schema-v6 finance seam.
 * No population generator, clock replay, forced controller, or civic target.
 * All balances/terms below are explicit technical test fixtures, not evidence
 * of observed firms, ordinary-world funding, or calibrated behavior.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "./business-books";
import { advanceDate } from "./calendar";
import {
  CORE_API_VERSION,
  CORE_SCHEMA_VERSION,
  DEFAULT_DATA,
  extendData,
} from "./data";
import financePolicy from "./data/finance.json" with { type: "json" };
import { chooseAct } from "./life";
import { LIFE_MODULE } from "./modules/life";
import { FINANCE_MODULE } from "./modules/finance";
import {
  catchUpScheduledWork,
  plannedWorkMinutesOnDate,
  runScheduledWork,
} from "./modules/work";
import { parameter as p } from "./parameters";
import {
  assertCoreIntegrity,
  coreAPI,
  createCore,
  registerModule,
} from "./state";
import type {
  BusinessBooksInput,
  CreditFacilityInput,
  EmployerClosure,
  FinanceContractInput,
} from "./finance-types";
import type {
  CoreInput,
  CoreState,
  PersonInput,
  Source,
  WorkCommitmentInput,
  WorkResult,
} from "./types";

const startedAt = "2021-01-01";
const nextDay = "2021-01-02";
const placeId = "place:finance-contract-fixture";
const employer = "organization:fixture-employer";
const otherEmployer = "organization:fixture-other-employer";
const supplier = "organization:fixture-supplier";
const lender = "organization:fixture-recorded-lender";
const worker = "person:fixture-worker";
const colleague = "person:fixture-colleague";
const otherWorker = "person:fixture-other-worker";
const payerA = "person:fixture-payer-a";
const payerB = "person:fixture-payer-b";
const stranger = "person:fixture-stranger";
const costId = "contract:fixture-employer-cost";
const facilityId = "facility:fixture-approved-line";
const interestParameter = "fixtureFinanceZeroInterest";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Explicit small finance-writer fixture; no ordinary-world outcome or observed firm balance is asserted.",
  estimatedFrom:
    "Controlled named input records and recorded obligations used only to test writer invariants.",
};
const fixtureData = extendData(DEFAULT_DATA, {
  parameters: {
    [interestParameter]: {
      value: p("zero"),
      tag: "SOURCED",
      citation:
        "The controlled fixture contract explicitly sets zero interest; this is a contract term, not an empirical rate.",
    },
  },
});

interface FixtureOptions {
  employerCash?: number;
  lenderCash?: number;
  supplierCash?: number;
  workerCash?: number;
  includeCredit?: boolean;
  includeBooks?: boolean;
  onlyWorkerCommitment?: boolean;
}

function contract(
  overrides: Partial<FinanceContractInput> = {},
): FinanceContractInput {
  return {
    id: costId,
    payerIds: [employer],
    payeeId: supplier,
    kind: financePolicy.kinds.operating,
    amountMinor: p("minorPerDollar"),
    dueAt: startedAt,
    periodMonths: p("one"),
    accruesArrears: true,
    source,
    ...overrides,
  };
}

function facility(
  overrides: Partial<CreditFacilityInput> = {},
): CreditFacilityInput {
  return {
    id: facilityId,
    borrowerId: employer,
    lenderId: lender,
    limitMinor: p("minorPerDollar"),
    active: true,
    annualInterestParameter: interestParameter,
    source,
    ...overrides,
  };
}

function books(
  overrides: Partial<BusinessBooksInput> = {},
): BusinessBooksInput {
  return {
    organizationId: employer,
    kindId: DEFAULT_BUSINESS_BOOKS_DATA.kinds[p("zero")]!.id,
    annualPayrollMinor: 1_000,
    annualDemandMinor: 2_000,
    annualOtherCostsMinor: 200,
    openingTownIncomeMinor: 3_000,
    capacityMinor: 2_000,
    price: p("one"),
    costContractIds: [costId],
    source,
    ...overrides,
  };
}

function input(options: FixtureOptions = {}): CoreInput {
  const people: PersonInput[] = [
    worker,
    colleague,
    otherWorker,
    payerA,
    payerB,
    stranger,
  ].map((id) => ({
    id,
    givenName: "Recorded",
    familyName: id,
    birthDate: "1980-01-01",
    placeId,
    householdId: `household:${id}`,
    tier: "weekly",
    traits: {},
    liquidMinor:
      id === payerA
        ? 30
        : id === payerB
          ? 50
          : id === worker
            ? (options.workerCash ?? p("zero"))
            : p("zero"),
    livingCostDailyMinor: p("minorPerDollar"),
    source,
    familyIds: [],
    knownIds: [],
    ...([worker, colleague, otherWorker].includes(id)
      ? { jobId: `job:${id}` }
      : {}),
  }));
  const jobs = people
    .filter((person) => person.jobId !== undefined)
    .map((person) => ({
      id: person.jobId!,
      personId: person.id,
      organizationId: person.id === otherWorker ? otherEmployer : employer,
      title: "Recorded fixture primary job",
      hoursDaily:
        (person.id === worker ? p("two") : p("one")) / p("daysPerWeek"),
      wageDailyMinor:
        (p("minorPerDollar") * (person.id === worker ? p("two") : p("one"))) /
        p("daysPerWeek"),
      hourlyMinor: p("minorPerDollar"),
      source,
    }));
  const workCommitments: WorkCommitmentInput[] = jobs.map((job) => ({
    id: `commitment:${job.id}`,
    personId: job.personId,
    jobId: job.id,
    organizationId: job.organizationId,
    startsAt: startedAt,
    anchorDate: startedAt,
    periodDays: p("daysPerWeek"),
    expectedWeeklyMinutes:
      (job.personId === worker ? p("two") : p("one")) * p("minutesPerHour"),
    hourlyMinor: job.hourlyMinor,
    slots: [
      {
        offsetDays: p("zero"),
        startMinute:
          job.personId === worker
            ? p("hoursPerDay") * p("minutesPerHour") - p("minutesPerHour")
            : p("zero"),
        minutes:
          (job.personId === worker ? p("two") : p("one")) * p("minutesPerHour"),
      },
    ],
    scheduleSource: source,
    paySource: source,
  }));
  return {
    seed: "p8-finance-writer-contract-fixture",
    startedAt,
    people,
    households: people.map((person) => ({
      id: person.householdId,
      placeId,
      memberIds: [person.id],
      source,
    })),
    jobs,
    workCommitments: options.onlyWorkerCommitment
      ? workCommitments.filter((row) => row.personId === worker)
      : workCommitments,
    organizations: [
      { id: employer, liquidMinor: options.employerCash ?? p("zero") },
      { id: otherEmployer, liquidMinor: 200 },
      { id: supplier, liquidMinor: options.supplierCash ?? p("zero") },
      { id: lender, liquidMinor: options.lenderCash ?? 40 },
    ].map((row) => ({
      ...row,
      placeId,
      name: row.id,
      kind: "employer",
      source,
    })),
    finance: {
      contracts: [contract()],
      facilities: options.includeCredit ? [facility()] : [],
      businesses:
        options.includeBooks === false
          ? []
          : [
              books(
                options.includeCredit ? { creditFacilityId: facilityId } : {},
              ),
            ],
      gaps: [],
    },
    focusPersonIds: [colleague],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

function fixture(options: FixtureOptions = {}): CoreState {
  return createCore(input(options), {
    data: fixtureData,
    modules: [LIFE_MODULE],
  });
}

/** Small fixture state only. Audit markers are allowed even for rejected admissions. */
function snapshot(core: CoreState): string {
  return JSON.stringify(core, (key, value: unknown) => {
    if (["data", "modules", "stopgapHits", "gaps"].includes(key))
      return undefined;
    if (value instanceof Map) return [...value.entries()];
    if (value instanceof Set) return [...value.values()];
    return value;
  });
}

function cash(core: CoreState): number {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (total, row) => total + row.liquidMinor,
    p("zero"),
  );
}

function freeWork(core: CoreState): void {
  runScheduledWork(
    coreAPI(core),
    (id, offers, context) => chooseAct(core, id, offers, context),
    () => undefined,
  );
}

function assertClosureHistory(core: CoreState, closure: EmployerClosure): void {
  const api = coreAPI(core);
  expect(new Set(closure.endedJobIds)).toEqual(
    new Set([`job:${worker}`, `job:${colleague}`]),
  );
  expect(new Set(closure.affectedPersonIds)).toEqual(
    new Set([worker, colleague]),
  );
  for (const id of [worker, colleague]) {
    const jobId = `job:${id}`;
    const commitmentId = `commitment:${jobId}`;
    expect(core.people.get(id)!.jobId).toBeUndefined();
    expect(core.jobs.get(jobId)!.endsAt).toBe(core.date);
    expect(core.jobs.get(jobId)!.title).toBe("Recorded fixture primary job");
    expect(core.jobs.get(jobId)!.hourlyMinor).toBe(p("minorPerDollar"));
    expect(core.work.commitments.get(commitmentId)!.endsAt).toBe(core.date);
    expect(core.work.commitmentsByPerson.get(id)!.has(commitmentId)).toBe(true);
    expect(core.work.plannedByCommitmentResidue.has(commitmentId)).toBe(true);
    expect(
      plannedWorkMinutesOnDate(
        api,
        core.work.commitments.get(commitmentId)!,
        startedAt,
      ),
    ).toBeGreaterThan(p("zero"));
    expect(
      plannedWorkMinutesOnDate(
        api,
        core.work.commitments.get(commitmentId)!,
        nextDay,
      ),
    ).toBe(p("zero"));
    expect(api.knows(id, `job:${jobId}:pay`)!.value).toBe(
      String(core.jobs.get(jobId)!.wageDailyMinor),
    );
    // Proposed minimal current-job status contract; past pay remains historical.
    expect(api.knows(id, `job:${jobId}:status`)).toMatchObject({
      sourceId: closure.sourceReceiptId,
      learnedAt: core.date,
      access: "self",
    });
    const actor = core.people.get(id)!;
    const need = core.data.needs.find((row) => row.evaluator === "time-load")!;
    expect(LIFE_MODULE.needEvaluators![need.evaluator]!(api, actor, need)).toBe(
      Math.max(p("zero"), actor.affect.stress),
    );
    expect(actor.goals.get(`work:${commitmentId}`)?.urgency ?? p("zero")).toBe(
      p("zero"),
    );
  }
  expect(core.people.get(otherWorker)!.jobId).toBe(`job:${otherWorker}`);
  const remaining = core.work.byPeriodResidue.get(p("daysPerWeek"))!;
  expect(remaining.get(p("zero"))).toEqual(
    new Set([`commitment:job:${otherWorker}`]),
  );
  expect(remaining.has(p("one"))).toBe(false);
  for (const residues of core.work.byPeriodResidue.values()) {
    expect(residues.size).toBeGreaterThan(p("zero"));
    for (const ids of residues.values())
      expect(ids.size).toBeGreaterThan(p("zero"));
  }
  expect(catchUpScheduledWork(api, worker).map((row) => row.jobId)).toEqual([
    `job:${worker}`,
  ]);
  assertCoreIntegrity(core);
}

describe("conserving finance API/schema-v6 writer seam", () => {
  it("admits optional finance input and shares one versioned facade across callers", () => {
    const core = fixture();
    expect(CORE_API_VERSION).toBe("core2-api-v8");
    expect(CORE_SCHEMA_VERSION).toBe("core2-schema-v8");
    expect(coreAPI(core)).toBe(coreAPI(core));
    expect(coreAPI(core).version).toBe(core.apiVersion);
    expect(core.apiVersion).toBe(CORE_API_VERSION);
    expect(core.schemaVersion).toBe(CORE_SCHEMA_VERSION);
    expect(core.finance.contracts.get(costId)!.payerIds).toEqual([employer]);
    expect(core.finance.jobsByOrganization.get(employer)).toEqual(
      new Set([`job:${worker}`, `job:${colleague}`]),
    );
    const original = input();
    const legacyInput = { ...original };
    delete legacyInput.finance;
    const withoutFinance = createCore(legacyInput, { data: fixtureData });
    expect(withoutFinance.finance.contracts.size).toBe(p("zero"));
    expect(withoutFinance.finance.businesses.size).toBe(p("zero"));
    expect(withoutFinance.finance.contracts).not.toBe(core.finance.contracts);
  });

  it("rejects malformed standing terms before any entity or due-index mutation", () => {
    const core = fixture();
    const api = coreAPI(core);
    const invalid: Partial<FinanceContractInput>[] = [
      { payerIds: [] },
      { payerIds: [payerA, payerA] },
      { payerIds: ["absent-payer"] },
      { payeeId: "absent-payee" },
      { payerIds: [supplier] },
      { amountMinor: -p("one") },
      { amountMinor: p("one") / p("two") },
      { amountMinor: Number.MAX_SAFE_INTEGER + p("one") },
      { periodMonths: p("zero") },
      { periodMonths: p("one") / p("two") },
      { dueAt: "2021-02-29" },
    ];
    for (const [index, changes] of invalid.entries()) {
      const before = snapshot(core);
      expect(() =>
        api.addFinanceContract(
          contract({ id: `invalid-contract:${index}`, ...changes }),
        ),
      ).toThrow();
      expect(snapshot(core)).toBe(before);
    }
    const before = snapshot(core);
    expect(() => api.addFinanceContract(contract())).toThrow();
    expect(snapshot(core)).toBe(before);
  });

  it("reports actual multi-payer transfers, conserves cash, and accrues only the unpaid obligation", () => {
    const core = fixture();
    const api = coreAPI(core);
    const id = "contract:shared-obligation";
    api.addFinanceContract(contract({ id, payerIds: [payerA, payerB] }));
    const total = cash(core);
    const receipt = api.settleFinanceContract(id);
    expect(receipt).toMatchObject({
      contractId: id,
      date: startedAt,
      requestedMinor: 100,
      paidMinor: 80,
      unfundedMinor: 20,
      arrearsMinor: 20,
      payeeBeforeMinor: 0,
      payeeAfterMinor: 80,
    });
    expect(
      receipt.payments.reduce((sum, row) => sum + row.paidMinor, p("zero")),
    ).toBe(receipt.paidMinor);
    for (const payment of receipt.payments)
      expect(payment.payerBeforeMinor - payment.payerAfterMinor).toBe(
        payment.paidMinor,
      );
    expect(core.finance.latestReceiptsByContract.get(id)).toEqual(receipt);
    expect(core.finance.contracts.get(id)!.arrearsMinor).toBe(
      receipt.unfundedMinor,
    );
    expect(cash(core)).toBe(total);
    const after = snapshot(core);
    expect(() => api.settleFinanceContract(id)).toThrow();
    expect(snapshot(core)).toBe(after);
  });

  it("records an unfilled purchase budget without inventing debt or lender money", () => {
    const core = fixture();
    const api = coreAPI(core);
    const id = "contract:unfilled-budget";
    api.addFinanceContract(
      contract({
        id,
        payerIds: [payerA, payerB],
        kind: financePolicy.kinds.purchase,
        accruesArrears: false,
      }),
    );
    const total = cash(core);
    const receipt = api.settleFinanceContract(id);
    expect(receipt.paidMinor).toBe(80);
    expect(receipt.unfundedMinor).toBe(20);
    expect(receipt.arrearsMinor).toBe(p("zero"));
    expect(core.finance.contracts.get(id)!.arrearsMinor).toBe(p("zero"));
    expect(core.finance.facilities.size).toBe(p("zero"));
    expect(cash(core)).toBe(total);
  });

  it("keeps a routine fully paid outsider result without new actor knowledge or a full event trace", () => {
    const core = fixture();
    const api = coreAPI(core);
    const id = "contract:routine-paid-budget";
    api.addFinanceContract(
      contract({
        id,
        payerIds: [payerA, payerB],
        amountMinor: 40,
        kind: financePolicy.kinds.purchase,
        accruesArrears: false,
      }),
    );
    const factsA = [...core.knowledgeByPerson.get(payerA)!];
    const factsB = [...core.knowledgeByPerson.get(payerB)!];
    const events = [...core.eventIds];
    const logs = [...core.durableLog];
    const receipt = api.settleFinanceContract(id);
    expect(receipt.paidMinor).toBe(receipt.requestedMinor);
    expect(receipt.unfundedMinor).toBe(p("zero"));
    expect([...core.knowledgeByPerson.get(payerA)!]).toEqual(factsA);
    expect([...core.knowledgeByPerson.get(payerB)!]).toEqual(factsB);
    expect([...core.eventIds]).toEqual(events);
    expect([...core.durableLog]).toEqual(logs);
  });

  it("prevalidates the combined payee balance before the first of several transfers", () => {
    const core = fixture({ supplierCash: Number.MAX_SAFE_INTEGER - 40 });
    const api = coreAPI(core);
    const id = "contract:combined-overflow";
    api.addFinanceContract(
      contract({ id, payerIds: [payerA, payerB], amountMinor: 80 }),
    );
    const before = snapshot(core);
    expect(() => api.settleFinanceContract(id)).toThrow();
    expect(snapshot(core)).toBe(before);
  });

  it("advances monthly due indexes once and does not collect an obligation early", () => {
    const core = fixture();
    const api = coreAPI(core);
    api.settleFinanceContract(costId);
    expect(
      core.finance.contractsDueAt.get(startedAt)?.has(costId) ?? false,
    ).toBe(false);
    expect(core.finance.contractsDueAt.get("2021-02-01")?.has(costId)).toBe(
      true,
    );
    advanceDate(core, "2021-01-31");
    const before = snapshot(core);
    expect(() => api.settleFinanceContract(costId)).toThrow();
    expect(snapshot(core)).toBe(before);
  });

  it("limits borrowing to real lender cash and repays only the recorded principal with real borrower cash", () => {
    const core = fixture({ includeCredit: true });
    const api = coreAPI(core);
    const total = cash(core);
    const loan = api.drawCredit(
      facilityId,
      100,
      financePolicy.reasons.borrowing,
      "fixture:recorded-draw-request",
    );
    expect(loan).toMatchObject({
      facilityId,
      date: startedAt,
      requestedMinor: 100,
      transferredMinor: 40,
      principalBeforeMinor: 0,
      principalAfterMinor: 40,
      borrowerBeforeMinor: 0,
      borrowerAfterMinor: 40,
      lenderBeforeMinor: 40,
      lenderAfterMinor: 0,
    });
    expect(core.finance.facilities.get(facilityId)!.principalMinor).toBe(40);
    expect(cash(core)).toBe(total);
    const payment = api.repayCredit(
      facilityId,
      100,
      financePolicy.reasons.repayment,
      "fixture:recorded-repayment-request",
    );
    expect(payment.transferredMinor).toBe(40);
    expect(payment.principalBeforeMinor).toBe(40);
    expect(payment.principalAfterMinor).toBe(p("zero"));
    expect(core.organizations.get(lender)!.liquidMinor).toBe(40);
    expect(cash(core)).toBe(total);
  });

  it("rejects borrower overflow or malformed credit requests before loan/cash/receipt counters change", () => {
    const core = fixture({
      includeCredit: true,
      employerCash: Number.MAX_SAFE_INTEGER - 20,
      lenderCash: 100,
    });
    const api = coreAPI(core);
    for (const requested of [
      -p("one"),
      p("one") / p("two"),
      Number.POSITIVE_INFINITY,
      50,
    ]) {
      const before = snapshot(core);
      expect(() =>
        api.drawCredit(
          facilityId,
          requested,
          financePolicy.reasons.borrowing,
          "fixture:invalid-draw-request",
        ),
      ).toThrow();
      expect(snapshot(core)).toBe(before);
    }
    const before = snapshot(core);
    expect(() =>
      api.drawCredit(
        "absent-facility",
        p("one"),
        financePolicy.reasons.borrowing,
        "fixture:missing-facility-request",
      ),
    ).toThrow();
    expect(snapshot(core)).toBe(before);
  });

  it("rejects malformed approval or books without partial borrower/business indexes", () => {
    const core = fixture({ includeBooks: false });
    const api = coreAPI(core);
    for (const [index, changes] of (
      [
        { borrowerId: "absent-borrower" },
        { lenderId: "absent-lender" },
        { lenderId: employer },
        { limitMinor: -p("one") },
        { limitMinor: p("one") / p("two") },
        { annualInterestParameter: "missing-interest-parameter" },
      ] satisfies Partial<CreditFacilityInput>[]
    ).entries()) {
      const before = snapshot(core);
      expect(() =>
        api.addCreditFacility(
          facility({ id: `invalid-facility:${index}`, ...changes }),
        ),
      ).toThrow();
      expect(snapshot(core)).toBe(before);
    }
    for (const changes of [
      { organizationId: "absent-business" },
      { kindId: "unregistered-business-kind" },
      { capacityMinor: -p("one") },
      { price: p("zero") },
      { costContractIds: ["absent-cost-contract"] },
      { creditFacilityId: "absent-facility" },
    ] satisfies Partial<BusinessBooksInput>[]) {
      const before = snapshot(core);
      expect(() => api.addBusinessBooks(books(changes))).toThrow();
      expect(snapshot(core)).toBe(before);
    }
  });

  it("rejects replay of the same dated credit cause while allowing a distinct funded request within the recorded limit", () => {
    const core = fixture({ includeCredit: true, lenderCash: 200 });
    const api = coreAPI(core);
    const total = cash(core);
    api.drawCredit(
      facilityId,
      30,
      financePolicy.reasons.borrowing,
      "fixture:one-dated-cause",
    );
    const beforeReplay = snapshot(core);
    expect(() =>
      api.drawCredit(
        facilityId,
        30,
        financePolicy.reasons.borrowing,
        "fixture:one-dated-cause",
      ),
    ).toThrow();
    expect(snapshot(core)).toBe(beforeReplay);
    const second = api.drawCredit(
      facilityId,
      100,
      financePolicy.reasons.borrowing,
      "fixture:different-dated-cause",
    );
    expect(second.transferredMinor).toBe(70);
    expect(second.principalAfterMinor).toBe(100);
    expect(cash(core)).toBe(total);
  });

  it("bills actual dated principal exposure rather than a whole-month interest approximation", () => {
    const rateParameter = "fixtureFinanceRecordedAnnualInterest";
    const data = extendData(fixtureData, {
      parameters: {
        [rateParameter]: {
          value: p("one") / p("two"),
          tag: "SOURCED",
          citation:
            "Explicit annual rate in this controlled contract fixture; not an observed or calibrated market rate.",
        },
      },
    });
    const core = createCore(input({ lenderCash: 1_000 }), {
      data,
      modules: [LIFE_MODULE],
    });
    const api = coreAPI(core);
    api.addCreditFacility(
      facility({ limitMinor: 1_000, annualInterestParameter: rateParameter }),
    );
    const total = cash(core);
    api.drawCredit(
      facilityId,
      1_000,
      financePolicy.reasons.borrowing,
      "fixture:opening-dated-principal",
    );
    advanceDate(core, "2021-01-11");
    api.repayCredit(
      facilityId,
      500,
      financePolicy.reasons.repayment,
      "fixture:day-ten-principal-change",
    );
    expect(core.finance.facilities.get(facilityId)!.principalMinor).toBe(500);
    advanceDate(core, "2021-01-21");
    api.drawCredit(
      facilityId,
      500,
      financePolicy.reasons.borrowing,
      "fixture:day-twenty-principal-change",
    );
    advanceDate(core, "2021-02-01");
    const receipt = api.settleFinanceContract(`finance-interest:${facilityId}`);
    // Ten days at 1,000, ten at 500, then eleven at 1,000, at 50% ACT/365:
    // 13,000 / 365 = 35.616438... minor units; a whole-month proxy is 41.666...
    expect(receipt.requestedMinor).toBe(35);
    expect(receipt.paidMinor).toBe(35);
    expect(
      core.finance.facilities.get(facilityId)!.interestRemainderMinor,
    ).toBeCloseTo(
      13_000 / api.parameter(financePolicy.interestDayCountParameter) - 35,
      10,
    );
    expect(core.finance.facilities.get(facilityId)!.unbilledInterestMinor).toBe(
      p("zero"),
    );
    expect(core.finance.facilities.get(facilityId)!.lastAccruedAt).toBe(
      "2021-02-01",
    );
    expect(cash(core)).toBe(total);
  });

  it("does not leave a loan approval behind when its derived interest terms fail admission", () => {
    const data = {
      ...fixtureData,
      finance: {
        ...fixtureData.finance!,
        kinds: { ...fixtureData.finance!.kinds, interest: "" },
      },
    };
    const withoutFinance = { ...input() };
    delete withoutFinance.finance;
    const core = createCore(withoutFinance, { data, modules: [LIFE_MODULE] });
    const before = snapshot(core);
    expect(() => coreAPI(core).addCreditFacility(facility())).toThrow();
    expect(snapshot(core)).toBe(before);
  });

  it("closes only actual unfunded obligations and removes every active overnight residue while preserving histories", () => {
    const core = fixture();
    const api = coreAPI(core);
    const untouchedFacts = [...core.knowledgeByPerson.get(stranger)!];
    expect(
      core.work.byPeriodResidue
        .get(p("daysPerWeek"))!
        .get(p("one"))!
        .has(`commitment:job:${worker}`),
    ).toBe(true);
    const receipt = api.settleFinanceContract(costId);
    expect(receipt.unfundedMinor).toBeGreaterThan(p("zero"));
    const total = cash(core);
    const closure = api.closeEmployer(
      employer,
      receipt.id,
      financePolicy.reasons.closure,
    );
    expect(closure).toMatchObject({
      organizationId: employer,
      date: startedAt,
      sourceReceiptId: receipt.id,
      reasonKey: financePolicy.reasons.closure,
    });
    expect(core.finance.closures.get(employer)).toEqual(closure);
    expect(closure.cause).toEqual(receipt);
    expect(closure.cause).not.toBe(receipt);
    expect(core.finance.businesses.get(employer)!.closedAt).toBe(startedAt);
    expect(cash(core)).toBe(total);
    assertClosureHistory(core, closure);
    expect([...core.knowledgeByPerson.get(stranger)!]).toEqual(untouchedFacts);
    const beforeWork = [...core.work.lastResultByJob];
    advanceDate(core, nextDay);
    freeWork(core);
    expect([...core.work.lastResultByJob]).toEqual(beforeWork);
  });

  it("can resolve closure from an actual quiet committed WorkResult without inventing a durable act or a second payment", () => {
    const core = fixture();
    const api = coreAPI(core);
    const total = cash(core);
    freeWork(core);
    const result = core.work.lastResultByJob.get(`job:${worker}`)!;
    expect(result.attendedMinutes).toBeGreaterThan(p("zero"));
    expect(result.shortfallMinor).toBeGreaterThan(p("zero"));
    expect(result.decision).toBeUndefined();
    expect(core.durableLog.has(result.sourceActId)).toBe(false);
    const counted = core.people.get(worker)!.actCount;
    const history = catchUpScheduledWork(api, worker);
    const closure = api.closeEmployer(
      employer,
      result.id,
      financePolicy.reasons.closure,
    );
    expect(closure.sourceReceiptId).toBe(result.id);
    const decisionFreeResult = { ...result };
    delete decisionFreeResult.decision;
    expect(closure.cause).toEqual(decisionFreeResult);
    expect("decision" in closure.cause).toBe(false);
    expect(core.work.lastResultByJob.get(result.jobId)).toEqual(result);
    expect(core.people.get(worker)!.actCount).toBe(counted);
    expect(core.durableLog.has(result.sourceActId)).toBe(false);
    expect(catchUpScheduledWork(api, worker)).toEqual(history);
    expect(cash(core)).toBe(total);
    assertClosureHistory(core, closure);
  });

  it("preserves the actual closure evidence when a caller modifies a returned receipt", () => {
    const core = fixture();
    let returned: Readonly<WorkResult> | undefined;
    registerModule(core, {
      id: "fixture:actual-work-receipt-consumer",
      onWorkResult: (_api, receipt) => {
        if (receipt.personId === worker) returned = receipt;
      },
    });
    freeWork(core);
    expect(returned).toBeDefined();
    const result = returned!;
    const closure = coreAPI(core).closeEmployer(
      employer,
      result.id,
      financePolicy.reasons.closure,
    );
    const pinned = JSON.stringify(closure.cause);
    result.jobSource.citation = "Caller-modified job source";
    result.paySource.citation = "Caller-modified pay source";
    result.employerOpeningFundsSource.citation =
      "Caller-modified opening source";
    result.source.citation = "Caller-modified result source";
    expect(JSON.stringify(closure.cause)).toBe(pinned);
  });

  it("retains visible public closure news without granting strangers private job or payment knowledge", () => {
    const ordinary = input();
    const core = createCore(
      { ...ordinary, focusPersonIds: [], visiblePlaceIds: [placeId] },
      { data: fixtureData, modules: [LIFE_MODULE] },
    );
    const api = coreAPI(core);
    const receipt = api.settleFinanceContract(costId);
    const closure = api.closeEmployer(
      employer,
      receipt.id,
      financePolicy.reasons.closure,
    );
    const rows = [...core.durableLog.values()].filter(
      (row) => row.kind === "organization.closed",
    );
    expect(rows).toHaveLength(p("one"));
    expect(core.durableLog.has(rows[p("zero")]!.id)).toBe(true);
    expect(rows[p("zero")]!.personIds).toEqual(closure.affectedPersonIds);
    expect(api.knows(stranger, `job:job:${worker}:status`)).toBeUndefined();
    expect(api.knows(stranger, `job:job:${worker}:pay`)).toBeUndefined();
    expect(core.finance.detailedReceipts.has(receipt.id)).toBe(false);
    expect(closure.cause).toEqual(receipt);
  });

  it("rejects unresolved, stale, fully paid, unrelated, or still-funded closure causes atomically", () => {
    const unresolved = fixture();
    const beforeUnresolved = snapshot(unresolved);
    expect(() =>
      coreAPI(unresolved).closeEmployer(
        employer,
        "forecast-only:no-receipt",
        financePolicy.reasons.closure,
      ),
    ).toThrow();
    expect(snapshot(unresolved)).toBe(beforeUnresolved);

    const paid = fixture({ employerCash: p("minorPerDollar") });
    const paidReceipt = coreAPI(paid).settleFinanceContract(costId);
    expect(paidReceipt.unfundedMinor).toBe(p("zero"));
    const beforePaid = snapshot(paid);
    expect(() =>
      coreAPI(paid).closeEmployer(
        employer,
        paidReceipt.id,
        financePolicy.reasons.closure,
      ),
    ).toThrow();
    expect(snapshot(paid)).toBe(beforePaid);

    const stale = fixture();
    const staleReceipt = coreAPI(stale).settleFinanceContract(costId);
    advanceDate(stale, nextDay);
    const beforeStale = snapshot(stale);
    expect(() =>
      coreAPI(stale).closeEmployer(
        employer,
        staleReceipt.id,
        financePolicy.reasons.closure,
      ),
    ).toThrow();
    expect(snapshot(stale)).toBe(beforeStale);

    const unrelated = fixture();
    const unrelatedAPI = coreAPI(unrelated);
    unrelatedAPI.addFinanceContract(
      contract({
        id: "contract:other-business-cost",
        payerIds: [otherEmployer],
        amountMinor: 300,
      }),
    );
    const unrelatedReceipt = unrelatedAPI.settleFinanceContract(
      "contract:other-business-cost",
    );
    expect(unrelatedReceipt.unfundedMinor).toBeGreaterThan(p("zero"));
    const beforeUnrelated = snapshot(unrelated);
    expect(() =>
      unrelatedAPI.closeEmployer(
        employer,
        unrelatedReceipt.id,
        financePolicy.reasons.closure,
      ),
    ).toThrow();
    expect(snapshot(unrelated)).toBe(beforeUnrelated);

    const newlyApproved = fixture({ includeBooks: false });
    const newlyApprovedAPI = coreAPI(newlyApproved);
    const obligation = newlyApprovedAPI.settleFinanceContract(costId);
    newlyApprovedAPI.addCreditFacility(facility());
    newlyApprovedAPI.addBusinessBooks(books({ creditFacilityId: facilityId }));
    const beforeApproved = snapshot(newlyApproved);
    expect(() =>
      newlyApprovedAPI.closeEmployer(
        employer,
        obligation.id,
        financePolicy.reasons.closure,
      ),
    ).toThrow();
    expect(snapshot(newlyApproved)).toBe(beforeApproved);
  });

  it("does not borrow or pay when actual worker/act admission cannot commit", () => {
    const core = fixture({
      includeCredit: true,
      workerCash: Number.MAX_SAFE_INTEGER - 20,
      onlyWorkerCommitment: true,
    });
    const before = snapshot(core);
    expect(() => freeWork(core)).toThrow();
    expect(snapshot(core)).toBe(before);

    const parameters = { ...fixtureData.parameters };
    delete parameters.isoMonthCharacters;
    const missingActParameter = createCore(
      input({ includeCredit: true, onlyWorkerCommitment: true }),
      { data: { ...fixtureData, parameters }, modules: [LIFE_MODULE] },
    );
    const beforeAct = snapshot(missingActParameter);
    expect(() => freeWork(missingActParameter)).toThrow(
      "Untagged numeric parameter: isoMonthCharacters",
    );
    expect(snapshot(missingActParameter)).toBe(beforeAct);
  });
});

describe("shared funding and retained finance obligations", () => {
  it("funds wages across approved lines and shares one finite lender across borrowers without losing aggregate counters", () => {
    const secondLine = "facility:fixture-second-worker-line";
    const otherLine = "facility:fixture-other-borrower-line";
    const opening = input({ lenderCash: 150 });
    const prepared: CoreInput = {
      ...opening,
      organizations: opening.organizations.map((row) =>
        row.id === otherEmployer ? { ...row, liquidMinor: p("zero") } : row,
      ),
      workCommitments: opening.workCommitments!.filter(
        (row) => row.personId !== colleague,
      ),
      finance: {
        ...opening.finance!,
        facilities: [
          facility({ limitMinor: 30 }),
          facility({ id: secondLine, limitMinor: 40 }),
          facility({
            id: otherLine,
            borrowerId: otherEmployer,
            limitMinor: 100,
          }),
        ],
        businesses: [
          books({ creditFacilityId: facilityId }),
          books({
            organizationId: otherEmployer,
            creditFacilityId: otherLine,
            costContractIds: [],
          }),
        ],
      },
    };
    const core = createCore(prepared, {
      data: fixtureData,
      modules: [LIFE_MODULE],
    });
    const total = cash(core);
    freeWork(core);
    const first = core.work.lastResultByJob.get(`job:${worker}`)!;
    const second = core.work.lastResultByJob.get(`job:${otherWorker}`)!;
    expect(first).toMatchObject({
      requestedMinor: 100,
      paidMinor: 70,
      shortfallMinor: 30,
    });
    expect(second).toMatchObject({
      requestedMinor: 100,
      paidMinor: 80,
      shortfallMinor: 20,
    });
    expect(
      core.finance.latestCreditByFacility.get(facilityId)!.transferredMinor,
    ).toBe(30);
    expect(
      core.finance.latestCreditByFacility.get(secondLine)!.transferredMinor,
    ).toBe(40);
    expect(
      core.finance.latestCreditByFacility.get(otherLine)!.transferredMinor,
    ).toBe(80);
    expect(
      [...core.finance.facilities.values()].reduce(
        (sum, row) => sum + row.principalMinor,
        p("zero"),
      ),
    ).toBe(150);
    expect(core.finance.totalsByKind.get("credit")!.borrowedMinor).toBe(150);
    expect(core.finance.businesses.get(employer)!.wagesPaidMinor).toBe(70);
    expect(core.finance.businesses.get(otherEmployer)!.wagesPaidMinor).toBe(80);
    expect(core.organizations.get(lender)!.liquidMinor).toBe(p("zero"));
    expect(core.organizations.get(employer)!.liquidMinor).toBe(p("zero"));
    expect(core.organizations.get(otherEmployer)!.liquidMinor).toBe(p("zero"));
    expect(core.people.get(worker)!.liquidMinor).toBe(first.paidMinor);
    expect(core.people.get(otherWorker)!.liquidMinor).toBe(second.paidMinor);
    expect(core.people.get(worker)!.actCount).toBe(p("one"));
    expect(core.people.get(otherWorker)!.actCount).toBe(p("one"));
    expect(cash(core)).toBe(total);
    assertCoreIntegrity(core);
  });

  it("caps dated repayment at one share of borrower cash across all due facilities", () => {
    const secondLine = "facility:fixture-second-repayment-line";
    const shareParameter =
      DEFAULT_BUSINESS_BOOKS_DATA.policy.repaymentShareParameter;
    const data = extendData(fixtureData, {
      parameters: {
        [shareParameter]: {
          ...fixtureData.parameters[shareParameter]!,
          value: p("one") / p("two"),
        },
      },
    });
    const opening = input({ lenderCash: 200 });
    const core = createCore(
      {
        ...opening,
        finance: {
          ...opening.finance!,
          facilities: [facility(), facility({ id: secondLine })],
          businesses: [books({ creditFacilityId: facilityId })],
        },
      },
      { data, modules: [LIFE_MODULE] },
    );
    const api = coreAPI(core);
    const total = cash(core);
    api.drawCredit(
      facilityId,
      100,
      financePolicy.reasons.borrowing,
      "fixture:first-recorded-principal",
    );
    api.drawCredit(
      secondLine,
      100,
      financePolicy.reasons.borrowing,
      "fixture:second-recorded-principal",
    );
    advanceDate(core, "2021-02-01");
    api.settleFinanceContract(`finance-interest:${facilityId}`);
    api.settleFinanceContract(`finance-interest:${secondLine}`);
    expect(core.organizations.get(employer)!.liquidMinor).toBe(200);
    api.finishFinanceDay();
    expect(core.organizations.get(employer)!.liquidMinor).toBe(100);
    expect(core.organizations.get(lender)!.liquidMinor).toBe(100);
    expect(
      [...core.finance.facilities.values()].reduce(
        (sum, row) => sum + row.principalMinor,
        p("zero"),
      ),
    ).toBe(100);
    expect(core.finance.totalsByKind.get("credit")!.borrowedMinor).toBe(200);
    expect(core.finance.totalsByKind.get("credit")!.repaidMinor).toBe(100);
    expect(core.finance.repaymentDueFacilityIds.size).toBe(p("zero"));
    expect(cash(core)).toBe(total);
    const settled = snapshot(core);
    api.finishFinanceDay();
    expect(snapshot(core)).toBe(settled);
  });

  it("keeps actual principal and unpaid interest on the indexed monthly route after employer closure", () => {
    const data = extendData(fixtureData, {
      parameters: {
        [interestParameter]: {
          value: p("one") / p("two"),
          tag: "SOURCED",
          citation:
            "Explicit annual rate in this controlled debt-service fixture; not an observed or calibrated market rate.",
        },
      },
    });
    const opening = input({ includeCredit: true, lenderCash: 100 });
    const core = createCore(
      {
        ...opening,
        finance: {
          ...opening.finance!,
          contracts: [contract({ amountMinor: 200 })],
        },
      },
      { data, modules: [LIFE_MODULE, FINANCE_MODULE] },
    );
    const api = coreAPI(core);
    const total = cash(core);
    api.drawCredit(facilityId, 100, financePolicy.reasons.borrowing, costId);
    const unfunded = api.settleFinanceContract(costId);
    expect(unfunded).toMatchObject({
      requestedMinor: 200,
      paidMinor: 100,
      unfundedMinor: 100,
    });
    const closure = api.closeEmployer(
      employer,
      unfunded.id,
      financePolicy.reasons.closure,
    );
    const cause = JSON.stringify(closure.cause);
    const interestId = `finance-interest:${facilityId}`;
    expect(core.finance.facilities.get(facilityId)!.principalMinor).toBe(100);
    expect(core.finance.contracts.get(interestId)!.endedAt).toBeUndefined();
    expect(core.finance.contractsDueAt.get("2021-02-01")!.has(interestId)).toBe(
      true,
    );
    advanceDate(core, "2021-02-01");
    FINANCE_MODULE.onDay!(
      api,
      (id, offers, context) => chooseAct(core, id, offers, context),
      () => undefined,
    );
    FINANCE_MODULE.onAfterDay!(api);
    expect(core.finance.latestReceiptsByContract.get(interestId)).toMatchObject(
      { date: "2021-02-01", requestedMinor: 4, paidMinor: 0, arrearsMinor: 4 },
    );
    expect(core.finance.contractsDueAt.get("2021-03-01")!.has(interestId)).toBe(
      true,
    );
    advanceDate(core, "2021-03-01");
    FINANCE_MODULE.onDay!(
      api,
      (id, offers, context) => chooseAct(core, id, offers, context),
      () => undefined,
    );
    FINANCE_MODULE.onAfterDay!(api);
    expect(core.finance.latestReceiptsByContract.get(interestId)).toMatchObject(
      { date: "2021-03-01", requestedMinor: 8, paidMinor: 0, arrearsMinor: 8 },
    );
    expect(core.finance.facilities.get(facilityId)!.principalMinor).toBe(100);
    expect(core.finance.facilities.get(facilityId)!.interestArrearsMinor).toBe(
      8,
    );
    expect(core.finance.contractsDueAt.get("2021-04-01")!.has(interestId)).toBe(
      true,
    );
    expect(core.finance.businesses.get(employer)!.closedAt).toBe(startedAt);
    expect(core.people.get(worker)!.jobId).toBeUndefined();
    expect(JSON.stringify(closure.cause)).toBe(cause);
    expect(cash(core)).toBe(total);
    assertCoreIntegrity(core);
  });

  it("rejects the generated interest contract's second ISO rollover before any facility or due-index write", () => {
    const core = fixture();
    const api = coreAPI(core);
    advanceDate(core, "9999-11-30");
    const before = snapshot(core);
    expect(() => api.addCreditFacility(facility())).toThrow(
      /ISO date|calendar/,
    );
    expect(snapshot(core)).toBe(before);
    expect(core.finance.facilities.has(facilityId)).toBe(false);
    expect(core.finance.facilitiesByBorrower.has(employer)).toBe(false);
    expect(core.finance.contracts.has(`finance-interest:${facilityId}`)).toBe(
      false,
    );
    expect(core.finance.contractsDueAt.has("9999-12-30")).toBe(false);
  });

  it("rejects duplicate place/date conditions and prices late reviews from factors actually applied before late input admission", () => {
    const late = fixture();
    const control = fixture();
    const lateAPI = coreAPI(late);
    const controlAPI = coreAPI(control);
    const total = cash(late);
    for (const core of [late, control]) {
      advanceDate(core, "2021-01-10");
      coreAPI(core).reviewBusiness(employer);
      expect(
        core.finance.businesses.get(employer)!.lastGeneralPriceFactor,
      ).toBe(p("one"));
      expect(core.finance.businesses.get(employer)!.lastWagePriceFactor).toBe(
        p("one"),
      );
    }
    const condition = {
      id: "condition:fixture-late-admission",
      placeId,
      at: startedAt,
      generalPriceFactor: p("two"),
      wagePriceFactor: 3,
      macroDemandFactor: p("one"),
      source,
    };
    lateAPI.addFinanceCondition(condition);
    const beforeDuplicate = snapshot(late);
    expect(() =>
      lateAPI.addFinanceCondition({
        ...condition,
        id: "condition:duplicate-effective-date",
        generalPriceFactor: 3,
      }),
    ).toThrow();
    expect(snapshot(late)).toBe(beforeDuplicate);
    controlAPI.addFinanceCondition({ ...condition, at: "2021-01-11" });
    const previouslyAppliedPrice = late.finance.businesses.get(employer)!.price;
    expect(previouslyAppliedPrice).toBe(
      control.finance.businesses.get(employer)!.price,
    );
    for (const core of [late, control]) {
      advanceDate(core, "2021-02-10");
      coreAPI(core).reviewBusiness(employer);
    }
    const lateBook = late.finance.businesses.get(employer)!;
    const controlBook = control.finance.businesses.get(employer)!;
    expect(lateBook.price).toBe(controlBook.price);
    expect(lateBook.price).toBeGreaterThan(previouslyAppliedPrice);
    expect(lateBook.lastGeneralPriceFactor).toBe(p("two"));
    expect(lateBook.lastWagePriceFactor).toBe(3);
    expect(lateBook.annualDemandMinor).toBe(controlBook.annualDemandMinor);
    expect(lateBook.annualOtherCostsMinor).toBe(
      controlBook.annualOtherCostsMinor,
    );
    expect(cash(late)).toBe(total);
    expect(cash(control)).toBe(total);
  });
});
