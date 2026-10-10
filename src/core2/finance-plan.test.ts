/** Technical counterexamples. No ordinary world, act admission or migration proof. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { P } from "./parameters";
import { createCore } from "./state";
import {
  completeCashJournalSource,
  emptyCashJournalRuntime,
  postCashJournal,
  registerCashAccount,
  registerCashJournalSourceProviders,
} from "./journal-state";
import {
  FinancePlanningSession,
  guardWorkFinanceResult,
  prepareFinanceContract,
  prepareFinanceCredit,
  prepareWorkFinancePlan,
} from "./finance-plan";
import type { PreparedFinancePlan, PreparedWorkFinance } from "./finance-plan";
import type {
  CashJournalHost,
  CashJournalMetadataWrite,
  CashJournalPostedMarker,
} from "./journal-state";
import type {
  CashJournalInput,
  CashJournalPosting,
  ResolvedCashJournalSource,
} from "./journal";
import type {
  BusinessBooksState,
  CreditFacilityState,
  FinanceContractState,
  FinancePolicyData,
} from "./finance-types";
import type { Source, WorkResult } from "./types";

const date = "2021-01-31",
  prior = "2021-01-30",
  next = "2021-02-28";
const employer = "fixture:employer",
  lender = "fixture:lender",
  supplier = "fixture:supplier",
  worker = "fixture:worker";
const place = "fixture:place",
  home = "fixture:home",
  sourceKind = "fixture:technical-plan";
const unit = P.minorPerDollar,
  pair = P.one + P.one;
const source: Source = {
  tag: "SOURCED",
  asOf: date,
  citation:
    "Explicit technical finance-plan fixture; no opening cash provenance, real act or observed firm outcome is asserted.",
};
type FixtureRecord = ResolvedCashJournalSource &
  CashJournalPostedMarker & {
    metadata: readonly CashJournalMetadataWrite[];
    plan?: PreparedFinancePlan<unknown>;
  };

function fixture() {
  const policy = JSON.parse(
    JSON.stringify(DEFAULT_DATA.finance),
  ) as FinancePolicyData;
  const core = createCore(
    {
      seed: "source-only-finance-plan-fixture",
      startedAt: date,
      people: [
        {
          id: worker,
          givenName: "Technical",
          familyName: "Fixture",
          birthDate: "1980-01-01",
          placeId: place,
          householdId: home,
          tier: "weekly",
          traits: {},
          liquidMinor: P.zero,
          livingCostDailyMinor: P.zero,
          familyIds: [],
          knownIds: [],
          source,
        },
      ],
      households: [{ id: home, placeId: place, memberIds: [worker], source }],
      jobs: [],
      organizations: [employer, lender, supplier].map((id) => ({
        id,
        placeId: place,
        name: id,
        kind: "fixture:organization",
        source,
        liquidMinor: id === lender ? unit + unit : P.zero,
      })),
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    },
    { data: { ...DEFAULT_DATA, finance: policy }, modules: [] },
  );
  const journal = emptyCashJournalRuntime(),
    parameters = { ...P },
    host: CashJournalHost = { state: core, parameters };
  const records = new Map<string, FixtureRecord>();
  const control: { calls: number; interfere?: (count: number) => void } = {
    calls: P.zero,
  };
  registerCashJournalSourceProviders(journal, {
    [sourceKind]: (reference) => {
      control.calls += P.one;
      control.interfere?.(control.calls);
      const row = records.get(reference.id);
      if (!row) return undefined;
      row.plan?.preflight.verify(core, journal, parameters);
      return { resolved: row, marker: row, metadata: row.metadata };
    },
  });
  for (const ownerId of [employer, lender, supplier, worker])
    registerCashAccount(journal, host, {
      id: "opaque-registered-account:" + ownerId,
      ownerId,
      name: "Actual residual fixture account",
      source,
    });
  return { core, journal, parameters, host, records, control };
}
type Fixture = ReturnType<typeof fixture>;

function session(f: Fixture): FinancePlanningSession {
  return new FinancePlanningSession(f.core, f.journal, f.parameters);
}

function facility(
  f: Fixture,
  id = "fixture:facility",
  overrides: Partial<CreditFacilityState> = {},
): CreditFacilityState {
  const row: CreditFacilityState = {
    id,
    borrowerId: employer,
    lenderId: lender,
    limitMinor: unit + unit,
    active: true,
    annualInterestParameter: "zero",
    source: { ...source },
    principalMinor: P.zero,
    interestArrearsMinor: P.zero,
    lastInterestAt: date,
    interestRemainderMinor: P.zero,
    unbilledInterestMinor: P.zero,
    lastAccruedAt: date,
    ...overrides,
  };
  f.core.finance.facilities.set(id, row);
  const index =
    f.core.finance.facilitiesByBorrower.get(row.borrowerId) ??
    new Set<string>();
  index.add(id);
  f.core.finance.facilitiesByBorrower.set(row.borrowerId, index);
  return row;
}

function books(
  f: Fixture,
  overrides: Partial<BusinessBooksState> = {},
): BusinessBooksState {
  const row: BusinessBooksState = {
    organizationId: employer,
    kindId: "fixture:book-kind",
    annualPayrollMinor: unit,
    annualDemandMinor: unit,
    annualOtherCostsMinor: P.zero,
    openingTownIncomeMinor: unit,
    capacityMinor: unit,
    price: P.one,
    costContractIds: [],
    source: { ...source },
    lastReviewedAt: date,
    reachedIncomeRatio: P.one,
    anchorAnnualDemandMinor: unit,
    anchorAnnualOtherCostsMinor: P.zero,
    anchorPrice: P.one,
    lastGeneralPriceFactor: P.one,
    lastWagePriceFactor: P.one,
    nextReviewedAt: next,
    receivedMinor: P.zero,
    salesReceivedMinor: P.zero,
    operatingPaidMinor: P.zero,
    wagesRequestedMinor: P.zero,
    wagesPaidMinor: P.zero,
    wagesUnpaidMinor: P.zero,
    ...overrides,
  };
  f.core.finance.businesses.set(row.organizationId, row);
  return row;
}

function contract(
  f: Fixture,
  overrides: Partial<FinanceContractState> = {},
): FinanceContractState {
  const row: FinanceContractState = {
    id: "fixture:contract",
    payerIds: [employer],
    payeeId: supplier,
    kind: "fixture:purchase",
    amountMinor: unit,
    dueAt: date,
    firstDueAt: date,
    billingDay: Number(date.split("-").at(-P.one)),
    periodMonths: P.one,
    accruesArrears: true,
    arrearsMinor: P.zero,
    source: { ...source },
    ...overrides,
  };
  f.core.finance.contracts.set(row.id, row);
  f.core.finance.contractsDueAt.set(row.dueAt, new Set([row.id]));
  return row;
}

function snapshot(f: Fixture): string {
  return JSON.stringify(
    {
      date: f.core.date,
      finance: f.core.finance,
      people: f.core.people,
      organizations: f.core.organizations,
      households: f.core.households,
      journal: f.journal,
      facilityDescriptors: [...f.core.finance.facilities].map(([id, row]) => [
        id,
        Object.getOwnPropertyDescriptors(row),
      ]),
      contractDescriptors: [...f.core.finance.contracts].map(([id, row]) => [
        id,
        Object.getOwnPropertyDescriptors(row),
      ]),
      records: [...f.records].map(([id, row]) => ({
        id,
        postedJournalSequence: row.postedJournalSequence,
        completedAt: row.completedAt,
      })),
    },
    (_key, value: unknown) =>
      value instanceof Map || value instanceof Set ? [...value] : value,
  );
}

function install(
  f: Fixture,
  plan: PreparedFinancePlan<unknown>,
  id = "fixture:current-source",
) {
  const requiredRelatedRefs = plan.externalFlowAuthorizations
    .map((row) => row.obligation)
    .filter(
      (row, index, all) =>
        all.findIndex(
          (other) => other.kind === row.kind && other.id === row.id,
        ) === index,
    );
  const row: FixtureRecord = {
    kind: sourceKind,
    id,
    date: f.core.date,
    source: { ...source },
    expectedPostings: plan.postings,
    requiredRelatedRefs,
    relatedRecords: requiredRelatedRefs.map((reference) => ({
      ...reference,
      date: f.core.date,
      source: { ...source },
    })),
    externalFlowAuthorizations: plan.externalFlowAuthorizations,
    metadata: plan.metadata,
    plan,
  };
  f.records.set(id, row);
  f.control.calls = P.zero;
  const input: CashJournalInput = {
    id: `journal:${f.core.date}:${f.journal.nextSequence}`,
    date: f.core.date,
    expectedSequence: f.journal.nextSequence,
    sourceRef: { kind: sourceKind, id },
    postings: plan.postings,
  };
  return { row, input };
}

function perform(
  f: Fixture,
  plan: PreparedFinancePlan<unknown>,
  id = "fixture:current-source",
) {
  const installed = install(f, plan, id);
  if (plan.postings.length > P.zero)
    postCashJournal(f.journal, f.host, installed.input);
  else completeCashJournalSource(f.journal, f.host, installed.input.sourceRef);
  return installed;
}

function rejectAtFinalLookup(
  f: Fixture,
  plan: PreparedFinancePlan<unknown>,
  change: () => void,
  error: RegExp,
): void {
  const { input } = install(f, plan);
  let afterInterference: string | undefined;
  f.control.interfere = (count) => {
    if (count !== pair) return;
    change();
    afterInterference = snapshot(f);
  };
  expect(() =>
    plan.postings.length > P.zero
      ? postCashJournal(f.journal, f.host, input)
      : completeCashJournalSource(f.journal, f.host, input.sourceRef),
  ).toThrow(error);
  expect(afterInterference).toBeDefined();
  expect(snapshot(f)).toBe(afterInterference);
}

/** Actual technical allocation through the writer; registration itself stays zero funded. */
function allocate(f: Fixture, ownerId: string, amount = unit): string {
  const fundId = "opaque-funded-account:" + ownerId;
  registerCashAccount(f.journal, f.host, {
    id: fundId,
    ownerId,
    name: "Technical named fund",
    source,
    allocatedMinor: P.zero,
  });
  const id = "fixture:fund-allocation:" + ownerId;
  const postings: CashJournalPosting[] = [
    {
      id: id + ":out",
      accountId: f.journal.residualAccountByOwner.get(ownerId)!,
      deltaMinor: -amount,
    },
    { id: id + ":in", accountId: fundId, deltaMinor: amount },
  ];
  f.records.set(id, {
    kind: sourceKind,
    id,
    date,
    source: { ...source },
    expectedPostings: postings,
    requiredRelatedRefs: [],
    relatedRecords: [],
    metadata: [],
  });
  f.control.calls = P.zero;
  postCashJournal(f.journal, f.host, {
    id: `journal:${date}:${f.journal.nextSequence}`,
    date,
    expectedSequence: f.journal.nextSequence,
    sourceRef: { kind: sourceKind, id },
    postings,
  });
  return fundId;
}

