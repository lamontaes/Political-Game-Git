/**
 * The wider population's money on recorded dates: count workers' wages,
 * retirement income from outside, and household purchases at local firms.
 * Each occurrence is one balanced journal entry; nothing scans the world.
 */
import { addDays, ageOnDate, makeIsoDate } from "../../simulation/dates";
import {
  advanceCadence,
  RESIDENTS_STOPGAP,
  type ResidentFlowInput,
  type ResidentHouseholdRecord,
  type ResidentsInput,
} from "../residents";
import { transfer } from "../accounts";
import type { ResidentWageShortfall } from "../finance-types";
import type { WorkPayrollCalendarInput } from "../work-pay-period";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  JobInput,
  PersonInput,
  PersonId,
  PlaceId,
} from "../types";

export const RESIDENTS_MODULE_ID = "core2-residents-v1";
// Outside buyers pay first, so a day's receipts can meet that day's payroll.
const ORDER = {
  "outside-sales": 0,
  wages: 1,
  retirement: 2,
  purchase: 3,
  // Suppliers are paid after workers, from what is left.
  "outside-costs": 4,
} as const;

interface FlowState extends ResidentFlowInput {
  nextAt: IsoDate;
  arrearsMinor: number;
  /** outside-costs: the firm's receipts and local purchases already counted. */
  receivedMinor?: number;
  /** Local operating payments when the flow started (a baseline). */
  localPaidMinor?: number;
  accruedCostMinor?: number;
  accrualHistory?: { date: IsoDate; accrued: number }[];
  outsidePaidMinor?: number;
  endedAt?: IsoDate;
  endedReason?: string;
}

export interface ResidentsRuntime {
  input: ResidentsInput;
  flows: Map<string, FlowState>;
  due: Map<IsoDate, Set<string>>;
  households: Map<string, ResidentHouseholdRecord>;
  householdOfPerson: Map<PersonId, string>;
  jobs: Map<string, JobInput>;
  /** Opening cash of everyone still counted, by place (fill-in takes its share). */
  openingCashByPlace: Map<PlaceId, number>;
  /** Households filled in from the counts. */
  filledIn: Map<string, ResidentHouseholdRecord>;
  wageFlowByJob: Map<string, FlowState>;
  /** Today's missed count-worker paydays, the evidence a closure cites. */
  shortfalls: Map<string, ResidentWageShortfall>;
}

const runtimes = new WeakMap<CoreState, ResidentsRuntime>();

export function residentsRuntime(
  core: CoreState,
): ResidentsRuntime | undefined {
  return runtimes.get(core);
}

function schedule(rt: ResidentsRuntime, flow: FlowState): void {
  const ids = rt.due.get(flow.nextAt) ?? new Set<string>();
  ids.add(flow.id);
  rt.due.set(flow.nextAt, ids);
}

export function admitResidents(core: CoreState, input: ResidentsInput): void {
  if (runtimes.has(core)) throw new Error("Residents already admitted.");
  if (input.version !== "core2-residents-v1")
    throw new Error("Unsupported residents input version.");
  for (const row of input.accounts) {
    const account = core.organizations.get(row.accountId);
    if (!account || account.kind !== "residents")
      throw new Error(`Residents account is not recorded: ${row.accountId}`);
  }
  const rt: ResidentsRuntime = {
    input,
    flows: new Map(),
    due: new Map(),
    households: new Map(),
    householdOfPerson: new Map(),
    shortfalls: new Map(),
    jobs: new Map(),
    filledIn: new Map(),
    openingCashByPlace: new Map(),
    wageFlowByJob: new Map(),
  };
  for (const record of input.households) {
    rt.households.set(record.household.id, record);
    for (const person of record.people)
      rt.householdOfPerson.set(person.id, record.household.id);
    for (const job of record.jobs) rt.jobs.set(job.id, job);
    const placeId = record.household.placeId;
    rt.openingCashByPlace.set(
      placeId,
      (rt.openingCashByPlace.get(placeId) ?? 0) +
        record.people.reduce((n, row) => n + row.liquidMinor, 0),
    );
  }
  for (const row of input.flows) {
    if (rt.flows.has(row.id)) throw new Error(`Duplicate flow: ${row.id}`);
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor < 0)
      throw new Error(`Invalid flow amount: ${row.id}`);
    for (const id of [row.payerId, row.payeeId])
      if (!core.organizations.has(id) && !core.people.has(id))
        throw new Error(`Flow owner is not recorded: ${id}`);
    // A flow due on or before the opening date settles on the first simulated day.
    let nextAt = makeIsoDate(row.firstAt);
    if (nextAt <= core.date)
      nextAt = makeIsoDate(addDays(makeIsoDate(core.date), 1));
    const flow: FlowState = { ...row, nextAt, arrearsMinor: 0 };
    rt.flows.set(row.id, flow);
    for (const jobId of row.jobIds ?? []) rt.wageFlowByJob.set(jobId, flow);
    schedule(rt, flow);
  }
  runtimes.set(core, rt);
}

