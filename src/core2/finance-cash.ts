/** Actual finance source adapters. Arithmetic stays in the read-only planner. */
import { makeIsoDate } from "../simulation/dates";
import { cashJournalParameters } from "./cash-host";
import {
  FinancePlanningSession,
  prepareFinanceContract,
  prepareFinanceCredit,
  type PreparedFinancePlan,
} from "./finance-plan";
import type {
  CreditReceipt,
  FinanceCashCreditRequest,
  FinanceCashPolicy,
  FinanceCashSourceState,
  FinanceContractState,
  FinanceCustomerOriginalTerms,
  FinancePublicProcurementExternalInflow,
  FinanceRetirementExternalInflow,
  FinanceVisitorLodgingExternalInflow,
  FinanceReceipt,
} from "./finance-types";
import type {
  CashJournalSourceRef,
  ResolvedCashJournalSource,
} from "./journal";
import type {
  CashJournalSourceProvider,
  CashJournalSourceSlot,
} from "./journal-state";
import { openingHistoricalCountyPlaceCoverage } from "./opening-public-owner";
import {
  openingCustomerQualificationHash,
  openingCustomerQualificationKey,
  openingCustomerQualificationRecord,
} from "./opening-customer-qualification";
import type { OpeningCustomerEvidenceRecord } from "./opening-customers";
import type { OpeningCustomerOutsideMarket } from "./opening-customer-geography";
import { registerModule } from "./state";
import type { CoreAPI, CoreModule, CoreState, Source } from "./types";

type Result = FinanceReceipt | CreditReceipt;
type Related = ResolvedCashJournalSource["relatedRecords"][number];
type Relations = { records: Related[]; required: CashJournalSourceRef[] };
type Pending = {
  plan: PreparedFinancePlan<Result>;
  credits: readonly CreditReceipt[];
};
// Ephemeral preparation only. Every success/cancellation deletes these graphs.
const pending = new WeakMap<FinanceCashSourceState, Pending>();
const compositePreparation = new WeakMap<
  FinanceCashSourceState,
  { previousId?: string }
>();
const installed = new WeakMap<
  CoreState,
  {
    module: CoreModule;
    contract: CashJournalSourceProvider;
    credit: CashJournalSourceProvider;
  }
