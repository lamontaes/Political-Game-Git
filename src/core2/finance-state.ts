/** Conserving finance writers. Estimates never credit the authoritative cash ledger. */
import { daysBetween, makeIsoDate } from "../simulation/dates";
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
  FinanceTotals,
} from "./finance-types";
import type { CoreAPI, CoreState, Source, WorkResult } from "./types";

export function emptyFinanceRuntime(at: string): FinanceRuntime {
  return {
    creditRequestsAt: at,
    creditRequestIds: new Set(),
    contracts: new Map(),
    contractsDueAt: new Map(),
    contractsByBusiness: new Map(),
    facilities: new Map(),
    facilitiesByBorrower: new Map(),
    businesses: new Map(),
    businessesByPlace: new Map(),
    reviewsDueAt: new Map(),
    paidIncomeByPlaceMonth: new Map(),
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
  for (const id of data.stopgapIds) api.stopgap(id);
  return data;
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

/** Complete batch admission precedes every cash change, even with a shared lender. */
class CashBatch {
  private readonly rows = new Map<
    string,
    { row: { liquidMinor: number }; before: number; after: number }
  >();
  constructor(
    private readonly core: CoreState,
    private readonly api: CoreAPI,
  ) {}
  cash(id: string): number {
    let entry = this.rows.get(id);
    if (!entry) {
      const row = account(this.core, this.api, id);
      entry = { row, before: row.liquidMinor, after: row.liquidMinor };
      this.rows.set(id, entry);
    }
    return entry.after;
  }
  move(payerId: string, payeeId: string, requested: number): number {
    minor(this.api, requested, "requested transfer");
    if (payerId === payeeId)
      throw new Error("Finance requires distinct payment endpoints.");
    const paid = Math.min(requested, this.cash(payerId)),
      receiving = this.cash(payeeId) + paid;
    minor(this.api, receiving, "receiving balance");
    this.rows.get(payerId)!.after -= paid;
    this.rows.get(payeeId)!.after = receiving;
    return paid;
  }
  commit(): void {
    for (const entry of this.rows.values())
      if (entry.row.liquidMinor !== entry.before)
        throw new Error("Finance cash changed after batch admission.");
    for (const entry of this.rows.values()) entry.row.liquidMinor = entry.after;
  }
}

function emptyTotals(api: CoreAPI): FinanceTotals {
  const zero = api.parameter("zero");
  return {
    requestedMinor: zero,
    paidMinor: zero,
    unfundedMinor: zero,
    borrowedMinor: zero,
    repaidMinor: zero,
  };
}

function totalsAfter(
  api: CoreAPI,
  kind: string,
  changes: Partial<FinanceTotals>,
  stagedPrevious?: FinanceTotals,
): FinanceTotals {
  const previous =
    stagedPrevious ??
    api.state.finance.totalsByKind.get(kind) ??
    emptyTotals(api);
  const result = { ...previous };
  for (const key of Object.keys(changes) as (keyof FinanceTotals)[]) {
    result[key] += changes[key]!;
    minor(api, result[key], `total:${kind}:${key}`);
  }
  return result;
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

export function admitFinanceContract(
  core: CoreState,
  api: CoreAPI,
  input: FinanceContractInput,
): void {
  policy(api);
  if (!input.id || !input.kind || core.finance.contracts.has(input.id))
    throw new Error("Finance contract identity must be unique and typed.");
  if (typeof input.accruesArrears !== "boolean")
    throw new Error(
      "Finance terms must distinguish budgets from accrued obligations.",
    );
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
  const row = {
    ...input,
    payerIds: [...input.payerIds],
    source: { ...input.source },
    dueAt,
    billingDay,
    arrearsMinor: api.parameter("zero"),
  };
  core.finance.contracts.set(row.id, row);
  financeIndex(core.finance.contractsDueAt, dueAt, row.id);
  for (const id of [...row.payerIds, row.payeeId])
    if (core.organizations.has(id))
      financeIndex(core.finance.contractsByBusiness, id, row.id);
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
function accruedInterest(core: CoreState, api: CoreAPI, id: string): number {
  const row = admittedFacility(core, api, id),
    data = policy(api);
  const elapsed = daysBetween(
    makeIsoDate(row.lastAccruedAt),
    makeIsoDate(core.date),
  );
  const rate = api.parameter(row.annualInterestParameter);
  const days = api.parameter(
    row.interestDayCountParameter ?? data.interestDayCountParameter,
  );
  amount(api, elapsed, "elapsed interest days");
  amount(api, rate, "annual interest rate");
  amount(api, row.unbilledInterestMinor, "already accrued interest");
  if (!Number.isFinite(days) || days <= api.parameter("zero"))
    throw new Error("Invalid interest day count.");
  const accrued =
    row.unbilledInterestMinor + (row.principalMinor * elapsed * rate) / days;
  amount(api, accrued, "accrued interest");
  return accrued;
}

function stageCredit(
  core: CoreState,
  api: CoreAPI,
  cash: CashBatch,
  facilityId: string,
  requested: number,
  reasonKey: string,
  sourceId: string,
  repayment = false,
  stagedTotals?: FinanceTotals,
) {
  const row = admittedFacility(core, api, facilityId),
    zero = api.parameter("zero");
  const accrued = accruedInterest(core, api, facilityId);
  minor(api, requested, "credit request");
  if (!reasonKey || !sourceId)
    throw new Error("Credit requires a reason and dated request identity.");
  const id = `credit:${core.date}:${facilityId}:${repayment ? "repay" : "draw"}:${sourceId}`;
  if (
    core.finance.creditRequestsAt === core.date &&
    core.finance.creditRequestIds.has(id)
  )
    throw new Error("Duplicate credit request.");
  const borrowerBeforeMinor = cash.cash(row.borrowerId),
    lenderBeforeMinor = cash.cash(row.lenderId);
  const bounded = repayment
    ? Math.min(requested, row.principalMinor)
    : row.active
      ? Math.min(requested, Math.max(zero, row.limitMinor - row.principalMinor))
      : zero;
  const transferredMinor = repayment
    ? cash.move(row.borrowerId, row.lenderId, bounded)
    : cash.move(row.lenderId, row.borrowerId, bounded);
  const principalAfterMinor =
    row.principalMinor + (repayment ? -transferredMinor : transferredMinor);
  minor(api, principalAfterMinor, "principal after transfer");
  const receipt: CreditReceipt = {
    id,
    facilityId,
    date: core.date,
    reasonKey,
    requestedMinor: requested,
    transferredMinor,
    principalBeforeMinor: row.principalMinor,
    principalAfterMinor,
    borrowerBeforeMinor,
    borrowerAfterMinor: cash.cash(row.borrowerId),
    lenderBeforeMinor,
    lenderAfterMinor: cash.cash(row.lenderId),
    source: actualSource(
      api,
      "Actual conserving prototype loan transfer under separately sourced standing facility terms; no inferred approval or new cash.",
    ),
  };
  const totals = totalsAfter(
    api,
    "credit",
    repayment
      ? { repaidMinor: transferredMinor }
      : { borrowedMinor: transferredMinor },
    stagedTotals,
  );
  return {
    receipt,
    totals,
    commit() {
      row.unbilledInterestMinor = accrued;
      row.lastAccruedAt = core.date;
      row.principalMinor = principalAfterMinor;
      if (core.finance.creditRequestsAt !== core.date) {
        core.finance.creditRequestsAt = core.date;
        core.finance.creditRequestIds.clear();
      }
      core.finance.creditRequestIds.add(id);
      core.finance.latestCreditByFacility.set(facilityId, receipt);
      core.finance.totalsByKind.set("credit", totals);
    },
  };
}

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
  const cash = new CashBatch(core, api),
    staged = stageCredit(
      core,
      api,
      cash,
      facilityId,
      requested,
      reasonKey,
      sourceId,
      repayment,
    );
  cash.commit();
  staged.commit();
  return staged.receipt;
}

export function settleFinanceContract(
  core: CoreState,
  api: CoreAPI,
  id: string,
): FinanceReceipt {
  const data = policy(api),
    row = core.finance.contracts.get(id),
    p = api.parameter;
  if (
    !row ||
    row.endedAt ||
    row.dueAt > core.date ||
    row.lastSettledAt === core.date
  )
    throw new Error(
      "Finance contract is absent, retired, not due or already settled.",
    );
  currentSource(row.source, core.date);
  const next = financeNextDate(
    api,
    row.dueAt,
    row.periodMonths,
    row.billingDay,
  );
  if (next <= core.date)
    throw new Error(
      "Finance bills must settle chronologically, without skipped periods.",
    );
  const cash = new CashBatch(core, api),
    before = cash.cash(row.payeeId);
  for (const payer of row.payerIds) cash.cash(payer);
  let base = row.amountMinor,
    interestRemainder: number | undefined;
  const payerBook = core.finance.businesses.get(row.payerIds[p("zero")]!);
  const operating = payerBook?.costContractIds.includes(id) ?? false;
  const interest = row.interestFacilityId
    ? admittedFacility(core, api, row.interestFacilityId)
    : undefined;
  if (interest) {
    const exact =
      accruedInterest(core, api, interest.id) + interest.interestRemainderMinor;
    amount(api, exact, "interest terms");
    base = Math.floor(exact);
    interestRemainder = exact - base;
  } else if (row.marketAdjusted) {
    const book = core.finance.businesses.get(row.payeeId);
    if (book && book.anchorAnnualDemandMinor > p("zero"))
      base = Math.floor(
        (base * book.annualDemandMinor) / book.anchorAnnualDemandMinor,
      );
  } else if (operating) {
    const book = core.finance.businesses.get(row.payerIds[p("zero")]!);
    if (book && book.anchorAnnualOtherCostsMinor > p("zero"))
      base = Math.floor(
        (base * book.annualOtherCostsMinor) / book.anchorAnnualOtherCostsMinor,
      );
  }
  minor(api, base, "current due amount");
  minor(api, row.arrearsMinor, "prior arrears");
  const requested = base + (row.accruesArrears ? row.arrearsMinor : p("zero"));
  minor(api, requested, "due including arrears");
  const receiptId = `finance:${core.date}:${row.id}`;
  let credit: ReturnType<typeof stageCredit> | undefined;
  if (!interest && row.creditFacilityId) {
    const payer = row.payerIds[p("zero")]!;
    const deficiency = Math.max(p("zero"), requested - cash.cash(payer));
    if (deficiency > p("zero"))
      credit = stageCredit(
        core,
        api,
        cash,
        row.creditFacilityId,
        deficiency,
        data.reasons.borrowing,
        receiptId,
      );
  }
  let remaining = requested;
  const payments = row.payerIds.map((payerId) => {
    const payerBeforeMinor = cash.cash(payerId),
      requestedMinor = remaining;
    const paidMinor = cash.move(payerId, row.payeeId, remaining);
    remaining -= paidMinor;
    return {
      payerId,
      requestedMinor,
      paidMinor,
      payerBeforeMinor,
      payerAfterMinor: cash.cash(payerId),
    };
  });
  const paid = requested - remaining,
    arrears = row.accruesArrears ? remaining : p("zero");
  const totals = totalsAfter(api, row.kind, {
    requestedMinor: requested,
    paidMinor: paid,
    unfundedMinor: remaining,
  });
  const payeeBook = core.finance.businesses.get(row.payeeId);
  if (payeeBook) minor(api, payeeBook.receivedMinor + paid, "firm receipts");
  if (payerBook && operating)
    minor(api, payerBook.operatingPaidMinor + paid, "firm operating payments");
  const receipt: FinanceReceipt = {
    id: receiptId,
    contractId: id,
    date: core.date,
    kind: row.kind,
    payeeId: row.payeeId,
    requestedMinor: requested,
    paidMinor: paid,
    unfundedMinor: remaining,
    arrearsMinor: arrears,
    payments,
    payeeBeforeMinor: before,
    payeeAfterMinor: cash.cash(row.payeeId),
    creditReceiptId: credit?.receipt.id,
    source: actualSource(
      api,
      "Actual funded prototype standing-contract settlement; unpaid purchase budgets do not become debts. Separate terms retain their estimate/source provenance.",
    ),
  };
  cash.commit();
  credit?.commit();
  row.arrearsMinor = arrears;
  row.lastSettledAt = core.date;
  if (arrears > p("zero")) row.firstUnpaidAt ??= core.date;
  else delete row.firstUnpaidAt;
  removeIndex(core.finance.contractsDueAt, row.dueAt, row.id);
  row.dueAt = next;
  financeIndex(core.finance.contractsDueAt, next, row.id);
  if (interest) {
    interest.interestArrearsMinor = arrears;
    interest.interestRemainderMinor = interestRemainder!;
    interest.unbilledInterestMinor = p("zero");
    interest.lastAccruedAt = core.date;
    interest.lastInterestAt = core.date;
    core.finance.repaymentDueFacilityIds.add(interest.id);
  }
  if (payeeBook) payeeBook.receivedMinor += paid;
  if (payerBook && operating) payerBook.operatingPaidMinor += paid;
  core.finance.totalsByKind.set(row.kind, totals);
  core.finance.latestReceiptsByContract.set(id, receipt);
  if (row.accruesArrears && remaining > p("zero"))
    for (const payerId of row.payerIds)
      if (core.finance.businesses.has(payerId))
        core.finance.unfundedBusinessReceipts.set(payerId, {
          date: core.date,
          id: receipt.id,
        });
  if (
    core.observer ||
    row.payerIds.some(
      (payer) => core.focusPersonIds.has(payer) || core.playerId === payer,
    ) ||
    core.focusPersonIds.has(row.payeeId) ||
    core.playerId === row.payeeId
  )
    core.finance.detailedReceipts.set(receipt.id, receipt);
  return receipt;
}

/** Coupled wage admission is read-only until the original work writer commits. */
export function prepareWorkFinance(
  core: CoreState,
  api: CoreAPI,
  organizationId: string,
  personId: string,
  requested: number,
  receiptId: string,
) {
  const book = core.finance.businesses.get(organizationId),
    data = core.data.finance,
    p = api.parameter;
  const cash = new CashBatch(core, api);
  const credits: ReturnType<typeof stageCredit>[] = [];
  let deficiency = Math.max(p("zero"), requested - cash.cash(organizationId));
  let creditTotals = core.finance.totalsByKind.get("credit");
  const facilityIds = [
    ...(core.finance.facilitiesByBorrower.get(organizationId) ?? []),
  ].sort((a, b) => {
    const rank = (id: string) =>
      id === book?.creditFacilityId ? p("zero") : p("one");
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  if (!book?.closedAt && deficiency > p("zero"))
    for (const id of facilityIds) {
      if (deficiency <= p("zero")) break;
      if (!data)
        throw new Error("Recorded employer credit requires finance policy.");
      const credit = stageCredit(
        core,
        api,
        cash,
        id,
        deficiency,
        data.reasons.borrowing,
        receiptId,
        false,
        creditTotals,
      );
      deficiency -= credit.receipt.transferredMinor;
      creditTotals = credit.totals;
      credits.push(credit);
    }
  const available = cash.cash(organizationId),
    expectedPaid = Math.min(requested, available);
  // Validate the wage endpoint without committing it in this batch; work remains its sole payer.
  minor(api, cash.cash(personId) + expectedPaid, "worker receiving balance");
  const bookTotals = book
    ? {
        requested: book.wagesRequestedMinor + requested,
        paid: book.wagesPaidMinor + expectedPaid,
        unpaid: book.wagesUnpaidMinor + requested - expectedPaid,
      }
    : undefined;
  if (bookTotals)
    for (const [key, value] of Object.entries(bookTotals))
      minor(api, value, `business wages:${key}`);
  const placeId = core.organizations.get(organizationId)!.placeId;
  const month = core.date.slice(p("zero"), p("isoMonthCharacters")),
    incomeKey = `${month}:${placeId}`;
  const income =
    (core.finance.paidIncomeByPlaceMonth.get(incomeKey) ?? p("zero")) +
    expectedPaid;
  minor(api, income, "actual place paid income");
  return {
    availableCashMinor: available,
    expectedPaidMinor: expectedPaid,
    commitFunding() {
      cash.commit();
      for (const credit of credits) credit.commit();
    },
    record(receipt: WorkResult) {
      if (receipt.id !== receiptId || receipt.paidMinor !== expectedPaid)
        throw new Error("Work finance receipt differs from admitted payment.");
      if (book && bookTotals) {
        book.wagesRequestedMinor = bookTotals.requested;
        book.wagesPaidMinor = bookTotals.paid;
        book.wagesUnpaidMinor = bookTotals.unpaid;
      }
      if (book && receipt.shortfallMinor > p("zero"))
        core.finance.unfundedBusinessReceipts.set(organizationId, {
          date: core.date,
          id: receipt.id,
        });
      core.finance.paidIncomeByPlaceMonth.set(incomeKey, income);
    },
  };
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
        "Actual previous-month recorded wage receipts and currently dated world-level economic inputs; missing month uses the separately estimated opening payroll anchor. No projected revenue becomes cash.",
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
