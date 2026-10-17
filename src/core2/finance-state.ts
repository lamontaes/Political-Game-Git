import { verifyCurrentWorkPayrollGroup } from "./work-payroll-cash";
import {
  countedWagesEarned,
  residentWageShortfall,
  supplierBillsOwedTo,
} from "./modules/residents";
/** Conserving finance writers. Estimates never credit the authoritative cash ledger. */
import { countedJobsOf } from "./residents-economy";
import { admitEverydayPurchase, isEverydayPurchase } from "./cost-of-living";
import { ageOnDate, daysBetween, makeIsoDate } from "./kernel/dates";
import { projectSalesReceiptBudgetPool } from "./finance-sales-budgets";
import {
  settleFinanceContractJournal,
  transferFinanceCreditJournal,
} from "./finance-cash";
import {
  DEFAULT_BUSINESS_BOOKS_DATA,
  projectBusinessPrice,
  projectMarket,
  projectOtherCosts,
} from "./business-books";
import type {
  BusinessBooksInput,
  CreditFacilityInput,
  CreditReceipt,
  EmployerClosure,
  FinanceContractInput,
  FinanceContractState,
  FinanceConditionInput,
  FinanceReceipt,
  FinanceRuntime,
  FinanceInput,
  OwnerClosureChoice,
  PayerHandover,
  SalesReceiptBudgetPool,
  SalesReceiptPendingBudget,
} from "./finance-types";
import type {
  CoreAPI,
  CoreState,
  JobInput,
  PersonState,
  Source,
} from "./types";

export function emptyFinanceRuntime(at: string): FinanceRuntime {
  return {
    cashSources: new Map(),
    cashLatestContractSource: new Map(),
    cashLatestCreditSource: new Map(),
    cashRequiredReceipts: new Map(),
    creditRequestsAt: at,
    creditRequestIds: new Set(),
    contracts: new Map(),
    contractsDueAt: new Map(),
    contractsEndingAt: new Map(),
    contractsByBusiness: new Map(),
    incomeContractsByPerson: new Map(),
    facilities: new Map(),
    facilitiesByBorrower: new Map(),
    businesses: new Map(),
    businessesByPlace: new Map(),
    reviewsDueAt: new Map(),
    paidIncomeByPlaceMonth: new Map(),
    paidIncomeByPlaceMonthKind: new Map(),
    salesReceivedThroughByPayer: new Map(),
    salesBudgetPoolsByPayer: new Map(),
    salesPendingBudgetByContract: new Map(),
    unfundedBusinessReceipts: new Map(),
    repaymentDueFacilityIds: new Set(),
    conditionsByPlace: new Map(),
    jobsByOrganization: new Map(),
    latestReceiptsByContract: new Map(),
    latestCreditByFacility: new Map(),
    detailedReceipts: new Map(),
    closures: new Map(),
    totalsByKind: new Map(),
    livingPlans: new Map(),
    livingDueAt: new Map(),
    obligationsByHousehold: new Map(),
  };
}

export function financeIndex<K>(
  map: Map<K, Set<string>>,
  key: K,
  id: string,
): void {
  const ids = map.get(key) ?? new Set<string>();
  ids.add(id);
  map.set(key, ids);
}

function removeIndex<K>(map: Map<K, Set<string>>, key: K, id: string): void {
  const ids = map.get(key);
  ids?.delete(id);
  if (ids && !ids.size) map.delete(key);
}

function currentSource(source: Source, at: string): void {
  if (
    !source ||
    !["SOURCED", "ESTIMATED"].includes(source.tag) ||
    !source.citation?.trim() ||
    makeIsoDate(source.asOf) > makeIsoDate(at)
  )
    throw new Error("Finance requires a dated source available at admission.");
}

function minor(api: CoreAPI, value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < api.parameter("zero"))
    throw new Error(`Invalid integer finance amount: ${field}`);
}

function amount(api: CoreAPI, value: number, field: string): void {
  if (!Number.isFinite(value) || value < api.parameter("zero"))
    throw new Error(`Invalid nonnegative finance projection: ${field}`);
}

function policy(api: CoreAPI) {
  const data = api.state.data.finance;
  if (!data) throw new Error("Finance policy data is absent.");
  if (
    !Object.values(data.kinds).every(
      (value) => typeof value === "string" && value.trim(),
    ) ||
    !Object.values(data.reasons).every(
      (value) => typeof value === "string" && value.trim(),
    )
  )
    throw new Error("Finance policy labels must be nonempty data keys.");
  const phases = data.settlementPhases;
  if (
    !phases?.length ||
    new Set(phases.map((phase) => phase.id)).size !== phases.length ||
    phases.some(
      (phase) =>
        !phase.id?.trim() || !["settle", "procure"].includes(phase.operation),
    )
  )
    throw new Error("Finance requires distinct named settlement phases.");
  const required = [
    data.defaultPhases.funding,
    data.defaultPhases.income,
    data.defaultPhases.household,
    data.defaultPhases.procurement,
  ];
  const positions = required.map((id) =>
    phases.findIndex((phase) => phase.id === id),
  );
  if (
    positions.some(
      (position, index) =>
        position < api.parameter("zero") ||
        (index > api.parameter("zero") &&
          position <= positions[index - api.parameter("one")]!),
    ) ||
    !phases.some((phase) => phase.id === data.defaultPhases.other) ||
    phases.find((phase) => phase.id === data.defaultPhases.procurement)
      ?.operation !== "procure" ||
    required
      .slice(api.parameter("zero"), -api.parameter("one"))
      .some(
        (id) => phases.find((phase) => phase.id === id)?.operation !== "settle",
      )
  )
    throw new Error(
      "Finance phases must fund income before household purchases and procurement.",
    );
  for (const id of data.stopgapIds) api.stopgap(id);
  return data;
}

export function financeSettlementPhase(
  api: CoreAPI,
  row: FinanceContractInput,
) {
  const data = policy(api);
  const id =
    row.settlementPhaseId ??
    (row.recipientIncome
      ? data.defaultPhases.income
      : row.householdId
        ? data.defaultPhases.household
        : row.salesReceiptBudget
          ? data.defaultPhases.procurement
          : data.defaultPhases.other);
  const phase = data.settlementPhases.find((entry) => entry.id === id);
  if (
    !phase ||
    (row.salesReceiptBudget && phase.operation !== "procure") ||
    (row.recipientIncome && id !== data.defaultPhases.income) ||
    (row.householdId && id !== data.defaultPhases.household)
  )
    throw new Error(
      "Finance contract has an incompatible or unregistered settlement phase.",
    );
  return phase;
}

function validateRecipientIncome(
  core: CoreState,
  api: CoreAPI,
  row: FinanceContractInput,
): void {
  if (!row.recipientIncome) return;
  const term = row.recipientIncome,
    data = policy(api);
  const person = core.people.get(term.personId),
    home = core.households.get(term.householdId);
  const rule = data.recipientIncomeKinds.find(
    (entry) => entry.id === term.kindId,
  );
  const fact = person?.pastFacts?.find(
    (entry) => entry.id === term.sourceFactId,
  );
  if (
    !person ||
    !home ||
    person.householdId !== home.id ||
    !home.memberIds.includes(person.id) ||
    row.payeeId !== person.id ||
    !rule ||
    !fact ||
    !rule.sourceKinds.includes(fact.kind) ||
    Object.entries(rule.qualifyingFactsBySourceKind?.[fact.kind] ?? {}).some(
      ([key, value]) => fact.facts?.[key] !== value,
    ) ||
    makeIsoDate(fact.date) > core.date ||
    fact.facts?.status !== rule.status ||
    row.kind !== rule.contractKind ||
    row.householdId ||
    row.salesReceipt ||
    row.salesReceiptBudget ||
    row.marketAdjusted ||
    row.accruesArrears ||
    row.creditFacilityId ||
    row.interestFacilityId ||
    row.periodMonths !== api.parameter("one")
  )
    throw new Error(
      "Recipient income requires a dated qualified private award and compatible terms.",
    );
  currentSource(fact.source, core.date);
  if (
    fact.facts.payerId !== row.payerIds[api.parameter("zero")] ||
    row.payerIds.length !== api.parameter("one") ||
    (term.adjustedMinor ?? Number(fact.facts.monthlyMinor)) !==
      row.amountMinor ||
    (fact.facts.kindId && fact.facts.kindId !== term.kindId) ||
    (fact.facts.householdId &&
      fact.facts.householdId !== (term.recordedHouseholdId ?? term.householdId))
  )
    throw new Error("Recipient income terms contradict their recorded award.");
  for (const id of core.finance.incomeContractsByPerson.get(person.id) ?? []) {
    const previous = core.finance.contracts.get(id)!;
    if (
      !previous.endedAt &&
      previous.recipientIncome?.sourceFactId === term.sourceFactId &&
      (!previous.endsAt || makeIsoDate(row.dueAt) < previous.endsAt) &&
      (!row.endsAt || previous.firstDueAt < makeIsoDate(row.endsAt))
    )
      throw new Error(
        "Recipient income overlaps another active route for the same recorded award.",
      );
  }
}