/** Cash an owner can spend now: its cash less amounts set aside in other funds. */
function spendable(core: CoreState, ownerId: string): number {
  const owner = core.people.get(ownerId) ?? core.organizations.get(ownerId)!;
  let allocated = 0;
  for (const id of core.cashJournal.accountsByOwner.get(ownerId) ?? [])
    allocated += core.cashJournal.accounts.get(id)?.allocatedMinor ?? 0;
  return Math.max(0, owner.liquidMinor - allocated);
}

function end(flow: FlowState, date: IsoDate, reason: string): void {
  flow.endedAt = date;
  flow.endedReason = reason;
}

function settle(api: CoreAPI, rt: ResidentsRuntime, flow: FlowState): void {
  const core = api.state,
    date = core.date,
    finance = core.finance;
  if (flow.endsAt && date >= flow.endsAt) return end(flow, date, "ended");
  const payerBook = finance.businesses.get(flow.payerId),
    payeeBook = finance.businesses.get(flow.payeeId);
  if (payerBook?.closedAt) return end(flow, date, "payer-closed");
  if (payeeBook?.closedAt) return end(flow, date, "payee-closed");
  let base = flow.amountMinor;
  if (flow.kind === "outside-costs" && payerBook) {
    // Supplies follow sales: the firm accrues its booked cost share of what it
    // takes in; whatever it hasn't bought from local suppliers (running totals,
    // so lumpy local orders aren't lost) is bought outside.
    const received = payerBook.receivedMinor - (flow.receivedMinor ?? 0),
      share =
        payerBook.annualDemandMinor > 0
          ? payerBook.annualOtherCostsMinor / payerBook.annualDemandMinor
          : 0;
    flow.receivedMinor = payerBook.receivedMinor;
    flow.localPaidMinor ??= payerBook.operatingPaidMinor;
    flow.accruedCostMinor = (flow.accruedCostMinor ?? 0) + received * share;
    // Net-30 trade terms: this week's bill covers costs accrued a month ago,
    // after the local orders for that month are known.
    const history = [
      ...(flow.accrualHistory ?? []),
      { date: core.date, accrued: flow.accruedCostMinor },
    ];
    const termsStart = makeIsoDate(
      addDays(makeIsoDate(date), -api.parameter("supplierTradeTermsDays")),
    );
    while (history.length > 1 && history[1]!.date <= termsStart)
      history.shift();
    flow.accrualHistory = history;
    const billable = history[0]!.date <= termsStart ? history[0]!.accrued : 0;
    base = Math.max(
      0,
      Math.round(
        billable -
          (payerBook.operatingPaidMinor - flow.localPaidMinor) -
          (flow.outsidePaidMinor ?? 0),
      ),
    );
  }
  if (flow.marketAdjusted && payeeBook && payeeBook.anchorAnnualDemandMinor > 0)
    base = Math.floor(
      (base * payeeBook.annualDemandMinor) / payeeBook.anchorAnnualDemandMinor,
    );
  const requested = base + (flow.kind === "wages" ? flow.arrearsMinor : 0);
  const payer = core.organizations.get(flow.payerId);
  const outside = payer?.outsideFlow !== undefined;
  const paid = outside
    ? requested
    : Math.min(requested, spendable(core, flow.payerId));
  if (paid > 0) post(api, rt, flow, paid);
  if (flow.kind === "outside-costs")
    flow.outsidePaidMinor = (flow.outsidePaidMinor ?? 0) + paid;
  const month = date.slice(0, 7);
  if ((flow.kind === "wages" || flow.kind === "retirement") && paid > 0) {
    const key = `${month}:${flow.placeId}`,
      kindKey = `${key}:${flow.financeKind}`;
    finance.paidIncomeByPlaceMonth.set(
      key,
      (finance.paidIncomeByPlaceMonth.get(key) ?? 0) + paid,
    );
    finance.paidIncomeByPlaceMonthKind.set(
      kindKey,
      (finance.paidIncomeByPlaceMonthKind.get(kindKey) ?? 0) + paid,
    );
  }
  if (flow.kind === "wages" && payerBook) {
    const owed = requested - paid;
    payerBook.wagesRequestedMinor += base;
    payerBook.wagesPaidMinor += paid;
    payerBook.wagesUnpaidMinor += owed - flow.arrearsMinor;
    flow.arrearsMinor = owed;
    if (owed > 0) {
      const id = `${flow.id}@${date}`;
      rt.shortfalls.set(id, {
        kind: "residents.wages",
        id,
        date,
        organizationId: flow.payerId,
        requestedMinor: requested,
        paidMinor: paid,
        shortfallMinor: owed,
        workerCount: flow.jobIds?.length ?? 0,
        source: flow.source,
      });
      finance.unfundedBusinessReceipts.set(flow.payerId, { date, id });
    }
  }
  if (
    (flow.kind === "purchase" || flow.kind === "outside-sales") &&
    payeeBook &&
    paid > 0
  ) {
    payeeBook.receivedMinor += paid;
    if (flow.salesReceipt) payeeBook.salesReceivedMinor += paid;
  }
  const totals = finance.totalsByKind.get(flow.financeKind) ?? {
    requestedMinor: 0,
    paidMinor: 0,
    unfundedMinor: 0,
    borrowedMinor: 0,
    repaidMinor: 0,
  };
  finance.totalsByKind.set(flow.financeKind, {
    ...totals,
    requestedMinor: totals.requestedMinor + requested,
    paidMinor: totals.paidMinor + paid,
    unfundedMinor: totals.unfundedMinor + (requested - paid),
  });
}

