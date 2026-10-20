import { addDays, isoDateFromParts, makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import {
  OPENING_CUSTOMER_QUALIFICATION_PREFIX,
  openingCustomerQualificationKey,
  openingCustomerQualificationRecord,
  openingCustomerQualificationReference,
  type OpeningCustomerAgreementQualification,
  type OpeningCustomerQualificationPlanReference,
  type OpeningCustomerQualificationRecord,
  type OpeningCustomerProviderQualification,
} from "./opening-customer-qualification";
export type { OpeningCustomerProviderQualification } from "./opening-customer-qualification";
import type { LivingCostsRegion } from "./reference/living-costs-data";
import type { FinanceContractInput, FinanceInput } from "./finance-types";
import {
  createOpeningCustomerGeographyProvider,
  type OpeningCustomerGeographyProvider,
  type OpeningCustomerPlaceContext,
} from "./opening-customer-geography";
import { parameter, PARAMETERS, type Parameter } from "./parameters";
import {
  OPENING_COUNTY_BUYER_CLASSIFICATION,
  openingHistoricalCountyPurchaseCoverage,
} from "./opening-public-owner";
import customerDataJson from "./data/opening-customers.json" with { type: "json" };
import type { CoreInput, OrganizationInput, Source } from "./types";

interface HouseholdService {
  key: string;
  label: string;
  contractKind: string;
  componentAnnualParameter: string;
  parentKey: string;
  supplierClassifications: readonly string[];
  supplierOccupations: readonly string[];
  exclusiveRecordedKinds: readonly string[];
  stopgapId: string;
  citation: string;
}

export interface OpeningCustomerData {
  version: string;
  sourceAvailableBy: string;
  generationPriorVintage: string;
  externalInflowKinds: { publicProcurement: string };
  periodMonthsParameter: string;
  agreementLeadDaysParameter: string;
  sizeTopCodeParameter: string;
  settlementPhaseIds: {
    householdPurchases: string;
    publicProcurement: string;
  };
  parents: Readonly<
    Record<
      string,
      {
        nationalParameter: string;
        regionalParameters: Readonly<Record<string, string>>;
        sizeParameters: Readonly<Record<string, string>>;
      }
    >
  >;
  householdServices: readonly HouseholdService[];
  publicPurchases: {
    contractKind: string;
    buyerClassifications: readonly string[];
    governmentKinds: readonly string[];
    supplierClassifications: readonly string[];
    supplierOccupations: readonly string[];
    cleaningBudgetShareParameter: string;
    authorityCoverageParameter: string;
    priorsByJurisdictionKey: Readonly<
      Record<
        string,
        {
          annualBuildingTotalParameter: string;
          populationParameter: string;
          citation: string;
        }
      >
    >;
    fallbackPriorKey: string;
    stopgapId: string;
    practiceCitation: string;
  };
  stopgapIds: readonly string[];
  remainingUnsupported: readonly string[];
  unsupportedExternalDemandByClassification: Readonly<
    Record<
      string,
      {
        stopgapId: string;
        missingSourceInputs: string;
      }
    >
  >;
}

export const DEFAULT_OPENING_CUSTOMER_DATA =
  customerDataJson as OpeningCustomerData;
/** Root admits qualified fragment rows into the single central registry. */
export const DEFAULT_OPENING_CUSTOMER_PARAMETERS = PARAMETERS;

export interface RecordedCustomerProvider {
  id: string;
  organizationId: string;
  serviceKeys: readonly string[];
  source: Source;
}

export interface OpeningCustomerAgreementDate {
  id: string;
  dueAt: string;
  basisRecordIds: readonly string[];
  source: Source;
}

export interface OpeningCustomerAgreementEnd {
  id: string;
  endsAt: string;
  basisRecordIds: readonly string[];
  source: Source;
}

type CustomerExternalInflow = {
  kind: string;
  ownerId: string;
  authorityRecordId: string;
  appropriationRecordId: string;
  agreementRecordId: string;
};

export interface OpeningCustomerOptions {
  /**
   * Two-level opening: households that will be counted, not simulated. They
   * get the same budgets and seller shares as light terms (no qualification
   * evidence or past facts); the collapse merges them into the residents' flows.
   */
  countedHouseholdIds?: ReadonlySet<string>;
  data?: OpeningCustomerData;
  parameters?: Readonly<Record<string, Parameter>>;
  geography?: OpeningCustomerGeographyProvider;
  providerRecords?: readonly RecordedCustomerProvider[];
  /** Only actual supplied agreement ends; source-year statistics imply no expiry. */
  agreementEndsById?: Readonly<Record<string, OpeningCustomerAgreementEnd>>;
  /** Actual supplied first due terms; a statistical vintage cannot choose a date. */
  agreementDatesById?: Readonly<Record<string, OpeningCustomerAgreementDate>>;
  /** A recorded account designation can override the stable office-account convention. */
  publicBuyerIdByGovernmentKey?: Readonly<Record<string, string>>;
}

export type OpeningCustomerContract = FinanceContractInput;

export interface OpeningCustomerEvidenceRecord {
  id: string;
  kind:
    | "household-service-agreement"
    | "public-procurement-authority"
    | "public-appropriation"
    | "public-service-agreement";
  occurredAt: string;
  subjectIds: readonly string[];
  counterpartyIds: readonly string[];
  placeId: string;
  basisRecordIds: readonly string[];
  facts: Readonly<Record<string, string>>;
  source: Source;
}

export interface OpeningCustomerStockRecord {
  cashEntityId: string;
  openedAt: string;
  liquidMinor: number;
  stockSourceRecordId: string;
  economicCoverage: string;
  nonoverlapBasis: string;
  source: Source;
}

export interface OpeningCustomerBuildReceipt {
  version: string;
  status: "OPENING_RECORDS_ONLY_NO_RUNTIME_SETTLEMENT";
  originalCashMinor: number;
  addedCashMinor: number;
  enrichedCashMinor: number;
  preservation: {
    people: readonly {
      id: string;
      householdId: string;
      jobId?: string;
      liquidMinor: number;
      livingCostDailyMinor: number;
    }[];
    organizations: readonly { id: string; liquidMinor: number }[];
    householdIds: readonly string[];
    jobs: CoreInput["jobs"];
    workCommitments: CoreInput["workCommitments"];
    originalContracts: readonly FinanceContractInput[];
    untouchedSections: readonly string[];
  };
  newOrganizationIds: readonly string[];
  newPastFactIds: readonly string[];
  newPlaceMetadataKeys: readonly string[];
  newContractIds: readonly string[];
  preservedBuilderContractIds: readonly string[];
  newStocks: readonly OpeningCustomerStockRecord[];
  /** Only records used in a positive bound seller share, also saved in input metadata. */
  providerRecords: readonly RecordedCustomerProvider[];
  evidence: readonly OpeningCustomerEvidenceRecord[];
  /** One complete record per used canonical provider/service; plans and agreements use refs. */
  providerQualifications: readonly OpeningCustomerQualificationRecord[];
  /** Actual legacy inline witnesses remain on their owning agreements. */
  inlineProviderQualifications: readonly {
    agreementId: string;
    qualifications: readonly OpeningCustomerProviderQualification[];
  }[];
  contractPlans: readonly {
    contractId: string;
    agreementId: string;
    buyerIds: readonly string[];
    sellerId: string;
    serviceKey: string;
    monthlyBudgetMinor: number;
    parameterRefs: readonly string[];
    providerQualification: OpeningCustomerQualificationPlanReference;
    source: Source;
  }[];
  householdBudgets: readonly {
    householdId: string;
    region: LivingCostsRegion;
    originalAssignedMonthlyMinor: number;
    preservedOtherMonthlyTermsMinor: number;
    remainingEnvelopeMonthlyMinor: number;
    sourceRequestedMonthlyMinor: number;
    plannedAddedServiceMonthlyMinor: number;
    unboundServiceMonthlyMinor: number;
  }[];
  publicBudgets: readonly {
    placeId: string;
    coveredOriginalResidentCount: number;
    sourcePriorKey: string;
    monthlyCustodialPoolMinor: number;
    boundMonthlyMinor: number;
    buyerIds: readonly string[];
    parameterRefs: readonly string[];
    originalRepresentedResidentCount?: number;
    sourceUnverifiedResidentCount?: number;
    ownerCoverage?: readonly {
      governmentKey: string;
      representedResidentCount: number;
      basisRecordIds: readonly string[];
      identitySource: Source;
      coverageSource: Source;
    }[];
  }[];
  parameterRefs: readonly string[];
  stopgapIds: readonly string[];
  gaps: readonly string[];
  unsupported: readonly string[];
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, row]) => row !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, row]) => `${JSON.stringify(key)}:${canonical(row)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

/**
 * Pure opening record producer. Seller books, payroll, forecasts, deficits and
 * closure targets are never read. Existing cash, IDs, jobs and schedules win.
 * Monthly budgets can remain unfilled; this function pays nothing and claims
 * no service delivery. A rebuilt enriched opening input adds no records.
 */
export function buildOpeningCustomers(
  input: CoreInput,
  options: OpeningCustomerOptions = {},
): { input: CoreInput; receipt: OpeningCustomerBuildReceipt } {
  const data = options.data ?? DEFAULT_OPENING_CUSTOMER_DATA;
  const registry = options.parameters ?? DEFAULT_OPENING_CUSTOMER_PARAMETERS;
  const usedParameters = new Set<string>();
  const p = (key: string) => {
    const value = parameter(key, registry);
    if (key.startsWith("openingCustomer")) {
      const row = registry[key]!;
      if (
        !["SOURCED", "ESTIMATED", "TUNABLE"].includes(row.tag) ||
        typeof row.citation !== "string" ||
        !row.citation.trim()
      )
        throw new Error(`Customer prior requires source and valid tag: ${key}`);
      if (row.tag === "TUNABLE") {
        const ref = row.checkRange?.ref;
        if (typeof ref !== "string" || !ref.trim())
          throw new Error(
            `Tunable customer prior requires calibration reference: ${key}`,
          );
      }
    }
    usedParameters.add(key);
    return value;
  };
  const zero = p("zero"),
    one = p("one"),
    monthsPerYear = p("monthsPerYear");
  const at = makeIsoDate(input.startedAt);
  const periodMonths = p(data.periodMonthsParameter);
  const leadDays = p(data.agreementLeadDaysParameter);
  for (const phase of Object.values(data.settlementPhaseIds))
    if (!phase.trim())
      throw new Error(
        "Opening customer settlement phases require named DATA entries.",
      );
  if (
    !Number.isSafeInteger(periodMonths) ||
    periodMonths <= zero ||
    !Number.isSafeInteger(leadDays) ||
    leadDays <= zero
  )
    throw new Error(
      "Opening customer cadence and prior-agreement lead require positive registered whole values.",
    );
  if (periodMonths > monthsPerYear || monthsPerYear % periodMonths !== zero)
    throw new Error(
      "Opening customer cadence must divide the registered calendar year; that unit convention is not an agreement expiry.",
    );
  const priorAt = addDays(at, -leadDays);
  const [yearText, monthText] = at.split("-");
  const nextMonth = Number(monthText) - one + periodMonths;
  const dueAt = isoDateFromParts(
    Number(yearText) + Math.floor(nextMonth / monthsPerYear),
    (nextMonth % monthsPerYear) + one,
    one,
  );
  const minor = (value: number, field: string) => {
    if (!Number.isSafeInteger(value) || value < zero)
      throw new Error(`Invalid customer minor units: ${field}`);
  };
  const sum = (values: readonly number[], field: string) => {
    const result = values.reduce((total, row) => total + row, zero);
    minor(result, field);
    return result;
  };
  const sourceValid = (source: Source, field: string) => {
    if (
      !source ||
      !["SOURCED", "ESTIMATED"].includes(source.tag) ||
      typeof source.citation !== "string" ||
      !source.citation.trim() ||
      typeof source.asOf !== "string" ||
      makeIsoDate(source.asOf) > at
    )
      throw new Error(
        `Customer record requires dated nonfuture provenance: ${field}`,
      );
  };
  const index = <T extends { id: string }>(
    rows: readonly T[],
    field: string,
  ) => {
    const result = new Map<string, T>();
    for (const row of rows) {
      if (!row.id || result.has(row.id))
        throw new Error(`Duplicate ${field}: ${row.id}`);
      result.set(row.id, row);
    }
    return result;
  };
  const people = index(input.people, "customer person");
  const households = index(input.households, "customer household");
  const organizations = index(input.organizations, "customer organization");
  const originalContracts = input.finance?.contracts ?? [];
  const contracts = [...originalContracts] as OpeningCustomerContract[];
  const contractById = index(contracts, "customer contract");
  const ownedPrefix = `${data.version}:`;
  const owned = (contract: FinanceContractInput) =>
    contract.id.startsWith(ownedPrefix);
  const existingOriginalCashMinor = sum(
    [
      ...input.people.map((person) => person.liquidMinor),
      ...input.organizations.map((organization) => organization.liquidMinor),
    ],
    "original opening accounts",
  );
  for (const person of people.values()) {
    if (organizations.has(person.id))
      throw new Error(`Ambiguous customer cash entity: ${person.id}`);
    minor(person.liquidMinor, person.id);
    minor(person.livingCostDailyMinor, `${person.id} living-cost plan`);
  }
  for (const organization of organizations.values())
    minor(organization.liquidMinor, organization.id);
  for (const household of households.values()) {
    if (new Set(household.memberIds).size !== household.memberIds.length)
      throw new Error(`Duplicate customer household member: ${household.id}`);
    for (const id of household.memberIds)
      if (people.get(id)?.householdId !== household.id)
        throw new Error(
          `Inconsistent customer household membership: ${household.id}/${id}`,
        );
  }
  for (const contract of contracts) {
    minor(contract.amountMinor, contract.id);
    if (
      !Number.isSafeInteger(contract.periodMonths) ||
      contract.periodMonths <= zero
    )
      throw new Error(
        `Invalid existing customer contract period: ${contract.id}`,
      );
  }
  const providerMetadataPrefix = "openingCustomers.provider:";
  const providerSnapshot = (record: RecordedCustomerProvider) => {
    if (
      !record ||
      typeof record.id !== "string" ||
      !record.id.trim() ||
      typeof record.organizationId !== "string" ||
      !organizations.has(record.organizationId) ||
      !Array.isArray(record.serviceKeys) ||
      !record.serviceKeys.length ||
      record.serviceKeys.some((key) => typeof key !== "string" || !key.trim())
    )
      throw new Error(`Invalid recorded customer provider: ${record?.id}`);
    sourceValid(record.source, record.id);
    return {
      id: record.id,
      organizationId: record.organizationId,
      serviceKeys: [...record.serviceKeys],
      source: { ...record.source },
    } satisfies RecordedCustomerProvider;
  };
  const providerRecords = new Map<string, RecordedCustomerProvider>();
  // Re-enrichment reads the actual records saved by the first build. Transient
  // options are not the only copy of evidence that qualified an agreement.
  for (const [key, value] of Object.entries(input.placeMetadata ?? {})) {
    if (!key.startsWith(providerMetadataPrefix)) continue;
    let parsed: RecordedCustomerProvider;
    try {
      parsed = JSON.parse(value) as RecordedCustomerProvider;
    } catch {
      throw new Error(`Invalid saved opening customer provider: ${key}`);
    }
    const record = providerSnapshot(parsed);
    if (key !== `${providerMetadataPrefix}${record.id}`)
      throw new Error(`Conflicting saved opening customer provider ID: ${key}`);
    providerRecords.set(record.id, record);
  }
  const suppliedProviderRecords = index(
    options.providerRecords ?? [],
    "recorded customer provider",
  );
  for (const supplied of suppliedProviderRecords.values()) {
    const record = providerSnapshot(supplied);
    const saved = providerRecords.get(record.id);
    if (saved && canonical(saved) !== canonical(record))
      throw new Error(
        `Conflicting opening customer provider record: ${record.id}`,
      );
    providerRecords.set(record.id, record);
  }
  const ownedOccupationJobs = new Map<string, CoreInput["jobs"][number][]>();
  for (const job of input.jobs) {
    if (
      job.endsAt ||
      people.get(job.personId)?.jobId !== job.id ||
      !job.occupationClassification
    )
      continue;
    const rows = ownedOccupationJobs.get(job.organizationId) ?? [];
    rows.push(job);
    ownedOccupationJobs.set(job.organizationId, rows);
  }
  // A seller's capacity as its record shows it: the daily wages of its current
  // jobs (payroll is a fixed share of a business's sales, so it ranks sales).
  const payrollByOrganization = new Map<string, number>();
  for (const job of input.jobs) {
    if (job.endsAt) continue;
    payrollByOrganization.set(
      job.organizationId,
      (payrollByOrganization.get(job.organizationId) ?? zero) +
        job.wageDailyMinor,
    );
  }
  const providersByOrganization = new Map<string, RecordedCustomerProvider[]>();
  for (const provider of providerRecords.values()) {
    const rows = providersByOrganization.get(provider.organizationId) ?? [];
    rows.push(provider);
    providersByOrganization.set(provider.organizationId, rows);
  }
  const providerQualifications = new Map<
    string,
    OpeningCustomerProviderQualification
  >();
  // Preflight the actual provider-owned registry once. Frozen witnesses are
  // never recomputed from a changed current staff roster during enrichment.
  const qualificationRecords = new Map<
    string,
    OpeningCustomerQualificationRecord
  >();
  const qualificationReferences = new Map<
    string,
    ReturnType<typeof openingCustomerQualificationReference>
  >();
  const referenceFor = (record: OpeningCustomerQualificationRecord) => {
    let ref = qualificationReferences.get(record.qualificationId);
    if (!ref) {
      ref = openingCustomerQualificationReference(record);
      qualificationReferences.set(record.qualificationId, ref);
    }
    return ref;
  };
  const qualificationIds = new Set<string>();
  const jobsById = index(input.jobs, "qualification job");
  const checkQualification = (q: OpeningCustomerProviderQualification) => {
    openingCustomerQualificationRecord({
      qualificationId: "inline-shape-check",
      ...q,
    });
    for (const basis of q.sources) {
      sourceValid(basis.source, basis.recordId);
      if (basis.kind === "job") {
        const actual = jobsById.get(basis.recordId);
        if (
          !actual ||
          actual.organizationId !== q.organizationId ||
          actual.occupationClassification !== basis.occupationClassification ||
          canonical(actual.source) !== canonical(basis.source)
        )
          throw new Error(
            `Conflicting saved customer qualification job: ${basis.recordId}`,
          );
      } else {
        const actual = providerRecords.get(basis.recordId);
        if (
          !actual ||
          actual.organizationId !== q.organizationId ||
          !actual.serviceKeys.includes(q.serviceKey) ||
          canonical(actual.source) !== canonical(basis.source)
        )
          throw new Error(
            `Conflicting opening customer past fact: saved provider qualification ${basis.recordId}`,
          );
      }
    }
  };
  for (const owner of organizations.values()) {
    for (const [key, raw] of Object.entries(owner.governmentFacts ?? {})) {
      if (!key.startsWith(OPENING_CUSTOMER_QUALIFICATION_PREFIX)) continue;
      let record: OpeningCustomerQualificationRecord;
      try {
        record = openingCustomerQualificationRecord(JSON.parse(raw));
      } catch {
        throw new Error(
          `Invalid saved customer qualification registry: ${owner.id}/${key}`,
        );
      }
      const scope = canonical([record.organizationId, record.serviceKey]);
      if (
        record.organizationId !== owner.id ||
        key !== openingCustomerQualificationKey(record.qualificationId) ||
        qualificationIds.has(record.qualificationId) ||
        qualificationRecords.has(scope)
      )
        throw new Error(
          `Conflicting saved customer qualification registry: ${owner.id}/${key}`,
        );
      checkQualification(record);
      qualificationIds.add(record.qualificationId);
      qualificationRecords.set(scope, record);
    }
  }
  const savedAgreementQualifications = new Map<
    string,
    readonly OpeningCustomerAgreementQualification[]
  >();
  const inlineScopes = new Map<string, OpeningCustomerProviderQualification>();
  const rememberAgreement = (id: string, value: unknown) => {
    if (!Array.isArray(value))
      throw new Error(`Invalid saved customer qualifications: ${id}`);
    const rows = value as OpeningCustomerAgreementQualification[];
    const prior = savedAgreementQualifications.get(id);
    if (prior && canonical(prior) !== canonical(rows))
      throw new Error(`Conflicting saved customer qualifications: ${id}`);
    const scopes = new Set<string>();
    for (const q of rows) {
      if (!q || !organizations.has(q.organizationId) || !q.serviceKey?.trim())
        throw new Error(`Invalid saved customer qualifications: ${id}`);
      const scope = canonical([q.organizationId, q.serviceKey]);
      if (scopes.has(scope))
        throw new Error(`Duplicate saved customer qualification: ${id}`);
      scopes.add(scope);
      if ("qualificationId" in q) {
        const record = qualificationRecords.get(scope);
        if (!record || canonical(referenceFor(record)) !== canonical(q))
          throw new Error(
            `Conflicting saved customer qualification reference: ${id}`,
          );
      } else {
        checkQualification(q);
        inlineScopes.set(scope, q);
      }
    }
    savedAgreementQualifications.set(id, rows);
  };
  // Preserve the complete original inline rows on each actual owning agreement.
  for (const person of input.people)
    for (const fact of person.pastFacts ?? [])
      if (
        fact.kind === "household-service-agreement" &&
        fact.facts?.providerQualifications !== undefined
      ) {
        try {
          rememberAgreement(
            fact.id,
            JSON.parse(fact.facts.providerQualifications),
          );
        } catch (error) {
          throw new Error(`Invalid saved customer qualifications: ${fact.id}`, {
            cause: error,
          });
        }
      }
  for (const owner of input.organizations)
    for (const [key, raw] of Object.entries(owner.governmentFacts ?? {}))
      if (key.startsWith("openingCustomers.agreement:")) {
        const record = JSON.parse(raw) as {
          id: string;
          providerQualifications: unknown;
        };
        rememberAgreement(record.id, record.providerQualifications);
      }
  const usedQualificationRecords = new Map<
    string,
    OpeningCustomerQualificationRecord
  >();
  const usedInlineQualifications = new Map<
    string,
    OpeningCustomerProviderQualification[]
  >();
  const qualificationFor = (
    q: OpeningCustomerAgreementQualification,
  ): OpeningCustomerProviderQualification =>
    "qualificationId" in q
      ? qualificationRecords.get(canonical([q.organizationId, q.serviceKey]))!
      : q;
  const saveQualification = (q: OpeningCustomerProviderQualification) => {
    const scope = canonical([q.organizationId, q.serviceKey]);
    let record = qualificationRecords.get(scope);
    if (!record) {
      const qualificationId = stableHash(
        canonical([
          data.version,
          "provider-qualification",
          q.organizationId,
          q.serviceKey,
        ]),
      );
      if (qualificationIds.has(qualificationId))
        throw new Error(
          `Duplicate customer qualification ID: ${qualificationId}`,
        );
      record = openingCustomerQualificationRecord({ qualificationId, ...q });
      const owner = organizations.get(q.organizationId)!;
      const key = openingCustomerQualificationKey(qualificationId);
      if (owner.governmentFacts?.[key] !== undefined)
        throw new Error(
          `Conflicting customer qualification registration: ${qualificationId}`,
        );
      organizations.set(owner.id, {
        ...owner,
        governmentFacts: Object.freeze({
          ...owner.governmentFacts,
          [key]: canonical(record),
        }),
      });
      qualificationIds.add(qualificationId);
      qualificationRecords.set(scope, record);
    }
    usedQualificationRecords.set(record.qualificationId, record);
    return referenceFor(record);
  };
  const supplierIndex = new Map<string, OrganizationInput[]>();
  for (const organization of organizations.values()) {
    const key = canonical([organization.placeId, organization.classification]);
    const rows = supplierIndex.get(key) ?? [];
    rows.push(organization);
    supplierIndex.set(key, rows);
  }
  const suppliers = (
    placeId: string,
    classes: readonly string[],
    occupations: readonly string[],
    serviceKey: string,
  ) => {
    const found = new Map<string, OrganizationInput>();
    for (const classification of classes) {
      for (const candidate of supplierIndex.get(
        canonical([placeId, classification]),
      ) ?? []) {
        if (!candidate.name.trim()) continue;
        const frozen =
          qualificationRecords.get(canonical([candidate.id, serviceKey])) ??
          inlineScopes.get(canonical([candidate.id, serviceKey]));
        if (frozen) {
          if (
            frozen.sources.some(
              (basis) =>
                basis.kind === "job" &&
                !occupations.includes(basis.occupationClassification!),
            )
          )
            throw new Error(
              `Saved customer qualification has another product scope: ${candidate.id}/${serviceKey}`,
            );
          sourceValid(candidate.source, candidate.id);
          providerQualifications.set(
            canonical([candidate.id, serviceKey]),
            frozen,
          );
          found.set(candidate.id, candidate);
          continue;
        }
        const jobs = (ownedOccupationJobs.get(candidate.id) ?? [])
          .filter((job) => occupations.includes(job.occupationClassification!))
          .sort((left, right) => left.id.localeCompare(right.id));
        // An actual owned product occupation is sufficient. Explicit records
        // are used only when needed; redundant or unrelated options are not saved.
        const records = jobs.length
          ? []
          : (providersByOrganization.get(candidate.id) ?? [])
              .filter((record) => record.serviceKeys.includes(serviceKey))
              .sort((left, right) => left.id.localeCompare(right.id));
        if (!jobs.length && !records.length) continue;
        sourceValid(candidate.source, candidate.id);
        providerQualifications.set(canonical([candidate.id, serviceKey]), {
          organizationId: candidate.id,
          serviceKey,
          jobIds: jobs.map((job) => job.id),
          providerRecordIds: records.map((record) => record.id),
          sources: [
            ...jobs.map((job) => ({
              recordId: job.id,
              kind: "job" as const,
              occupationClassification: job.occupationClassification,
              source: { ...job.source },
            })),
            ...records.map((record) => ({
              recordId: record.id,
              kind: "recorded-provider" as const,
              source: { ...record.source },
            })),
          ],
        });
        found.set(candidate.id, candidate);
      }
    }
    return [...found.values()].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  };
  const gaps = new Set<string>();
  for (const organization of input.organizations) {
    const missing =
      data.unsupportedExternalDemandByClassification[
        organization.classification ?? ""
      ];
    if (missing)
      gaps.add(
        `opening-customers:missing-source-owned-product-buyer-price-qualification:${organization.id}:${organization.classification}:${missing.stopgapId}`,
      );
  }
  if (makeIsoDate(data.sourceAvailableBy) > at)
    gaps.add(
      "opening-customers:later-statistical-vintages-are-generation-priors-not-date-available-actor-facts",
    );
  const contexts = new Map<string, OpeningCustomerPlaceContext | undefined>();
  const geography =
    options.geography ?? createOpeningCustomerGeographyProvider();
  const contextFor = (placeId: string) => {
    if (!contexts.has(placeId)) {
      const context = geography(placeId, input);
      if (context) sourceValid(context.source, `place ${placeId}`);
      contexts.set(placeId, context);
    }
    return contexts.get(placeId);
  };
  const newOrganizationIds: string[] = [],
    newPastFactIds: string[] = [],
    newContractIds: string[] = [];
  const newPlaceMetadataKeys: string[] = [];
  const placeMetadata = { ...(input.placeMetadata ?? {}) };
  const appendMetadata = (key: string, record: unknown) => {
    const value = canonical(record);
    if (placeMetadata[key] !== undefined) {
      if (placeMetadata[key] !== value)
        throw new Error(`Conflicting opening customer metadata: ${key}`);
      return false;
    }
    placeMetadata[key] = value;
    newPlaceMetadataKeys.push(key);
    return true;
  };
  const agreementCalendar = (
    agreementId: string,
    defaultDueAt: string,
    defaultSource?: Source,
  ) => {
    const read = <T>(key: string): T | undefined => {
      if (placeMetadata[key] === undefined) return undefined;
      try {
        return JSON.parse(placeMetadata[key]) as T;
      } catch {
        throw new Error(`Invalid saved customer calendar record: ${key}`);
      }
    };
    const dateKey = `openingCustomers.date:${agreementId}`;
    const dateRecord =
      options.agreementDatesById?.[agreementId] ??
      read<OpeningCustomerAgreementDate>(dateKey);
    const endKey = `openingCustomers.end:${agreementId}`;
    const endRecord =
      options.agreementEndsById?.[agreementId] ??
      read<OpeningCustomerAgreementEnd>(endKey);
    const validBasis = (ids: readonly string[]) =>
      Array.isArray(ids) &&
      ids.length > zero &&
      ids.every((id) => typeof id === "string" && !!id.trim()) &&
      new Set(ids).size === ids.length;
    const sources: Source[] = [];
    const basisRecordIds: string[] = [];
    const firstDueAt = makeIsoDate(dateRecord?.dueAt ?? defaultDueAt);
    if (dateRecord) {
      sourceValid(dateRecord.source, agreementId);
      if (
        dateRecord.id !== agreementId ||
        !validBasis(dateRecord.basisRecordIds) ||
        firstDueAt < at
      )
        throw new Error(
          `Invalid actual customer agreement date: ${agreementId}`,
        );
      appendMetadata(dateKey, dateRecord);
      sources.push(dateRecord.source);
      basisRecordIds.push(...dateRecord.basisRecordIds);
    } else {
      sources.push(
        defaultSource ?? {
          tag: "ESTIMATED",
          asOf: at,
          citation:
            "Explicit nonhousehold first-next-period-month opening agreement convention. SG-P8-customer-due-calendar-renewal",
          estimatedFrom:
            "The public opening agreement has its own modeled first due date. Annual expenditure statistics do not observe an invoice day, actual payment, legal appropriation, expiry or renewal.",
        },
      );
    }
    const end: { endsAt?: string } = {};
    if (endRecord) {
      sourceValid(endRecord.source, agreementId);
      if (
        endRecord.id !== agreementId ||
        !validBasis(endRecord.basisRecordIds) ||
        makeIsoDate(endRecord.endsAt) <= firstDueAt
      )
        throw new Error(
          `Invalid actual customer agreement end: ${agreementId}`,
        );
      appendMetadata(endKey, endRecord);
      sources.push(endRecord.source);
      basisRecordIds.push(...endRecord.basisRecordIds);
      end.endsAt = makeIsoDate(endRecord.endsAt);
    }
    return {
      firstDueAt,
      end,
      sources,
      basisRecordIds: [...new Set(basisRecordIds)].sort(),
      actualSuppliedDate: dateRecord !== undefined,
    };
  };
  const preservedBuilderContractIds: string[] = [];
  const evidence: OpeningCustomerEvidenceRecord[] = [];
  const newStocks: OpeningCustomerStockRecord[] = [];
  const usedProviderRecords = new Map<string, RecordedCustomerProvider>();
  const plans: OpeningCustomerBuildReceipt["contractPlans"][number][] = [];
  const householdBudgets: OpeningCustomerBuildReceipt["householdBudgets"][number][] =
    [];
  const publicBudgets: OpeningCustomerBuildReceipt["publicBudgets"][number][] =
    [];
  const generatedSource = (citation: string, description: string): Source => ({
    tag: "ESTIMATED",
    asOf: priorAt,
    generationPriorVintage: data.generationPriorVintage,
    citation,
    estimatedFrom: `${description} Opening plans and fictional recorded terms only; no paid receipt, delivery, actual historical bill, survival target, or observed individual demand is implied. Each due date retains its own calendar evidence; a source year is no agreement end.`,
  });
  const countedSources = new Map<string, Source>();
  const countedSource = (citation: string): Source => {
    let source = countedSources.get(citation);
    if (!source) {
      source = {
        tag: "ESTIMATED",
        asOf: at,
        citation,
        estimatedFrom:
          "The household's share of the BLS Consumer Expenditure Survey budget for this service, split among the town's sellers of it by each seller's recorded payroll (its capacity); part of its everyday living (cost-of-living.ts), where the amount follows the sellers' prices and the household's pay, or of the residents' purchase flows for a counted household.",
      };
      countedSources.set(citation, source);
    }
    return source;
  };
  const householdContractIds = new Set<string>();
  const appendContract = (contract: OpeningCustomerContract) => {
    const existing = contractById.get(contract.id);
    if (existing) {
      if (canonical(existing) !== canonical(contract))
        throw new Error(
          `Conflicting opening customer contract: ${contract.id}`,
        );
      preservedBuilderContractIds.push(contract.id);
      return false;
    }
    for (const id of [...contract.payerIds, contract.payeeId])
      if (!people.has(id) && !organizations.has(id))
        throw new Error(
          `Missing opening customer cash endpoint: ${contract.id}/${id}`,
        );
    if (
      new Set(contract.payerIds).size !== contract.payerIds.length ||
      contract.payerIds.includes(contract.payeeId) ||
      !contract.payerIds.length
    )
      throw new Error(`Invalid opening customer counterparty: ${contract.id}`);
    sourceValid(contract.source, contract.id);
    minor(contract.amountMinor, contract.id);
    contracts.push(contract);
    contractById.set(contract.id, contract);
    newContractIds.push(contract.id);
    return true;
  };
  const apportion = (
    total: number,
    weights: readonly { id: string; weight: number }[],
  ) => {
    minor(total, "customer budget apportionment");
    const totalWeight = weights.reduce(
      (value, row) => value + row.weight,
      zero,
    );
    if (totalWeight <= zero) return [];
    const rows = weights.map((row) => {
      if (!Number.isFinite(row.weight) || row.weight < zero)
        throw new Error(`Invalid customer budget weight: ${row.id}`);
      const exact = total * (row.weight / totalWeight),
        amount = Math.floor(exact);
      return { id: row.id, amount, remainder: exact - amount };
    });
    let remainder =
      total -
      sum(
        rows.map((row) => row.amount),
        "customer budget floors",
      );
    for (const row of [...rows].sort(
      (left, right) =>
        right.remainder - left.remainder || left.id.localeCompare(right.id),
    )) {
      if (remainder <= zero) break;
      row.amount += one;
      remainder -= one;
    }
    if (
      remainder !== zero ||
      sum(
        rows.map((row) => row.amount),
        "customer apportioned budget",
      ) !== total
    )
      throw new Error("Customer budget allocation lost minor units.");
    return rows;
  };
  const bindBudget = (args: {
    buyerIds: readonly string[];
    householdId?: string;
    sellerRows: readonly OrganizationInput[];
    budgetMonthlyMinor: number;
    kind: string;
    serviceKey: string;
    agreementId: string;
    source: Source;
    parameterRefs: readonly string[];
    phase: string;
    externalInflow?: CustomerExternalInflow;
    firstDueAt?: string;
    firstDueSource?: Source;
  }) => {
    const calendar = agreementCalendar(
      args.agreementId,
      args.firstDueAt ?? dueAt,
      args.firstDueSource,
    );
    const { end } = calendar;
    const fullSource: Source = {
      ...args.source,
      tag: "ESTIMATED",
      asOf: at,
      generationPriorVintage:
        [
          args.source.generationPriorVintage,
          ...calendar.sources.map((row) => row.generationPriorVintage),
        ]
          .filter(Boolean)
          .join("; ") || undefined,
      citation: [
        args.source.citation,
        ...calendar.sources.map((row) => row.citation),
      ].join(" "),
      estimatedFrom: [
        args.source.estimatedFrom,
        ...calendar.sources.map((row) => row.estimatedFrom),
        `Calendar basis records: ${canonical(calendar.basisRecordIds)}.`,
      ]
        .filter(Boolean)
        .join(" "),
    };
    const source = fullSource;
    const contractAmountsMinor: Record<string, number> = {};
    const contractSourceMap: Record<string, Source> = {};
    const contractTermsById: Record<
      string,
      {
        payerIds: readonly string[];
        payeeId: string;
        kind: string;
        amountMinor: number;
        firstDueAt: string;
        periodMonths: number;
        endsAt?: string;
        settlementPhaseId?: string;
      }
    > = {};
    const contractIds: string[] = [];
    const addedIds: string[] = [];
    const qualifications: OpeningCustomerAgreementQualification[] = [];
    for (const share of apportion(
      args.budgetMonthlyMinor,
      args.sellerRows.map((row) => ({ id: row.id, weight: one })),
    )) {
      if (share.amount <= zero) continue;
      const savedRows = savedAgreementQualifications.get(args.agreementId);
      const saved = savedRows?.find(
        (q) =>
          q.organizationId === share.id && q.serviceKey === args.serviceKey,
      );
      if (savedRows && !saved)
        throw new Error(
          `Saved customer agreement omitted its provider: ${args.agreementId}/${share.id}`,
        );
      const qualification = saved
        ? qualificationFor(saved)
        : providerQualifications.get(canonical([share.id, args.serviceKey]));
      if (!qualification)
        throw new Error(
          `Missing actual customer product qualification: ${share.id}/${args.serviceKey}`,
        );
      // Validate the actual job source only when its product scope is used in
      // a positive seller share. Unrelated employment is not scope evidence.
      for (const basis of qualification.sources)
        sourceValid(basis.source, basis.recordId);
      for (const id of qualification.providerRecordIds) {
        const record = providerRecords.get(id)!;
        appendMetadata(`${providerMetadataPrefix}${id}`, record);
        usedProviderRecords.set(id, record);
      }
      const agreementQualification = saved ?? saveQualification(qualification);
      qualifications.push(agreementQualification);
      let planQualification: OpeningCustomerQualificationPlanReference;
      if ("qualificationId" in agreementQualification) {
        const record = qualificationRecords.get(
          canonical([share.id, args.serviceKey]),
        )!;
        usedQualificationRecords.set(record.qualificationId, record);
        planQualification = agreementQualification;
      } else {
        const rows = usedInlineQualifications.get(args.agreementId) ?? [];
        rows.push(agreementQualification);
        usedInlineQualifications.set(args.agreementId, rows);
        planQualification = {
          agreementId: args.agreementId,
          organizationId: share.id,
          serviceKey: args.serviceKey,
        };
      }
      const contract: OpeningCustomerContract = {
        id: `${args.agreementId}:contract:${share.id}`,
        ...(args.householdId ? { householdId: args.householdId } : {}),
        payerIds: args.buyerIds,
        payeeId: share.id,
        kind: args.kind,
        amountMinor: sum(
          [share.amount * periodMonths],
          "customer cadence amount",
        ),
        dueAt: calendar.firstDueAt,
        periodMonths,
        ...end,
        accruesArrears: false,
        marketAdjusted: false,
        salesReceipt: true,
        salesReceiptBudget: false,
        settlementPhaseId: args.phase,
        source: {
          ...source,
          citation: `${source.citation} Prior agreement ${args.agreementId}; seller ${share.id}.`,
        },
      };
      if (args.externalInflow)
        contract.externalInflow = {
          ...args.externalInflow,
          source: contract.source,
        };
      contractAmountsMinor[contract.id] = contract.amountMinor;
      // Full standing Sources and original terms are keyed by actual contract
      // IDs. A provider/job Source is independent product evidence, never a
      // substitute for a contract's Source after dueAt advances in a save.
      contractSourceMap[contract.id] = { ...contract.source };
      contractTermsById[contract.id] = {
        payerIds: [...contract.payerIds],
        payeeId: contract.payeeId,
        kind: contract.kind,
        amountMinor: contract.amountMinor,
        firstDueAt: contract.dueAt,
        periodMonths: contract.periodMonths,
        ...(contract.endsAt === undefined ? {} : { endsAt: contract.endsAt }),
        ...(contract.settlementPhaseId === undefined
          ? {}
          : { settlementPhaseId: contract.settlementPhaseId }),
      };
      contractIds.push(contract.id);
      if (appendContract(contract)) addedIds.push(contract.id);
      plans.push({
        contractId: contract.id,
        agreementId: args.agreementId,
        buyerIds: args.buyerIds,
        sellerId: share.id,
        serviceKey: args.serviceKey,
        monthlyBudgetMinor: share.amount,
        parameterRefs: args.parameterRefs,
        providerQualification: planQualification,
        source: contract.source,
      });
    }
    return {
      contractIds,
      contractAmountsMinor,
      contractSourceMap,
      contractTermsById,
      addedIds,
      qualifications,
      end,
      source,
      firstDueAt: calendar.firstDueAt,
      calendarBasisIds: calendar.basisRecordIds,
    };
  };
  const qualificationBasisIds = (
    rows: readonly OpeningCustomerAgreementQualification[],
  ) =>
    [
      ...new Set(
        rows.flatMap((row) => {
          const full = qualificationFor(row);
          return [...full.jobIds, ...full.providerRecordIds];
        }),
      ),
    ].sort();
  const qualificationSellerIds = (
    rows: readonly OpeningCustomerAgreementQualification[],
  ) => rows.map((row) => row.organizationId);
  const qualificationFacts = (
    rows: readonly OpeningCustomerAgreementQualification[],
  ) => ({
    providerQualifications: canonical(rows),
  });
  const householdTerms = new Map<string, FinanceContractInput[]>();
  for (const contract of originalContracts) {
    if (!contract.householdId) continue;
    const rows = householdTerms.get(contract.householdId) ?? [];
    rows.push(contract);
    householdTerms.set(contract.householdId, rows);
  }
  const serviceKeys = new Set(data.householdServices.map((row) => row.key));
  const serviceKinds = new Set(
    data.householdServices.map((row) => row.contractKind),
  );
  if (
    serviceKeys.size !== data.householdServices.length ||
    serviceKinds.size !== data.householdServices.length
  )
    throw new Error("Duplicate opening customer service key/kind.");
  for (const household of households.values()) {
    const members = household.memberIds.map((id) => people.get(id)!);
    const payers = members.filter(
      (person) =>
        person.livingCostDailyMinor > zero &&
        makeIsoDate(person.birthDate) <= priorAt,
    );
    if (!payers.length) {
      gaps.add(
        `opening-customers:no-established-living-cost-payer:${household.id}`,
      );
      continue;
    }
    const priorTerms = householdTerms.get(household.id) ?? [];
    const existingOtherMonthly = priorTerms
      .filter((row) => !owned(row))
      .reduce((total, row) => total + row.amountMinor / row.periodMonths, zero);
    const assignedMonthly = Math.round(
      (sum(
        payers.map((person) => person.livingCostDailyMinor),
        "household original daily plan",
      ) *
        p("daysPerMeanYear")) /
        monthsPerYear,
    );
    const available = Math.max(
      zero,
      Math.floor(assignedMonthly - existingOtherMonthly),
    );
    const context = contextFor(household.placeId),
      region = context?.region ?? "national";
    if (region === "national")
      gaps.add(
        `opening-customers:national-service-prior-not-local-observation:${household.placeId}`,
      );
    const sizeKey =
      members.length >= p(data.sizeTopCodeParameter)
        ? "5plus"
        : String(members.length);
    const needs = data.householdServices
      .filter(
        (service) =>
          !priorTerms.some(
            (contract) =>
              !owned(contract) &&
              service.exclusiveRecordedKinds.includes(contract.kind),
          ),
      )
      .map((service) => {
        const parent = data.parents[service.parentKey];
        if (
          !parent ||
          !parent.sizeParameters[sizeKey] ||
          !parent.regionalParameters[region]
        )
          throw new Error(
            `Missing source-qualified customer category prior: ${service.key}/${sizeKey}/${region}`,
          );
        const refs = [
          service.componentAnnualParameter,
          parent.sizeParameters[sizeKey]!,
          parent.regionalParameters[region]!,
          parent.nationalParameter,
        ];
        const national = p(parent.nationalParameter);
        if (national <= zero)
          throw new Error(
            `Invalid customer parent national mean: ${service.parentKey}`,
          );
        const annual =
          p(service.componentAnnualParameter) *
          (p(parent.sizeParameters[sizeKey]!) / national) *
          (p(parent.regionalParameters[region]!) / national);
        if (!Number.isFinite(annual) || annual < zero)
          throw new Error(`Invalid customer annual component: ${service.key}`);
        return {
          service,
          monthly: Math.round((annual * p("minorPerDollar")) / monthsPerYear),
          refs,
        };
      });
    const requested = sum(
      needs.map((row) => row.monthly),
      "source service budgets",
    );
    const allocations = apportion(
      Math.min(available, requested),
      needs.map((row) => ({ id: row.service.key, weight: row.monthly })),
    );
    let bound = zero;
    for (const allocation of allocations) {
      if (allocation.amount <= zero) continue;
      const need = needs.find((row) => row.service.key === allocation.id)!;
      const service = need.service;
      const sellerRows = suppliers(
        household.placeId,
        service.supplierClassifications,
        service.supplierOccupations,
        service.key,
      );
      if (!sellerRows.length) {
        gaps.add(
          `opening-customers:no-product-compatible-provider:${household.placeId}:${service.key}`,
        );
        continue;
      }
      const agreementId = `${ownedPrefix}household:${household.id}:${service.key}`;
      // Seller shares weigh each seller's recorded capacity (its payroll); a
      // seller with no recorded jobs takes the average of those that have
      // them. The core folds a household's purchases into its everyday living
      // (cost-of-living.ts), where the amount follows prices and pay.
      const recorded = sellerRows
        .map((row) => payrollByOrganization.get(row.id) ?? zero)
        .filter((payroll) => payroll > zero);
      const average = recorded.length
        ? sum(recorded, "seller capacity") / recorded.length
        : one;
      for (const share of apportion(
        allocation.amount,
        sellerRows.map((row) => ({
          id: row.id,
          weight:
            (payrollByOrganization.get(row.id) ?? zero) > zero
              ? payrollByOrganization.get(row.id)!
              : average,
        })),
      )) {
        if (share.amount <= zero) continue;
        householdContractIds.add(`${agreementId}:contract:${share.id}`);
        appendContract({
          id: `${agreementId}:contract:${share.id}`,
          householdId: household.id,
          payerIds: payers.map((person) => person.id),
          payeeId: share.id,
          kind: service.contractKind,
          amountMinor: share.amount * periodMonths,
          dueAt,
          periodMonths,
          accruesArrears: false,
          marketAdjusted: false,
          salesReceipt: true,
          salesReceiptBudget: false,
          settlementPhaseId: data.settlementPhaseIds.householdPurchases,
          source: countedSource(service.citation),
        });
      }
      bound += allocation.amount;
    }
    householdBudgets.push({
      householdId: household.id,
      region,
      originalAssignedMonthlyMinor: assignedMonthly,
      preservedOtherMonthlyTermsMinor: existingOtherMonthly,
      remainingEnvelopeMonthlyMinor: available,
      sourceRequestedMonthlyMinor: requested,
      plannedAddedServiceMonthlyMinor: bound,
      unboundServiceMonthlyMinor: Math.min(available, requested) - bound,
    });
  }
  const residentsByPlace = new Map<string, number>();
  for (const person of input.people)
    residentsByPlace.set(
      person.placeId,
      (residentsByPlace.get(person.placeId) ?? zero) + one,
    );
  const publicRule = data.publicPurchases;
  interface PublicAccountGroup {
    accounts: OrganizationInput[];
    representedResidentCount: number;
    basisRecordIds: readonly string[];
    identitySource?: Source;
    coverageSource?: Source;
  }
  const governmentAccountsByPlace = new Map<
    string,
    Map<string, PublicAccountGroup>
  >();
  for (const organization of input.organizations) {
    if (
      !publicRule.buyerClassifications.includes(
        organization.classification ?? "",
      )
    )
      continue;
    const facts = organization.governmentFacts;
    if (
      !facts ||
      !publicRule.governmentKinds.includes(facts.governmentKind ?? "") ||
      !facts.governmentKey?.trim() ||
      !facts.governmentJurisdictionId?.trim()
    ) {
      gaps.add(
        `opening-customers:public-office-needs-actual-owner-identity:${organization.id}`,
      );
      continue;
    }
    const coverage =
      organization.classification === OPENING_COUNTY_BUYER_CLASSIFICATION
        ? openingHistoricalCountyPurchaseCoverage(organization, input)
        : {
            rows: [
              {
                placeId: organization.placeId,
                representedResidentCount:
                  residentsByPlace.get(organization.placeId) ?? zero,
                basisRecordIds: [] as readonly string[],
                identitySource: undefined,
                coverageSource: undefined,
              },
            ],
            gaps: [] as readonly string[],
          };
    for (const gap of coverage.gaps) gaps.add(gap);
    for (const row of coverage.rows) {
      const groups =
        governmentAccountsByPlace.get(row.placeId) ??
        new Map<string, PublicAccountGroup>();
      const group = groups.get(facts.governmentKey);
      if (group) {
        if (group.representedResidentCount !== row.representedResidentCount)
          throw new Error(
            `Conflicting represented public owner coverage: ${facts.governmentKey}/${row.placeId}`,
          );
        group.accounts.push(organization);
      } else {
        groups.set(facts.governmentKey, {
          accounts: [organization],
          representedResidentCount: row.representedResidentCount,
          basisRecordIds: row.basisRecordIds,
          identitySource: row.identitySource,
          coverageSource: row.coverageSource,
        });
      }
      governmentAccountsByPlace.set(row.placeId, groups);
    }
  }
  const cleaningShare = p(publicRule.cleaningBudgetShareParameter),
    authorityCoverage = p(publicRule.authorityCoverageParameter);
  if (
    cleaningShare < zero ||
    cleaningShare > one ||
    authorityCoverage < zero ||
    authorityCoverage > one
  )
    throw new Error(
      "Public customer budget fractions require registered values within zero and one.",
    );
  for (const [placeId, groups] of governmentAccountsByPlace) {
    const residentCount = residentsByPlace.get(placeId) ?? zero;
    if (residentCount <= zero) {
      gaps.add(
        `opening-customers:no-represented-public-budget-population:${placeId}`,
      );
      continue;
    }
    const context = contextFor(placeId),
      key = context?.jurisdictionKey ?? publicRule.fallbackPriorKey;
    const selectedKey = publicRule.priorsByJurisdictionKey[key]
      ? key
      : publicRule.fallbackPriorKey;
    if (selectedKey === publicRule.fallbackPriorKey)
      gaps.add(
        `opening-customers:national-public-building-prior-not-local-appropriation:${placeId}`,
      );
    const prior = publicRule.priorsByJurisdictionKey[selectedKey];
    if (!prior)
      throw new Error("Public customer national budget fallback is missing.");
    const refs = [
      prior.annualBuildingTotalParameter,
      prior.populationParameter,
      publicRule.cleaningBudgetShareParameter,
      publicRule.authorityCoverageParameter,
    ];
    const population = p(prior.populationParameter);
    if (population <= zero)
      throw new Error(
        `Invalid public customer population denominator: ${selectedKey}`,
      );
    const monthlyPool = Math.floor(
      ((p(prior.annualBuildingTotalParameter) / population) *
        residentCount *
        cleaningShare *
        authorityCoverage *
        p("minorPerDollar")) /
        monthsPerYear,
    );
    minor(monthlyPool, "public custodial own-budget pool");
    // One place pool remains finite when multiple governments serve it. Missing
    // recorded resident/owner coverage is left unbound, never reassigned.
    const coveredResidentCount = Math.min(
      residentCount,
      [...groups.values()].reduce(
        (sum, group) => sum + group.representedResidentCount,
        zero,
      ),
    );
    const coveredMonthlyPool = Math.floor(
      monthlyPool * (coveredResidentCount / residentCount),
    );
    minor(coveredMonthlyPool, "source-qualified public place pool");
    if (coveredResidentCount < residentCount)
      gaps.add(
        `opening-customers:public-owner-coverage-partly-unverified:${placeId}`,
      );
    const sellerRows = suppliers(
      placeId,
      publicRule.supplierClassifications,
      publicRule.supplierOccupations,
      "public-custodial",
    );
    let bound = zero;
    const selectedBuyers: string[] = [];
    for (const share of apportion(
      coveredMonthlyPool,
      [...groups.entries()].map(([id, group]) => ({
        id,
        weight: group.representedResidentCount,
      })),
    )) {
      const group = groups.get(share.id)!;
      const accounts = [...group.accounts].sort((left, right) =>
        left.id.localeCompare(right.id),
      );
      const linkedOwnerIds = [
        ...new Set(
          accounts
            .map(
              (row) =>
                (
                  row as OrganizationInput & {
                    publicPayAuthority?: { ownerId: string };
                  }
                ).publicPayAuthority?.ownerId,
            )
            .filter((id): id is string => id !== undefined),
        ),
      ];
      if (linkedOwnerIds.length > one)
        throw new Error(
          `Conflicting canonical public paying owners: ${share.id}`,
        );
      const specifiedId =
        options.publicBuyerIdByGovernmentKey?.[share.id] ??
        linkedOwnerIds[zero];
      if (linkedOwnerIds.length && specifiedId !== linkedOwnerIds[zero])
        throw new Error(
          `Public buyer conflicts with canonical government paying owner: ${share.id}`,
        );
      const buyer = specifiedId
        ? organizations.get(specifiedId)
        : accounts[zero];
      if (
        !buyer ||
        buyer.governmentFacts?.governmentKey !== share.id ||
        buyer.governmentFacts.governmentJurisdictionId !==
          accounts[zero]?.governmentFacts?.governmentJurisdictionId
      )
        throw new Error(
          `Public customer account designation does not match owner: ${share.id}`,
        );
      sourceValid(buyer.source, buyer.id);
      selectedBuyers.push(buyer.id);
      if (
        originalContracts.some(
          (contract) =>
            !owned(contract) &&
            contract.kind === publicRule.contractKind &&
            contract.payerIds.some(
              (id) => id === buyer.id || accounts.some((row) => row.id === id),
            ),
        )
      ) {
        gaps.add(
          `opening-customers:preserved-recorded-public-custodial-terms:${share.id}`,
        );
        continue;
      }
      // A buyer whose own jurisdiction is not the covered place (a township
      // the town lies in) settles only against a recorded owner coverage of
      // the place; where none is recorded the contract is not built, never
      // built without the record settlement checks.
      if (
        buyer.placeId !== placeId &&
        !(group.identitySource && group.coverageSource)
      ) {
        gaps.add(
          `opening-customers:public-owner-outside-covered-place-without-coverage:${share.id}:${placeId}`,
        );
        continue;
      }
      if (!sellerRows.length || share.amount <= zero) {
        gaps.add(
          `opening-customers:public-custodial-budget-unbound:${share.id}`,
        );
        continue;
      }
      // A paying owner seated in another place is admitted only with a recorded
      // owner-to-place coverage (the finance check asks for it); a group with no
      // recorded coverage stays unbound, never reassigned.
      if (
        buyer.placeId !== placeId &&
        !(group.identitySource && group.coverageSource)
      ) {
        gaps.add(
          `opening-customers:public-owner-elsewhere-without-coverage:${share.id}:${placeId}`,
        );
        continue;
      }
      const authorityId = `${ownedPrefix}public-authority:${share.id}:${placeId}`;
      const appropriationId = `${ownedPrefix}public-appropriation:${share.id}:${placeId}`;
      const agreementId = `${ownedPrefix}public-agreement:${share.id}:${placeId}`;
      let source = generatedSource(
        [
          buyer.source.citation,
          group.identitySource?.citation,
          group.coverageSource?.citation,
          prior.citation,
          publicRule.practiceCitation,
        ]
          .filter((citation) => citation !== undefined)
          .join(" "),
        `A source-qualified fictional prior authorization and appropriation by ${buyer.name}. Census public-building expenditure/population context and separately registered custodial/coverage fractions. A linked zero-stock outside owner pays only the actual admitted due obligation; an unlinked recorded buyer retains its actual stock constraint. No historical enacted appropriation is claimed. ${publicRule.stopgapId}`,
      );
      const boundTerms = bindBudget({
        buyerIds: [buyer.id],
        sellerRows,
        budgetMonthlyMinor: share.amount,
        kind: publicRule.contractKind,
        serviceKey: "public-custodial",
        agreementId,
        source,
        parameterRefs: refs,
        phase: data.settlementPhaseIds.publicProcurement,
        ...(buyer.outsideFlow
          ? {
              externalInflow: {
                kind: data.externalInflowKinds.publicProcurement,
                ownerId: buyer.id,
                authorityRecordId: authorityId,
                appropriationRecordId: appropriationId,
                agreementRecordId: agreementId,
              },
            }
          : {}),
      });
      source = boundTerms.source;
      if (buyer.outsideFlow) {
        sourceValid(buyer.outsideFlow, buyer.id);
        if (buyer.liquidMinor !== zero)
          throw new Error(
            `Public outside buyer must keep zero stock: ${buyer.id}`,
          );
      }
      const facts = {
        authority: canonical({
          id: authorityId,
          issuerId: buyer.id,
          governmentKey: share.id,
          jurisdictionId: buyer.governmentFacts!.governmentJurisdictionId,
          scope: "bounded-opening-custodial-procurement",
          effectiveFrom: boundTerms.firstDueAt,
          ...boundTerms.end,
          source,
        }),
        appropriation: canonical({
          id: appropriationId,
          authorityId,
          buyerAccountId: buyer.id,
          governmentKey: share.id,
          jurisdictionId: buyer.governmentFacts!.governmentJurisdictionId,
          ...(group.identitySource && group.coverageSource
            ? {
                ownerCoverage: {
                  governmentKey: share.id,
                  jurisdictionId:
                    buyer.governmentFacts!.governmentJurisdictionId,
                  representedResidentCount: group.representedResidentCount,
                  basisRecordIds: [...group.basisRecordIds],
                  identitySource: { ...group.identitySource },
                  coverageSource: { ...group.coverageSource },
                },
              }
            : {}),
          approvedAnnualMinor: share.amount * monthsPerYear,
          annualFigureRole: "estimated-annualized-rate-not-a-finite-cap",
          monthlyBudgetMinor: share.amount,
          coveredPlaceId: placeId,
          coveredOriginalResidentCount: group.representedResidentCount,
          sourcePriorKey: selectedKey,
          parameterRefs: refs,
          effectiveFrom: boundTerms.firstDueAt,
          ...boundTerms.end,
          source,
        }),
        agreement: canonical({
          id: agreementId,
          authorityId,
          appropriationId,
          buyerAccountId: buyer.id,
          supplierIds: qualificationSellerIds(boundTerms.qualifications),
          contractIds: boundTerms.contractIds,
          contractAmountsMinor: boundTerms.contractAmountsMinor,
          contractSourceMap: boundTerms.contractSourceMap,
          contractTermsById: boundTerms.contractTermsById,
          periodMonths,
          serviceKey: "public-custodial",
          providerQualifications: boundTerms.qualifications,
          basisRecordIds: [
            authorityId,
            appropriationId,
            ...refs,
            ...group.basisRecordIds,
            ...qualificationBasisIds(boundTerms.qualifications),
          ],
          status: "standing-budget-not-delivery",
          effectiveFrom: boundTerms.firstDueAt,
          ...boundTerms.end,
          source,
        }),
      };
      const buyerCurrent = organizations.get(buyer.id)!;
      const saved = { ...(buyerCurrent.governmentFacts ?? {}) };
      let factsAdded = false;
      for (const [field, value] of Object.entries(facts)) {
        const savedKey = `openingCustomers.${field}:${placeId}`;
        if (saved[savedKey] !== undefined && saved[savedKey] !== value)
          throw new Error(
            `Conflicting public opening customer fact: ${buyer.id}/${savedKey}`,
          );
        if (saved[savedKey] === undefined) {
          saved[savedKey] = value;
          factsAdded = true;
        }
      }
      if (factsAdded)
        organizations.set(buyer.id, {
          ...buyerCurrent,
          governmentFacts: saved,
        });
      if (factsAdded || boundTerms.addedIds.length) {
        for (const [id, kind, recordFacts] of [
          [
            authorityId,
            "public-procurement-authority",
            {
              governmentKey: share.id,
              issuerId: buyer.id,
              scope: "fictional-opening-custodial-authority",
              effectiveFrom: boundTerms.firstDueAt,
              ...boundTerms.end,
            },
          ],
          [
            appropriationId,
            "public-appropriation",
            {
              authorityId,
              approvedAnnualMinor: String(share.amount * monthsPerYear),
              annualFigureRole: "estimated-annualized-rate-not-a-finite-cap",
              buyerAccountId: buyer.id,
              effectiveFrom: boundTerms.firstDueAt,
              ...boundTerms.end,
            },
          ],
          [
            agreementId,
            "public-service-agreement",
            {
              authorityId,
              appropriationId,
              serviceKey: "public-custodial",
              monthlyBudgetMinor: String(share.amount),
              contractIds: canonical(boundTerms.contractIds),
              contractAmountsMinor: canonical(boundTerms.contractAmountsMinor),
              contractSourceMap: canonical(boundTerms.contractSourceMap),
              contractTermsById: canonical(boundTerms.contractTermsById),
              periodMonths: String(periodMonths),
              effectiveFrom: boundTerms.firstDueAt,
              ...boundTerms.end,
            },
          ],
        ] as const)
          evidence.push({
            id,
            kind,
            occurredAt: at,
            subjectIds: [buyer.id],
            counterpartyIds: qualificationSellerIds(boundTerms.qualifications),
            placeId,
            basisRecordIds:
              kind === "public-service-agreement"
                ? [
                    ...refs,
                    ...group.basisRecordIds,
                    ...qualificationBasisIds(boundTerms.qualifications),
                  ]
                : [...refs, ...group.basisRecordIds],
            facts: {
              ...recordFacts,
              ...(kind === "public-service-agreement"
                ? qualificationFacts(boundTerms.qualifications)
                : {}),
            },
            source,
          });
      }
      bound += share.amount;
    }
    publicBudgets.push({
      placeId,
      coveredOriginalResidentCount: coveredResidentCount,
      sourcePriorKey: selectedKey,
      monthlyCustodialPoolMinor: monthlyPool,
      boundMonthlyMinor: bound,
      buyerIds: selectedBuyers,
      parameterRefs: refs,
      ...([...groups.values()].some((group) => group.identitySource)
        ? {
            originalRepresentedResidentCount: residentCount,
            sourceUnverifiedResidentCount: residentCount - coveredResidentCount,
            ownerCoverage: [...groups.entries()]
              .filter(
                ([, group]) => group.identitySource && group.coverageSource,
              )
              .map(([governmentKey, group]) => ({
                governmentKey,
                representedResidentCount: group.representedResidentCount,
                basisRecordIds: group.basisRecordIds,
                identitySource: group.identitySource!,
                coverageSource: group.coverageSource!,
              })),
          }
        : {}),
    });
  }
  const resolvedBuilderContracts = new Set([
    ...plans.map((plan) => plan.contractId),
    ...householdContractIds,
  ]);
  for (const contract of originalContracts)
    if (owned(contract) && !resolvedBuilderContracts.has(contract.id))
      throw new Error(
        `Existing opening customer contract no longer resolves under these inputs: ${contract.id}`,
      );
  gaps.add(
    "opening-customers:nonhousehold-first-next-period-month-agreement-calendar-estimated:SG-P8-customer-due-calendar-renewal",
  );
  gaps.add(
    "opening-customers:standing-budgets-are-not-ongoing-consumer-choices-or-delivery-records",
  );
  gaps.add(
    "opening-customers:calibration-blocked-source-mean-errors-do-not-bound-individual-budgets-or-prior-crosswalks",
  );
  const addedCashMinor = sum(
    newStocks.map((row) => row.liquidMinor),
    "outside-flow producers add no opening cash",
  );
  const finance: FinanceInput = {
    ...(input.finance ?? {
      contracts: [],
      facilities: [],
      businesses: [],
      gaps: [],
    }),
    contracts,
    gaps: [...new Set([...(input.finance?.gaps ?? []), ...gaps])],
  };
  const enriched: CoreInput = {
    ...input,
    people: input.people.map((person) => people.get(person.id)!),
    organizations: [...organizations.values()],
    finance,
    ...(newPlaceMetadataKeys.length ? { placeMetadata } : {}),
    gaps: [...new Set([...input.gaps, ...gaps])],
  };
  // Exact reference-preservation for jobs/schedules and explicit original cash projection.
  for (const person of input.people) {
    const after = people.get(person.id)!;
    if (
      after.liquidMinor !== person.liquidMinor ||
      after.livingCostDailyMinor !== person.livingCostDailyMinor ||
      after.jobId !== person.jobId ||
      after.householdId !== person.householdId
    )
      throw new Error(`Original customer-person state changed: ${person.id}`);
  }
  for (const organization of input.organizations)
    if (
      organizations.get(organization.id)!.liquidMinor !==
      organization.liquidMinor
    )
      throw new Error(
        `Original organization stock changed: ${organization.id}`,
      );
  const enrichedCashMinor = sum(
    [
      ...enriched.people.map((person) => person.liquidMinor),
      ...enriched.organizations.map((organization) => organization.liquidMinor),
    ],
    "enriched opening stock",
  );
  if (
    enrichedCashMinor !==
    sum(
      [existingOriginalCashMinor, addedCashMinor],
      "disclosed enriched opening stocks",
    )
  )
    throw new Error("Opening customer stocks do not reconcile.");
  return {
    input: enriched,
    receipt: {
      version: data.version,
      status: "OPENING_RECORDS_ONLY_NO_RUNTIME_SETTLEMENT",
      originalCashMinor: existingOriginalCashMinor,
      addedCashMinor,
      enrichedCashMinor,
      preservation: {
        people: input.people.map(
          ({ id, householdId, jobId, liquidMinor, livingCostDailyMinor }) => ({
            id,
            householdId,
            jobId,
            liquidMinor,
            livingCostDailyMinor,
          }),
        ),
        organizations: input.organizations.map(({ id, liquidMinor }) => ({
          id,
          liquidMinor,
        })),
        householdIds: input.households.map((household) => household.id),
        jobs: input.jobs,
        workCommitments: input.workCommitments,
        originalContracts,
        untouchedSections: [
          "seed",
          "startedAt",
          "households",
          "jobs",
          "workCommitments",
          "publicOrganizations",
          "calendarDates",
          "focusPersonIds",
          "focusPlaceIds",
          "playerId",
          "original-placeMetadata",
          "original-account-cash-and-source",
          "original-finance-books-facilities-and-conditions",
        ],
      },
      newOrganizationIds,
      newPastFactIds,
      newPlaceMetadataKeys,
      newContractIds,
      preservedBuilderContractIds,
      newStocks,
      providerRecords: [...usedProviderRecords.values()].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
      evidence,
      providerQualifications: [...usedQualificationRecords.values()].sort(
        (a, b) => a.qualificationId.localeCompare(b.qualificationId),
      ),
      inlineProviderQualifications: [...usedInlineQualifications].map(
        ([agreementId, qualifications]) => ({ agreementId, qualifications }),
      ),
      contractPlans: plans,
      householdBudgets,
      publicBudgets,
      parameterRefs: [...usedParameters].sort(),
      stopgapIds: data.stopgapIds,
      gaps: [...gaps].sort(),
      unsupported: data.remainingUnsupported,
    },
  };
}
