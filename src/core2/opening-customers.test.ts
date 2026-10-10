/** Opening record/term fixtures; generated-world outcomes are measured separately. */
import { describe, expect, it } from "vitest";
import {
  lifePlaceStateIdentities,
  lifePlaceByKey,
} from "../simulation/life-places";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "../simulation/government-units";
import { createStableId } from "../simulation/ids";
import { governmentUnitRecordedName } from "../simulation/nationwide-world/government-unit-names";
import { openingHistoricalCountyOwnerFacts } from "./opening-public-owner";
import type { FinanceContractInput } from "./finance-types";
import {
  buildOpeningCustomers,
  DEFAULT_OPENING_CUSTOMER_DATA,
  type OpeningCustomerOptions,
  type OpeningCustomerOutsideBuyerIdentity,
  type OpeningCustomerProviderQualification,
  type RecordedCustomerProvider,
} from "./opening-customers";
import {
  openingCustomerQualificationKey,
  openingCustomerQualificationReference,
  type OpeningCustomerAgreementQualification,
  type OpeningCustomerQualificationPlanReference,
  type OpeningCustomerQualificationRecord,
} from "./opening-customer-qualification";
import { parameter as p, PARAMETERS, type Parameter } from "./parameters";
import type {
  CoreInput,
  OrganizationInput,
  PersonInput,
  Source,
} from "./types";

const at = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: at,
  citation:
    "Controlled opening-customer fixture, not an observed family, provider, appropriation, visit, or generated-world result.",
  estimatedFrom:
    "Fixture identity and unit-constant amounts; production customer priors remain separately sourced and uncalibrated.",
};

// Representation adapter only: all prior owning job/Source assertions stay below.
type CustomerResult = ReturnType<typeof buildOpeningCustomers>;
function fullQualification(
  result: CustomerResult,
  row: OpeningCustomerAgreementQualification,
): OpeningCustomerProviderQualification {
  if (!("qualificationId" in row)) return row;
  const owner = result.input.organizations.find(
    (value) => value.id === row.organizationId,
  )!;
  const raw =
    owner.governmentFacts![
      openingCustomerQualificationKey(row.qualificationId)
    ]!;
  expect(raw).toBeDefined();
  const record = JSON.parse(raw) as OpeningCustomerQualificationRecord;
  expect(openingCustomerQualificationReference(record)).toEqual(row);
  expect(result.receipt.providerQualifications).toContainEqual(record);
  const { qualificationId, ...full } = record;
  expect(qualificationId).toBe(row.qualificationId);
  return full;
}
function fullPlanQualification(
  result: CustomerResult,
  row: OpeningCustomerQualificationPlanReference,
): OpeningCustomerProviderQualification {
  if ("qualificationId" in row) return fullQualification(result, row);
  const owning = result.receipt.inlineProviderQualifications.find(
    (value) => value.agreementId === row.agreementId,
  )!;
  return owning.qualifications.find(
    (value) =>
      value.organizationId === row.organizationId &&
      value.serviceKey === row.serviceKey,
  )!;
}
function qualificationText(result: CustomerResult, raw: string): string {
  return JSON.stringify(
    (JSON.parse(raw) as OpeningCustomerAgreementQualification[]).map((row) =>
      fullQualification(result, row),
    ),
  );
}

