/** Opening record/term fixtures; generated-world outcomes are measured separately. */
import { describe, expect, it } from "vitest";
import { corePlaceByKey, corePlaceStateIdentities } from "./place-lookup";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "./reference/government-units";
import { createStableId } from "./kernel/ids";
import { governmentUnitRecordedName } from "./gov-rules/government-unit-names";
import { openingHistoricalCountyOwnerFacts } from "./opening-public-owner";
import type { FinanceContractInput } from "./finance-types";
import {
  buildOpeningCustomers,
  DEFAULT_OPENING_CUSTOMER_DATA,
  type OpeningCustomerOptions,
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
    }),
    ...overrides,
  };
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
      id: "recorded-cleaner-scope",
      organizationId: "cleaner",
      serviceKeys: ["housekeeping", "public-custodial"],
      source: {
        ...source,
        citation: "Controlled dated custodial product record.",
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
    supplied: { ...options(), providerRecords: [...used, ...unused] },
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
      buildOpeningCustomers(input, { ...options(), parameters }),
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

  it("creates a positive source-specific salon route with a monthly contract and real cash endpoints", () => {
    const result = buildOpeningCustomers(fixture(), options());
    const contract = householdTerms(result.input).find(
      (row) => row.kind === "household.customer.personal-care",
    )!;
    expect(contract.amountMinor).toBeGreaterThan(p("zero"));
    expect(contract.payeeId).toBe("salon");
    expect(contract.payerIds).toEqual(["customer"]);
    expect(contract.source.citation).toContain("B4217");
    expect(contract.source.tag).toBe("ESTIMATED");
    expect(contract.dueAt).toBe("2021-02-01");
    expect(contract).not.toHaveProperty("householdPurchaseCalendar");
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
    const budget = result.receipt.householdBudgets.find(
      (row) => row.householdId === "customer-household",
    )!;
    // The one minor left in the envelope goes to a service by weight; where
    // the town has no seller of it, it stays unbound (and unpaid).
    expect(
      householdTerms(result.input).reduce(
        (total, row) => total + row.amountMinor / row.periodMonths,
        p("zero"),
      ),
    ).toBe(assigned - budget.unboundServiceMonthlyMinor);
    expect(
      budget.plannedAddedServiceMonthlyMinor +
        budget.unboundServiceMonthlyMinor,
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
        job.id === "job:cleaner" ? { ...job, source: invalid } : job,
      ),
    };
    const saved = structuredClone(input);
    expect(() => buildOpeningCustomers(input, options())).toThrow(
      "Customer record requires dated nonfuture provenance: job:cleaner",
    );
    expect(input).toEqual(saved);
  });

  it("links each actual qualifying job and its source to public agreements", () => {
    const result = buildOpeningCustomers(fixture(), options());
    for (const [kind, jobId] of [
      ["public-service-agreement", "job:cleaner"],
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
      householdTerms(result.input).some((row) => row.payeeId === "salon"),
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
    const record = used.find((row) => row.organizationId === "cleaner")!;
    for (const changed of [
      { ...record, organizationId: "inn" },
      { ...record, serviceKeys: ["visitor-lodging"] },
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

  it("is deterministic and idempotent, including public facts", () => {
    const input = fixture(),
      supplied = options();
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

  it("rejects same-ID changed contract content", () => {
    const supplied = options(),
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
  });

  it("keeps modeled due dates without source-year expiry, arrears, capital or forecast credit", () => {
    const result = buildOpeningCustomers(fixture(), options());
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
    };
    const result = buildOpeningCustomers(fixture(), {
      ...options(),
      data: {
        ...DEFAULT_OPENING_CUSTOMER_DATA,
        settlementPhaseIds: phases,
      },
    });
    for (const contract of result.input.finance!.contracts) {
      const expected = contract.kind.startsWith("public.")
        ? phases.publicProcurement
        : phases.householdPurchases;
      expect(contract.settlementPhaseId).toBe(expected);
    }
  });

  it("rejects changed saved public evidence", () => {
    const supplied = options(),
      result = buildOpeningCustomers(fixture(), supplied);
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
  });

  it.each(corePlaceStateIdentities())(
    "uses the same household/public rule for $name ($jurisdictionKey)",
    (identity) => {
      const result = buildOpeningCustomers(
        fixture(),
        options({
          geography: () => ({
            jurisdictionKey: identity.jurisdictionKey,
            region: "national",
            source,
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
  const locality = corePlaceByKey("4840342")!;
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

describe("zero-stock public producer source fixtures", () => {
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
      options(),
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

  it("saves full contract Sources and original terms under actual public contract IDs", () => {
    const original = fixture();
    const input: CoreInput = {
      ...original,
      organizations: original.organizations.map((row) =>
        row.id === "local-office"
          ? { ...row, liquidMinor: p("zero"), outsideFlow: source }
          : row,
      ),
    };
    const result = buildOpeningCustomers(input, options());
    const publicOwner = result.input.organizations.find(
      (row) => row.id === "local-office",
    )!;
    const publicAgreement = JSON.parse(
      publicOwner.governmentFacts!["openingCustomers.agreement:fixture-place"]!,
    );
    for (const [kind, agreement] of [
      ["public.customer.custodial-services", publicAgreement],
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
        options(),
      ),
    ).toThrow("Conflicting public opening customer fact");
  });

  it("preserves actual supplied agreement dates and ends when transient options disappear", () => {
    const original = fixture(),
      supplied = options();
    const reference = buildOpeningCustomers(original, supplied);
    const plan = reference.receipt.contractPlans.find(
      (row) => row.serviceKey === "public-custodial",
    )!;
    const date = {
      id: plan.agreementId,
      dueAt: "2021-01-20",
      basisRecordIds: ["actual-fixture-agreement-calendar"],
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
});

describe("supplied agreement end boundary", () => {
  it("rejects an actual agreement end at its own due boundary", () => {
    const original = fixture(),
      supplied = options(),
      reference = buildOpeningCustomers(original, supplied),
      plan = reference.receipt.contractPlans.find(
        (row) => row.serviceKey === "public-custodial",
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
  it("rejects a missing, moved or pruned provider registry without mutating input", () => {
    const first = buildOpeningCustomers(fixture(), options());
    for (const change of [
      "missing",
      "wrong-owner",
      "pruned",
      "duplicate-alias",
    ] as const) {
      const input = structuredClone(first.input),
        owner = input.organizations.find((row) => row.id === "cleaner")!;
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
      expect(() => buildOpeningCustomers(input, options())).toThrow();
      expect(input).toEqual(before);
    }
  });
  it("retains actual legacy inline witnesses and Sources without migrating saved input", () => {
    const first = buildOpeningCustomers(fixture(), options()),
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
      rebuilt = buildOpeningCustomers(input, options());
    expect(input).toEqual(saved);
    expect(rebuilt.input).toEqual(input);
    expect(rebuilt.receipt.providerQualifications).toEqual([]);
    expect(rebuilt.receipt.inlineProviderQualifications.length).toBeGreaterThan(
      p("zero"),
    );
    expect(before.finance).toEqual(input.finance);
  });
});