/** Calendar months preserve the original billing day across short months. */
export function financeNextDate(
  api: CoreAPI,
  from: string,
  months: number,
  billingDay?: number,
): string {
  const p = api.parameter,
    date = new Date(`${makeIsoDate(from)}T00:00:00.000Z`);
  if (!Number.isSafeInteger(months) || months <= p("zero"))
    throw new Error(
      "Finance period must be a positive whole calendar month count.",
    );
  const day = billingDay ?? date.getUTCDate();
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth() + months;
  const last = new Date(
    Date.UTC(year, month + p("one"), p("zero")),
  ).getUTCDate();
  const next = new Date(Date.UTC(year, month, Math.min(day, last)))
    .toISOString()
    .split("T")[p("zero")]!;
  if (next <= from) throw new Error("Finance calendar must advance.");
  return makeIsoDate(next);
}

function account(core: CoreState, api: CoreAPI, id: string) {
  const row = core.people.get(id) ?? core.organizations.get(id);
  if (!row || (core.people.has(id) && core.organizations.has(id)))
    throw new Error(`Finance endpoint is absent or ambiguous: ${id}`);
  minor(api, row.liquidMinor, `cash:${id}`);
  return row;
}

function actualSource(api: CoreAPI, citation: string): Source {
  return { tag: "SOURCED", asOf: api.state.date, citation };
}

export function admitFinanceCondition(
  core: CoreState,
  api: CoreAPI,
  input: FinanceConditionInput,
): void {
  policy(api);
  const at = makeIsoDate(input.at);
  currentSource(input.source, at);
  if (
    core.finance.conditionsByPlace
      .get(input.placeId)
      ?.some((row) => row.at === at)
  )
    throw new Error(
      "Economic inputs require a unique effective date per place.",
    );
  if (
    !input.id ||
    !input.placeId ||
    [...core.finance.conditionsByPlace.values()].some((rows) =>
      rows.some((row) => row.id === input.id),
    )
  )
    throw new Error(
      "Finance conditions require unique recorded input identities and a place.",
    );
  for (const value of [
    input.generalPriceFactor,
    input.wagePriceFactor,
    input.macroDemandFactor,
  ])
    if (!Number.isFinite(value) || value <= api.parameter("zero"))
      throw new Error("Economic input factors must be positive.");
  const rows = [
    ...(core.finance.conditionsByPlace.get(input.placeId) ?? []),
    { ...input, at, source: { ...input.source } },
  ].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  core.finance.conditionsByPlace.set(input.placeId, rows);
}

function salesBudgetParameters(api: CoreAPI): Readonly<Record<string, number>> {
  return {
    zero: api.parameter("zero"),
    one: api.parameter("one"),
    monthsPerYear: api.parameter("monthsPerYear"),
  };
}

function validateSalesReceiptBudget(
  core: CoreState,
  api: CoreAPI,
  input: FinanceContractInput,
  siblings: readonly FinanceContractInput[],
  openingBook?: BusinessBooksInput,
): void {
  if (input.salesReceiptBudget === undefined) return;
  if (typeof input.salesReceiptBudget !== "boolean")
    throw new Error("Sales receipt budgets must be explicitly typed.");
  if (!input.salesReceiptBudget) return;
  const zero = api.parameter("zero"),
    one = api.parameter("one");
  if (
    input.accruesArrears ||
    input.householdId !== undefined ||
    input.interestFacilityId !== undefined ||
    input.marketAdjusted ||
    input.payerIds.length !== one ||
    input.salesReceipt !== true
  )
    throw new Error(
      "Receipt-linked procurement is a sole-firm budget, never arrears or household/interest terms.",
    );
  const payerId = input.payerIds[zero]!;
  if (
    !core.organizations.has(payerId) ||
    !core.organizations.has(input.payeeId) ||
    payerId === input.payeeId
  )
    throw new Error(
      "Procurement requires actual distinct firm and supplier accounts.",
    );
  const liveBook = core.finance.businesses.get(payerId);
  const book = liveBook ?? openingBook;
  if (!book || book.organizationId !== payerId || liveBook?.closedAt)
    throw new Error("Procurement has no actual open buyer book.");
  currentSource(book.source, core.date);
  if (!book.costContractIds.includes(input.id))
    throw new Error(
      "Receipt-linked procurement must be an explicitly bound buyer cost.",
    );
  const cutoff = core.finance.salesReceivedThroughByPayer.get(payerId);
  if (cutoff && makeIsoDate(cutoff.date) > core.date)
    throw new Error("Buyer sales cutoff cannot be a future fact.");
  const priorPool = core.finance.salesBudgetPoolsByPayer.get(payerId);
  if (priorPool?.date === core.date && makeIsoDate(input.dueAt) <= core.date)
    throw new Error(
      "Cannot add current procurement after its dated sales pool is frozen.",
    );
  const routes = siblings.filter(
    (row) =>
      row.salesReceiptBudget &&
      row.payerIds.length === one &&
      row.payerIds[zero] === payerId &&
      !core.finance.contracts.get(row.id)?.endedAt,
  );
  projectSalesReceiptBudgetPool(
    {
      payerId,
      date: core.date,
      previousReceivedMinor: cutoff?.receivedMinor ?? zero,
      receivedThroughMinor: liveBook?.salesReceivedMinor ?? zero,
      anchorAnnualDemandMinor:
        liveBook?.anchorAnnualDemandMinor ?? book.annualDemandMinor,
      routes: routes.map((row) => ({
        id: row.id,
        payerId,
        payeeId: row.payeeId,
        amountMinor: row.amountMinor,
        periodMonths: row.periodMonths,
      })),
    },
    salesBudgetParameters(api),
  );
}

/** Two-phase opening validation resolves book/contract cross-references without admitting them. */
export function preflightOpeningSalesBudgets(
  core: CoreState,
  api: CoreAPI,
  input: FinanceInput | undefined,
): ReadonlyMap<string, BusinessBooksInput> {
  const books = new Map<string, BusinessBooksInput>();
  for (const book of input?.businesses ?? []) {
    if (books.has(book.organizationId))
      throw new Error("Duplicate opening buyer book.");
    books.set(book.organizationId, book);
  }
  const rows = input?.contracts ?? [];
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error("Duplicate opening finance contract.");
    ids.add(row.id);
    validateSalesReceiptBudget(
      core,
      api,
      row,
      rows,
      books.get(row.payerIds[api.parameter("zero")]!),
    );
  }
  return books;
}

export function admitFinanceContract(
  core: CoreState,
  api: CoreAPI,
  input: FinanceContractInput,
  openingBook?: BusinessBooksInput,
): void {
  // A household's purchases are one everyday-living amount, not bills.
  if (isEverydayPurchase(core, input))
    return admitEverydayPurchase(core, input);
  policy(api);
  financeSettlementPhase(api, input);
  validateRecipientIncome(core, api, input);
  if (
    input.endsAt &&
    (makeIsoDate(input.endsAt) <= makeIsoDate(input.dueAt) ||
      input.accruesArrears)
  )
    throw new Error(
      "A finite budget must end after its first due date and cannot expire debt.",
    );
  if (!input.id || !input.kind || core.finance.contracts.has(input.id))
    throw new Error("Finance contract identity must be unique and typed.");
  if (typeof input.accruesArrears !== "boolean")
    throw new Error(
      "Finance terms must distinguish budgets from accrued obligations.",
    );
  if (
    input.salesReceipt !== undefined &&
    typeof input.salesReceipt !== "boolean"
  )
    throw new Error("Sales classification must be explicit and boolean.");
  currentSource(input.source, core.date);
  minor(api, input.amountMinor, "standing terms");
  const dueAt = makeIsoDate(input.dueAt);
  const billingDay = new Date(`${dueAt}T00:00:00.000Z`).getUTCDate();
  financeNextDate(api, dueAt, input.periodMonths, billingDay);
  if (
    !input.payerIds.length ||
    new Set(input.payerIds).size !== input.payerIds.length
  )
    throw new Error("Finance terms require distinct recorded payers.");
  account(core, api, input.payeeId);
  for (const id of input.payerIds) {
    account(core, api, id);
    if (id === input.payeeId)
      throw new Error("A finance contract cannot pay itself.");
    if (
      input.householdId &&
      !core.households.get(input.householdId)?.memberIds.includes(id)
    )
      throw new Error("Household terms require actual household payers.");
  }
  if (input.creditFacilityId) {
    const facility = core.finance.facilities.get(input.creditFacilityId);
    if (
      !facility ||
      input.payerIds.length !== api.parameter("one") ||
      facility.borrowerId !== input.payerIds[api.parameter("zero")]
    )
      throw new Error("Contract credit must belong to its sole payer.");
  }
  if (input.interestFacilityId) {
    const facility = core.finance.facilities.get(input.interestFacilityId);
    if (
      !facility ||
      input.payerIds.length !== api.parameter("one") ||
      facility.borrowerId !== input.payerIds[api.parameter("zero")] ||
      facility.lenderId !== input.payeeId
    )
      throw new Error(
        "Interest terms require their actual borrower and creditor.",
      );
  }
  // All extra semantic/cutoff/aggregate-ratio checks precede the first index write.
  if (input.salesReceiptBudget !== undefined) {
    const siblings: FinanceContractInput[] = [
      ...[
        ...(core.finance.contractsByBusiness.get(
          input.payerIds[api.parameter("zero")]!,
        ) ?? []),
      ].map((id) => core.finance.contracts.get(id)!),
      input,
    ];
    validateSalesReceiptBudget(core, api, input, siblings, openingBook);
  }
  if (input.salesReceiptBudget)
    api.stopgap(policy(api).salesReceiptBudgetStopgapId);
  const row = {
    ...input,
    ...(input.recipientIncome
      ? { recipientIncome: { ...input.recipientIncome } }
      : {}),
    payerIds: [...input.payerIds],
    source: { ...input.source },
    dueAt,
    firstDueAt: dueAt,
    billingDay,
    arrearsMinor: api.parameter("zero"),
  };
  core.finance.contracts.set(row.id, row);
  financeIndex(core.finance.contractsDueAt, dueAt, row.id);
  if (row.recipientIncome)
    financeIndex(
      core.finance.incomeContractsByPerson,
      row.recipientIncome.personId,
      row.id,
    );
  if (row.endsAt)
    financeIndex(core.finance.contractsEndingAt, row.endsAt, row.id);
  if (row.householdId && row.accruesArrears)
    financeIndex(core.finance.obligationsByHousehold, row.householdId, row.id);
  for (const id of [...row.payerIds, row.payeeId])
    if (core.organizations.has(id))
      financeIndex(core.finance.contractsByBusiness, id, row.id);
}