function fixture(): CoreInput {
  const scopes = [
    {
      id: "salon",
      classification: "enterprise:personal-services",
      occupation: "service:barber",
    },
    {
      id: "cleaner",
      classification: "enterprise:building-services",
      occupation: "occupation:janitor",
    },
    {
      id: "lawn",
      classification: "enterprise:building-services",
      occupation: "occupation:landscaper",
    },
    {
      id: "gym",
      classification: "enterprise:recreation",
      occupation: "occupation:fitness-trainer",
    },
    {
      id: "lawyer",
      classification: "enterprise:professional-services",
      occupation: "profession:lawyer",
    },
    {
      id: "accountant",
      classification: "enterprise:professional-services",
      occupation: "profession:accountant",
    },
    {
      id: "telephone",
      classification: "enterprise:telecommunications",
      occupation: "trade:telecom-technician",
    },
    {
      id: "clinic",
      classification: "service:clinic",
      occupation: "profession:registered-nurse",
    },
    {
      id: "inn",
      classification: "enterprise:lodging",
      occupation: "occupation:hotel-clerk",
    },
  ];
  const organizations: OrganizationInput[] = scopes.map((row) => ({
    id: row.id,
    placeId: "fixture-place",
    name: `Named fixture ${row.id}`,
    classification: row.classification,
    kind: "employer",
    liquidMinor: p("minorPerDollar") * p("monthsPerYear"),
    source,
  }));
  organizations.push({
    id: "store",
    placeId: "fixture-place",
    name: "Existing general store",
    kind: "employer",
    classification: "enterprise:retail",
    liquidMinor: p("minorPerDollar"),
    source,
  });
  organizations.push({
    id: "local-office",
    placeId: "fixture-place",
    name: "Named local office",
    kind: "employer",
    classification: "sector:local-government-office",
    governmentFacts: {
      governmentKind: "local-government",
      governmentKey: "fixture-local-government",
      governmentJurisdictionId: "fixture-place",
    },
    liquidMinor: p("minorPerDollar") * p("monthsPerYear"),
    source,
  });
  const customer: PersonInput = {
    id: "customer",
    givenName: "Morgan",
    familyName: "Bennett",
    birthDate: "1980-01-01",
    placeId: "fixture-place",
    householdId: "customer-household",
    tier: "weekly",
    traits: {},
    liquidMinor: p("minorPerDollar") * p("monthsPerYear"),
    livingCostDailyMinor: p("minorPerDollar") * p("daysPerWeek"),
    familyIds: [],
    knownIds: [],
    source,
  };
  const workers: PersonInput[] = scopes.map((row) => ({
    ...customer,
    id: `worker:${row.id}`,
    givenName: "Casey",
    familyName: "Bennett",
    householdId: `household:${row.id}`,
    livingCostDailyMinor: p("zero"),
    jobId: `job:${row.id}`,
  }));
  const people = [customer, ...workers];
  const jobs = scopes.map((row) => ({
    id: `job:${row.id}`,
    personId: `worker:${row.id}`,
    organizationId: row.id,
    title: `Recorded ${row.occupation}`,
    occupationClassification: row.occupation,
    wageDailyMinor: p("minorPerDollar"),
    hourlyMinor: p("minorPerDollar"),
    hoursDaily: p("one"),
    source,
  }));
  return {
    seed: "controlled-opening-customer-source-fixtures",
    startedAt: at,
    people,
    organizations,
    jobs,
    households: people.map((person) => ({
      id: person.householdId,
      placeId: person.placeId,
      memberIds: [person.id],
      source,
    })),
    workCommitments: jobs.map((job) => ({
      id: `commitment:${job.id}`,
      jobId: job.id,
      personId: job.personId,
      organizationId: job.organizationId,
      startsAt: at,
      anchorDate: at,
      periodDays: p("one"),
      slots: [
        {
          offsetDays: p("zero"),
          startMinute: p("zero"),
          minutes: p("minutesPerHour"),
        },
      ],
      expectedWeeklyMinutes: p("minutesPerHour") * p("daysPerWeek"),
      hourlyMinor: p("minorPerDollar"),
      scheduleSource: source,
      paySource: source,
    })),
    finance: { contracts: [], facilities: [], businesses: [], gaps: [] },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

function options(
  overrides: OpeningCustomerOptions = {},
): OpeningCustomerOptions {
  return {
    geography: () => ({
      jurisdictionKey: "fixture-source-key",
      region: "national",
      source,
      outsideMarkets: [],
    }),
    outsideMarkets: [],
    ...overrides,
  };
}

function visitorOptions(): OpeningCustomerOptions {
  return options({
    outsideMarkets: [
      {
        id: "recorded-fixture-visit-market",
        destinationPlaceId: "fixture-place",
        originPlaceId: "fixture-outside-place",
        originPlaceName: "Named outside fixture town",
        originSourcePopulation: p("monthsPerYear"),
        basisRecordIds: ["fixture-geographic-visit-record"],
        source,
      },
    ],
  });
}

function householdTerms(input: CoreInput): readonly FinanceContractInput[] {
  return (
    input.finance?.contracts.filter(
      (row) => row.householdId === "customer-household",
    ) ?? []
  );
}

function recordedProviderFixture() {
  const original = fixture();
  const used: RecordedCustomerProvider[] = [
    {
      id: "recorded-salon-scope",
      organizationId: "salon",
      serviceKeys: ["personal-care"],
      source: { ...source, citation: "Controlled dated salon product record." },
    },
    {
      id: "recorded-cleaner-scope",
      organizationId: "cleaner",
      serviceKeys: ["housekeeping", "public-custodial"],
      source: {
        ...source,
        citation: "Controlled dated custodial product record.",
      },
    },
    {
      id: "recorded-inn-scope",
      organizationId: "inn",
      serviceKeys: ["visitor-lodging"],
      source: {
        ...source,
        citation: "Controlled dated lodging product record.",
      },
    },
  ];
  const unused: RecordedCustomerProvider[] = [
    {
      id: "unused-store-scope",
      organizationId: "store",
      serviceKeys: ["personal-care"],
      source,
    },
    {
      id: "redundant-gym-scope",
      organizationId: "gym",
      serviceKeys: ["participant-sports"],
      source,
    },
  ];
  return {
    input: {
      ...original,
      jobs: original.jobs.filter(
        (job) =>
          !used.some((record) => record.organizationId === job.organizationId),
      ),
    },
    supplied: { ...visitorOptions(), providerRecords: [...used, ...unused] },
    used,
    unused,
  };
}

describe("opening customer producer", () => {
  it("builds household and public terms from actual PARAMETERS with default options", () => {
    const input = fixture(),
      before = structuredClone(input);
    const result = buildOpeningCustomers(input);
    for (const [key, tag] of [
      [DEFAULT_OPENING_CUSTOMER_DATA.sizeTopCodeParameter, "SOURCED"],
      [
        DEFAULT_OPENING_CUSTOMER_DATA.publicPurchases
          .cleaningBudgetShareParameter,
        "ESTIMATED",
      ],
    ] as const) {
      expect(PARAMETERS[key]!.tag).toBe(tag);
      expect(PARAMETERS[key]!.checkRange).toBeUndefined();
      expect(result.receipt.parameterRefs).toContain(key);
    }
    for (const [kind, payeeId] of [
      ["household.customer.personal-care", "salon"],
      ["public.customer.custodial-services", "cleaner"],
    ] as const) {
      const contract = result.input.finance!.contracts.find(
        (row) => row.kind === kind,
      )!;
      expect(contract).toBeDefined();
      expect(contract.amountMinor).toBeGreaterThan(p("zero"));
      expect(contract.payeeId).toBe(payeeId);
    }
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
    expect(result.receipt.newStocks).toEqual([]);
    expect(input).toEqual(before);
  });

  it("admits zero-stock outside owners and purchase terms from the actual production registry", () => {
    const rule = DEFAULT_OPENING_CUSTOMER_DATA.outsideHouseholds;
    const result = buildOpeningCustomers(fixture(), {
      ...visitorOptions(),
      parameters: PARAMETERS,
    });
    const legacyStockParameter = "openingCustomerOutsideHouseholdLiquidUsd";
    expect(PARAMETERS[legacyStockParameter]!.checkRange).toBeUndefined();
    expect(result.receipt.newStocks).toEqual([]);
    expect(result.receipt.newOrganizationIds).toHaveLength(p("one"));
    const owner = result.input.organizations.find(
      (row) => row.id === result.receipt.newOrganizationIds[p("zero")],
    )!;
    expect(owner.liquidMinor).toBe(p("zero"));
    expect(owner.outsideFlow?.tag).toBe("ESTIMATED");
    expect(result.receipt.parameterRefs).toContain(
      rule.countPerMarketParameter,
    );
    expect(result.receipt.parameterRefs).not.toContain(legacyStockParameter);
    expect(rule).not.toHaveProperty("liquidUsdParameter");
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
    const contract = result.input.finance!.contracts.find(
      (row) => row.kind === rule.contractKind,
    )!;
    expect(contract).toBeDefined();
    expect(contract.payeeId).toBe("inn");
    expect(contract.amountMinor).toBeGreaterThan(p("zero"));
  });

  it.each(
    [
      {
        label: "SOURCED quantity",
        key: DEFAULT_OPENING_CUSTOMER_DATA.sizeTopCodeParameter,
      },
      {
        label: "ESTIMATED quantity",
        key: DEFAULT_OPENING_CUSTOMER_DATA.publicPurchases
          .cleaningBudgetShareParameter,
      },
      {
        label: "TUNABLE cadence",
        key: DEFAULT_OPENING_CUSTOMER_DATA.periodMonthsParameter,
      },
    ].flatMap(({ label, key }) =>
      [
        { defect: "blank citation", invalid: { citation: " \t " } },
        { defect: "nonstring citation", invalid: { citation: p("one") } },
        { defect: "missing citation", invalid: { citation: undefined } },
        { defect: "missing tag", invalid: { tag: undefined } },
        { defect: "unrecognized tag", invalid: { tag: "UNKNOWN" } },
      ].map(({ defect, invalid }) => ({ label, key, defect, invalid })),
    ),
  )("rejects a $label with $defect: $key", ({ key, invalid }) => {
    const input = fixture(),
      before = structuredClone(input);
    const parameters = {
      ...PARAMETERS,
      [key]: { ...PARAMETERS[key]!, ...invalid } as unknown as Parameter,
    };
    expect(() => buildOpeningCustomers(input, options({ parameters }))).toThrow(
      `Customer prior requires source and valid tag: ${key}`,
    );
    expect(input).toEqual(before);
  });

  it.each(
    [
      DEFAULT_OPENING_CUSTOMER_DATA.periodMonthsParameter,
      DEFAULT_OPENING_CUSTOMER_DATA.agreementLeadDaysParameter,
      DEFAULT_OPENING_CUSTOMER_DATA.outsideHouseholds.countPerMarketParameter,
    ].flatMap((key) =>
      [
        { label: "missing checkRange", checkRange: undefined },
        { label: "null checkRange", checkRange: null },
        { label: "malformed checkRange", checkRange: "invalid-check-range" },
        { label: "missing ref", checkRange: {} },
        { label: "blank ref", checkRange: { ref: " \t " } },
        { label: "nonstring ref", checkRange: { ref: p("one") } },
      ].map(({ label, checkRange }) => ({ key, label, checkRange })),
    ),
  )("rejects a TUNABLE prior with $label: $key", ({ key, checkRange }) => {
    const input = fixture(),
      before = structuredClone(input);
    const parameters = {
      ...PARAMETERS,
      [key]: { ...PARAMETERS[key]!, checkRange } as unknown as Parameter,
    };
    expect(() =>
      buildOpeningCustomers(input, { ...visitorOptions(), parameters }),
    ).toThrow(`Tunable customer prior requires calibration reference: ${key}`);
    expect(input).toEqual(before);
  });

  it("preserves every original account, job and schedule and mutates no supplied object", () => {
    const input = fixture(),
      before = structuredClone(input);
    const result = buildOpeningCustomers(input, options());
    expect(input).toEqual(before);
    expect(result.input.jobs).toBe(input.jobs);
    expect(result.input.workCommitments).toBe(input.workCommitments);
    expect(result.input.households).toBe(input.households);
    for (const person of input.people) {
      const after = result.input.people.find((row) => row.id === person.id)!;
      expect(after.liquidMinor).toBe(person.liquidMinor);
      expect(after.livingCostDailyMinor).toBe(person.livingCostDailyMinor);
      expect(after.jobId).toBe(person.jobId);
    }
    for (const organization of input.organizations)
      expect(
        result.input.organizations.find((row) => row.id === organization.id)!
          .liquidMinor,
      ).toBe(organization.liquidMinor);
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
    expect(result.receipt.enrichedCashMinor).toBe(
      result.receipt.originalCashMinor,
    );
  });

  it("creates a positive source-specific salon route with saved prior agreement and real cash endpoints", () => {
    const result = buildOpeningCustomers(fixture(), options());
    const contract = householdTerms(result.input).find(
      (row) => row.kind === "household.customer.personal-care",
    )!;
    expect(contract.amountMinor).toBeGreaterThan(p("zero"));
    expect(contract.payeeId).toBe("salon");
    expect(contract.payerIds).toEqual(["customer"]);
    expect(
      contract.source.generatedHouseholdBasis
        ? DEFAULT_OPENING_CUSTOMER_DATA.householdServices.find(
            (row) => row.key === contract.source.generatedHouseholdBasis!.key,
          )!.citation
        : contract.source.citation,
    ).toContain("B4217");
    expect(contract.source.tag).toBe("ESTIMATED");
    expect(contract.source.generationPriorVintage).toContain("2024");
    expect(
      result.input.people
        .find((row) => row.id === "customer")!
        .pastFacts?.some(
          (row) =>
            row.kind === "household-service-agreement" &&
            row.facts?.serviceKey === "personal-care",
        ),
    ).toBe(true);
  });

  it("does not convert a general store into any pharmacy, gasoline seller or service provider", () => {
    const result = buildOpeningCustomers(fixture(), options());
    expect(
      result.input.finance!.contracts.some((row) => row.payeeId === "store"),
    ).toBe(false);
    expect(
      result.input.finance!.contracts.some((row) =>
        /drugs|gasoline|medical-supplies/.test(row.kind),
      ),
    ).toBe(false);
  });

  it("caps added household service plans by the original living-cost envelope after recorded terms", () => {
    const input = fixture();
    const assigned = Math.round(
      (input.people.find((row) => row.id === "customer")!.livingCostDailyMinor *
        p("daysPerMeanYear")) /
        p("monthsPerYear"),
    );
    const preserved: FinanceContractInput = {
      id: "original-household-food",
      householdId: "customer-household",
      payerIds: ["customer"],
      payeeId: "store",
      kind: "household.food",
      amountMinor: assigned - p("one"),
      dueAt: "2021-02-01",
      periodMonths: p("one"),
      accruesArrears: false,
      source,
    };
    const result = buildOpeningCustomers(
      { ...input, finance: { ...input.finance!, contracts: [preserved] } },
      options(),
    );
    expect(
      result.input.finance!.contracts.find((row) => row.id === preserved.id),
    ).toBe(preserved);
    expect(
      householdTerms(result.input).reduce(
        (total, row) => total + row.amountMinor / row.periodMonths,
        p("zero"),
      ),
    ).toBe(assigned);
    expect(
      result.receipt.householdBudgets.find(
        (row) => row.householdId === "customer-household",
      )!.plannedAddedServiceMonthlyMinor,
    ).toBe(p("one"));
  });

  it("preserves recorded service terms and does not bind a duplicate component", () => {
    const input = fixture();
    const original: FinanceContractInput = {
      id: "recorded-salon",
      householdId: "customer-household",
      payerIds: ["customer"],
      payeeId: "salon",
      kind: "household.customer.personal-care",
      amountMinor: p("minorPerDollar"),
      dueAt: "2021-02-01",
      periodMonths: p("one"),
      accruesArrears: false,
      source,
    };
    const result = buildOpeningCustomers(
      { ...input, finance: { ...input.finance!, contracts: [original] } },
      options(),
    );
    expect(
      householdTerms(result.input).filter((row) => row.kind === original.kind),
    ).toEqual([original]);
  });

  it("requires actual provider occupation or a dated recorded product/service scope", () => {
    const input = fixture();
    const noBarber = {
      ...input,
      jobs: input.jobs.filter((row) => row.organizationId !== "salon"),
    };
    const quiet = buildOpeningCustomers(noBarber, options());
    expect(
      householdTerms(quiet.input).some((row) => row.payeeId === "salon"),
    ).toBe(false);
    const recorded = buildOpeningCustomers(
      noBarber,
      options({
        providerRecords: [
          {
            id: "recorded-salon-provider-scope",
            organizationId: "salon",
            serviceKeys: ["personal-care"],
            source,
          },
        ],
      }),
    );
    expect(
      householdTerms(recorded.input).some((row) => row.payeeId === "salon"),
    ).toBe(true);
  });

  it.each([
    { label: "future", invalid: { ...source, asOf: "2021-02-01" } },
    { label: "blank citation", invalid: { ...source, citation: " \t " } },
  ])("rejects a $label job source used to qualify a product", ({ invalid }) => {
    const original = fixture();
    const input = {
      ...original,
      jobs: original.jobs.map((job) =>
        job.id === "job:salon" ? { ...job, source: invalid } : job,
      ),
    };
    const saved = structuredClone(input);
    expect(() => buildOpeningCustomers(input, options())).toThrow(
      "Customer record requires dated nonfuture provenance: job:salon",
    );
    expect(input).toEqual(saved);
  });

  it("links each actual qualifying job and its source to household, public and outside agreements", () => {
    const result = buildOpeningCustomers(fixture(), visitorOptions());
    for (const [kind, jobId] of [
      ["household-service-agreement", "job:salon"],
      ["public-service-agreement", "job:cleaner"],
      ["outside-visit-budget", "job:inn"],
    ] as const) {
      const agreement = result.receipt.evidence.find(
        (record) =>
          record.kind === kind && record.basisRecordIds.includes(jobId),
      )!;
      expect(agreement).toBeDefined();
      const qualifications = (
        JSON.parse(
          agreement.facts.providerQualifications!,
        ) as OpeningCustomerAgreementQualification[]
      ).map((row) => fullQualification(result, row));
      const qualification = qualifications.find((row) =>
        row.jobIds.includes(jobId),
      )!;
      expect(qualification.providerRecordIds).toEqual([]);
      expect(qualification.sources).toContainEqual(
        expect.objectContaining({
          recordId: jobId,
          kind: "job",
          source,
        }),
      );
      const plan = result.receipt.contractPlans.find(
        (row) => row.agreementId === agreement.id,
      )!;
      expect(fullPlanQualification(result, plan.providerQualification)).toEqual(
        qualification,
      );
    }
    const householdFact = result.input.people
      .find((person) => person.id === "customer")!
      .pastFacts!.find((fact) => fact.facts?.serviceKey === "personal-care")!;
    expect(JSON.parse(householdFact.facts!.basisRecordIds!)).toContain(
      "job:salon",
    );
    expect(
      qualificationText(result, householdFact.facts!.providerQualifications!),
    ).toContain(source.citation);
    const publicAgreement = JSON.parse(
      result.input.organizations.find((row) => row.id === "local-office")!
        .governmentFacts!["openingCustomers.agreement:fixture-place"]!,
    );
    expect(publicAgreement.basisRecordIds).toContain("job:cleaner");
    expect(
      (
        publicAgreement.providerQualifications as OpeningCustomerAgreementQualification[]
      ).map((row) => fullQualification(result, row)),
    ).toContainEqual(expect.objectContaining({ jobIds: ["job:cleaner"] }));
    const visit = result.receipt.evidence.find(
      (record) => record.kind === "outside-visit-budget",
    )!;
    expect(
      result.input.placeMetadata![`openingCustomers.evidence:${visit.id}`],
    ).toContain("job:inn");
    expect(result.receipt.providerRecords).toEqual([]);
  });

  it("does not treat unrelated future employment as product scope evidence", () => {
    const original = fixture();
    const input = {
      ...original,
      jobs: original.jobs.map((job) =>
        job.id === "job:lawyer"
          ? {
              ...job,
              occupationClassification: "occupation:retail-cashier",
              source: {
                ...source,
                asOf: "2021-02-01",
                citation: "Unrelated future job fixture.",
              },
            }
          : job,
      ),
    };
    const result = buildOpeningCustomers(input, options());
    expect(result.input.jobs).toBe(input.jobs);
    expect(
      result.receipt.contractPlans.some((plan) => plan.sellerId === "lawyer"),
    ).toBe(false);
    expect(
      result.receipt.contractPlans.some((plan) =>
        fullPlanQualification(
          result,
          plan.providerQualification,
        ).jobIds.includes("job:lawyer"),
      ),
    ).toBe(false);
    expect(
      result.receipt.contractPlans.some((plan) => plan.sellerId === "salon"),
    ).toBe(true);
  });

  it("saves only used explicit provider snapshots and links their sources through every relevant agreement and receipt", () => {
    const { input, supplied, used, unused } = recordedProviderFixture();
    const saved = structuredClone(input),
      result = buildOpeningCustomers(input, supplied);
    expect(input).toEqual(saved);
    expect(result.receipt.providerRecords).toEqual(
      [...used].sort((left, right) => left.id.localeCompare(right.id)),
    );
    for (const record of used) {
      expect(
        JSON.parse(
          result.input.placeMetadata![
            `openingCustomers.provider:${record.id}`
          ]!,
        ),
      ).toEqual(record);
      expect(result.receipt.newPlaceMetadataKeys).toContain(
        `openingCustomers.provider:${record.id}`,
      );
    }
    for (const record of unused) {
      expect(
        result.input.placeMetadata?.[`openingCustomers.provider:${record.id}`],
      ).toBeUndefined();
      expect(
        result.receipt.providerRecords.some((row) => row.id === record.id),
      ).toBe(false);
    }
    expect(
      Object.keys(result.input.placeMetadata!).filter((key) =>
        key.startsWith("openingCustomers.provider:"),
      ),
    ).toHaveLength(used.length);
    for (const record of used) {
      for (const plan of result.receipt.contractPlans.filter(
        (row) => row.sellerId === record.organizationId,
      )) {
        expect(
          fullPlanQualification(result, plan.providerQualification).jobIds,
        ).toEqual([]);
        expect(
          fullPlanQualification(result, plan.providerQualification)
            .providerRecordIds,
        ).toEqual([record.id]);
        expect(
          fullPlanQualification(result, plan.providerQualification).sources,
        ).toEqual([
          {
            recordId: record.id,
            kind: "recorded-provider",
            source: record.source,
          },
        ]);
        const agreement = result.receipt.evidence.find(
          (row) => row.id === plan.agreementId,
        )!;
        expect(agreement.basisRecordIds).toContain(record.id);
        expect(
          JSON.parse(agreement.facts.providerQualifications!),
        ).toContainEqual(plan.providerQualification);
      }
    }
    const householdFact = result.input.people
      .find((person) => person.id === "customer")!
      .pastFacts!.find((fact) => fact.facts?.serviceKey === "personal-care")!;
    expect(
      qualificationText(result, householdFact.facts!.providerQualifications!),
    ).toContain("recorded-salon-scope");
    expect(
      qualificationText(result, householdFact.facts!.providerQualifications!),
    ).toContain(
      used.find((row) => row.organizationId === "salon")!.source.citation,
    );
    const publicAgreement = JSON.parse(
      result.input.organizations.find((row) => row.id === "local-office")!
        .governmentFacts!["openingCustomers.agreement:fixture-place"]!,
    );
    expect(publicAgreement.basisRecordIds).toContain("recorded-cleaner-scope");
    expect(
      (
        publicAgreement.providerQualifications as OpeningCustomerAgreementQualification[]
      ).map((row) => fullQualification(result, row)),
    ).toContainEqual(
      expect.objectContaining({
        providerRecordIds: ["recorded-cleaner-scope"],
      }),
    );
    const visit = result.receipt.evidence.find(
      (record) => record.kind === "outside-visit-budget",
    )!;
    const savedVisit = JSON.parse(
      result.input.placeMetadata![`openingCustomers.evidence:${visit.id}`]!,
    );
    expect(savedVisit.basisRecordIds).toContain("recorded-inn-scope");
    expect(
      qualificationText(result, savedVisit.facts.providerQualifications),
    ).toContain(
      used.find((row) => row.organizationId === "inn")!.source.citation,
    );
    expect(result.input.jobs).toBe(input.jobs);
    expect(result.input.workCommitments).toBe(input.workCommitments);
    for (const organization of input.organizations)
      expect(
        result.input.organizations.find((row) => row.id === organization.id)!
          .liquidMinor,
      ).toBe(organization.liquidMinor);
  });

  it("reuses saved used-provider evidence without transient options and adds no duplicate records", () => {
    const { input, supplied } = recordedProviderFixture();
    const first = buildOpeningCustomers(input, supplied);
    const repeated = buildOpeningCustomers(first.input, supplied);
    const savedOnly = buildOpeningCustomers(first.input, {
      ...supplied,
      providerRecords: undefined,
    });
    for (const rebuilt of [repeated, savedOnly]) {
      expect(rebuilt.input).toEqual(first.input);
      expect(rebuilt.receipt.newPlaceMetadataKeys).toEqual([]);
      expect(rebuilt.receipt.newPastFactIds).toEqual([]);
      expect(rebuilt.receipt.newContractIds).toEqual([]);
      expect(rebuilt.receipt.newStocks).toEqual([]);
      expect(rebuilt.receipt.evidence).toEqual([]);
      expect(rebuilt.receipt.providerRecords).toEqual(
        first.receipt.providerRecords,
      );
      expect(rebuilt.receipt.contractPlans).toEqual(
        first.receipt.contractPlans,
      );
    }
  });

  it("rejects same-ID changed provider content, metadata identity and saved source lineage", () => {
    const { input, supplied, used } = recordedProviderFixture();
    const first = buildOpeningCustomers(input, supplied);
    const record = used.find((row) => row.organizationId === "salon")!;
    for (const changed of [
      { ...record, organizationId: "cleaner" },
      { ...record, serviceKeys: ["housekeeping"] },
      {
        ...record,
        source: {
          ...record.source,
          citation: "Changed supplied product provenance.",
        },
      },
    ])
      expect(() =>
        buildOpeningCustomers(first.input, {
          ...supplied,
          providerRecords: [changed],
        }),
      ).toThrow("Conflicting opening customer provider record");
    const key = `openingCustomers.provider:${record.id}`;
    expect(() =>
      buildOpeningCustomers(
        {
          ...first.input,
          placeMetadata: {
            ...first.input.placeMetadata,
            [key]: JSON.stringify({
              ...record,
              id: "changed-saved-provider-id",
            }),
          },
        },
        { ...supplied, providerRecords: undefined },
      ),
    ).toThrow("Conflicting saved opening customer provider ID");
    expect(() =>
      buildOpeningCustomers(
        {
          ...first.input,
          placeMetadata: {
            ...first.input.placeMetadata,
            [key]: first.input.placeMetadata![key]!.replace(
              record.source.citation,
              "Changed saved product provenance.",
            ),
          },
        },
        { ...supplied, providerRecords: undefined },
      ),
    ).toThrow("Conflicting opening customer past fact");
  });

  it("does not size customer purchases from a seller payroll, forecast, deficit or cash balance", () => {
    const input = fixture(),
      normal = buildOpeningCustomers(input, options());
    const stressed = {
      ...input,
      organizations: input.organizations.map((row) => ({
        ...row,
        liquidMinor: p("zero"),
      })),
      jobs: input.jobs.map((row) => ({
        ...row,
        wageDailyMinor: row.wageDailyMinor * p("monthsPerYear"),
      })),
      finance: {
        ...input.finance!,
        businesses: [
          {
            organizationId: "salon",
            kindId: "personal-care",
            annualPayrollMinor: p("minorPerDollar") * p("daysPerMeanYear"),
            annualDemandMinor:
              p("minorPerDollar") * p("daysPerMeanYear") * p("monthsPerYear"),
            annualOtherCostsMinor: p("zero"),
            openingTownIncomeMinor: p("zero"),
            capacityMinor: p("one"),
            price: p("one"),
            costContractIds: [],
            source,
          },
        ],
      },
    };
    const result = buildOpeningCustomers(stressed, options());
    expect(
      result.receipt.contractPlans.map(
        ({ contractId, monthlyBudgetMinor }) => ({
          contractId,
          monthlyBudgetMinor,
        }),
      ),
    ).toEqual(
      normal.receipt.contractPlans.map(
        ({ contractId, monthlyBudgetMinor }) => ({
          contractId,
          monthlyBudgetMinor,
        }),
      ),
    );
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
  });

  it("records modeled public authority, annualized appropriation rate and custodial terms without adding public cash", () => {
    const input = fixture(),
      result = buildOpeningCustomers(input, options());
    const contract = result.input.finance!.contracts.find(
      (row) => row.kind === "public.customer.custodial-services",
    )!;
    expect(contract.amountMinor).toBeGreaterThan(p("zero"));
    expect(contract.payerIds).toEqual(["local-office"]);
    expect(contract.payeeId).toBe("cleaner");
    expect(contract.salesReceipt).toBe(true);
    expect(contract.salesReceiptBudget).toBe(false);
    expect(contract.settlementPhaseId).toBe("business-procurement");
    expect(
      result.receipt.evidence.some(
        (row) => row.kind === "public-procurement-authority",
      ),
    ).toBe(true);
    expect(
      result.receipt.evidence.some(
        (row) =>
          row.kind === "public-appropriation" &&
          row.facts.endsAt === contract.endsAt,
      ),
    ).toBe(true);
    expect(
      result.input.organizations.find((row) => row.id === "local-office")!
        .governmentFacts?.["openingCustomers.authority:fixture-place"],
    ).toContain("bounded-opening-custodial-procurement");
    expect(result.receipt.newStocks).toEqual([]);
    expect(
      result.input.organizations.find((row) => row.id === "local-office")!
        .liquidMinor,
    ).toBe(
      input.organizations.find((row) => row.id === "local-office")!.liquidMinor,
    );
  });

  it("does not infer a public owner's identity from a local-office classification", () => {
    const input = fixture();
    const result = buildOpeningCustomers(
      {
        ...input,
        organizations: input.organizations.map((row) =>
          row.id === "local-office"
            ? { ...row, governmentFacts: undefined }
            : row,
        ),
      },
      options(),
    );
    expect(
      result.input.finance!.contracts.some(
        (row) => row.kind === "public.customer.custodial-services",
      ),
    ).toBe(false);
    expect(result.receipt.gaps).toContain(
      "opening-customers:public-office-needs-actual-owner-identity:local-office",
    );
  });

  it("admits one zero-stock outside identity and CEX visitor budget at distinct recorded geography", () => {
    const input = fixture(),
      result = buildOpeningCustomers(input, visitorOptions());
    expect(result.receipt.newStocks).toEqual([]);
    const owner = result.input.organizations.find(
      (row) => row.id === result.receipt.newOrganizationIds[p("zero")],
    )!;
    expect(owner.liquidMinor).toBe(p("zero"));
    expect(owner).not.toHaveProperty("stockSourceRecordId");
    expect(result.receipt.addedCashMinor).toBe(owner.liquidMinor);
    expect(
      result.receipt.enrichedCashMinor - result.receipt.originalCashMinor,
    ).toBe(owner.liquidMinor);
    const contract = result.input.finance!.contracts.find(
      (row) => row.kind === "outside.customer.visitor-lodging",
    )!;
    expect(contract.payerIds).toEqual([owner.id]);
    expect(contract.payeeId).toBe("inn");
    expect(contract.amountMinor).toBe(
      Math.round(
        (p("openingCustomerOutsideLodgingAnnualUsd") * p("minorPerDollar")) /
          p("monthsPerYear"),
      ),
    );
    expect(
      result.receipt.evidence.some(
        (row) =>
          row.kind === "outside-visit-budget" &&
          row.facts.recurringIncomeCredit,
      ),
    ).toBe(false);
    expect(
      result.input.placeMetadata?.[`openingCustomers.stock:${owner.id}`],
    ).toBeUndefined();
    expect(
      result.input.placeMetadata?.[
        `openingCustomers.evidence:${owner.id}:identity`
      ],
    ).toContain("one-outside-family");
    expect(
      result.input.placeMetadata?.[
        `openingCustomers.evidence:${owner.id}:visit-budget`
      ],
    ).toContain(contract.id);
  });

  it("rejects arbitrary aliases and reordered basis records for the same outside geographic market", () => {
    const input = fixture(),
      saved = structuredClone(input);
    const supplied = visitorOptions();
    const market = {
      ...supplied.outsideMarkets![p("zero")]!,
      basisRecordIds: [
        "fixture-geographic-visit-record",
        "fixture-county-part",
      ],
    };
    const alias = {
      ...market,
      id: `${market.id}:alias`,
      basisRecordIds: [...market.basisRecordIds].reverse(),
    };
    expect(() =>
      buildOpeningCustomers(input, {
        ...supplied,
        outsideMarkets: [market, alias],
      }),
    ).toThrow(/Aliased outside customer market/);
    expect(input).toEqual(saved);
    const exactRepeat = buildOpeningCustomers(input, {
      ...supplied,
      outsideMarkets: [market, market],
    });
    expect(exactRepeat.receipt.newStocks).toEqual([]);
    expect(exactRepeat.receipt.newOrganizationIds).toHaveLength(p("one"));
  });

  it("preserves the saved outside account and rejects relabeling its independently owned market", () => {
    const supplied = visitorOptions();
    const market = supplied.outsideMarkets![p("zero")]!;
    const first = buildOpeningCustomers(fixture(), supplied);
    const before = structuredClone(first.input);
    expect(() =>
      buildOpeningCustomers(first.input, {
        ...supplied,
        outsideMarkets: [{ ...market, id: `${market.id}:alias` }],
      }),
    ).toThrow(
      /^Conflicting opening customer metadata: openingCustomers\.outsideBudget:/,
    );
    const restored = buildOpeningCustomers(first.input, options());
    expect(restored.input).toEqual(first.input);
    expect(restored.receipt.newStocks).toEqual([]);
    expect(restored.receipt.newOrganizationIds).toEqual([]);
    expect(restored.receipt.addedCashMinor).toBe(p("zero"));
    expect(restored.receipt.newContractIds).toEqual([]);
    expect(first.input).toEqual(before);
  });

  it("rejects outside household identity overlap with already admitted resident places", () => {
    const input = fixture(),
      supplied = visitorOptions();
    const market = supplied.outsideMarkets![p("zero")]!;
    const result = buildOpeningCustomers(
      {
        ...input,
        people: [
          ...input.people,
          {
            ...input.people[p("zero")]!,
            id: "outside-resident",
            householdId: "outside-resident-household",
            placeId: market.originPlaceId,
            livingCostDailyMinor: p("zero"),
          },
        ],
        households: [
          ...input.households,
          {
            id: "outside-resident-household",
            placeId: market.originPlaceId,
            memberIds: ["outside-resident"],
            source,
          },
        ],
      },
      supplied,
    );
    expect(result.receipt.newStocks).toEqual([]);
    expect(result.receipt.gaps).toContain(
      `opening-customers:outside-owner-would-overlap-admitted-residence:${market.id}`,
    );
  });

  it("is deterministic and idempotent, including public facts and newly admitted zero-stock outside identities", () => {
    const input = fixture(),
      supplied = visitorOptions();
    const first = buildOpeningCustomers(input, supplied),
      same = buildOpeningCustomers(input, supplied);
    expect(same).toEqual(first);
    const rebuilt = buildOpeningCustomers(first.input, supplied);
    expect(rebuilt.input).toEqual(first.input);
    expect(rebuilt.receipt.newStocks).toEqual([]);
    expect(rebuilt.receipt.newPastFactIds).toEqual([]);
    expect(rebuilt.receipt.newPlaceMetadataKeys).toEqual([]);
    expect(rebuilt.receipt.newContractIds).toEqual([]);
    expect(rebuilt.receipt.evidence).toEqual([]);
    expect(rebuilt.receipt.addedCashMinor).toBe(p("zero"));
  });

  it("rejects same-ID changed contract or outside account content", () => {
    const supplied = visitorOptions(),
      result = buildOpeningCustomers(fixture(), supplied);
    const firstId = result.receipt.newContractIds[p("zero")]!;
    const contractConflict = {
      ...result.input,
      finance: {
        ...result.input.finance!,
        contracts: result.input.finance!.contracts.map((row) =>
          row.id === firstId
            ? { ...row, amountMinor: row.amountMinor + p("one") }
            : row,
        ),
      },
    };
    expect(() => buildOpeningCustomers(contractConflict, supplied)).toThrow(
      "Conflicting opening customer contract",
    );
    const stockId = result.receipt.newOrganizationIds[p("zero")]!;
    const accountConflict = {
      ...result.input,
      organizations: result.input.organizations.map((row) =>
        row.id === stockId
          ? { ...row, liquidMinor: row.liquidMinor + p("one") }
          : row,
      ),
    };
    expect(() => buildOpeningCustomers(accountConflict, supplied)).toThrow(
      /Outside identity must resolve actual zero-stock flow owner|Conflicting outside customer account/,
    );
  });

  it("keeps modeled due dates without source-year expiry, arrears, capital or forecast credit", () => {
    const result = buildOpeningCustomers(fixture(), visitorOptions());
    for (const contract of result.input.finance!.contracts) {
      expect(contract.dueAt).toBe("2021-02-01");
      expect(contract.endsAt).toBeUndefined();
      expect(contract.accruesArrears).toBe(false);
      expect(contract.salesReceipt).toBe(true);
      expect(contract.salesReceiptBudget).toBe(false);
      expect(contract.marketAdjusted).toBe(false);
    }
    expect(result.receipt).not.toHaveProperty("receipts");
    expect(result.receipt).not.toHaveProperty("runtimePayments");
    expect(result.input.finance!.facilities).toEqual([]);
  });

  it("reads every settlement phase from customer DATA", () => {
    const phases = {
      householdPurchases: "fixture-household-phase",
      publicProcurement: "fixture-public-phase",
      outsidePurchases: "fixture-outside-phase",
    };
    const result = buildOpeningCustomers(fixture(), {
      ...visitorOptions(),
      data: {
        ...DEFAULT_OPENING_CUSTOMER_DATA,
        settlementPhaseIds: phases,
      },
    });
    for (const contract of result.input.finance!.contracts) {
      const expected = contract.kind.startsWith("outside.")
        ? phases.outsidePurchases
        : contract.kind.startsWith("public.")
          ? phases.publicProcurement
          : phases.householdPurchases;
      expect(contract.settlementPhaseId).toBe(expected);
    }
  });

  it("rejects changed saved household, public and outside evidence", () => {
    const supplied = visitorOptions(),
      result = buildOpeningCustomers(fixture(), supplied);
    const householdConflict = {
      ...result.input,
      people: result.input.people.map((person) =>
        person.id === "customer"
          ? {
              ...person,
              pastFacts: person.pastFacts!.map((fact, position) =>
                position === p("zero")
                  ? { ...fact, summary: "Changed prior agreement" }
                  : fact,
              ),
            }
          : person,
      ),
    };
    expect(() => buildOpeningCustomers(householdConflict, supplied)).toThrow(
      "Conflicting opening customer past fact",
    );
    const publicConflict = {
      ...result.input,
      organizations: result.input.organizations.map((organization) =>
        organization.id === "local-office"
          ? {
              ...organization,
              governmentFacts: {
                ...organization.governmentFacts,
                "openingCustomers.authority:fixture-place":
                  "Changed prior authority",
              },
            }
          : organization,
      ),
    };
    expect(() => buildOpeningCustomers(publicConflict, supplied)).toThrow(
      "Conflicting public opening customer fact",
    );
    const stockId = result.receipt.newOrganizationIds[p("zero")]!;
    const outsideConflict = {
      ...result.input,
      placeMetadata: {
        ...result.input.placeMetadata,
        [`openingCustomers.evidence:${stockId}:identity`]:
          "Changed outside family identity",
      },
    };
    expect(() => buildOpeningCustomers(outsideConflict, supplied)).toThrow(
      "Invalid saved opening customer metadata",
    );
  });

  it.each(lifePlaceStateIdentities())(
    "uses the same household/public rule for $name ($jurisdictionKey)",
    (identity) => {
      const result = buildOpeningCustomers(
        fixture(),
        options({
          geography: () => ({
            jurisdictionKey: identity.jurisdictionKey,
            region: "national",
            source,
            outsideMarkets: [],
          }),
        }),
      );
      expect(
        householdTerms(result.input).some(
          (row) =>
            row.kind === "household.customer.personal-care" &&
            row.amountMinor > p("zero"),
        ),
      ).toBe(true);
      expect(result.receipt.addedCashMinor).toBe(p("zero"));
      expect(result.receipt.stopgapIds).toContain(
        "SG-P8-opening-customer-generation",
      );
    },
  );
});

/** UNEXECUTED: actual historical identity inside controlled opening term fixtures. */
function historicalCountyCustomerFixture() {
  const original = fixture();
  const locality = lifePlaceByKey("4840342")!;
  const unit = governmentUnit("gus2025:194116")!;
  const countyPlaceId = governmentUnitJurisdictionId(unit);
  const worldId = createStableId(
    "world",
    "bounded-public-customer-county-fixture",
  );
  const stableKey = `local-government:${unit.id}`;
  const countyId = createStableId("organization", `${worldId}:${stableKey}`);
  const owner = openingHistoricalCountyOwnerFacts({
    organizationId: countyId,
    organizationStableKey: stableKey,
    worldId,
    name: governmentUnitRecordedName(unit),
    classification: "service:county-government",
    placeId: countyPlaceId,
    startedAt: original.startedAt,
  });
  const office = original.organizations.find(
    (row) => row.id === "local-office",
  )!;
  const county: OrganizationInput = {
    ...office,
    id: countyId,
    name: governmentUnitRecordedName(unit),
    classification: "service:county-government",
    placeId: countyPlaceId,
    governmentFacts: owner.governmentFacts,
  };
  const department: OrganizationInput = {
    ...office,
    id: "authored-public-works",
    name: "La Homa Public Works Department",
    placeId: locality.context.jurisdiction.id,
    governmentFacts: undefined,
  };
  const input: CoreInput = {
    ...original,
    people: original.people.map((person) => ({
      ...person,
      placeId: locality.context.jurisdiction.id,
      countyId: countyPlaceId,
    })),
    households: original.households.map((household) => ({
      ...household,
      placeId: locality.context.jurisdiction.id,
    })),
    organizations: [
      ...original.organizations
        .filter((row) => row.id !== "local-office")
        .map((row) => ({ ...row, placeId: locality.context.jurisdiction.id })),
      county,
      department,
    ],
  };
  return { input, county, department, locality };
}

describe("historically observed county customer adapter fixtures", () => {
  it("binds the actual county account across the recorded CDP relation with no new money or department owner", () => {
    const { input, county, department } = historicalCountyCustomerFixture();
    const before = structuredClone(input);
    const result = buildOpeningCustomers(input, options());
    const contract = result.input.finance!.contracts.find(
      (row) => row.kind === "public.customer.custodial-services",
    )!;
    expect(contract.payerIds).toEqual([county.id]);
    expect(contract.payeeId).toBe("cleaner");
    expect(contract.amountMinor).toBeGreaterThan(p("zero"));
    expect(
      result.receipt.publicBudgets[p("zero")]!.ownerCoverage![p("zero")]!
        .identitySource.asOf,
    ).toBe("2017-06-30");
    expect(
      result.receipt.publicBudgets[p("zero")]!.ownerCoverage![p("zero")]!
        .basisRecordIds,
    ).toContain("census-2020-place-county:4840342:48215");
    expect(
      result.input.organizations.find((row) => row.id === department.id)!
        .governmentFacts,
    ).toBeUndefined();
    expect(result.receipt.gaps).toContain(
      `opening-customers:public-office-needs-actual-owner-identity:${department.id}`,
    );
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
    expect(result.receipt.newStocks).toEqual([]);
    expect(result.input.jobs).toEqual(before.jobs);
    expect(result.input.households).toEqual(before.households);
    expect(result.input.workCommitments).toEqual(before.workCommitments);
    expect(
      result.input.organizations.map(({ id, liquidMinor, source }) => ({
        id,
        liquidMinor,
        source,
      })),
    ).toEqual(
      before.organizations.map(({ id, liquidMinor, source }) => ({
        id,
        liquidMinor,
        source,
      })),
    );
    expect(
      result.input.people.map(
        ({ id, householdId, jobId, liquidMinor, source }) => ({
          id,
          householdId,
          jobId,
          liquidMinor,
          source,
        }),
      ),
    ).toEqual(
      before.people.map(({ id, householdId, jobId, liquidMinor, source }) => ({
        id,
        householdId,
        jobId,
        liquidMinor,
        source,
      })),
    );
    expect(input).toEqual(before);
  });

  it("does not repair old or incomplete county inputs inside the customer builder", () => {
    const { input, county } = historicalCountyCustomerFixture();
    const incomplete: CoreInput = {
      ...input,
      organizations: input.organizations.map((row) =>
        row.id === county.id
          ? {
              ...row,
              governmentFacts: {
                governmentKind: "local-government",
                governmentKey: "gus2025:194116",
                governmentJurisdictionId: row.placeId,
              },
            }
          : row,
      ),
    };
    const before = structuredClone(incomplete);
    const result = buildOpeningCustomers(incomplete, options());
    expect(
      result.input.finance!.contracts.some(
        (row) => row.kind === "public.customer.custodial-services",
      ),
    ).toBe(false);
    expect(result.receipt.gaps).toContain(
      `opening-public-owner:county-purchase-identity-unverified:${county.id}`,
    );
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
    expect(result.receipt.newStocks).toEqual([]);
    expect(incomplete).toEqual(before);
  });

  it("leaves the share for residents without verified county context unbound", () => {
    const { input, locality } = historicalCountyCustomerFixture();
    const partial: CoreInput = {
      ...input,
      people: input.people.map((person, index) =>
        index === p("zero") ? { ...person, countyId: undefined } : person,
      ),
    };
    const result = buildOpeningCustomers(partial, options());
    const budget = result.receipt.publicBudgets[p("zero")]!;
    expect(budget.originalRepresentedResidentCount).toBe(input.people.length);
    expect(budget.coveredOriginalResidentCount).toBe(
      input.people.length - p("one"),
    );
    expect(budget.sourceUnverifiedResidentCount).toBe(p("one"));
    expect(budget.boundMonthlyMinor).toBeLessThan(
      budget.monthlyCustodialPoolMinor,
    );
    expect(result.receipt.gaps).toContain(
      `opening-customers:public-owner-coverage-partly-unverified:${locality.context.jurisdiction.id}`,
    );
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
    expect(result.receipt.newStocks).toEqual([]);
    expect(result.input.jobs).toEqual(partial.jobs);
    expect(result.input.households).toEqual(partial.households);
  });

  it("rejects designation of the separate department as the county's actual buyer account", () => {
    const { input, department } = historicalCountyCustomerFixture();
    expect(() =>
      buildOpeningCustomers(
        input,
        options({
          publicBuyerIdByGovernmentKey: { "gus2025:194116": department.id },
        }),
      ),
    ).toThrow(
      "Public customer account designation does not match owner: gus2025:194116",
    );
  });
});

/** Source-only controlled fixtures: no generated-world or runtime pass is implied. */
function twoVisitorEdgeFixture() {
  const original = fixture();
  const firstMarket = visitorOptions().outsideMarkets![p("zero")]!;
  const secondPlaceId = "fixture-second-destination";
  const worker: PersonInput = {
    ...original.people.find((row) => row.id === "worker:inn")!,
    id: "worker:second-inn",
    placeId: secondPlaceId,
    householdId: "household:second-inn",
    jobId: "job:second-inn",
  };
  const job = {
    ...original.jobs.find((row) => row.id === "job:inn")!,
    id: worker.jobId!,
    personId: worker.id,
    organizationId: "second-inn",
  };
  const input: CoreInput = {
    ...original,
    people: [...original.people, worker],
    households: [
      ...original.households,
      {
        id: worker.householdId,
        placeId: worker.placeId,
        memberIds: [worker.id],
        source,
      },
    ],
    jobs: [...original.jobs, job],
    organizations: [
      ...original.organizations,
      {
        ...original.organizations.find((row) => row.id === "inn")!,
        id: job.organizationId,
        placeId: secondPlaceId,
        name: "Named second recorded inn",
      },
    ],
  };
  const secondMarket = {
    ...firstMarket,
    id: "recorded-fixture-second-visit-market",
    destinationPlaceId: secondPlaceId,
    basisRecordIds: ["fixture-second-geographic-visit-record"],
  };
  const owner: OrganizationInput = {
    id: "actual-canonical-outside-family",
    placeId: firstMarket.originPlaceId,
    name: "Recorded outside household",
    kind: "outside-customer-household",
    classification: "customer:outside-household",
    liquidMinor: p("zero"),
    outsideFlow: source,
    source,
  };
  const identity: OpeningCustomerOutsideBuyerIdentity = {
    organization: owner,
    identity: {
      id: "actual-canonical-outside-family-identity",
      kind: "outside-household-identity",
      occurredAt: at,
      subjectIds: [owner.id],
      counterpartyIds: [],
      placeId: owner.placeId,
      basisRecordIds: ["fixture-independent-canonical-household-record"],
      facts: {
        economicUnit: "one-outside-family",
        identityStatus: "supplied-canonical-identity",
      },
      source: owner.source,
    },
  };
  return { input, firstMarket, secondMarket, owner, identity };
}

describe("zero-stock public/visitor producer source fixtures", () => {
  it("persists zero-share edges of one canonical owner envelope without restarting their budget on rebuild", () => {
    const { input, firstMarket, secondMarket, owner, identity } =
      twoVisitorEdgeFixture();
    const key = "openingCustomerOutsideLodgingAnnualUsd";
    const parameters = {
      ...PARAMETERS,
      [key]: {
        ...PARAMETERS[key]!,
        value: p("monthsPerYear") / p("minorPerDollar"),
      },
    };
    const first = buildOpeningCustomers(
      input,
      options({
        parameters,
        outsideMarkets: [firstMarket, secondMarket],
        outsideBuyerIdentityByMarketId: {
          [firstMarket.id]: identity,
          [secondMarket.id]: identity,
        },
      }),
    );
    const envelope = JSON.parse(
      first.input.placeMetadata![`openingCustomers.outsideBudget:${owner.id}`]!,
    );
    expect(envelope.monthlyBudgetMinor).toBe(p("one"));
    expect(Object.values(envelope.marketMonthlyAmountsMinor).sort()).toEqual([
      p("zero"),
      p("one"),
    ]);
    for (const market of [firstMarket, secondMarket]) {
      expect(
        JSON.parse(
          first.input.placeMetadata![`openingCustomers.market:${market.id}`]!,
        ),
      ).toEqual(market);
      expect(
        JSON.parse(
          first.input.placeMetadata![
            `openingCustomers.marketBuyer:${market.id}`
          ]!,
        ).ownerId,
      ).toBe(owner.id);
    }
    expect(
      first.input.finance!.contracts.filter(
        (row) => row.kind === "outside.customer.visitor-lodging",
      ),
    ).toHaveLength(p("one"));
    const rebuilt = buildOpeningCustomers(first.input, options({ parameters }));
    expect(rebuilt.input).toEqual(first.input);
    expect(rebuilt.receipt.newOrganizationIds).toEqual([]);
    expect(rebuilt.receipt.newContractIds).toEqual([]);
    expect(rebuilt.receipt.addedCashMinor).toBe(p("zero"));
  });

  it("leaves the audited unsupported product classes as named gaps without assigning buyers or amounts", () => {
    const original = fixture();
    const unsupported = Object.keys(
      DEFAULT_OPENING_CUSTOMER_DATA.unsupportedExternalDemandByClassification,
    ).map((classification) => ({
      id: `unqualified:${classification}`,
      placeId: "fixture-place",
      name: "Controlled unqualified product fixture",
      kind: "employer",
      classification,
      liquidMinor: p("zero"),
      source,
    }));
    const result = buildOpeningCustomers(
      {
        ...original,
        organizations: [...original.organizations, ...unsupported],
      },
      visitorOptions(),
    );
    for (const row of unsupported) {
      expect(
        result.receipt.contractPlans.some((plan) => plan.sellerId === row.id),
      ).toBe(false);
      expect(result.receipt.gaps).toContain(
        `opening-customers:missing-source-owned-product-buyer-price-qualification:${row.id}:${row.classification}:SG-P8-outside-product-demand-crosswalk`,
      );
      expect(
        result.input.organizations.find(
          (organization) => organization.id === row.id,
        )!.liquidMinor,
      ).toBe(p("zero"));
    }
  });

  it("preserves explicitly linked supplied visitor terms and counts their original cadence against one owner envelope", () => {
    const {
      input: original,
      firstMarket,
      secondMarket,
      owner,
      identity,
    } = twoVisitorEdgeFixture();
    const actual: FinanceContractInput = {
      id: "actual-supplied-visit-contract",
      payerIds: [owner.id],
      payeeId: "inn",
      kind: "outside.customer.visitor-lodging",
      amountMinor: p("one"),
      dueAt: "2021-01-11",
      endsAt: "2025-01-11",
      periodMonths: p("monthsPerYear"),
      accruesArrears: false,
      salesReceipt: true,
      externalInflow: {
        kind: "external.customer.visitor-lodging",
        ownerId: owner.id,
        identityRecordId: identity.identity.id,
        visitAgreementRecordId: "actual-supplied-visit-agreement",
        marketId: firstMarket.id,
        source,
      },
      source,
    };
    const input: CoreInput = {
      ...original,
      organizations: [...original.organizations, owner],
      finance: { ...original.finance!, contracts: [actual] },
    };
    const first = buildOpeningCustomers(
      input,
      options({
        outsideMarkets: [firstMarket, secondMarket],
        outsideBuyerIdentityByMarketId: {
          [firstMarket.id]: identity,
          [secondMarket.id]: identity,
        },
      }),
    );
    expect(
      first.input.finance!.contracts.find((row) => row.id === actual.id),
    ).toBe(actual);
    expect(first.receipt.newOrganizationIds).toEqual([]);
    expect(first.receipt.gaps).toContain(
      `opening-customers:preserved-recorded-outside-visitor-terms:${firstMarket.id}`,
    );
    const envelope = JSON.parse(
      first.input.placeMetadata![`openingCustomers.outsideBudget:${owner.id}`]!,
    );
    expect(envelope.preservedContractIds).toEqual([actual.id]);
    expect(envelope.preservedContractSourceMap[actual.id]).toEqual(
      actual.source,
    );
    expect(envelope.preservedContractTermsById[actual.id]).toEqual({
      payerIds: [...actual.payerIds],
      payeeId: actual.payeeId,
      kind: actual.kind,
      amountMinor: actual.amountMinor,
      firstDueAt: actual.dueAt,
      endsAt: actual.endsAt,
      periodMonths: actual.periodMonths,
      settlementPhaseId: "standing-services",
    });
    expect(envelope.preservedMonthlyTermsMinor).toBe(
      actual.amountMinor / actual.periodMonths,
    );
    expect(envelope.marketIds).toEqual([secondMarket.id]);
    expect(
      envelope.marketMonthlyAmountsMinor[secondMarket.id] +
        envelope.preservedMonthlyTermsMinor,
    ).toBeLessThanOrEqual(envelope.monthlyBudgetMinor);
    const restored = buildOpeningCustomers(first.input, options());
    expect(restored.input).toEqual(first.input);
    expect(restored.receipt.newContractIds).toEqual([]);
    expect(
      first.input.finance!.contracts.find((row) => row.id === actual.id)!
        .householdPurchaseCalendar,
    ).toBeUndefined();
  });

  it("omits recurring household markers on an explicit own agreement-date witness", () => {
    const original = fixture();
    const reference = buildOpeningCustomers(original, options());
    const plan = reference.receipt.contractPlans.find(
      (row) => row.serviceKey === "personal-care",
    )!;
    const actualDate = {
      id: plan.agreementId,
      dueAt: "2021-01-17",
      basisRecordIds: ["actual-component-agreement-date"],
      source,
    };
    const first = buildOpeningCustomers(
      original,
      options({ agreementDatesById: { [actualDate.id]: actualDate } }),
    );
    const contract = first.input.finance!.contracts.find(
      (row) => row.id === plan.contractId,
    )!;
    expect(contract.dueAt).toBe(actualDate.dueAt);
    expect(contract.householdPurchaseCalendar).toBeUndefined();
    expect(
      first.input
        .finance!.contracts.filter(
          (row) => row.householdId && row.id !== contract.id,
        )
        .every(
          (row) =>
            row.householdPurchaseCalendar?.householdId === row.householdId,
        ),
    ).toBe(true);
    expect(buildOpeningCustomers(first.input, options()).input).toEqual(
      first.input,
    );
  });

  it("never reads a legacy SCF stock parameter for an outside owner", () => {
    const input = fixture(),
      supplied = visitorOptions();
    const first = buildOpeningCustomers(input, supplied);
    const key = "openingCustomerOutsideHouseholdLiquidUsd";
    const changed = buildOpeningCustomers(input, {
      ...supplied,
      parameters: {
        ...PARAMETERS,
        [key]: { ...PARAMETERS[key]!, value: -p("one") },
      },
    });
    expect(changed).toEqual(first);
    expect(first.receipt.parameterRefs).not.toContain(key);
    expect(first.receipt.newStocks).toEqual([]);
    expect(first.receipt.addedCashMinor).toBe(p("zero"));
    expect(first.receipt.enrichedCashMinor).toBe(
      first.receipt.originalCashMinor,
    );
  });

  it("reuses one explicitly supplied actual identity across destination edges and a saved-only rebuild", () => {
    const { input, firstMarket, secondMarket, owner, identity } =
      twoVisitorEdgeFixture();
    const before = structuredClone(input);
    const first = buildOpeningCustomers(
      input,
      options({
        outsideMarkets: [firstMarket, secondMarket],
        outsideBuyerIdentityByMarketId: {
          [firstMarket.id]: identity,
          [secondMarket.id]: identity,
        },
      }),
    );
    expect(first.receipt.newOrganizationIds).toEqual([owner.id]);
    expect(first.receipt.newStocks).toEqual([]);
    expect(first.receipt.addedCashMinor).toBe(p("zero"));
    const outside = first.input.finance!.contracts.filter(
      (row) => row.kind === "outside.customer.visitor-lodging",
    );
    expect(outside).toHaveLength(p("one") + p("one"));
    expect(new Set(outside.flatMap((row) => row.payerIds))).toEqual(
      new Set([owner.id]),
    );
    expect(
      outside.reduce(
        (sum, row) => sum + row.amountMinor / row.periodMonths,
        p("zero"),
      ),
    ).toBe(
      Math.round(
        (p("openingCustomerOutsideLodgingAnnualUsd") * p("minorPerDollar")) /
          p("monthsPerYear"),
      ),
    );
    const envelope = JSON.parse(
      first.input.placeMetadata![`openingCustomers.outsideBudget:${owner.id}`]!,
    );
    expect(envelope.ownerId).toBe(owner.id);
    expect(envelope.identityRecordId).toBe(identity.identity.id);
    expect(envelope.marketIds).toEqual(
      [firstMarket.id, secondMarket.id].sort(),
    );
    expect(
      Object.values(envelope.marketMonthlyAmountsMinor).reduce<number>(
        (sum, amount) => sum + Number(amount),
        p("zero"),
      ),
    ).toBe(envelope.monthlyBudgetMinor);
    expect(
      first.input.organizations.find((row) => row.id === owner.id),
    ).toEqual(owner);
    const identities = first.receipt.evidence.filter(
      (row) => row.kind === "outside-household-identity",
    );
    expect(identities).toEqual([identity.identity]);
    for (const market of [firstMarket, secondMarket]) {
      const visit = first.receipt.evidence.find(
        (row) =>
          row.kind === "outside-visit-budget" &&
          row.facts.marketId === market.id,
      )!;
      expect(visit.basisRecordIds).toEqual(
        expect.arrayContaining([
          ...market.basisRecordIds,
          identity.identity.id,
        ]),
      );
      expect(visit.subjectIds).toEqual([owner.id]);
      expect(visit.placeId).toBe(market.destinationPlaceId);
      expect(visit.facts.monthlyBudgetMinor).toBe(
        String(envelope.marketMonthlyAmountsMinor[market.id]),
      );
      expect(visit.facts.ownerBudgetRecordId).toBe(envelope.id);
      expect(visit.occurredAt).toBe(at);
      expect(visit.source.asOf <= visit.occurredAt).toBe(true);
    }
    const rebuilt = buildOpeningCustomers(first.input, options());
    expect(rebuilt.input).toEqual(first.input);
    expect(rebuilt.receipt.newOrganizationIds).toEqual([]);
    expect(rebuilt.receipt.newContractIds).toEqual([]);
    expect(rebuilt.receipt.newPlaceMetadataKeys).toEqual([]);
    expect(rebuilt.receipt.evidence).toEqual([]);
    expect(input).toEqual(before);
  });

  it("keeps default synthetic edge identities distinct despite shared origin and surname", () => {
    const { input, firstMarket, secondMarket } = twoVisitorEdgeFixture();
    const result = buildOpeningCustomers(
      input,
      options({ outsideMarkets: [firstMarket, secondMarket] }),
    );
    expect(result.receipt.newOrganizationIds).toHaveLength(p("one") + p("one"));
    expect(new Set(result.receipt.newOrganizationIds).size).toBe(
      p("one") + p("one"),
    );
    for (const row of result.receipt.evidence.filter(
      (record) => record.kind === "outside-household-identity",
    )) {
      expect(row.facts.identityStatus).toBe(
        "distinct-synthetic-estimated-edge-identity",
      );
      expect(row.source.tag).toBe("ESTIMATED");
    }
    expect(result.receipt.newStocks).toEqual([]);
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
  });

  it("rejects ambiguous canonical records for one outside owner without changing supplied input", () => {
    const { input, firstMarket, secondMarket, identity } =
      twoVisitorEdgeFixture();
    const before = structuredClone(input);
    expect(() =>
      buildOpeningCustomers(
        input,
        options({
          outsideMarkets: [firstMarket, secondMarket],
          outsideBuyerIdentityByMarketId: {
            [firstMarket.id]: identity,
            [secondMarket.id]: {
              ...identity,
              identity: {
                ...identity.identity,
                id: "conflicting-canonical-identity",
              },
            },
          },
        }),
      ),
    ).toThrow("Ambiguous canonical outside buyer identity");
    expect(input).toEqual(before);
  });

  it("saves full contract Sources and original terms under actual public and visitor contract IDs", () => {
    const original = fixture();
    const input: CoreInput = {
      ...original,
      organizations: original.organizations.map((row) =>
        row.id === "local-office"
          ? { ...row, liquidMinor: p("zero"), outsideFlow: source }
          : row,
      ),
    };
    const result = buildOpeningCustomers(input, visitorOptions());
    const publicOwner = result.input.organizations.find(
      (row) => row.id === "local-office",
    )!;
    const publicAgreement = JSON.parse(
      publicOwner.governmentFacts!["openingCustomers.agreement:fixture-place"]!,
    );
    const visit = result.receipt.evidence.find(
      (row) => row.kind === "outside-visit-budget",
    )!;
    for (const [kind, agreement] of [
      ["public.customer.custodial-services", publicAgreement],
      [
        "outside.customer.visitor-lodging",
        {
          contractIds: JSON.parse(visit.facts.contractIds!),
          contractSourceMap: JSON.parse(visit.facts.contractSourceMap!),
          contractTermsById: JSON.parse(visit.facts.contractTermsById!),
        },
      ],
    ] as const) {
      const contracts = result.input.finance!.contracts.filter(
        (row) => row.kind === kind,
      );
      expect(Object.keys(agreement.contractSourceMap).sort()).toEqual(
        contracts.map((row) => row.id).sort(),
      );
      expect(Object.keys(agreement.contractTermsById).sort()).toEqual(
        contracts.map((row) => row.id).sort(),
      );
      for (const contract of contracts) {
        expect(agreement.contractSourceMap[contract.id]).toEqual(
          contract.source,
        );
        expect(agreement.contractSourceMap[contract.id]).not.toEqual(source);
        expect(agreement.contractTermsById[contract.id]).toEqual({
          payerIds: [...contract.payerIds],
          payeeId: contract.payeeId,
          kind: contract.kind,
          amountMinor: contract.amountMinor,
          firstDueAt: contract.dueAt,
          periodMonths: contract.periodMonths,
          settlementPhaseId: contract.settlementPhaseId,
        });
        expect(contract.externalInflow?.ownerId).toBe(
          contract.payerIds[p("zero")],
        );
        expect(contract.externalInflow?.source).toEqual(contract.source);
      }
    }
    expect(publicOwner.liquidMinor).toBe(p("zero"));
    const changedAgreement = {
      ...publicAgreement,
      contractSourceMap: {
        ...publicAgreement.contractSourceMap,
        [publicAgreement.contractIds[p("zero")]]: source,
      },
    };
    expect(() =>
      buildOpeningCustomers(
        {
          ...result.input,
          organizations: result.input.organizations.map((row) =>
            row.id === publicOwner.id
              ? {
                  ...row,
                  governmentFacts: {
                    ...row.governmentFacts,
                    "openingCustomers.agreement:fixture-place":
                      JSON.stringify(changedAgreement),
                  },
                }
              : row,
          ),
        },
        visitorOptions(),
      ),
    ).toThrow("Conflicting public opening customer fact");
  });

  it("preserves actual supplied agreement dates and ends when transient options disappear", () => {
    const original = fixture(),
      supplied = visitorOptions();
    const reference = buildOpeningCustomers(original, supplied);
    const plan = reference.receipt.contractPlans.find(
      (row) => row.serviceKey === "visitor-lodging",
    )!;
    const date = {
      id: plan.agreementId,
      dueAt: "2021-01-20",
      basisRecordIds: ["actual-fixture-visit-calendar"],
      source,
    };
    const end = {
      id: plan.agreementId,
      endsAt: "2022-04-20",
      basisRecordIds: ["actual-fixture-owner-end"],
      source,
    };
    const first = buildOpeningCustomers(original, {
      ...supplied,
      agreementDatesById: { [date.id]: date },
      agreementEndsById: { [end.id]: end },
    });
    const contract = first.input.finance!.contracts.find(
      (row) => row.id === plan.contractId,
    )!;
    expect(contract.dueAt).toBe(date.dueAt);
    expect(contract.endsAt).toBe(end.endsAt);
    expect(contract.amountMinor).toBe(
      reference.input.finance!.contracts.find((row) => row.id === contract.id)!
        .amountMinor,
    );
    expect(
      JSON.parse(
        first.input.placeMetadata![`openingCustomers.date:${date.id}`]!,
      ),
    ).toEqual(date);
    expect(
      JSON.parse(first.input.placeMetadata![`openingCustomers.end:${end.id}`]!),
    ).toEqual(end);
    const visit = first.receipt.evidence.find(
      (row) => row.id === plan.agreementId,
    )!;
    expect(visit.facts.effectiveFrom).toBe(date.dueAt);
    expect(visit.facts.endsAt).toBe(end.endsAt);
    expect(
      JSON.parse(visit.facts.contractTermsById!)[contract.id].firstDueAt,
    ).toBe(date.dueAt);
    expect(JSON.parse(visit.facts.contractTermsById!)[contract.id].endsAt).toBe(
      end.endsAt,
    );
    const restored = buildOpeningCustomers(first.input, options());
    expect(restored.input).toEqual(first.input);
    expect(restored.receipt.newContractIds).toEqual([]);
    expect(restored.receipt.newPlaceMetadataKeys).toEqual([]);
    expect(
      first.input
        .finance!.contracts.filter((row) => row.id !== contract.id)
        .every((row) => row.endsAt === undefined),
    ).toBe(true);
  });

  it("retains an actual supplied expense date/end and uses that date only as the no-income household fallback", () => {
    const original = fixture();
    const actual: FinanceContractInput = {
      id: "actual-supplied-household-expense",
      householdId: "customer-household",
      payerIds: ["customer"],
      payeeId: "store",
      kind: "recorded.expense",
      amountMinor: p("one"),
      dueAt: "2021-01-15",
      endsAt: "2023-01-15",
      periodMonths: p("one"),
      accruesArrears: false,
      source,
    };
    const input: CoreInput = {
      ...original,
      finance: { ...original.finance!, contracts: [actual] },
    };
    const result = buildOpeningCustomers(input, visitorOptions());
    expect(
      result.input.finance!.contracts.find((row) => row.id === actual.id),
    ).toBe(actual);
    expect(
      householdTerms(result.input)
        .filter((row) => row.id !== actual.id)
        .every((row) => row.dueAt === actual.dueAt),
    ).toBe(true);
    expect(
      result.input
        .finance!.contracts.filter((row) => !row.householdId)
        .every((row) => row.dueAt === "2021-02-01"),
    ).toBe(true);
    expect(
      result.input
        .finance!.contracts.filter((row) => row.id !== actual.id)
        .every((row) => row.endsAt === undefined),
    ).toBe(true);
    expect(input.finance!.contracts).toEqual([actual]);
  });

  it("phases fresh household components to each actual owned work calendar while keeping amounts fixed", () => {
    const original = fixture();
    const customer = {
      ...original.people.find((row) => row.id === "customer")!,
      jobId: "job:customer-income",
    };
    const second = {
      ...customer,
      id: "second-customer",
      householdId: "second-customer-household",
      jobId: "job:second-customer-income",
    };
    const jobs = [customer, second].map((person) => ({
      ...original.jobs[p("zero")]!,
      id: person.jobId,
      personId: person.id,
      organizationId: "store",
      occupationClassification: "occupation:retail-cashier",
    }));
    const commitments = jobs.map((job, position) => ({
      ...original.workCommitments![p("zero")]!,
      id: `calendar:${job.id}`,
      jobId: job.id,
      personId: job.personId,
      organizationId: job.organizationId,
      periodDays: p("daysPerWeek"),
      slots: [
        {
          offsetDays:
            position === p("zero") ? p("one") : p("one") + p("one") + p("one"),
          startMinute: p("zero"),
          minutes: p("minutesPerHour"),
        },
      ],
    }));
    const input: CoreInput = {
      ...original,
      people: [
        ...original.people.map((row) =>
          row.id === customer.id ? customer : row,
        ),
        second,
      ],
      households: [
        ...original.households,
        {
          id: second.householdId,
          placeId: second.placeId,
          memberIds: [second.id],
          source,
        },
      ],
      jobs: [...original.jobs, ...jobs],
      workCommitments: [...original.workCommitments!, ...commitments],
    };
    const baseline = buildOpeningCustomers(
      { ...input, workCommitments: original.workCommitments },
      options(),
    );
    const result = buildOpeningCustomers(input, options());
    for (const [householdId, dueAt, commitment] of [
      [customer.householdId, "2021-01-02", commitments[p("zero")]!],
      [second.householdId, "2021-01-04", commitments[p("one")]!],
    ] as const) {
      const contracts = result.input.finance!.contracts.filter(
        (row) => row.householdId === householdId,
      );
      expect(contracts.length).toBeGreaterThan(p("zero"));
      expect(contracts.every((row) => row.dueAt === dueAt)).toBe(true);
      expect(
        contracts.every((row) =>
          row.source.estimatedFrom?.includes(commitment.id),
        ),
      ).toBe(true);
      expect(
        contracts.every(
          (row) => row.householdPurchaseCalendar?.householdId === householdId,
        ),
      ).toBe(true);
      expect(
        contracts.every(
          (row) => row.householdPurchaseCalendar?.firstNominalDueAt === dueAt,
        ),
      ).toBe(true);
      expect(
        contracts.every((row) =>
          row.householdPurchaseCalendar?.openingBasisIds.includes(
            commitment.id,
          ),
        ),
      ).toBe(true);
      expect(
        contracts.map(({ id, amountMinor, periodMonths }) => ({
          id,
          amountMinor,
          periodMonths,
        })),
      ).toEqual(
        baseline.input
          .finance!.contracts.filter((row) => row.householdId === householdId)
          .map(({ id, amountMinor, periodMonths }) => ({
            id,
            amountMinor,
            periodMonths,
          })),
      );
    }
    expect(result.input.workCommitments).toBe(input.workCommitments);
    expect(result.input.jobs).toBe(input.jobs);
    expect(
      result.input
        .finance!.contracts.filter((row) => !row.householdId)
        .every((row) => row.dueAt === "2021-02-01"),
    ).toBe(true);
    expect(
      result.input
        .finance!.contracts.filter((row) => !row.householdId)
        .every((row) => row.householdPurchaseCalendar === undefined),
    ).toBe(true);
  });

  it("uses a no-wage household's actual qualified recipient-income due date without creating an income or payment", () => {
    const original = fixture();
    const payerId = "actual-fixture-retirement-payer",
      awardId = "actual-fixture-retirement-award";
    const income: FinanceContractInput = {
      id: "actual-fixture-retirement-calendar",
      payerIds: [payerId],
      payeeId: "customer",
      kind: "income.retirement",
      amountMinor: p("minorPerDollar"),
      dueAt: "2021-01-21",
      periodMonths: p("one"),
      accruesArrears: false,
      recipientIncome: {
        personId: "customer",
        householdId: "customer-household",
        kindId: "retirement",
        sourceFactId: awardId,
      },
      source,
    };
    const input: CoreInput = {
      ...original,
      people: original.people.map((row) =>
        row.id === "customer"
          ? {
              ...row,
              pastFacts: [
                {
                  id: awardId,
                  date: at,
                  kind: "opening-income:retirement-award",
                  summary:
                    "Controlled supplied qualified income-calendar fixture.",
                  source,
                  facts: {
                    status: "in-payment",
                    payerId,
                    monthlyMinor: String(income.amountMinor),
                    kindId: "retirement",
                    householdId: row.householdId,
                  },
                },
              ],
            }
          : row,
      ),
      organizations: [
        ...original.organizations,
        {
          id: payerId,
          placeId: "fixture-place",
          name: "Actual fixture payer",
          kind: "retirement-income-payer",
          liquidMinor: p("zero"),
          outsideFlow: source,
          source,
        },
      ],
      finance: { ...original.finance!, contracts: [income] },
    };
    const result = buildOpeningCustomers(input, options());
    expect(
      result.input.finance!.contracts.find((row) => row.id === income.id),
    ).toBe(income);
    expect(
      householdTerms(result.input).every((row) => row.dueAt === income.dueAt),
    ).toBe(true);
    expect(
      householdTerms(result.input).every((row) =>
        row.source.estimatedFrom?.includes(awardId),
      ),
    ).toBe(true);
    expect(result.receipt.addedCashMinor).toBe(p("zero"));
    expect(result.receipt.newOrganizationIds).toEqual([]);
    expect(
      result.input.organizations.find((row) => row.id === payerId)!.liquidMinor,
    ).toBe(p("zero"));
    expect(result.receipt).not.toHaveProperty("runtimePayments");
  });
});

/** SOURCE-ONLY rebuild packet; every case below UNEXECUTED by its author. */
describe("UNEXECUTED persisted customer rebuild linkage", () => {
  const shared = () => {
    const { input, firstMarket, secondMarket, identity } =
      twoVisitorEdgeFixture();
    return buildOpeningCustomers(
      input,
      options({
        outsideMarkets: [firstMarket, secondMarket],
        outsideBuyerIdentityByMarketId: {
          [firstMarket.id]: identity,
          [secondMarket.id]: identity,
        },
      }),
    );
  };
  const changedVisit = (
    input: CoreInput,
    change: (row: { facts: Record<string, string>; source: Source }) => void,
  ) => {
    const clone = structuredClone(input),
      key = Object.keys(clone.placeMetadata!).find((name) => {
        if (!name.startsWith("openingCustomers.evidence:")) return false;
        return (
          (JSON.parse(clone.placeMetadata![name]!) as { kind: string }).kind ===
          "outside-visit-budget"
        );
      })!,
      visit = JSON.parse(clone.placeMetadata![key]!) as {
        facts: Record<string, string>;
        source: Source;
      };
    change(visit);
    return {
      ...clone,
      placeMetadata: { ...clone.placeMetadata, [key]: JSON.stringify(visit) },
    };
  };

  it("retains generated household markers and every saved edge with empty transient options", () => {
    const first = shared(),
      before = structuredClone(first.input),
      markers = first.input
        .finance!.contracts.filter((row) => row.householdPurchaseCalendar)
        .map((row) => ({
          id: row.id,
          marker: structuredClone(row.householdPurchaseCalendar),
        }));
    expect(markers.length).toBeGreaterThan(p("zero"));
    const rebuilt = buildOpeningCustomers(
      first.input,
      options({ outsideMarkets: [] }),
    );
    expect(rebuilt.input).toEqual(first.input);
    for (const row of markers)
      expect(
        rebuilt.input.finance!.contracts.find((term) => term.id === row.id)!
          .householdPurchaseCalendar,
      ).toEqual(row.marker);
    expect(rebuilt.receipt.newContractIds).toEqual([]);
    expect(rebuilt.receipt.newPlaceMetadataKeys).toEqual([]);
    expect(first.input).toEqual(before);
  });

  for (const field of [
    "citation",
    "estimatedFrom",
    "generationPriorVintage",
  ] as const) {
    it(`rejects a changed full generated visitor contract Source ${field}`, () => {
      const first = shared(),
        changed = changedVisit(first.input, (visit) => {
          const sources = JSON.parse(visit.facts.contractSourceMap!) as Record<
              string,
              Source
            >,
            id = Object.keys(sources)[p("zero")]!;
          sources[id] = {
            ...sources[id]!,
            [field]: "Changed saved standing Source",
          };
          visit.facts.contractSourceMap = JSON.stringify(sources);
        });
      const before = structuredClone(changed);
      expect(() => buildOpeningCustomers(changed, options())).toThrow(
        /Conflicting opening customer contract/,
      );
      expect(changed).toEqual(before);
    });
  }

  it("rejects a lost full Source map rather than downgrading generated terms to supplied", () => {
    const first = shared(),
      changed = changedVisit(first.input, (visit) => {
        delete visit.facts.contractSourceMap;
      });
    expect(() => buildOpeningCustomers(changed, options())).toThrow(
      /Missing saved generated customer record/,
    );
  });

  it("rejects a lost generated buyer link rather than creating a second owner envelope", () => {
    const first = shared(),
      clone = structuredClone(first.input),
      metadata = { ...clone.placeMetadata },
      key = Object.keys(metadata).find((name) =>
        name.startsWith("openingCustomers.marketBuyer:"),
      )!;
    delete metadata[key];
    expect(() =>
      buildOpeningCustomers({ ...clone, placeMetadata: metadata }, options()),
    ).toThrow(/Missing saved generated customer buyer linkage/);
  });

  it("rejects a lost positive visit record while retaining legitimate zero-share records", () => {
    const first = shared(),
      clone = structuredClone(first.input),
      key = Object.keys(clone.placeMetadata!).find((name) => {
        if (!name.startsWith("openingCustomers.evidence:")) return false;
        return (
          (JSON.parse(clone.placeMetadata![name]!) as { kind: string }).kind ===
          "outside-visit-budget"
        );
      })!;
    const metadata = { ...clone.placeMetadata };
    delete metadata[key];
    expect(() =>
      buildOpeningCustomers({ ...clone, placeMetadata: metadata }, options()),
    ).toThrow(/Missing saved generated customer record/);
  });

  for (const field of [
    "firstDueAt",
    "endsAt",
    "amountMinor",
    "periodMonths",
  ] as const) {
    it(`rejects changed saved original generated ${field}`, () => {
      const first = shared(),
        changed = changedVisit(first.input, (visit) => {
          const terms = JSON.parse(visit.facts.contractTermsById!) as Record<
              string,
              Record<string, unknown>
            >,
            id = Object.keys(terms)[p("zero")]!;
          terms[id]![field] = field.endsWith("At")
            ? "2023-01-17"
            : p("one") + p("one");
          visit.facts.contractTermsById = JSON.stringify(terms);
        });
      expect(() => buildOpeningCustomers(changed, options())).toThrow(
        /Conflicting opening customer contract/,
      );
    });
  }

  it("rejects a supplied alias of an admitted canonical edge without changing its envelope", () => {
    const first = shared(),
      market = visitorOptions().outsideMarkets![p("zero")]!,
      before = structuredClone(first.input);
    expect(() =>
      buildOpeningCustomers(
        first.input,
        options({
          outsideMarkets: [{ ...market, id: `${market.id}:relabel` }],
        }),
      ),
    ).toThrow(
      /Existing opening customer contract no longer resolves under these inputs:/,
    );
    expect(first.input).toEqual(before);
  });

  it("preserves supplied raw omitted phase/date/end and independently saves its market buyer link", () => {
    const {
      input: original,
      firstMarket,
      secondMarket,
      owner,
      identity,
    } = twoVisitorEdgeFixture();
    const actual: FinanceContractInput = {
      id: "actual-rebuild-supplied-standing",
      payerIds: [owner.id],
      payeeId: "inn",
      kind: "outside.customer.visitor-lodging",
      amountMinor: p("one"),
      dueAt: "2021-01-15",
      endsAt: "2024-01-15",
      periodMonths: p("monthsPerYear"),
      accruesArrears: false,
      salesReceipt: true,
      source,
      externalInflow: {
        kind: "external.customer.visitor-lodging",
        ownerId: owner.id,
        identityRecordId: identity.identity.id,
        visitAgreementRecordId: "actual-rebuild-supplied-visit",
        marketId: firstMarket.id,
        source,
      },
    };
    const first = buildOpeningCustomers(
      {
        ...original,
        organizations: [...original.organizations, owner],
        finance: { ...original.finance!, contracts: [actual] },
      },
      options({
        outsideMarkets: [firstMarket, secondMarket],
        outsideBuyerIdentityByMarketId: {
          [firstMarket.id]: identity,
          [secondMarket.id]: identity,
        },
      }),
    );
    const mapping = JSON.parse(
      first.input.placeMetadata![
        `openingCustomers.marketBuyer:${firstMarket.id}`
      ]!,
    ) as {
      ownerId: string;
      suppliedContractIds: string[];
      contractSourceMap: Record<string, Source>;
      contractTermsById: Record<string, Record<string, unknown>>;
    };
    expect(mapping.ownerId).toBe(owner.id);
    expect(mapping.suppliedContractIds).toEqual([actual.id]);
    expect(mapping.contractSourceMap[actual.id]).toEqual(actual.source);
    expect(mapping.contractTermsById[actual.id]).toMatchObject({
      firstDueAt: actual.dueAt,
      endsAt: actual.endsAt,
      amountMinor: actual.amountMinor,
      periodMonths: actual.periodMonths,
    });
    expect(mapping.contractTermsById[actual.id]).not.toHaveProperty(
      "settlementPhaseId",
    );
    const rebuilt = buildOpeningCustomers(first.input, options());
    expect(rebuilt.input).toEqual(first.input);
    expect(
      rebuilt.input.finance!.contracts.find((row) => row.id === actual.id),
    ).toBe(actual);
    expect(actual.settlementPhaseId).toBeUndefined();
    expect(actual.householdPurchaseCalendar).toBeUndefined();
  });

  it("rejects an actual agreement end at its own due boundary", () => {
    const original = fixture(),
      supplied = visitorOptions(),
      reference = buildOpeningCustomers(original, supplied),
      plan = reference.receipt.contractPlans.find(
        (row) => row.serviceKey === "visitor-lodging",
      )!;
    const date = {
        id: plan.agreementId,
        dueAt: "2021-01-20",
        basisRecordIds: ["actual-edge-date"],
        source,
      },
      end = {
        id: plan.agreementId,
        endsAt: date.dueAt,
        basisRecordIds: ["actual-edge-exclusive-end"],
        source,
      };
    expect(() =>
      buildOpeningCustomers(original, {
        ...supplied,
        agreementDatesById: { [date.id]: date },
        agreementEndsById: { [end.id]: end },
      }),
    ).toThrow(/Invalid actual customer agreement end/);
  });
});

describe("complete canonical provider qualification sharing", () => {
  it("stores every qualifying staff job once and uses explicit refs across households", () => {
    const original = fixture(),
      baseJob = original.jobs.find((row) => row.id === "job:salon")!,
      worker = original.people.find((row) => row.id === baseJob.personId)!;
    const input: CoreInput = {
      ...original,
      people: [
        ...original.people,
        {
          ...worker,
          id: "worker:salon:second",
          jobId: "job:salon:second",
          householdId: "household:salon:second",
        },
        {
          ...original.people.find((row) => row.id === "customer")!,
          id: "customer:second",
          householdId: "household:customer:second",
        },
      ],
      households: [
        ...original.households,
        {
          id: "household:salon:second",
          placeId: worker.placeId,
          memberIds: ["worker:salon:second"],
          source,
        },
        {
          id: "household:customer:second",
          placeId: worker.placeId,
          memberIds: ["customer:second"],
          source,
        },
      ],
      jobs: [
        ...original.jobs,
        {
          ...baseJob,
          id: "job:salon:second",
          personId: "worker:salon:second",
          source: {
            ...source,
            citation: "Second actual product-job full Source",
            estimatedFrom: "Independent unchanged second staff basis",
          },
        },
      ],
    };
    const saved = structuredClone(input),
      result = buildOpeningCustomers(input, visitorOptions());
    expect(input).toEqual(saved);
    const plans = result.receipt.contractPlans.filter(
      (row) => row.sellerId === "salon" && row.serviceKey === "personal-care",
    );
    expect(plans).toHaveLength(p("one") + p("one"));
    const full = fullPlanQualification(
      result,
      plans[p("zero")]!.providerQualification,
    );
    expect(full.jobIds).toEqual(["job:salon", "job:salon:second"]);
    expect(full.sources).toContainEqual(
      expect.objectContaining({
        recordId: "job:salon:second",
        source: input.jobs.at(-p("one"))!.source,
      }),
    );
    const owner = result.input.organizations.find((row) => row.id === "salon")!;
    expect(
      Object.keys(owner.governmentFacts!).filter((key) =>
        key.startsWith("openingCustomers.qualification:"),
      ),
    ).toHaveLength(p("one"));
    for (const plan of plans) {
      expect(plan.providerQualification).not.toHaveProperty("sources");
      expect(plan.providerQualification).not.toHaveProperty("jobIds");
      expect(fullPlanQualification(result, plan.providerQualification)).toEqual(
        full,
      );
    }
    const rebuilt = buildOpeningCustomers(result.input, visitorOptions());
    expect(rebuilt.input).toEqual(result.input);
    // A changed roster cannot erase/rebind the originally admitted witness.
    const later: CoreInput = {
      ...result.input,
      people: result.input.people.map((row) =>
        row.id === worker.id ? { ...row, jobId: undefined } : row,
      ),
    };
    const laterRebuilt = buildOpeningCustomers(later, visitorOptions());
    expect(laterRebuilt.input.organizations).toEqual(later.organizations);
    expect(laterRebuilt.input.finance!.contracts).toEqual(
      later.finance!.contracts,
    );
    expect(
      fullPlanQualification(
        laterRebuilt,
        laterRebuilt.receipt.contractPlans.find(
          (row) => row.sellerId === "salon",
        )!.providerQualification,
      ).jobIds,
    ).toEqual(full.jobIds);
  });
  it("rejects a missing, moved or pruned provider registry without mutating input", () => {
    const first = buildOpeningCustomers(fixture(), visitorOptions());
    for (const change of [
      "missing",
      "wrong-owner",
      "pruned",
      "duplicate-alias",
    ] as const) {
      const input = structuredClone(first.input),
        owner = input.organizations.find((row) => row.id === "salon")!;
      const key = Object.keys(owner.governmentFacts!).find((row) =>
        row.startsWith("openingCustomers.qualification:"),
      )!;
      const facts = { ...owner.governmentFacts };
      if (change === "missing") delete facts[key];
      else if (change === "duplicate-alias")
        facts[`${key}:alias`] = facts[key]!;
      else {
        const record = JSON.parse(facts[key]!);
        if (change === "wrong-owner") record.organizationId = "inn";
        else {
          record.jobIds = [];
          record.sources = [];
        }
        facts[key] = JSON.stringify(record);
      }
      owner.governmentFacts = facts;
      const before = structuredClone(input);
      expect(() => buildOpeningCustomers(input, visitorOptions())).toThrow();
      expect(input).toEqual(before);
    }
  });
  it("retains actual legacy inline witnesses and Sources without migrating saved input", () => {
    const first = buildOpeningCustomers(fixture(), visitorOptions()),
      input = structuredClone(first.input);
    const resolve = (rows: OpeningCustomerAgreementQualification[]) =>
      rows.map((row) => fullQualification(first, row));
    for (const person of input.people)
      for (const fact of person.pastFacts ?? [])
        if (fact.facts?.providerQualifications)
          fact.facts = {
            ...fact.facts,
            providerQualifications: JSON.stringify(
              resolve(JSON.parse(fact.facts.providerQualifications)),
            ),
          };
    for (const owner of input.organizations) {
      const facts = { ...owner.governmentFacts };
      for (const key of Object.keys(facts)) {
        if (key.startsWith("openingCustomers.qualification:"))
          delete facts[key];
        else if (key.startsWith("openingCustomers.agreement:")) {
          const record = JSON.parse(facts[key]!);
          record.providerQualifications = resolve(
            record.providerQualifications,
          );
          facts[key] = JSON.stringify(record);
        }
      }
      // Canonical producer compares JSON structurally for original registry only;
      // owning saved agreement records keep their original canonical encoding.
      owner.governmentFacts = facts;
    }
    for (const [key, raw] of Object.entries(input.placeMetadata ?? {}))
      if (key.startsWith("openingCustomers.evidence:")) {
        const record = JSON.parse(raw);
        if (record.facts?.providerQualifications) {
          record.facts.providerQualifications = JSON.stringify(
            resolve(JSON.parse(record.facts.providerQualifications)),
          );
          input.placeMetadata = {
            ...input.placeMetadata,
            [key]: JSON.stringify(record),
          };
        }
      }
    const before = structuredClone(input);
    // Encoding is canonical in real saved producer records; fixture normalizes
    // only its explicitly transformed inline representation before admission.
    const canonical = (value: unknown): string =>
      Array.isArray(value)
        ? `[${value.map(canonical).join(",")}]`
        : value && typeof value === "object"
          ? `{${Object.entries(value)
              .filter(([, row]) => row !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, row]) => `${JSON.stringify(key)}:${canonical(row)}`)
              .join(",")}}`
          : (JSON.stringify(value) ?? "undefined");
    for (const owner of input.organizations)
      owner.governmentFacts = Object.fromEntries(
        Object.entries(owner.governmentFacts ?? {}).map(([key, raw]) => [
          key,
          key.startsWith("openingCustomers.agreement:")
            ? canonical(JSON.parse(raw))
            : raw,
        ]),
      );
    for (const person of input.people)
      for (const fact of person.pastFacts ?? [])
        if (fact.facts?.providerQualifications)
          fact.facts = {
            ...fact.facts,
            providerQualifications: canonical(
              JSON.parse(fact.facts.providerQualifications),
            ),
          };
    input.placeMetadata = Object.fromEntries(
      Object.entries(input.placeMetadata ?? {}).map(([key, raw]) => {
        if (!key.startsWith("openingCustomers.evidence:")) return [key, raw];
        const record = JSON.parse(raw);
        if (record.facts?.providerQualifications)
          record.facts.providerQualifications = canonical(
            JSON.parse(record.facts.providerQualifications),
          );
        return [key, canonical(record)];
      }),
    );
    const saved = structuredClone(input),
      rebuilt = buildOpeningCustomers(input, visitorOptions());
    expect(input).toEqual(saved);
    expect(rebuilt.input).toEqual(input);
    expect(rebuilt.receipt.providerQualifications).toEqual([]);
    expect(rebuilt.receipt.inlineProviderQualifications.length).toBeGreaterThan(
      p("zero"),
    );
    expect(before.finance).toEqual(input.finance);
  });
});

describe("fresh default household Source basis existing full group", () => {
  it("keeps an existing complete default full-Source agreement and actual contract IDs on rebuild", () => {
    const fresh = buildOpeningCustomers(fixture(), options());
    const legacy = structuredClone(fresh.input);
    const terms = legacy.finance!.contracts!.filter(
      (row) =>
        row.householdId &&
        row.source.generatedHouseholdBasis?.key === "personal-care",
    );
    expect(terms.length).toBeGreaterThan(0);
    const householdId = terms[0]!.householdId!,
      group = terms.filter((row) => row.householdId === householdId);
    const marker = group[0]!.householdPurchaseCalendar!;
    const service = DEFAULT_OPENING_CUSTOMER_DATA.householdServices.find(
      (row) => row.key === "personal-care",
    )!;
    const basis = group[0]!.source.generatedHouseholdBasis!;
    const description = `${service.label} CEX component with ${basis.sizeColumn}/${basis.region} parent scaling, original household envelope cap, and equal recorded opening vendor shares. ${service.stopgapId}`;
    // Complete pre-basis default Source, independently specified by the retained catalog/rule.
    const fullBase = {
      tag: "ESTIMATED" as const,
      asOf: legacy.startedAt,
      generationPriorVintage: `${DEFAULT_OPENING_CUSTOMER_DATA.generationPriorVintage}; ${marker.source.generationPriorVintage}`,
      citation: `${service.citation} Calendar Source: DATA openingPurchaseCalendar.source.`,
      estimatedFrom: `${description} Opening plans and fictional recorded terms only; no paid receipt, delivery, actual historical bill, survival target, or observed individual demand is implied. Each due date retains its own calendar evidence; a source year is no agreement end. Calendar marker ${marker.ruleId}; household ${householdId}; basis ${JSON.stringify(marker.openingBasisIds)}; result ${marker.firstNominalDueAt}. ${marker.stopgapId}`,
    };
    for (const person of legacy.people)
      for (const fact of person.pastFacts ?? []) {
        if (
          fact.kind !== "household-service-agreement" ||
          fact.facts?.householdId !== householdId ||
          fact.facts.serviceKey !== service.key
        )
          continue;
        fact.source = fullBase;
        for (const row of group) {
          expect(row.id).toBe(`${fact.id}:contract:${row.payeeId}`);
          row.source = {
            ...fullBase,
            citation: `${fullBase.citation} Prior agreement ${fact.id}; seller ${row.payeeId}.`,
          };
        }
      }
    const before = JSON.stringify(legacy);
    const rebuilt = buildOpeningCustomers(legacy, options());
    expect(rebuilt.input).toEqual(legacy);
    expect(rebuilt.receipt.newContractIds).toEqual([]);
    for (const row of group)
      expect(
        rebuilt.input.finance!.contracts!.find(
          (actual) => actual.id === row.id,
        )!.source,
      ).toEqual(row.source);
    expect(JSON.stringify(legacy)).toBe(before);
  });
});

describe("default household Source dependency selection", () => {
  it("retains full Source for a custom selected component row without changing money, calendar or ordered role references", () => {
    const input = fixture(),
      before = structuredClone(input);
    const supplied = options();
    const first = buildOpeningCustomers(input, supplied);
    const service = DEFAULT_OPENING_CUSTOMER_DATA.householdServices.find(
      (row) => row.key === "personal-care",
    )!;
    const key = service.componentAnnualParameter;
    const changed = buildOpeningCustomers(input, {
      ...supplied,
      parameters: {
        ...PARAMETERS,
        [key]: {
          ...PARAMETERS[key]!,
          citation: `${PARAMETERS[key]!.citation} Actual supplied component provenance.`,
        },
      },
    });
    const originals = first.input.finance!.contracts.filter(
      (row) => row.source.generatedHouseholdBasis?.key === service.key,
    );
    expect(originals.length).toBeGreaterThan(p("zero"));
    for (const original of originals) {
      const actual = changed.input.finance!.contracts.find(
        (row) => row.id === original.id,
      )!;
      expect(actual.source.generatedHouseholdBasis).toBeUndefined();
      expect(actual.source.citation).toContain(service.citation);
      expect(actual.source.estimatedFrom).toContain("Calendar basis records:");
      expect({ ...actual, source: original.source }).toEqual(original);
      const originalPlan = first.receipt.contractPlans.find(
        (row) => row.contractId === original.id,
      )!;
      const actualPlan = changed.receipt.contractPlans.find(
        (row) => row.contractId === original.id,
      )!;
      expect(actualPlan.parameterRefs).toEqual(originalPlan.parameterRefs);
      expect(actualPlan.parameterRefs).toContain(key);
    }
    expect(changed.receipt.addedCashMinor).toBe(first.receipt.addedCashMinor);
    expect(changed.receipt.parameterRefs).toEqual(first.receipt.parameterRefs);
    expect(input).toEqual(before);
  });
});

describe("household Source calendar-unit provenance", () => {
  it("keeps full service Source for same-value custom calendar units while preserving all money and dates", () => {
    const input = fixture(),
      before = structuredClone(input);
    const supplied = options();
    const first = buildOpeningCustomers(input, supplied);
    const originals = first.input.finance!.contracts.filter(
      (row) => row.householdId,
    );
    expect(originals.length).toBeGreaterThan(p("zero"));
    expect(
      originals.every(
        (row) => row.source.generatedHouseholdBasis !== undefined,
      ),
    ).toBe(true);
    for (const key of ["hoursPerDay", "minutesPerHour"]) {
      const originalParameter = PARAMETERS[key]!;
      const registry = {
        ...PARAMETERS,
        [key]: {
          ...originalParameter,
          citation: `${originalParameter.citation} Actual custom household-calendar unit provenance.`,
          estimatedFrom: `${originalParameter.estimatedFrom ?? ""} Actual supplied unit record at unchanged numeric value.`,
        },
      };
      expect(registry[key]!.value).toBe(originalParameter.value);
      const changed = buildOpeningCustomers(input, {
        ...supplied,
        parameters: registry,
      });
      for (const original of originals) {
        const actual = changed.input.finance!.contracts.find(
          (row) => row.id === original.id,
        )!;
        expect(actual.source.generatedHouseholdBasis).toBeUndefined();
        expect(actual.source.estimatedFrom).toContain(
          "Calendar basis records:",
        );
        expect({ ...actual, source: original.source }).toEqual(original);
        expect(
          changed.receipt.contractPlans.find(
            (row) => row.contractId === original.id,
          )!.parameterRefs,
        ).toEqual(
          first.receipt.contractPlans.find(
            (row) => row.contractId === original.id,
          )!.parameterRefs,
        );
      }
      expect(changed.receipt.parameterRefs).toEqual(
        first.receipt.parameterRefs,
      );
      expect(changed.receipt.originalCashMinor).toBe(
        first.receipt.originalCashMinor,
      );
      expect(changed.receipt.addedCashMinor).toBe(first.receipt.addedCashMinor);
      expect(changed.receipt.enrichedCashMinor).toBe(
        first.receipt.enrichedCashMinor,
      );
    }
    expect(input).toEqual(before);
  });
});
