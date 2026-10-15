/** UNEXECUTED conditional source-only cases. No ordinary-world or empirical claim. */
import { describe, expect, it } from "vitest";
import { cashJournalParameters } from "./cash-host";
import { advanceDate } from "./calendar";
import { DEFAULT_DATA, extendData } from "./data";
import financePolicy from "./data/finance.json" with { type: "json" };
import {
  admitCompositeFinanceCreditSources,
  cancelCompositeFinanceCreditSources,
  ensureFinanceCashModule,
  financeCashSourceProvider,
  resolveCompositeFinanceCreditSources,
  settleFinanceContractJournal,
} from "./finance-cash";
import { FinancePlanningSession, prepareWorkFinancePlan } from "./finance-plan";
import { parameter as p } from "./parameters";
import { coreAPI, createCore, registerModule } from "./state";
import type {
  CreditFacilityInput,
  FinanceContractInput,
} from "./finance-types";
import type {
  CoreAPI,
  CoreInput,
  CoreState,
  PersonInput,
  Source,
} from "./types";

const date = "2021-01-01",
  nextMonth = "2021-02-01",
  placeId = "place:cash-adapter-fixture";
const buyer = "organization:fixture-buyer",
  supplier = "organization:fixture-supplier",
  lender = "organization:fixture-lender",
  donor = "organization:fixture-donor";
const personId = "person:fixture-recipient",
  jobId = "job:fixture-custodial-product";
const contractId = "contract:fixture-standing-cost",
  facilityId = "facility:fixture-recorded-credit",
  rate = "fixtureCashJournalZeroRate";
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation:
    "Explicit named technical fixture records; these balances, awards and public terms are not observed facts.",
  estimatedFrom: "Small conditional finance writer fixture only.",
};
const data = extendData(DEFAULT_DATA, {
  parameters: {
    [rate]: {
      value: p("zero"),
      tag: "SOURCED",
      citation:
        "The isolated fixture's actual loan terms specify zero interest; this is not an empirical interest rate.",
    },
  },
});