function post(
  api: CoreAPI,
  _rt: ResidentsRuntime,
  flow: FlowState,
  paid: number,
): void {
  const core = api.state;
  transfer(core, api, {
    id: `${flow.id}@${core.date}`,
    from: core.cashJournal.residualAccountByOwner.get(flow.payerId)!,
    to: core.cashJournal.residualAccountByOwner.get(flow.payeeId)!,
    amountMinor: paid,
    reasonKey: flow.financeKind,
    source: flow.source,
  });
}

function runResidentsDay(api: CoreAPI): void {
  const core = api.state,
    rt = runtimes.get(core);
  if (!rt) return;
  const ids = rt.due.get(core.date);
  if (!ids) return;
  rt.due.delete(core.date);
  rt.shortfalls.clear();
  api.stopgap(RESIDENTS_STOPGAP);
  const flows = [...ids]
    .map((id) => rt.flows.get(id)!)
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.id.localeCompare(b.id));
  for (const flow of flows) {
    if (flow.endedAt) continue;
    settle(api, rt, flow);
    if (flow.endedAt) continue;
    flow.nextAt = advanceCadence(flow.nextAt, flow.cadence);
    schedule(rt, flow);
  }
}

/** A job held by someone in the wider population, while its employer still pays it. */
export function countedJob(
  core: CoreState,
  jobId: string,
): JobInput | undefined {
  const rt = runtimes.get(core);
  const job = rt?.jobs.get(jobId);
  if (!rt || !job) return undefined;
  const flow = rt.wageFlowByJob.get(jobId);
  return flow && !flow.endedAt ? job : undefined;
}

/** The generated record of someone still in the wider population. */
export function residentPerson(
  core: CoreState,
  personId: PersonId,
): PersonInput | undefined {
  const rt = runtimes.get(core);
  const id = rt?.householdOfPerson.get(personId);
  return id
    ? rt!.households.get(id)!.people.find((row) => row.id === personId)
    : undefined;
}

/**
 * What a filled-in household takes back from the merged flows: its workers'
 * share of each wage flow and its own purchase contracts. Returns the
 * employer calendars its jobs were paid on and its share of the residents'
 * cash (by opening cash, of everyone still counted in that place).
 */
export function releaseResidentHousehold(
  core: CoreState,
  record: ResidentHouseholdRecord,
): {
  calendars: Map<string, WorkPayrollCalendarInput>;
  cashShare: number;
  accountId?: string;
} {
  const rt = runtimes.get(core)!;
  const jobIds = new Set(record.jobs.map((row) => row.id)),
    contractIds = new Set(record.contracts.map((row) => row.id));
  for (const flow of rt.flows.values()) {
    if (flow.kind === "wages" && flow.perDayMinorByJob) {
      const perDay = { ...flow.perDayMinorByJob };
      let changed = false;
      for (const id of jobIds)
        if (perDay[id] !== undefined) {
          delete perDay[id];
          changed = true;
        }
      if (!changed) continue;
      flow.perDayMinorByJob = perDay;
      flow.jobIds = (flow.jobIds ?? []).filter((id) => !jobIds.has(id));
      let total = 0;
      for (const value of Object.values(perDay)) total += value;
      flow.amountMinor = Math.round(total * (flow.periodFactor ?? 1));
    } else if (flow.kind === "purchase" && flow.amountByContract) {
      const amounts = { ...flow.amountByContract };
      let removed = 0;
      for (const id of contractIds)
        if (amounts[id] !== undefined) {
          removed += amounts[id]!;
          delete amounts[id];
        }
      if (!removed) continue;
      flow.amountByContract = amounts;
      flow.amountMinor -= removed;
    }
  }
  for (const id of jobIds) rt.wageFlowByJob.delete(id);
  const placeId = record.household.placeId;
  const own = record.people.reduce((n, row) => n + row.liquidMinor, 0);
  const remaining = rt.openingCashByPlace.get(placeId) ?? 0;
  rt.openingCashByPlace.set(placeId, remaining - own);
  const calendars = new Map(
    (rt.input.calendars ?? []).map((row) => [row.id, row]),
  );
  return {
    calendars,
    cashShare: remaining > 0 ? own / remaining : 0,
    accountId: rt.input.accounts.find((row) => row.placeId === placeId)
      ?.accountId,
  };
}

