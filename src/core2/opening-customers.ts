import { addDays, isoDateFromParts, makeIsoDate } from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import type { LivingCostsRegion } from "../simulation/living-costs-data";
import type { FinanceContractInput, FinanceInput } from "./finance-types";
import financePolicyDataJson from "./data/finance.json" with { type: "json" };
import { createHouseholdPurchaseCalendarMarker } from "./household-purchase-calendar";
import {
  createOpeningCustomerGeographyProvider,
  type OpeningCustomerGeographyProvider,
  type OpeningCustomerOutsideMarket,
  type OpeningCustomerPlaceContext,
} from "./opening-customer-geography";
import { parameter, PARAMETERS, type Parameter } from "./parameters";
import {
  createOpeningPurchaseCalendar,
  DEFAULT_OPENING_PURCHASE_CALENDAR_DATA,
  type OpeningPurchaseCalendarChoice,
} from "./opening-purchase-calendar";
import {
  OPENING_COUNTY_BUYER_CLASSIFICATION,
  openingHistoricalCountyPurchaseCoverage,
} from "./opening-public-owner";
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
  externalInflowKinds: { publicProcurement: string; outsidePurchases: string };
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
    incomePriorUsdParameter: string;
    annualLodgingUsdParameter: string;
    stopgapId: string;
    citation: string;
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

export interface OpeningCustomerOutsideBuyerIdentity {
  /** The actual supplied modeled identity, reused across explicitly linked edges. */
  organization: OrganizationInput;
  identity: OpeningCustomerEvidenceRecord;
}