function person(): PersonInput {
  return {
    id: personId,
    givenName: "Recorded",
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId,
    householdId: `household:${personId}`,
    tier: "weekly",
    traits: {},
    liquidMinor: p("zero"),
    livingCostDailyMinor: p("zero"),
    source,
    familyIds: [],
    knownIds: [],
  };
}
function terms(
  overrides: Partial<FinanceContractInput> = {},
): FinanceContractInput {
  return {
    id: contractId,
    payerIds: [buyer],
    payeeId: supplier,
    kind: financePolicy.kinds.operating,
    amountMinor: 100,
    dueAt: date,
    periodMonths: p("one"),
    accruesArrears: true,
    source,
    ...overrides,
  };
}
function facility(): CreditFacilityInput {
  return {
    id: facilityId,
    borrowerId: buyer,
    lenderId: lender,
    limitMinor: 200,
    active: true,
    annualInterestParameter: rate,
    source,
  };
}
function opening(
  options: {
    buyerCash?: number;
    lenderCash?: number;
    donorCash?: number;
    credit?: boolean;
    contracts?: readonly FinanceContractInput[];
  } = {},
): CoreInput {
  const recipient = person();
  return {
    seed: "cash-adapter-source-only-fixture",
    startedAt: date,
    people: [recipient],
    households: [
      { id: recipient.householdId, placeId, memberIds: [personId], source },
    ],
    jobs: [],
    organizations: [
      { id: buyer, liquidMinor: options.buyerCash ?? p("zero") },
      { id: supplier, liquidMinor: p("zero") },
      { id: lender, liquidMinor: options.lenderCash ?? 100 },
      { id: donor, liquidMinor: options.donorCash ?? p("zero") },
    ].map((row) => ({
      ...row,
      name: row.id,
      placeId,
      kind: "employer",
      source,
    })),
    finance: {
      contracts: options.contracts ?? [
        terms(options.credit ? { creditFacilityId: facilityId } : {}),
      ],
      facilities: options.credit ? [facility()] : [],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function fixture(options: Parameters<typeof opening>[0] = {}): CoreState {
  return createCore(opening(options), { data });
}
function money(core: CoreState): number {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    p("zero"),
  );
}
function financial(core: CoreState): string {
  return JSON.stringify(
    {
      money: [...core.people.values(), ...core.organizations.values()].map(
        (row) => [row.id, row.liquidMinor],
      ),
      totals: core.finance.totalsByKind,
      receipts: core.finance.latestReceiptsByContract,
      credit: core.finance.latestCreditByFacility,
      sequence: core.cashJournal.nextSequence,
      journalTotals: core.cashJournal.totals,
      external: core.cashJournal.externalFlowsByOwner,
      facilities: [...core.finance.facilities.values()].map((row) => [
        row.id,
        row.principalMinor,
        row.interestArrearsMinor,
        row.lastInterestAt,
        row.interestRemainderMinor,
        row.unbilledInterestMinor,
        row.lastAccruedAt,
      ]),
      contractProgress: [...core.finance.contracts.values()].map((row) => [
        row.id,
        row.dueAt,
        row.lastSettledAt,
        row.arrearsMinor,
        row.firstUnpaidAt,
      ]),
      requests: [core.finance.creditRequestsAt, core.finance.creditRequestIds],
      sources: [...core.finance.cashSources.keys()],
    },
    (_key, value: unknown) =>
      value instanceof Map
        ? [...value]
        : value instanceof Set
          ? [...value]
          : value,
  );
}
function mutateAfterFirstLookup(
  core: CoreState,
  api: CoreAPI,
  mutate: () => void,
): CoreAPI {
  return {
    ...api,
    postJournal(input) {
      const original = core.cashJournal.sourceProviders.get(
        input.sourceRef.kind,
      )!;
      let calls = p("zero");
      core.cashJournal.sourceProviders.set(
        input.sourceRef.kind,
        (reference) => {
          const slot = original(reference);
          calls += p("one");
          if (calls === p("one")) mutate();
          return slot;
        },
      );
      try {
        return api.postJournal(input);
      } finally {
        core.cashJournal.sourceProviders.set(input.sourceRef.kind, original);
      }
    },
  };
}

describe("actual finance journal adapters (all candidates UNEXECUTED)", () => {
  it("lazily owns the configured namespace and commits credit plus payment once", () => {
    const core = fixture({ credit: true }),
      api = coreAPI(core),
      total = money(core);
    expect(core.modules.has(financePolicy.cashJournal.moduleId)).toBe(false);
    const receipt = api.settleFinanceContract(contractId),
      credit = core.finance.latestCreditByFacility.get(facilityId)!;
    expect(receipt).toMatchObject({
      paidMinor: 100,
      unfundedMinor: 0,
      creditReceiptId: credit.id,
    });
    expect(core.finance.facilities.get(facilityId)!.principalMinor).toBe(100);
    expect(core.cashJournal.totals).toMatchObject({
      count: 1,
      grossDebitMinor: 200,
      grossCreditMinor: 200,
    });
    expect(core.finance.totalsByKind.get("credit")!.borrowedMinor).toBe(100);
    const primary = core.finance.cashSources.get(receipt.id)!,
      secondary = core.finance.cashSources.get(credit.id)!;
    expect(primary.postedJournalSequence).toBe(secondary.postedJournalSequence);
    expect(Object.isFrozen(primary)).toBe(false);
    expect(Object.isFrozen(secondary)).toBe(false);
    expect(
      Object.getOwnPropertyDescriptor(primary, "postedJournalSequence")!
        .writable,
    ).toBe(true);
    expect(
      Object.isFrozen(core.finance.latestReceiptsByContract.get(contractId)),
    ).toBe(true);
    expect(money(core)).toBe(total);
  });
  it("completes genuine zero-actual-cash contract and credit without journal lines", () => {
    const core = fixture({ credit: true, lenderCash: 0 }),
      api = coreAPI(core),
      sequence = core.cashJournal.nextSequence;
    const receipt = api.settleFinanceContract(contractId),
      credit = core.finance.latestCreditByFacility.get(facilityId)!;
    expect(receipt).toMatchObject({ paidMinor: 0, unfundedMinor: 100 });
    expect(credit.transferredMinor).toBe(0);
    expect(core.finance.facilities.get(facilityId)!.principalMinor).toBe(0);
    for (const id of [receipt.id, credit.id])
      expect(core.finance.cashSources.get(id)).toMatchObject({
        completedAt: date,
      });
    expect(
      core.finance.cashSources.get(receipt.id)!.postedJournalSequence,
    ).toBeUndefined();
    expect(core.cashJournal.nextSequence).toBe(sequence);
    expect(core.cashJournal.totals.count).toBe(0);
  });
  it("keeps actual multi-payer order and payment legs", () => {
    const core = fixture({
        buyerCash: 30,
        donorCash: 80,
        contracts: [terms({ payerIds: [buyer, donor] })],
      }),
      api = coreAPI(core),
      total = money(core);
    const result = api.settleFinanceContract(contractId);
    expect(result.payments.map((row) => [row.payerId, row.paidMinor])).toEqual([
      [buyer, 30],
      [donor, 70],
    ]);
    expect(core.cashJournal.totals.count).toBe(1);
    expect(money(core)).toBe(total);
  });
  it("rejects an owned-kind collision before cash or financial metadata", () => {
    const core = fixture({ buyerCash: 100 }),
      api = coreAPI(core),
      before = financial(core);
    registerModule(core, {
      id: "fixture:another-source-owner",
      journalSourceProviders: {
        [financePolicy.cashJournal.sourceKinds.contract]: () => undefined,
      },
    });
    expect(() => api.settleFinanceContract(contractId)).toThrow(/namespace/);
    expect(financial(core)).toBe(before);
  });
  it("rejects arbitrary standalone draw labels", () => {
    const core = fixture({ credit: true }),
      api = coreAPI(core),
      before = financial(core);
    expect(() =>
      api.drawCredit(
        facilityId,
        100,
        financePolicy.reasons.borrowing,
        "fixture:recorded-draw-request",
      ),
    ).toThrow(/genuine/);
    expect(financial(core)).toBe(before);
  });
  it("resolves an actual contract key and preserves a valid partial draw", () => {
    const core = fixture({
        credit: true,
        contracts: [terms({ amountMinor: 200, creditFacilityId: facilityId })],
      }),
      api = coreAPI(core),
      total = money(core);
    const credit = api.drawCredit(
      facilityId,
      100,
      financePolicy.reasons.borrowing,
      contractId,
    );
    expect(credit).toMatchObject({
      requestedMinor: 100,
      transferredMinor: 100,
      principalAfterMinor: 100,
    });
    expect(core.finance.latestReceiptsByContract.has(contractId)).toBe(false);
    expect(money(core)).toBe(total);
  });
  it("rejects a request larger than the actual current deficiency", () => {
    const core = fixture({ credit: true }),
      api = coreAPI(core),
      before = financial(core);
    expect(() =>
      api.drawCredit(
        facilityId,
        101,
        financePolicy.reasons.borrowing,
        contractId,
      ),
    ).toThrow(/deficiency/);
    expect(financial(core)).toBe(before);
  });
  it("rejects a future genuine contract draw trigger", () => {
    const core = fixture({
        credit: true,
        contracts: [terms({ dueAt: nextMonth, creditFacilityId: facilityId })],
      }),
      api = coreAPI(core),
      before = financial(core);
    expect(() =>
      api.drawCredit(
        facilityId,
        100,
        financePolicy.reasons.borrowing,
        contractId,
      ),
    ).toThrow(/currently due/);
    expect(financial(core)).toBe(before);
  });
  it("rejects a real facility belonging to another borrower", () => {
    const input = opening({ credit: true }),
      foreignId = "facility:fixture-other-borrower";
    const core = createCore(
        {
          ...input,
          finance: {
            ...input.finance!,
            facilities: [
              ...input.finance!.facilities,
              { ...facility(), id: foreignId, borrowerId: donor },
            ],
          },
        },
        { data },
      ),
      api = coreAPI(core),
      before = financial(core);
    expect(() =>
      api.drawCredit(
        foreignId,
        100,
        financePolicy.reasons.borrowing,
        contractId,
      ),
    ).toThrow(/linked/);
    expect(financial(core)).toBe(before);
  });
  it("fails before cash if the actual terms change between source lookups", () => {
    const core = fixture({ buyerCash: 100 }),
      api = coreAPI(core),
      before = financial(core);
    const stale = mutateAfterFirstLookup(core, api, () => {
      core.finance.contracts.get(contractId)!.amountMinor = 101;
    });
    expect(() =>
      settleFinanceContractJournal(core, stale, contractId),
    ).toThrow();
    expect(financial(core)).toBe(before);
  });
  it("repays principal only from the actual completed current interest receipt", () => {
    const incomeId = "contract:fixture-recorded-incoming-cash",
      core = fixture({
        credit: true,
        donorCash: 100,
        contracts: [
          terms({ creditFacilityId: facilityId }),
          terms({
            id: incomeId,
            payerIds: [donor],
            payeeId: buyer,
            dueAt: nextMonth,
          }),
        ],
      }),
      api = coreAPI(core),
      total = money(core);
    api.settleFinanceContract(contractId);
    advanceDate(core, nextMonth);
    api.settleFinanceContract(incomeId);
    const interest = api.settleFinanceContract(
      `${financePolicy.cashJournal.interestContractPrefix}${facilityId}`,
    );
    expect(interest.paidMinor).toBe(0);
    expect(core.finance.cashSources.get(interest.id)!.completedAt).toBe(
      nextMonth,
    );
    const credit = api.repayCredit(
      facilityId,
      100,
      financePolicy.reasons.repayment,
      interest.id,
    );
    expect(credit).toMatchObject({
      transferredMinor: 100,
      principalAfterMinor: 0,
    });
    expect(money(core)).toBe(total);
  });
  it("rejects a made-up repayment receipt", () => {
    const core = fixture({ credit: true }),
      api = coreAPI(core),
      before = financial(core);
    expect(() =>
      api.repayCredit(
        facilityId,
        100,
        financePolicy.reasons.repayment,
        "fixture:recorded-repayment-request",
      ),
    ).toThrow(/completed current interest/);
    expect(financial(core)).toBe(before);
  });
  it("uses the current canonical result after completion and blocks duplicate settlement", () => {
    const core = fixture({ buyerCash: 100 }),
      api = coreAPI(core),
      result = api.settleFinanceContract(contractId),
      before = financial(core);
    const slot = financeCashSourceProvider(api, {
      kind: financePolicy.cashJournal.sourceKinds.contract,
      id: result.id,
    });
    expect(
      slot!.resolved.expectedPostings.map((row) => row.deltaMinor),
    ).toEqual([-100, 100]);
    expect(slot!.metadata).toBeUndefined();
    expect(slot!.marker).toBe(core.finance.cashSources.get(result.id));
    expect(() => api.settleFinanceContract(contractId)).toThrow();
    expect(financial(core)).toBe(before);
  });
  it("holds only the latest quiet contract marker after a later occurrence", () => {
    const core = fixture({ buyerCash: 200 }),
      api = coreAPI(core),
      first = api.settleFinanceContract(contractId);
    advanceDate(core, nextMonth);
    const second = api.settleFinanceContract(contractId);
    expect(core.finance.cashSources.has(first.id)).toBe(false);
    expect(core.finance.cashSources.has(second.id)).toBe(true);
    expect(core.finance.cashLatestContractSource.get(contractId)).toBe(
      second.id,
    );
    expect(core.finance.cashRequiredReceipts.has(first.id)).toBe(false);
  });
  it("releases an actual former open requirement before pruning its source", () => {
    const incomeId = "contract:fixture-arrears-funding",
      core = fixture({
        buyerCash: 50,
        donorCash: 150,
        contracts: [
          terms(),
          terms({
            id: incomeId,
            payerIds: [donor],
            payeeId: buyer,
            amountMinor: 150,
            dueAt: nextMonth,
          }),
        ],
      }),
      api = coreAPI(core);
    const first = api.settleFinanceContract(contractId),
      kind = financePolicy.cashJournal.sourceKinds.contract;
    const retainedJournalId = core.cashJournal.requiredBySource
      .get(kind)!
      .get(first.id)!;
    expect(first.arrearsMinor).toBe(50);
    expect(core.cashJournal.detailedReceipts.has(retainedJournalId)).toBe(true);
    advanceDate(core, nextMonth);
    api.settleFinanceContract(incomeId);
    const next = api.settleFinanceContract(contractId);
    expect(next).toMatchObject({
      requestedMinor: 150,
      paidMinor: 150,
      arrearsMinor: 0,
    });
    expect(
      core.cashJournal.requiredBySource.get(kind)?.has(first.id) ?? false,
    ).toBe(false);
    expect(core.cashJournal.detailedReceipts.has(retainedJournalId)).toBe(
      false,
    );
    expect(core.finance.cashSources.has(first.id)).toBe(false);
    expect(core.finance.cashRequiredReceipts.has(first.id)).toBe(false);
  });
  it("permits the no-finance-policy empty-credit composition without a source module", () => {
    const input = opening({ buyerCash: 100, contracts: [] }),
      noFinanceData = { ...data };
    delete input.finance;
    delete noFinanceData.finance;
    const core = createCore(input, { data: noFinanceData });
    ensureFinanceCashModule(core);
    const session = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    );
    const work = prepareWorkFinancePlan(
        session,
        buyer,
        personId,
        10,
        "work:fixture-owned-result",
      ),
      trigger = {
        kind: "work.fixture-result",
        id: "work:fixture-owned-result",
      };
    expect(work.credits).toEqual([]);
    expect(work.expectedPaidMinor).toBe(10);
    expect(
      admitCompositeFinanceCreditSources(core, session, [], trigger),
    ).toEqual({
      requiredRelatedRefs: [],
      relatedRecords: [],
      secondaryMarkers: [],
    });
    session.seal(work);
    expect(
      resolveCompositeFinanceCreditSources(core, [], trigger).secondaryMarkers,
    ).toEqual([]);
    expect(
      core.cashJournal.sourceProviders.has(
        financePolicy.cashJournal.sourceKinds.credit,
      ),
    ).toBe(false);
  });
});

function publicFixture(): CoreState {
  const input = opening({ buyerCash: 100, contracts: [] }),
    cfg = financePolicy.cashJournal.procurement[p("zero")]!,
    agreementId = "agreement:fixture-recorded-public-purchase";
  const authority = {
    id: "authority:fixture",
    issuerId: buyer,
    governmentKey: "government:fixture-recorded-county",
    jurisdictionId: "county:fixture",
    effectiveFrom: date,
    source,
  };
  const appropriation = {
    id: "appropriation:fixture",
    authorityId: authority.id,
    buyerAccountId: buyer,
    monthlyBudgetMinor: 100,
    effectiveFrom: date,
    source,
  };
  const agreement = {
    id: agreementId,
    authorityId: authority.id,
    appropriationId: appropriation.id,
    buyerAccountId: buyer,
    supplierIds: [supplier],
    serviceKey: cfg.serviceKey,
    providerQualifications: [
      {
        organizationId: supplier,
        serviceKey: cfg.serviceKey,
        jobIds: [jobId],
        providerRecordIds: [],
        sources: [
          {
            recordId: jobId,
            kind: "job",
            occupationClassification: cfg.supplierOccupations[p("zero")],
            source,
          },
        ],
      },
    ],
    effectiveFrom: date,
    source,
  };
  const actual = terms({
    id: `${agreementId}${cfg.agreementContractSeparator}${supplier}`,
    kind: cfg.contractKind,
    endsAt: "2022-01-01",
    accruesArrears: false,
    salesReceipt: true,
  });
  return createCore(
    {
      ...input,
      people: [{ ...input.people[p("zero")]!, jobId }],
      jobs: [
        {
          id: jobId,
          personId,
          organizationId: supplier,
          title: "Actual conditional custodial product job",
          hoursDaily: p("one"),
          wageDailyMinor: 10,
          occupationClassification: cfg.supplierOccupations[p("zero")],
          source,
        },
      ],
      organizations: input.organizations.map((row) =>
        row.id === buyer
          ? {
              ...row,
              governmentFacts: {
                governmentKey: authority.governmentKey,
                governmentJurisdictionId: authority.jurisdictionId,
                [`${cfg.authorityFieldPrefix}${placeId}`]:
                  JSON.stringify(authority),
                [`${cfg.appropriationFieldPrefix}${placeId}`]:
                  JSON.stringify(appropriation),
                [`${cfg.agreementFieldPrefix}${placeId}`]:
                  JSON.stringify(agreement),
              },
            }
          : row,
      ),
      finance: { ...input.finance!, contracts: [actual] },
    },
    { data },
  );
}
describe("conditional public record resolution (no actual appropriation claim)", () => {
  it("resolves the exact owner, authority, appropriation, agreement and owned product job", () => {
    const core = publicFixture(),
      api = coreAPI(core),
      id = [...core.finance.contracts.keys()][p("zero")]!,
      total = money(core);
    expect(api.settleFinanceContract(id).paidMinor).toBe(100);
    expect(money(core)).toBe(total);
  });
  it("rejects classification/owner identity when the actual agreement is absent", () => {
    const core = publicFixture(),
      api = coreAPI(core),
      id = [...core.finance.contracts.keys()][p("zero")]!,
      before = financial(core),
      cfg = financePolicy.cashJournal.procurement[p("zero")]!;
    expect(
      Reflect.deleteProperty(
        core.organizations.get(buyer)!.governmentFacts!,
        `${cfg.agreementFieldPrefix}${placeId}`,
      ),
    ).toBe(true);
    expect(() => api.settleFinanceContract(id)).toThrow(/agreement/);
    expect(financial(core)).toBe(before);
  });
  it("rejects a product qualification pointing to another employer's job", () => {
    const core = publicFixture(),
      api = coreAPI(core),
      id = [...core.finance.contracts.keys()][p("zero")]!,
      before = financial(core);
    core.jobs.get(jobId)!.organizationId = donor;
    expect(() => api.settleFinanceContract(id)).toThrow(/product job/);
    expect(financial(core)).toBe(before);
  });
  it("rechecks actual recorded appropriation between both active provider returns", () => {
    const core = publicFixture(),
      api = coreAPI(core),
      id = [...core.finance.contracts.keys()][p("zero")]!,
      before = financial(core),
      cfg = financePolicy.cashJournal.procurement[p("zero")]!;
    const stale = mutateAfterFirstLookup(core, api, () => {
      expect(
        Reflect.deleteProperty(
          core.organizations.get(buyer)!.governmentFacts!,
          `${cfg.appropriationFieldPrefix}${placeId}`,
        ),
      ).toBe(true);
    });
    expect(() => settleFinanceContractJournal(core, stale, id)).toThrow();
    expect(financial(core)).toBe(before);
  });
});

function outsideFixture(): CoreState {
  const input = opening({ contracts: [] }),
    outsideId = "organization:fixture-outside-flow",
    incomeId = "contract:fixture-awarded-income",
    awardId = "award:fixture-recorded-retirement";
  const recipient = {
    ...input.people[p("zero")]!,
    pastFacts: [
      {
        id: awardId,
        kind: "income:monthly-award",
        date,
        summary:
          "Explicit conditional standing cash award fixture; not an observed individual entitlement.",
        source,
        facts: {
          status: "in-payment",
          basis: "standing-entitlement",
          paymentMedium: "cash",
          payerId: buyer,
          monthlyMinor: "100",
          kindId: "retirement",
          householdId: input.people[p("zero")]!.householdId,
        },
      },
    ],
  };
  const income = terms({
    id: incomeId,
    payerIds: [buyer],
    payeeId: personId,
    kind: "income.retirement",
    accruesArrears: false,
    settlementPhaseId: financePolicy.defaultPhases.income,
    recipientIncome: {
      personId,
      householdId: recipient.householdId,
      kindId: "retirement",
      sourceFactId: awardId,
    },
  });
  const supported =
    financePolicy.cashJournal.externalInflowContracts[p("zero")]!;
  const funding = terms({
    payerIds: [outsideId],
    payeeId: buyer,
    kind: supported.contractKind,
    accruesArrears: false,
    settlementPhaseId: supported.phaseId,
    externalInflow: {
      kind: supported.inflowKind,
      ownerId: outsideId,
      incomeContractIds: [incomeId],
      sourceAwardIds: [awardId],
      source,
    },
  });
  return createCore(
    {
      ...input,
      people: [recipient],
      organizations: [
        ...input.organizations,
        {
          id: outsideId,
          name: "Explicit technical outside flow boundary",
          placeId,
          kind: "public-institution",
          source,
          outsideFlow: source,
          liquidMinor: p("zero"),
        },
      ],
      finance: { ...input.finance!, contracts: [income, funding] },
    },
    { data },
  );
}
describe("conditional dated outside obligations (zero prepaid stock)", () => {
  it("pays only the genuine source-sized due flow and then the awarded income", () => {
    const core = outsideFixture(),
      api = coreAPI(core),
      outsideId = "organization:fixture-outside-flow",
      total = money(core);
    expect(api.settleFinanceContract(contractId).paidMinor).toBe(100);
    expect(core.organizations.get(outsideId)!.liquidMinor).toBe(0);
    expect(core.cashJournal.externalFlowsByOwner.get(outsideId)).toMatchObject({
      netMinor: -100,
      outgoingMinor: 100,
      incomingMinor: 0,
    });
    expect(
      api.settleFinanceContract("contract:fixture-awarded-income").paidMinor,
    ).toBe(100);
    expect(core.people.get(personId)!.liquidMinor).toBe(100);
    expect(money(core)).toBe(total + 100);
  });
  it("rejects outside account mode alone", () => {
    const core = outsideFixture(),
      api = coreAPI(core),
      before = financial(core);
    delete core.finance.contracts.get(contractId)!.externalInflow;
    expect(() => api.settleFinanceContract(contractId)).toThrow(/descriptor/);
    expect(financial(core)).toBe(before);
  });
  it("rejects a made-up award reference", () => {
    const core = outsideFixture(),
      api = coreAPI(core),
      before = financial(core);
    core.finance.contracts.get(contractId)!.externalInflow!.sourceAwardIds = [
      "award:fixture-nonexistent",
    ];
    expect(() => api.settleFinanceContract(contractId)).toThrow(
      /qualified award/,
    );
    expect(financial(core)).toBe(before);
  });
  it("rejects terms larger than actual current recipient obligations", () => {
    const core = outsideFixture(),
      api = coreAPI(core),
      before = financial(core);
    core.finance.contracts.get(contractId)!.amountMinor = 101;
    expect(() => api.settleFinanceContract(contractId)).toThrow(/source-sized/);
    expect(financial(core)).toBe(before);
  });
  it("rejects a cap smaller than the exact recorded income sum", () => {
    const core = outsideFixture(),
      api = coreAPI(core),
      before = financial(core);
    core.finance.contracts.get(contractId)!.amountMinor = 99;
    expect(() => api.settleFinanceContract(contractId)).toThrow(/source-sized/);
    expect(financial(core)).toBe(before);
  });
  it("rejects a manufactured funding cutoff that its recipient terms never supplied", () => {
    const core = outsideFixture(),
      api = coreAPI(core),
      before = financial(core);
    core.finance.contracts.get(contractId)!.endsAt = "2022-01-01";
    expect(() => api.settleFinanceContract(contractId)).toThrow(/unmatched/);
    expect(financial(core)).toBe(before);
  });
  it("rejects recipient terms advanced to a different due date", () => {
    const core = outsideFixture(),
      api = coreAPI(core);
    core.finance.contracts.get("contract:fixture-awarded-income")!.dueAt =
      nextMonth;
    const before = financial(core);
    expect(() => api.settleFinanceContract(contractId)).toThrow(/unmatched/);
    expect(financial(core)).toBe(before);
  });
  it("rechecks a recipient award changed between provider lookups", () => {
    const core = outsideFixture(),
      api = coreAPI(core),
      before = financial(core);
    const stale = mutateAfterFirstLookup(core, api, () => {
      core.people.get(personId)!.pastFacts = core.people
        .get(personId)!
        .pastFacts!.map((fact) => ({
          ...fact,
          facts: { ...fact.facts, status: "ended" },
        }));
    });
    expect(() =>
      settleFinanceContractJournal(core, stale, contractId),
    ).toThrow();
    expect(financial(core)).toBe(before);
  });
});

/** Root work fixtures must exercise multi-worker retention and the owning release call. */
describe("composite source admission cancellation", () => {
  it("drops uncompleted composite markers without changing any actual finance state", () => {
    const core = fixture({ credit: true }),
      session = new FinancePlanningSession(
        core,
        core.cashJournal,
        cashJournalParameters(core),
      ),
      before = financial(core);
    const work = prepareWorkFinancePlan(
      session,
      buyer,
      personId,
      100,
      "work:fixture-owned-credit-result",
    );
    expect(work.credits.length).toBe(p("one"));
    const trigger = {
      kind: "work.fixture-result",
      id: "work:fixture-owned-credit-result",
    };
    admitCompositeFinanceCreditSources(core, session, work.credits, trigger);
    session.seal(work);
    expect(
      resolveCompositeFinanceCreditSources(core, work.credits, trigger)
        .secondaryMarkers.length,
    ).toBe(work.credits.length);
    cancelCompositeFinanceCreditSources(core, work.credits);
    expect(financial(core)).toBe(before);
  });
});