function workReceipt(projection: PreparedWorkFinance): WorkResult {
  return {
    id: projection.receiptId,
    commitmentId: "fixture:commitment",
    jobId: "fixture:job",
    personId: projection.personId,
    organizationId: projection.organizationId,
    date,
    plannedMinutes: P.one,
    attendedMinutes: P.one,
    absentMinutes: P.zero,
    requestedMinor: projection.requestedMinor,
    paidMinor: projection.expectedPaidMinor,
    shortfallMinor: projection.requestedMinor - projection.expectedPaidMinor,
    payerCashBeforeMinor: projection.payerCashBeforeMinor,
    payerCashAfterMinor: projection.payerCashAfterMinor,
    payeeCashBeforeMinor: projection.payeeCashBeforeMinor,
    payeeCashAfterMinor: projection.payeeCashAfterMinor,
    sourceActId: "fixture:unadmitted-identifier",
    jobSource: source,
    paySource: source,
    employerOpeningFundsSource: source,
    payRemainderMinor: P.zero,
    reasonKey: "fixture:reason",
    source,
  };
}

function outsideOwner(f: Fixture): {
  ownerId: string;
  accountId: string;
  obligation: { kind: string; id: string };
} {
  const ownerId = "fixture:outside-owner",
    accountId = "opaque-registered-outside-account";
  f.core.organizations.set(ownerId, {
    id: ownerId,
    name: "Technical outside payer",
    kind: "fixture:outside",
    placeId: place,
    liquidMinor: P.zero,
    source: { ...source },
    outsideFlow: { ...source },
  });
  registerCashAccount(f.journal, f.host, {
    id: accountId,
    ownerId,
    name: "Technical outside flow account",
    source,
    outsideFlow: true,
  });
  return {
    ownerId,
    accountId,
    obligation: {
      kind: "fixture:technical-due-obligation",
      id: "fixture:current-benefit",
    },
  };
}

