/**
 * A household's cost of living (owner, Oct 13, 2026: "it's just rent. That's
 * it. Or mortgage"). Money out of a household is two things: its housing
 * payment (the lease or the mortgage with its escrow, standing bills from
 * housing that fall behind and can end in eviction) and one everyday-living
 * amount a month, paid from what its members hold.
 *
 * The everyday amount starts as the household's opening purchases: the BLS
 * Consumer Expenditure Survey's spending for its region and size
 * (living-costs-data), at the town's sellers in the shares the opening gave
 * them (by each seller's recorded capacity). Each month it follows the
 * sellers' prices and the members' pay against what it was. Every household
 * purchase the opening or fill-in hands the core arrives here as one plan per
 * household, not one bill per store on a payday calendar.
 *
 * Each month, on the household's day: the members keep back what their home
 * costs this month (rent or mortgage first), and spend up to the everyday
 * amount from the rest, at the sellers still open. What they can't afford goes
 * unbought; it is never a debt. Each seller's sale goes through the sales tax
 * at the seller's place, so sales-tax laws still collect.
 */
import { transfer } from "./accounts";
import { makeIsoDate } from "./kernel/dates";
import type { FinanceContractInput } from "./finance-types";
import type { CoreAPI, CoreState, IsoDate, Source } from "./types";

export const EVERYDAY_LIVING_KIND = "household.everyday-living";

/** One household's everyday spending: its monthly amount, split among sellers. */
export interface LivingPlan {
  householdId: string;
  dueAt: IsoDate;
  billingDay: number;
  /** Monthly amount at each seller, by seller id. */
  sellers: Map<string, number>;
  monthlyMinor: number;
  source: Source;
  /** Last month's spending, for the household's month and the player's view. */
  lastAt?: IsoDate;
  lastRequestedMinor: number;
  lastPaidMinor: number;
  /** The members' daily pay when the household first spent: what spending follows. */
  baselineDailyPayMinor?: number;
}

/** A household purchase: a budget a household spends at a seller, not a debt. */
export function isEverydayPurchase(
  core: CoreState,
  input: FinanceContractInput,
): boolean {
  return (
    input.householdId !== undefined &&
    input.salesReceipt === true &&
    !input.accruesArrears &&
    !input.recipientIncome &&
    !input.creditFacilityId &&
    !input.interestFacilityId &&
    !input.salesReceiptBudget &&
    !input.externalInflow &&
    input.payerIds.every((id) => core.people.has(id))
  );
}

function index(core: CoreState, dueAt: IsoDate, id: string): void {
  const ids = core.finance.livingDueAt.get(dueAt) ?? new Set<string>();
  ids.add(id);
  core.finance.livingDueAt.set(dueAt, ids);
}

function unindex(core: CoreState, dueAt: IsoDate, id: string): void {
  const ids = core.finance.livingDueAt.get(dueAt);
  ids?.delete(id);
  if (ids && !ids.size) core.finance.livingDueAt.delete(dueAt);
}

/**
 * Set what a household's everyday-living plan pays one seller each month (zero
 * removes the seller), keeping the plan's total in step. Returns false for a
 * household that has no plan.
 */
export function setEverydayPurchase(
  core: CoreState,
  householdId: string,
  payeeId: string,
  monthlyMinor: number,
): boolean {
  const plan = core.finance.livingPlans.get(householdId);
  if (!plan) return false;
  if (!Number.isSafeInteger(monthlyMinor) || monthlyMinor < 0)
    throw new Error(`Invalid household purchase amount: ${householdId}`);
  const before = plan.sellers.get(payeeId) ?? 0;
  if (monthlyMinor === 0) plan.sellers.delete(payeeId);
  else plan.sellers.set(payeeId, monthlyMinor);
  plan.monthlyMinor += monthlyMinor - before;
  return true;
}

/** Folds one household purchase into the household's plan. */
export function admitEverydayPurchase(
  core: CoreState,
  input: FinanceContractInput,
): void {
  if (!core.cashJournal.residualAccountByOwner.has(input.payeeId))
    throw new Error(`Unknown seller account: ${input.payeeId}`);
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
    throw new Error(`Invalid household purchase amount: ${input.id}`);
  const householdId = input.householdId!;
  const monthly = Math.round(input.amountMinor / input.periodMonths);
  let plan = core.finance.livingPlans.get(householdId);
  if (!plan) {
    const day = Number(input.dueAt.slice(8));
    let dueAt: IsoDate = makeIsoDate(input.dueAt);
    while (dueAt < core.date) dueAt = nextMonth(dueAt, day);
    plan = {
      householdId,
      dueAt,
      billingDay: day,
      sellers: new Map(),
      monthlyMinor: 0,
      source: {
        tag: "ESTIMATED",
        asOf: input.source.asOf,
        citation: input.source.citation,
        estimatedFrom:
          "The household's opening purchases (BLS Consumer Expenditure Survey spending for its region and size), merged into one monthly everyday-living amount at the town's sellers, then moved each month by the sellers' price level and the members' pay.",
      },
      lastRequestedMinor: 0,
      lastPaidMinor: 0,
    };
    core.finance.livingPlans.set(householdId, plan);
    index(core, plan.dueAt, householdId);
  }
  plan.sellers.set(
    input.payeeId,
    (plan.sellers.get(input.payeeId) ?? 0) + monthly,
  );
  plan.monthlyMinor += monthly;
}

