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
import type { CashJournalPosting } from "../journal";
import type { ResidentWageShortfall } from "../finance-types";
import type { CashJournalSourceSlot } from "../journal-state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  JobInput,
  PersonId,
  PlaceId,
} from "../types";

export const RESIDENTS_MODULE_ID = "core2-residents-v1";
const SOURCE_KIND = "residents.flow";
const DUE_KIND = "residents.due";
const ORDER = { wages: 0, retirement: 1, purchase: 2 } as const;

interface FlowState extends ResidentFlowInput {
  nextAt: IsoDate;
  arrearsMinor: number;
  endedAt?: IsoDate;
  endedReason?: string;
}

export interface ResidentsRuntime {
  input: ResidentsInput;
  flows: Map<string, FlowState>;
  due: Map<IsoDate, Set<string>>;
  pending: Map<string, CashJournalSourceSlot>;
  households: Map<string, ResidentHouseholdRecord>;
  householdOfPerson: Map<PersonId, string>;
  jobs: Map<string, JobInput>;
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
    pending: new Map(),
    households: new Map(),
    householdOfPerson: new Map(),
    shortfalls: new Map(),
    jobs: new Map(),
    wageFlowByJob: new Map(),
  };
  for (const record of input.households) {
    rt.households.set(record.household.id, record);
    for (const person of record.people)
      rt.householdOfPerson.set(person.id, record.household.id);
    for (const job of record.jobs) rt.jobs.set(job.id, job);
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
  if (paid > 0) post(api, rt, flow, paid, outside);
  const month = date.slice(0, 7);
  if (flow.kind !== "purchase" && paid > 0) {
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
  if (flow.kind === "purchase" && payeeBook && paid > 0) {
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
  rt: ResidentsRuntime,
  flow: FlowState,
  paid: number,
  outside: boolean,
): void {
  const core = api.state,
    date = core.date,
    id = `${flow.id}@${date}`;
  const payerAccount = core.cashJournal.residualAccountByOwner.get(
      flow.payerId,
    )!,
    payeeAccount = core.cashJournal.residualAccountByOwner.get(flow.payeeId)!;
  const postings: CashJournalPosting[] = [
    { id: `${id}:out`, accountId: payerAccount, deltaMinor: -paid },
    { id: `${id}:in`, accountId: payeeAccount, deltaMinor: paid },
  ];
  const due = { kind: DUE_KIND, id };
  rt.pending.set(id, {
    resolved: {
      kind: SOURCE_KIND,
      id,
      date,
      source: flow.source,
      expectedPostings: postings,
      requiredRelatedRefs: outside ? [due] : [],
      relatedRecords: outside ? [{ ...due, date, source: flow.source }] : [],
      ...(outside
        ? {
            externalFlowAuthorizations: [
              { accountId: payerAccount, obligation: due },
            ],
          }
        : {}),
    },
    marker: {},
    retainFull: false,
  });
  try {
    api.postJournal({
      id: `journal:${date}:${core.cashJournal.nextSequence}`,
      date,
      expectedSequence: core.cashJournal.nextSequence,
      sourceRef: { kind: SOURCE_KIND, id },
      postings,
    });
  } finally {
    rt.pending.delete(id);
  }
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

export function residentWageShortfall(
  core: CoreState,
  id: string,
): ResidentWageShortfall | undefined {
  return runtimes.get(core)?.shortfalls.get(id);
}

export const RESIDENTS_MODULE: CoreModule = {
  id: RESIDENTS_MODULE_ID,
  onDay: runResidentsDay,
  journalSourceProviders: {
    [SOURCE_KIND]: (api, reference) =>
      runtimes.get(api.state as CoreState)?.pending.get(reference.id),
  },
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
