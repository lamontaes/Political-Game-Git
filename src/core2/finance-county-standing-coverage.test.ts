/** SOURCE-ONLY packet: every case UNEXECUTED by its author. */
import { describe, expect, it } from "vitest";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "../simulation/government-units";
import { createStableId } from "../simulation/ids";
import { lifePlaceByKey } from "../simulation/life-places";
import { governmentUnitRecordedName } from "../simulation/nationwide-world/government-unit-names";
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
import {
  DEFAULT_OPENING_PUBLIC_OWNER_DATA,
  openingHistoricalCountyOwnerFacts,
  openingHistoricalCountyPlaceCoverage,
  openingHistoricalCountyPurchaseCoverage,
} from "./opening-public-owner";
import { parameter as p } from "./parameters";
import { coreAPI, createCore, promoteHusk } from "./state";
import type {
  CoreAPI,
  CoreInput,
  CoreState,
  OrganizationInput,
  PersonInput,
  Source,
} from "./types";

const openingAt = "2021-01-01",
  dueAt = "2021-01-17",
  nextAt = "2021-02-17",
  followingAt = "2021-03-17",
  supplierId = "organization:controlled-county-provider",
  providerId = "provider:controlled-county-product",
  authorityId = "authority:controlled-county-standing",
  appropriationId = "appropriation:controlled-county-standing",
  agreementId = "agreement:controlled-county-standing",
  contractId = `${agreementId}:contract:${supplierId}`,
  householdId = "household:controlled-county-original",
  originalPersonId = "person:controlled-county-original",
  promotedIds = [
    "person:controlled-county-later-one",
    "person:controlled-county-later-two",
  ],
  rule = financePolicy.cashJournal.procurement[p("zero")]!;
const fixtureSource: Source = {
  tag: "ESTIMATED",
  asOf: openingAt,
  citation: "Controlled standing procurement and later admission fixture.",
  estimatedFrom:
    "Technical conditional edge only; no observed fiscal appropriation, new demand, supplier delivery or ordinary-world proof.",
  generationPriorVintage: "Explicit technical fixture only",
};
type RecordRow = Record<string, unknown>;

function recordedFixture(startedAt = openingAt) {
  const county = governmentUnit("gus2025:194116")!,
    worldId = createStableId(
      "world",
      "bounded-county-standing-coverage-fixture",
    ),
    stableKey = `local-government:${county.id}`,
    ownerId = createStableId("organization", `${worldId}:${stableKey}`),
    placeId = lifePlaceByKey("4840342")!.context.jurisdiction.id;
  const projection = openingHistoricalCountyOwnerFacts({
    organizationId: ownerId,
    organizationStableKey: stableKey,
    worldId,
    name: governmentUnitRecordedName(county),
    classification: "service:county-government",
    placeId: governmentUnitJurisdictionId(county),
    startedAt,
  });
  const owner: OrganizationInput = {
    id: ownerId,
    name: governmentUnitRecordedName(county),
    classification: "service:county-government",
    placeId: governmentUnitJurisdictionId(county),
    kind: "employer",
    liquidMinor: p("zero"),
    source: { ...fixtureSource, asOf: startedAt },
    outsideFlow: { ...fixtureSource, asOf: startedAt },
    governmentFacts: projection.governmentFacts!,
  };
  const person: PersonInput = {
    id: originalPersonId,
    givenName: "Recorded",
    familyName: "Resident",
    birthDate: "1980-01-01",
    placeId,
    countyId: owner.placeId,
    householdId,
    tier: "weekly",
    traits: {},
    liquidMinor: p("zero"),
    livingCostDailyMinor: p("zero"),
    source: fixtureSource,
    familyIds: [],
    knownIds: [],
  };
  return { owner, person, placeId, ownerId };
}