/** The household no longer lives here: its everyday spending ends. */
export function endLivingPlan(core: CoreState, householdId: string): void {
  const plan = core.finance.livingPlans.get(householdId);
  if (!plan) return;
  unindex(core, plan.dueAt, householdId);
  core.finance.livingPlans.delete(householdId);
}

/**
 * People move from one household to another in the same town: their share of
 * the household's everyday spending (by head count) follows them. A household
 * left with no members spends nothing; a household that had no plan takes the
 * source's seller mix, due on the same day.
 */
export function moveLivingShare(
  core: CoreState,
  fromId: string,
  toId: string,
  fraction: number,
): void {
  const from = core.finance.livingPlans.get(fromId);
  if (!from || !(fraction > 0)) return;
  if (fraction >= 1) {
    const whole = new Map(from.sellers);
    endLivingPlan(core, fromId);
    addLivingShare(core, toId, from, whole);
    return;
  }
  const moved = new Map<string, number>();
  for (const [seller, amount] of from.sellers) {
    const part = Math.round(amount * fraction);
    moved.set(seller, part);
    from.sellers.set(seller, amount - part);
  }
  from.monthlyMinor = [...from.sellers.values()].reduce((n, v) => n + v, 0);
  addLivingShare(core, toId, from, moved);
}

function addLivingShare(
  core: CoreState,
  toId: string,
  like: Readonly<LivingPlan>,
  sellers: ReadonlyMap<string, number>,
): void {
  let plan = core.finance.livingPlans.get(toId);
  if (!plan) {
    plan = {
      householdId: toId,
      dueAt: like.dueAt,
      billingDay: like.billingDay,
      sellers: new Map(),
      monthlyMinor: 0,
      source: like.source,
      lastRequestedMinor: 0,
      lastPaidMinor: 0,
    };
    core.finance.livingPlans.set(toId, plan);
    index(core, plan.dueAt, toId);
  }
  for (const [seller, amount] of sellers)
    plan.sellers.set(seller, (plan.sellers.get(seller) ?? 0) + amount);
  plan.monthlyMinor = [...plan.sellers.values()].reduce((n, v) => n + v, 0);
}

/** The household's plan, if it spends here. */
export function livingPlan(
  core: CoreState,
  householdId: string,
): Readonly<LivingPlan> | undefined {
  return core.finance.livingPlans.get(householdId);
}

/** The same day of the next month, or that month's last day. */
function nextMonth(at: IsoDate, day: number): IsoDate {
  const date = new Date(`${at}T00:00:00.000Z`);
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth() + 1;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return makeIsoDate(
    new Date(Date.UTC(year, month, Math.min(day, last)))
      .toISOString()
      .slice(0, 10),
  );
}

function mainBalance(core: CoreState, ownerId: string): number {
  const owner = core.people.get(ownerId);
  if (!owner) return 0;
  let allocated = 0;
  for (const id of core.cashJournal.accountsByOwner.get(ownerId) ?? [])
    allocated += core.cashJournal.accounts.get(id)?.allocatedMinor ?? 0;
  return Math.max(0, owner.liquidMinor - allocated);
}

/** The members' current daily pay, from their open jobs. */
function dailyPay(core: CoreState, memberIds: readonly string[]): number {
  let pay = 0;
  for (const id of memberIds) {
    const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
    if (job && job.endsAt === undefined) pay += job.wageDailyMinor;
  }
  return pay;
}

/** What the household's home and debts cost this month, kept back first. */
function housingThisMonth(core: CoreState, householdId: string): number {
  let owed = 0;
  for (const id of core.finance.obligationsByHousehold.get(householdId) ?? []) {
    const row = core.finance.contracts.get(id);
    if (!row || row.endedAt) continue;
    owed += row.amountMinor / row.periodMonths + row.arrearsMinor;
  }
  return Math.ceil(owed);
}