export interface OpeningCustomerOutsideBudgetRecord {
  id: string;
  ownerId: string;
  identityRecordId: string;
  monthlyBudgetMinor: number;
  preservedMonthlyTermsMinor: number;
  preservedContractIds: readonly string[];
  preservedContractSourceMap: Readonly<Record<string, Source>>;
  preservedContractTermsById: Readonly<
    Record<
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
    >
  >;
  marketIds: readonly string[];
  marketMonthlyAmountsMinor: Readonly<Record<string, number>>;
  parameterRefs: readonly string[];
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

type CustomerExternalInflow =
  | {
      kind: string;
      ownerId: string;
      authorityRecordId: string;
      appropriationRecordId: string;
      agreementRecordId: string;
    }
  | {
      kind: string;
      ownerId: string;
      identityRecordId: string;
      visitAgreementRecordId: string;
      marketId: string;
    };

export interface OpeningCustomerOptions {
  data?: OpeningCustomerData;
  parameters?: Readonly<Record<string, Parameter>>;
  geography?: OpeningCustomerGeographyProvider;
  /** Accepted geography/visit records; same admission path in every jurisdiction. */
  outsideMarkets?: readonly OpeningCustomerOutsideMarket[];
  providerRecords?: readonly RecordedCustomerProvider[];
  /** An explicit actual owner/identity mapping; no name or origin deduplication. */
  outsideBuyerIdentityByMarketId?: Readonly<
    Record<string, OpeningCustomerOutsideBuyerIdentity>
  >;
  /** Only actual supplied agreement ends; source-year statistics imply no expiry. */
  agreementEndsById?: Readonly<Record<string, OpeningCustomerAgreementEnd>>;
  /** Actual supplied first due terms; a statistical vintage cannot choose a date. */
  agreementDatesById?: Readonly<Record<string, OpeningCustomerAgreementDate>>;
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
  const savedGeneratedVisitorIds = new Set<string>();
  // Canonical supplied buyer IDs do not carry the builder prefix. Recover
  // generated ownership only from the persisted buyer/visit linkage and exact
  // original terms/full Sources. An outside descriptor alone owns nothing.
  for (const [key, raw] of Object.entries(input.placeMetadata ?? {})) {
    const prefix = "openingCustomers.marketBuyer:";
    if (!key.startsWith(prefix)) continue;
    const marketId = key.slice(prefix.length);
    const read = <T>(value: string | undefined, field: string): T => {
      if (value === undefined)
        throw new Error(`Missing saved generated customer record: ${field}`);
      try {
        return JSON.parse(value) as T;
      } catch {
        throw new Error(`Invalid saved generated customer record: ${field}`);
      }
    };
    const mapping = read<{
      ownerId: string;
      identityRecordId?: string;
      visitAgreementRecordId?: string;
      suppliedContractIds?: readonly string[];
      contractSourceMap?: Readonly<Record<string, Source>>;
      contractTermsById?: Readonly<Record<string, unknown>>;
    }>(raw, key);
    if (!marketId || !mapping || !mapping.ownerId?.trim())
      throw new Error(`Invalid saved generated customer buyer link: ${key}`);
    if (mapping.suppliedContractIds !== undefined) {
      const ids = mapping.suppliedContractIds,
        sources = mapping.contractSourceMap,
        terms = mapping.contractTermsById;
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        ids.some((id) => typeof id !== "string" || !id.trim()) ||
        new Set(ids).size !== ids.length ||
        !sources ||
        !terms ||
        canonical(Object.keys(sources).sort()) !== canonical([...ids].sort()) ||
        canonical(Object.keys(terms).sort()) !== canonical([...ids].sort())
      )
        throw new Error(`Conflicting saved supplied customer maps: ${key}`);
      for (const id of ids) {
        const contract = contractById.get(id),
          claim = contract?.externalInflow;
        sourceValid(sources[id]!, id);
        if (
          !contract ||
          !claim ||
          !("marketId" in claim) ||
          contract.kind !== data.outsideHouseholds.contractKind ||
          canonical(contract.payerIds) !== canonical([mapping.ownerId]) ||
          claim.kind !== data.externalInflowKinds.outsidePurchases ||
          claim.ownerId !== mapping.ownerId ||
          claim.marketId !== marketId ||
          canonical(sources[id]) !== canonical(contract.source) ||
          canonical(terms[id]) !==
            canonical({
              payerIds: [...contract.payerIds],
              payeeId: contract.payeeId,
              kind: contract.kind,
              amountMinor: contract.amountMinor,
              firstDueAt: contract.dueAt,
              periodMonths: contract.periodMonths,
              ...(contract.endsAt === undefined
                ? {}
                : { endsAt: contract.endsAt }),
              ...(contract.settlementPhaseId === undefined
                ? {}
                : { settlementPhaseId: contract.settlementPhaseId }),
            })
        )
          throw new Error(
            `Conflicting supplied opening customer contract: ${id}`,
          );
      }
      // These are independently supplied terms, never generated ownership.
      continue;
    }
    if (
      !mapping.identityRecordId?.trim() ||
      !mapping.visitAgreementRecordId?.trim()
    )
      throw new Error(`Invalid saved generated customer buyer link: ${key}`);
    const visitKey = `openingCustomers.evidence:${mapping.visitAgreementRecordId}`;
    const visitRaw = input.placeMetadata?.[visitKey];
    if (visitRaw === undefined) {
      // A recorded zero-share market has a buyer link and no contract/visit.
      // An actual positive saved obligation cannot lose its agreement Source.
      if (
        originalContracts.some(
          (row) =>
            row.id.startsWith(`${mapping.visitAgreementRecordId}:contract:`) ||
            (row.externalInflow?.kind ===
              data.externalInflowKinds.outsidePurchases &&
              "marketId" in row.externalInflow &&
              row.externalInflow.marketId === marketId),
        )
      )
        throw new Error(`Missing saved generated customer record: ${visitKey}`);
      continue;
    }
    const visit = read<OpeningCustomerEvidenceRecord>(visitRaw, visitKey);
    if (
      !visit ||
      visit.id !== mapping.visitAgreementRecordId ||
      visit.kind !== "outside-visit-budget" ||
      canonical(visit.subjectIds) !== canonical([mapping.ownerId]) ||
      visit.facts?.marketId !== marketId ||
      visit.facts.identityRecordId !== mapping.identityRecordId
    )
      throw new Error(
        `Conflicting saved generated customer linkage: ${visitKey}`,
      );
    sourceValid(visit.source, visitKey);
    const ids = read<string[]>(
        visit.facts.contractIds,
        `${visitKey}:contractIds`,
      ),
      sources = read<Record<string, Source>>(
        visit.facts.contractSourceMap,
        `${visitKey}:contractSourceMap`,
      ),
      terms = read<Record<string, unknown>>(
        visit.facts.contractTermsById,
        `${visitKey}:contractTermsById`,
      );
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.some((id) => typeof id !== "string" || !id.trim()) ||
      new Set(ids).size !== ids.length ||
      !sources ||
      !terms ||
      canonical(Object.keys(sources).sort()) !== canonical([...ids].sort()) ||
      canonical(Object.keys(terms).sort()) !== canonical([...ids].sort())
    )
      throw new Error(`Conflicting saved generated customer maps: ${visitKey}`);
    for (const id of ids) {
      const contract = contractById.get(id),
        claim = contract?.externalInflow;
      if (!contract || !claim || !("marketId" in claim))
        throw new Error(`Missing original generated customer contract: ${id}`);
      sourceValid(sources[id]!, id);
      if (
        savedGeneratedVisitorIds.has(id) ||
        id !== `${visit.id}:contract:${contract.payeeId}` ||
        contract.kind !== data.outsideHouseholds.contractKind ||
        canonical(contract.payerIds) !== canonical([mapping.ownerId]) ||
        claim.kind !== data.externalInflowKinds.outsidePurchases ||
        claim.ownerId !== mapping.ownerId ||
        claim.identityRecordId !== mapping.identityRecordId ||
        claim.visitAgreementRecordId !== visit.id ||
        claim.marketId !== marketId ||
        canonical(sources[id]) !== canonical(contract.source) ||
        canonical(claim.source) !== canonical(contract.source) ||
        canonical(terms[id]) !==
          canonical({
            payerIds: [...contract.payerIds],
            payeeId: contract.payeeId,
            kind: contract.kind,
            amountMinor: contract.amountMinor,
            firstDueAt: contract.dueAt,
            periodMonths: contract.periodMonths,
            ...(contract.endsAt === undefined
              ? {}
              : { endsAt: contract.endsAt }),
            ...(contract.settlementPhaseId === undefined
              ? {}
              : { settlementPhaseId: contract.settlementPhaseId }),
          })
      )
        throw new Error(`Conflicting opening customer contract: ${id}`);
      savedGeneratedVisitorIds.add(id);
    }
  }
  for (const [key, raw] of Object.entries(input.placeMetadata ?? {})) {
    if (!key.startsWith("openingCustomers.evidence:")) continue;
    let ids: string[];
    try {
      const record = JSON.parse(raw) as OpeningCustomerEvidenceRecord;
      if (
        record.kind !== "outside-visit-budget" ||
        record.facts?.visitPurpose !==
          "fictional-opening-regional-personal-visit"
      )
        continue;
      ids = JSON.parse(record.facts.contractIds!) as string[];
    } catch {
      throw new Error(`Invalid saved opening customer metadata: ${key}`);
    }
    if (
      !Array.isArray(ids) ||
      ids.some((id) => !savedGeneratedVisitorIds.has(id))
    )
      throw new Error(`Missing saved generated customer buyer linkage: ${key}`);
  }
  const owned = (contract: FinanceContractInput) =>
    contract.kind === data.outsideHouseholds.contractKind
      ? savedGeneratedVisitorIds.has(contract.id)
      : contract.id.startsWith(ownedPrefix);
  // Build one calendar from the actual owned work/income and original terms.
  // A rebuilding producer does not treat its own generated component as a
  // newly observed payment or expense calendar.
  const calendarHouseholdIds = new Set(
    input.households
      .filter((household) =>
        household.memberIds.some((id) => {
          const person = people.get(id);
          return (
            person &&
            person.livingCostDailyMinor > zero &&
            makeIsoDate(person.birthDate) <= priorAt
          );
        }),
      )
      .map((household) => household.id),
  );
  const calendarPeople = input.people.filter((person) =>
    calendarHouseholdIds.has(person.householdId),
  );
  const calendarPersonIds = new Set(calendarPeople.map((person) => person.id));
  const purchaseCalendar = createOpeningPurchaseCalendar(
    {
      ...input,
      households: input.households.filter((household) =>
        calendarHouseholdIds.has(household.id),
      ),
      people: calendarPeople,
      workCommitments: input.workCommitments?.filter((row) =>
        calendarPersonIds.has(row.personId),
      ),
    },
    originalContracts.filter(
      (contract) =>
        !owned(contract) &&
        (contract.householdId
          ? calendarHouseholdIds.has(contract.householdId)
          : contract.recipientIncome
            ? calendarHouseholdIds.has(contract.recipientIncome.householdId)
            : false),
    ),
    DEFAULT_OPENING_PURCHASE_CALENDAR_DATA,
    registry,
  );
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
            "The public/visitor opening agreement has its own modeled first due date. Annual expenditure statistics do not observe an invoice day, actual payment, legal appropriation, expiry or renewal.",
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
  const savedRecord = <T>(key: string): T | undefined => {
    if (placeMetadata[key] === undefined) return undefined;
    try {
      return JSON.parse(placeMetadata[key]) as T;
    } catch {
      throw new Error(`Invalid saved opening customer metadata: ${key}`);
    }
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
    householdCalendar?: OpeningPurchaseCalendarChoice;
  }) => {
    const calendar = agreementCalendar(
      args.agreementId,
      args.firstDueAt ?? dueAt,
      args.firstDueSource,
    );
    const { end } = calendar;
    const source: Source = {
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
      if (
        args.householdId &&
        args.householdCalendar &&
        !calendar.actualSuppliedDate
      )
        contract.householdPurchaseCalendar =
          createHouseholdPurchaseCalendarMarker(
            args.householdId,
            args.householdCalendar,
            DEFAULT_OPENING_PURCHASE_CALENDAR_DATA,
          );
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
        providerQualification: qualification,
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
    const householdCalendar = purchaseCalendar.household(household);
    for (const gap of householdCalendar.gaps) gaps.add(gap);
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
      let source = generatedSource(
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
        firstDueAt: householdCalendar.dueAt,
        firstDueSource: householdCalendar.source,
        householdCalendar,
      });
      source = boundTerms.source;
      const record: OpeningCustomerEvidenceRecord = {
        id: agreementId,
        kind: "household-service-agreement",
        occurredAt: at,
        subjectIds: payers.map((person) => person.id),
        counterpartyIds: qualificationSellerIds(boundTerms.qualifications),
        placeId: household.placeId,
        basisRecordIds: [
          household.id,
          ...boundTerms.calendarBasisIds,
          ...householdCalendar.basisIds,
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
          contractAmountsMinor: canonical(boundTerms.contractAmountsMinor),
          periodMonths: String(periodMonths),
          effectiveFrom: boundTerms.firstDueAt,
          ...boundTerms.end,
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
      if (!sellerRows.length || share.amount <= zero) {
        gaps.add(
          `opening-customers:public-custodial-budget-unbound:${share.id}`,
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
  const marketsById = new Map<string, OpeningCustomerOutsideMarket>();
  const marketIdsByGeography = new Map<string, string>();
  const savedMarkets: OpeningCustomerOutsideMarket[] = [];
  for (const [key, value] of Object.entries(input.placeMetadata ?? {})) {
    if (!key.startsWith("openingCustomers.market:")) continue;
    let market: OpeningCustomerOutsideMarket;
    try {
      market = JSON.parse(value) as OpeningCustomerOutsideMarket;
    } catch {
      throw new Error(`Invalid saved opening customer market: ${key}`);
    }
    if (key !== `openingCustomers.market:${market.id}`)
      throw new Error(`Conflicting saved opening customer market ID: ${key}`);
    savedMarkets.push(market);
  }
  // Empty transient options do not erase admitted market facts/obligations.
  // Nonempty replacements still undergo alias, account and owning-map checks.
  const suppliedMarkets = options.outsideMarkets?.length
    ? options.outsideMarkets
    : savedMarkets.length
      ? savedMarkets
      : options.outsideMarkets;
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
  const identityRecordIdByOutsideOwner = new Map<string, string>();
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
  const outsideOwnerForMarket = (market: OpeningCustomerOutsideMarket) =>
    options.outsideBuyerIdentityByMarketId?.[market.id]?.organization.id ??
    savedRecord<{ ownerId: string }>(
      `openingCustomers.marketBuyer:${market.id}`,
    )?.ownerId ??
    `${ownedPrefix}outside-household:${stableHash(canonical([market.originPlaceId, market.destinationPlaceId]))}`;
  const qualifiedMarketsByOutsideOwner = new Map<
    string,
    OpeningCustomerOutsideMarket[]
  >();
  for (const market of marketsById.values()) {
    if (
      outsideCount === zero ||
      originalResidentPlaces.has(market.originPlaceId) ||
      (!familyNames.length &&
        !options.outsideBuyerIdentityByMarketId?.[market.id] &&
        input.placeMetadata?.[`openingCustomers.marketBuyer:${market.id}`] ===
          undefined) ||
      !suppliers(
        market.destinationPlaceId,
        outsideRule.supplierClassifications,
        outsideRule.supplierOccupations,
        "visitor-lodging",
      ).length
    )
      continue;
    const ownerId = outsideOwnerForMarket(market);
    const rows = qualifiedMarketsByOutsideOwner.get(ownerId) ?? [];
    rows.push(market);
    qualifiedMarketsByOutsideOwner.set(ownerId, rows);
  }
  type OutsideAllocation = {
    monthlyBudgetMinor: number;
    preservedMonthlyTermsMinor: number;
    preservedContracts: readonly FinanceContractInput[];
    preservedMarketIds: ReadonlySet<string>;
    marketIds: readonly string[];
    marketMonthlyAmountsMinor: Readonly<Record<string, number>>;
  };
  const outsideAllocations = new Map<string, OutsideAllocation>();
  if (qualifiedMarketsByOutsideOwner.size) {
    const monthlyBudgetMinor = Math.round(
      (p(outsideRule.annualLodgingUsdParameter) * p("minorPerDollar")) /
        monthsPerYear,
    );
    minor(monthlyBudgetMinor, "one outside-family lodging envelope");
    for (const [ownerId, markets] of qualifiedMarketsByOutsideOwner) {
      const preservedContracts = originalContracts
        .filter((row) => {
          const claim = row.externalInflow as
            CustomerExternalInflow | undefined;
          return (
            !owned(row) &&
            row.kind === outsideRule.contractKind &&
            row.payerIds.length === one &&
            row.payerIds[zero] === ownerId &&
            claim !== undefined &&
            claim.ownerId === ownerId &&
            "marketId" in claim
          );
        })
        .sort((left, right) =>
          left.id < right.id ? -one : left.id > right.id ? one : zero,
        );
      const preservedMarketIds = new Set(
        preservedContracts.map(
          (row) =>
            (
              row.externalInflow as Extract<
                CustomerExternalInflow,
                { marketId: string }
              >
            ).marketId,
        ),
      );
      const preservedMonthlyTermsMinor = preservedContracts.reduce(
        (total, row) => total + row.amountMinor / row.periodMonths,
        zero,
      );
      if (preservedMonthlyTermsMinor > monthlyBudgetMinor)
        gaps.add(
          `opening-customers:recorded-outside-terms-exceed-estimated-envelope:${ownerId}`,
        );
      const modeledMarketIds = markets
        .filter((row) => !preservedMarketIds.has(row.id))
        .map((row) => row.id)
        .sort();
      const marketMonthlyAmountsMinor = Object.fromEntries(
        apportion(
          Math.max(
            zero,
            Math.floor(monthlyBudgetMinor - preservedMonthlyTermsMinor),
          ),
          modeledMarketIds.map((id) => ({ id, weight: one })),
        ).map((row) => [row.id, row.amount]),
      );
      outsideAllocations.set(ownerId, {
        monthlyBudgetMinor,
        preservedMonthlyTermsMinor,
        preservedContracts,
        preservedMarketIds,
        marketIds: modeledMarketIds,
        marketMonthlyAmountsMinor,
      });
    }
  }
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
        `opening-customers:outside-owner-would-overlap-admitted-residence:${market.id}`,
      );
      continue;
    }
    const sellerRows = suppliers(
      market.destinationPlaceId,
      outsideRule.supplierClassifications,
      outsideRule.supplierOccupations,
      "visitor-lodging",
    );
    if (
      !sellerRows.length ||
      (!familyNames.length &&
        !options.outsideBuyerIdentityByMarketId?.[market.id] &&
        input.placeMetadata?.[`openingCustomers.marketBuyer:${market.id}`] ===
          undefined) ||
      outsideCount === zero
    ) {
      gaps.add(
        `opening-customers:outside-visit-budget-needs-compatible-lodging-and-named-family:${market.id}`,
      );
      continue;
    }
    const allocationOwnerId = outsideOwnerForMarket(market),
      allocation = outsideAllocations.get(allocationOwnerId)!;
    // A supplied standing term also needs its admitted geography saved when
    // transient market options disappear; its own terms remain untouched.
    appendMetadata(`openingCustomers.market:${market.id}`, {
      ...market,
      basisRecordIds: [...market.basisRecordIds],
      source: { ...market.source },
    });
    if (allocation.preservedMarketIds.has(market.id)) {
      const actual = allocation.preservedContracts.filter((row) => {
        const claim = row.externalInflow;
        return claim && "marketId" in claim && claim.marketId === market.id;
      });
      appendMetadata(`openingCustomers.marketBuyer:${market.id}`, {
        ownerId: allocationOwnerId,
        suppliedContractIds: actual.map((row) => row.id).sort(),
        contractSourceMap: Object.fromEntries(
          actual.map((row) => [row.id, { ...row.source }]),
        ),
        contractTermsById: Object.fromEntries(
          actual.map((row) => [
            row.id,
            {
              payerIds: [...row.payerIds],
              payeeId: row.payeeId,
              kind: row.kind,
              amountMinor: row.amountMinor,
              firstDueAt: row.dueAt,
              periodMonths: row.periodMonths,
              ...(row.endsAt === undefined ? {} : { endsAt: row.endsAt }),
              ...(row.settlementPhaseId === undefined
                ? {}
                : { settlementPhaseId: row.settlementPhaseId }),
            },
          ]),
        ),
      });
      gaps.add(
        `opening-customers:preserved-recorded-outside-visitor-terms:${market.id}`,
      );
      continue;
    }
    const monthlyBudget =
      allocation.marketMonthlyAmountsMinor[market.id] ?? zero;
    const mappingKey = `openingCustomers.marketBuyer:${market.id}`;
    const savedMapping = savedRecord<{
      ownerId: string;
      identityRecordId: string;
      visitAgreementRecordId: string;
    }>(mappingKey);
    const suppliedIdentity =
      options.outsideBuyerIdentityByMarketId?.[market.id];
    const defaultBuyerId = `${ownedPrefix}outside-household:${stableHash(
      canonical([market.originPlaceId, market.destinationPlaceId]),
    )}`;
    const buyerId =
      suppliedIdentity?.organization.id ??
      savedMapping?.ownerId ??
      defaultBuyerId;
    const identityId =
      suppliedIdentity?.identity.id ??
      savedMapping?.identityRecordId ??
      `${buyerId}:identity`;
    const visitId =
      savedMapping?.visitAgreementRecordId ??
      (suppliedIdentity
        ? `${buyerId}:visit-budget:${stableHash(market.id)}`
        : `${buyerId}:visit-budget`);
    const defaultSource = generatedSource(
      `${market.source.citation} ${outsideRule.citation}`,
      `A distinct synthetic ${familyNames[zero]} outside-family identity for this origin/destination edge is ESTIMATED, not evidence that similarly named families or repeated origins are one actual household. CEX out-of-town lodging supplies a separately estimated standing payment amount; geography establishes no actual visit, booking or stock. SCF income is context only. ${outsideRule.stopgapId}`,
    );
    const defaultOrganization: OrganizationInput = {
      id: buyerId,
      placeId: market.originPlaceId,
      name: `${familyNames[zero]} household (${market.originPlaceName})`,
      kind: "outside-customer-household",
      classification: "customer:outside-household",
      liquidMinor: zero,
      outsideFlow: {
        ...defaultSource,
        citation: `${defaultSource.citation} Identity ${identityId}; dated source-owned outside obligations only.`,
      },
      source: {
        ...defaultSource,
        citation: `${defaultSource.citation} Identity ${identityId}; no modeled opening stock.`,
      },
    };
    const existing = organizations.get(buyerId);
    const organization =
      suppliedIdentity?.organization ??
      (savedMapping ? existing : defaultOrganization);
    if (
      !organization ||
      organization.id !== buyerId ||
      organization.placeId !== market.originPlaceId ||
      organization.kind !== "outside-customer-household" ||
      organization.classification !== "customer:outside-household" ||
      organization.liquidMinor !== zero ||
      !organization.outsideFlow
    )
      throw new Error(
        `Outside identity must resolve actual zero-stock flow owner: ${market.id}`,
      );
    sourceValid(organization.source, buyerId);
    sourceValid(organization.outsideFlow, buyerId);
    if (existing && canonical(existing) !== canonical(organization))
      throw new Error(`Conflicting outside customer account: ${buyerId}`);
    if (!existing) {
      if (people.has(buyerId))
        throw new Error(`Outside customer ID collides with person: ${buyerId}`);
      organizations.set(buyerId, {
        ...organization,
        source: { ...organization.source },
        outsideFlow: { ...organization.outsideFlow },
      });
      newOrganizationIds.push(buyerId);
    }
    const identityKey = `openingCustomers.evidence:${identityId}`;
    const savedIdentity =
      savedRecord<OpeningCustomerEvidenceRecord>(identityKey);
    const identityRecord: OpeningCustomerEvidenceRecord =
      suppliedIdentity?.identity ??
        savedIdentity ?? {
          id: identityId,
          kind: "outside-household-identity",
          occurredAt: priorAt,
          subjectIds: [buyerId],
          counterpartyIds: [],
          placeId: market.originPlaceId,
          basisRecordIds: [...market.basisRecordIds],
          facts: {
            economicUnit: "one-outside-family",
            identityStatus: "distinct-synthetic-estimated-edge-identity",
            liquidMinor: String(zero),
            annualIncomeGenerationPriorUsd: String(
              p(outsideRule.incomePriorUsdParameter),
            ),
            paymentFunding: "dated-source-owned-obligation-only",
            representation:
              "zero-stock-outside-family-obligation-payer-not-an-employer",
          },
          source: organization.source,
        };
    sourceValid(identityRecord.source, identityId);
    const priorIdentityId = identityRecordIdByOutsideOwner.get(buyerId);
    if (priorIdentityId !== undefined && priorIdentityId !== identityId)
      throw new Error(`Ambiguous canonical outside buyer identity: ${buyerId}`);
    identityRecordIdByOutsideOwner.set(buyerId, identityId);
    if (
      identityRecord.id !== identityId ||
      identityRecord.kind !== "outside-household-identity" ||
      identityRecord.placeId !== market.originPlaceId ||
      canonical(identityRecord.subjectIds) !== canonical([buyerId]) ||
      !Array.isArray(identityRecord.counterpartyIds) ||
      identityRecord.counterpartyIds.length !== zero ||
      (identityRecord.facts.liquidMinor !== undefined &&
        Number(identityRecord.facts.liquidMinor) !== zero) ||
      !identityRecord.basisRecordIds.length ||
      identityRecord.basisRecordIds.some((id) => !id.trim()) ||
      new Set(identityRecord.basisRecordIds).size !==
        identityRecord.basisRecordIds.length ||
      canonical(identityRecord.source) !== canonical(organization.source) ||
      makeIsoDate(identityRecord.occurredAt) > at ||
      makeIsoDate(identityRecord.source.asOf) >
        makeIsoDate(identityRecord.occurredAt)
    )
      throw new Error(
        `Outside buyer identity record does not match actual owner: ${identityId}`,
      );
    if (appendMetadata(identityKey, identityRecord))
      evidence.push(identityRecord);
    appendMetadata(mappingKey, {
      ownerId: buyerId,
      identityRecordId: identityId,
      visitAgreementRecordId: visitId,
    });
    const ownerBudgetRecordId = `${buyerId}:lodging-envelope`;
    const preservedContractSourceMap: Record<string, Source> = {};
    const preservedContractTermsById: Record<
      string,
      OpeningCustomerOutsideBudgetRecord["preservedContractTermsById"][string]
    > = {};
    for (const row of allocation.preservedContracts) {
      preservedContractSourceMap[row.id] = { ...row.source };
      preservedContractTermsById[row.id] = {
        payerIds: [...row.payerIds],
        payeeId: row.payeeId,
        kind: row.kind,
        amountMinor: row.amountMinor,
        firstDueAt: row.dueAt,
        periodMonths: row.periodMonths,
        ...(row.endsAt === undefined ? {} : { endsAt: row.endsAt }),
        settlementPhaseId:
          row.settlementPhaseId ??
          (row.recipientIncome
            ? financePolicyDataJson.defaultPhases.income
            : row.householdId
              ? financePolicyDataJson.defaultPhases.household
              : row.salesReceiptBudget
                ? financePolicyDataJson.defaultPhases.procurement
                : financePolicyDataJson.defaultPhases.other),
      };
    }
    const ownerBudget: OpeningCustomerOutsideBudgetRecord = {
      id: ownerBudgetRecordId,
      ownerId: buyerId,
      identityRecordId: identityId,
      monthlyBudgetMinor: allocation.monthlyBudgetMinor,
      preservedMonthlyTermsMinor: allocation.preservedMonthlyTermsMinor,
      preservedContractIds: allocation.preservedContracts
        .map((row) => row.id)
        .sort(),
      preservedContractSourceMap,
      preservedContractTermsById,
      marketIds: [...allocation.marketIds],
      marketMonthlyAmountsMinor: { ...allocation.marketMonthlyAmountsMinor },
      parameterRefs: [outsideRule.annualLodgingUsdParameter],
      source: {
        ...generatedSource(
          `${identityRecord.source.citation} ${outsideRule.citation}`,
          `One fixed CEX lodging envelope for canonical owner ${buyerId}, divided among its explicitly admitted qualified market edges and actual providers. Existing actually linked supplied visitor terms constrain only the remaining estimated envelope; actual terms are preserved even when above the prior. No family amount is reset per market or seller. ${outsideRule.stopgapId}`,
        ),
        asOf: at,
      },
    };
    appendMetadata(`openingCustomers.outsideBudget:${buyerId}`, ownerBudget);
    if (monthlyBudget <= zero) {
      gaps.add(`opening-customers:outside-visit-envelope-unbound:${market.id}`);
      continue;
    }
    let source = generatedSource(
      `${market.source.citation} ${outsideRule.citation} ${identityRecord.source.citation}`,
      `The actual saved outside identity ${identityId}, market ${market.id}, and owner envelope ${ownerBudgetRecordId} link this estimated standing lodging share. One owner amount is apportioned across its explicitly admitted qualified edges and suppliers, never reset per firm. Payment is due-source-sized outside flow, never SCF wealth or prepaid capital. No delivery is claimed. ${outsideRule.stopgapId}`,
    );
    const refs = [
      outsideRule.incomePriorUsdParameter,
      outsideRule.annualLodgingUsdParameter,
      outsideRule.countPerMarketParameter,
    ];
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
      externalInflow: {
        kind: data.externalInflowKinds.outsidePurchases,
        ownerId: buyerId,
        identityRecordId: identityId,
        visitAgreementRecordId: visitId,
        marketId: market.id,
      },
    });
    source = boundTerms.source;
    const visitRecord: OpeningCustomerEvidenceRecord = {
      id: visitId,
      kind: "outside-visit-budget",
      occurredAt: at,
      subjectIds: [buyerId],
      counterpartyIds: qualificationSellerIds(boundTerms.qualifications),
      placeId: market.destinationPlaceId,
      basisRecordIds: [
        ...market.basisRecordIds,
        identityId,
        ownerBudgetRecordId,
        ...qualificationBasisIds(boundTerms.qualifications),
      ],
      facts: {
        ...qualificationFacts(boundTerms.qualifications),
        identityRecordId: identityId,
        ownerBudgetRecordId,
        marketId: market.id,
        originPlaceId: market.originPlaceId,
        destinationPlaceId: market.destinationPlaceId,
        visitPurpose: "fictional-opening-regional-personal-visit",
        serviceKey: "visitor-lodging",
        monthlyBudgetMinor: String(monthlyBudget),
        contractIds: canonical(boundTerms.contractIds),
        contractAmountsMinor: canonical(boundTerms.contractAmountsMinor),
        contractSourceMap: canonical(boundTerms.contractSourceMap),
        contractTermsById: canonical(boundTerms.contractTermsById),
        periodMonths: String(periodMonths),
        effectiveFrom: boundTerms.firstDueAt,
        ...boundTerms.end,
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