describe("read-only outside payment preparation", () => {
  it("keeps outside stock at zero and requires a prepared current obligation before any payment", () => {
    const f = fixture(),
      { ownerId } = outsideOwner(f),
      before = snapshot(f),
      s = session(f);
    expect(s.cash.balance(ownerId)).toBe(P.zero);
    expect(() => s.cash.available(ownerId)).toThrow(/actual due obligation/);
    expect(() =>
      s.cash.move(ownerId, employer, unit, "fixture:unsupported-outside-leg"),
    ).toThrow(/actual due obligation/);
    expect(snapshot(f)).toBe(before);
    expect(s.seal("no transfer").postings).toEqual([]);
  });

  it("posts only the actual payment through opaque accounts and conserves local cash plus signed outside net", () => {
    const f = fixture(),
      { ownerId, accountId, obligation } = outsideOwner(f),
      before = snapshot(f),
      s = session(f);
    s.cash.authorizeOutside(ownerId, obligation);
    expect(
      s.cash.move(ownerId, employer, unit, "fixture:due-outside-payment"),
    ).toBe(unit);
    expect(s.cash.balance(ownerId)).toBe(P.zero);
    expect(s.cash.balance(employer)).toBe(unit);
    const plan = s.seal("technical payment"),
      sequence = f.journal.nextSequence;
    expect(plan.externalFlowAuthorizations).toEqual([
      { accountId, obligation },
    ]);
    expect(plan.postings).toEqual([
      { id: "fixture:due-outside-payment:out", accountId, deltaMinor: -unit },
      {
        id: "fixture:due-outside-payment:in",
        accountId: f.journal.residualAccountByOwner.get(employer),
        deltaMinor: unit,
      },
    ]);
    expect(snapshot(f)).toBe(before);
    const { input, row } = install(f, plan),
      posted = postCashJournal(f.journal, f.host, input);
    expect(posted.grossDebitMinor).toBe(unit);
    expect(posted.grossCreditMinor).toBe(unit);
    expect(f.core.organizations.get(ownerId)!.liquidMinor).toBe(P.zero);
    expect(f.core.organizations.get(employer)!.liquidMinor).toBe(unit);
    expect(f.journal.externalFlowsByOwner.get(ownerId)).toEqual({
      netMinor: -unit,
      incomingMinor: P.zero,
      outgoingMinor: unit,
    });
    expect(
      f.core.organizations.get(employer)!.liquidMinor +
        f.journal.externalFlowsByOwner.get(ownerId)!.netMinor,
    ).toBe(P.zero);
    expect(row.postedJournalSequence).toBe(sequence);
  });

  it("rejects ordinary-owner authority, prepaid outside stock and account-mode tampering without a cash write", () => {
    const f = fixture(),
      { ownerId, obligation } = outsideOwner(f),
      s = session(f),
      before = snapshot(f);
    expect(() => s.cash.authorizeOutside(employer, obligation)).toThrow(
      /ordinary cash/,
    );
    expect(snapshot(f)).toBe(before);
    for (const form of ["stock", "mode", "ledger"] as const) {
      const g = fixture(),
        outside = outsideOwner(g);
      if (form === "stock")
        g.core.organizations.get(outside.ownerId)!.liquidMinor = unit;
      else if (form === "mode")
        delete g.journal.accounts.get(outside.accountId)!.outsideFlow;
      else g.journal.externalFlowsByOwner.delete(outside.ownerId);
      const altered = snapshot(g);
      expect(() =>
        session(g).cash.authorizeOutside(outside.ownerId, outside.obligation),
      ).toThrow();
      expect(snapshot(g)).toBe(altered);
    }
    expect(f.core.organizations.get(ownerId)!.liquidMinor).toBe(P.zero);
  });

  it("guards the nested outside source, signed counter and exact account mode at the final lookup", () => {
    for (const field of ["source", "counter", "account"] as const) {
      const f = fixture(),
        outside = outsideOwner(f),
        s = session(f);
      s.cash.authorizeOutside(outside.ownerId, outside.obligation);
      s.cash.move(
        outside.ownerId,
        employer,
        unit,
        "fixture:guarded-outside-leg",
      );
      const plan = s.seal("guarded outside payment");
      rejectAtFinalLookup(
        f,
        plan,
        () => {
          if (field === "source")
            f.core.organizations.get(outside.ownerId)!.outsideFlow!.citation =
              "mutated outside source";
          else if (field === "counter")
            f.journal.externalFlowsByOwner.get(outside.ownerId)!.outgoingMinor =
              P.one;
          else delete f.journal.accounts.get(outside.accountId)!.outsideFlow;
        },
        /Stale finance/,
      );
      expect(f.core.organizations.get(employer)!.liquidMinor).toBe(P.zero);
      expect(f.core.organizations.get(outside.ownerId)!.liquidMinor).toBe(
        P.zero,
      );
      expect(f.journal.nextSequence).toBe(P.zero);
    }
  });

  it("checks outside cumulative overflow before changing even its temporary payment plan", () => {
    const f = fixture(),
      outside = outsideOwner(f),
      counter = f.journal.externalFlowsByOwner.get(outside.ownerId)!;
    counter.incomingMinor = Number.MAX_SAFE_INTEGER;
    counter.outgoingMinor = Number.MAX_SAFE_INTEGER;
    counter.netMinor = P.zero;
    const s = session(f),
      before = snapshot(f);
    s.cash.authorizeOutside(outside.ownerId, outside.obligation);
    expect(() =>
      s.cash.move(
        outside.ownerId,
        employer,
        unit,
        "fixture:overflowing-outside-leg",
      ),
    ).toThrow(/outside outgoing total/);
    expect(s.cash.balance(employer)).toBe(P.zero);
    expect(s.cash.balance(outside.ownerId)).toBe(P.zero);
    expect(s.seal("overflow rejected").postings).toEqual([]);
    expect(snapshot(f)).toBe(before);
  });

  it("freezes the prepared obligation and rejects authorization after sealing", () => {
    const f = fixture(),
      outside = outsideOwner(f),
      s = session(f);
    s.cash.authorizeOutside(outside.ownerId, outside.obligation);
    s.cash.move(outside.ownerId, employer, unit, "fixture:sealed-outside-leg");
    const plan = s.seal("sealed outside payment");
    expect(Object.isFrozen(plan.externalFlowAuthorizations)).toBe(true);
    expect(
      Object.isFrozen(plan.externalFlowAuthorizations[P.zero]!.obligation),
    ).toBe(true);
    expect(() => {
      plan.externalFlowAuthorizations[P.zero]!.obligation.id = "changed";
    }).toThrow();
    expect(() =>
      s.cash.authorizeOutside(outside.ownerId, outside.obligation),
    ).toThrow(/sealed/);
  });
});

