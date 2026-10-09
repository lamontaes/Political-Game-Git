/** Opening record/term fixtures; generated-world outcomes are measured separately. */
import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import type { FinanceContractInput } from "./finance-types";
import {
  buildOpeningCustomers,
  DEFAULT_OPENING_CUSTOMER_DATA,
  type OpeningCustomerOptions,
  type OpeningCustomerProviderQualification,
  type RecordedCustomerProvider,
} from "./opening-customers";
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

  it("admits outside stock and purchase terms from the actual production registry", () => {
    const rule = DEFAULT_OPENING_CUSTOMER_DATA.outsideHouseholds;
    const result = buildOpeningCustomers(fixture(), {
      ...visitorOptions(),
      parameters: PARAMETERS,
    });
    expect(PARAMETERS[rule.liquidUsdParameter]!.checkRange).toBeUndefined();
    expect(result.receipt.newStocks).toHaveLength(p("one"));
    expect(result.receipt.newStocks[p("zero")]!.liquidMinor).toBe(
      p(rule.liquidUsdParameter) * p("minorPerDollar"),
    );
    expect(result.receipt.parameterRefs).toContain(
      rule.countPerMarketParameter,
    );
    expect(result.receipt.parameterRefs).toContain(rule.liquidUsdParameter);
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
    expect(contract.source.citation).toContain("B4217");
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
      const qualifications = JSON.parse(
        agreement.facts.providerQualifications!,
      ) as OpeningCustomerProviderQualification[];
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
      expect(plan.providerQualification).toEqual(qualification);
    }
    const householdFact = result.input.people
      .find((person) => person.id === "customer")!
      .pastFacts!.find((fact) => fact.facts?.serviceKey === "personal-care")!;
    expect(JSON.parse(householdFact.facts!.basisRecordIds!)).toContain(
      "job:salon",
    );
    expect(householdFact.facts!.providerQualifications).toContain(
      source.citation,
    );
    const publicAgreement = JSON.parse(
      result.input.organizations.find((row) => row.id === "local-office")!
        .governmentFacts!["openingCustomers.agreement:fixture-place"]!,
    );
    expect(publicAgreement.basisRecordIds).toContain("job:cleaner");
    expect(publicAgreement.providerQualifications).toContainEqual(
      expect.objectContaining({ jobIds: ["job:cleaner"] }),
    );
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
        plan.providerQualification.jobIds.includes("job:lawyer"),
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
        expect(plan.providerQualification.jobIds).toEqual([]);
        expect(plan.providerQualification.providerRecordIds).toEqual([
          record.id,
        ]);
        expect(plan.providerQualification.sources).toEqual([
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
    expect(householdFact.facts!.providerQualifications).toContain(
      "recorded-salon-scope",
    );
    expect(householdFact.facts!.providerQualifications).toContain(
      used.find((row) => row.organizationId === "salon")!.source.citation,
    );
    const publicAgreement = JSON.parse(
      result.input.organizations.find((row) => row.id === "local-office")!
        .governmentFacts!["openingCustomers.agreement:fixture-place"]!,
    );
    expect(publicAgreement.basisRecordIds).toContain("recorded-cleaner-scope");
    expect(publicAgreement.providerQualifications).toContainEqual(
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
    expect(savedVisit.facts.providerQualifications).toContain(
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

  it("records public authority, finite appropriation and custodial terms without adding public cash", () => {
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

  it("admits one independent SCF family stock and CEX visitor budget at distinct recorded geography", () => {
    const input = fixture(),
      result = buildOpeningCustomers(input, visitorOptions());
    expect(result.receipt.newStocks).toHaveLength(p("one"));
    const stock = result.receipt.newStocks[p("zero")]!;
    expect(stock.liquidMinor).toBe(
      p("openingCustomerOutsideHouseholdLiquidUsd") * p("minorPerDollar"),
    );
    expect(stock.stockSourceRecordId).toContain("scf-2022-family");
    expect(result.receipt.addedCashMinor).toBe(stock.liquidMinor);
    expect(
      result.receipt.enrichedCashMinor - result.receipt.originalCashMinor,
    ).toBe(stock.liquidMinor);
    const contract = result.input.finance!.contracts.find(
      (row) => row.kind === "outside.customer.visitor-lodging",
    )!;
    expect(contract.payerIds).toEqual([stock.cashEntityId]);
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
      result.input.placeMetadata?.[
        `openingCustomers.stock:${stock.cashEntityId}`
      ],
    ).toContain(stock.stockSourceRecordId);
    expect(
      result.input.placeMetadata?.[
        `openingCustomers.evidence:${stock.cashEntityId}:identity`
      ],
    ).toContain("one-outside-family");
    expect(
      result.input.placeMetadata?.[
        `openingCustomers.evidence:${stock.cashEntityId}:visit-budget`
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
    expect(exactRepeat.receipt.newStocks).toHaveLength(p("one"));
  });

  it("keeps the same geographic outside account when a caller relabels its market on enrichment", () => {
    const supplied = visitorOptions();
    const market = supplied.outsideMarkets![p("zero")]!;
    const first = buildOpeningCustomers(fixture(), supplied);
    const relabeled = buildOpeningCustomers(first.input, {
      ...supplied,
      outsideMarkets: [{ ...market, id: `${market.id}:alias` }],
    });
    expect(relabeled.input).toEqual(first.input);
    expect(relabeled.receipt.newStocks).toEqual([]);
    expect(relabeled.receipt.newOrganizationIds).toEqual([]);
    expect(relabeled.receipt.addedCashMinor).toBe(p("zero"));
    expect(relabeled.receipt.newContractIds).toEqual([]);
  });

  it("rejects outside household stock overlap with already admitted resident places", () => {
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
      `opening-customers:outside-stock-would-overlap-admitted-residence:${market.id}`,
    );
  });

  it("is deterministic and idempotent, including public facts and newly admitted outside stocks", () => {
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
    const stockId = result.receipt.newStocks[p("zero")]!.cashEntityId;
    const accountConflict = {
      ...result.input,
      organizations: result.input.organizations.map((row) =>
        row.id === stockId
          ? { ...row, liquidMinor: row.liquidMinor + p("one") }
          : row,
      ),
    };
    expect(() => buildOpeningCustomers(accountConflict, supplied)).toThrow(
      "Conflicting outside customer account",
    );
  });

  it("gives every new purchase budget exclusive finite expiry and no arrears, capital or forecast credit", () => {
    const result = buildOpeningCustomers(fixture(), visitorOptions());
    for (const contract of result.input.finance!.contracts) {
      expect(contract.dueAt).toBe("2021-02-01");
      expect(contract.endsAt).toBe("2022-02-01");
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
    const stockId = result.receipt.newStocks[p("zero")]!.cashEntityId;
    const outsideConflict = {
      ...result.input,
      placeMetadata: {
        ...result.input.placeMetadata,
        [`openingCustomers.evidence:${stockId}:identity`]:
          "Changed outside family identity",
      },
    };
    expect(() => buildOpeningCustomers(outsideConflict, supplied)).toThrow(
      "Conflicting opening customer metadata",
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
