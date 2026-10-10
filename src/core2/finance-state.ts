import { validateHouseholdPurchaseCalendarAdmission } from "./household-purchase-calendar";
/** Conserving finance writers. Estimates never credit the authoritative cash ledger. */
import { makeIsoDate } from "../simulation/dates";
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
  FinanceConditionInput,
  FinanceReceipt,
  FinanceRuntime,
  FinanceInput,
  SalesReceiptBudgetPool,
  SalesReceiptPendingBudget,
} from "./finance-types";
import type { CoreAPI, CoreState, Source } from "./types";

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
    Number(fact.facts.monthlyMinor) !== row.amountMinor ||
    (fact.facts.kindId && fact.facts.kindId !== term.kindId) ||
    (fact.facts.householdId && fact.facts.householdId !== term.householdId)
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
  const householdPurchaseCalendar = validateHouseholdPurchaseCalendarAdmission(
    input,
    core.date,
  );
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
    ...(householdPurchaseCalendar
      ? {
          householdPurchaseCalendar,
          nominalDueAt: householdPurchaseCalendar.firstNominalDueAt,
          householdPurchaseCalendarBasis: {
            nominalDueAt: householdPurchaseCalendar.firstNominalDueAt,
            effectiveDueAt: dueAt,
            mode: "opening" as const,
            references: householdPurchaseCalendar.openingBasisIds.map((id) => ({
              id,
              kind: "opening-basis" as const,
              source: { ...householdPurchaseCalendar.source },
            })),
            source: { ...householdPurchaseCalendar.source },
          },
        }
      : {}),
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
  const income =
    paid === undefined
      ? book.openingTownIncomeMinor
      : paid * p("monthsPerYear");
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
      relativePriceToAnchor: book.price / book.anchorPrice,
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
  const price = projectBusinessPrice(
    {
      priorPrice: book.price,
      annualPlannedPayMinor: book.annualPayrollMinor,
      annualOtherCostsMinor: cost.annualOtherCostsMinor,
      wagePriceFactor: wagePrice / book.lastWagePriceFactor,
      generalPriceFactor: generalPrice / book.lastGeneralPriceFactor,
      annualDemandMinor: demand,
      capacityMinor: book.capacityMinor,
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
  financeIndex(core.finance.reviewsDueAt, next, id);
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
  const retiredProcurementPayers = new Set<string>();
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
  if (!cause)
    throw new Error(
      "Closure requires an actual current unfunded obligation receipt.",
    );
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
  const closure: EmployerClosure = {
    organizationId,
    date: core.date,
    reasonKey,
    sourceReceiptId,
    cause,
    endedJobIds,
    affectedPersonIds,
    source: actualSource(
      api,
      "Actual prototype closure after a recorded obligation could not be funded by existing cash or recorded finite credit; closure policy remains an open model assumption.",
    ),
  };
  book.closedAt = core.date;
  book.closingReasonKey = reasonKey;
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
    if (row.interestFacilityId) continue;
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