/** Allocate novel sales to all active routes, then freeze due accrued budgets. */
export function prepareFinanceProcurement(
  core: CoreState,
  api: CoreAPI,
  contractIds: readonly string[],
): void {
  const zero = api.parameter("zero"),
    one = api.parameter("one");
  const ids = new Set<string>();
  const groups = new Map<string, FinanceContractInput[]>();
  for (const id of contractIds) {
    if (ids.has(id)) throw new Error("Duplicate procurement phase contract.");
    ids.add(id);
    const row = core.finance.contracts.get(id);
    if (
      !row ||
      row.endedAt ||
      row.dueAt > core.date ||
      row.lastSettledAt === core.date
    )
      throw new Error(
        "Procurement phase contains absent, retired, non-due or settled terms.",
      );
    if (!row.salesReceiptBudget) continue;
    const payerId = row.payerIds[zero]!;
    const rows = groups.get(payerId) ?? [];
    rows.push(row);
    groups.set(payerId, rows);
  }
  const staged: {
    pool: SalesReceiptBudgetPool;
    pending: ReadonlyMap<string, SalesReceiptPendingBudget>;
  }[] = [];
  if (groups.size === zero) return;
  const parameters = salesBudgetParameters(api);
  api.stopgap("SG-P8-finance-sales-receipt-budgets");
  for (const payerId of groups.keys()) {
    const book = core.finance.businesses.get(payerId);
    if (
      !book ||
      book.closedAt ||
      core.finance.salesBudgetPoolsByPayer.get(payerId)?.date === core.date
    )
      throw new Error(
        "Buyer sales pool is missing, closed or already frozen today.",
      );
    const bound = [...(core.finance.contractsByBusiness.get(payerId) ?? [])]
      .map((id) => core.finance.contracts.get(id)!)
      .filter(
        (row) =>
          row.salesReceiptBudget &&
          row.payerIds.length === one &&
          row.payerIds[zero] === payerId &&
          !row.endedAt,
      );
    for (const row of bound) {
      if (row.dueAt <= core.date && !ids.has(row.id))
        throw new Error(
          "The procurement phase omitted a due route from this finite buyer pool.",
        );
      validateSalesReceiptBudget(core, api, row, bound);
    }
    const cutoff = core.finance.salesReceivedThroughByPayer.get(payerId);
    if (cutoff && cutoff.date >= core.date)
      throw new Error("Buyer sales cutoffs must advance chronologically.");
    const allocation = projectSalesReceiptBudgetPool(
      {
        payerId,
        date: core.date,
        previousReceivedMinor: cutoff?.receivedMinor ?? zero,
        receivedThroughMinor: book.salesReceivedMinor,
        anchorAnnualDemandMinor: book.anchorAnnualDemandMinor,
        routes: bound.map((row) => ({
          id: row.id,
          payerId,
          payeeId: row.payeeId,
          amountMinor: row.amountMinor,
          periodMonths: row.periodMonths,
        })),
      },
      parameters,
    );
    const pending = new Map<string, SalesReceiptPendingBudget>();
    const requestedByContract = new Map<string, number>();
    const basisByContract = new Map<string, SalesReceiptPendingBudget>();
    const pendingBeforeByContract = new Map<string, number>();
    for (const row of bound) {
      const previous = core.finance.salesPendingBudgetByContract.get(row.id);
      if (previous) {
        minor(api, previous.amountMinor, "pending purchase budget");
        minor(
          api,
          previous.previousReceivedMinor,
          "pending budget sales cutoff",
        );
        minor(
          api,
          previous.receivedThroughMinor,
          "pending budget sales extent",
        );
        if (
          previous.payerId !== payerId ||
          !cutoff ||
          makeIsoDate(previous.firstAllocatedAt) > core.date ||
          previous.previousReceivedMinor > previous.receivedThroughMinor ||
          previous.receivedThroughMinor > cutoff.receivedMinor
        )
          throw new Error(
            "Pending purchase budget has inconsistent actual-sales provenance.",
          );
      }
      const priorMinor = previous?.amountMinor ?? zero;
      const addedMinor = allocation.allocatedByContract.get(row.id)!;
      const totalMinor = priorMinor + addedMinor;
      minor(api, totalMinor, "accrued purchase budget");
      const basis: SalesReceiptPendingBudget = {
        payerId,
        amountMinor: totalMinor,
        firstAllocatedAt: previous?.firstAllocatedAt ?? core.date,
        previousReceivedMinor:
          previous?.previousReceivedMinor ?? allocation.previousReceivedMinor,
        receivedThroughMinor: allocation.receivedThroughMinor,
      };
      pending.set(row.id, basis);
      if (ids.has(row.id)) {
        requestedByContract.set(row.id, totalMinor);
        basisByContract.set(row.id, basis);
        pendingBeforeByContract.set(row.id, priorMinor);
      }
    }
    staged.push({
      pool: {
        ...allocation,
        requestedByContract,
        basisByContract,
        pendingBeforeByContract,
      },
      pending,
    });
  }
  // Commit no cutoff until every buyer, route and rounded total has been admitted.
  if (staged.length > zero)
    api.stopgap(policy(api).salesReceiptBudgetStopgapId);
  for (const { pool, pending } of staged) {
    core.finance.salesBudgetPoolsByPayer.set(pool.payerId, pool);
    core.finance.salesReceivedThroughByPayer.set(pool.payerId, {
      date: pool.date,
      receivedMinor: pool.receivedThroughMinor,
    });
    for (const [id, budget] of pending)
      if (budget.amountMinor > zero)
        core.finance.salesPendingBudgetByContract.set(id, budget);
      else core.finance.salesPendingBudgetByContract.delete(id);
  }
}

/** A payment made between due dates (through the ledger) reduces a standing obligation's recorded arrears. */
export function reduceStandingArrears(
  core: CoreState,
  api: CoreAPI,
  id: string,
  paidMinor: number,
): void {
  const row = core.finance.contracts.get(id);
  minor(api, paidMinor, "arrears payment");
  if (!row || !row.accruesArrears || paidMinor > row.arrearsMinor)
    throw new Error("An arrears payment cannot exceed what is owed.");
  row.arrearsMinor -= paidMinor;
  if (row.arrearsMinor === api.parameter("zero")) delete row.firstUnpaidAt;
}

/**
 * A household filled in from the counts takes up what its group owed: the
 * arrears the counted lease had run up are on its own lease from the day the
 * first was unpaid, and the next due date asks for them with the rent.
 */
export function carryStandingArrears(
  core: CoreState,
  api: CoreAPI,
  id: string,
  owedMinor: number,
  since: string,
): void {
  const row = core.finance.contracts.get(id);
  minor(api, owedMinor, "carried arrears");
  if (!row || !row.accruesArrears)
    throw new Error("Arrears can be carried only onto a standing obligation.");
  if (owedMinor === api.parameter("zero")) return;
  row.arrearsMinor += owedMinor;
  if (!row.firstUnpaidAt || row.firstUnpaidAt > since)
    row.firstUnpaidAt = makeIsoDate(since);
}

