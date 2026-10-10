/** All cases UNEXECUTED by source-only author; synthetic owning edges, no ordinary-world proof. */
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
import { financeSettlementPhase } from "./finance-state";
import type { CoreAPI, CoreInput, CoreState, Source } from "./types";

type Domain = "public" | "visitor";
type PhaseMode = "omitted" | "explicit-default" | "generated";
type Saved = Record<string, unknown>;
const at = "2021-01-17",
  priorAt = "2021-01-01",
  siblingAt = "2021-04-17",
  nextAt = "2022-01-17",
  destination = "place:supplied-conditional-destination",
  origin = "place:supplied-conditional-outside-origin",
  ownerId = "organization:supplied-conditional-owner",
  sellers = [
    "organization:supplied-conditional-a",
    "organization:supplied-conditional-b",
  ],
  jobId = "job:supplied-conditional-product",
  personId = "person:supplied-conditional-worker",
  providerId = "provider:supplied-conditional-product",
  authorityId = "authority:supplied-conditional",
  appropriationId = "appropriation:supplied-conditional",
  agreementId = "agreement:supplied-conditional",
  identityId = "identity:supplied-conditional",
  visitId = "visit:supplied-conditional",
  marketId = "market:supplied-conditional",
  budgetId = "budget:supplied-conditional";
const evidenceSource: Source = {
  tag: "ESTIMATED",
  asOf: priorAt,
  citation:
    "Explicit conditional saved owner/authority/identity/market/product records.",
  estimatedFrom:
    "Technical supplied-term fixture only; no observed appropriation, demand or ordinary-world proof.",
  generationPriorVintage: "Synthetic source-only edge fixture",
};
const publicRule = financePolicy.cashJournal.procurement[p("zero")]!,
  visitorRule = financePolicy.cashJournal.visitorLodging;