function buildFixture() {
  const base = recordedFixture(),
    { owner, person, placeId, ownerId } = base,
    original = openingHistoricalCountyPurchaseCoverage(owner, {
      startedAt: openingAt,
      people: [person],
    }).rows[p("zero")]!;
  const amountMinor = p("minorPerDollar"),
    contractSource: Source = {
      ...fixtureSource,
      citation: `${fixtureSource.citation} Original agreement ${agreementId}; supplier ${supplierId}.`,
    };
  const contract: FinanceContractInput = {
    id: contractId,
    payerIds: [ownerId],
    payeeId: supplierId,
    kind: rule.contractKind,
    amountMinor,
    dueAt,
    periodMonths: p("one"),
    accruesArrears: false,
    salesReceipt: true,
    marketAdjusted: false,
    salesReceiptBudget: false,
    settlementPhaseId: "business-procurement",
    source: contractSource,
    externalInflow: {
      kind: "external.public-procurement",
      ownerId,
      authorityRecordId: authorityId,
      appropriationRecordId: appropriationId,
      agreementRecordId: agreementId,
      source: contractSource,
    },
  };
  const originalTerms: FinanceCustomerOriginalTerms = {
    payerIds: contract.payerIds,
    payeeId: contract.payeeId,
    kind: contract.kind,
    amountMinor: contract.amountMinor,
    firstDueAt: contract.dueAt,
    periodMonths: contract.periodMonths,
    settlementPhaseId: contract.settlementPhaseId!,
  };
  const authority = {
    id: authorityId,
    issuerId: ownerId,
    governmentKey: owner.governmentFacts!.governmentKey,
    jurisdictionId: owner.governmentFacts!.governmentJurisdictionId,
    effectiveFrom: dueAt,
    source: fixtureSource,
  };
  const appropriation = {
    id: appropriationId,
    authorityId,
    buyerAccountId: ownerId,
    monthlyBudgetMinor: amountMinor,
    coveredPlaceId: placeId,
    coveredOriginalResidentCount: original.representedResidentCount,
    ownerCoverage: {
      governmentKey: authority.governmentKey,
      jurisdictionId: authority.jurisdictionId,
      representedResidentCount: original.representedResidentCount,
      basisRecordIds: original.basisRecordIds,
      identitySource: original.identitySource,
      coverageSource: original.coverageSource,
    },
    effectiveFrom: dueAt,
    source: fixtureSource,
  };
  const agreement = {
    id: agreementId,
    authorityId,
    appropriationId,
    buyerAccountId: ownerId,
    supplierIds: [supplierId],
    serviceKey: rule.serviceKey,
    providerQualifications: [
      {
        organizationId: supplierId,
        serviceKey: rule.serviceKey,
        jobIds: [],
        providerRecordIds: [providerId],
        sources: [
          {
            recordId: providerId,
            kind: "recorded-provider",
            source: fixtureSource,
          },
        ],
      },
    ],
    basisRecordIds: [...original.basisRecordIds, providerId],
    contractIds: [contractId],
    contractSourceMap: { [contractId]: contractSource },
    contractTermsById: { [contractId]: originalTerms },
    effectiveFrom: dueAt,
    source: fixtureSource,
  };
  const input: CoreInput = {
    seed: "unexecuted-bounded-county-standing-coverage",
    startedAt: openingAt,
    people: [person],
    husks: promotedIds.map((id, index) => ({
      id,
      givenName: `Later${index}`,
      familyName: person.familyName,
      placeId,
      countyId: owner.placeId,
      birthDate: person.birthDate,
      looks: {},
      said: [],
      source: fixtureSource,
    })),
    households: [
      {
        id: householdId,
        placeId,
        memberIds: [person.id, ...promotedIds],
        source: fixtureSource,
      },
    ],
    jobs: [],
    organizations: [
      {
        ...owner,
        governmentFacts: {
          ...owner.governmentFacts,
          [`${rule.authorityFieldPrefix}${placeId}`]: JSON.stringify(authority),
          [`${rule.appropriationFieldPrefix}${placeId}`]:
            JSON.stringify(appropriation),
          [`${rule.agreementFieldPrefix}${placeId}`]: JSON.stringify(agreement),
        },
      },
      {
        id: supplierId,
        name: "Controlled county supplier",
        placeId,
        kind: "employer",
        classification: rule.supplierClassifications[p("zero")],
        liquidMinor: p("zero"),
        source: fixtureSource,
      },
    ],
    finance: {
      contracts: [contract],
      facilities: [],
      gaps: [],
      businesses: [
        {
          organizationId: supplierId,
          kindId: "building-services",
          annualPayrollMinor: p("zero"),
          annualDemandMinor: p("zero"),
          annualOtherCostsMinor: p("zero"),
          openingTownIncomeMinor: p("zero"),
          capacityMinor: p("zero"),
          price: p("one"),
          costContractIds: [],
          source: fixtureSource,
        },
      ],
    },
    placeMetadata: {
      [`${rule.providerMetadataPrefix}${providerId}`]: JSON.stringify({
        id: providerId,
        organizationId: supplierId,
        serviceKeys: [rule.serviceKey],
        source: fixtureSource,
      }),
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const core = createCore(input, { data: DEFAULT_DATA, observer: true });
  core.date = dueAt;
  ensureFinanceCashModule(core);
  return { ...base, core, input, original, amountMinor };
}
function promoteRecorded(
  core: CoreState,
  person: PersonInput,
  index: number,
): void {
  const id = promotedIds[index]!,
    husk = core.husks.get(id)!;
  promoteHusk(core, {
    ...person,
    id,
    givenName: husk.givenName,
    familyName: husk.familyName,
    source: { ...fixtureSource, asOf: core.date },
  });
}
function originalRecords(core: CoreState, ownerId: string): string {
  return JSON.stringify(core.organizations.get(ownerId)!.governmentFacts);
}
function appropriationRecord(
  core: CoreState,
  ownerId: string,
  placeId: string,
): RecordRow {
  return JSON.parse(
    core.organizations.get(ownerId)!.governmentFacts![
      `${rule.appropriationFieldPrefix}${placeId}`
    ]!,
  ) as RecordRow;
}
function updateAppropriation(
  core: CoreState,
  ownerId: string,
  placeId: string,
  change: (row: RecordRow) => void,
): void {
  const owner = core.organizations.get(ownerId)!,
    key = `${rule.appropriationFieldPrefix}${placeId}`,
    row = appropriationRecord(core, ownerId, placeId);
  change(row);
  owner.governmentFacts = {
    ...owner.governmentFacts,
    [key]: JSON.stringify(row),
  };
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
function lookupTamper(core: CoreState, change: () => void): CoreAPI {
  const api = coreAPI(core);
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
          if (calls === p("one") + p("one")) change();
          return original(reference);
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

describe("UNEXECUTED county standing agreement coverage", () => {
  it("keeps a pure historical place witness independent of an opening population count", () => {
    const { owner, person, placeId } = recordedFixture(),
      before = structuredClone(owner),
      original = openingHistoricalCountyPurchaseCoverage(owner, {
        startedAt: openingAt,
        people: [person],
      }).rows[p("zero")]!,
      pure = openingHistoricalCountyPlaceCoverage(owner, {
        startedAt: openingAt,
        placeId,
      });
    expect(pure.coverage).toEqual({
      placeId: original.placeId,
      basisRecordIds: original.basisRecordIds,
      identitySource: original.identitySource,
      coverageSource: original.coverageSource,
    });
    expect(pure.coverage).not.toHaveProperty("representedResidentCount");
    expect(
      openingHistoricalCountyPurchaseCoverage(owner, {
        startedAt: openingAt,
        people: [person, { ...person, id: promotedIds[p("zero")]! }],
      }).rows[p("zero")]!.representedResidentCount,
    ).toBe(p("one") + p("one"));
    expect(owner).toEqual(before);
    expect(pure.gaps).toContain(
      "opening-public-owner:historical-identity-forward-application-estimated:gus2025:194116",
    );
  });

  it("pays the unchanged original invoice after valid husk admission grows the current count", () => {
    const { core, person, ownerId, owner, placeId, amountMinor } =
        buildFixture(),
      records = originalRecords(core, ownerId);
    promoteRecorded(core, person, p("zero"));
    expect(core.peopleByPlace.get(placeId)!.size).toBe(p("one") + p("one"));
    expect(
      openingHistoricalCountyPurchaseCoverage(owner, {
        startedAt: openingAt,
        people: [...core.people.values()],
      }).rows[p("zero")]!.representedResidentCount,
    ).toBe(p("one") + p("one"));
    expect(coreAPI(core).settleFinanceContract(contractId).paidMinor).toBe(
      amountMinor,
    );
    expect(core.organizations.get(ownerId)!.liquidMinor).toBe(p("zero"));
    expect(core.organizations.get(supplierId)!.liquidMinor).toBe(amountMinor);
    expect(core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor).toBe(
      -amountMinor,
    );
    expect(core.finance.contracts.get(contractId)!.dueAt).toBe(nextAt);
    expect(originalRecords(core, ownerId)).toBe(records);
    expect(appropriationRecord(core, ownerId, placeId)).toMatchObject({
      monthlyBudgetMinor: amountMinor,
      coveredOriginalResidentCount: p("one"),
      ownerCoverage: { representedResidentCount: p("one") },
    });
  });

  it("retains the original budget and full Source maps through another admission and recurrence", () => {
    const { core, person, ownerId, placeId, amountMinor } = buildFixture(),
      records = originalRecords(core, ownerId),
      standingSource = structuredClone(
        core.finance.contracts.get(contractId)!.source,
      );
    expect(coreAPI(core).settleFinanceContract(contractId).paidMinor).toBe(
      amountMinor,
    );
    core.date = nextAt;
    promoteRecorded(core, person, p("zero"));
    promoteRecorded(core, person, p("one"));
    expect(core.peopleByPlace.get(placeId)!.size).toBe(
      p("one") + p("one") + p("one"),
    );
    expect(coreAPI(core).settleFinanceContract(contractId).paidMinor).toBe(
      amountMinor,
    );
    expect(core.finance.contracts.get(contractId)!.dueAt).toBe(followingAt);
    expect(core.cashJournal.externalFlowsByOwner.get(ownerId)!.netMinor).toBe(
      -amountMinor - amountMinor,
    );
    expect(core.organizations.get(ownerId)!.liquidMinor).toBe(p("zero"));
    expect(core.organizations.get(supplierId)!.liquidMinor).toBe(
      amountMinor + amountMinor,
    );
    expect(core.finance.businesses.get(supplierId)!.salesReceivedMinor).toBe(
      amountMinor + amountMinor,
    );
    expect(core.finance.contracts.get(contractId)!.source).toEqual(
      standingSource,
    );
    expect(originalRecords(core, ownerId)).toBe(records);
  });

  it("rejects an unrelated actual served-place/county relation without any people input", () => {
    const { owner } = recordedFixture(),
      placeId = lifePlaceByKey("3200500")!.context.jurisdiction.id;
    const result = openingHistoricalCountyPlaceCoverage(owner, {
      startedAt: openingAt,
      placeId,
    });
    expect(result.coverage).toBeUndefined();
    expect(result.gaps).toContain(
      `opening-public-owner:county-to-place-membership-unverified:${owner.id}:${placeId}`,
    );
  });

  it("rejects a recorded historical identity tamper and invalid dated geography provenance", () => {
    const { owner, placeId } = recordedFixture();
    expect(
      openingHistoricalCountyPlaceCoverage(
        {
          ...owner,
          governmentFacts: {
            ...owner.governmentFacts,
            "openingPublicOwner.observedAt": "2021-01-01",
          },
        },
        { startedAt: openingAt, placeId },
      ).coverage,
    ).toBeUndefined();
    const earlierOwner = recordedFixture("2019-01-01").owner,
      earlier = openingHistoricalCountyPlaceCoverage(earlierOwner, {
        startedAt: "2019-01-01",
        placeId,
      });
    expect(earlier.coverage).toBeUndefined();
    expect(earlier.gaps).toContain(
      `opening-public-owner:county-to-place-membership-unverified:${earlierOwner.id}:${placeId}`,
    );
    expect(
      openingHistoricalCountyPlaceCoverage(
        owner,
        { startedAt: openingAt, placeId },
        {
          ...DEFAULT_OPENING_PUBLIC_OWNER_DATA,
          purchaseCoverageGeography: {
            ...DEFAULT_OPENING_PUBLIC_OWNER_DATA.purchaseCoverageGeography,
            corpusSha256: "wrong-corpus",
          },
        },
      ).coverage,
    ).toBeUndefined();
  });

  for (const invalid of [
    p("zero"),
    -p("one"),
    p("one") / (p("one") + p("one")),
    Number.MAX_SAFE_INTEGER + p("one"),
  ]) {
    it(`rejects a nonpositive or unsafe saved original count ${invalid}`, () => {
      const { core, ownerId, placeId } = buildFixture();
      updateAppropriation(core, ownerId, placeId, (row) => {
        (row.ownerCoverage as RecordRow).representedResidentCount = invalid;
        row.coveredOriginalResidentCount = invalid;
      });
      const before = financial(core);
      expect(() => coreAPI(core).settleFinanceContract(contractId)).toThrow();
      expect(financial(core)).toBe(before);
    });
  }

  const tamperCases: readonly [string, (row: RecordRow) => void][] = [
    [
      "count differs from appropriation",
      (row) => {
        (row.ownerCoverage as RecordRow).representedResidentCount =
          p("one") + p("one");
      },
    ],
    [
      "wrong county jurisdiction",
      (row) => {
        (row.ownerCoverage as RecordRow).jurisdictionId =
          "jurisdiction:wrong-county";
      },
    ],
    [
      "wrong government owner",
      (row) => {
        (row.ownerCoverage as RecordRow).governmentKey =
          "government:wrong-owner";
      },
    ],
    [
      "wrong coverage basis",
      (row) => {
        (row.ownerCoverage as RecordRow).basisRecordIds = [
          "basis:wrong-geography",
        ];
      },
    ],
    [
      "different full identity Source",
      (row) => {
        (
          (row.ownerCoverage as RecordRow).identitySource as RecordRow
        ).citation = "Changed historical identity";
      },
    ],
    [
      "future identity Source",
      (row) => {
        ((row.ownerCoverage as RecordRow).identitySource as RecordRow).asOf =
          "2022-01-01";
      },
    ],
    [
      "different full coverage Source",
      (row) => {
        (
          (row.ownerCoverage as RecordRow).coverageSource as RecordRow
        ).citation = "Changed geography provenance";
      },
    ],
    [
      "future coverage Source",
      (row) => {
        ((row.ownerCoverage as RecordRow).coverageSource as RecordRow).asOf =
          "2022-01-01";
      },
    ],
  ];
  for (const [label, change] of tamperCases) {
    it(`rejects ${label} with no settlement writes`, () => {
      const { core, ownerId, placeId } = buildFixture();
      updateAppropriation(core, ownerId, placeId, change);
      const before = financial(core);
      expect(() => coreAPI(core).settleFinanceContract(contractId)).toThrow();
      expect(financial(core)).toBe(before);
    });
  }

  it("rejects wrong canonical served geography even when the supplier shares that wrong place", () => {
    const { core, ownerId, placeId } = buildFixture(),
      wrongPlaceId = lifePlaceByKey("3200500")!.context.jurisdiction.id;
    core.organizations.get(supplierId)!.placeId = wrongPlaceId;
    updateAppropriation(core, ownerId, placeId, (row) => {
      row.coveredPlaceId = wrongPlaceId;
    });
    const before = financial(core);
    expect(() => coreAPI(core).settleFinanceContract(contractId)).toThrow();
    expect(financial(core)).toBe(before);
  });

  for (const [label, change] of tamperCases) {
    it(`final preflight rejects ${label} after source preparation without cash or progression`, () => {
      const { core, ownerId, placeId } = buildFixture();
      promoteRecorded(core, recordedFixture().person, p("zero"));
      const before = financial(core),
        api = lookupTamper(core, () =>
          updateAppropriation(core, ownerId, placeId, change),
        );
      expect(() =>
        settleFinanceContractJournal(core, api, contractId),
      ).toThrow();
      expect(financial(core)).toBe(before);
      expect(core.finance.cashSources.size).toBe(p("zero"));
    });
  }
});