describe("read-only indexed finance preparation", () => {
  it("reads actual registered residual IDs and complete funded portfolios without writing them", () => {
    const f = fixture(),
      fundId = allocate(f, lender),
      before = snapshot(f),
      s = session(f);
    expect(s.cash.available(lender)).toBe(unit);
    expect(s.cash.balance(lender)).toBe(unit + unit);
    expect(s.cash.move(lender, employer, unit + unit, "fixture:leg")).toBe(
      unit,
    );
    const plan = s.seal("technical result");
    expect(plan.postings).toEqual([
      {
        id: "fixture:leg:out",
        accountId: f.journal.residualAccountByOwner.get(lender),
        deltaMinor: -unit,
      },
      {
        id: "fixture:leg:in",
        accountId: f.journal.residualAccountByOwner.get(employer),
        deltaMinor: unit,
      },
    ]);
    expect(snapshot(f)).toBe(before);
    perform(f, plan);
    expect(f.core.organizations.get(lender)!.liquidMinor).toBe(unit);
    expect(f.journal.accounts.get(fundId)!.allocatedMinor).toBe(unit);
  });

  it("rejects missing, incomplete, inconsistent and overallocated touched portfolios without writes", () => {
    const changes: ((f: Fixture) => void)[] = [
      (f) => f.journal.residualAccountByOwner.delete(lender),
      (f) => f.journal.accountsByOwner.get(lender)!.clear(),
      (f) => f.journal.accountCountByOwner.set(lender, pair),
      (f) => {
        (f.core.people as Map<string, unknown>).set(lender, undefined);
      },
      (f) => {
        f.journal.accounts.get(
          f.journal.residualAccountByOwner.get(lender)!,
        )!.ownerId = employer;
      },
      (f) => {
        allocate(f, lender);
        f.journal.accounts.get(
          "opaque-funded-account:" + lender,
        )!.allocatedMinor = unit + unit + unit;
      },
    ];
    for (const change of changes) {
      const f = fixture();
      change(f);
      const before = snapshot(f);
      expect(() => session(f).cash.available(lender)).toThrow();
      expect(snapshot(f)).toBe(before);
    }
  });

  it("does not scan unrelated owner, account or finance histories", () => {
    const f = fixture(),
      s = session(f);
    Object.defineProperty(f.core.organizations.get(supplier)!, "liquidMinor", {
      get() {
        throw new Error("unrelated owner read");
      },
    });
    Object.defineProperty(f.journal.accounts, "values", {
      value() {
        throw new Error("whole account scan");
      },
    });
    Object.defineProperty(f.core.finance.latestReceiptsByContract, "entries", {
      value() {
        throw new Error("receipt history scan");
      },
    });
    s.cash.move(lender, employer, unit, "fixture:bounded");
    expect(s.seal("bounded").postings.length).toBe(pair);
  });

  it("keeps ordered shared-lender clipping and leg balances separate from journal transaction snapshots", () => {
    const f = fixture();
    f.core.organizations.get(lender)!.liquidMinor = unit;
    facility(f, "fixture:a");
    facility(f, "fixture:b");
    const s = session(f),
      a = prepareFinanceCredit(s, {
        facilityId: "fixture:a",
        requestedMinor: unit,
        reasonKey: "fixture:credit",
        triggerId: "fixture:trigger",
      });
    const b = prepareFinanceCredit(s, {
      facilityId: "fixture:b",
      requestedMinor: unit,
      reasonKey: "fixture:credit",
      triggerId: "fixture:trigger",
    });
    expect(a.transferredMinor).toBe(unit);
    expect(b.transferredMinor).toBe(P.zero);
    expect(b.lenderBeforeMinor).toBe(P.zero);
    expect(b.borrowerBeforeMinor).toBe(unit);
    const plan = s.seal([a, b]),
      { input } = install(f, plan);
    const journal = postCashJournal(f.journal, f.host, input);
    expect(journal.owners.get(employer)?.beforeMinor).toBe(P.zero);
    expect(journal.owners.get(employer)?.afterMinor).toBe(unit);
    expect(f.core.finance.totalsByKind.get("credit")!.borrowedMinor).toBe(unit);
    expect(
      plan.metadata.filter(
        (write) =>
          write.kind === "map" &&
          write.target === f.core.finance.totalsByKind &&
          write.key === "credit",
      ).length,
    ).toBe(P.one);
  });

  it("checks intermediate receiver overflow even when a later leg would return the money", () => {
    const f = fixture();
    f.core.organizations.get(employer)!.liquidMinor = Number.MAX_SAFE_INTEGER;
    const before = snapshot(f),
      s = session(f);
    expect(() => {
      s.cash.move(lender, employer, P.one, "fixture:overflow-in");
      s.cash.move(employer, lender, P.one, "fixture:later-out");
    }).toThrow(/exact minor|integer/);
    expect(snapshot(f)).toBe(before);
  });

  it("emits no fake zero lines and rejects self-payment, negative amounts and duplicate leg IDs", () => {
    const f = fixture(),
      s = session(f);
    expect(s.cash.move(employer, supplier, unit, "fixture:empty")).toBe(P.zero);
    expect(() =>
      s.cash.move(employer, employer, P.zero, "fixture:self"),
    ).toThrow();
    expect(() =>
      s.cash.move(lender, employer, -P.one, "fixture:negative"),
    ).toThrow();
    expect(() =>
      s.cash.move(lender, employer, P.one, "fixture:empty"),
    ).toThrow();
    expect(s.seal("unpaid").postings).toEqual([]);
  });

  it("folds repeated fields/maps/members against original preimages and preserves own undefined deletion", () => {
    const f = fixture(),
      row = facility(f),
      s = session(f),
      target: { optional?: number } = { optional: undefined };
    s.metadata.write(row, "principalMinor", P.one);
    s.metadata.write(row, "principalMinor", pair);
    s.metadata.write(target, "optional", P.one);
    s.metadata.delete(target, "optional");
    s.metadata.mapSet(
      f.core.finance.paidIncomeByPlaceMonth,
      "fixture:key",
      P.one,
    );
    s.metadata.mapSet(
      f.core.finance.paidIncomeByPlaceMonth,
      "fixture:key",
      pair,
    );
    s.metadata.setMember(f.core.finance.repaymentDueFacilityIds, row.id, true);
    s.metadata.setMember(f.core.finance.repaymentDueFacilityIds, row.id, false);
    const plan = s.seal("folded"),
      principal = plan.metadata.find(
        (write) =>
          write.kind === "field" &&
          write.target === row &&
          write.key === "principalMinor",
      );
    expect(principal).toMatchObject({ expected: P.zero, next: pair });
    expect(
      plan.metadata.filter(
        (write) =>
          write.target === row &&
          "key" in write &&
          write.key === "principalMinor",
      ).length,
    ).toBe(P.one);
    expect(
      plan.metadata.find((write) => write.kind === "field-delete"),
    ).toMatchObject({ expectedPresent: true, expected: undefined });
    expect(plan.metadata.some((write) => write.kind === "set")).toBe(false);
    expect(Object.hasOwn(target, "optional")).toBe(true);
    expect(row.principalMinor).toBe(P.zero);
  });

  it("retains absence-versus-own-undefined map guards and omits absent deletion/no-change membership", () => {
    const f = fixture(),
      s = session(f),
      map = new Map<string, number | undefined>([
        ["fixture:present", undefined],
      ]);
    expect(s.metadata.mapHas(map, "fixture:present")).toBe(true);
    expect(s.metadata.mapHas(map, "fixture:absent")).toBe(false);
    s.metadata.mapDelete(map, "fixture:absent");
    s.metadata.setMember(
      f.core.finance.repaymentDueFacilityIds,
      "fixture:absent",
      false,
    );
    const plan = s.seal("presence");
    expect(plan.metadata).toEqual([]);
    map.delete("fixture:present");
    expect(() =>
      plan.preflight.verify(f.core, f.journal, f.parameters),
    ).toThrow(/map membership/);
  });

  it("prepares complete credit metadata without callbacks, then atomically applies its actual paid amount", () => {
    const f = fixture(),
      row = facility(f),
      before = snapshot(f),
      s = session(f);
    const receipt = prepareFinanceCredit(s, {
      facilityId: row.id,
      requestedMinor: unit,
      reasonKey: "fixture:credit",
      triggerId: "fixture:trigger",
    });
    const plan = s.seal(receipt);
    expect(snapshot(f)).toBe(before);
    expect(Object.keys(plan).some((key) => /commit|callback/.test(key))).toBe(
      false,
    );
    const { row: marker } = perform(f, plan);
    expect(f.core.organizations.get(employer)!.liquidMinor).toBe(unit);
    expect(f.core.organizations.get(lender)!.liquidMinor).toBe(unit);
    expect(row.principalMinor).toBe(unit);
    expect(row.lastAccruedAt).toBe(date);
    expect(f.core.finance.creditRequestIds.has(receipt.id)).toBe(true);
    expect(
      f.core.finance.latestCreditByFacility.get(row.id)!.transferredMinor,
    ).toBe(unit);
    expect(marker.postedJournalSequence).toBeDefined();
    expect(marker.completedAt).toBeUndefined();
    expect(plan.result).not.toBe(
      f.core.finance.latestCreditByFacility.get(row.id),
    );
  });

  it("preserves pre-transfer principal exposure and fractional carry without billing or reducing interest arrears", () => {
    const f = fixture(),
      fraction = P.one / (pair + pair),
      row = facility(f, undefined, {
        principalMinor: unit,
        lastAccruedAt: prior,
        annualInterestParameter: "one",
        unbilledInterestMinor: fraction,
        interestRemainderMinor: fraction,
        interestArrearsMinor: P.one,
      });
    const s = session(f),
      receipt = prepareFinanceCredit(s, {
        facilityId: row.id,
        requestedMinor: unit,
        reasonKey: "fixture:repayment",
        triggerId: "fixture:trigger",
        repayment: true,
      });
    expect(receipt.transferredMinor).toBe(P.zero);
    const expected = fraction + (unit * P.one) / P.financeAct365FixedDays;
    perform(f, s.seal(receipt));
    expect(row.unbilledInterestMinor).toBe(expected);
    expect(row.interestRemainderMinor).toBe(fraction);
    expect(row.interestArrearsMinor).toBe(P.one);
    expect(row.principalMinor).toBe(unit);
  });

  it("bounds repayment by principal and actual borrower residual funds", () => {
    const f = fixture();
    f.core.organizations.get(employer)!.liquidMinor = unit + unit;
    const fundId = allocate(f, employer),
      row = facility(f, undefined, { principalMinor: unit + unit });
    const s = session(f),
      receipt = prepareFinanceCredit(s, {
        facilityId: row.id,
        requestedMinor: unit + unit + unit,
        reasonKey: "fixture:repayment",
        triggerId: "fixture:trigger",
        repayment: true,
      });
    expect(receipt.transferredMinor).toBe(unit);
    expect(receipt.principalAfterMinor).toBe(unit);
    perform(f, s.seal(receipt));
    expect(f.journal.accounts.get(fundId)!.allocatedMinor).toBe(unit);
    expect(f.core.finance.totalsByKind.get("credit")!.repaidMinor).toBe(unit);
  });

  it("rolls the bounded current-day request Set once, catches staged duplicates and completes inactive zero credit", () => {
    const f = fixture(),
      row = facility(f, undefined, { active: false });
    f.core.finance.creditRequestsAt = prior;
    f.core.finance.creditRequestIds.add("fixture:old-day-request");
    const s = session(f),
      request = {
        facilityId: row.id,
        requestedMinor: unit,
        reasonKey: "fixture:credit",
        triggerId: "fixture:trigger",
      };
    const receipt = prepareFinanceCredit(s, request);
    expect(() => prepareFinanceCredit(s, request)).toThrow(/Duplicate/);
    const sequence = f.journal.nextSequence,
      plan = s.seal(receipt),
      { row: marker } = perform(f, plan);
    expect(plan.postings).toEqual([]);
    expect(f.journal.nextSequence).toBe(sequence);
    expect(f.core.finance.creditRequestsAt).toBe(date);
    expect(f.core.finance.creditRequestIds).toEqual(new Set([receipt.id]));
    expect(row.principalMinor).toBe(P.zero);
    expect(marker.completedAt).toBe(date);
  });

  it("rejects stale principal, limit, nested facility citation and descriptor changes at the final lookup", () => {
    const changes: ((row: CreditFacilityState) => void)[] = [
      (row) => {
        row.principalMinor = P.one;
      },
      (row) => {
        row.limitMinor += P.one;
      },
      (row) => {
        row.source.citation += " changed";
      },
      (row) => {
        Object.defineProperty(row, "limitMinor", { writable: false });
      },
    ];
    for (const change of changes) {
      const f = fixture(),
        row = facility(f),
        s = session(f);
      const receipt = prepareFinanceCredit(s, {
        facilityId: row.id,
        requestedMinor: unit,
        reasonKey: "fixture:credit",
        triggerId: "fixture:trigger",
      });
      rejectAtFinalLookup(
        f,
        s.seal(receipt),
        () => change(row),
        /Stale finance/,
      );
    }
  });

  it("guards unchanged nested prior totals, actual module map ownership and portfolio membership", () => {
    const changes: ((f: Fixture) => void)[] = [
      (f) => {
        f.core.finance.totalsByKind.get("credit")!.repaidMinor = P.one;
      },
      (f) => {
        f.core.finance.facilities = new Map(f.core.finance.facilities);
      },
      (f) => {
        f.journal.accountsByOwner.get(lender)!.add("fixture:missing-account");
      },
      (f) => {
        f.journal.accountsByOwner = new Map(f.journal.accountsByOwner);
      },
      (f) => {
        f.parameters.zero = -P.one;
      },
      (f) => {
        f.core.data.parameters = { ...f.core.data.parameters };
      },
    ];
    for (const change of changes) {
      const f = fixture(),
        row = facility(f);
      f.core.finance.totalsByKind.set("credit", {
        requestedMinor: P.zero,
        paidMinor: P.zero,
        unfundedMinor: P.zero,
        borrowedMinor: P.zero,
        repaidMinor: P.zero,
      });
      const s = session(f),
        receipt = prepareFinanceCredit(s, {
          facilityId: row.id,
          requestedMinor: unit,
          reasonKey: "fixture:credit",
          triggerId: "fixture:trigger",
        });
      rejectAtFinalLookup(f, s.seal(receipt), () => change(f), /Stale finance/);
    }
  });

  it("rejects nonwritable/accessor update fields before any live cash or metadata changes", () => {
    for (const descriptor of [
      { value: P.zero, writable: false },
      { get: () => P.zero },
    ]) {
      const f = fixture(),
        row = facility(f);
      Object.defineProperty(row, "principalMinor", {
        ...descriptor,
        enumerable: true,
        configurable: true,
      });
      const before = snapshot(f),
        s = session(f);
      expect(() =>
        prepareFinanceCredit(s, {
          facilityId: row.id,
          requestedMinor: unit,
          reasonKey: "fixture:credit",
          triggerId: "fixture:trigger",
        }),
      ).toThrow(/direct|writable/);
      expect(snapshot(f)).toBe(before);
    }
  });

  it("stages ordered contract credit and payer legs, one folded total and exact due/optional deletion metadata", () => {
    const f = fixture(),
      line = facility(f),
      row = contract(f, {
        creditFacilityId: line.id,
        firstUnpaidAt: undefined,
        kind: "credit",
      });
    books(f, { costContractIds: [row.id] });
    const before = snapshot(f),
      s = session(f),
      receipt = prepareFinanceContract(s, row.id),
      plan = s.seal(receipt);
    expect(snapshot(f)).toBe(before);
    expect(receipt.payeeBeforeMinor).toBe(P.zero);
    expect(receipt.payments[P.zero]!.payerBeforeMinor).toBe(unit);
    expect(plan.postings.length).toBe(pair + pair);
    perform(f, plan);
    expect(row.dueAt).toBe(next);
    expect(row.lastSettledAt).toBe(date);
    expect(Object.hasOwn(row, "firstUnpaidAt")).toBe(false);
    expect(f.core.finance.contractsDueAt.has(date)).toBe(false);
    expect(f.core.finance.contractsDueAt.get(next)).toEqual(new Set([row.id]));
    expect(f.core.finance.totalsByKind.get("credit")).toMatchObject({
      borrowedMinor: unit,
      requestedMinor: unit,
      paidMinor: unit,
    });
    expect(f.core.finance.businesses.get(employer)!.operatingPaidMinor).toBe(
      unit,
    );
  });

  it("preserves market-adjusted sales/book totals and the shared latest/detail receipt identity", () => {
    const f = fixture(),
      row = contract(f, { marketAdjusted: true, salesReceipt: true });
    f.core.organizations.get(employer)!.liquidMinor = unit + unit;
    f.core.observer = true;
    const buyer = books(f, { costContractIds: [row.id] }),
      seller = books(f, {
        organizationId: supplier,
        annualDemandMinor: unit + unit,
        anchorAnnualDemandMinor: unit,
      });
    const s = session(f),
      receipt = prepareFinanceContract(s, row.id);
    perform(f, s.seal(receipt));
    expect(receipt.requestedMinor).toBe(unit + unit);
    expect(receipt.paidMinor).toBe(unit + unit);
    expect(seller.receivedMinor).toBe(unit + unit);
    expect(seller.salesReceivedMinor).toBe(unit + unit);
    expect(buyer.operatingPaidMinor).toBe(unit + unit);
    expect(f.core.finance.detailedReceipts.get(receipt.id)).toBe(
      f.core.finance.latestReceiptsByContract.get(row.id),
    );
  });

  it("rejects a nonconfigurable present-own-undefined deletion after local funding preparation without live writes", () => {
    const f = fixture(),
      line = facility(f),
      row = contract(f, { creditFacilityId: line.id });
    Object.defineProperty(row, "firstUnpaidAt", {
      value: undefined,
      writable: true,
      enumerable: true,
      configurable: false,
    });
    const before = snapshot(f);
    expect(() => prepareFinanceContract(session(f), row.id)).toThrow(
      /configurable/,
    );
    expect(snapshot(f)).toBe(before);
    expect(Object.hasOwn(row, "firstUnpaidAt")).toBe(true);
  });

  it("completes an unpaid nonarrears budget once without cash sequence, fake lines or firstUnpaidAt", () => {
    const f = fixture(),
      row = contract(f, { accruesArrears: false }),
      s = session(f),
      sequence = f.journal.nextSequence;
    const receipt = prepareFinanceContract(s, row.id),
      plan = s.seal(receipt);
    expect(plan.postings).toEqual([]);
    const { row: marker } = perform(f, plan);
    expect(receipt.unfundedMinor).toBe(unit);
    expect(row.arrearsMinor).toBe(P.zero);
    expect(row.dueAt).toBe(next);
    expect(Object.hasOwn(row, "firstUnpaidAt")).toBe(false);
    expect(marker.completedAt).toBe(date);
    expect(f.journal.nextSequence).toBe(sequence);
    const after = snapshot(f);
    expect(() =>
      completeCashJournalSource(f.journal, f.host, {
        kind: sourceKind,
        id: marker.id,
      }),
    ).toThrow();
    expect(snapshot(f)).toBe(after);
    expect(() => prepareFinanceContract(session(f), row.id)).toThrow(
      /not due|already settled/,
    );
  });

  it("keeps legal arrears/firstUnpaidAt and updates actual resident income with ordered multipayer payments", () => {
    const f = fixture();
    f.core.organizations.get(employer)!.liquidMinor = P.one;
    f.core.organizations.get(lender)!.liquidMinor = P.one;
    const row = contract(f, {
      payerIds: [employer, lender],
      payeeId: worker,
      amountMinor: unit,
      recipientIncome: {
        personId: worker,
        householdId: home,
        kindId: "retirement",
        sourceFactId: "fixture:standing-award",
      },
    });
    const s = session(f),
      receipt = prepareFinanceContract(s, row.id);
    perform(f, s.seal(receipt));
    expect(receipt.payments.map((payment) => payment.paidMinor)).toEqual([
      P.one,
      P.one,
    ]);
    expect(row.arrearsMinor).toBe(unit - pair);
    expect(row.firstUnpaidAt).toBe(date);
    const key = date.slice(P.zero, P.isoMonthCharacters) + ":" + place;
    expect(f.core.finance.paidIncomeByPlaceMonth.get(key)).toBe(pair);
    expect(
      f.core.finance.paidIncomeByPlaceMonthKind.get(key + ":retirement"),
    ).toBe(pair);
  });

  it("bills floored dated exposure with fractional remainder once, without changing principal", () => {
    const f = fixture(),
      fraction = P.one / (pair + pair),
      line = facility(f, undefined, {
        principalMinor: unit,
        unbilledInterestMinor: P.one + fraction,
        interestRemainderMinor: fraction,
      });
    f.core.organizations.get(employer)!.liquidMinor = P.one;
    const row = contract(f, {
      amountMinor: P.zero,
      interestFacilityId: line.id,
      kind: DEFAULT_DATA.finance!.kinds.interest,
    });
    const s = session(f),
      receipt = prepareFinanceContract(s, row.id);
    perform(f, s.seal(receipt));
    expect(receipt.requestedMinor).toBe(P.one);
    expect(line.interestRemainderMinor).toBe(fraction + fraction);
    expect(line.unbilledInterestMinor).toBe(P.zero);
    expect(line.lastInterestAt).toBe(date);
    expect(line.principalMinor).toBe(unit);
    expect(f.core.finance.repaymentDueFacilityIds.has(line.id)).toBe(true);
  });

  it("consumes the exact frozen sales request/basis and reports its budget even when cash cannot fill it", () => {
    const f = fixture(),
      row = contract(f, { salesReceiptBudget: true, accruesArrears: false });
    books(f, { costContractIds: [row.id] });
    const basis = {
      payerId: employer,
      amountMinor: unit,
      firstAllocatedAt: prior,
      previousReceivedMinor: P.zero,
      receivedThroughMinor: unit,
    };
    f.core.finance.salesPendingBudgetByContract.set(row.id, { ...basis });
    f.core.finance.salesBudgetPoolsByPayer.set(employer, {
      payerId: employer,
      date,
      previousReceivedMinor: P.zero,
      receivedThroughMinor: unit,
      receiptsMinor: unit,
      routeCostShare: P.one,
      allocatedMinor: unit,
      allocatedByContract: new Map([[row.id, unit]]),
      requestedByContract: new Map([[row.id, unit]]),
      basisByContract: new Map([[row.id, basis]]),
      pendingBeforeByContract: new Map([[row.id, unit]]),
    });
    const s = session(f),
      receipt = prepareFinanceContract(s, row.id);
    perform(f, s.seal(receipt));
    expect(receipt.salesBudget).toMatchObject({
      consumedBudgetMinor: unit,
      budgetFirstAllocatedAt: prior,
      allocatedForContractMinor: unit,
    });
    expect(f.core.finance.salesPendingBudgetByContract.has(row.id)).toBe(false);
    expect(row.arrearsMinor).toBe(P.zero);
  });

  it("guards nested procurement basis fields and exact pool request-map membership before zero completion", () => {
    for (const mutateBasis of [false, true]) {
      const f = fixture(),
        row = contract(f, { salesReceiptBudget: true, accruesArrears: false });
      books(f, { costContractIds: [row.id] });
      const basis = {
          payerId: employer,
          amountMinor: unit,
          firstAllocatedAt: prior,
          previousReceivedMinor: P.zero,
          receivedThroughMinor: unit,
        },
        requested = new Map([[row.id, unit]]);
      f.core.finance.salesPendingBudgetByContract.set(row.id, { ...basis });
      f.core.finance.salesBudgetPoolsByPayer.set(employer, {
        payerId: employer,
        date,
        previousReceivedMinor: P.zero,
        receivedThroughMinor: unit,
        receiptsMinor: unit,
        routeCostShare: P.one,
        allocatedMinor: unit,
        allocatedByContract: new Map([[row.id, unit]]),
        requestedByContract: requested,
        basisByContract: new Map([[row.id, basis]]),
        pendingBeforeByContract: new Map([[row.id, unit]]),
      });
      const s = session(f),
        receipt = prepareFinanceContract(s, row.id);
      rejectAtFinalLookup(
        f,
        s.seal(receipt),
        () => {
          if (mutateBasis) basis.receivedThroughMinor += P.one;
          else requested.delete(row.id);
        },
        /Stale finance/,
      );
    }
  });

  it("rejects nested payer/due bucket/income residence drift before contract mutation", () => {
    const f = fixture(),
      row = contract(f, {
        payeeId: worker,
        recipientIncome: {
          personId: worker,
          householdId: home,
          kindId: "retirement",
          sourceFactId: "fixture:award",
        },
      });
    f.core.organizations.get(employer)!.liquidMinor = unit;
    const s = session(f),
      receipt = prepareFinanceContract(s, row.id);
    rejectAtFinalLookup(
      f,
      s.seal(receipt),
      () => {
        (row.payerIds as string[])[P.zero] = lender;
      },
      /Stale finance/,
    );
    const g = fixture(),
      other = contract(g);
    g.core.organizations.get(employer)!.liquidMinor = unit;
    const t = session(g),
      planned = prepareFinanceContract(t, other.id);
    rejectAtFinalLookup(
      g,
      t.seal(planned),
      () => {
        g.core.finance.contractsDueAt.set(date, new Set([other.id]));
      },
      /Stale finance/,
    );
    const h = fixture(),
      resident = contract(h, {
        payeeId: worker,
        recipientIncome: {
          personId: worker,
          householdId: home,
          kindId: "retirement",
          sourceFactId: "fixture:award",
        },
      });
    h.core.organizations.get(employer)!.liquidMinor = unit;
    const u = session(h),
      paid = prepareFinanceContract(u, resident.id);
    rejectAtFinalLookup(
      h,
      u.seal(paid),
      () => {
        (h.core.households.get(home)!.memberIds as string[]).splice(
          P.zero,
          P.one,
        );
      },
      /Stale finance/,
    );
  });

  it("detects mutable Set next-payload drift despite Object.freeze and freezes plain receipt payloads", () => {
    const f = fixture(),
      row = contract(f),
      s = session(f),
      receipt = prepareFinanceContract(s, row.id),
      plan = s.seal(receipt);
    const write = plan.metadata.find(
      (entry) =>
        entry.kind === "map" &&
        entry.target === f.core.finance.contractsDueAt &&
        entry.key === next,
    );
    expect(write?.kind).toBe("map");
    const replacement = (
      write as Extract<CashJournalMetadataWrite, { kind: "map" }>
    ).next as Set<string>;
    expect(Object.isFrozen(replacement)).toBe(true);
    expect(() => {
      plan.result.source.citation = "changed returned receipt";
    }).toThrow();
    rejectAtFinalLookup(
      f,
      plan,
      () => {
        replacement.add("fixture:tampered-next");
      },
      /Stale finance set contents/,
    );
  });

  it("sorts preferred credit first, shares lender availability and stages funded-before-wage receipt balances", () => {
    const f = fixture();
    f.core.organizations.get(lender)!.liquidMinor = unit;
    facility(f, "fixture:a", { limitMinor: P.one });
    facility(f, "fixture:z", { limitMinor: P.one });
    books(f, { creditFacilityId: "fixture:z" });
    const s = session(f),
      projection = prepareWorkFinancePlan(
        s,
        employer,
        worker,
        unit,
        "fixture:work-result",
      );
    expect(projection.credits.map((credit) => credit.facilityId)).toEqual([
      "fixture:z",
      "fixture:a",
    ]);
    expect(projection.availableCashMinor).toBe(pair);
    expect(projection.expectedPaidMinor).toBe(pair);
    expect(projection.payerCashBeforeMinor).toBe(pair);
    expect(projection.payerCashAfterMinor).toBe(P.zero);
    const receipt = workReceipt(projection);
    guardWorkFinanceResult(s, receipt, projection);
    const plan = s.seal(receipt);
    const { input } = install(f, plan),
      journal = postCashJournal(f.journal, f.host, input);
    expect(journal.owners.get(employer)).toMatchObject({
      beforeMinor: P.zero,
      afterMinor: P.zero,
    });
    expect(journal.grossDebitMinor).toBe(pair + pair);
    expect(f.core.finance.businesses.get(employer)).toMatchObject({
      wagesRequestedMinor: unit,
      wagesPaidMinor: pair,
      wagesUnpaidMinor: unit - pair,
    });
    expect(f.core.finance.totalsByKind.get("credit")!.borrowedMinor).toBe(pair);
  });

  it("validates the work-finance equality before commit and preserves closed-employer no-funding behavior", () => {
    const f = fixture();
    facility(f);
    const book = books(f, { closedAt: prior });
    const before = snapshot(f),
      s = session(f),
      projection = prepareWorkFinancePlan(
        s,
        employer,
        worker,
        unit,
        "fixture:work-result",
      );
    expect(projection.credits).toEqual([]);
    expect(projection.expectedPaidMinor).toBe(P.zero);
    const receipt = workReceipt(projection);
    receipt.paidMinor = P.one;
    expect(() => guardWorkFinanceResult(s, receipt, projection)).toThrow(
      /differs/,
    );
    expect(snapshot(f)).toBe(before);
    const retry = session(f),
      nextProjection = prepareWorkFinancePlan(
        retry,
        employer,
        worker,
        unit,
        "fixture:work-result",
      ),
      admitted = workReceipt(nextProjection),
      sequence = f.journal.nextSequence;
    guardWorkFinanceResult(retry, admitted, nextProjection);
    perform(f, retry.seal(admitted));
    expect(book.wagesUnpaidMinor).toBe(unit);
    expect(f.journal.nextSequence).toBe(sequence);
  });

  it("rejects an employer index that points at another borrower before it can fund a wage", () => {
    const f = fixture(),
      row = facility(f, undefined, { borrowerId: supplier });
    f.core.finance.facilitiesByBorrower.set(employer, new Set([row.id]));
    const before = snapshot(f);
    expect(() =>
      prepareWorkFinancePlan(
        session(f),
        employer,
        worker,
        unit,
        "fixture:work-result",
      ),
    ).toThrow(/index is inconsistent/);
    expect(snapshot(f)).toBe(before);
  });

  it("rejects unrelated journal fund/portfolio metadata overrides on both zero and cash plans", () => {
    for (const cash of [false, true])
      for (const target of ["fund", "portfolio"]) {
        const f = fixture(),
          fundId = allocate(f, lender),
          s = session(f);
        if (cash) {
          f.core.organizations.get(employer)!.liquidMinor = P.one;
          s.cash.move(employer, worker, P.one, "fixture:wage");
        }
        if (target === "fund")
          s.metadata.write(
            f.journal.accounts.get(fundId)!,
            "allocatedMinor",
            unit + unit,
          );
        else
          s.metadata.setMember(
            f.journal.accountsByOwner.get(lender)!,
            "fixture:injected-account",
            true,
          );
        const plan = s.seal("unsafe metadata"),
          { input } = install(f, plan),
          before = snapshot(f);
        expect(() =>
          cash
            ? postCashJournal(f.journal, f.host, input)
            : completeCashJournalSource(f.journal, f.host, input.sourceRef),
        ).toThrow(/journal-owned/);
        expect(snapshot(f)).toBe(before);
      }
  });
});
