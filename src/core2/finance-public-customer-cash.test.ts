/** All cases UNEXECUTED by the source-only author. Synthetic edge proof only. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import financePolicy from "./data/finance.json" with { type: "json" };
import {
  ensureFinanceCashModule,
  settleFinanceContractJournal,
} from "./finance-cash";
import type {
  FinanceContractInput,
  FinanceCustomerOriginalTerms,
} from "./finance-types";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import type { CoreAPI, CoreInput, CoreState, Source } from "./types";

type Domain = "public" | "visitor";
type RecordRow = Record<string, unknown>;
const date = "2021-01-17",
  priorAt = "2021-01-01",
  nextDate = "2021-02-17",
  destination = "place:conditional-destination",
  origin = "place:conditional-outside-origin",
  ownerId = "organization:conditional-outside-owner",
  sellers = [
    "organization:conditional-provider-a",
    "organization:conditional-provider-b",
  ],
  personId = "person:conditional-product-worker",
  jobId = "job:conditional-product",
  providerId = "provider:conditional-scope",
  authorityId = "authority:conditional-public",
  appropriationId = "appropriation:conditional-public",
  agreementId = "agreement:conditional-public",
  identityId = "identity:conditional-visitor",
  visitId = "visit:conditional-visitor",
  marketId = "market:conditional-geography",
  ownerBudgetId = "budget:conditional-independent-family";
const source: Source = {
  tag: "ESTIMATED",
  asOf: priorAt,
  citation:
    "Explicit synthetic saved owner, product, agreement and geography records.",
  estimatedFrom:
    "Conditional edge fixture; no observed appropriation, outside demand or ordinary-world proof.",
  generationPriorVintage: "Explicit technical fixture only",
};
const publicRule = financePolicy.cashJournal.procurement[p("zero")]!,
  visitorRule = financePolicy.cashJournal.visitorLodging;

function buildFixture(
  domain: Domain,
  endsAt?: string,
): { core: CoreState; ids: readonly string[]; input: CoreInput } {
  const serviceKey =
      domain === "public" ? publicRule.serviceKey : visitorRule.serviceKey,
    kind =
      domain === "public"
        ? publicRule.contractKind
        : "outside.customer.visitor-lodging",
    phase =
      domain === "public" ? "business-procurement" : "household-purchases",
    groupId = domain === "public" ? agreementId : visitId,
    occupation =
      domain === "public"
        ? publicRule.supplierOccupations[p("zero")]!
        : visitorRule.supplierOccupations[p("zero")]!;
  const qualifications = sellers.map((organizationId, index) => ({
    organizationId,
    serviceKey,
    jobIds: index === p("zero") ? [jobId] : [],
    providerRecordIds: index === p("zero") ? [] : [providerId],
    sources:
      index === p("zero")
        ? [
            {
              recordId: jobId,
              kind: "job",
              occupationClassification: occupation,
              source,
            },
          ]
        : [{ recordId: providerId, kind: "recorded-provider", source }],
  }));
  const contracts: FinanceContractInput[] = sellers.map((payeeId, index) => {
    const contractSource: Source = {
      ...source,
      citation: `${source.citation} Prior agreement ${groupId}; seller ${payeeId}.`,
    };
    return {
      id: `${groupId}:contract:${payeeId}`,
      payerIds: [ownerId],
      payeeId,
      kind,
      amountMinor: index === p("zero") ? 60 : 40,
      dueAt: date,
      periodMonths: p("one"),
      ...(endsAt !== undefined ? { endsAt } : {}),
      accruesArrears: false,
      salesReceipt: true,
      marketAdjusted: false,
      salesReceiptBudget: false,
      settlementPhaseId: phase,
      source: contractSource,
      externalInflow:
        domain === "public"
          ? {
              kind: "external.public-procurement",
              ownerId,
              source: contractSource,
              authorityRecordId: authorityId,
              appropriationRecordId: appropriationId,
              agreementRecordId: agreementId,
            }
          : {
              kind: "external.customer.visitor-lodging",
              ownerId,
              source: contractSource,
              identityRecordId: identityId,
              visitAgreementRecordId: visitId,
              marketId,
            },
    };
  });
  const ids = contracts.map((row) => row.id),
    contractTermsById: Record<string, FinanceCustomerOriginalTerms> = {},
    contractSourceMap: Record<string, Source> = {};
  for (const row of contracts) {
    contractTermsById[row.id] = {
      payerIds: row.payerIds,
      payeeId: row.payeeId,
      kind: row.kind,
      amountMinor: row.amountMinor,
      firstDueAt: row.dueAt,
      periodMonths: row.periodMonths,
      ...(row.endsAt !== undefined ? { endsAt: row.endsAt } : {}),
      settlementPhaseId: row.settlementPhaseId!,
    };
    contractSourceMap[row.id] = row.source;
  }
  const authority = {
    id: authorityId,
    issuerId: ownerId,
    governmentKey: "government:conditional-recorded-owner",
    jurisdictionId: "jurisdiction:conditional-recorded-owner",
    effectiveFrom: date,
    ...(endsAt !== undefined ? { endsAt } : {}),
    source,
  };
  const appropriation = {
    id: appropriationId,
    authorityId,
    buyerAccountId: ownerId,
    monthlyBudgetMinor: 100,
    coveredPlaceId: destination,
    effectiveFrom: date,
    ...(endsAt !== undefined ? { endsAt } : {}),
    source,
  };
  const agreement = {
    id: agreementId,
    authorityId,
    appropriationId,
    buyerAccountId: ownerId,
    supplierIds: sellers,
    serviceKey,
    providerQualifications: qualifications,
    contractIds: ids,
    contractTermsById,
    contractSourceMap,
    effectiveFrom: date,
    ...(endsAt !== undefined ? { endsAt } : {}),
    source,
  };
  const identity = {
    id: identityId,
    kind: visitorRule.identityKind,
    occurredAt: priorAt,
    subjectIds: [ownerId],
    counterpartyIds: [],
    placeId: origin,
    basisRecordIds: ["identity-basis:conditional-independent-family"],
    facts: {
      economicUnit: "one-outside-family",
      liquidMinor: "0",
      recurringIncomeCredit: "none",
    },
    source,
  };
  const market = {
    id: marketId,
    originPlaceId: origin,
    destinationPlaceId: destination,
    originPlaceName: "Conditional Outside Origin",
    originSourcePopulation: 100,
    basisRecordIds: ["geography-basis:conditional"],
    source,
  };
  const visit = {
    id: visitId,
    kind: visitorRule.visitKind,
    occurredAt: priorAt,
    subjectIds: [ownerId],
    counterpartyIds: sellers,
    placeId: destination,
    basisRecordIds: [
      identityId,
      ownerBudgetId,
      ...market.basisRecordIds,
      jobId,
      providerId,
    ],
    facts: {
      marketId,
      identityRecordId: identityId,
      ownerBudgetRecordId: ownerBudgetId,
      originPlaceId: origin,
      destinationPlaceId: destination,
      serviceKey,
      monthlyBudgetMinor: "100",
      contractIds: JSON.stringify(ids),
      contractTermsById: JSON.stringify(contractTermsById),
      contractSourceMap: JSON.stringify(contractSourceMap),
      providerQualifications: JSON.stringify(qualifications),
      effectiveFrom: date,
      ...(endsAt !== undefined ? { endsAt } : {}),
    },
    source,
  };
  const input: CoreInput = {
    seed: `unexecuted-conditional-${domain}-flow`,
    startedAt: date,
    people: [
      {
        id: personId,
        givenName: "Recorded",
        familyName: "Fixture",
        birthDate: "1980-01-01",
        placeId: destination,
        householdId: "household:conditional-product-worker",
        tier: "weekly",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("zero"),
        source,
        familyIds: [],
        knownIds: [],
        jobId,
      },
    ],
    households: [
      {
        id: "household:conditional-product-worker",
        placeId: destination,
        memberIds: [personId],
        source,
      },
    ],
    jobs: [
      {
        id: jobId,
        personId,
        organizationId: sellers[p("zero")]!,
        title: "Actual conditional product job",
        wageDailyMinor: 10,
        hoursDaily: p("one"),
        occupationClassification: occupation,
        source,
      },
    ],
    organizations: [
      {
        id: ownerId,
        name: "Explicit conditional outside owner",
        placeId: domain === "public" ? destination : origin,
        kind:
          domain === "public"
            ? "local-government"
            : "outside-customer-household",
        liquidMinor: p("zero"),
        source,
        outsideFlow: source,
        ...(domain === "public"
          ? {
              governmentFacts: {
                governmentKey: authority.governmentKey,
                governmentJurisdictionId: authority.jurisdictionId,
                [`${publicRule.authorityFieldPrefix}${destination}`]:
                  JSON.stringify(authority),
                [`${publicRule.appropriationFieldPrefix}${destination}`]:
                  JSON.stringify(appropriation),
                [`${publicRule.agreementFieldPrefix}${destination}`]:
                  JSON.stringify(agreement),
              },
            }
          : {}),
      },
      ...sellers.map((id) => ({
        id,
        name: id,
        placeId: destination,
        kind: "employer",
        classification:
          domain === "public"
            ? publicRule.supplierClassifications[p("zero")]
            : visitorRule.supplierClassifications[p("zero")],
        liquidMinor: p("zero"),
        source,
      })),
    ],
    finance: {
      contracts,
      facilities: [],
      gaps: [],
      businesses: sellers.map((organizationId) => ({
        organizationId,
        kindId: domain === "public" ? "building-services" : "inn",
        annualPayrollMinor: p("zero"),
        annualDemandMinor: p("zero"),
        annualOtherCostsMinor: p("zero"),
        openingTownIncomeMinor: p("zero"),
        capacityMinor: p("zero"),
        price: p("one"),
        costContractIds: [],
        source,
      })),
    },
    placeMetadata: {
      [`${visitorRule.identityMetadataPrefix}${identityId}`]:
        JSON.stringify(identity),
      [`${visitorRule.visitMetadataPrefix}${visitId}`]: JSON.stringify(visit),
      [`${visitorRule.marketMetadataPrefix}${marketId}`]:
        JSON.stringify(market),
      [`${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`]: JSON.stringify({
        id: ownerBudgetId,
        ownerId,
        identityRecordId: identityId,
        monthlyBudgetMinor: 100,
        preservedMonthlyTermsMinor: 0,
        preservedContractIds: [],
        preservedContractTermsById: {},
        preservedContractSourceMap: {},
        marketIds: [marketId],
        marketMonthlyAmountsMinor: { [marketId]: 100 },
        parameterRefs: ["explicit-conditional-recorded-budget"],
        source,
      }),
      [`${visitorRule.providerMetadataPrefix}${providerId}`]: JSON.stringify({
        id: providerId,
        organizationId: sellers[p("one")]!,
        serviceKeys: [serviceKey],
        source,
      }),
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const core = createCore(input, { data: DEFAULT_DATA, observer: true });
  ensureFinanceCashModule(core);
  return { core, ids, input };
}
function localStock(core: CoreState): number {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (total, row) => total + row.liquidMinor,
    p("zero"),
  );
}
function financial(core: CoreState): string {
  return JSON.stringify(
    {
      cash: [...core.people.values(), ...core.organizations.values()].map(
        (row) => [row.id, row.liquidMinor],
      ),
      contractProgress: [...core.finance.contracts.values()].map((row) => [
        row.id,
        row.dueAt,
        row.lastSettledAt,
        row.endedAt,
        row.arrearsMinor,
      ]),
      sources: [...core.finance.cashSources].filter(
        ([, row]) =>
          row.postedJournalSequence !== undefined ||
          row.completedAt !== undefined,
      ),
      latest: core.finance.latestReceiptsByContract,
      totals: core.finance.totalsByKind,
      books: core.finance.businesses,
      dueIndex: core.finance.contractsDueAt,
      external: core.cashJournal.externalFlowsByOwner,
      sequence: core.cashJournal.nextSequence,
      journalTotals: core.cashJournal.totals,
      accounts: core.cashJournal.accounts,
      journal: core.cashJournal.detailedReceipts,
    },
    (_key, value: unknown) =>
      value instanceof Map
        ? [...value]
        : value instanceof Set
          ? [...value]
          : value,
  );
}
function updateMetadata(
  core: CoreState,
  key: string,
  change: (row: RecordRow) => void,
): void {
  const row = JSON.parse(core.placeMetadata[key]!) as RecordRow;
  change(row);
  core.placeMetadata = { ...core.placeMetadata, [key]: JSON.stringify(row) };
}
function updatePublic(
  core: CoreState,
  field: "authority" | "appropriation" | "agreement",
  change: (row: RecordRow) => void,
): void {
  const owner = core.organizations.get(ownerId)!,
    prefix = publicRule[`${field}FieldPrefix`],
    key = `${prefix}${destination}`,
    row = JSON.parse(owner.governmentFacts![key]!) as RecordRow;
  change(row);
  owner.governmentFacts = {
    ...owner.governmentFacts,
    [key]: JSON.stringify(row),
  };
}
function updateVisit(core: CoreState, change: (row: RecordRow) => void): void {
  updateMetadata(core, `${visitorRule.visitMetadataPrefix}${visitId}`, change);
}
function lookupTamper(
  core: CoreState,
  api: CoreAPI,
  change: () => void,
  when: "after-first" | "before-second",
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
          calls += p("one");
          if (when === "before-second" && calls === p("one") + p("one"))
            change();
          const slot = original(reference);
          if (when === "after-first" && calls === p("one")) change();
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

function sharedVisitorFixture(): {
  core: CoreState;
  originalId: string;
  secondId: string;
} {
  const original = buildFixture("visitor"),
    input = structuredClone(original.input),
    secondMarketId = "market:conditional-second-geography",
    secondVisitId = "visit:conditional-second-destination",
    secondPlaceId = "place:conditional-second-destination",
    secondSellerId = "organization:conditional-second-destination-provider",
    secondProviderId = "provider:conditional-second-destination",
    secondId = `${secondVisitId}:contract:${secondSellerId}`;
  const contractSource = {
      ...source,
      citation: `${source.citation} Prior agreement ${secondVisitId}; seller ${secondSellerId}.`,
    },
    term: FinanceContractInput = {
      id: secondId,
      payerIds: [ownerId],
      payeeId: secondSellerId,
      kind: "outside.customer.visitor-lodging",
      amountMinor: 100,
      dueAt: date,
      periodMonths: p("one"),
      accruesArrears: false,
      salesReceipt: true,
      salesReceiptBudget: false,
      marketAdjusted: false,
      settlementPhaseId: "household-purchases",
      source: contractSource,
      externalInflow: {
        kind: "external.customer.visitor-lodging",
        ownerId,
        identityRecordId: identityId,
        visitAgreementRecordId: secondVisitId,
        marketId: secondMarketId,
        source: contractSource,
      },
    };
  const originalTerms: FinanceCustomerOriginalTerms = {
    payerIds: term.payerIds,
    payeeId: term.payeeId,
    kind: term.kind,
    amountMinor: term.amountMinor,
    firstDueAt: term.dueAt,
    periodMonths: term.periodMonths,
    settlementPhaseId: term.settlementPhaseId!,
  };
  const qualification = {
    organizationId: secondSellerId,
    serviceKey: visitorRule.serviceKey,
    jobIds: [],
    providerRecordIds: [secondProviderId],
    sources: [
      { recordId: secondProviderId, kind: "recorded-provider", source },
    ],
  };
  const budget = JSON.parse(
    input.placeMetadata![`${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`]!,
  ) as RecordRow;
  budget.monthlyBudgetMinor = 200;
  budget.marketIds = [marketId, secondMarketId];
  budget.marketMonthlyAmountsMinor = { [marketId]: 100, [secondMarketId]: 100 };
  input.placeMetadata = {
    ...input.placeMetadata,
    [`${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`]:
      JSON.stringify(budget),
    [`${visitorRule.marketMetadataPrefix}${secondMarketId}`]: JSON.stringify({
      id: secondMarketId,
      originPlaceId: origin,
      destinationPlaceId: secondPlaceId,
      originPlaceName: "Conditional Outside Origin",
      originSourcePopulation: 100,
      basisRecordIds: ["geography-basis:conditional-second"],
      source,
    }),
    [`${visitorRule.providerMetadataPrefix}${secondProviderId}`]:
      JSON.stringify({
        id: secondProviderId,
        organizationId: secondSellerId,
        serviceKeys: [visitorRule.serviceKey],
        source,
      }),
    [`${visitorRule.visitMetadataPrefix}${secondVisitId}`]: JSON.stringify({
      id: secondVisitId,
      kind: visitorRule.visitKind,
      occurredAt: priorAt,
      subjectIds: [ownerId],
      counterpartyIds: [secondSellerId],
      placeId: secondPlaceId,
      basisRecordIds: [
        identityId,
        ownerBudgetId,
        "geography-basis:conditional-second",
        secondProviderId,
      ],
      source,
      facts: {
        identityRecordId: identityId,
        ownerBudgetRecordId: ownerBudgetId,
        marketId: secondMarketId,
        originPlaceId: origin,
        destinationPlaceId: secondPlaceId,
        serviceKey: visitorRule.serviceKey,
        monthlyBudgetMinor: "100",
        effectiveFrom: date,
        contractIds: JSON.stringify([secondId]),
        contractTermsById: JSON.stringify({ [secondId]: originalTerms }),
        contractSourceMap: JSON.stringify({ [secondId]: contractSource }),
        providerQualifications: JSON.stringify([qualification]),
      },
    }),
  };
  input.organizations = [
    ...input.organizations,
    {
      id: secondSellerId,
      name: "Recorded conditional second destination provider",
      placeId: secondPlaceId,
      kind: "employer",
      classification: visitorRule.supplierClassifications[p("zero")],
      liquidMinor: p("zero"),
      source,
    },
  ];
  input.finance = {
    ...input.finance!,
    contracts: [...input.finance!.contracts, term],
  };
  const core = createCore(input, { data: DEFAULT_DATA, observer: true });
  ensureFinanceCashModule(core);
  return { core, originalId: original.ids[p("zero")]!, secondId };
}

describe("UNEXECUTED conditional one actual outside identity across qualified markets", () => {
  it("admits an independent supplied identity without inventing a stock fact for its zero-stock owner", () => {
    const { core, originalId } = sharedVisitorFixture();
    updateMetadata(
      core,
      `${visitorRule.identityMetadataPrefix}${identityId}`,
      (row) => {
        delete (row.facts as RecordRow).liquidMinor;
      },
    );
    expect(core.organizations.get(ownerId)!.liquidMinor).toBe(p("zero"));
    expect(coreAPI(core).settleFinanceContract(originalId).paidMinor).toBe(60);
    expect(core.organizations.get(ownerId)!.liquidMinor).toBe(p("zero"));
  });
  it("uses one independent zero-stock flow account and one bounded original budget envelope", () => {
    const { core, originalId, secondId } = sharedVisitorFixture(),
      api = coreAPI(core),
      stock = localStock(core);
    expect(api.settleFinanceContract(originalId).paidMinor).toBe(60);
    expect(api.settleFinanceContract(secondId).paidMinor).toBe(100);
    expect(core.cashJournal.accountCountByOwner.get(ownerId)).toBe(p("one"));
    expect(core.cashJournal.externalFlowsByOwner.size).toBe(p("one"));
    expect(core.organizations.get(ownerId)!.liquidMinor).toBe(p("zero"));
    expect(core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor).toBe(
      -160,
    );
    expect(
      localStock(core) -
        stock +
        core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor,
    ).toBe(0);
  });
  it("rejects a sibling market allocation that duplicates the shared family envelope", () => {
    const { core, originalId } = sharedVisitorFixture();
    updateMetadata(
      core,
      `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
      (row) => {
        row.monthlyBudgetMinor = 100;
      },
    );
    const before = financial(core);
    expect(() => coreAPI(core).settleFinanceContract(originalId)).toThrow();
    expect(financial(core)).toBe(before);
  });
});

function preservedQuarterlyVisitorFixture(): {
  core: CoreState;
  dueId: string;
  preservedId: string;
} {
  const fixture = buildFixture("visitor"),
    input = structuredClone(fixture.input),
    original = input.finance!.contracts[p("zero")]!,
    preservedId = "contract:conditional-preserved-quarterly",
    contractSource = {
      ...source,
      citation: `${source.citation} Actual preserved quarterly agreement ${preservedId}.`,
    },
    preserved: FinanceContractInput = {
      ...original,
      id: preservedId,
      amountMinor: 100,
      periodMonths: 3,
      dueAt: nextDate,
      source: contractSource,
      externalInflow: { ...original.externalInflow!, source: contractSource },
    },
    budget = JSON.parse(
      input.placeMetadata![
        `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`
      ]!,
    ) as RecordRow;
  budget.monthlyBudgetMinor = 134;
  budget.preservedMonthlyTermsMinor =
    preserved.amountMinor / preserved.periodMonths;
  budget.preservedContractIds = [preservedId];
  budget.preservedContractTermsById = {
    [preservedId]: {
      payerIds: preserved.payerIds,
      payeeId: preserved.payeeId,
      kind: preserved.kind,
      amountMinor: preserved.amountMinor,
      firstDueAt: preserved.dueAt,
      periodMonths: preserved.periodMonths,
      settlementPhaseId: preserved.settlementPhaseId!,
    },
  };
  budget.preservedContractSourceMap = { [preservedId]: contractSource };
  input.placeMetadata = {
    ...input.placeMetadata,
    [`${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`]:
      JSON.stringify(budget),
  };
  input.finance = {
    ...input.finance!,
    contracts: [...input.finance!.contracts, preserved],
  };
  const core = createCore(input, { data: DEFAULT_DATA, observer: true });
  ensureFinanceCashModule(core);
  return { core, dueId: fixture.ids[p("zero")]!, preservedId };
}

describe("UNEXECUTED conditional original quarterly visitor cadence", () => {
  it("admits an exact fractional contextual monthly rate without rounding original due cash or dates", () => {
    const { core, dueId, preservedId } = preservedQuarterlyVisitorFixture(),
      original = core.finance.contracts.get(preservedId)!,
      before = { ...original };
    expect(coreAPI(core).settleFinanceContract(dueId).paidMinor).toBe(60);
    expect(original).toEqual(before);
    expect(original.amountMinor).toBe(100);
    expect(original.periodMonths).toBe(3);
    expect(original.dueAt).toBe(nextDate);
  });
  it("rejects rounding away the saved original quarterly contextual rate", () => {
    const { core, dueId } = preservedQuarterlyVisitorFixture();
    updateMetadata(
      core,
      `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
      (row) => {
        row.preservedMonthlyTermsMinor = 33;
      },
    );
    const before = financial(core);
    expect(() => coreAPI(core).settleFinanceContract(dueId)).toThrow();
    expect(financial(core)).toBe(before);
  });
  for (const when of ["after-first", "before-second"] as const) {
    it(`rejects preserved quarterly amount tamper ${when} with no settlement writes`, () => {
      const { core, dueId, preservedId } = preservedQuarterlyVisitorFixture();
      let before = financial(core);
      const api = lookupTamper(
        core,
        coreAPI(core),
        () => {
          core.finance.contracts.get(preservedId)!.amountMinor += p("one");
          before = financial(core);
        },
        when,
      );
      expect(() => settleFinanceContractJournal(core, api, dueId)).toThrow();
      expect(financial(core)).toBe(before);
      expect(core.finance.cashSources.size).toBe(p("zero"));
    });
  }
});

for (const domain of ["public", "visitor"] as const) {
  describe(`UNEXECUTED conditional ${domain} outside customer CASH`, () => {
    it("pays a genuine zero-stock outside obligation as seller sales once with balanced lines", () => {
      const { core, ids } = buildFixture(domain),
        api = coreAPI(core),
        before = localStock(core),
        id = ids[p("zero")]!;
      expect(core.organizations.get(ownerId)!.liquidMinor).toBe(0);
      const receipt = api.settleFinanceContract(id);
      expect(receipt.paidMinor).toBe(60);
      expect(core.organizations.get(ownerId)!.liquidMinor).toBe(0);
      expect(core.organizations.get(sellers[p("zero")]!)!.liquidMinor).toBe(60);
      expect(
        core.finance.businesses.get(sellers[p("zero")]!)!.salesReceivedMinor,
      ).toBe(60);
      const flow = core.cashJournal.externalFlowsByOwner.get(ownerId)!;
      expect(flow).toMatchObject({
        netMinor: -60,
        outgoingMinor: 60,
        incomingMinor: 0,
      });
      expect(localStock(core) - before + flow.netMinor).toBe(0);
      const journal = [...core.cashJournal.detailedReceipts.values()].find(
        (row) => row.sourceRef.id === receipt.id,
      )!;
      expect(
        journal.postings.reduce(
          (total, row) => total + row.deltaMinor,
          p("zero"),
        ),
      ).toBe(0);
      expect(journal.grossDebitMinor).toBe(60);
      expect(journal.grossCreditMinor).toBe(60);
      expect(journal.relatedRecords).toContainEqual(
        expect.objectContaining({
          kind: financePolicy.cashJournal.relatedKinds.terms,
          id,
          date,
        }),
      );
      const settled = financial(core);
      expect(() => api.settleFinanceContract(id)).toThrow();
      expect(() =>
        api.postJournal({
          id: `${journal.id}:replay`,
          date,
          expectedSequence: core.cashJournal.nextSequence,
          sourceRef: journal.sourceRef,
          postings: journal.postings,
        }),
      ).toThrow();
      expect(financial(core)).toBe(settled);
    });
    it("preserves a valid sibling payment after the first sibling advances its next due date", () => {
      const { core, ids } = buildFixture(domain),
        api = coreAPI(core);
      expect(api.settleFinanceContract(ids[p("zero")]!).paidMinor).toBe(60);
      expect(core.finance.contracts.get(ids[p("zero")]!)!.dueAt).toBe(nextDate);
      expect(api.settleFinanceContract(ids[p("one")]!).paidMinor).toBe(40);
      expect(core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor).toBe(
        -100,
      );
      expect(
        core.finance.businesses.get(sellers[p("one")]!)!.salesReceivedMinor,
      ).toBe(40);
      expect(core.organizations.get(ownerId)!.liquidMinor).toBe(0);
    });
    it("uses supplied exclusive ends and creates no default end for an open term", () => {
      const open = buildFixture(domain),
        finite = buildFixture(domain, nextDate);
      expect(
        open.core.finance.contracts.get(open.ids[p("zero")]!)!.endsAt,
      ).toBeUndefined();
      expect(
        coreAPI(finite.core).settleFinanceContract(finite.ids[p("zero")]!)
          .paidMinor,
      ).toBe(60);
      finite.core.date = nextDate;
      const before = financial(finite.core);
      expect(() =>
        coreAPI(finite.core).settleFinanceContract(finite.ids[p("zero")]!),
      ).toThrow();
      expect(financial(finite.core)).toBe(before);
    });
    const mutations: readonly [
      string,
      (core: CoreState, ids: readonly string[]) => void,
    ][] = [
      [
        "future due",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.dueAt = nextDate;
        },
      ],
      [
        "ended due",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.endedAt = date;
        },
      ],
      [
        "expired due",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.endsAt = date;
        },
      ],
      [
        "missing descriptor",
        (core, ids) => {
          delete core.finance.contracts.get(ids[p("zero")]!)!.externalInflow;
        },
      ],
      [
        "extra descriptor domain field",
        (core, ids) => {
          core.finance.contracts.get(
            ids[p("zero")]!,
          )!.externalInflow!.incomeContractIds = ["invented-recipient"];
        },
      ],
      [
        "wrong owner",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.externalInflow!.ownerId =
            sellers[p("one")]!;
        },
      ],
      [
        "stock preload",
        (core) => {
          core.organizations.get(ownerId)!.liquidMinor = 1;
        },
      ],
      [
        "missing dated outside Source",
        (core) => {
          delete core.organizations.get(ownerId)!.outsideFlow;
        },
      ],
      [
        "future outside Source",
        (core) => {
          core.organizations.get(ownerId)!.outsideFlow = {
            ...source,
            asOf: nextDate,
          };
        },
      ],
      [
        "funded outside account",
        (core) => {
          const id = core.cashJournal.residualAccountByOwner.get(ownerId)!;
          core.cashJournal.accounts.get(id)!.allocatedMinor = 1;
        },
      ],
      [
        "local account mode",
        (core) => {
          const id = core.cashJournal.residualAccountByOwner.get(ownerId)!;
          delete core.cashJournal.accounts.get(id)!.outsideFlow;
        },
      ],
      [
        "descriptor Source annotation drift with unchanged citation",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.externalInflow!.source =
            {
              ...core.finance.contracts.get(ids[p("zero")]!)!.source,
              estimatedFrom: "unsupported annotation",
            };
        },
      ],
      [
        "standing full Source drift",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.source = {
            ...core.finance.contracts.get(ids[p("zero")]!)!.source,
            estimatedFrom: "different full Source",
          };
          core.finance.contracts.get(ids[p("zero")]!)!.externalInflow!.source =
            core.finance.contracts.get(ids[p("zero")]!)!.source;
        },
      ],
      [
        "wrong payer",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.payerIds = [
            sellers[p("one")]!,
          ];
        },
      ],
      [
        "wrong supplier",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.payeeId = ownerId;
        },
      ],
      [
        "supplier geography",
        (core) => {
          core.organizations.get(sellers[p("zero")]!)!.placeId = origin;
        },
      ],
      [
        "supplier product",
        (core) => {
          core.organizations.get(sellers[p("zero")]!)!.classification =
            "enterprise:unqualified";
        },
      ],
      [
        "missing actual product job",
        (core) => {
          core.jobs.delete(jobId);
        },
      ],
      [
        "inactive actual product job",
        (core) => {
          core.jobs.get(jobId)!.endsAt = date;
        },
      ],
      [
        "unowned actual product job",
        (core) => {
          delete core.people.get(personId)!.jobId;
        },
      ],
      [
        "wrong product occupation",
        (core) => {
          core.jobs.get(jobId)!.occupationClassification =
            "occupation:unqualified";
        },
      ],
      [
        "actual job full Source drift",
        (core) => {
          core.jobs.get(jobId)!.source = {
            ...source,
            generationPriorVintage: "changed basis",
          };
        },
      ],
      [
        "amount drift",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.amountMinor = 61;
        },
      ],
      [
        "cadence drift",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.periodMonths = 2;
        },
      ],
      [
        "manufactured end",
        (core, ids) => {
          core.finance.contracts.get(ids[p("zero")]!)!.endsAt = "2022-01-17";
        },
      ],
      [
        "sibling amount drift",
        (core, ids) => {
          core.finance.contracts.get(ids[p("one")]!)!.amountMinor = 41;
        },
      ],
      [
        "sibling full Source drift",
        (core, ids) => {
          core.finance.contracts.get(ids[p("one")]!)!.source = {
            ...core.finance.contracts.get(ids[p("one")]!)!.source,
            generationPriorVintage: "different owning source",
          };
        },
      ],
      [
        "sales flag without owning evidence",
        (core, ids) => {
          const row = core.finance.contracts.get(ids[p("zero")]!)!;
          row.salesReceipt = true;
          if (domain === "public")
            updatePublic(core, "agreement", (saved) => {
              delete saved.contractSourceMap;
            });
          else
            updateVisit(core, (saved) => {
              delete (saved.facts as RecordRow).contractSourceMap;
            });
        },
      ],
    ];
    for (const [name, mutate] of mutations) {
      it(`rejects ${name} before financial writes`, () => {
        const { core, ids } = buildFixture(domain);
        mutate(core, ids);
        const before = financial(core);
        expect(() =>
          coreAPI(core).settleFinanceContract(ids[p("zero")]!),
        ).toThrow();
        expect(financial(core)).toBe(before);
        expect(core.finance.cashSources.size).toBe(p("zero"));
      });
    }
    for (const name of [
      "stock preload",
      "wrong owner",
      "standing full Source drift",
      "amount drift",
      "sibling amount drift",
      "actual job full Source drift",
      "supplier geography",
    ]) {
      const [, mutate] = mutations.find(([label]) => label === name)!;
      for (const when of ["after-first", "before-second"] as const) {
        it(`rejects actual ${name} ${when} provider lookup`, () => {
          const { core, ids } = buildFixture(domain),
            api = coreAPI(core);
          let before = financial(core);
          const stale = lookupTamper(
            core,
            api,
            () => {
              mutate(core, ids);
              before = financial(core);
            },
            when,
          );
          expect(() =>
            settleFinanceContractJournal(core, stale, ids[p("zero")]!),
          ).toThrow();
          expect(financial(core)).toBe(before);
          expect(core.finance.cashSources.size).toBe(p("zero"));
        });
      }
    }
    const recordMutations: readonly [string, (core: CoreState) => void][] =
      domain === "public"
        ? [
            [
              "descriptor authority",
              (core) => {
                const row = core.finance.contracts.values().next().value!;
                row.externalInflow!.authorityRecordId = "authority:unresolved";
              },
            ],
            [
              "authority issuer",
              (core) =>
                updatePublic(core, "authority", (row) => {
                  row.issuerId = sellers[p("one")];
                }),
            ],
            [
              "authority jurisdiction",
              (core) =>
                updatePublic(core, "authority", (row) => {
                  row.jurisdictionId = origin;
                }),
            ],
            [
              "appropriation link",
              (core) =>
                updatePublic(core, "appropriation", (row) => {
                  row.authorityId = "authority:foreign";
                }),
            ],
            [
              "actual budget",
              (core) =>
                updatePublic(core, "appropriation", (row) => {
                  row.monthlyBudgetMinor = 101;
                }),
            ],
            [
              "Source map basis substitution",
              (core) =>
                updatePublic(core, "agreement", (row) => {
                  const map = row.contractSourceMap as Record<string, Source>;
                  map[Object.keys(map)[p("zero")]!] = source;
                }),
            ],
          ]
        : [
            [
              "descriptor identity",
              (core) => {
                const row = core.finance.contracts.values().next().value!;
                row.externalInflow!.identityRecordId = "identity:unresolved";
              },
            ],
            [
              "identity owner",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.identityMetadataPrefix}${identityId}`,
                  (row) => {
                    row.subjectIds = sellers;
                  },
                ),
            ],
            [
              "identity Source",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.identityMetadataPrefix}${identityId}`,
                  (row) => {
                    row.source = { ...source, estimatedFrom: "other family" };
                  },
                ),
            ],
            [
              "identity reserve stock",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.identityMetadataPrefix}${identityId}`,
                  (row) => {
                    (row.facts as RecordRow).liquidMinor = "1";
                  },
                ),
            ],
            [
              "market identity",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.marketMetadataPrefix}${marketId}`,
                  (row) => {
                    row.id = "market:foreign";
                  },
                ),
            ],
            [
              "market destination",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.marketMetadataPrefix}${marketId}`,
                  (row) => {
                    row.destinationPlaceId = origin;
                  },
                ),
            ],
            [
              "visit identity link",
              (core) =>
                updateVisit(core, (row) => {
                  (row.facts as RecordRow).identityRecordId =
                    "identity:foreign";
                }),
            ],
            [
              "owner envelope identity",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
                  (row) => {
                    row.identityRecordId = "identity:foreign";
                  },
                ),
            ],
            [
              "owner envelope stock owner",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
                  (row) => {
                    row.ownerId = sellers[p("one")];
                  },
                ),
            ],
            [
              "owner envelope size",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
                  (row) => {
                    row.monthlyBudgetMinor = 99;
                  },
                ),
            ],
            [
              "owner envelope share",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
                  (row) => {
                    (row.marketMonthlyAmountsMinor as RecordRow)[marketId] =
                      101;
                  },
                ),
            ],
            [
              "owner envelope duplicate market",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
                  (row) => {
                    row.marketIds = [marketId, marketId];
                  },
                ),
            ],
            [
              "owner envelope future Source",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
                  (row) => {
                    row.source = { ...source, asOf: nextDate };
                  },
                ),
            ],
            [
              "owner envelope preserved terms",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
                  (row) => {
                    row.preservedMonthlyTermsMinor = 1;
                  },
                ),
            ],
            [
              "owner envelope original maps missing",
              (core) =>
                updateMetadata(
                  core,
                  `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
                  (row) => {
                    delete row.preservedContractIds;
                  },
                ),
            ],
            [
              "visit buyer",
              (core) =>
                updateVisit(core, (row) => {
                  row.subjectIds = sellers;
                }),
            ],
            [
              "visit supplier",
              (core) =>
                updateVisit(core, (row) => {
                  row.counterpartyIds = [ownerId];
                }),
            ],
            [
              "visit identity basis",
              (core) =>
                updateVisit(core, (row) => {
                  row.basisRecordIds = ["unresolved-basis"];
                }),
            ],
            [
              "actual budget",
              (core) =>
                updateVisit(core, (row) => {
                  (row.facts as RecordRow).monthlyBudgetMinor = "101";
                }),
            ],
            [
              "Source map basis substitution",
              (core) =>
                updateVisit(core, (row) => {
                  const facts = row.facts as RecordRow;
                  const map = JSON.parse(
                    String(facts.contractSourceMap),
                  ) as Record<string, Source>;
                  map[Object.keys(map)[p("zero")]!] = source;
                  facts.contractSourceMap = JSON.stringify(map);
                }),
            ],
          ];
    for (const [name, mutate] of recordMutations) {
      it(`rejects saved ${name}`, () => {
        const { core, ids } = buildFixture(domain);
        mutate(core);
        const before = financial(core);
        expect(() =>
          coreAPI(core).settleFinanceContract(ids[p("zero")]!),
        ).toThrow();
        expect(financial(core)).toBe(before);
      });
      for (const when of ["after-first", "before-second"] as const) {
        it(`rechecks saved ${name} ${when} provider lookup`, () => {
          const { core, ids } = buildFixture(domain),
            api = coreAPI(core);
          let before = financial(core);
          const stale = lookupTamper(
            core,
            api,
            () => {
              mutate(core);
              before = financial(core);
            },
            when,
          );
          expect(() =>
            settleFinanceContractJournal(core, stale, ids[p("zero")]!),
          ).toThrow();
          expect(financial(core)).toBe(before);
        });
      }
    }
    it("resolves the second seller's actual saved provider Source and scope", () => {
      const { core, ids } = buildFixture(domain);
      updateMetadata(
        core,
        `${visitorRule.providerMetadataPrefix}${providerId}`,
        (row) => {
          row.source = {
            ...source,
            estimatedFrom: "unsupported provider Source",
          };
        },
      );
      const before = financial(core);
      expect(() =>
        coreAPI(core).settleFinanceContract(ids[p("one")]!),
      ).toThrow();
      expect(financial(core)).toBe(before);
    });
    it("rejects a saved provider that no longer supplies this product", () => {
      const { core, ids } = buildFixture(domain);
      updateMetadata(
        core,
        `${visitorRule.providerMetadataPrefix}${providerId}`,
        (row) => {
          row.serviceKeys = ["unqualified-product"];
        },
      );
      const before = financial(core);
      expect(() =>
        coreAPI(core).settleFinanceContract(ids[p("one")]!),
      ).toThrow();
      expect(financial(core)).toBe(before);
    });
  });
}