function settle(
  api: CoreAPI,
  plan: LivingPlan,
  notify: (sale: {
    id: string;
    sellerId: string;
    buyerIds: string[];
    paidMinor: number;
  }) => void,
): void {
  const core = api.state,
    date = core.date;
  const members = (core.households.get(plan.householdId)?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .filter(
      (person) =>
        person?.alive && core.cashJournal.residualAccountByOwner.has(person.id),
    );
  if (!members.length) return endLivingPlan(core, plan.householdId);
  const held = members.reduce(
    (n, person) => n + mainBalance(core, person!.id),
    0,
  );
  // Sellers still open take the closed ones' shares, in proportion.
  const open = [...plan.sellers]
    .filter(([id]) => {
      const book = core.finance.businesses.get(id);
      return core.organizations.has(id) && !book?.closedAt;
    })
    .sort((a, b) => a[0].localeCompare(b[0]));
  const weight = open.reduce((n, [, amount]) => n + amount, 0);
  // The month's amount follows what the household's sellers charge now against
  // their opening prices, and its members' pay against what it was. With no
  // pay now (or none to begin with) it is limited by what the members hold.
  let priceFactor = 1;
  if (weight > 0) {
    priceFactor = 0;
    for (const [id, amount] of open) {
      const book = core.finance.businesses.get(id);
      priceFactor +=
        (amount / weight) *
        (book && book.anchorPrice > 0 ? book.price / book.anchorPrice : 1);
    }
  }
  const pay = dailyPay(
    core,
    members.map((person) => person!.id),
  );
  plan.baselineDailyPayMinor ??= pay;
  const payFactor =
    plan.baselineDailyPayMinor > 0 && pay > 0
      ? pay / plan.baselineDailyPayMinor
      : 1;
  const requestedMinor = Math.round(
    plan.monthlyMinor * priceFactor * payFactor,
  );
  const budget = Math.max(
    0,
    Math.min(requestedMinor, held - housingThisMonth(core, plan.householdId)),
  );
  let paidTotal = 0,
    left = budget,
    payer = 0;
  for (const [index, [sellerId, amount]] of open.entries()) {
    if (left <= 0 || weight <= 0) break;
    let share =
      index === open.length - 1 ? left : Math.floor((budget * amount) / weight);
    share = Math.min(share, left);
    let paid = 0,
      leg = 0;
    while (share - paid > 0 && payer < members.length) {
      const from = members[payer]!;
      const receipt = transfer(core, api, {
        id: `living:${plan.householdId}:${date}:${sellerId}:${leg}`,
        from: core.cashJournal.residualAccountByOwner.get(from.id)!,
        to: core.cashJournal.residualAccountByOwner.get(sellerId)!,
        amountMinor: share - paid,
        reasonKey: EVERYDAY_LIVING_KIND,
        source: plan.source,
        partial: true,
      });
      paid += receipt.paidMinor;
      leg += 1;
      if (paid < share) payer += 1;
    }
    left -= paid;
    paidTotal += paid;
    if (paid <= 0) continue;
    const book = core.finance.businesses.get(sellerId);
    if (book) {
      book.receivedMinor += paid;
      book.salesReceivedMinor += paid;
    }
    notify({
      id: `living:${plan.householdId}:${date}:${sellerId}`,
      sellerId,
      buyerIds: members.map((person) => person!.id),
      paidMinor: paid,
    });
  }
  plan.lastAt = date;
  plan.lastRequestedMinor = requestedMinor;
  plan.lastPaidMinor = paidTotal;
  const totals = core.finance.totalsByKind.get(EVERYDAY_LIVING_KIND) ?? {
    requestedMinor: 0,
    paidMinor: 0,
    unfundedMinor: 0,
    borrowedMinor: 0,
    repaidMinor: 0,
  };
  core.finance.totalsByKind.set(EVERYDAY_LIVING_KIND, {
    ...totals,
    requestedMinor: totals.requestedMinor + requestedMinor,
    paidMinor: totals.paidMinor + paidTotal,
    unfundedMinor: totals.unfundedMinor + (requestedMinor - paidTotal),
  });
}

/** Today's everyday spending for every household whose day it is. */
export function settleLivingDay(
  api: CoreAPI,
  notify: (sale: {
    id: string;
    sellerId: string;
    buyerIds: string[];
    paidMinor: number;
  }) => void,
): void {
  const core = api.state;
  const due = [...core.finance.livingDueAt.keys()]
    .filter((at) => at <= core.date)
    .sort();
  const ids: string[] = [];
  for (const at of due) {
    ids.push(...[...core.finance.livingDueAt.get(at)!].sort());
    core.finance.livingDueAt.delete(at);
  }
  for (const id of ids) {
    const plan = core.finance.livingPlans.get(id);
    if (!plan) continue;
    settle(api, plan, notify);
    if (!core.finance.livingPlans.has(id)) continue;
    plan.dueAt = nextMonth(plan.dueAt, plan.billingDay);
    index(core, plan.dueAt, id);
  }
}
