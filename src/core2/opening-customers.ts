import { addDays, isoDateFromParts, makeIsoDate } from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import type { LivingCostsRegion } from "../simulation/living-costs-data";
import type { FinanceContractInput, FinanceInput } from "./finance-types";
import {
  createOpeningCustomerGeographyProvider,
  type OpeningCustomerGeographyProvider,
  type OpeningCustomerOutsideMarket,
  type OpeningCustomerPlaceContext,
} from "./opening-customer-geography";
import { parameter, PARAMETERS, type Parameter } from "./parameters";
import customerDataJson from "./data/opening-customers.json" with { type: "json" };
import type {
  CoreInput,
  OrganizationInput,
  PersonInput,
  Source,
} from "./types";

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
  periodMonthsParameter: string;
  agreementLeadDaysParameter: string;
  sizeTopCodeParameter: string;
  settlementPhaseIds: {
    householdPurchases: string;
    publicProcurement: string;
    outsidePurchases: string;
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
  outsideHouseholds: {
    contractKind: string;
    supplierClassifications: readonly string[];
    supplierOccupations: readonly string[];
    countPerMarketParameter: string;
    liquidUsdParameter: string;
    incomePriorUsdParameter: string;
    annualLodgingUsdParameter: string;
    stockSourceRecordId: string;
    stockCoverage: string;
    stopgapId: string;
    citation: string;
  };
  stopgapIds: readonly string[];
  remainingUnsupported: readonly string[];
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

export interface OpeningCustomerProviderQualification {
  organizationId: string;
  serviceKey: string;
  jobIds: readonly string[];
  providerRecordIds: readonly string[];
  sources: readonly {
    recordId: string;
    kind: "job" | "recorded-provider";
    occupationClassification?: string;
    source: Source;
  }[];
}

export interface OpeningCustomerOptions {
  data?: OpeningCustomerData;
  parameters?: Readonly<Record<string, Parameter>>;
  geography?: OpeningCustomerGeographyProvider;
  /** Accepted geography/visit records; same admission path in every jurisdiction. */
  outsideMarkets?: readonly OpeningCustomerOutsideMarket[];
  providerRecords?: readonly RecordedCustomerProvider[];
  /** Initial fictional identity options, not future behavior or customer selection rolls. */
  canonicalFamilyNames?: readonly string[];
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
    | "public-service-agreement"
    | "outside-household-identity"
    | "outside-visit-budget";
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
  contractPlans: readonly {
    contractId: string;
    agreementId: string;
    buyerIds: readonly string[];
    sellerId: string;
    serviceKey: string;
    monthlyBudgetMinor: number;
    parameterRefs: readonly string[];
    providerQualification: OpeningCustomerProviderQualification;
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
      "A finite source-year customer budget requires a cadence that divides the registered year.",
    );
  const priorAt = addDays(at, -leadDays);
  const [yearText, monthText] = at.split("-");
  const nextMonth = Number(monthText) - one + periodMonths;
  const dueAt = isoDateFromParts(
    Number(yearText) + Math.floor(nextMonth / monthsPerYear),
    (nextMonth % monthsPerYear) + one,
    one,
  );
  const exclusiveEndMonth = nextMonth + monthsPerYear;
  const endsAt = isoDateFromParts(
    Number(yearText) + Math.floor(exclusiveEndMonth / monthsPerYear),
    (exclusiveEndMonth % monthsPerYear) + one,
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
  if (makeIsoDate(data.sourceAvailableBy) > at)
    gaps.add(
      "opening-customers:later-statistical-vintages-are-generation-priors-not-date-available-actor-facts",
    );
  const contexts = new Map<string, OpeningCustomerPlaceContext | undefined>();
  const geography =
    options.geography ?? createOpeningCustomerGeographyProvider(registry);
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
    estimatedFrom: `${description} Opening plans and fictional recorded terms only; no paid receipt, delivery, actual historical bill, survival target, or observed individual demand is implied.`,
  });
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
  }) => {
    const contractIds: string[] = [];
    const addedIds: string[] = [];
    const qualifications: OpeningCustomerProviderQualification[] = [];
    for (const share of apportion(
      args.budgetMonthlyMinor,
      args.sellerRows.map((row) => ({ id: row.id, weight: one })),
    )) {
      if (share.amount <= zero) continue;
      const qualification = providerQualifications.get(
        canonical([share.id, args.serviceKey]),
      );
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
      qualifications.push(qualification);
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
        dueAt,
        periodMonths,
        endsAt,
        accruesArrears: false,
        marketAdjusted: false,
        salesReceipt: true,
        salesReceiptBudget: false,
        settlementPhaseId: args.phase,
        source: {
          ...args.source,
          citation: `${args.source.citation} Prior agreement ${args.agreementId}; seller ${share.id}.`,
        },
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
        providerQualification: qualification,
        source: contract.source,
      });
    }
    return { contractIds, addedIds, qualifications };
  };
  const qualificationBasisIds = (
    rows: readonly OpeningCustomerProviderQualification[],
  ) =>
    [
      ...new Set(
        rows.flatMap((row) => [...row.jobIds, ...row.providerRecordIds]),
      ),
    ].sort();
  const qualificationSellerIds = (
    rows: readonly OpeningCustomerProviderQualification[],
  ) => rows.map((row) => row.organizationId);
  const qualificationFacts = (
    rows: readonly OpeningCustomerProviderQualification[],
  ) => ({
    providerQualifications: canonical(rows),
  });
  const appendPast = (
    personId: string,
    record: OpeningCustomerEvidenceRecord,
  ) => {
    const person = people.get(personId)!;
    if (makeIsoDate(person.birthDate) > makeIsoDate(record.occurredAt))
      throw new Error(`Customer agreement predates subject: ${record.id}`);
    const fact: NonNullable<PersonInput["pastFacts"]>[number] = {
      id: record.id,
      date: record.occurredAt,
      kind: record.kind,
      summary:
        "An opening service-purchase budget was recorded with named counterparties.",
      source: record.source,
      facts: {
        ...record.facts,
        subjectIds: canonical(record.subjectIds),
        counterpartyIds: canonical(record.counterpartyIds),
        placeId: record.placeId,
        basisRecordIds: canonical(record.basisRecordIds),
      },
    };
    const matching =
      person.pastFacts?.filter((row) => row.id === fact.id) ?? [];
    if (matching.length > one)
      throw new Error(`Duplicate opening customer past fact: ${fact.id}`);
    const prior = matching[zero];
    if (prior) {
      if (canonical(prior) !== canonical(fact))
        throw new Error(`Conflicting opening customer past fact: ${fact.id}`);
      return;
    }
    people.set(personId, {
      ...person,
      pastFacts: [...(person.pastFacts ?? []), fact],
    });
    newPastFactIds.push(fact.id);
    evidence.push(record);
  };
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
      const source = generatedSource(
        service.citation,
        `${service.label} CEX component with ${sizeKey}/${region} parent scaling, original household envelope cap, and equal recorded opening vendor shares. ${service.stopgapId}`,
      );
      const boundTerms = bindBudget({
        buyerIds: payers.map((person) => person.id),
        householdId: household.id,
        sellerRows,
        budgetMonthlyMinor: allocation.amount,
        kind: service.contractKind,
        serviceKey: service.key,
        agreementId,
        source,
        parameterRefs: need.refs,
        phase: data.settlementPhaseIds.householdPurchases,
      });
      const record: OpeningCustomerEvidenceRecord = {
        id: agreementId,
        kind: "household-service-agreement",
        occurredAt: priorAt,
        subjectIds: payers.map((person) => person.id),
        counterpartyIds: qualificationSellerIds(boundTerms.qualifications),
        placeId: household.placeId,
        basisRecordIds: [
          household.id,
          ...need.refs,
          ...qualificationBasisIds(boundTerms.qualifications),
        ],
        facts: {
          ...qualificationFacts(boundTerms.qualifications),
          householdId: household.id,
          serviceKey: service.key,
          monthlyBudgetMinor: String(allocation.amount),
          supplierIds: canonical(
            qualificationSellerIds(boundTerms.qualifications),
          ),
          contractIds: canonical(boundTerms.contractIds),
          effectiveFrom: dueAt,
          endsAt,
          status: "fictional-recorded-opening-budget-not-delivery",
        },
        source,
      };
      appendPast(payers[zero]!.id, record);
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
  const governmentAccountsByPlace = new Map<
    string,
    Map<string, OrganizationInput[]>
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
    const groups =
      governmentAccountsByPlace.get(organization.placeId) ??
      new Map<string, OrganizationInput[]>();
    const rows = groups.get(facts.governmentKey) ?? [];
    rows.push(organization);
    groups.set(facts.governmentKey, rows);
    governmentAccountsByPlace.set(organization.placeId, groups);
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
    const sellerRows = suppliers(
      placeId,
      publicRule.supplierClassifications,
      publicRule.supplierOccupations,
      "public-custodial",
    );
    let bound = zero;
    const selectedBuyers: string[] = [];
    for (const share of apportion(
      monthlyPool,
      [...groups.keys()].map((id) => ({ id, weight: one })),
    )) {
      const accounts = [...groups.get(share.id)!].sort((left, right) =>
        left.id.localeCompare(right.id),
      );
      const specifiedId = options.publicBuyerIdByGovernmentKey?.[share.id];
      const buyer = specifiedId
        ? accounts.find((row) => row.id === specifiedId)
        : accounts[zero];
      if (!buyer)
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
            contract.payerIds.some((id) =>
              accounts.some((row) => row.id === id),
            ),
        )
      ) {
        gaps.add(
          `opening-customers:preserved-recorded-public-custodial-terms:${share.id}`,
        );
        continue;
      }
      if (!sellerRows.length || share.amount <= zero) {
        gaps.add(
          `opening-customers:public-custodial-budget-unbound:${share.id}`,
        );
        continue;
      }
      const authorityId = `${ownedPrefix}public-authority:${share.id}:${placeId}`;
      const appropriationId = `${ownedPrefix}public-appropriation:${share.id}:${placeId}`;
      const agreementId = `${ownedPrefix}public-agreement:${share.id}:${placeId}`;
      const source = generatedSource(
        `${buyer.source.citation} ${prior.citation} ${publicRule.practiceCitation}`,
        `A source-qualified fictional prior authorization and appropriation by ${buyer.name}. Census public-building expenditure/population context and separately registered custodial/coverage fractions; existing buyer cash only. ${publicRule.stopgapId}`,
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
      });
      const facts = {
        authority: canonical({
          id: authorityId,
          issuerId: buyer.id,
          governmentKey: share.id,
          jurisdictionId: buyer.governmentFacts!.governmentJurisdictionId,
          scope: "bounded-opening-custodial-procurement",
          effectiveFrom: dueAt,
          endsAt,
          source,
        }),
        appropriation: canonical({
          id: appropriationId,
          authorityId,
          buyerAccountId: buyer.id,
          approvedAnnualMinor: share.amount * monthsPerYear,
          monthlyBudgetMinor: share.amount,
          coveredPlaceId: placeId,
          coveredOriginalResidentCount: residentCount,
          sourcePriorKey: selectedKey,
          parameterRefs: refs,
          effectiveFrom: dueAt,
          endsAt,
          source,
        }),
        agreement: canonical({
          id: agreementId,
          authorityId,
          appropriationId,
          buyerAccountId: buyer.id,
          supplierIds: qualificationSellerIds(boundTerms.qualifications),
          serviceKey: "public-custodial",
          providerQualifications: boundTerms.qualifications,
          basisRecordIds: [
            authorityId,
            appropriationId,
            ...refs,
            ...qualificationBasisIds(boundTerms.qualifications),
          ],
          status: "standing-budget-not-delivery",
          effectiveFrom: dueAt,
          endsAt,
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
              effectiveFrom: dueAt,
              endsAt,
            },
          ],
          [
            appropriationId,
            "public-appropriation",
            {
              authorityId,
              approvedAnnualMinor: String(share.amount * monthsPerYear),
              buyerAccountId: buyer.id,
              effectiveFrom: dueAt,
              endsAt,
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
              effectiveFrom: dueAt,
              endsAt,
            },
          ],
        ] as const)
          evidence.push({
            id,
            kind,
            occurredAt: priorAt,
            subjectIds: [buyer.id],
            counterpartyIds: qualificationSellerIds(boundTerms.qualifications),
            placeId,
            basisRecordIds:
              kind === "public-service-agreement"
                ? [...refs, ...qualificationBasisIds(boundTerms.qualifications)]
                : refs,
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
      coveredOriginalResidentCount: residentCount,
      sourcePriorKey: selectedKey,
      monthlyCustodialPoolMinor: monthlyPool,
      boundMonthlyMinor: bound,
      buyerIds: selectedBuyers,
      parameterRefs: refs,
    });
  }
  const marketsById = new Map<string, OpeningCustomerOutsideMarket>();
  const marketIdsByGeography = new Map<string, string>();
  const suppliedMarkets = options.outsideMarkets;
  const placeIds = new Set(
    input.households.map((household) => household.placeId),
  );
  for (const market of suppliedMarkets ??
    [...placeIds].flatMap(
      (placeId) => contextFor(placeId)?.outsideMarkets ?? [],
    )) {
    const prior = marketsById.get(market.id);
    if (prior && canonical(prior) !== canonical(market))
      throw new Error(`Conflicting outside customer market: ${market.id}`);
    const geographicIdentity = canonical([
      market.originPlaceId,
      market.destinationPlaceId,
    ]);
    const geographicPrior = marketIdsByGeography.get(geographicIdentity);
    if (geographicPrior !== undefined && geographicPrior !== market.id)
      throw new Error(
        `Aliased outside customer market repeats one geographic family pool: ${market.id}`,
      );
    marketIdsByGeography.set(geographicIdentity, market.id);
    marketsById.set(market.id, market);
  }
  const outsideRule = data.outsideHouseholds;
  const outsideCount = p(outsideRule.countPerMarketParameter);
  if (
    !Number.isSafeInteger(outsideCount) ||
    outsideCount < zero ||
    outsideCount > one
  )
    throw new Error(
      "This bounded outside-customer builder admits at most the registered unit family count per market.",
    );
  const familyNames = [
    ...new Set(
      options.canonicalFamilyNames ??
        input.people.map((person) => person.familyName),
    ),
  ]
    .filter((name) => name.trim())
    .sort();
  const originalResidentPlaces = new Set(
    input.people.map((person) => person.placeId),
  );
  for (const market of [...marketsById.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    sourceValid(market.source, market.id);
    if (
      !market.id ||
      !market.originPlaceId ||
      !market.destinationPlaceId ||
      !market.originPlaceName.trim() ||
      market.originPlaceId === market.destinationPlaceId ||
      !placeIds.has(market.destinationPlaceId) ||
      !Number.isSafeInteger(market.originSourcePopulation) ||
      market.originSourcePopulation <= zero ||
      !market.basisRecordIds.length
    )
      throw new Error(
        `Outside customer market requires actual distinct geography and population records: ${market.id}`,
      );
    if (originalResidentPlaces.has(market.originPlaceId)) {
      gaps.add(
        `opening-customers:outside-stock-would-overlap-admitted-residence:${market.id}`,
      );
      continue;
    }
    const sellerRows = suppliers(
      market.destinationPlaceId,
      outsideRule.supplierClassifications,
      outsideRule.supplierOccupations,
      "visitor-lodging",
    );
    if (!sellerRows.length || !familyNames.length || outsideCount === zero) {
      gaps.add(
        `opening-customers:outside-visit-budget-needs-compatible-lodging-and-named-family:${market.id}`,
      );
      continue;
    }
    // Market labels and additional geography citations cannot create another
    // family stock for the same origin/destination pair, including re-enrichment.
    const buyerId = `${ownedPrefix}outside-household:${stableHash(
      canonical([market.originPlaceId, market.destinationPlaceId]),
    )}`;
    const identityId = `${buyerId}:identity`,
      visitId = `${buyerId}:visit-budget`;
    const stock = Math.round(
      p(outsideRule.liquidUsdParameter) * p("minorPerDollar"),
    );
    minor(stock, buyerId);
    const source = generatedSource(
      `${market.source.citation} ${outsideRule.citation}`,
      `The ${familyNames[zero]} family is a fictional transaction-account holding outside family at ${market.originPlaceName}. One SCF family pool; a CEX out-of-town lodging reserve follows a fictional pre-start regional personal-visit context. Middle-quintile SCF income is context only, never cash. ${outsideRule.stopgapId}`,
    );
    const organization: OrganizationInput = {
      id: buyerId,
      placeId: market.originPlaceId,
      name: `${familyNames[zero]} household (${market.originPlaceName})`,
      kind: "outside-customer-household",
      classification: "customer:outside-household",
      liquidMinor: stock,
      source: {
        ...source,
        citation: `${source.citation} Identity ${identityId}; stock ${outsideRule.stockSourceRecordId}; visit budget ${visitId}.`,
      },
    };
    const existing = organizations.get(buyerId);
    if (existing && canonical(existing) !== canonical(organization))
      throw new Error(`Conflicting outside customer account: ${buyerId}`);
    if (!existing) {
      if (people.has(buyerId))
        throw new Error(`Outside customer ID collides with person: ${buyerId}`);
      organizations.set(buyerId, organization);
      newOrganizationIds.push(buyerId);
    }
    const stockRecord: OpeningCustomerStockRecord = {
      cashEntityId: buyerId,
      openedAt: priorAt,
      liquidMinor: stock,
      stockSourceRecordId: outsideRule.stockSourceRecordId,
      economicCoverage: outsideRule.stockCoverage,
      nonoverlapBasis: `Origin ${market.originPlaceId} is outside every original admitted resident place. One pool for ${buyerId}; no per-member account or existing employer capital.`,
      source: organization.source,
    };
    appendMetadata(`openingCustomers.stock:${buyerId}`, stockRecord);
    if (!existing) newStocks.push(stockRecord);
    const identityRecord: OpeningCustomerEvidenceRecord = {
      id: identityId,
      kind: "outside-household-identity",
      occurredAt: priorAt,
      subjectIds: [buyerId],
      counterpartyIds: [],
      placeId: market.originPlaceId,
      basisRecordIds: [
        ...market.basisRecordIds,
        outsideRule.stockSourceRecordId,
      ],
      facts: {
        economicUnit: "one-outside-family",
        transactionAccountHolder: "generated-opening-prior",
        liquidMinor: String(stock),
        annualIncomeGenerationPriorUsd: String(
          p(outsideRule.incomePriorUsdParameter),
        ),
        recurringIncomeCredit: "none",
        representation: "organization-shaped-family-cash-pool-not-an-employer",
      },
      source: organization.source,
    };
    if (
      appendMetadata(`openingCustomers.evidence:${identityId}`, identityRecord)
    )
      evidence.push(identityRecord);
    const refs = [
      outsideRule.liquidUsdParameter,
      outsideRule.incomePriorUsdParameter,
      outsideRule.annualLodgingUsdParameter,
      outsideRule.countPerMarketParameter,
    ];
    const monthlyBudget = Math.round(
      (p(outsideRule.annualLodgingUsdParameter) * p("minorPerDollar")) /
        monthsPerYear,
    );
    const boundTerms = bindBudget({
      buyerIds: [buyerId],
      sellerRows,
      budgetMonthlyMinor: monthlyBudget,
      kind: outsideRule.contractKind,
      serviceKey: "visitor-lodging",
      agreementId: visitId,
      source,
      parameterRefs: refs,
      phase: data.settlementPhaseIds.outsidePurchases,
    });
    const visitRecord: OpeningCustomerEvidenceRecord = {
      id: visitId,
      kind: "outside-visit-budget",
      occurredAt: priorAt,
      subjectIds: [buyerId],
      counterpartyIds: qualificationSellerIds(boundTerms.qualifications),
      placeId: market.destinationPlaceId,
      basisRecordIds: [
        ...market.basisRecordIds,
        identityId,
        ...qualificationBasisIds(boundTerms.qualifications),
      ],
      facts: {
        ...qualificationFacts(boundTerms.qualifications),
        originPlaceId: market.originPlaceId,
        destinationPlaceId: market.destinationPlaceId,
        visitPurpose: "fictional-opening-regional-personal-visit",
        serviceKey: "visitor-lodging",
        monthlyBudgetMinor: String(monthlyBudget),
        contractIds: canonical(boundTerms.contractIds),
        effectiveFrom: dueAt,
        endsAt,
        deliveryStatus: "no-booking-or-stay-delivery-claimed",
      },
      source,
    };
    if (appendMetadata(`openingCustomers.evidence:${visitId}`, visitRecord))
      evidence.push(visitRecord);
  }
  for (const placeId of placeIds)
    if (
      ![...marketsById.values()].some(
        (market) => market.destinationPlaceId === placeId,
      )
    )
      gaps.add(
        `opening-customers:no-source-qualified-outside-visit-market:${placeId}`,
      );
  const resolvedBuilderContracts = new Set(
    plans.map((plan) => plan.contractId),
  );
  for (const contract of originalContracts)
    if (owned(contract) && !resolvedBuilderContracts.has(contract.id))
      throw new Error(
        `Existing opening customer contract no longer resolves under these inputs: ${contract.id}`,
      );
  gaps.add(
    "opening-customers:standing-budgets-are-not-ongoing-consumer-choices-or-delivery-records",
  );
  gaps.add(
    "opening-customers:calibration-blocked-source-mean-errors-do-not-bound-individual-budgets-or-prior-crosswalks",
  );
  const addedCashMinor = sum(
    newStocks.map((row) => row.liquidMinor),
    "added independent outside-family stocks",
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