>();
const mapGet = Map.prototype.get;
const mapHas = Map.prototype.has;
const mapSet = Map.prototype.set;
const mapDelete = Map.prototype.delete;

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
function identity(value: string, field: string): void {
  if (!value || value !== value.trim())
    throw new Error(`Invalid finance cash identity: ${field}`);
}
function minor(value: number, zero: number): void {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error("Invalid current finance cash request.");
}
function source(
  session: FinancePlanningSession,
  value: Source,
  date = session.date,
): Source {
  const r = session.reads;
  if (!value) throw new Error("Actual finance source record is missing.");
  const result: Source = {
    tag: r.field(value, "tag"),
    citation: r.field(value, "citation"),
    asOf: r.field(value, "asOf"),
  };
  const estimatedFrom = r.field(value, "estimatedFrom"),
    vintage = r.field(value, "generationPriorVintage");
  if (estimatedFrom !== undefined) result.estimatedFrom = estimatedFrom;
  if (vintage !== undefined) result.generationPriorVintage = vintage;
  if (
    !["SOURCED", "ESTIMATED"].includes(result.tag) ||
    !result.citation?.trim() ||
    makeIsoDate(result.asOf) > date
  )
    throw new Error("Finance cash source is undated or unavailable.");
  return Object.freeze(result);
}
function config(session: FinancePlanningSession): FinanceCashPolicy {
  const r = session.reads,
    policy = session.policy()!,
    cfg = r.field(policy, "cashJournal");
  if (!cfg) throw new Error("Finance cash namespace data is absent.");
  const kinds = r.field(cfg, "sourceKinds"),
    related = r.field(cfg, "relatedKinds");
  const values = [
    r.field(cfg, "moduleId"),
    r.field(kinds, "contract"),
    r.field(kinds, "credit"),
    ...(
      [
        "terms",
        "facility",
        "award",
        "procurement",
        "authority",
        "appropriation",
        "agreement",
        "job",
        "provider",
        "identity",
        "visit",
        "market",
        "customerBudget",
      ] as const
    ).map((key) => r.field(related, key)),
    r.field(cfg, "financeReceiptPrefix"),
    r.field(cfg, "creditReceiptPrefix"),
    r.field(cfg, "interestContractPrefix"),
    r.field(cfg, "standaloneDrawRequestPrefix"),
  ];
  for (const value of values) identity(value, value);
  if (new Set(values).size !== values.length)
    throw new Error("Finance cash namespaces must be distinct.");
  for (const value of r.array(
    r.field(cfg, "externalInflowKinds"),
    session.zero,
    session.one,
  ))
    identity(value, "external inflow kind");
  return cfg;
}
export function ensureFinanceCashModule(core: CoreState): void {
  const session = new FinancePlanningSession(
    core,
    core.cashJournal,
    cashJournalParameters(core),
  );
  if (!session.policy(false)) return;
  const cfg = config(session),
    kinds = cfg.sourceKinds,
    existing = installed.get(core);
  if (existing) {
    if (
      core.modules.get(cfg.moduleId) !== existing.module ||
      existing.module.journalSourceProviders?.[kinds.contract] !==
        financeCashSourceProvider ||
      existing.module.journalSourceProviders?.[kinds.credit] !==
        financeCashSourceProvider ||
      core.cashJournal.sourceProviders.get(kinds.contract) !==
        existing.contract ||
      core.cashJournal.sourceProviders.get(kinds.credit) !== existing.credit
    )
      throw new Error("Finance cash owning module/namespace changed.");
    return;
  }
  if (
    core.modules.has(cfg.moduleId) ||
    core.cashJournal.sourceProviders.has(kinds.contract) ||
    core.cashJournal.sourceProviders.has(kinds.credit)
  )
    throw new Error("Finance cash namespace is already owned.");
  const module: CoreModule = Object.freeze({
    id: cfg.moduleId,
    journalSourceProviders: Object.freeze({
      [kinds.contract]: financeCashSourceProvider,
      [kinds.credit]: financeCashSourceProvider,
    }),
  });
  registerModule(core, module);
  const contract = core.cashJournal.sourceProviders.get(kinds.contract),
    credit = core.cashJournal.sourceProviders.get(kinds.credit);
  if (!contract || !credit)
    throw new Error(
      "Finance cash provider registration did not install its actual namespace.",
    );
  installed.set(core, { module, contract, credit });
}
function add(relations: Relations, row: Related): void {
  const previous = relations.records.find(
    (value) => value.kind === row.kind && value.id === row.id,
  );
  if (previous) {
    if (!same(previous, row))
      throw new Error("Conflicting actual finance related source.");
    return;
  }
  relations.records.push(row);
  relations.required.push({ kind: row.kind, id: row.id });
}
function fresh(core: CoreState): FinancePlanningSession {
  return new FinancePlanningSession(
    core,
    core.cashJournal,
    cashJournalParameters(core),
  );
}
function currentContract(
  session: FinancePlanningSession,
  id: string,
): FinanceContractState {
  const r = session.reads,
    row = r.mapGet(session.map("contracts"), id);
  if (
    !row ||
    r.field(row, "id") !== id ||
    r.field(row, "endedAt") ||
    r.field(row, "firstDueAt") > session.date ||
    r.field(row, "dueAt") > session.date ||
    r.field(row, "lastSettledAt") === session.date ||
    (r.field(row, "endsAt") !== undefined &&
      session.date >= r.field(row, "endsAt")!)
  )
    throw new Error("Actual standing finance terms are not currently due.");
  source(session, r.field(row, "source"));
  return row;
}
function facilityRecord(
  session: FinancePlanningSession,
  id: string,
  relations: Relations,
  date = session.date,
): void {
  const r = session.reads,
    row = r.mapGet(session.map("facilities"), id),
    cfg = config(session);
  if (!row || r.field(row, "id") !== id)
    throw new Error("Actual credit facility is missing.");
  const borrower = r.field(row, "borrowerId"),
    lender = r.field(row, "lenderId");
  if (
    borrower === lender ||
    (!r.mapGet(r.field(session.core, "organizations"), borrower) &&
      !r.mapGet(r.field(session.core, "people"), borrower)) ||
    (!r.mapGet(r.field(session.core, "organizations"), lender) &&
      !r.mapGet(r.field(session.core, "people"), lender))
  )
    throw new Error("Actual credit facility counterparties are absent.");
  add(relations, {
    kind: r.field(r.field(cfg, "relatedKinds"), "facility"),
    id,
    date,
    source: source(session, r.field(row, "source"), date),
  });
}
function incomeAward(
  session: FinancePlanningSession,
  row: FinanceContractState,
  relations: Relations,
): string | undefined {
  const r = session.reads,
    term = r.field(row, "recipientIncome");
  if (!term) return undefined;
  const personId = r.field(term, "personId"),
    homeId = r.field(term, "householdId"),
    kindId = r.field(term, "kindId"),
    awardId = r.field(term, "sourceFactId");
  const person = r.mapGet(r.field(session.core, "people"), personId),
    home = r.mapGet(r.field(session.core, "households"), homeId);
  const data = session.policy()!,
    rule = r
      .array(r.field(data, "recipientIncomeKinds"), session.zero, session.one)
      .find((value) => r.field(value, "id") === kindId);
  const facts = person ? r.field(person, "pastFacts") : undefined;
  const award = facts
    ? r
        .array(facts, session.zero, session.one)
        .find((value) => r.field(value, "id") === awardId)
    : undefined;
  if (
    !person ||
    !home ||
    r.field(person, "householdId") !== homeId ||
    !r
      .array(r.field(home, "memberIds"), session.zero, session.one)
      .includes(personId) ||
    r.field(row, "payeeId") !== personId ||
    !rule ||
    !award ||
    !r
      .array(r.field(rule, "sourceKinds"), session.zero, session.one)
      .includes(r.field(award, "kind")) ||
    makeIsoDate(r.field(award, "date")) > session.date ||
    r.field(row, "kind") !== r.field(rule, "contractKind") ||
    r.field(row, "householdId") ||
    r.field(row, "salesReceipt") ||
    r.field(row, "salesReceiptBudget") ||
    r.field(row, "marketAdjusted") ||
    r.field(row, "accruesArrears") ||
    r.field(row, "creditFacilityId") ||
    r.field(row, "interestFacilityId") ||
    r.field(row, "periodMonths") !== session.one
  )
    throw new Error(
      "Actual income term does not resolve its current qualified award.",
    );
  const values = r.field(award, "facts"),
    payers = r.array(r.field(row, "payerIds"), session.zero, session.one);
  const qualification = r.field(rule, "qualifyingFactsBySourceKind"),
    required = qualification
      ? r.field(qualification, r.field(award, "kind"))
      : undefined;
  if (
    !values ||
    r.field(values, "status") !== r.field(rule, "status") ||
    payers.length !== session.one ||
    r.field(values, "payerId") !== payers[session.zero] ||
    Number(r.field(values, "monthlyMinor")) !== r.field(row, "amountMinor") ||
    (r.field(values, "kindId") && r.field(values, "kindId") !== kindId) ||
    (r.field(values, "householdId") &&
      r.field(values, "householdId") !== homeId) ||
    Object.keys(required ?? {}).some(
      (key) => r.field(values, key) !== r.field(required!, key),
    )
  )
    throw new Error("Current income obligation contradicts its actual award.");
  add(relations, {
    kind: config(session).relatedKinds.award,
    id: awardId,
    date: r.field(award, "date"),
    source: source(session, r.field(award, "source"), r.field(award, "date")),
  });
  return awardId;
}
type PublicProcurementWitness = Readonly<{
  buyerId: string;
  authorityRecordId: string;
  appropriationRecordId: string;
  agreementRecordId: string;
  authority: Readonly<Record<string, unknown>>;
  appropriation: Readonly<Record<string, unknown>>;
  agreement: Readonly<Record<string, unknown>>;
  rule: FinanceCashPolicy["procurement"][number];
}>;
type VisitorLodgingWitness = Readonly<{
  ownerId: string;
  identityRecordId: string;
  visitAgreementRecordId: string;
  marketId: string;
}>;

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Actual customer ${label} record is missing.`);
  return value as Record<string, unknown>;
}
function uniqueIds(value: unknown, label: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((id) => typeof id !== "string" || !id || id !== id.trim()) ||
    new Set(value).size !== value.length
  )
    throw new Error(`Actual customer ${label} lacks unique owning IDs.`);
  return value as string[];
}
function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

/** Guarded owning phase semantics; raw optional terms stay unchanged. */
function effectiveSettlementPhase(
  session: FinancePlanningSession,
  row: FinanceContractState,
): string {
  const r = session.reads,
    policy = session.policy();
  if (!policy) throw new Error("Finance policy data is absent.");
  const defaults = r.field(policy, "defaultPhases"),
    registered = r.field(policy, "settlementPhases");
  if (!defaults || !Array.isArray(registered))
    throw new Error(
      "Finance requires registered settlement phases and defaults.",
    );
  const funding = r.field(defaults, "funding"),
    income = r.field(defaults, "income"),
    household = r.field(defaults, "household"),
    procurement = r.field(defaults, "procurement"),
    other = r.field(defaults, "other"),
    phases = r.array(registered, session.zero, session.one).map((phase) => ({
      id: r.field(phase, "id"),
      operation: r.field(phase, "operation"),
    }));
  if (
    !phases.length ||
    new Set(phases.map((phase) => phase.id)).size !== phases.length ||
    phases.some(
      (phase) =>
        typeof phase.id !== "string" ||
        !phase.id.trim() ||
        !["settle", "procure"].includes(phase.operation),
    )
  )
    throw new Error("Finance requires distinct named settlement phases.");
  const required = [funding, income, household, procurement],
    positions = required.map((id) =>
      phases.findIndex((phase) => phase.id === id),
    );
  if (
    positions.some(
      (position, index) =>
        position < session.zero ||
        (index > session.zero && position <= positions[index - session.one]!),
    ) ||
    !phases.some((phase) => phase.id === other) ||
    phases.find((phase) => phase.id === procurement)?.operation !== "procure" ||
    required
      .slice(session.zero, -session.one)
      .some(
        (id) => phases.find((phase) => phase.id === id)?.operation !== "settle",
      )
  )
    throw new Error(
      "Finance phases must fund income before household purchases and procurement.",
    );
  const explicit = r.field(row, "settlementPhaseId"),
    recipient = r.field(row, "recipientIncome"),
    householdId = r.field(row, "householdId"),
    salesBudget = r.field(row, "salesReceiptBudget"),
    id =
      explicit ??
      (recipient
        ? income
        : householdId
          ? household
          : salesBudget
            ? procurement
            : other),
    phase = phases.find((entry) => entry.id === id);
  if (
    !phase ||
    (salesBudget && phase.operation !== "procure") ||
    (recipient && id !== income) ||
    (householdId && id !== household)
  )
    throw new Error(
      "Finance contract has an incompatible or unregistered settlement phase.",
    );
  return phase.id;
}

/** Saved original allocation, bounded by this one agreement's contract IDs. */
function customerAllocation(
  session: FinancePlanningSession,
  row: FinanceContractState,
  relations: Relations,
  ownerId: string,
  supplierIds: readonly string[],
  agreement: Readonly<Record<string, unknown>>,
): void {
  const r = session.reads,
    ids = uniqueIds(agreement.contractIds, "agreement contract IDs"),
    originals = objectRecord(agreement.contractTermsById, "original terms map"),
    sources = objectRecord(agreement.contractSourceMap, "full Source map"),
    monthlyBudget = agreement.monthlyBudgetMinor,
    effectiveFrom = agreement.effectiveFrom,
    endsAt = agreement.endsAt,
    suppliedAmounts =
      agreement.contractAmountsMinor === undefined
        ? undefined
        : objectRecord(agreement.contractAmountsMinor, "cadence amount map"),
    suppliedPeriod = agreement.periodMonths;
  if (
    typeof monthlyBudget !== "number" ||
    typeof effectiveFrom !== "string" ||
    makeIsoDate(effectiveFrom) > session.date ||
    (endsAt !== undefined &&
      (typeof endsAt !== "string" || makeIsoDate(endsAt) <= session.date)) ||
    !ids.includes(r.field(row, "id")) ||
    r.field(row, "dueAt") !== session.date ||
    !sameIds(Object.keys(originals), ids) ||
    !sameIds(Object.keys(sources), ids) ||
    (suppliedAmounts !== undefined &&
      !sameIds(Object.keys(suppliedAmounts), ids)) ||
    (suppliedPeriod !== undefined &&
      suppliedPeriod !== r.field(row, "periodMonths"))
  )
    throw new Error(
      "Actual customer allocation has no exact current dated obligation.",
    );
  minor(monthlyBudget, session.zero);
  const sellers: string[] = [];
  let allocatedNumerator = BigInt(session.zero),
    allocatedDenominator = BigInt(session.one);
  for (const id of ids.slice().sort()) {
    const actual = r.mapGet(session.map("contracts"), id),
      original = objectRecord(
        originals[id],
        "original contract terms",
      ) as unknown as FinanceCustomerOriginalTerms;
    const originalKeys = Object.keys(original),
      required = [
        "payerIds",
        "payeeId",
        "kind",
        "amountMinor",
        "firstDueAt",
        "periodMonths",
        "settlementPhaseId",
      ];
    if (
      !actual ||
      r.field(actual, "id") !== id ||
      required.some((key) => !originalKeys.includes(key)) ||
      originalKeys.some((key) => !required.includes(key) && key !== "endsAt") ||
      !sameIds(uniqueIds(original.payerIds, "original payer IDs"), [ownerId]) ||
      !same(
        r.array(r.field(actual, "payerIds"), session.zero, session.one),
        original.payerIds,
      ) ||
      r.field(actual, "payeeId") !== original.payeeId ||
      r.field(actual, "kind") !== original.kind ||
      original.kind !== r.field(row, "kind") ||
      r.field(actual, "amountMinor") !== original.amountMinor ||
      (suppliedAmounts !== undefined &&
        suppliedAmounts[id] !== original.amountMinor) ||
      r.field(actual, "firstDueAt") !== original.firstDueAt ||
      makeIsoDate(original.firstDueAt) < makeIsoDate(effectiveFrom) ||
      r.field(actual, "periodMonths") !== original.periodMonths ||
      (suppliedPeriod !== undefined &&
        suppliedPeriod !== original.periodMonths) ||
      r.field(actual, "endsAt") !== original.endsAt ||
      (endsAt !== undefined && original.endsAt !== endsAt) ||
      (original.endsAt !== undefined &&
        makeIsoDate(original.endsAt) <= makeIsoDate(original.firstDueAt)) ||
      effectiveSettlementPhase(session, actual) !==
        original.settlementPhaseId ||
      original.settlementPhaseId !== effectiveSettlementPhase(session, row) ||
      r.field(actual, "accruesArrears") ||
      r.field(actual, "marketAdjusted") ||
      r.field(actual, "salesReceiptBudget") ||
      r.field(actual, "salesReceipt") !== true ||
      r.field(actual, "creditFacilityId") ||
      r.field(actual, "interestFacilityId") ||
      r.field(actual, "householdId") ||
      r.field(actual, "recipientIncome") ||
      !supplierIds.includes(original.payeeId) ||
      sellers.includes(original.payeeId)
    )
      throw new Error(
        "Actual customer standing terms differ from their owning original allocation.",
      );
    identity(original.payeeId, "original supplier ID");
    minor(original.amountMinor, session.zero);
    minor(original.periodMonths, session.zero);
    if (
      original.amountMinor <= session.zero ||
      original.periodMonths <= session.zero
    )
      throw new Error(
        "Actual customer allocation is not an exact positive cadence amount.",
      );
    const amount = BigInt(original.amountMinor),
      period = BigInt(original.periodMonths);
    allocatedNumerator =
      allocatedNumerator * period + amount * allocatedDenominator;
    allocatedDenominator *= period;
    let dividend = allocatedNumerator,
      divisor = allocatedDenominator;
    while (divisor !== BigInt(session.zero)) {
      const remainder = dividend % divisor;
      dividend = divisor;
      divisor = remainder;
    }
    allocatedNumerator /= dividend;
    allocatedDenominator /= dividend;
    sellers.push(original.payeeId);
    const actualSource = source(
      session,
      r.field(actual, "source"),
      original.firstDueAt,
    );
    if (
      !same(
        actualSource,
        source(session, sources[id] as Source, original.firstDueAt),
      )
    )
      throw new Error(
        "Actual customer Source differs from the full owning contract Source map.",
      );
    add(relations, {
      kind: config(session).relatedKinds.terms,
      id,
      date: session.date,
      source: actualSource,
    });
    // Sibling dueAt/lastSettledAt can advance independently after a valid payment.
  }
  if (
    !sameIds(sellers, supplierIds) ||
    allocatedNumerator !== BigInt(monthlyBudget) * allocatedDenominator
  )
    throw new Error(
      "Actual customer sibling allocation differs from its recorded monthly budget.",
    );
}

/** Original ReadGuard owns the actual provider, facts object and encoded record. */
function customerQualification(
  session: FinancePlanningSession,
  value: unknown,
  organizationId: string,
  serviceKey: string,
): Record<string, unknown> {
  const claim = objectRecord(value, "provider qualification");
  if (!("qualificationId" in claim)) return claim; // Preserve actual inline saved input.
  if (
    typeof claim.qualificationId !== "string" ||
    !claim.qualificationId.trim() ||
    typeof claim.qualificationHash !== "string" ||
    !claim.qualificationHash.trim() ||
    claim.organizationId !== organizationId ||
    claim.serviceKey !== serviceKey ||
    "jobIds" in claim ||
    "providerRecordIds" in claim ||
    "sources" in claim
  )
    throw new Error(
      "Actual customer qualification reference contradicts its owning provider.",
    );
  const r = session.reads;
  const owner = r.mapGet(
    r.field(session.core, "organizations"),
    organizationId,
  );
  if (!owner || r.field(owner, "id") !== organizationId)
    throw new Error("Actual customer qualification provider is missing.");
  const facts = r.field(owner, "governmentFacts");
  const raw = facts
    ? r.field(facts, openingCustomerQualificationKey(claim.qualificationId))
    : undefined;
  if (typeof raw !== "string")
    throw new Error(
      "Actual customer qualification registry record is missing.",
    );
  const record = openingCustomerQualificationRecord(JSON.parse(raw));
  if (
    record.qualificationId !== claim.qualificationId ||
    record.organizationId !== organizationId ||
    record.serviceKey !== serviceKey ||
    openingCustomerQualificationHash(record) !== claim.qualificationHash
  )
    throw new Error(
      "Actual customer qualification registry differs from its original complete witness.",
    );
  return record as unknown as Record<string, unknown>;
}

/** Exact actual seller, product scope, owned active job or saved provider, and Source. */
function visitorProviderRecords(
  session: FinancePlanningSession,
  row: FinanceContractState,
  relations: Relations,
  destinationPlaceId: string,
  qualifications: unknown,
): readonly string[] {
  const r = session.reads,
    cfg = config(session),
    rule = r.field(cfg, "visitorLodging"),
    payeeId = r.field(row, "payeeId"),
    serviceKey = r.field(rule, "serviceKey"),
    supplier = r.mapGet(r.field(session.core, "organizations"), payeeId);
  if (
    !supplier ||
    r.field(supplier, "id") !== payeeId ||
    r.field(supplier, "placeId") !== destinationPlaceId ||
    !r
      .array(
        r.field(rule, "supplierClassifications"),
        session.zero,
        session.one,
      )
      .includes(r.field(supplier, "classification")!)
  )
    throw new Error(
      "Actual visitor supplier has another product or destination geography.",
    );
  source(session, r.field(supplier, "source"));
  const selected = Array.isArray(qualifications)
    ? qualifications.filter(
        (value) =>
          value.organizationId === payeeId && value.serviceKey === serviceKey,
      )
    : [];
  if (selected.length !== session.one)
    throw new Error(
      "Actual visitor agreement has no exact provider qualification.",
    );
  const q = customerQualification(
      session,
      selected[session.zero],
      payeeId,
      serviceKey,
    ),
    jobs = Array.isArray(q.jobIds) ? (q.jobIds as string[]) : [],
    providers = Array.isArray(q.providerRecordIds)
      ? (q.providerRecordIds as string[])
      : [],
    bases = Array.isArray(q.sources)
      ? (q.sources as Record<string, unknown>[])
      : [];
  const basisIds = uniqueIds([...jobs, ...providers], "product basis IDs");
  if (bases.length !== basisIds.length)
    throw new Error(
      "Actual visitor product scope has no unique recorded basis.",
    );
  for (const jobId of jobs) {
    const job = r.mapGet(r.field(session.core, "jobs"), jobId),
      basis = bases.filter(
        (value) => value.kind === "job" && value.recordId === jobId,
      ),
      person = job
        ? r.mapGet(r.field(session.core, "people"), r.field(job, "personId"))
        : undefined;
    if (
      !job ||
      r.field(job, "id") !== jobId ||
      r.field(job, "organizationId") !== payeeId ||
      !person ||
      r.field(person, "jobId") !== jobId ||
      (r.field(job, "endsAt") !== undefined &&
        session.date >= r.field(job, "endsAt")!) ||
      basis.length !== session.one ||
      basis[session.zero]!.occupationClassification !==
        r.field(job, "occupationClassification") ||
      !r
        .array(r.field(rule, "supplierOccupations"), session.zero, session.one)
        .includes(r.field(job, "occupationClassification")!)
    )
      throw new Error(
        "Visitor qualification no longer resolves its actual product job.",
      );
    const evidence = source(session, r.field(job, "source"));
    if (!same(evidence, source(session, basis[session.zero]!.source as Source)))
      throw new Error(
        "Actual visitor product-job Source differs from the agreement.",
      );
    add(relations, {
      kind: cfg.relatedKinds.job,
      id: jobId,
      date: evidence.asOf,
      source: evidence,
    });
  }
  for (const providerId of providers) {
    const raw = r.field(
        r.field(session.core, "placeMetadata"),
        `${r.field(rule, "providerMetadataPrefix")}${providerId}`,
      ),
      provider =
        raw === undefined
          ? undefined
          : objectRecord(JSON.parse(raw), "saved provider"),
      basis = bases.filter(
        (value) =>
          value.kind === "recorded-provider" && value.recordId === providerId,
      );
    if (
      !provider ||
      provider.id !== providerId ||
      provider.organizationId !== payeeId ||
      !Array.isArray(provider.serviceKeys) ||
      !provider.serviceKeys.includes(serviceKey) ||
      basis.length !== session.one
    )
      throw new Error(
        "Visitor qualification no longer resolves its actual provider record.",
      );
    const evidence = source(session, provider.source as Source);
    if (!same(evidence, source(session, basis[session.zero]!.source as Source)))
      throw new Error(
        "Actual visitor provider Source differs from the agreement.",
      );
    add(relations, {
      kind: cfg.relatedKinds.provider,
      id: providerId,
      date: evidence.asOf,
      source: evidence,
    });
  }
  return basisIds;
}

function visitorLodgingRecords(
  session: FinancePlanningSession,
  row: FinanceContractState,
  relations: Relations,
  inflow: FinanceVisitorLodgingExternalInflow,
): VisitorLodgingWitness {
  const r = session.reads,
    cfg = config(session),
    rule = r.field(cfg, "visitorLodging"),
    ownerId = r.field(inflow, "ownerId"),
    identityId = r.field(inflow, "identityRecordId"),
    visitId = r.field(inflow, "visitAgreementRecordId"),
    marketId = r.field(inflow, "marketId"),
    metadata = r.field(session.core, "placeMetadata");
  for (const id of [identityId, visitId, marketId])
    identity(id, "visitor owning record ID");
  const read = (prefix: string, id: string) => {
    const raw = r.field(metadata, `${prefix}${id}`);
    if (raw === undefined)
      throw new Error("Actual saved visitor owning record is missing.");
    return objectRecord(JSON.parse(raw), "saved visitor evidence");
  };
  const identityRecord = read(
      r.field(rule, "identityMetadataPrefix"),
      identityId,
    ) as unknown as OpeningCustomerEvidenceRecord,
    visit = read(
      r.field(rule, "visitMetadataPrefix"),
      visitId,
    ) as unknown as OpeningCustomerEvidenceRecord,
    market = read(
      r.field(rule, "marketMetadataPrefix"),
      marketId,
    ) as unknown as OpeningCustomerOutsideMarket,
    owner = r.mapGet(r.field(session.core, "organizations"), ownerId),
    facts = objectRecord(visit.facts, "visit facts"),
    identityFacts = objectRecord(identityRecord.facts, "identity facts");
  const marketBasis = uniqueIds(market.basisRecordIds, "market basis IDs"),
    visitBasis = uniqueIds(visit.basisRecordIds, "visit basis IDs");
  uniqueIds(identityRecord.basisRecordIds, "independent identity basis IDs");
  if (
    !owner ||
    identityRecord.id !== identityId ||
    identityRecord.kind !== r.field(rule, "identityKind") ||
    !sameIds(uniqueIds(identityRecord.subjectIds, "identity subjects"), [
      ownerId,
    ]) ||
    !Array.isArray(identityRecord.counterpartyIds) ||
    identityRecord.counterpartyIds.length !== session.zero ||
    identityRecord.placeId !== market.originPlaceId ||
    r.field(owner, "placeId") !== market.originPlaceId ||
    (identityFacts.liquidMinor !== undefined &&
      Number(identityFacts.liquidMinor) !== session.zero) ||
    makeIsoDate(identityRecord.occurredAt) > session.date ||
    visit.id !== visitId ||
    visit.kind !== r.field(rule, "visitKind") ||
    !sameIds(uniqueIds(visit.subjectIds, "visit subjects"), [ownerId]) ||
    visit.placeId !== market.destinationPlaceId ||
    makeIsoDate(visit.occurredAt) > session.date ||
    makeIsoDate(identityRecord.occurredAt) > makeIsoDate(visit.occurredAt) ||
    market.id !== marketId ||
    !market.originPlaceId ||
    !market.destinationPlaceId ||
    market.originPlaceId === market.destinationPlaceId ||
    !market.originPlaceName?.trim() ||
    !Number.isFinite(market.originSourcePopulation) ||
    market.originSourcePopulation <= session.zero ||
    facts.marketId !== marketId ||
    facts.identityRecordId !== identityId ||
    facts.originPlaceId !== market.originPlaceId ||
    facts.destinationPlaceId !== market.destinationPlaceId ||
    facts.serviceKey !== r.field(rule, "serviceKey") ||
    !visitBasis.includes(identityId) ||
    marketBasis.some((id) => !visitBasis.includes(id))
  )
    throw new Error(
      "Actual visitor identity, visit and market contradict their owner or geography.",
    );
  const residents = r.mapGet(
    r.field(session.core, "peopleByPlace"),
    market.originPlaceId,
  );
  if (residents && r.size(residents) > session.zero)
    throw new Error(
      "Actual outside visitor origin overlaps admitted resident geography.",
    );
  const identitySource = source(
      session,
      identityRecord.source,
      identityRecord.occurredAt,
    ),
    visitSource = source(session, visit.source, visit.occurredAt),
    marketSource = source(session, market.source, visit.occurredAt);
  if (!same(identitySource, source(session, r.field(owner, "source"))))
    throw new Error(
      "Actual visitor identity Source differs from its independent owner.",
    );
  const budgetId = facts.ownerBudgetRecordId;
  if (typeof budgetId !== "string" || !visitBasis.includes(budgetId))
    throw new Error(
      "Actual visitor visit lacks its independently owned family budget link.",
    );
  identity(budgetId, "outside family budget record ID");
  const budget = read(r.field(rule, "ownerBudgetMetadataPrefix"), ownerId),
    budgetMarkets = uniqueIds(budget.marketIds, "family budget market IDs"),
    budgetAmounts = objectRecord(
      budget.marketMonthlyAmountsMinor,
      "family budget market shares",
    );
  if (
    budget.id !== budgetId ||
    budget.ownerId !== ownerId ||
    budget.identityRecordId !== identityId ||
    typeof budget.monthlyBudgetMinor !== "number" ||
    typeof budget.preservedMonthlyTermsMinor !== "number" ||
    !Array.isArray(budget.preservedContractIds) ||
    !budgetMarkets.includes(marketId) ||
    !sameIds(Object.keys(budgetAmounts), budgetMarkets) ||
    budgetAmounts[marketId] !== Number(facts.monthlyBudgetMinor)
  )
    throw new Error(
      "Actual visitor visit differs from its independent owning family budget allocation.",
    );
  minor(budget.monthlyBudgetMinor, session.zero);
  if (
    !Number.isFinite(budget.preservedMonthlyTermsMinor) ||
    budget.preservedMonthlyTermsMinor < session.zero
  )
    throw new Error("Actual preserved visitor monthly rate is invalid.");
  let modeledAllocation = BigInt(session.zero);
  for (const id of budgetMarkets) {
    const amount = budgetAmounts[id],
      actualMarket = read(
        r.field(rule, "marketMetadataPrefix"),
        id,
      ) as unknown as OpeningCustomerOutsideMarket;
    if (
      typeof amount !== "number" ||
      actualMarket.id !== id ||
      actualMarket.originPlaceId !== market.originPlaceId ||
      !actualMarket.destinationPlaceId ||
      actualMarket.destinationPlaceId === actualMarket.originPlaceId
    )
      throw new Error(
        "Actual family budget share does not resolve its original outside market.",
      );
    uniqueIds(actualMarket.basisRecordIds, "family budget market basis IDs");
    source(session, actualMarket.source, visit.occurredAt);
    minor(amount, session.zero);
    modeledAllocation += BigInt(amount);
  }
  const availableBudget = BigInt(budget.monthlyBudgetMinor) - modeledAllocation;
  if (
    availableBudget < BigInt(session.zero) ||
    budget.preservedMonthlyTermsMinor > Number(availableBudget)
  )
    throw new Error(
      "Actual outside family budget repeats or exceeds its saved source-owned envelope.",
    );
  if (budget.preservedContractIds !== undefined) {
    const ids = budget.preservedContractIds;
    if (
      !Array.isArray(ids) ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => typeof id !== "string" || !id || id !== id.trim())
    )
      throw new Error(
        "Actual family budget has invalid original preserved contract IDs.",
      );
    const originalTerms = objectRecord(
        budget.preservedContractTermsById,
        "preserved original terms map",
      ),
      originalSources = objectRecord(
        budget.preservedContractSourceMap,
        "preserved full Source map",
      );
    if (
      !sameIds(Object.keys(originalTerms), ids as string[]) ||
      !sameIds(Object.keys(originalSources), ids as string[])
    )
      throw new Error(
        "Actual family envelope preserved owning maps do not match its exact original IDs.",
      );
    let preserved = session.zero;
    for (const id of (ids as string[]).slice().sort()) {
      const term = r.mapGet(session.map("contracts"), id),
        original = objectRecord(
          originalTerms[id],
          "preserved original standing terms",
        ) as unknown as FinanceCustomerOriginalTerms;
      if (
        !term ||
        r.field(term, "id") !== id ||
        !same(r.array(r.field(term, "payerIds"), session.zero, session.one), [
          ownerId,
        ]) ||
        r.field(term, "kind") !== r.field(row, "kind") ||
        r.field(term, "salesReceipt") !== true ||
        r.field(term, "accruesArrears") ||
        !same(
          r.array(r.field(term, "payerIds"), session.zero, session.one),
          original.payerIds,
        ) ||
        r.field(term, "payeeId") !== original.payeeId ||
        r.field(term, "kind") !== original.kind ||
        r.field(term, "amountMinor") !== original.amountMinor ||
        r.field(term, "periodMonths") !== original.periodMonths ||
        r.field(term, "firstDueAt") !== original.firstDueAt ||
        r.field(term, "endsAt") !== original.endsAt ||
        effectiveSettlementPhase(session, term) !== original.settlementPhaseId
      )
        throw new Error(
          "Actual family envelope preserved terms no longer resolve their original owner/product.",
        );
      const amount = r.field(term, "amountMinor"),
        period = r.field(term, "periodMonths");
      minor(amount, session.zero);
      minor(period, session.zero);
      if (amount <= session.zero || period <= session.zero)
        throw new Error(
          "Actual preserved visitor amount has no positive recorded cadence.",
        );
      preserved += amount / period;
      const evidence = source(
        session,
        r.field(term, "source"),
        r.field(term, "firstDueAt"),
      );
      if (
        !same(
          evidence,
          source(session, originalSources[id] as Source, original.firstDueAt),
        )
      )
        throw new Error(
          "Actual preserved visitor Source differs from the owning full Source map.",
        );
      add(relations, {
        kind: cfg.relatedKinds.terms,
        id,
        date: session.date,
        source: evidence,
      });
    }
    if (
      !Number.isFinite(preserved) ||
      preserved !== budget.preservedMonthlyTermsMinor
    )
      throw new Error(
        "Actual preserved visitor terms differ from the family envelope allocation.",
      );
  }
  const budgetSource = source(
    session,
    budget.source as Source,
    visit.occurredAt,
  );
  add(relations, {
    kind: cfg.relatedKinds.customerBudget,
    id: budgetId,
    date: budgetSource.asOf,
    source: budgetSource,
  });
  const qualifications = JSON.parse(String(facts.providerQualifications)),
    supplierIds = uniqueIds(visit.counterpartyIds, "visit counterparties");
  if (
    !Array.isArray(qualifications) ||
    !sameIds(
      uniqueIds(
        qualifications.map((value) => value.organizationId),
        "qualification suppliers",
      ),
      supplierIds,
    ) ||
    qualifications.some(
      (value) => value.serviceKey !== r.field(rule, "serviceKey"),
    )
  )
    throw new Error(
      "Actual visitor counterparties differ from the saved product qualifications.",
    );
  const productBasis = visitorProviderRecords(
    session,
    row,
    relations,
    market.destinationPlaceId,
    qualifications,
  );
  if (productBasis.some((id) => !visitBasis.includes(id)))
    throw new Error("Actual visitor visit omits its owning product basis.");
  customerAllocation(session, row, relations, ownerId, supplierIds, {
    contractIds: JSON.parse(String(facts.contractIds)),
    contractTermsById: JSON.parse(String(facts.contractTermsById)),
    contractSourceMap: JSON.parse(String(facts.contractSourceMap)),
    ...(facts.contractAmountsMinor !== undefined
      ? { contractAmountsMinor: JSON.parse(String(facts.contractAmountsMinor)) }
      : {}),
    ...(facts.periodMonths !== undefined
      ? { periodMonths: Number(facts.periodMonths) }
      : {}),
    monthlyBudgetMinor: Number(facts.monthlyBudgetMinor),
    effectiveFrom: facts.effectiveFrom,
    ...(facts.endsAt !== undefined ? { endsAt: facts.endsAt } : {}),
  });
  for (const [kind, id, date, evidence] of [
    [
      cfg.relatedKinds.identity,
      identityId,
      identityRecord.occurredAt,
      identitySource,
    ],
    [cfg.relatedKinds.visit, visitId, visit.occurredAt, visitSource],
    [cfg.relatedKinds.market, marketId, marketSource.asOf, marketSource],
  ] as const)
    add(relations, { kind, id, date, source: evidence });
  return Object.freeze({
    ownerId,
    identityRecordId: identityId,
    visitAgreementRecordId: visitId,
    marketId,
  });
}

function publicCustomerRecords(
  session: FinancePlanningSession,
  row: FinanceContractState,
  relations: Relations,
  inflow: FinancePublicProcurementExternalInflow,
  witness: PublicProcurementWitness | undefined,
): void {
  const r = session.reads;
  if (
    !witness ||
    witness.buyerId !== r.field(inflow, "ownerId") ||
    witness.authorityRecordId !== r.field(inflow, "authorityRecordId") ||
    witness.appropriationRecordId !==
      r.field(inflow, "appropriationRecordId") ||
    witness.agreementRecordId !== r.field(inflow, "agreementRecordId")
  )
    throw new Error(
      "External public descriptor differs from its independently owned witness.",
    );
  const { authority, appropriation, agreement, rule } = witness,
    supplier = r.mapGet(
      r.field(session.core, "organizations"),
      r.field(row, "payeeId"),
    ),
    buyer = r.mapGet(r.field(session.core, "organizations"), witness.buyerId)!,
    coveredPlaceId = appropriation.coveredPlaceId;
  if (
    typeof coveredPlaceId !== "string" ||
    !supplier ||
    r.field(supplier, "id") !== r.field(row, "payeeId") ||
    r.field(supplier, "placeId") !== coveredPlaceId ||
    !r
      .array(
        r.field(rule, "supplierClassifications"),
        session.zero,
        session.one,
      )
      .includes(r.field(supplier, "classification")!) ||
    authority.effectiveFrom !== agreement.effectiveFrom ||
    appropriation.effectiveFrom !== agreement.effectiveFrom ||
    authority.endsAt !== agreement.endsAt ||
    appropriation.endsAt !== agreement.endsAt
  )
    throw new Error(
      "Actual public supplier geography or supplied authority dates disagree.",
    );
  source(session, r.field(supplier, "source"));
  if (
    appropriation.ownerCoverage !== undefined ||
    r.field(buyer, "placeId") !== coveredPlaceId
  ) {
    const saved = objectRecord(
        appropriation.ownerCoverage,
        "public owner coverage",
      ),
      facts = r.field(buyer, "governmentFacts")!,
      snapshotFacts: Record<string, string> = {};
    for (const key of r.keys(facts)) {
      if (typeof key !== "string")
        throw new Error("Actual public owner facts require string keys.");
      snapshotFacts[key] = r.field(facts, key);
    }
    const coverage = openingHistoricalCountyPlaceCoverage(
      {
        id: r.field(buyer, "id"),
        name: r.field(buyer, "name"),
        placeId: r.field(buyer, "placeId"),
        kind: r.field(buyer, "kind"),
        classification: r.field(buyer, "classification"),
        liquidMinor: r.field(buyer, "liquidMinor"),
        source: source(session, r.field(buyer, "source")),
        governmentFacts: snapshotFacts,
      },
      {
        startedAt: r.field(session.core, "startedAt"),
        placeId: coveredPlaceId,
      },
    );
    const matched = coverage.coverage,
      agreementBasis = Array.isArray(agreement.basisRecordIds)
        ? (agreement.basisRecordIds as string[])
        : [];
    if (
      !matched ||
      matched.placeId !== coveredPlaceId ||
      typeof saved.representedResidentCount !== "number" ||
      !Number.isSafeInteger(saved.representedResidentCount) ||
      saved.representedResidentCount <= session.zero ||
      saved.governmentKey !== r.field(facts, "governmentKey") ||
      saved.jurisdictionId !== r.field(facts, "governmentJurisdictionId") ||
      appropriation.coveredOriginalResidentCount !==
        saved.representedResidentCount ||
      !sameIds(
        uniqueIds(saved.basisRecordIds, "public coverage basis"),
        matched.basisRecordIds,
      ) ||
      !same(
        source(session, saved.identitySource as Source),
        source(session, matched.identitySource),
      ) ||
      !same(
        source(session, saved.coverageSource as Source),
        source(session, matched.coverageSource),
      ) ||
      matched.basisRecordIds.some((id) => !agreementBasis.includes(id))
    )
      throw new Error(
        "Actual public county-to-place coverage differs from its owning recorded geography.",
      );
  }
  customerAllocation(
    session,
    row,
    relations,
    witness.buyerId,
    uniqueIds(agreement.supplierIds, "public supplier IDs"),
    {
      ...agreement,
      monthlyBudgetMinor: appropriation.monthlyBudgetMinor,
    },
  );
}

function procurementRecords(
  session: FinancePlanningSession,
  row: FinanceContractState,
  relations: Relations,
): PublicProcurementWitness | undefined {
  const r = session.reads,
    cfg = config(session),
    kind = r.field(row, "kind");
  if (r.field(row, "salesReceiptBudget")) {
    const payer = r.array(r.field(row, "payerIds"), session.zero, session.one)[
        session.zero
      ]!,
      pool = r.mapGet(session.map("salesBudgetPoolsByPayer"), payer);
    if (
      !pool ||
      r.field(pool, "date") !== session.date ||
      !r.mapGet(r.field(pool, "basisByContract"), row.id) ||
      r.mapGet(r.field(pool, "requestedByContract"), row.id) === undefined
    )
      throw new Error("Actual dated procurement requirement is missing.");
    add(relations, {
      kind: cfg.relatedKinds.procurement,
      id: row.id,
      date: session.date,
      source: source(session, r.field(row, "source")),
    });
  }
  const rule = r
    .array(r.field(cfg, "procurement"), session.zero, session.one)
    .find((value) => r.field(value, "contractKind") === kind);
  if (!rule) return;
  const payers = r.array(r.field(row, "payerIds"), session.zero, session.one),
    buyer = r.mapGet(
      r.field(session.core, "organizations"),
      payers[session.zero]!,
    );
  const facts = buyer ? r.field(buyer, "governmentFacts") : undefined;
  const separator = r.field(rule, "agreementContractSeparator"),
    cut = row.id.lastIndexOf(separator);
  if (!buyer || payers.length !== session.one || !facts || cut <= session.zero)
    throw new Error("Actual public procurement account/agreement is missing.");
  identity(r.field(facts, "governmentKey"), "recorded government key");
  identity(
    r.field(facts, "governmentJurisdictionId"),
    "recorded government jurisdiction",
  );
  source(session, r.field(buyer, "source"));
  r.keys(facts);
  const agreementId = row.id.slice(session.zero, cut),
    rows: Record<string, { [key: string]: unknown }> = {};
  for (const name of ["agreement", "authority", "appropriation"] as const) {
    const prefix = r.field(rule, `${name}FieldPrefix`),
      keys = Object.keys(facts).filter((key) => key.startsWith(prefix));
    const found = keys
      .map((key) => ({ key, raw: r.field(facts, key) }))
      .map((value) => ({
        key: value.key,
        parsed: JSON.parse(value.raw) as { [key: string]: unknown },
      }))
      .filter((value) =>
        name === "agreement" ? value.parsed.id === agreementId : true,
      );
    if (name === "agreement") {
      if (found.length !== session.one)
        throw new Error(
          "Exact actual public agreement is missing or ambiguous.",
        );
      rows[name] = found[session.zero]!.parsed;
    } else {
      const link = rows.agreement![`${name}Id`],
        exact = found.filter((value) => value.parsed.id === link);
      if (exact.length !== session.one)
        throw new Error(
          "Exact recorded public appropriation/authority is missing.",
        );
      rows[name] = exact[session.zero]!.parsed;
    }
  }
  const a = rows.authority!,
    b = rows.appropriation!,
    c = rows.agreement!;
  const buyerId = r.field(buyer, "id"),
    payeeId = r.field(row, "payeeId"),
    amount = r.field(row, "amountMinor"),
    periods = r.field(row, "periodMonths");
  minor(amount, session.zero);
  minor(periods, session.zero);
  if (
    a.issuerId !== buyerId ||
    a.governmentKey !== r.field(facts, "governmentKey") ||
    a.jurisdictionId !== r.field(facts, "governmentJurisdictionId") ||
    b.buyerAccountId !== buyerId ||
    b.authorityId !== a.id ||
    c.buyerAccountId !== buyerId ||
    c.authorityId !== a.id ||
    c.appropriationId !== b.id ||
    !Array.isArray(c.supplierIds) ||
    !c.supplierIds.includes(payeeId) ||
    row.id !== `${String(c.id)}${separator}${payeeId}` ||
    c.serviceKey !== r.field(rule, "serviceKey") ||
    typeof b.monthlyBudgetMinor !== "number" ||
    !Number.isSafeInteger(b.monthlyBudgetMinor) ||
    b.monthlyBudgetMinor < session.zero ||
    BigInt(amount) > BigInt(b.monthlyBudgetMinor) * BigInt(periods)
  )
    throw new Error(
      "Actual public contract contradicts its recorded owner/budget/supplier.",
    );
  const qualifications = Array.isArray(c.providerQualifications)
    ? (c.providerQualifications as Record<string, unknown>[])
    : [];
  const qualification = qualifications.filter(
    (value) =>
      value.organizationId === payeeId && value.serviceKey === c.serviceKey,
  );
  if (qualification.length !== session.one)
    throw new Error(
      "Actual public agreement has no exact provider qualification.",
    );
  const q = customerQualification(
      session,
      qualification[session.zero],
      payeeId,
      String(c.serviceKey),
    ),
    jobs = Array.isArray(q.jobIds) ? (q.jobIds as string[]) : [],
    providers = Array.isArray(q.providerRecordIds)
      ? (q.providerRecordIds as string[])
      : [];
  const bases = Array.isArray(q.sources)
    ? (q.sources as Record<string, unknown>[])
    : [];
  if (
    (!jobs.length && !providers.length) ||
    new Set([...jobs, ...providers]).size !== jobs.length + providers.length ||
    bases.length !== jobs.length + providers.length
  )
    throw new Error(
      "Actual public supplier scope has no unique recorded basis.",
    );
  for (const jobId of jobs) {
    const job = r.mapGet(r.field(session.core, "jobs"), jobId),
      basis = bases.filter(
        (value) => value.kind === "job" && value.recordId === jobId,
      );
    const person = job
      ? r.mapGet(r.field(session.core, "people"), r.field(job, "personId"))
      : undefined;
    if (
      !job ||
      r.field(job, "id") !== jobId ||
      r.field(job, "organizationId") !== payeeId ||
      !person ||
      r.field(person, "jobId") !== jobId ||
      (r.field(job, "endsAt") !== undefined &&
        session.date >= r.field(job, "endsAt")!) ||
      basis.length !== session.one ||
      basis[session.zero]!.occupationClassification !==
        r.field(job, "occupationClassification") ||
      !r
        .array(r.field(rule, "supplierOccupations"), session.zero, session.one)
        .includes(r.field(job, "occupationClassification")!)
    )
      throw new Error(
        "Public supplier qualification no longer resolves its actual product job.",
      );
    const evidence = source(session, r.field(job, "source"));
    if (!same(evidence, source(session, basis[session.zero]!.source as Source)))
      throw new Error(
        "Actual public product-job source differs from the agreement.",
      );
    add(relations, {
      kind: cfg.relatedKinds.job,
      id: jobId,
      date: evidence.asOf,
      source: evidence,
    });
  }
  for (const providerId of providers) {
    const metadata = r.field(session.core, "placeMetadata"),
      raw = r.field(
        metadata,
        `${r.field(rule, "providerMetadataPrefix")}${providerId}`,
      );
    const provider =
      raw === undefined
        ? undefined
        : (JSON.parse(raw) as {
            id: string;
            organizationId: string;
            serviceKeys: string[];
            source: Source;
          });
    const basis = bases.filter(
      (value) =>
        value.kind === "recorded-provider" && value.recordId === providerId,
    );
    if (
      !provider ||
      provider.id !== providerId ||
      provider.organizationId !== payeeId ||
      !Array.isArray(provider.serviceKeys) ||
      !provider.serviceKeys.includes(c.serviceKey as string) ||
      basis.length !== session.one
    )
      throw new Error(
        "Public supplier qualification no longer resolves its actual provider record.",
      );
    const evidence = source(session, provider.source);
    if (!same(evidence, source(session, basis[session.zero]!.source as Source)))
      throw new Error(
        "Actual public provider source differs from the agreement.",
      );
    add(relations, {
      kind: cfg.relatedKinds.provider,
      id: providerId,
      date: evidence.asOf,
      source: evidence,
    });
  }
  for (const name of ["authority", "appropriation", "agreement"] as const) {
    const record = rows[name]!;
    if (
      typeof record.id !== "string" ||
      typeof record.effectiveFrom !== "string" ||
      record.effectiveFrom > session.date ||
      (typeof record.endsAt === "string" && session.date >= record.endsAt)
    )
      throw new Error(
        "Recorded procurement source is not currently effective.",
      );
    add(relations, {
      kind: cfg.relatedKinds[name],
      id: record.id,
      date: record.effectiveFrom,
      source: source(session, record.source as Source, record.effectiveFrom),
    });
  }
  return Object.freeze({
    buyerId,
    authorityRecordId: a.id as string,
    appropriationRecordId: b.id as string,
    agreementRecordId: c.id as string,
    authority: Object.freeze(a),
    appropriation: Object.freeze(b),
    agreement: Object.freeze(c),
    rule,
  });
}
function contractAuthority(
  session: FinancePlanningSession,
  id: string,
  relations: Relations,
): FinanceContractState {
  const r = session.reads,
    row = currentContract(session, id),
    cfg = config(session),
    payers = r.array(r.field(row, "payerIds"), session.zero, session.one);
  add(relations, {
    kind: cfg.relatedKinds.terms,
    id,
    date: session.date,
    source: source(session, r.field(row, "source")),
  });
  incomeAward(session, row, relations);
  const publicWitness = procurementRecords(session, row, relations);
  for (const key of ["creditFacilityId", "interestFacilityId"] as const) {
    const facilityId = r.field(row, key);
    if (!facilityId) continue;
    facilityRecord(session, facilityId, relations);
    const facility = r.mapGet(session.map("facilities"), facilityId)!;
    if (
      r.field(facility, "borrowerId") !== payers[session.zero] ||
      (key === "interestFacilityId" &&
        r.field(facility, "lenderId") !== r.field(row, "payeeId"))
    )
      throw new Error("Finance obligation names another account's facility.");
  }
  const inflow = r.field(row, "externalInflow"),
    outside = payers.filter((ownerId) => {
      const owner = r.mapGet(r.field(session.core, "organizations"), ownerId);
      return owner && r.field(owner, "outsideFlow") !== undefined;
    });
  if (!inflow && outside.length)
    throw new Error(
      "Outside owner has no actual source-sized due obligation descriptor.",
    );
  if (inflow) {
    const ownerId = r.field(inflow, "ownerId"),
      owner = r.mapGet(r.field(session.core, "organizations"), ownerId),
      flow = owner ? r.field(owner, "outsideFlow") : undefined;
    if (
      !owner ||
      r.field(owner, "id") !== ownerId ||
      !flow ||
      outside.length !== session.one ||
      payers.length !== session.one ||
      payers[session.zero] !== ownerId ||
      r.field(owner, "liquidMinor") !== session.zero ||
      !r
        .array(r.field(cfg, "externalInflowKinds"), session.zero, session.one)
        .includes(r.field(inflow, "kind"))
    )
      throw new Error(
        "External due obligation does not name the actual zero-stock outside owner.",
      );
    source(session, flow);
    source(session, r.field(owner, "source"));
    const descriptorSource = source(session, r.field(inflow, "source"));
    const supported = r
      .array(r.field(cfg, "externalInflowContracts"), session.zero, session.one)
      .filter(
        (value) =>
          r.field(value, "inflowKind") === r.field(inflow, "kind") &&
          r.field(value, "contractKind") === r.field(row, "kind") &&
          r.field(value, "phaseId") === effectiveSettlementPhase(session, row),
      );
    if (
      supported.length !== session.one ||
      !same(descriptorSource, source(session, r.field(row, "source"))) ||
      r.field(row, "accruesArrears") ||
      r.field(row, "marketAdjusted") ||
      r.field(row, "salesReceiptBudget") ||
      r.field(row, "creditFacilityId") ||
      r.field(row, "interestFacilityId")
    )
      throw new Error("External flow descriptor and standing terms disagree.");
    const domain = r.field(supported[session.zero]!, "validation"),
      fields =
        domain === "retirement"
          ? ["incomeContractIds", "sourceAwardIds"]
          : domain === "public-procurement"
            ? [
                "authorityRecordId",
                "appropriationRecordId",
                "agreementRecordId",
              ]
            : domain === "visitor-lodging"
              ? ["identityRecordId", "visitAgreementRecordId", "marketId"]
              : undefined;
    const keys = r.keys(inflow),
      expected = ["kind", "ownerId", "source", ...(fields ?? [])];
    if (
      !fields ||
      keys.length !== expected.length ||
      keys.some((key) => typeof key !== "string" || !expected.includes(key))
    )
      throw new Error(
        "External flow descriptor has no exact owning domain shape.",
      );
    if (domain === "retirement") {
      if (
        r.field(row, "salesReceipt") ||
        r.field(row, "periodMonths") !== session.one ||
        !Array.isArray(r.field(inflow, "incomeContractIds")) ||
        !Array.isArray(r.field(inflow, "sourceAwardIds"))
      )
        throw new Error(
          "External flow descriptor and standing terms disagree.",
        );
      const retirement = inflow as FinanceRetirementExternalInflow;
      const ids = r.array(
          r.field(retirement, "incomeContractIds"),
          session.zero,
          session.one,
        ),
        awardIds = r.array(
          r.field(retirement, "sourceAwardIds"),
          session.zero,
          session.one,
        );
      if (
        !ids.length ||
        !awardIds.length ||
        ids.some((value) => !value || value !== value.trim()) ||
        awardIds.some((value) => !value || value !== value.trim()) ||
        new Set(ids).size !== ids.length ||
        new Set(awardIds).size !== awardIds.length
      )
        throw new Error(
          "External flow lacks unique actual income obligations/awards.",
        );
      const resolvedAwards = new Set<string>();
      let nominal = BigInt(session.zero);
      for (const childId of ids) {
        const child = r.mapGet(session.map("contracts"), childId);
        if (
          !child ||
          r.field(child, "endedAt") ||
          r.field(child, "firstDueAt") > session.date ||
          (r.field(child, "endsAt") !== undefined &&
            session.date >= r.field(child, "endsAt")!) ||
          r.field(child, "dueAt") !== r.field(row, "dueAt") ||
          r.field(child, "periodMonths") !== r.field(row, "periodMonths") ||
          r.field(child, "endsAt") !== r.field(row, "endsAt") ||
          !r
            .array(r.field(child, "payerIds"), session.zero, session.one)
            .includes(r.field(row, "payeeId"))
        )
          throw new Error(
            "Outside obligation refers to missing, inactive or unmatched recipient terms.",
          );
        const awardId = incomeAward(session, child, relations);
        if (
          !awardId ||
          !awardIds.includes(awardId) ||
          resolvedAwards.has(awardId)
        )
          throw new Error(
            "Outside obligation has no unique matching actual qualified award.",
          );
        resolvedAwards.add(awardId);
        source(session, r.field(child, "source"));
        add(relations, {
          kind: cfg.relatedKinds.terms,
          id: childId,
          date: session.date,
          source: source(session, r.field(child, "source")),
        });
        minor(r.field(child, "amountMinor"), session.zero);
        nominal += BigInt(r.field(child, "amountMinor"));
      }
      minor(r.field(row, "amountMinor"), session.zero);
      if (
        resolvedAwards.size !== awardIds.length ||
        awardIds.some((value) => !resolvedAwards.has(value)) ||
        BigInt(r.field(row, "amountMinor")) !== nominal
      )
        throw new Error(
          "External payment differs from its exact actual source-sized recipient obligations.",
        );
    } else {
      if (
        r.field(row, "salesReceipt") !== true ||
        r.field(row, "householdId") ||
        r.field(row, "recipientIncome") ||
        r.field(row, "arrearsMinor") !== session.zero ||
        !Number.isSafeInteger(r.field(row, "periodMonths")) ||
        r.field(row, "periodMonths") <= session.zero
      )
        throw new Error(
          "External customer terms do not describe an exact nondebt purchase.",
        );
      if (domain === "public-procurement") {
        if (r.field(inflow, "kind") !== "external.public-procurement")
          throw new Error("External public descriptor kind is not supported.");
        for (const key of [
          "authorityRecordId",
          "appropriationRecordId",
          "agreementRecordId",
        ] as const)
          identity(r.field(inflow, key)!, "public owning record ID");
        publicCustomerRecords(
          session,
          row,
          relations,
          inflow as FinancePublicProcurementExternalInflow,
          publicWitness,
        );
      } else {
        if (r.field(inflow, "kind") !== "external.customer.visitor-lodging")
          throw new Error("External visitor descriptor kind is not supported.");
        visitorLodgingRecords(
          session,
          row,
          relations,
          inflow as FinanceVisitorLodgingExternalInflow,
        );
      }
    }
    session.cash.authorizeOutside(ownerId, {
      kind: cfg.relatedKinds.terms,
      id,
    });
  }
  return row;
}
function creditTrigger(
  session: FinancePlanningSession,
  request: FinanceCashCreditRequest,
  relations: Relations,
  actualCause: CashJournalSourceRef,
): void {
  const r = session.reads,
    cfg = config(session),
    facilityId = r.field(request, "facilityId");
  facilityRecord(session, facilityId, relations);
  minor(r.field(request, "requestedMinor"), session.zero);
  const facility = r.mapGet(session.map("facilities"), facilityId)!;
  if (r.field(request, "repayment")) {
    const prefix = `${r.field(cfg, "financeReceiptPrefix")}${session.date}:`,
      triggerId = r.field(request, "triggerId");
    if (
      r.field(actualCause, "kind") !== cfg.sourceKinds.contract ||
      r.field(actualCause, "id") !== triggerId ||
      !triggerId.startsWith(prefix)
    )
      throw new Error(
        "Principal repayment requires the actual completed current interest receipt.",
      );
    const contractId = triggerId.slice(prefix.length),
      row = r.mapGet(session.map("contracts"), contractId),
      receipt = r.mapGet(session.map("latestReceiptsByContract"), contractId);
    const refId = r.mapGet(session.map("cashLatestContractSource"), contractId),
      occurrence = refId
        ? r.mapGet(session.map("cashSources"), refId)
        : undefined;
    if (
      !row ||
      r.field(row, "interestFacilityId") !== facilityId ||
      !receipt ||
      receipt.id !== r.field(request, "triggerId") ||
      r.field(row, "id") !== contractId ||
      r.field(receipt, "contractId") !== contractId ||
      r.field(row, "kind") !==
        r.field(r.field(session.policy()!, "kinds"), "interest") ||
      r.array(r.field(row, "payerIds"), session.zero, session.one).length !==
        session.one ||
      r.field(row, "payerIds")[session.zero] !==
        r.field(facility, "borrowerId") ||
      r.field(row, "payeeId") !== r.field(facility, "lenderId") ||
      r.field(receipt, "date") !== session.date ||
      r.field(receipt, "unfundedMinor") !== session.zero ||
      r.field(row, "lastSettledAt") !== session.date ||
      r.field(row, "endedAt") ||
      !r.member(session.map("repaymentDueFacilityIds"), facilityId) ||
      !occurrence ||
      r.field(occurrence, "id") !== receipt.id ||
      r.field(occurrence, "kind") !== cfg.sourceKinds.contract ||
      r.field(occurrence, "contractId") !== contractId ||
      (r.field(occurrence, "postedJournalSequence") === undefined &&
        r.field(occurrence, "completedAt") === undefined) ||
      r.field(request, "reasonKey") !==
        r.field(r.field(session.policy()!, "reasons"), "repayment")
    )
      throw new Error(
        "Principal repayment requires the actual completed current interest receipt.",
      );
    add(relations, {
      kind: cfg.relatedKinds.terms,
      id: contractId,
      date: session.date,
      source: source(session, r.field(row, "source")),
    });
    add(relations, {
      kind: cfg.sourceKinds.contract,
      id: receipt.id,
      date: receipt.date,
      source: source(session, r.field(receipt, "source")),
    });
  } else {
    const contractId = r.field(actualCause, "id"),
      expectedRequestId = `${r.field(cfg, "standaloneDrawRequestPrefix")}${session.date}:${facilityId}:${contractId}`;
    if (
      r.field(actualCause, "kind") !== cfg.relatedKinds.terms ||
      r.field(request, "triggerId") !== expectedRequestId
    )
      throw new Error(
        "Draw request does not resolve its genuine current standing obligation.",
      );
    const row = contractAuthority(session, contractId, relations);
    if (
      r.field(row, "creditFacilityId") !== facilityId ||
      r.array(r.field(row, "payerIds"), session.zero, session.one)[
        session.zero
      ] !== r.field(facility, "borrowerId") ||
      r.field(request, "reasonKey") !==
        r.field(r.field(session.policy()!, "reasons"), "borrowing")
    )
      throw new Error(
        "Current draw is not linked to its actual due borrower obligation.",
      );
    // Reuse the existing pure planner to derive the exact current deficiency.
    const probe = fresh(session.core),
      actual: Relations = { records: [], required: [] };
    contractAuthority(probe, contractId, actual);
    const due = prepareFinanceContract(probe, contractId);
    const credit = probe.metadata.mapGet(
      probe.map("latestCreditByFacility"),
      facilityId,
    );
    if (
      !credit ||
      due.creditReceiptId !== credit.id ||
      r.field(request, "requestedMinor") > credit.requestedMinor
    )
      throw new Error(
        "Standalone draw amount exceeds its actual current contract deficiency.",
      );
    probe
      .seal(due)
      .preflight.verify(
        session.core,
        session.core.cashJournal,
        cashJournalParameters(session.core),
      );
  }
}
function markerRecord(
  session: FinancePlanningSession,
  reference: CashJournalSourceRef,
): FinanceCashSourceState {
  const r = session.reads,
    row = r.mapGet(session.map("cashSources"), reference.id);
  if (
    !row ||
    r.field(row, "kind") !== reference.kind ||
    r.field(row, "id") !== reference.id
  )
    throw new Error("Actual finance source occurrence is missing.");
  r.field(row, "date");
  r.field(row, "mode");
  r.field(row, "contractId");
  r.field(row, "facilityId");
  const trigger = r.field(row, "trigger"),
    request = r.field(row, "request");
  identity(r.field(trigger, "kind"), "trigger kind");
  identity(r.field(trigger, "id"), "trigger id");
  if (request)
    for (const key of [
      "facilityId",
      "requestedMinor",
      "reasonKey",
      "triggerId",
      "repayment",
    ] as const)
      r.field(request, key);
  r.array(r.field(row, "creditIds"), session.zero, session.one);
  r.field(row, "postedJournalSequence");
  r.field(row, "completedAt");
  return row;
}
export interface CompositeFinanceCreditSources {
  requiredRelatedRefs: readonly CashJournalSourceRef[];
  relatedRecords: readonly Related[];
  secondaryMarkers: NonNullable<CashJournalSourceSlot["secondaryMarkers"]>;
}
export function admitCompositeFinanceCreditSources(
  core: CoreState,
  session: FinancePlanningSession,
  credits: readonly CreditReceipt[],
  trigger: CashJournalSourceRef,
): CompositeFinanceCreditSources {
  if (session.core !== core)
    throw new Error("Composite credit has another actual host.");
  if (!credits.length)
    return {
      requiredRelatedRefs: [],
      relatedRecords: [],
      secondaryMarkers: [],
    };
  const cfg = config(session),
    admitted: FinanceCashSourceState[] = [];
  identity(trigger.kind, "owning trigger kind");
  identity(trigger.id, "owning trigger id");
  try {
    for (const receipt of credits) {
      const request: FinanceCashCreditRequest = {
        facilityId: receipt.facilityId,
        requestedMinor: receipt.requestedMinor,
        reasonKey: receipt.reasonKey,
        triggerId: trigger.id,
        repayment: false,
      };
      const row: FinanceCashSourceState = {
        id: receipt.id,
        kind: cfg.sourceKinds.credit,
        date: session.date,
        mode: "composite-credit",
        facilityId: receipt.facilityId,
        trigger: { ...trigger },
        request: Object.freeze(request),
        creditIds: [],
      };
      if (mapHas.call(core.finance.cashSources, row.id))
        throw new Error("Duplicate actual composite credit source.");
      mapSet.call(core.finance.cashSources, row.id, row);
      admitted.push(row);
      const previousId = session.metadata.mapGet(
        session.map("cashLatestCreditSource"),
        receipt.facilityId,
      );
      compositePreparation.set(row, { previousId });
      session.metadata.mapSet(
        session.map("cashLatestCreditSource"),
        receipt.facilityId,
        receipt.id,
      );
      // A latest/open primary may still need this exact child after a newer credit.
      session.metadata.mapSet(
        session.map("cashRequiredReceipts"),
        receipt.id,
        receipt,
      );
    }
    return resolveCompositeFinanceCreditSources(core, credits, trigger);
  } catch (error) {
    for (const row of admitted) {
      compositePreparation.delete(row);
      if (mapGet.call(core.finance.cashSources, row.id) === row)
        mapDelete.call(core.finance.cashSources, row.id);
    }
    throw error;
  }
}
export function resolveCompositeFinanceCreditSources(
  core: CoreState,
  credits: readonly CreditReceipt[],
  trigger: CashJournalSourceRef,
): CompositeFinanceCreditSources {
  if (!credits.length)
    return {
      requiredRelatedRefs: [],
      relatedRecords: [],
      secondaryMarkers: [],
    };
  const session = fresh(core),
    cfg = config(session),
    relations: Relations = { records: [], required: [] },
    secondary: NonNullable<
      CashJournalSourceSlot["secondaryMarkers"]
    >[number][] = [];
  for (const receipt of credits) {
    const reference = { kind: cfg.sourceKinds.credit, id: receipt.id },
      marker = markerRecord(session, reference),
      r = session.reads,
      request = r.field(marker, "request");
    const date = r.field(marker, "date"),
      completed =
        r.field(marker, "postedJournalSequence") !== undefined ||
        r.field(marker, "completedAt") !== undefined;
    facilityRecord(session, receipt.facilityId, relations, date);
    if (
      r.field(marker, "mode") !== "composite-credit" ||
      date !== receipt.date ||
      (!completed && date !== session.date) ||
      !same(r.field(marker, "trigger"), trigger) ||
      !request ||
      r.field(request, "facilityId") !== receipt.facilityId ||
      r.field(request, "requestedMinor") !== receipt.requestedMinor ||
      r.field(request, "reasonKey") !== receipt.reasonKey ||
      r.field(request, "triggerId") !== trigger.id ||
      r.field(request, "repayment") ||
      receipt.id !==
        `${cfg.creditReceiptPrefix}${date}:${receipt.facilityId}:draw:${trigger.id}`
    )
      throw new Error(
        "Composite credit differs from its actual current source request.",
      );
    const actual = completed
      ? canonicalResult(session, marker)
      : prepareFinanceCredit(session, request);
    if (!actual || "contractId" in actual || !same(actual, receipt))
      throw new Error(
        "Composite credit differs from its independently resolved actual receipt.",
      );
    add(relations, {
      kind: reference.kind,
      id: reference.id,
      date,
      source: source(session, actual.source, date),
    });
    secondary.push({ reference, marker });
  }
  const resolved = {
    requiredRelatedRefs: relations.required,
    relatedRecords: relations.records,
    secondaryMarkers: secondary,
  };
  session
    .seal(credits)
    .preflight.verify(core, core.cashJournal, cashJournalParameters(core));
  return resolved;
}
/** Failed owning preparations can remove only their still-uncompleted marker rows. */
export function cancelCompositeFinanceCreditSources(
  core: CoreState,
  credits: readonly CreditReceipt[],
): void {
  for (const receipt of credits) {
    const row = mapGet.call(core.finance.cashSources, receipt.id) as
      FinanceCashSourceState | undefined;
    if (
      !row ||
      !compositePreparation.has(row) ||
      row.postedJournalSequence !== undefined ||
      row.completedAt !== undefined
    )
      continue;
    compositePreparation.delete(row);
    pending.delete(row);
    mapDelete.call(core.finance.cashSources, row.id);
  }
}
function canonicalResult(
  session: FinancePlanningSession,
  row: FinanceCashSourceState,
): Result | undefined {
  const r = session.reads,
    mode = r.field(row, "mode"),
    id = r.field(row, "id");
  const latest =
    mode === "contract"
      ? r.mapGet(
          session.map("latestReceiptsByContract"),
          r.field(row, "contractId")!,
        )
      : r.mapGet(
          session.map("latestCreditByFacility"),
          r.field(row, "facilityId")!,
        );
  if (latest && r.field(latest, "id") === id) return latest;
  const held = r.mapGet(session.map("cashRequiredReceipts"), id);
  if (held && r.field(held, "id") === id) return held;
  if (mode === "contract") {
    const terms = r.mapGet(
      session.map("contracts"),
      r.field(row, "contractId")!,
    );
    for (const ownerId of terms
      ? r.array(r.field(terms, "payerIds"), session.zero, session.one)
      : []) {
      const closure = r.mapGet(session.map("closures"), ownerId),
        cause = closure ? r.field(closure, "cause") : undefined;
      if (cause && "contractId" in cause && r.field(cause, "id") === id)
        return cause;
    }
  }
  return undefined;
}
function requiredNow(
  session: FinancePlanningSession,
  row: FinanceCashSourceState,
  result: Result,
): boolean {
  const r = session.reads;
  if ("contractId" in result) {
    const terms = r.mapGet(session.map("contracts"), result.contractId),
      latest = r.mapGet(
        session.map("latestReceiptsByContract"),
        result.contractId,
      );
    if (
      terms &&
      latest &&
      r.field(latest, "id") === result.id &&
      (r.field(terms, "arrearsMinor") > session.zero ||
        (r.field(terms, "interestFacilityId") &&
          r.member(
            session.map("repaymentDueFacilityIds"),
            r.field(terms, "interestFacilityId")!,
          )))
    )
      return true;
    for (const payment of result.payments) {
      const unfunded = r.mapGet(
          session.map("unfundedBusinessReceipts"),
          payment.payerId,
        ),
        closure = r.mapGet(session.map("closures"), payment.payerId);
      if (
        (unfunded && r.field(unfunded, "id") === result.id) ||
        (closure && r.field(closure, "sourceReceiptId") === result.id)
      )
        return true;
    }
    return false;
  }
  const facility = r.mapGet(session.map("facilities"), result.facilityId),
    latest = r.mapGet(session.map("latestCreditByFacility"), result.facilityId);
  return (
    r.field(row, "mode") === "credit" &&
    !!facility &&
    !!latest &&
    r.field(latest, "id") === result.id &&
    r.field(facility, "principalMinor") > session.zero
  );
}
function accountId(session: FinancePlanningSession, ownerId: string): string {
  const r = session.reads,
    journal = r.field(session.core, "cashJournal"),
    id = r.mapGet(r.field(journal, "residualAccountByOwner"), ownerId),
    ids = r.mapGet(r.field(journal, "accountsByOwner"), ownerId),
    account = id ? r.mapGet(r.field(journal, "accounts"), id) : undefined;
  if (
    !id ||
    !ids ||
    !r.member(ids, id) ||
    !account ||
    r.field(account, "ownerId") !== ownerId
  )
    throw new Error("Actual canonical receipt account cannot be resolved.");
  return id;
}
function completedPostings(
  session: FinancePlanningSession,
  row: FinanceCashSourceState,
  result: Result,
): ResolvedCashJournalSource["expectedPostings"] {
  const postings: ResolvedCashJournalSource["expectedPostings"][number][] = [];
  const move = (payer: string, payee: string, amount: number, id: string) => {
    minor(amount, session.zero);
    if (amount === session.zero) return;
    postings.push(
      {
        id: `${id}:out`,
        accountId: accountId(session, payer),
        deltaMinor: -amount,
      },
      {
        id: `${id}:in`,
        accountId: accountId(session, payee),
        deltaMinor: amount,
      },
    );
  };
  for (const id of row.creditIds) {
    const child = markerRecord(session, {
        kind: config(session).sourceKinds.credit,
        id,
      }),
      credit = canonicalResult(session, child);
    if (!credit || "contractId" in credit)
      throw new Error(
        "Completed finance occurrence has no actual credit receipt.",
      );
    const facility = session.reads.mapGet(
      session.map("facilities"),
      credit.facilityId,
    );
    if (!facility)
      throw new Error("Completed composite credit facility disappeared.");
    move(
      session.reads.field(facility, "lenderId"),
      session.reads.field(facility, "borrowerId"),
      credit.transferredMinor,
      `${credit.id}:cash`,
    );
  }
  if ("contractId" in result) {
    let index = session.zero;
    for (const payment of result.payments) {
      move(
        payment.payerId,
        result.payeeId,
        payment.paidMinor,
        `${result.id}:payment:${index}`,
      );
      index += session.one;
    }
  } else {
    const facility = session.reads.mapGet(
      session.map("facilities"),
      result.facilityId,
    );
    if (!facility) throw new Error("Completed credit facility disappeared.");
    const repayment = row.request?.repayment === true;
    const borrower = session.reads.field(facility, "borrowerId"),
      lender = session.reads.field(facility, "lenderId");
    move(
      repayment ? borrower : lender,
      repayment ? lender : borrower,
      result.transferredMinor,
      `${result.id}:cash`,
    );
  }
  return postings;
}
export function financeCashSourceProvider(
  api: CoreAPI,
  reference: Readonly<CashJournalSourceRef>,
): CashJournalSourceSlot | undefined {
  const core = api.state as CoreState,
    session = fresh(core),
    cfg = config(session),
    row = session.reads.mapGet(session.map("cashSources"), reference.id);
  if (
    !row ||
    session.reads.field(row, "kind") !== reference.kind ||
    ![cfg.sourceKinds.contract, cfg.sourceKinds.credit].includes(reference.kind)
  )
    return undefined;
  markerRecord(session, reference);
  const bundle = pending.get(row);
  if (
    row.postedJournalSequence !== undefined ||
    row.completedAt !== undefined
  ) {
    const result = canonicalResult(session, row);
    if (
      !result ||
      session.reads.field(result, "id") !== row.id ||
      session.reads.field(result, "date") !== row.date
    )
      throw new Error(
        "Completed finance marker has no actual canonical receipt.",
      );
    const resolved: ResolvedCashJournalSource = {
      kind: row.kind,
      id: row.id,
      date: result.date,
      source: source(
        session,
        session.reads.field(result, "source"),
        result.date,
      ),
      postedJournalSequence: row.postedJournalSequence,
      expectedPostings: completedPostings(session, row, result),
      requiredRelatedRefs: [],
      relatedRecords: [],
    };
    const slot = {
      resolved,
      marker: row,
      retainFull: requiredNow(session, row, result),
    };
    session
      .seal(result)
      .preflight.verify(core, core.cashJournal, cashJournalParameters(core));
    return slot;
  }
  if (!bundle || row.mode === "composite-credit") return undefined;
  const relations: Relations = { records: [], required: [] };
  let actual: Result,
    credits: CreditReceipt[] = [];
  if (row.mode === "contract") {
    contractAuthority(session, row.contractId!, relations);
    actual = prepareFinanceContract(session, row.contractId!);
    if (actual.creditReceiptId) {
      const terms = session.reads.mapGet(
        session.map("contracts"),
        row.contractId!,
      )!;
      const credit = session.metadata.mapGet(
        session.map("latestCreditByFacility"),
        terms.creditFacilityId!,
      );
      if (!credit || credit.id !== actual.creditReceiptId)
        throw new Error("Actual composite funding credit is missing.");
      credits = [credit];
    }
  } else {
    if (!row.request)
      throw new Error("Actual current standalone credit request is absent.");
    creditTrigger(session, row.request, relations, row.trigger);
    actual = prepareFinanceCredit(session, row.request);
  }
  if (!same(actual, bundle.plan.result) || !same(credits, bundle.credits))
    throw new Error(
      "Prepared finance result differs from the actual current occurrence.",
    );
  const secondary = resolveCompositeFinanceCreditSources(core, credits, {
    kind: row.kind,
    id: row.id,
  });
  for (const related of secondary.relatedRecords) add(relations, related);
  const retainFull = predictedRequirement(session, actual, row),
    independentlyPrepared = session.seal(actual);
  if (
    !same(independentlyPrepared.postings, bundle.plan.postings) ||
    !same(
      independentlyPrepared.externalFlowAuthorizations,
      bundle.plan.externalFlowAuthorizations,
    )
  )
    throw new Error(
      "Current finance actual postings/outside authorizations changed.",
    );
  const slot: CashJournalSourceSlot = {
    resolved: {
      kind: row.kind,
      id: row.id,
      date: session.date,
      source: sourceForResult(actual),
      expectedPostings: bundle.plan.postings,
      requiredRelatedRefs: relations.required,
      relatedRecords: relations.records,
      externalFlowAuthorizations: bundle.plan.externalFlowAuthorizations,
    },
    marker: row,
    metadata: bundle.plan.metadata,
    secondaryMarkers: secondary.secondaryMarkers,
    retainFull,
  };
  independentlyPrepared.preflight.verify(
    core,
    core.cashJournal,
    cashJournalParameters(core),
  );
  // Every active provider lookup ends with this exact immutable host preflight.
  bundle.plan.preflight.verify(
    core,
    core.cashJournal,
    cashJournalParameters(core),
  );
  return slot;
}
function sourceForResult(result: Result): Source {
  return { ...result.source };
}
function predictedRequirement(
  session: FinancePlanningSession,
  result: Result,
  row: FinanceCashSourceState,
): boolean {
  if ("contractId" in result) {
    const terms = session.reads.mapGet(
      session.map("contracts"),
      result.contractId,
    );
    return (
      result.arrearsMinor > session.zero ||
      !!(terms && session.reads.field(terms, "interestFacilityId")) ||
      result.payments.some(
        (payment) =>
          payment.requestedMinor > payment.paidMinor &&
          session.reads.mapHas(session.map("businesses"), payment.payerId),
      )
    );
  }
  return row.mode === "credit" && result.principalAfterMinor > session.zero;
}
function stageReceiptLinks(
  session: FinancePlanningSession,
  row: FinanceCashSourceState,
  result: Result,
  credits: readonly CreditReceipt[],
): string[] {
  const m = session.metadata,
    previous: string[] = [];
  const index =
      row.mode === "contract"
        ? session.map("cashLatestContractSource")
        : session.map("cashLatestCreditSource"),
    key = row.mode === "contract" ? row.contractId! : row.facilityId!;
  const old = m.mapGet(index, key);
  if (old) previous.push(old);
  m.mapSet(index, key, row.id);
  if (predictedRequirement(session, result, row)) {
    m.mapSet(session.map("cashRequiredReceipts"), row.id, result);
    for (const credit of credits)
      m.mapSet(session.map("cashRequiredReceipts"), credit.id, credit);
  }
  return previous;
}
function discardSource(
  core: CoreState,
  api: CoreAPI,
  id: string,
  owningParentReleased = false,
): void {
  const row = mapGet.call(core.finance.cashSources, id) as
    FinanceCashSourceState | undefined;
  if (
    !row ||
    (row.postedJournalSequence === undefined && row.completedAt === undefined)
  )
    return;
  if (row.mode === "composite-credit") {
    const parentRequired = core.cashJournal.requiredBySource
      .get(row.trigger.kind)
      ?.has(row.trigger.id);
    const parent = mapGet.call(core.finance.cashSources, row.trigger.id) as
      FinanceCashSourceState | undefined;
    const parentLatest =
      parent?.mode === "contract" &&
      core.finance.cashLatestContractSource.get(parent.contractId!) ===
        parent.id;
    // Work owns the lifetime of its actual current/open primary, without a provider cycle.
    if (parentRequired || parentLatest || (!parent && !owningParentReleased))
      return;
  }
  const session = fresh(core),
    result = canonicalResult(session, row);
  if (result && requiredNow(session, row, result)) return;
  const byId = core.cashJournal.requiredBySource.get(row.kind);
  if (byId?.has(row.id))
    api.releaseJournalSource({ kind: row.kind, id: row.id });
  const latest =
    row.mode === "contract"
      ? core.finance.cashLatestContractSource.get(row.contractId!)
      : core.finance.cashLatestCreditSource.get(row.facilityId!);
  // Keep one canonical completion marker per latest term/facility, including zero cash.
  if (latest === row.id) {
    if (row.mode !== "contract")
      mapDelete.call(core.finance.cashRequiredReceipts, row.id);
    return;
  }
  mapDelete.call(core.finance.cashRequiredReceipts, row.id);
  mapDelete.call(core.finance.cashSources, row.id);
  pending.delete(row);
  compositePreparation.delete(row);
  for (const creditId of row.creditIds) {
    discardSource(core, api, creditId, true);
  }
}
export function finishCompositeFinanceCreditSources(
  core: CoreState,
  api: CoreAPI,
  credits: readonly CreditReceipt[],
): void {
  const previousIds: string[] = [];
  for (const receipt of credits) {
    const row = mapGet.call(core.finance.cashSources, receipt.id) as
      FinanceCashSourceState | undefined;
    if (
      !row ||
      (row.postedJournalSequence === undefined && row.completedAt === undefined)
    )
      throw new Error("Composite credit did not complete atomically.");
    if (
      core.finance.cashLatestCreditSource.get(receipt.facilityId) !==
        receipt.id ||
      core.finance.latestCreditByFacility.get(receipt.facilityId)?.id !==
        receipt.id
    )
      throw new Error(
        "Composite credit source/receipt link was not part of the owning writer metadata.",
      );
    const preparation = compositePreparation.get(row);
    if (preparation?.previousId) previousIds.push(preparation.previousId);
    pending.delete(row);
    compositePreparation.delete(row);
  }
  for (const id of previousIds) discardSource(core, api, id);
}
/** Called by the work owner only when its actual superseded primary is released/pruned. */
export function releaseCompositeFinanceCreditSources(
  core: CoreState,
  api: CoreAPI,
  credits: readonly CreditReceipt[],
): void {
  for (const receipt of credits) {
    const row = mapGet.call(core.finance.cashSources, receipt.id) as
      FinanceCashSourceState | undefined;
    if (!row || row.mode !== "composite-credit") continue;
    if (
      core.cashJournal.requiredBySource
        .get(row.trigger.kind)
        ?.has(row.trigger.id)
    )
      throw new Error(
        "Owning primary must release its journal requirement before child source pruning.",
      );
    discardSource(core, api, row.id, true);
  }
}
function submit(
  core: CoreState,
  api: CoreAPI,
  session: FinancePlanningSession,
  row: FinanceCashSourceState,
  result: Result,
  credits: readonly CreditReceipt[],
): Result {
  if (api.state !== core)
    throw new Error("Finance cash writer has another actual host.");
  const admitted: FinanceCashSourceState[] = [row];
  try {
    if (mapHas.call(core.finance.cashSources, row.id))
      throw new Error("Duplicate actual finance cash source.");
    mapSet.call(core.finance.cashSources, row.id, row);
    markerRecord(session, { kind: row.kind, id: row.id });
    admitCompositeFinanceCreditSources(core, session, credits, {
      kind: row.kind,
      id: row.id,
    });
    for (const credit of credits)
      admitted.push(core.finance.cashSources.get(credit.id)!);
    const previousIds = stageReceiptLinks(session, row, result, credits),
      plan = session.seal(result),
      callerResult = structuredClone(plan.result);
    const bundle: Pending = { plan, credits };
    pending.set(row, bundle);
    if (plan.postings.length)
      api.postJournal({
        id: `journal:${core.date}:${core.cashJournal.nextSequence}`,
        date: core.date,
        expectedSequence: core.cashJournal.nextSequence,
        sourceRef: { kind: row.kind, id: row.id },
        postings: plan.postings,
      });
    else api.completeJournalSource({ kind: row.kind, id: row.id });
    for (const value of admitted) pending.delete(value);
    // Preparation snapshots are gone. Only canonical receipts/markers serve retention.
    finishCompositeFinanceCreditSources(core, api, credits);
    for (const id of previousIds) discardSource(core, api, id);
    return callerResult;
  } catch (error) {
    cancelCompositeFinanceCreditSources(core, credits);
    for (const value of admitted) {
      pending.delete(value);
      if (
        value.postedJournalSequence === undefined &&
        value.completedAt === undefined &&
        core.finance.cashSources.get(value.id) === value
      )
        mapDelete.call(core.finance.cashSources, value.id);
    }
    throw error;
  }
}
export function settleFinanceContractJournal(
  core: CoreState,
  api: CoreAPI,
  id: string,
): FinanceReceipt {
  ensureFinanceCashModule(core);
  const session = fresh(core),
    cfg = config(session),
    relations: Relations = { records: [], required: [] };
  const terms = contractAuthority(session, id, relations),
    result = prepareFinanceContract(session, id),
    credits: CreditReceipt[] = [];
  if (result.creditReceiptId) {
    const credit = session.metadata.mapGet(
      session.map("latestCreditByFacility"),
      terms.creditFacilityId!,
    );
    if (!credit || credit.id !== result.creditReceiptId)
      throw new Error(
        "Composite credit preparation does not match its actual obligation.",
      );
    credits.push(credit);
  }
  const row: FinanceCashSourceState = {
    id: result.id,
    kind: cfg.sourceKinds.contract,
    date: session.date,
    mode: "contract",
    contractId: id,
    trigger: { kind: cfg.relatedKinds.terms, id },
    creditIds: Object.freeze(credits.map((credit) => credit.id)),
  };
  return submit(core, api, session, row, result, credits) as FinanceReceipt;
}
export function transferFinanceCreditJournal(
  core: CoreState,
  api: CoreAPI,
  facilityId: string,
  requestedMinor: number,
  reasonKey: string,
  sourceId: string,
  repayment = false,
): CreditReceipt {
  ensureFinanceCashModule(core);
  const session = fresh(core),
    cfg = config(session),
    r = session.reads;
  let actualCause: CashJournalSourceRef, triggerId: string;
  if (repayment) {
    actualCause = Object.freeze({
      kind: cfg.sourceKinds.contract,
      id: sourceId,
    });
    triggerId = sourceId;
  } else {
    // Normalize only an actual standing-terms key or its genuine current dated occurrence.
    const direct = r.mapGet(session.map("contracts"), sourceId),
      prefix = `${cfg.financeReceiptPrefix}${session.date}:`;
    const contractId = direct
      ? r.field(direct, "id")
      : sourceId.startsWith(prefix)
        ? sourceId.slice(prefix.length)
        : undefined;
    if (!contractId)
      throw new Error(
        "Draw source does not resolve a genuine current standing obligation.",
      );
    actualCause = Object.freeze({
      kind: cfg.relatedKinds.terms,
      id: contractId,
    });
    // A standalone request is a distinct occurrence from later automatic contract funding.
    triggerId = `${cfg.standaloneDrawRequestPrefix}${session.date}:${facilityId}:${contractId}`;
  }
  const request: FinanceCashCreditRequest = Object.freeze({
      facilityId,
      requestedMinor,
      reasonKey,
      triggerId,
      repayment,
    }),
    relations: Relations = { records: [], required: [] };
  creditTrigger(session, request, relations, actualCause);
  const result = prepareFinanceCredit(session, request);
  const row: FinanceCashSourceState = {
    id: result.id,
    kind: cfg.sourceKinds.credit,
    date: session.date,
    mode: "credit",
    facilityId,
    trigger: actualCause,
    request,
    creditIds: [],
  };
  return submit(core, api, session, row, result, []) as CreditReceipt;
}