/** Remove a person's household from the counts, for fill-in. */
export function takeResidentHousehold(
  core: CoreState,
  personId: PersonId,
): ResidentHouseholdRecord | undefined {
  const rt = runtimes.get(core);
  const id = rt?.householdOfPerson.get(personId);
  if (!rt || !id) return undefined;
  const record = rt.households.get(id)!;
  rt.households.delete(id);
  for (const person of record.people) rt.householdOfPerson.delete(person.id);
  rt.filledIn.set(id, record);
  return record;
}

/**
 * A counted worker's new hourly pay from today (e.g. a minimum wage). Their
 * employer's wage flow changes by exactly their share; the job record follows.
 */
export function rerateCountedJob(
  core: CoreState,
  jobId: string,
  hourlyMinor: number,
): boolean {
  const rt = runtimes.get(core);
  const job = rt?.jobs.get(jobId);
  if (!rt || !job) return false;
  const flows = [...rt.flows.values()].filter(
    (flow) => !flow.endedAt && flow.perDayMinorByJob?.[jobId] !== undefined,
  );
  if (!flows.length || !job.hourlyMinor) return false;
  const ratio = hourlyMinor / job.hourlyMinor;
  for (const flow of flows) {
    const perDay = { ...flow.perDayMinorByJob! };
    perDay[jobId] = perDay[jobId]! * ratio;
    flow.perDayMinorByJob = perDay;
    let total = 0;
    for (const value of Object.values(perDay)) total += value;
    flow.amountMinor = Math.round(total * (flow.periodFactor ?? 1));
  }
  rt.jobs.set(jobId, {
    ...job,
    hourlyMinor,
    wageDailyMinor: Math.round(job.wageDailyMinor * ratio),
  });
  return true;
}

export function residentWageShortfall(
  core: CoreState,
  id: string,
): ResidentWageShortfall | undefined {
  return runtimes.get(core)?.shortfalls.get(id);
}

export const RESIDENTS_MODULE: CoreModule = {
  id: RESIDENTS_MODULE_ID,
  onDay: runResidentsDay,
};

export interface ResidentCounts {
  placeId: PlaceId;
  accountId: string;
  households: number;
  people: number;
  adults: number;
  workers: number;
  byAgeBand: Record<string, number>;
  workersByOrganization: Record<string, number>;
}

const AGE_BANDS = [
  [0, "under-18"],
  [18, "18-29"],
  [30, "30-44"],
  [45, "45-64"],
  [65, "65-plus"],
] as const;

/** Counts of the wider population by place, age and employer, from its records. */
export function residentCounts(core: CoreState): ResidentCounts[] {
  const rt = runtimes.get(core);
  if (!rt) return [];
  const at = makeIsoDate(core.date);
  const byPlace = new Map<PlaceId, ResidentCounts>();
  for (const row of rt.input.accounts)
    byPlace.set(row.placeId, {
      placeId: row.placeId,
      accountId: row.accountId,
      households: 0,
      people: 0,
      adults: 0,
      workers: 0,
      byAgeBand: {},
      workersByOrganization: {},
    });
  const endedJobs = new Set<string>();
  for (const flow of rt.flows.values())
    if (flow.kind === "wages" && flow.endedAt)
      for (const id of flow.jobIds ?? []) endedJobs.add(id);
  for (const record of rt.households.values()) {
    const counts = byPlace.get(record.household.placeId)!;
    counts.households++;
    for (const person of record.people) {
      const age = ageOnDate(makeIsoDate(person.birthDate), at);
      counts.people++;
      if (age >= 18) counts.adults++;
      const band = [...AGE_BANDS].reverse().find(([min]) => age >= min)![1];
      counts.byAgeBand[band] = (counts.byAgeBand[band] ?? 0) + 1;
    }
    for (const job of record.jobs) {
      if (endedJobs.has(job.id)) continue;
      counts.workers++;
      counts.workersByOrganization[job.organizationId] =
        (counts.workersByOrganization[job.organizationId] ?? 0) + 1;
    }
  }
  return [...byPlace.values()];
}