function fixture(
  domain: Domain,
  mode: PhaseMode = "omitted",
  endsAt?: string,
  single = false,
): {
  core: CoreState;
  ids: readonly string[];
  input: CoreInput;
  phase: string;
} {
  const publicDomain = domain === "public",
    groupId = publicDomain ? agreementId : visitId,
    supplierIds = single ? sellers.slice(p("zero"), p("one")) : sellers,
    kind = publicDomain
      ? publicRule.contractKind
      : "outside.customer.visitor-lodging",
    serviceKey = publicDomain ? publicRule.serviceKey : visitorRule.serviceKey,
    phase =
      mode === "generated"
        ? publicDomain
          ? financePolicy.defaultPhases.procurement
          : financePolicy.defaultPhases.household
        : financePolicy.defaultPhases.other,
    occupation = (
      publicDomain
        ? publicRule.supplierOccupations
        : visitorRule.supplierOccupations
    )[p("zero")]!,
    qualification = supplierIds.map((organizationId, index) => ({
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
                source: evidenceSource,
              },
            ]
          : [
              {
                recordId: providerId,
                kind: "recorded-provider",
                source: evidenceSource,
              },
            ],
    }));
  const contracts: FinanceContractInput[] = supplierIds.map(
    (payeeId, index) => {
      const source: Source = {
        ...evidenceSource,
        citation: `${evidenceSource.citation} Original supplied agreement ${groupId}; seller ${payeeId}.`,
      };
      return {
        id: `${groupId}:contract:${payeeId}`,
        payerIds: [ownerId],
        payeeId,
        kind,
        amountMinor: index === p("zero") ? 1001 : 199,
        dueAt: index === p("zero") ? at : siblingAt,
        periodMonths: 12,
        ...(endsAt !== undefined ? { endsAt } : {}),
        accruesArrears: false,
        salesReceipt: true,
        marketAdjusted: false,
        salesReceiptBudget: false,
        ...(mode === "omitted" ? {} : { settlementPhaseId: phase }),
        source,
        externalInflow: publicDomain
          ? {
              kind: "external.public-procurement",
              ownerId,
              source,
              authorityRecordId: authorityId,
              appropriationRecordId: appropriationId,
              agreementRecordId: agreementId,
            }
          : {
              kind: "external.customer.visitor-lodging",
              ownerId,
              source,
              identityRecordId: identityId,
              visitAgreementRecordId: visitId,
              marketId,
            },
      };
    },
  );
  const ids = contracts.map((row) => row.id),
    contractTermsById: Record<string, FinanceCustomerOriginalTerms> = {},
    contractSourceMap: Record<string, Source> = {},
    contractAmountsMinor: Record<string, number> = {};
  for (const row of contracts) {
    contractTermsById[row.id] = {
      payerIds: row.payerIds,
      payeeId: row.payeeId,
      kind: row.kind,
      amountMinor: row.amountMinor,
      firstDueAt: row.dueAt,
      periodMonths: row.periodMonths,
      ...(row.endsAt !== undefined ? { endsAt: row.endsAt } : {}),
      settlementPhaseId: phase,
    };
    contractSourceMap[row.id] = row.source;
    contractAmountsMinor[row.id] = row.amountMinor;
  }
  const authority = {
      id: authorityId,
      issuerId: ownerId,
      governmentKey: "government:supplied-conditional",
      jurisdictionId: "jurisdiction:supplied-conditional",
      effectiveFrom: at,
      ...(endsAt !== undefined ? { endsAt } : {}),
      source: evidenceSource,
    },
    appropriation = {
      id: appropriationId,
      authorityId,
      buyerAccountId: ownerId,
      monthlyBudgetMinor: 100,
      coveredPlaceId: destination,
      effectiveFrom: at,
      ...(endsAt !== undefined ? { endsAt } : {}),
      source: evidenceSource,
    },
    agreement = {
      id: agreementId,
      authorityId,
      appropriationId,
      buyerAccountId: ownerId,
      supplierIds,
      serviceKey,
      providerQualifications: qualification,
      contractIds: [...ids].reverse(),
      contractTermsById,
      contractSourceMap,
      contractAmountsMinor,
      periodMonths: 12,
      effectiveFrom: at,
      ...(endsAt !== undefined ? { endsAt } : {}),
      source: evidenceSource,
    },
    identity = {
      id: identityId,
      kind: visitorRule.identityKind,
      occurredAt: priorAt,
      subjectIds: [ownerId],
      counterpartyIds: [],
      placeId: origin,
      basisRecordIds: ["identity-basis:supplied-conditional"],
      facts: {
        economicUnit: "one-outside-family",
        identityStatus: "explicit-supplied-conditional-identity",
      },
      source: evidenceSource,
    },
    market = {
      id: marketId,
      originPlaceId: origin,
      destinationPlaceId: destination,
      originPlaceName: "Explicit conditional outside origin",
      originSourcePopulation: 100,
      basisRecordIds: ["geography-basis:supplied-conditional"],
      source: evidenceSource,
    },
    visit = {
      id: visitId,
      kind: visitorRule.visitKind,
      occurredAt: priorAt,
      subjectIds: [ownerId],
      counterpartyIds: supplierIds,
      placeId: destination,
      basisRecordIds: [
        identityId,
        budgetId,
        ...market.basisRecordIds,
        jobId,
        ...(single ? [] : [providerId]),
      ],
      source: evidenceSource,
      facts: {
        identityRecordId: identityId,
        marketId,
        ownerBudgetRecordId: budgetId,
        originPlaceId: origin,
        destinationPlaceId: destination,
        serviceKey,
        monthlyBudgetMinor: "100",
        contractIds: JSON.stringify([...ids].reverse()),
        contractTermsById: JSON.stringify(contractTermsById),
        contractSourceMap: JSON.stringify(contractSourceMap),
        contractAmountsMinor: JSON.stringify(contractAmountsMinor),
        periodMonths: "12",
        providerQualifications: JSON.stringify(qualification),
        effectiveFrom: at,
        ...(endsAt !== undefined ? { endsAt } : {}),
      },
    };
  const input: CoreInput = {
    seed: `unexecuted-supplied-${domain}-${mode}`,
    startedAt: at,
    people: [
      {
        id: personId,
        givenName: "Recorded",
        familyName: "Conditional",
        birthDate: "1980-01-01",
        placeId: destination,
        householdId: "household:supplied-conditional",
        tier: "weekly",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("zero"),
        familyIds: [],
        knownIds: [],
        jobId,
        source: evidenceSource,
      },
    ],
    households: [
      {
        id: "household:supplied-conditional",
        placeId: destination,
        memberIds: [personId],
        source: evidenceSource,
      },
    ],
    jobs: [
      {
        id: jobId,
        personId,
        organizationId: sellers[p("zero")]!,
        title: "Recorded conditional product",
        occupationClassification: occupation,
        wageDailyMinor: 10,
        hoursDaily: p("one"),
        source: evidenceSource,
      },
    ],
    organizations: [
      {
        id: ownerId,
        name: "Explicit supplied conditional outside owner",
        placeId: publicDomain ? destination : origin,
        kind: publicDomain ? "local-government" : "outside-customer-household",
        liquidMinor: p("zero"),
        source: evidenceSource,
        outsideFlow: evidenceSource,
        ...(publicDomain
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
      ...supplierIds.map((id) => ({
        id,
        name: id,
        placeId: destination,
        kind: "employer",
        liquidMinor: p("zero"),
        source: evidenceSource,
        classification: (publicDomain
          ? publicRule.supplierClassifications
          : visitorRule.supplierClassifications)[p("zero")],
      })),
    ],
    finance: {
      contracts,
      facilities: [],
      gaps: [],
      businesses: supplierIds.map((organizationId) => ({
        organizationId,
        kindId: publicDomain ? "building-services" : "inn",
        annualPayrollMinor: p("zero"),
        annualDemandMinor: p("zero"),
        annualOtherCostsMinor: p("zero"),
        openingTownIncomeMinor: p("zero"),
        capacityMinor: p("zero"),
        price: p("one"),
        costContractIds: [],
        source: evidenceSource,
      })),
    },
    placeMetadata: {
      [`${visitorRule.identityMetadataPrefix}${identityId}`]:
        JSON.stringify(identity),
      [`${visitorRule.visitMetadataPrefix}${visitId}`]: JSON.stringify(visit),
      [`${visitorRule.marketMetadataPrefix}${marketId}`]:
        JSON.stringify(market),
      ...(single
        ? {}
        : {
            [`${visitorRule.providerMetadataPrefix}${providerId}`]:
              JSON.stringify({
                id: providerId,
                organizationId: sellers[p("one")]!,
                serviceKeys: [serviceKey],
                source: evidenceSource,
              }),
          }),
      [`${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`]: JSON.stringify({
        id: budgetId,
        ownerId,
        identityRecordId: identityId,
        monthlyBudgetMinor: 100,
        preservedMonthlyTermsMinor: 0,
        preservedContractIds: [],
        preservedContractSourceMap: {},
        preservedContractTermsById: {},
        marketIds: [marketId],
        marketMonthlyAmountsMinor: { [marketId]: 100 },
        parameterRefs: ["explicit-conditional-saved-envelope"],
        source: evidenceSource,
      }),
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const core = createCore(input, {
    data: {
      ...DEFAULT_DATA,
      finance: {
        ...DEFAULT_DATA.finance!,
        defaultPhases: { ...DEFAULT_DATA.finance!.defaultPhases },
        settlementPhases: DEFAULT_DATA.finance!.settlementPhases.map(
          (phase) => ({ ...phase }),
        ),
      },
    },
    observer: true,
  });
  ensureFinanceCashModule(core);
  return { core, ids, input, phase };
}
function localStock(core: CoreState): number {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    p("zero"),
  );
}
function financial(core: CoreState): string {
  return JSON.stringify(
    {
      cash: [...core.people.values(), ...core.organizations.values()].map(
        (row) => [row.id, row.liquidMinor],
      ),
      contracts: [...core.finance.contracts.values()].map((row) => [
        row.id,
        row.dueAt,
        row.lastSettledAt,
        row.endedAt,
        row.arrearsMinor,
      ]),
      completedSources: [...core.finance.cashSources].filter(
        ([, row]) =>
          row.postedJournalSequence !== undefined ||
          row.completedAt !== undefined,
      ),
      latest: core.finance.latestReceiptsByContract,
      totals: core.finance.totalsByKind,
      books: core.finance.businesses,
      due: core.finance.contractsDueAt,
      external: core.cashJournal.externalFlowsByOwner,
      accounts: core.cashJournal.accounts,
      journal: core.cashJournal.detailedReceipts,
      sequence: core.cashJournal.nextSequence,
      journalTotals: core.cashJournal.totals,
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
  change: (row: Saved) => void,
): void {
  const row = JSON.parse(core.placeMetadata[key]!) as Saved;
  change(row);
  core.placeMetadata = { ...core.placeMetadata, [key]: JSON.stringify(row) };
}
function updateAllocation(
  core: CoreState,
  domain: Domain,
  change: (allocation: Saved) => void,
): void {
  if (domain === "public") {
    const owner = core.organizations.get(ownerId)!,
      key = `${publicRule.agreementFieldPrefix}${destination}`,
      row = JSON.parse(owner.governmentFacts![key]!) as Saved;
    change(row);
    owner.governmentFacts = {
      ...owner.governmentFacts,
      [key]: JSON.stringify(row),
    };
  } else
    updateMetadata(
      core,
      `${visitorRule.visitMetadataPrefix}${visitId}`,
      (row) => {
        const facts = row.facts as Saved,
          keys = [
            "contractIds",
            "contractTermsById",
            "contractSourceMap",
            "contractAmountsMinor",
          ],
          allocation: Saved = Object.fromEntries(
            keys.map((key) => [key, JSON.parse(String(facts[key]))]),
          );
        allocation.supplierIds = row.counterpartyIds;
        allocation.providerQualifications = JSON.parse(
          String(facts.providerQualifications),
        );
        change(allocation);
        for (const key of keys) {
          if (allocation[key] === undefined) delete facts[key];
          else facts[key] = JSON.stringify(allocation[key]);
        }
        row.counterpartyIds = allocation.supplierIds;
        facts.providerQualifications = JSON.stringify(
          allocation.providerQualifications,
        );
      },
    );
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

for (const domain of ["public", "visitor"] as const) {
  describe(`UNEXECUTED supplied ${domain} default phase and exact fractional cadence`, () => {
    it("settles omitted-phase supplied integer annual cash once without rounding terms or Source", () => {
      const { core, ids, input, phase } = fixture(domain, "omitted", nextAt),
        id = ids[p("zero")]!,
        original = input.finance!.contracts[p("zero")]!,
        api = coreAPI(core),
        stock = localStock(core);
      expect(original.settlementPhaseId).toBeUndefined();
      expect(core.finance.contracts.get(id)!.settlementPhaseId).toBeUndefined();
      expect(
        Object.hasOwn(core.finance.contracts.get(id)!, "settlementPhaseId"),
      ).toBe(false);
      expect(
        financeSettlementPhase(api, core.finance.contracts.get(id)!).id,
      ).toBe(phase);
      const receipt = api.settleFinanceContract(id),
        term = core.finance.contracts.get(id)!;
      expect(receipt.paidMinor).toBe(1001);
      expect(term).toMatchObject({
        amountMinor: 1001,
        periodMonths: 12,
        firstDueAt: at,
        endsAt: nextAt,
        source: original.source,
      });
      expect(term.settlementPhaseId).toBeUndefined();
      expect(Object.hasOwn(term, "settlementPhaseId")).toBe(false);
      expect(financeSettlementPhase(api, term).id).toBe(phase);
      expect(term.dueAt).toBe(nextAt);
      expect(core.organizations.get(ownerId)!.liquidMinor).toBe(p("zero"));
      expect(
        core.finance.businesses.get(sellers[p("zero")]!)!.salesReceivedMinor,
      ).toBe(1001);
      expect(core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor).toBe(
        -1001,
      );
      expect(
        localStock(core) -
          stock +
          core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor,
      ).toBe(p("zero"));
      const journal = [...core.cashJournal.detailedReceipts.values()].find(
        (row) => row.sourceRef.id === receipt.id,
      )!;
      expect(journal.grossDebitMinor).toBe(1001);
      expect(journal.grossCreditMinor).toBe(1001);
      expect(journal.relatedRecords).toContainEqual(
        expect.objectContaining({
          kind: financePolicy.cashJournal.relatedKinds.terms,
          id,
          date: at,
        }),
      );
      const settled = financial(core);
      expect(() => api.settleFinanceContract(id)).toThrow();
      expect(() =>
        api.postJournal({
          id: `journal:${core.date}:${core.cashJournal.nextSequence}`,
          date: core.date,
          expectedSequence: core.cashJournal.nextSequence,
          sourceRef: journal.sourceRef,
          postings: journal.postings,
        }),
      ).toThrow();
      expect(financial(core)).toBe(settled);
    });
    it("admits the explicit default-other route with the same owning graph and no manufactured end", () => {
      const { core, ids } = fixture(domain, "explicit-default");
      expect(
        coreAPI(core).settleFinanceContract(ids[p("zero")]!).paidMinor,
      ).toBe(1001);
      expect(
        core.finance.contracts.get(ids[p("zero")]!)!.endsAt,
      ).toBeUndefined();
    });
    it("retains the canonical generated route with exact nondivisible supplier cash", () => {
      const { core, ids, phase } = fixture(domain, "generated");
      expect(
        core.finance.contracts.get(ids[p("zero")]!)!.settlementPhaseId,
      ).toBe(phase);
      expect(
        coreAPI(core).settleFinanceContract(ids[p("zero")]!).paidMinor,
      ).toBe(1001);
    });
    it("settles the other independently dated annual sibling after the first sibling advances", () => {
      const { core, ids } = fixture(domain),
        api = coreAPI(core);
      expect(api.settleFinanceContract(ids[p("zero")]!).paidMinor).toBe(1001);
      core.date = siblingAt;
      expect(api.settleFinanceContract(ids[p("one")]!).paidMinor).toBe(199);
      expect(core.finance.contracts.get(ids[p("zero")]!)!.dueAt).toBe(nextAt);
      expect(core.finance.contracts.get(ids[p("one")]!)!.dueAt).toBe(
        "2022-04-17",
      );
      expect(core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor).toBe(
        -1200,
      );
    });
    const phaseMutations: readonly [
      string,
      (core: CoreState, id: string) => void,
    ][] = [
      [
        "default-other policy changes inside the owning default object",
        (core) => {
          const defaults = core.data.finance!.defaultPhases;
          defaults.other = defaults.procurement;
        },
      ],
      [
        "raw omission becomes an equivalent explicit default phase",
        (core, id) => {
          core.finance.contracts.get(id)!.settlementPhaseId =
            core.data.finance!.defaultPhases.other;
        },
      ],
      [
        "registered funding operation violates owning phase compatibility",
        (core) => {
          const policy = core.data.finance!,
            funding = policy.settlementPhases.find(
              (phase) => phase.id === policy.defaultPhases.funding,
            )!;
          funding.operation = "procure";
        },
      ],
    ];
    for (const [name, mutate] of phaseMutations) {
      for (const when of ["after-first", "before-second"] as const) {
        it(`rechecks ${name} ${when} owning-provider lookup`, () => {
          const { core, ids } = fixture(domain),
            id = ids[p("zero")]!;
          let before = financial(core);
          const api = lookupTamper(
            core,
            coreAPI(core),
            () => {
              mutate(core, id);
              before = financial(core);
            },
            when,
          );
          expect(() => settleFinanceContractJournal(core, api, id)).toThrow();
          expect(financial(core)).toBe(before);
          expect(core.finance.cashSources.size).toBe(p("zero"));
        });
      }
    }
    const mutations: readonly [
      string,
      (core: CoreState, id: string) => void,
    ][] = [
      [
        "wrong phase even with matching original phase witness",
        (core, id) => {
          core.finance.contracts.get(id)!.settlementPhaseId = "income";
          updateAllocation(core, domain, (row) => {
            (
              row.contractTermsById as Record<
                string,
                FinanceCustomerOriginalTerms
              >
            )[id]!.settlementPhaseId = "income";
          });
        },
      ],
      [
        "actual amount differs from immutable original terms",
        (core, id) => {
          core.finance.contracts.get(id)!.amountMinor += p("one");
        },
      ],
      [
        "full Source changes with unchanged citation and matching descriptor",
        (core, id) => {
          const term = core.finance.contracts.get(id)!;
          term.source = {
            ...term.source,
            estimatedFrom: "unsupported full Source annotation",
          };
          term.externalInflow!.source = term.source;
        },
      ],
    ];
    for (const [name, mutate] of mutations) {
      it(`rejects ${name} before settlement`, () => {
        const { core, ids } = fixture(domain),
          id = ids[p("zero")]!;
        mutate(core, id);
        const before = financial(core);
        expect(() => coreAPI(core).settleFinanceContract(id)).toThrow();
        expect(financial(core)).toBe(before);
        expect(core.finance.cashSources.size).toBe(p("zero"));
      });
      for (const when of ["after-first", "before-second"] as const) {
        it(`rejects ${name} ${when} owning-provider lookup without settlement writes`, () => {
          const { core, ids } = fixture(domain),
            id = ids[p("zero")]!;
          let before = financial(core);
          const api = lookupTamper(
            core,
            coreAPI(core),
            () => {
              mutate(core, id);
              before = financial(core);
            },
            when,
          );
          expect(() => settleFinanceContractJournal(core, api, id)).toThrow();
          expect(financial(core)).toBe(before);
          expect(core.finance.cashSources.size).toBe(p("zero"));
        });
      }
    }
    const inconsistentRates: readonly {
      name: string;
      amounts: readonly [number, number];
      monthlyBudgetMinor: number;
      binary64EqualsBudget: boolean;
    }[] = [
      {
        name: "max-safe annual amounts round an unequal rational into the saved integer budget",
        amounts: [9007199254740990, 9007199254740989],
        monthlyBudgetMinor: 1501199875790165,
        binary64EqualsBudget: true,
      },
      {
        name: "ordinary annual amounts remain one twelfth above the saved integer budget",
        amounts: [1001, 200],
        monthlyBudgetMinor: 100,
        binary64EqualsBudget: false,
      },
    ];
    for (const sample of inconsistentRates) {
      it(`rejects ${sample.name} before any cash with matching complete owning terms`, () => {
        const { core, ids } = fixture(domain);
        for (const [index, id] of ids.entries())
          core.finance.contracts.get(id)!.amountMinor = sample.amounts[index]!;
        updateAllocation(core, domain, (allocation) => {
          const originals = allocation.contractTermsById as Record<
              string,
              FinanceCustomerOriginalTerms
            >,
            amounts = allocation.contractAmountsMinor as Record<string, number>;
          for (const [index, id] of ids.entries()) {
            originals[id]!.amountMinor = sample.amounts[index]!;
            amounts[id] = sample.amounts[index]!;
          }
        });
        if (domain === "public") {
          const owner = core.organizations.get(ownerId)!,
            key = `${publicRule.appropriationFieldPrefix}${destination}`,
            appropriation = JSON.parse(owner.governmentFacts![key]!) as Saved;
          appropriation.monthlyBudgetMinor = sample.monthlyBudgetMinor;
          owner.governmentFacts = {
            ...owner.governmentFacts,
            [key]: JSON.stringify(appropriation),
          };
        } else {
          updateMetadata(
            core,
            `${visitorRule.visitMetadataPrefix}${visitId}`,
            (visit) => {
              (visit.facts as Saved).monthlyBudgetMinor = String(
                sample.monthlyBudgetMinor,
              );
            },
          );
          updateMetadata(
            core,
            `${visitorRule.ownerBudgetMetadataPrefix}${ownerId}`,
            (budget) => {
              budget.monthlyBudgetMinor = sample.monthlyBudgetMinor;
              (budget.marketMonthlyAmountsMinor as Record<string, number>)[
                marketId
              ] = sample.monthlyBudgetMinor;
            },
          );
        }
        expect(
          sample.amounts.every(
            (amount) => Number.isSafeInteger(amount) && amount > p("zero"),
          ),
        ).toBe(true);
        expect(Number.isSafeInteger(sample.monthlyBudgetMinor)).toBe(true);
        const contextualBinary64 = sample.amounts.reduce(
            (sum, amount) => sum + amount / 12,
            p("zero"),
          ),
          exactAnnual = sample.amounts.reduce(
            (sum, amount) => sum + BigInt(amount),
            BigInt(p("zero")),
          );
        expect(contextualBinary64 === sample.monthlyBudgetMinor).toBe(
          sample.binary64EqualsBudget,
        );
        expect(
          exactAnnual === BigInt(sample.monthlyBudgetMinor) * BigInt(12),
        ).toBe(false);
        const before = financial(core);
        expect(() =>
          coreAPI(core).settleFinanceContract(ids[p("zero")]!),
        ).toThrow(
          "Actual customer sibling allocation differs from its recorded monthly budget.",
        );
        expect(financial(core)).toBe(before);
        expect(core.finance.cashSources.size).toBe(p("zero"));
      });
    }
    it("rejects a lone 1001/12 supplied rate that does not equal saved monthly allocation 100", () => {
      const { core, ids } = fixture(domain, "omitted", undefined, true),
        keep = ids[p("zero")]!;
      const before = financial(core);
      expect(() => coreAPI(core).settleFinanceContract(keep)).toThrow();
      expect(financial(core)).toBe(before);
      expect(core.finance.cashSources.size).toBe(p("zero"));
    });
    it("rejects duplicate policy routes rather than selecting an ambiguous owning validator", () => {
      const { core, ids } = fixture(domain),
        policy = core.data.finance!,
        cfg = policy.cashJournal,
        route = cfg.externalInflowContracts.find(
          (row) =>
            row.inflowKind ===
              core.finance.contracts.get(ids[p("zero")]!)!.externalInflow!
                .kind && row.phaseId === financePolicy.defaultPhases.other,
        )!;
      core.data = {
        ...core.data,
        finance: {
          ...policy,
          cashJournal: {
            ...cfg,
            externalInflowContracts: [
              ...cfg.externalInflowContracts,
              { ...route },
            ],
          },
        },
      };
      const before = financial(core);
      expect(() =>
        coreAPI(core).settleFinanceContract(ids[p("zero")]!),
      ).toThrow();
      expect(financial(core)).toBe(before);
    });
    it("keeps missing authority or independent identity evidence rejected despite a sales flag", () => {
      const { core, ids } = fixture(domain);
      if (domain === "public") {
        const owner = core.organizations.get(ownerId)!,
          facts = { ...owner.governmentFacts };
        delete facts[`${publicRule.authorityFieldPrefix}${destination}`];
        owner.governmentFacts = facts;
      } else {
        const metadata = { ...core.placeMetadata };
        delete metadata[`${visitorRule.identityMetadataPrefix}${identityId}`];
        core.placeMetadata = metadata;
      }
      const before = financial(core);
      expect(() =>
        coreAPI(core).settleFinanceContract(ids[p("zero")]!),
      ).toThrow();
      expect(financial(core)).toBe(before);
    });
    it("keeps absent original full Source maps rejected despite exact amount and default phase", () => {
      const { core, ids } = fixture(domain);
      updateAllocation(core, domain, (row) => {
        delete row.contractSourceMap;
      });
      const before = financial(core);
      expect(() =>
        coreAPI(core).settleFinanceContract(ids[p("zero")]!),
      ).toThrow();
      expect(financial(core)).toBe(before);
    });
  });
}