/** A standing obligation's amount changes from its next due date (a lease renewal); past bills and arrears stay. */
export function setStandingContractAmount(
  core: CoreState,
  api: CoreAPI,
  id: string,
  amountMinor: number,
): void {
  const row = core.finance.contracts.get(id);
  if (!row || row.endedAt || row.salesReceiptBudget || row.recipientIncome)
    throw new Error(
      "Only a current standing obligation can change its amount.",
    );
  minor(api, amountMinor, "standing obligation amount");
  row.amountMinor = amountMinor;
}

/**
 * People move from one household to another: the home obligations they shared
 * (the lease) are paid by the household they now belong to. They stop paying
 * the old household's; an obligation left with no payer ends, and the people
 * who stay keep paying it. They begin paying the new household's. Returns the
 * contracts that changed.
 */
export function moveHouseholdPayers(
  core: CoreState,
  api: CoreAPI,
  fromId: string,
  toId: string,
  personIds: readonly string[],
): string[] {
  const moving = new Set(personIds);
  const today = makeIsoDate(core.date);
  const adultAge = api.parameter("benchmarkAdultMinimumAge");
  // Who stays and can take a lease over: the oldest living adult first.
  const heir = (core.households.get(fromId)?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .filter(
      (person): person is PersonState =>
        person !== undefined &&
        person.alive &&
        !moving.has(person.id) &&
        ageOnDate(makeIsoDate(person.birthDate), today) >= adultAge,
    )
    .sort(
      (a, b) =>
        a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
    )[api.parameter("zero")];
  const changed: string[] = [];
  for (const id of [
    ...(core.finance.obligationsByHousehold.get(fromId) ?? []),
  ]) {
    const row = core.finance.contracts.get(id);
    if (!row || row.endedAt) continue;
    if (!row.payerIds.some((payer) => moving.has(payer))) continue;
    const left = row.payerIds.filter((payer) => !moving.has(payer));
    const outcome: PayerHandover["outcome"] = left.length
      ? "kept-by-co-payers"
      : heir
        ? "taken-over"
        : "ended";
    const payers = left.length ? left : heir ? [heir.id] : [];
    row.payerHandovers = [
      ...(row.payerHandovers ?? []),
      ...personIds
        .filter((payer) => row.payerIds.includes(payer))
        .map((payer) => ({ on: today, from: payer, to: payers, outcome })),
    ];
    if (payers.length) row.payerIds = payers;
    else endStandingContract(core, api, id);
    changed.push(id);
  }
  for (const id of core.finance.obligationsByHousehold.get(toId) ?? []) {
    const row = core.finance.contracts.get(id);
    if (!row || row.endedAt) continue;
    const add = personIds.filter((payer) => !row.payerIds.includes(payer));
    if (!add.length) continue;
    row.payerIds = [...row.payerIds, ...add];
    row.payerHandovers = [
      ...(row.payerHandovers ?? []),
      ...add.map((payer) => ({
        on: today,
        from: payer,
        to: row.payerIds,
        outcome: "joined" as const,
      })),
    ];
    changed.push(id);
  }
  return changed;
}

/**
 * A person with a recorded income award moves to a household of their own:
 * their awards are paid into it from the next due date, the monthly amount
 * unchanged, and the saved award still names the household it was written
 * for. Returns the contracts that moved.
 */
export function moveRecipientIncomeHome(
  core: CoreState,
  personId: string,
  householdId: string,
): string[] {
  const moved: string[] = [];
  for (const id of core.finance.incomeContractsByPerson.get(personId) ?? []) {
    const row = core.finance.contracts.get(id);
    if (!row?.recipientIncome || row.endedAt) continue;
    if (row.recipientIncome.householdId === householdId) continue;
    row.recipientIncome = {
      ...row.recipientIncome,
      householdId,
      recordedHouseholdId:
        row.recipientIncome.recordedHouseholdId ??
        row.recipientIncome.householdId,
      movedOn: core.date,
    };
    moved.push(id);
  }
  return moved;
}

/**
 * A benefit level in force changes a recipient income's amount from its next
 * due date: the contract takes the new amount and records the measure and day
 * beside the saved award, which stays as it was written. The outside funding
 * obligation that pays the recipient's payer moves by the same dollars, so
 * the payer's money in and out still match. Returns what changed.
 */
export function setRecipientIncomeAmount(
  core: CoreState,
  api: CoreAPI,
  id: string,
  amountMinor: number,
  cause: { readonly measureId: string },
): { fromMinor: number; toMinor: number; fundingId?: string } {
  const row = core.finance.contracts.get(id);
  if (!row || row.endedAt || !row.recipientIncome)
    throw new Error("Only a current recipient income can take a new amount.");
  minor(api, amountMinor, "recipient income amount");
  const fromMinor = row.amountMinor;
  if (fromMinor === amountMinor) return { fromMinor, toMinor: fromMinor };
  row.amountMinor = amountMinor;
  row.recipientIncome = {
    ...row.recipientIncome,
    adjustedMinor: amountMinor,
    adjustedBy: cause.measureId,
    adjustedOn: core.date,
  };
  let fundingId: string | undefined;
  for (const funding of core.finance.contracts.values()) {
    const inflow = funding.externalInflow as
      { incomeContractIds?: readonly string[] } | undefined;
    if (funding.endedAt || !inflow?.incomeContractIds?.includes(id)) continue;
    funding.amountMinor += amountMinor - fromMinor;
    fundingId = funding.id;
  }
  return {
    fromMinor,
    toMinor: amountMinor,
    ...(fundingId ? { fundingId } : {}),
  };
}

/** A standing obligation (a lease) stops billing today; arrears already owed stay on the record. */
export function endStandingContract(
  core: CoreState,
  api: CoreAPI,
  id: string,
): void {
  const row = core.finance.contracts.get(id);
  if (!row || row.endedAt || row.salesReceiptBudget || row.recipientIncome)
    throw new Error("Only a current standing obligation can end.");
  policy(api);
  row.endedAt = core.date;
  removeIndex(core.finance.contractsDueAt, row.dueAt, row.id);
  if (row.endsAt)
    removeIndex(core.finance.contractsEndingAt, row.endsAt, row.id);
}

/** What became of a standing obligation when one of its payers died. */
export interface ContractHandOver {
  readonly contractId: string;
  readonly outcome: "kept-by-co-payers" | "taken-over" | "ended";
  readonly payerIds: readonly string[];
}

/**
 * A payer dies, and the standing obligations they paid (a mortgage, a lease)
 * stop drawing their account (owner rule: a bill reads who is alive when it
 * falls due). The other payers keep paying it. With none, the oldest living
 * adult in the dead person's home takes it over from the next due date; with
 * no one left it ends, and the estate pays what was owed first (`settleEstate`).
 * Each change is a dated record on the contract. Income awards and purchase
 * budgets are not payer obligations and are left to their own rules.
 */
export function handOverContractsAtDeath(
  core: CoreState,
  api: CoreAPI,
  personId: string,
): ContractHandOver[] {
  const adultAge = api.parameter("benchmarkAdultMinimumAge");
  const today = makeIsoDate(core.date);
  const home = core.households.get(
    core.people.get(personId)?.householdId ?? "",
  );
  const heirs = (home?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .filter(
      (person): person is PersonState =>
        person !== undefined &&
        person.alive &&
        person.id !== personId &&
        ageOnDate(makeIsoDate(person.birthDate), today) >= adultAge,
    )
    .sort(
      (a, b) =>
        a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
    );
  const out: ContractHandOver[] = [];
  for (const row of [...core.finance.contracts.values()]) {
    if (
      row.endedAt ||
      row.recipientIncome ||
      row.salesReceiptBudget ||
      !row.payerIds.includes(personId)
    )
      continue;
    const living = row.payerIds.filter(
      (id) => id !== personId && core.people.get(id)?.alive !== false,
    );
    const heir = heirs[api.parameter("zero")];
    const outcome: ContractHandOver["outcome"] = living.length
      ? "kept-by-co-payers"
      : heir
        ? "taken-over"
        : "ended";
    const payerIds = living.length ? living : heir ? [heir.id] : [];
    row.payerHandovers = [
      ...(row.payerHandovers ?? []),
      { on: today, from: personId, to: payerIds, outcome },
    ];
    if (outcome === "ended") endStandingContract(core, api, row.id);
    else row.payerIds = payerIds;
    out.push({ contractId: row.id, outcome, payerIds });
  }
  return out;
}

/** A person's own income (a pension, an annuity) stops paying at their death; returns the contracts ended. */
export function endRecipientIncomeAtDeath(
  core: CoreState,
  personId: string,
): string[] {
  const ended: string[] = [];
  for (const id of [
    ...(core.finance.incomeContractsByPerson.get(personId) ?? []),
  ]) {
    const row = core.finance.contracts.get(id);
    if (!row) continue;
    if (!row.endedAt) {
      row.endedAt = core.date;
      ended.push(id);
    }
    removeIndex(core.finance.contractsDueAt, row.dueAt, row.id);
    if (row.endsAt)
      removeIndex(core.finance.contractsEndingAt, row.endsAt, row.id);
    removeIndex(core.finance.incomeContractsByPerson, personId, row.id);
    shrinkRetirementFunding(core, row);
  }
  return ended;
}

/**
 * The funding contract that pays a group of retirees' awards stops listing
 * an ended one: its amount falls by the award's, its lists lose the award,
 * and with no award left it ends. The settlement checks that the funding
 * equals the sum of the actual awards it lists, so a dead retiree's award
 * left on the list stops the next due date.
 */
function shrinkRetirementFunding(
  core: CoreState,
  income: FinanceContractState,
): void {
  const awardId = income.recipientIncome?.sourceFactId;
  for (const funding of core.finance.contracts.values()) {
    const inflow = funding.externalInflow;
    if (funding.endedAt || !inflow?.incomeContractIds?.includes(income.id))
      continue;
    const remaining = inflow.incomeContractIds.filter((id) => id !== income.id);
    if (!remaining.length) {
      funding.endedAt = core.date;
      removeIndex(core.finance.contractsDueAt, funding.dueAt, funding.id);
      if (funding.endsAt)
        removeIndex(core.finance.contractsEndingAt, funding.endsAt, funding.id);
      continue;
    }
    funding.amountMinor -= income.amountMinor;
    funding.externalInflow = {
      ...inflow,
      incomeContractIds: remaining,
      sourceAwardIds: (inflow.sourceAwardIds ?? []).filter(
        (id) => id !== awardId,
      ),
    };
  }
}

export function retireFinanceBudget(
  core: CoreState,
  api: CoreAPI,
  id: string,
): void {
  const row = core.finance.contracts.get(id);
  if (
    !row ||
    !row.endsAt ||
    row.endsAt > core.date ||
    row.accruesArrears ||
    row.arrearsMinor !== api.parameter("zero")
  )
    throw new Error("Only an ended finite nondebt budget can be retired.");
  row.endedAt ??= core.date;
  removeIndex(core.finance.contractsDueAt, row.dueAt, row.id);
  removeIndex(core.finance.contractsEndingAt, row.endsAt, row.id);
  core.finance.salesPendingBudgetByContract.delete(row.id);
  if (row.recipientIncome)
    removeIndex(
      core.finance.incomeContractsByPerson,
      row.recipientIncome.personId,
      row.id,
    );
}

export function admitCreditFacility(
  core: CoreState,
  api: CoreAPI,
  input: CreditFacilityInput,
): void {
  const data = policy(api),
    zero = api.parameter("zero");
  currentSource(input.source, core.date);
  if (
    !input.id ||
    core.finance.facilities.has(input.id) ||
    input.borrowerId === input.lenderId ||
    !core.organizations.has(input.borrowerId)
  )
    throw new Error(
      "Credit requires unique recorded borrower and lender identities.",
    );
  account(core, api, input.borrowerId);
  account(core, api, input.lenderId);
  minor(api, input.limitMinor, "approved line");
  amount(
    api,
    api.parameter(input.annualInterestParameter),
    "annual interest terms",
  );
  const dayCount = api.parameter(
    input.interestDayCountParameter ?? data.interestDayCountParameter,
  );
  if (!Number.isFinite(dayCount) || dayCount <= zero)
    throw new Error("Interest day count must be positive.");
  const dueAt = financeNextDate(
    api,
    core.date,
    api.parameter(data.reviewPeriodMonthsParameter),
  );
  // Admit the generated contract's following period before either parent index exists.
  financeNextDate(api, dueAt, api.parameter(data.reviewPeriodMonthsParameter));
  const interestId = `finance-interest:${input.id}`;
  if (core.finance.contracts.has(interestId))
    throw new Error("Credit interest contract already exists.");
  core.finance.facilities.set(input.id, {
    ...input,
    interestDayCountParameter:
      input.interestDayCountParameter ?? data.interestDayCountParameter,
    source: { ...input.source },
    principalMinor: zero,
    interestArrearsMinor: zero,
    interestRemainderMinor: zero,
    unbilledInterestMinor: zero,
    lastAccruedAt: core.date,
    lastInterestAt: core.date,
  });
  financeIndex(core.finance.facilitiesByBorrower, input.borrowerId, input.id);
  admitFinanceContract(core, api, {
    id: interestId,
    payerIds: [input.borrowerId],
    payeeId: input.lenderId,
    kind: data.kinds.interest,
    amountMinor: zero,
    dueAt,
    periodMonths: api.parameter(data.reviewPeriodMonthsParameter),
    accruesArrears: true,
    interestFacilityId: input.id,
    source: input.source,
  });
}

/** A line a bank approved mid-run becomes the business's credit for its bills and payroll. */
export function attachBusinessCredit(
  core: CoreState,
  api: CoreAPI,
  organizationId: string,
  facilityId: string,
): void {
  const book = core.finance.businesses.get(organizationId),
    facility = core.finance.facilities.get(facilityId);
  if (
    !book ||
    book.closedAt ||
    !facility ||
    !facility.active ||
    facility.borrowerId !== organizationId
  )
    throw new Error("Business credit must be the open firm's own active line.");
  policy(api);
  book.creditFacilityId = facilityId;
}

/** A dated rate change; interest before today stays at the old rate. */
export function repriceCreditFacility(
  core: CoreState,
  api: CoreAPI,
  facilityId: string,
  annualInterestRate: number,
  source: Source,
): void {
  const row = core.finance.facilities.get(facilityId);
  if (!row) throw new Error("Repricing requires a recorded credit facility.");
  currentSource(source, core.date);
  amount(api, annualInterestRate, "repriced annual interest rate");
  const elapsed = daysBetween(
    makeIsoDate(row.lastAccruedAt),
    makeIsoDate(core.date),
  );
  const oldRate =
    row.annualInterestRate ?? api.parameter(row.annualInterestParameter);
  const days = api.parameter(
    row.interestDayCountParameter ?? policy(api).interestDayCountParameter,
  );
  row.unbilledInterestMinor += (row.principalMinor * elapsed * oldRate) / days;
  row.lastAccruedAt = core.date;
  row.annualInterestRate = annualInterestRate;
  row.ratedAt = core.date;
  row.rateSource = { ...source };
}

export function admitBusinessBooks(
  core: CoreState,
  api: CoreAPI,
  input: BusinessBooksInput,
): void {
  const data = core.data.businessBooks ?? DEFAULT_BUSINESS_BOOKS_DATA;
  policy(api);
  const zero = api.parameter("zero"),
    one = api.parameter("one");
  currentSource(input.source, core.date);
  if (
    !core.organizations.has(input.organizationId) ||
    core.finance.businesses.has(input.organizationId) ||
    !data.kinds.some((row) => row.id === input.kindId)
  )
    throw new Error(
      "Business books require a unique recorded firm and registered industry.",
    );
  for (const value of [
    input.annualPayrollMinor,
    input.annualDemandMinor,
    input.annualOtherCostsMinor,
    input.openingTownIncomeMinor,
    input.capacityMinor,
  ])
    amount(api, value, "business projection");
  if (
    !Number.isFinite(input.price) ||
    input.price <= zero ||
    (input.annualDemandMinor > zero && input.capacityMinor === zero)
  )
    throw new Error("Business demand requires positive price and capacity.");
  if (new Set(input.costContractIds).size !== input.costContractIds.length)
    throw new Error("Duplicate business cost contract.");
  for (const id of input.costContractIds) {
    const row = core.finance.contracts.get(id);
    if (
      !row ||
      row.payerIds.length !== one ||
      row.payerIds[zero] !== input.organizationId
    )
      throw new Error("Business costs require their actual supplier terms.");
  }
  if (
    input.creditFacilityId &&
    core.finance.facilities.get(input.creditFacilityId)?.borrowerId !==
      input.organizationId
  )
    throw new Error("Business credit must belong to the firm.");
  const nextReviewedAt = core.date;
  for (const id of data.stopgapIds) api.stopgap(id);
  core.finance.businesses.set(input.organizationId, {
    ...input,
    costContractIds: [...input.costContractIds],
    source: { ...input.source },
    lastReviewedAt: core.date,
    nextReviewedAt,
    reachedIncomeRatio: one,
    anchorAnnualDemandMinor: input.annualDemandMinor,
    anchorAnnualOtherCostsMinor: input.annualOtherCostsMinor,
    anchorPrice: input.price,
    lastGeneralPriceFactor: one,
    lastWagePriceFactor: one,
    lastHourlyByJob: ownHourlyPay(core, input.organizationId).hourly,
    receivedMinor: zero,
    salesReceivedMinor: zero,
    operatingPaidMinor: zero,
    wagesRequestedMinor: zero,
    wagesPaidMinor: zero,
    wagesUnpaidMinor: zero,
  });
  const place = core.organizations.get(input.organizationId)!.placeId;
  financeIndex(core.finance.businessesByPlace, place, input.organizationId);
  financeIndex(core.finance.reviewsDueAt, nextReviewedAt, input.organizationId);
}

function admittedFacility(core: CoreState, api: CoreAPI, id: string) {
  const row = core.finance.facilities.get(id);
  if (!row) throw new Error("Recorded credit facility is absent.");
  currentSource(row.source, core.date);
  minor(api, row.principalMinor, "existing principal");
  minor(api, row.limitMinor, "facility limit");
  account(core, api, row.borrowerId);
  account(core, api, row.lenderId);
  return row;
}

/** Dated principal exposure accrues once, before any draw, repayment or bill. */
export function transferCredit(
  core: CoreState,
  api: CoreAPI,
  facilityId: string,
  requested: number,
  reasonKey: string,
  sourceId: string,
  repayment = false,
): CreditReceipt {
  policy(api);
  return transferFinanceCreditJournal(
    core,
    api,
    facilityId,
    requested,
    reasonKey,
    sourceId,
    repayment,
  );
}

export function settleFinanceContract(
  core: CoreState,
  api: CoreAPI,
  id: string,
): FinanceReceipt {
  policy(api);
  return settleFinanceContractJournal(core, api, id);
}

export function reviewBusiness(
  core: CoreState,
  api: CoreAPI,
  id: string,
): void {
  const book = core.finance.businesses.get(id),
    finance = policy(api),
    p = api.parameter;
  if (!book || book.closedAt || book.nextReviewedAt > core.date)
    throw new Error("Business review is absent, closed or not due.");
  const data = core.data.businessBooks ?? DEFAULT_BUSINESS_BOOKS_DATA;
  for (const stopgapId of data.stopgapIds) api.stopgap(stopgapId);
  const options = { data, parameters: core.data.parameters },
    place = core.organizations.get(id)!.placeId;
  const date = new Date(`${core.date}T00:00:00.000Z`);
  date.setUTCDate(p("one"));
  date.setUTCMonth(date.getUTCMonth() - p("one"));
  const month = date.toISOString().slice(p("zero"), p("isoMonthCharacters"));
  const paid = core.finance.paidIncomeByPlaceMonth.get(`${month}:${place}`);
  // The opening's anchor counts residents' pay from the town's own firms; the
  // month's measure also counts pay from elsewhere and retirement. So the
  // first full month the book reads (never the game's opening month, which
  // starts partway) becomes its basis, and each later month moves the anchor
  // by its change from that basis.
  if (
    book.incomeBasisMinor === undefined &&
    paid !== undefined &&
    paid > p("zero") &&
    month > core.startedAt.slice(p("zero"), p("isoMonthCharacters"))
  )
    book.incomeBasisMinor = paid * p("monthsPerYear");
  const income =
    paid === undefined || book.incomeBasisMinor === undefined
      ? book.openingTownIncomeMinor
      : (book.openingTownIncomeMinor * paid * p("monthsPerYear")) /
        book.incomeBasisMinor;
  const conditions = core.finance.conditionsByPlace.get(place) ?? [];
  const condition = conditions
    .filter((row) => row.at <= core.date)
    .at(-p("one"));
  const generalPrice = condition?.generalPriceFactor ?? p("one"),
    wagePrice = condition?.wagePriceFactor ?? p("one");
  if (condition) currentSource(condition.source, core.date);
  const market = projectMarket(
    {
      from: book.lastReviewedAt,
      to: core.date,
      priorReachedIncomeMinor:
        book.reachedIncomeRatio * book.openingTownIncomeMinor,
      currentTownIncomeMinor: income,
      anchorTownIncomeMinor: book.openingTownIncomeMinor,
      anchorAnnualDemandMinor: book.anchorAnnualDemandMinor,
      // Against the general price level: inflation alone moves no customer away.
      relativePriceToAnchor: book.price / book.anchorPrice / generalPrice,
      generalPriceFactor: generalPrice,
      macroDemandFactor: condition?.macroDemandFactor ?? p("one"),
      kindId: book.kindId,
      source: actualSource(
        api,
        "Actual previous-month resident wage and admitted paid nonwage income receipts, with currently dated world-level economic inputs; missing month uses the separately estimated opening payroll anchor. No projected revenue becomes cash.",
      ),
    },
    options,
  );
  const demand = market.annualDemandMinor ?? p("zero");
  const cost = projectOtherCosts(
    {
      kindId: book.kindId,
      openingAnnualOtherCostsMinor: book.anchorAnnualOtherCostsMinor,
      annualDemandMinor: demand,
      capacityMinor: book.capacityMinor,
      generalPriceFactor: generalPrice,
    },
    options,
  );
  const pay = ownHourlyPay(core, id);
  const price = projectBusinessPrice(
    {
      priorPrice: book.price,
      annualPlannedPayMinor: book.annualPayrollMinor,
      annualOtherCostsMinor: cost.annualOtherCostsMinor,
      wagePriceFactor:
        ownRaise(book.lastHourlyByJob, pay) ??
        wagePrice / book.lastWagePriceFactor,
      generalPriceFactor: generalPrice / book.lastGeneralPriceFactor,
      annualDemandMinor: demand,
      capacityMinor: book.capacityMinor,
      priceLevel: book.price / book.anchorPrice,
    },
    options,
  );
  const next = financeNextDate(
    api,
    book.nextReviewedAt,
    p(finance.reviewPeriodMonthsParameter),
  );
  if (next <= core.date)
    throw new Error("Business reviews must advance chronologically.");
  if (market.gap) core.gaps.add(market.gap);
  if (!condition) core.gaps.add(finance.gaps.conditions);
  core.gaps.add(finance.gaps.income);
  removeIndex(core.finance.reviewsDueAt, book.nextReviewedAt, id);
  book.lastReviewedAt = core.date;
  book.nextReviewedAt = next;
  book.reachedIncomeRatio =
    book.openingTownIncomeMinor > p("zero")
      ? market.reachedIncomeMinor / book.openingTownIncomeMinor
      : p("zero");
  book.annualDemandMinor = demand;
  book.annualOtherCostsMinor = cost.annualOtherCostsMinor;
  book.price = price;
  book.lastGeneralPriceFactor = generalPrice;
  book.lastWagePriceFactor = wagePrice;
  book.lastHourlyByJob = pay.hourly;
  financeIndex(core.finance.reviewsDueAt, next, id);
}

/** Each current job's hourly pay and daily hours at a firm, full or counted. */
function ownHourlyPay(
  core: CoreState,
  organizationId: string,
): { hourly: Record<string, number>; hours: Record<string, number> } {
  const hourly: Record<string, number> = {},
    hours: Record<string, number> = {};
  const add = (job: JobInput) => {
    if (job.endsAt !== undefined && job.endsAt <= core.date) return;
    const rate =
      job.hourlyMinor ??
      (job.hoursDaily > 0 ? job.wageDailyMinor / job.hoursDaily : undefined);
    if (rate === undefined || !(rate > 0) || !(job.hoursDaily > 0)) return;
    hourly[job.id] = rate;
    hours[job.id] = job.hoursDaily;
  };
  for (const jobId of core.finance.jobsByOrganization.get(organizationId) ??
    []) {
    const job = core.jobs.get(jobId);
    if (job) add(job);
  }
  for (const job of countedJobsOf(core, organizationId)) add(job);
  return { hourly, hours };
}

/**
 * The firm's own pay change since its last review, over the jobs it had then
 * and still has, weighted by their hours now: a raise (a minimum wage, the
 * yearly pay review) passes into its price, a hire at different pay doesn't.
 * Undefined when no job carries over; the place's pay index stands in.
 */
function ownRaise(
  before: Readonly<Record<string, number>> | undefined,
  now: {
    hourly: Readonly<Record<string, number>>;
    hours: Readonly<Record<string, number>>;
  },
): number | undefined {
  if (!before) return undefined;
  let paid = 0,
    wasPaid = 0;
  for (const jobId in now.hourly) {
    const prior = before[jobId];
    if (prior === undefined) continue;
    paid += now.hourly[jobId]! * now.hours[jobId]!;
    wasPaid += prior * now.hours[jobId]!;
  }
  return wasPaid > 0 ? paid / wasPaid : undefined;
}

export function businessAvailableCredit(
  core: CoreState,
  api: CoreAPI,
  id: string,
): number {
  let total = api.parameter("zero");
  for (const facilityId of core.finance.facilitiesByBorrower.get(id) ?? []) {
    const row = admittedFacility(core, api, facilityId);
    if (row.active)
      total += Math.min(
        Math.max(api.parameter("zero"), row.limitMinor - row.principalMinor),
        account(core, api, row.lenderId).liquidMinor,
      );
  }
  amount(api, total, "available actual credit");
  return total;
}

export function closeEmployer(
  core: CoreState,
  api: CoreAPI,
  organizationId: string,
  sourceReceiptId: string,
  reasonKey: string,
): EmployerClosure {
  const book = core.finance.businesses.get(organizationId),
    employer = core.organizations.get(organizationId);
  if (
    !book ||
    !employer ||
    book.closedAt ||
    !reasonKey ||
    employer.liquidMinor !== api.parameter("zero") ||
    businessAvailableCredit(core, api, organizationId) > api.parameter("zero")
  )
    throw new Error(
      "Closure requires an open recorded firm with exhausted actual cash and credit.",
    );
  let cause: EmployerClosure["cause"] | undefined;
  for (const jobId of core.finance.jobsByOrganization.get(organizationId) ??
    []) {
    const row = core.work.lastResultByJob.get(jobId);
    if (
      row?.id === sourceReceiptId &&
      row.date === core.date &&
      row.shortfallMinor > api.parameter("zero")
    ) {
      const actual = { ...row };
      delete actual.decision;
      cause = {
        ...actual,
        jobSource: { ...actual.jobSource },
        paySource: { ...actual.paySource },
        employerOpeningFundsSource: { ...actual.employerOpeningFundsSource },
        source: { ...actual.source },
      };
    }
  }
  // Attendance accrues wages; only a completed current payday can be a missed payroll.
  const grouped = core.work.payrollCashSources.get(sourceReceiptId);
  if (grouped?.group === true) {
    const aggregate = grouped.result;
    if (
      aggregate.organizationId !== organizationId ||
      aggregate.date !== core.date ||
      aggregate.shortfallMinor <= api.parameter("zero") ||
      aggregate.requestedMinor - aggregate.paidMinor !==
        aggregate.shortfallMinor
    )
      throw new Error(
        "Closure requires its actual completed conserving aggregate payday source and retained debt.",
      );
    verifyCurrentWorkPayrollGroup(api, aggregate);
    cause = structuredClone(aggregate);
  }
  for (const jobId of core.finance.jobsByOrganization.get(organizationId) ??
    []) {
    const row = core.work.latestPayrollByJob.get(jobId),
      ledger = row && core.work.payrollLedgerByCommitment.get(row.commitmentId),
      canonical = row && core.work.payrollCashSources.get(row.id);
    if (
      canonical?.group !== true &&
      row?.id === sourceReceiptId &&
      row.date === core.date &&
      row.organizationId === organizationId &&
      row.shortfallMinor > api.parameter("zero")
    ) {
      if (
        !ledger ||
        !canonical ||
        canonical.id !== row.id ||
        canonical.date !== row.date ||
        canonical.result !== row ||
        (canonical.postedJournalSequence === undefined &&
          canonical.completedAt === undefined) ||
        ledger.lastPayrollReceiptId !== row.id ||
        ledger.lastSettledAt !== row.date ||
        ledger.arrearsMinor !== row.arrearsAfterMinor ||
        row.requestedMinor - row.paidMinor !== row.shortfallMinor
      )
        throw new Error(
          "Closure requires its actual completed conserving payday source and retained debt.",
        );
      cause = structuredClone(row);
    }
  }
  for (const id of core.finance.contractsByBusiness.get(organizationId) ?? []) {
    const row = core.finance.latestReceiptsByContract.get(id);
    if (
      row?.id === sourceReceiptId &&
      row.date === core.date &&
      row.unfundedMinor > api.parameter("zero") &&
      core.finance.contracts.get(id)?.accruesArrears &&
      row.payments.some((p) => p.payerId === organizationId)
    )
      cause = {
        ...row,
        payments: row.payments.map((payment) => ({ ...payment })),
        source: { ...row.source },
      };
  }
  const counted = residentWageShortfall(core, sourceReceiptId);
  if (
    counted &&
    counted.organizationId === organizationId &&
    counted.date === core.date &&
    counted.shortfallMinor > api.parameter("zero")
  )
    cause = { ...counted, source: { ...counted.source } };
  if (!cause)
    throw new Error(
      "Closure requires an actual current unfunded obligation receipt.",
    );
  return windDownEmployer(
    core,
    api,
    organizationId,
    sourceReceiptId,
    reasonKey,
    cause,
    "Actual prototype closure after a recorded obligation could not be funded by existing cash or recorded finite credit; closure policy remains an open model assumption.",
  );
}

/** Cash a closing firm must keep for its full workers' final pay: accrued wages and arrears. */
function payrollHeld(core: CoreState, organizationId: string): number {
  let held = 0;
  for (const ledger of core.work.payrollLedgerByCommitment.values())
    if (ledger.organizationId === organizationId)
      held += ledger.accruedMinor + ledger.arrearsMinor;
  return held;
}

/**
 * A closing firm's credit lines close with it: what its cash above final pay
 * covers goes to the lender in one balanced entry (interest owed first, then
 * principal), and the lender writes off the rest. A closed line takes no draw,
 * accrues nothing and is never repriced or billed again.
 */
function closeCreditLines(
  core: CoreState,
  api: CoreAPI,
  closure: EmployerClosure,
): EmployerClosure["creditLines"] {
  const organizationId = closure.organizationId;
  let available = Math.max(
    0,
    core.organizations.get(organizationId)!.liquidMinor -
      payrollHeld(core, organizationId),
  );
  const lines: {
    facilityId: string;
    settledMinor: number;
    writtenOffMinor: number;
  }[] = [];
  for (const facilityId of [
    ...(core.finance.facilitiesByBorrower.get(organizationId) ?? []),
  ].sort()) {
    const facility = core.finance.facilities.get(facilityId)!;
    if (facility.closedAt) continue;
    const accounts = available > 0 ? api.accounts() : undefined;
    const paid =
      accounts &&
      Math.min(
        available,
        facility.principalMinor + facility.interestArrearsMinor,
      ) > 0
        ? accounts.transfer({
            id: `${closure.sourceReceiptId}:credit-settlement:${facilityId}`,
            from: accounts.main(organizationId),
            to: accounts.main(facility.lenderId),
            amountMinor: Math.min(
              available,
              facility.principalMinor + facility.interestArrearsMinor,
            ),
            reasonKey: "business.credit-settlement",
            source: closure.source,
          }).paidMinor
        : 0;
    available -= paid;
    const towardInterest = Math.min(paid, facility.interestArrearsMinor);
    const writtenOffMinor =
      facility.principalMinor -
      (paid - towardInterest) +
      (facility.interestArrearsMinor - towardInterest);
    facility.principalMinor = 0;
    facility.interestArrearsMinor = 0;
    facility.unbilledInterestMinor = 0;
    facility.interestRemainderMinor = 0;
    facility.lastAccruedAt = core.date;
    facility.active = false;
    facility.closedAt = core.date;
    facility.settledMinor = paid;
    facility.writtenOffMinor = writtenOffMinor;
    for (const id of core.finance.contractsByBusiness.get(organizationId) ??
      []) {
      const term = core.finance.contracts.get(id)!;
      if (term.interestFacilityId !== facilityId) continue;
      term.arrearsMinor = 0;
      delete term.firstUnpaidAt;
    }
    lines.push({ facilityId, settledMinor: paid, writtenOffMinor });
  }
  return lines;
}

/** Ends a closing firm's jobs, contracts and books, and records the closure. */
function windDownEmployer(
  core: CoreState,
  api: CoreAPI,
  organizationId: string,
  sourceReceiptId: string,
  reasonKey: string,
  cause: EmployerClosure["cause"],
  sourceText: string,
): EmployerClosure {
  const book = core.finance.businesses.get(organizationId)!,
    employer = core.organizations.get(organizationId)!;
  const retiredProcurementPayers = new Set<string>();
  const eventId = `employer-closed:${core.date}:${organizationId}`;
  if (core.eventIds.has(eventId))
    throw new Error("Closure event already exists.");
  const endedJobIds: string[] = [],
    affectedPersonIds: string[] = [];
  for (const jobId of core.finance.jobsByOrganization.get(organizationId) ??
    []) {
    const job = core.jobs.get(jobId)!;
    if (job.endsAt !== undefined) continue;
    const actor = core.people.get(job.personId);
    if (!actor || !core.knowledgeByPerson.has(actor.id))
      throw new Error("Closing job has no recorded worker or knowledge index.");
    endedJobIds.push(jobId);
    affectedPersonIds.push(job.personId);
  }
  // Counted workers (and a counted owner) lose their jobs today too; the jobs engine ends them on the closure event.
  const countedJobs = countedJobsOf(core, organizationId);
  const closure: EmployerClosure = {
    organizationId,
    date: core.date,
    reasonKey,
    sourceReceiptId,
    cause,
    endedJobIds,
    affectedPersonIds,
    endedCountedJobIds: countedJobs.map((job) => job.id),
    affectedCountedPersonIds: countedJobs.map((job) => job.personId),
    creditLines: [],
    source: actualSource(api, sourceText),
  };
  book.closedAt = core.date;
  book.closingReasonKey = reasonKey;
  closure.creditLines = closeCreditLines(core, api, closure);
  removeIndex(core.finance.reviewsDueAt, book.nextReviewedAt, organizationId);
  for (const jobId of endedJobIds) {
    const job = core.jobs.get(jobId)!;
    job.endsAt = core.date;
    const actor = core.people.get(job.personId)!;
    if (actor.jobId === jobId) delete actor.jobId;
    for (const commitmentId of core.work.commitmentsByPerson.get(actor.id) ??
      []) {
      const commitment = core.work.commitments.get(commitmentId)!;
      if (commitment.jobId !== jobId) continue;
      commitment.endsAt = core.date;
      const residues = core.work.byPeriodResidue.get(commitment.periodDays);
      for (const [residue, ids] of residues ?? []) {
        ids.delete(commitmentId);
        if (!ids.size) residues!.delete(residue);
      }
      if (residues && !residues.size)
        core.work.byPeriodResidue.delete(commitment.periodDays);
      actor.goals.delete(`work:${commitment.id}`);
    }
    api.observe(actor.id, {
      key: `job:${jobId}:status`,
      value: "ended",
      learnedAt: core.date,
      sourceId: sourceReceiptId,
      access: "self",
    });
  }
  for (const id of core.finance.contractsByBusiness.get(organizationId) ?? []) {
    const row = core.finance.contracts.get(id)!;
    row.endedAt = core.date;
    removeIndex(core.finance.contractsDueAt, row.dueAt, id);
    if (row.endsAt) removeIndex(core.finance.contractsEndingAt, row.endsAt, id);
    if (row.recipientIncome)
      removeIndex(
        core.finance.incomeContractsByPerson,
        row.recipientIncome.personId,
        id,
      );
    if (row.salesReceiptBudget) {
      core.finance.salesPendingBudgetByContract.delete(id);
      retiredProcurementPayers.add(row.payerIds[api.parameter("zero")]!);
    }
  }
  for (const payerId of retiredProcurementPayers) {
    const activeIds = new Set(
      [...(core.finance.contractsByBusiness.get(payerId) ?? [])].filter(
        (id) => {
          const row = core.finance.contracts.get(id)!;
          return (
            row.salesReceiptBudget &&
            !row.endedAt &&
            row.payerIds[api.parameter("zero")] === payerId
          );
        },
      ),
    );
    if (!activeIds.size) {
      core.finance.salesBudgetPoolsByPayer.delete(payerId);
      // A still-open buyer keeps one cutoff so a replacement supplier cannot
      // allocate historical sales again. Closed buyers discard that residue.
      if (core.finance.businesses.get(payerId)?.closedAt)
        core.finance.salesReceivedThroughByPayer.delete(payerId);
      continue;
    }
    const pool = core.finance.salesBudgetPoolsByPayer.get(payerId);
    if (pool)
      core.finance.salesBudgetPoolsByPayer.set(payerId, {
        ...pool,
        allocatedByContract: new Map(
          [...pool.allocatedByContract].filter(([id]) => activeIds.has(id)),
        ),
        requestedByContract: new Map(
          [...pool.requestedByContract].filter(([id]) => activeIds.has(id)),
        ),
        basisByContract: new Map(
          [...pool.basisByContract].filter(([id]) => activeIds.has(id)),
        ),
        pendingBeforeByContract: new Map(
          [...pool.pendingBeforeByContract].filter(([id]) => activeIds.has(id)),
        ),
      });
  }
  core.finance.closures.set(organizationId, closure);
  api.emit({
    id: eventId,
    date: core.date,
    kind: "organization.closed",
    placeId: employer.placeId,
    personIds: affectedPersonIds,
    publicRecord: true,
    source: closure.source,
    facts: {
      [`organization:${organizationId}:status`]: "closed",
      [`organization:${organizationId}:closure-source`]: sourceReceiptId,
    },
  });
  return closure;
}

/**
 * An owner closes a solvent business by choice (no successor, retiring): its
 * remaining cash goes to the owner's account in one balanced entry, then its
 * jobs, contracts and books end exactly as in a forced closure. The decision
 * is the caller's (an owner's own reasons); this only carries it out.
 */
export function closeBusinessByChoice(
  core: CoreState,
  api: CoreAPI,
  input: {
    organizationId: string;
    ownerAccountId: string;
    reasonKey: string;
    source: Source;
  },
): EmployerClosure {
  const { organizationId, ownerAccountId, reasonKey, source } = input;
  const book = core.finance.businesses.get(organizationId),
    employer = core.organizations.get(organizationId);
  if (!book || !employer || book.closedAt || !reasonKey)
    throw new Error("A closure by choice needs an open recorded business.");
  api.stopgap("SG-CORE-voluntary-closure-final-pay");
  const accounts = api.accounts(),
    id = `owner-closed:${core.date}:${organizationId}`;
  // Workers are paid what they've earned before the owner takes anything:
  // counted workers now (their wage flow ends today), full workers on their
  // next payday from cash held back here.
  // One final payment per residents account, however many of the firm's wage flows paid into it.
  const earned = new Map<string, number>();
  for (const row of countedWagesEarned(core, organizationId))
    earned.set(
      row.residentsId,
      (earned.get(row.residentsId) ?? 0) + row.amountMinor,
    );
  for (const [residentsId, amountMinor] of earned) {
    const row = { residentsId, amountMinor };
    const available = accounts.balance(accounts.main(organizationId));
    const amount = Math.min(row.amountMinor, Math.max(0, available));
    if (amount > 0)
      accounts.transfer({
        id: `${id}:final-pay:${row.residentsId}`,
        from: accounts.main(organizationId),
        to: accounts.main(row.residentsId),
        amountMinor: amount,
        reasonKey: "work.final-pay",
        source,
      });
  }
  // Then its suppliers: bills already owed are paid before the owner's share.
  const bills = supplierBillsOwedTo(core, organizationId);
  if (bills && bills.owedMinor > 0) {
    const amount = Math.min(
      bills.owedMinor,
      Math.max(0, accounts.balance(accounts.main(organizationId))),
    );
    if (amount > 0)
      accounts.transfer({
        id: `${id}:supplier-bills`,
        from: accounts.main(organizationId),
        to: accounts.main(bills.supplierId),
        amountMinor: amount,
        reasonKey: "business.supplier-bills",
        source,
      });
  }
  // And its lenders: an open credit line's balance is the lender's, not the owner's.
  let held = payrollHeld(core, organizationId);
  for (const facility of core.finance.facilities.values())
    if (facility.borrowerId === organizationId)
      held += facility.principalMinor + facility.interestArrearsMinor;
  const left = Math.max(
    0,
    accounts.balance(accounts.main(organizationId)) - held,
  );
  const paid =
    left > 0
      ? accounts.transfer({
          id,
          from: accounts.main(organizationId),
          to: ownerAccountId,
          amountMinor: left,
          reasonKey: "business.closing-distribution",
          source,
        }).paidMinor
      : 0;
  const cause: OwnerClosureChoice = {
    kind: "owner.choice",
    id,
    date: core.date,
    organizationId,
    ownerAccountId,
    paidOutMinor: paid,
    source: { ...source },
  };
  return windDownEmployer(
    core,
    api,
    organizationId,
    id,
    reasonKey,
    cause,
    `The owner closed the business by choice and took its remaining cash (${paid} minor units). ${source.citation}`,
  );
}

export function finishFinanceDay(core: CoreState, api: CoreAPI): void {
  const finance = core.finance,
    data = policy(api);
  if (!data) throw new Error("Finance module requires policy data.");
  for (const [id, receipt] of finance.unfundedBusinessReceipts) {
    const book = finance.businesses.get(id),
      employer = api.state.organizations.get(id);
    if (
      receipt.date === api.state.date &&
      book &&
      !book.closedAt &&
      employer?.liquidMinor === api.parameter("zero") &&
      businessAvailableCredit(api.state, api, id) === api.parameter("zero")
    )
      api.closeEmployer(id, receipt.id, data.reasons.closure);
  }
  finance.unfundedBusinessReceipts.clear();
  const books = api.state.data.businessBooks ?? DEFAULT_BUSINESS_BOOKS_DATA;
  const share = api.parameter(books.policy.repaymentShareParameter);
  if (
    !Number.isFinite(share) ||
    share < api.parameter("zero") ||
    share > api.parameter("one")
  )
    throw new Error("Business repayment policy must be a fraction.");
  const pools = new Map<string, number>();
  for (const id of [...finance.repaymentDueFacilityIds].sort()) {
    const facility = finance.facilities.get(id)!;
    const receipt = finance.latestReceiptsByContract.get(
      `finance-interest:${id}`,
    );
    const borrower = api.state.organizations.get(facility.borrowerId)!;
    if (
      receipt?.date === api.state.date &&
      receipt.unfundedMinor === api.parameter("zero")
    ) {
      const pool =
        pools.get(facility.borrowerId) ??
        Math.floor(borrower.liquidMinor * share);
      const requested = Math.min(facility.principalMinor, pool);
      if (requested > api.parameter("zero")) {
        const paid = api.repayCredit(
          id,
          requested,
          data.reasons.repayment,
          receipt.id,
        );
        pools.set(facility.borrowerId, pool - paid.transferredMinor);
      } else pools.set(facility.borrowerId, pool);
    }
  }
  finance.repaymentDueFacilityIds.clear();
}
