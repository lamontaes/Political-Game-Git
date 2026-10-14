/**
 * The wider population's money on recorded dates: count workers' wages,
 * retirement income from outside, and household purchases at local firms.
 * Each occurrence is one balanced journal entry; nothing scans the world.
 */
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  advanceCadence,
  RESIDENTS_KIND,
  RESIDENTS_STOPGAP,
  type ResidentFlowInput,
  type ResidentHouseholdRecord,
  type ResidentsInput,
} from "../residents";
import { transfer, transferSplit } from "../accounts";
import { splitMarketDemand } from "../business-books";
import { OUTSIDE_MARKET_KIND } from "../opening-outside-market";
import { notifySalesReceipt } from "./finance";
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
import { registerSnapshotPart } from "../snapshot";
import {
  ageBandOf,
  ageOn,
  CountedHouseholdMap,
  CountedPersonHouseholdMap,
  CountedStore,
  decodeStore,
  encodeStore,
  MemberState,
  type CountedHousehold,
  type GroupKey,
  type HeadWork,
  type HouseholdKind,
} from "../counted-groups";
import type { FinanceContractInput } from "../finance-types";
import COUNTED_ROWS from "../data/counted/parameters.json" with { type: "json" };
import { placeDistrictPopulations } from "../../districts/place-population-share";
import { stopgap } from "../stopgaps";
import { corePlaceByKey } from "../place-lookup";
import {
  chargeGroups,
  flowWeights,
  fundGroups,
  HOUSING_KINDS,
  fundBalance,
  fundOf,
  moveShare,
  payGroups,
  peopleInGroup,
  splitWhole,
  placeWeights,
  sweepResidual,
  UNKEYED_STOPGAP,
} from "../counted-money";

const DAYS_PER_YEAR = 365;

export const RESIDENTS_MODULE_ID = "core2-residents-v1";
// Outside buyers pay first, so a day's receipts can meet that day's payroll.
const ORDER = {
  "outside-sales": 0,
  wages: 1,
  retirement: 2,
  purchase: 3,
  // Suppliers are paid after workers, from what is left.
  "outside-costs": 4,
  "owner-distribution": 5,
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

/**
 * What the runtime keeps of the opening's residents input: its accounts,
 * calendars, peer-group sizes and the seed fill-in rebuilds the past from.
 * Not its households or flows (MEMORY-FLAT): the households live on as the
 * records below, and the flows as their running state.
 */
export type ResidentsRecipe = Omit<ResidentsInput, "households" | "flows">;

export interface ResidentsRuntime {
  input: ResidentsRecipe;
  flows: Map<string, FlowState>;
  due: Map<IsoDate, Set<string>>;
  /** The counted groups, their households and their members' packed identities. */
  store: CountedStore;
  /** Counted households as records, built from the store when read (SG-CORE-counted-person-views). */
  households: ReadonlyMap<string, ResidentHouseholdRecord>;
  householdOfPerson: ReadonlyMap<PersonId, string>;
  jobs: Map<string, JobInput>;
  /** Opening cash of everyone still counted, by place (fill-in takes its share). */
  openingCashByPlace: Map<PlaceId, number>;
  /** Households filled in from the counts (their people are full people now). */
  filledIn: Set<string>;
  wageFlowByJob: Map<string, FlowState>;
  /** Today's missed count-worker paydays, the evidence a closure cites. */
  shortfalls: Map<string, ResidentWageShortfall>;
  /** Each residents account's money this month, so spending follows income. */
  monthly: Map<string, ResidentMonth>;
  /** Each residents account's purchase scale (1 = the opening budgets). */
  spendScale: Map<string, number>;
  /** The outlay share of income (parameter), read each settled day. */
  outlayShare: number;
  /** Months of income averaged (parameter) and each account's recent months. */
  incomeWindow: number;
  incomeHistory: Map<string, number[]>;
  openingMonth: string;
  /** Each seller's receipts from the residents this month (capacity). */
  sellerMonth: Map<string, { month: string; receivedMinor: number }>;
  outsideByPlace: Map<PlaceId, string>;
  /** Yearly pay of one counted worker without a recorded job, by place. */
  unplacedPerWorker: Map<PlaceId, number>;
  /** Each counted group's account (a fund under its place's residents account). */
  funds: Map<number, string>;
  funded: boolean;
  /** Housing payments each group still owes. */
  arrears: Map<number, number>;
  /** Each group's monthly housing and outside living costs, kept back from its spending. */
  housingDue: Map<number, number>;
  /** Each group's latest month of housing payments: asked and paid. */
  housingMonth: Map<number, { month: string; asked: number; paid: number }>;
  /** Pay so far this year per worker, by group and year (the Social Security wage base). */
  withholdingYtd: Map<string, number>;
  /** Tax withheld from counted pay, by group, year, jurisdiction and tax. */
  withheld: Map<string, number>;
  /** A retirement award's contract id to its household index. */
  incomeContractHousehold: Map<string, number>;
  moneyCache: {
    people?: Map<number, number>;
    peopleVersion?: number;
    serial: number;
  };
  /** The engine's own handle on the world, for money a regroup moves. */
  api?: CoreAPI;
  /** The month the groups' money was last closed for. */
  lastMonth?: string;
  /** A household being filled in: its share of its group's money, paid to its people on release. */
  fillInCash: Map<string, { group: number; amount: number }>;
}

interface ResidentMonth {
  month: string;
  incomeMinor: number;
  /** Outside living costs (rent): paid as owed, not scaled. */
  fixedMinor: number;
  /** Other purchases, at this month's scale. */
  scaledMinor: number;
}

const FIXED_SPENDING = "household.outside-living-costs";

const runtimes = new WeakMap<CoreState, ResidentsRuntime>();
// The store is plain columns; the record views over it are rebuilt.
registerSnapshotPart("core2-residents", {
  save: (core) => {
    const rt = runtimes.get(core);
    if (!rt) return undefined;
    const {
      households: _h,
      householdOfPerson: _p,
      store,
      api: _a,
      moneyCache: _c,
      ...rest
    } = rt;
    void [_h, _p, _a, _c];
    return { ...rest, input: undefined, store: encodeStore(store) };
  },
  restore: (core, data) => {
    const rebuilt = runtimes.get(core);
    if (!data || !rebuilt) return void runtimes.delete(core);
    const saved = data as Omit<
      ResidentsRuntime,
      "store" | "households" | "householdOfPerson"
    > & { store: unknown };
    const store = decodeStore(saved.store);
    runtimes.set(core, {
      ...saved,
      input: rebuilt.input,
      moneyCache: { serial: 0 },
      store,
      households: new CountedHouseholdMap(store),
      householdOfPerson: new CountedPersonHouseholdMap(store),
    });
  },
});

const COUNTED = COUNTED_ROWS as unknown as Readonly<
  Record<string, { value: number }>
>;
/** A counted-group parameter (src/core2/data/counted/parameters.json). */
export function countedParameter(key: string): number {
  const row = COUNTED[key];
  if (!row) throw new Error(`Untagged counted parameter: ${key}`);
  return row.value;
}

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

/** A household's part of a merged purchase flow is keyed `hh:<household id>`. */
export const householdPart = (householdId: string) => `hh:${householdId}`;

/**
 * Merged purchases keyed by the household that pays them, one part per
 * household (the household's own contracts are not kept; fill-in rebuilds
 * them from these parts). Keys already per household (outside living costs,
 * mortgages) are kept.
 */
function householdKeys(
  amounts: Readonly<Record<string, number>>,
  owners: ReadonlyMap<string, string>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, amount] of Object.entries(amounts)) {
    const home = owners.get(key);
    const part = home ? householdPart(home) : key;
    out[part] = (out[part] ?? 0) + amount;
  }
  return out;
}

const cents = (dollars: number) => dollars * 100;

/** The national household-income fifth a yearly income falls in (0 to 4). */
export function incomeBandOf(incomeMinorYear: number): number {
  let band = 0;
  for (let i = 1; i <= 4; i++)
    if (
      incomeMinorYear >
      cents(countedParameter(`countedIncomeFifthLimit${i}Dollars`))
    )
      band = i;
  return band;
}

/** A counted household's yearly income: recorded pay, retirement awards and its unplaced workers' pay. */
export function householdIncome(
  rt: ResidentsRuntime,
  h: CountedHousehold,
): number {
  return (
    h.wagesMinorYear +
    h.retirementMinorYear +
    h.unplacedWorkers * (rt.unplacedPerWorker.get(h.placeId) ?? 0)
  );
}

/** What keys a counted household to its group today. */
export function groupKeyOf(
  rt: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): GroupKey {
  const store = rt.store;
  const members = store.countedMembers(h);
  let adults = 0,
    children = 0,
    head = -1,
    headAge = -1;
  for (const m of members) {
    const age = ageOn(store.born[m]!, date);
    if (age >= 18) adults++;
    else children++;
    if (age > headAge) [head, headAge] = [m, age];
  }
  const kind: HouseholdKind =
    children > 0 ? "with-children" : adults <= 1 ? "one-adult" : "adults";
  const headId = head >= 0 ? store.ids[head] : undefined;
  const working = h.jobs.some(
    (job) => job.personId === headId && job.endsAt === undefined,
  );
  const retired =
    h.incomeContracts.some((row) => row.recipientIncome?.personId === headId) ||
    headAge >= countedParameter("countedWorkingAgeBelow");
  const work: HeadWork = working
    ? "working"
    : retired
      ? "retired"
      : h.unplacedWorkers >= 0.5
        ? "working"
        : "not-working";
  return {
    placeId: h.placeId,
    district: h.district ?? "town",
    kind,
    incomeBand: incomeBandOf(householdIncome(rt, h)),
    tenure: h.tenure,
    ageBand: ageBandOf(Math.max(0, headAge)),
    work,
  };
}

/** Put a household in the group its facts key it to today. */
export function regroupHousehold(
  rt: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): void {
  const before = h.group;
  const people = rt.store.countedCount(h);
  const groupBefore = before >= 0 ? peopleInGroup(rt, before) : 0;
  rt.store.regroup(h, groupKeyOf(rt, h, date));
  // Its share of the old group's money goes with it.
  if (rt.api && before !== h.group)
    moveShare(rt.api, rt, before, h.group, people, groupBefore);
}

/**
 * A counted household's share of its group's money: the group's account
 * times its people over the group's people.
 */
function householdCash(rt: ResidentsRuntime, h: CountedHousehold): number {
  if (!rt.api || !rt.funded || h.group < 0) return 0;
  const people = peopleInGroup(rt, h.group);
  return people > 0
    ? Math.floor(
        (fundBalance(rt.api, rt, h.group) * rt.store.countedCount(h)) / people,
      )
    : 0;
}

/** Working-age counted members without a recorded job. */
function jobless(
  store: CountedStore,
  h: CountedHousehold,
  date: string,
): number {
  const from = countedParameter("countedWorkingAgeFrom"),
    below = countedParameter("countedWorkingAgeBelow");
  const working = new Set(
    h.jobs.filter((job) => job.endsAt === undefined).map((job) => job.personId),
  );
  let n = 0;
  for (const m of store.countedMembers(h)) {
    const age = ageOn(store.born[m]!, date);
    if (age >= from && age < below && !working.has(store.ids[m]!)) n++;
  }
  return n;
}

export const DISTRICT_STOPGAP = "SG-CORE-district-placement";

/** The town's districts and their people (state House, else state Senate), by GEOID. */
export function townDistricts(core: CoreState): [string, number][] {
  const geoid = core.placeMetadata?.placeKey;
  if (!geoid) return [];
  for (const chamber of ["state-lower", "state-upper"] as const) {
    const counts = Object.entries(placeDistrictPopulations(geoid, chamber))
      .filter(([, n]) => n > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (counts.length > 1)
      return counts.map(([id, n]) => [`${chamber}:${id}`, n]);
  }
  return [];
}

/**
 * A town whose people split between districts (the Census place-district
 * populations): its counted households fill the districts in proportion to
 * the districts' people, in order of their income, so each district holds
 * the households its share of the town's income ladder holds
 * (SG-CORE-district-placement until the districts' own Census tables are
 * read). Other places are whole.
 */
function placeInDistricts(
  core: CoreState,
  rt: ResidentsRuntime,
  households: readonly CountedHousehold[],
): void {
  const districts = townDistricts(core);
  if (districts.length < 2) return;
  stopgap(DISTRICT_STOPGAP);
  const placeId = townPlaceOf(core);
  const town = households.filter((h) => h.placeId === placeId);
  const ordered = [...town].sort(
    (a, b) =>
      householdIncome(rt, a) - householdIncome(rt, b) || (a.id < b.id ? -1 : 1),
  );
  const people = ordered.reduce(
    (n, h) => n + rt.store.countedMembers(h).length,
    0,
  );
  const total = districts.reduce((n, [, count]) => n + count, 0);
  let d = 0,
    filled = 0,
    edge = (districts[0]![1] / total) * people;
  for (const h of ordered) {
    while (filled >= edge && d < districts.length - 1) {
      d++;
      edge += (districts[d]![1] / total) * people;
    }
    h.district = districts[d]![0];
    filled += rt.store.countedMembers(h).length;
  }
}

/** The town's own place id (its jurisdiction), from the world's place key. */
export function townPlaceOf(core: CoreState): PlaceId | undefined {
  const key = core.placeMetadata?.placeKey;
  return key
    ? (corePlaceByKey(key)?.context.jurisdiction.id as PlaceId | undefined)
    : undefined;
}

/**
 * Pack the opening's counted households into groups: each person's identity
 * into the member columns, each household's tenure (its rent or mortgage in
 * the flows), recorded pay and awards, and its share of the place's unplaced
 * workers (the opening's employment target less recorded jobs, shared by
 * working-age members without a job). Returns contract id to household id,
 * so merged purchases are kept per household.
 */
function packOpening(
  core: CoreState,
  rt: ResidentsRuntime,
  input: ResidentsInput,
): Map<string, string> {
  const store = rt.store,
    date = core.date;
  const owners = new Map<string, string>();
  const renters = new Set<string>(),
    mortgaged = new Set<string>();
  const unplaced = new Map<PlaceId, { workers: number; yearMinor: number }>();
  for (const row of input.flows) {
    if (row.id.startsWith("rent:")) renters.add(row.id.slice("rent:".length));
    for (const key of Object.keys(row.amountByContract ?? {}))
      if (key.startsWith("mortgage:"))
        mortgaged.add(key.slice("mortgage:".length));
    if (row.financeKind === "work.unplaced-residents") {
      const perYear =
        row.cadence.kind === "days"
          ? DAYS_PER_YEAR / row.cadence.every
          : 12 / row.cadence.every;
      const prior = unplaced.get(row.placeId) ?? { workers: 0, yearMinor: 0 };
      unplaced.set(row.placeId, {
        workers: prior.workers + (row.unplacedWorkers ?? 0),
        yearMinor: prior.yearMinor + row.amountMinor * perYear,
      });
    }
  }
  store.addTraitNames(input.households.flatMap((record) => record.people));
  const households: CountedHousehold[] = [];
  for (const record of input.households) {
    for (const job of record.jobs) rt.jobs.set(job.id, job);
    for (const contract of record.contracts)
      if (!contract.recipientIncome)
        owners.set(contract.id, record.household.id);
    const id = record.household.id;
    const placeId = record.household.placeId;
    households.push(
      store.addHousehold(record, {
        tenure: renters.has(id)
          ? "rent"
          : mortgaged.has(id)
            ? "mortgage"
            : "other",
        unplacedWorkers: 0,
      }),
    );
    const h = households[households.length - 1]!;
    for (const contract of h.incomeContracts)
      rt.incomeContractHousehold.set(contract.id, h.index);
    rt.openingCashByPlace.set(
      placeId,
      (rt.openingCashByPlace.get(placeId) ?? 0) +
        record.people.reduce((n, row) => n + row.liquidMinor, 0),
    );
  }
  // The place's unplaced workers, shared by its working-age members without a job.
  const eligible = new Map<PlaceId, number>();
  const open = new Map<number, number>();
  for (const h of households) {
    const n = jobless(store, h, date);
    open.set(h.index, n);
    eligible.set(h.placeId, (eligible.get(h.placeId) ?? 0) + n);
  }
  for (const [placeId, row] of unplaced) {
    const pool = eligible.get(placeId) ?? 0;
    const workers = row.workers > 0 ? Math.min(row.workers, pool) : pool;
    if (workers > 0) rt.unplacedPerWorker.set(placeId, row.yearMinor / workers);
    const share = pool > 0 ? workers / pool : 0;
    for (const h of households)
      if (h.placeId === placeId) h.unplacedWorkers = open.get(h.index)! * share;
  }
  placeInDistricts(core, rt, households);
  for (const h of households) regroupHousehold(rt, h, date);
  store.openingMembers = store.memberCount;
  return owners;
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
  const store = new CountedStore();
  const rt: ResidentsRuntime = {
    input: {
      version: input.version,
      accounts: input.accounts,
      ...(input.cohortSizes ? { cohortSizes: input.cohortSizes } : {}),
      ...(input.calendars ? { calendars: input.calendars } : {}),
      // Counted people carry no past: fill-in builds each one's from the seed.
      ...(input.pastBuild
        ? {
            pastBuild: {
              seed: input.pastBuild.seed,
              startedAt: input.pastBuild.startedAt,
              deepPastAt: {},
            },
          }
        : {}),
      source: input.source,
    },
    flows: new Map(),
    due: new Map(),
    store,
    households: new CountedHouseholdMap(store),
    householdOfPerson: new CountedPersonHouseholdMap(store),
    shortfalls: new Map(),
    jobs: new Map(),
    filledIn: new Set(),
    openingCashByPlace: new Map(),
    wageFlowByJob: new Map(),
    monthly: new Map(),
    spendScale: new Map(),
    outlayShare: 1,
    incomeWindow: 1,
    incomeHistory: new Map(),
    openingMonth: core.date.slice(0, 7),
    sellerMonth: new Map(),
    outsideByPlace: new Map(),
    unplacedPerWorker: new Map(),
    funds: new Map(),
    funded: false,
    arrears: new Map(),
    housingDue: new Map(),
    housingMonth: new Map(),
    withholdingYtd: new Map(),
    withheld: new Map(),
    incomeContractHousehold: new Map(),
    moneyCache: { serial: 0 },
    fillInCash: new Map(),
  };
  const owners = packOpening(core, rt, input);
  for (const row of input.flows) {
    if (rt.flows.has(row.id)) throw new Error(`Duplicate flow: ${row.id}`);
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor < 0)
      throw new Error(`Invalid flow amount: ${row.id}`);
    for (const id of [row.payerId, row.payeeId])
      if (!core.organizations.has(id) && !core.people.has(id))
        throw new Error(`Flow owner is not recorded: ${id}`);
    // A flow due on or before the opening date settles on the first simulated
    // day, except counted wages with earned days by payday: they keep their
    // calendar, so a payday on the opening day (its period all before it)
    // passes, and the next one pays the days since the opening.
    let nextAt = makeIsoDate(row.firstAt);
    if (row.earnedDaysByDue)
      while (nextAt <= core.date)
        nextAt = makeIsoDate(advanceCadence(nextAt, row.cadence));
    if (nextAt <= core.date)
      nextAt = makeIsoDate(addDays(makeIsoDate(core.date), 1));
    const flow: FlowState = {
      ...row,
      ...(row.kind === "purchase" && row.amountByContract
        ? { amountByContract: householdKeys(row.amountByContract, owners) }
        : {}),
      nextAt,
      arrearsMinor: 0,
    };
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

/**
 * A seller closed: its counted customers buy the same things from the
 * place's other open sellers of that kind, in proportion to what each already
 * sells them, contract by contract. With no other seller, the demand ends.
 */
export function shiftToOpenSellers(
  core: CoreState,
  rt: ResidentsRuntime,
  closed: FlowState,
): void {
  if (!closed.amountByContract || closed.amountMinor <= 0) return;
  const targets = [...rt.flows.values()]
    .filter(
      (flow) =>
        flow.kind === "purchase" &&
        !flow.endedAt &&
        flow.id !== closed.id &&
        flow.residentsId === closed.residentsId &&
        flow.financeKind === closed.financeKind &&
        flow.payeeId !== closed.payeeId &&
        flow.amountMinor > 0 &&
        flow.amountByContract &&
        !core.finance.businesses.get(flow.payeeId)?.closedAt,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const total = targets.reduce(
    (n, flow) => n + flow.amountMinor * perYear(flow),
    0,
  );
  if (!total) return;
  const weights = targets.map(
    (flow) => (flow.amountMinor * perYear(flow)) / total,
  );
  const added = targets.map(() => ({}) as Record<string, number>);
  // Each contract's amount is split across the sellers by weight; the cents
  // left by rounding go to the largest share, so a same-cadence move is exact.
  const largest = weights.indexOf(Math.max(...weights));
  for (const [id, amount] of Object.entries(closed.amountByContract)) {
    let given = 0;
    targets.forEach((flow, index) => {
      if (index === largest) return;
      const add = Math.round(amount * weights[index]!);
      given += add;
      added[index]![id] = add;
    });
    added[largest]![id] = amount - given;
  }
  targets.forEach((flow, index) => {
    const scale = perYear(closed) / perYear(flow);
    const amounts = { ...flow.amountByContract! };
    for (const [id, add] of Object.entries(added[index]!)) {
      const value = scale === 1 ? add : Math.round(add * scale);
      if (value) amounts[id] = (amounts[id] ?? 0) + value;
    }
    flow.amountByContract = amounts;
    flow.amountMinor = Object.values(amounts).reduce((n, v) => n + v, 0);
  });
  closed.amountByContract = {};
  closed.amountMinor = 0;
}

/** Cash above the firm's buffer goes to its owners: part local, the rest outside. */
/** A firm's supplier bills accrued and not yet paid (net-30), and who they're owed to. */
export function supplierBillsOwedTo(
  core: CoreState,
  organizationId: string,
): { owedMinor: number; supplierId: string; flowId: string } | undefined {
  const costs = runtimes
    .get(core)
    ?.flows.get(`outside-costs:${organizationId}`);
  if (!costs || costs.endedAt || !core.finance.businesses.has(organizationId))
    return undefined;
  return {
    owedMinor: Math.floor(supplierBillsOwed(core, organizationId)),
    supplierId: costs.payeeId,
    flowId: costs.id,
  };
}

function distribute(api: CoreAPI, rt: ResidentsRuntime, flow: FlowState): void {
  const core = api.state,
    finance = core.finance,
    book = finance.businesses.get(flow.payerId);
  if (!book) return end(flow, core.date, "no-books");
  if (book.closedAt) return end(flow, core.date, "payer-closed");
  const daily =
    (book.annualPayrollMinor + book.annualOtherCostsMinor) / DAYS_PER_YEAR;
  const target =
    daily *
    (flow.bufferDays ?? 0) *
    api.parameter("ownerDistributionBufferMultiple");
  // Supplier bills already owed (net-30) are the business's money, not the
  // owners': keep them back with the buffer.
  const owed = supplierBillsOwed(core, flow.payerId);
  const excess = Math.floor(spendable(core, flow.payerId) - target - owed);
  if (excess <= 0) return;
  const residents = rt.input.accounts.find(
    (row) => row.placeId === flow.placeId,
  )?.accountId;
  const local = residents
    ? Math.floor(excess * api.parameter("ownerDistributionLocalShare"))
    : 0;
  const accounts = api.accounts();
  if (local > 0) {
    // Owners who live here are counted residents nobody keyed: the place's
    // groups share it by their people (SG-CORE-counted-unkeyed-money).
    api.stopgap(UNKEYED_STOPGAP);
    const net = payGroups(api, rt, {
      id: `${flow.id}@${core.date}:local`,
      flow,
      fromAccount: accounts.main(flow.payerId),
      paid: local,
      reasonKey: flow.financeKind,
      source: flow.source,
      weights: placeWeights(rt, flow.placeId),
    });
    // Owners' income is the residents' income: they spend it too.
    for (const [group, amount] of net)
      monthOf(rt, groupKey(group), core.date).incomeMinor += amount;
    const key = `${core.date.slice(0, 7)}:${flow.placeId}`;
    finance.paidIncomeByPlaceMonth.set(
      key,
      (finance.paidIncomeByPlaceMonth.get(key) ?? 0) + local,
    );
    finance.paidIncomeByPlaceMonthKind.set(
      `${key}:${flow.financeKind}`,
      (finance.paidIncomeByPlaceMonthKind.get(`${key}:${flow.financeKind}`) ??
        0) + local,
    );
  }
  if (excess - local > 0)
    transfer(core, api, {
      id: `${flow.id}@${core.date}:outside`,
      from: accounts.main(flow.payerId),
      to: accounts.main(flow.outsideId ?? flow.payeeId),
      amountMinor: excess - local,
      reasonKey: flow.financeKind,
      source: flow.source,
    });
}

/** What a business owes its outside suppliers for costs accrued on its sales but not yet billed or paid (net-30 terms). */
export function supplierBillsOwed(
  core: CoreState,
  organizationId: string,
): number {
  const rt = runtimes.get(core),
    book = core.finance.businesses.get(organizationId);
  const costs = rt?.flows.get(`outside-costs:${organizationId}`);
  if (!book || !costs || costs.endedAt) return 0;
  const share =
    book.annualDemandMinor > 0
      ? book.annualOtherCostsMinor / book.annualDemandMinor
      : 0;
  const accrued =
    (costs.accruedCostMinor ?? 0) +
    (book.receivedMinor - (costs.receivedMinor ?? book.receivedMinor)) * share;
  return Math.max(
    0,
    accrued -
      (book.operatingPaidMinor -
        (costs.localPaidMinor ?? book.operatingPaidMinor)) -
      (costs.outsidePaidMinor ?? 0),
  );
}

function settle(api: CoreAPI, rt: ResidentsRuntime, flow: FlowState): void {
  if (flow.kind === "owner-distribution") return distribute(api, rt, flow);
  const core = api.state,
    date = core.date,
    finance = core.finance;
  if (flow.endsAt && date >= flow.endsAt) return end(flow, date, "ended");
  const payerBook = finance.businesses.get(flow.payerId),
    payeeBook = finance.businesses.get(flow.payeeId);
  if (payerBook?.closedAt) return end(flow, date, "payer-closed");
  if (payeeBook?.closedAt) {
    if (flow.kind === "purchase") shiftToOpenSellers(core, rt, flow);
    return end(flow, date, "payee-closed");
  }
  let base = flow.amountMinor;
  const earnedDays = flow.earnedDaysByDue?.[date];
  if (earnedDays !== undefined && flow.perDayMinorByJob) {
    // A payday at the opening pays only the days worked since it.
    let perDay = 0;
    for (const value of Object.values(flow.perDayMinorByJob)) perDay += value;
    base = Math.round(perDay * earnedDays);
    const rest = { ...flow.earnedDaysByDue };
    delete rest[date];
    flow.earnedDaysByDue = rest;
  }
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
  // The counted side of a flow is a place's residents account (outside
  // buyers' and suppliers' flows name the outside account instead).
  const counted = (id: string) =>
    id === flow.residentsId &&
    core.organizations.get(id)?.kind === RESIDENTS_KIND;
  // A place with no counted households (a test world, a place emptied by
  // moves) keeps its money in the residents account itself.
  const grouped = placeWeights(rt, flow.placeId).size > 0;
  const countedPays = grouped && counted(flow.payerId),
    countedPaid = grouped && counted(flow.payeeId);
  const fixed =
    flow.financeKind === FIXED_SPENDING || HOUSING_KINDS.has(flow.financeKind);
  let requested = base + (flow.kind === "wages" ? flow.arrearsMinor : 0);
  let paid: number;
  if (countedPays) {
    // Each counted group pays its own part from its own account: purchases
    // that follow income at its month's scale, rent and mortgages as owed.
    const scaled = flow.kind === "purchase" && !fixed;
    const seller = core.cashJournal.residualAccountByOwner.get(flow.payeeId)!;
    const charged = chargeGroups(api, rt, {
      id: `${flow.id}@${date}`,
      flow,
      requested: base,
      reasonKey: flow.financeKind,
      source: flow.source,
      ...(scaled
        ? {
            scaleOf: (group: number) => rt.spendScale.get(groupKey(group)) ?? 1,
          }
        : {}),
      // A seller serves only what it can: spending beyond its capacity buys
      // the same thing outside the town.
      payees: (total) => {
        const elsewhere =
          scaled && payeeBook && total > 0
            ? overCapacity(api, rt, flow, payeeBook, total)
            : 0;
        return [
          { accountId: seller, deltaMinor: total - elsewhere },
          ...(elsewhere > 0
            ? [
                {
                  accountId: core.cashJournal.residualAccountByOwner.get(
                    outsideMarketFor(core, rt, flow.placeId),
                  )!,
                  deltaMinor: elsewhere,
                },
              ]
            : []),
        ];
      },
    });
    requested = 0;
    for (const [group, row] of charged.byGroup) {
      requested += row.asked;
      const month = monthOf(rt, groupKey(group), date);
      if (fixed) month.fixedMinor += row.paid;
      else month.scaledMinor += row.paid;
    }
    paid = charged.toPayee;
    requested -= charged.paid - charged.toPayee;
  } else {
    const payer = core.organizations.get(flow.payerId);
    const outside = payer?.outsideFlow !== undefined;
    paid = outside
      ? requested
      : Math.min(requested, spendable(core, flow.payerId));
    if (countedPaid && paid > 0) {
      // Each counted group is paid its part, less what the law withholds.
      const net = payGroups(api, rt, {
        id: `${flow.id}@${date}`,
        flow,
        fromAccount: core.cashJournal.residualAccountByOwner.get(flow.payerId)!,
        paid,
        reasonKey: flow.financeKind,
        source: flow.source,
      });
      for (const [group, amount] of net)
        monthOf(rt, groupKey(group), date).incomeMinor += amount;
    } else if (paid > 0) post(api, flow, paid);
  }
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
  if (flow.kind === "purchase" && flow.salesReceipt && payeeBook && paid > 0)
    notifySalesReceipt(api, {
      id: `${flow.id}@${date}`,
      date,
      sellerId: flow.payeeId,
      buyerIds: [flow.payerId],
      kind: flow.financeKind,
      paidMinor: paid,
      placeId: flow.placeId,
      counted: true,
    });
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

function post(api: CoreAPI, flow: FlowState, paid: number): void {
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

/** How much of a payment exceeds the seller's capacity this month. */
function overCapacity(
  api: CoreAPI,
  rt: ResidentsRuntime,
  flow: FlowState,
  book: { annualDemandMinor: number },
  paid: number,
): number {
  const month = api.state.date.slice(0, 7);
  let row = rt.sellerMonth.get(flow.payeeId);
  if (!row || row.month !== month) {
    row = { month, receivedMinor: 0 };
    rt.sellerMonth.set(flow.payeeId, row);
  }
  const capacity =
    book.annualDemandMinor /
    api.parameter("sellerCapacityUtilization") /
    api.parameter("monthsPerYear");
  const room = Math.max(0, Math.floor(capacity - row.receivedMinor));
  const toSeller = Math.min(paid, room);
  row.receivedMinor += toSeller;
  return paid - toSeller;
}

/** The place's outside-market account, if one is recorded. */
function outsideMarketOf(
  core: CoreState,
  rt: ResidentsRuntime,
  placeId: PlaceId,
): string | undefined {
  try {
    return outsideMarketFor(core, rt, placeId);
  } catch {
    return undefined;
  }
}

/** The place's outside-market account (buyers and sellers outside the town). */
function outsideMarketFor(
  core: CoreState,
  rt: ResidentsRuntime,
  placeId: PlaceId,
): string {
  let id = rt.outsideByPlace.get(placeId);
  if (!id) {
    id = [...core.organizations.values()].find(
      (row) => row.kind === OUTSIDE_MARKET_KIND && row.placeId === placeId,
    )?.id;
    if (!id) throw new Error(`No outside market recorded for ${placeId}`);
    rt.outsideByPlace.set(placeId, id);
  }
  return id;
}

/** A counted group's key in the monthly money maps. */
const groupKey = (group: number) => `g:${group}`;

function monthOf(
  rt: ResidentsRuntime,
  key: string,
  date: string,
): ResidentMonth {
  const month = date.slice(0, 7);
  let row = rt.monthly.get(key);
  if (!row || row.month !== month) {
    row = { month, incomeMinor: 0, fixedMinor: 0, scaledMinor: 0 };
    rt.monthly.set(key, row);
  }
  return row;
}

/**
 * At a new month each counted group's purchases follow its income: they
 * spend the outlay share of the group's average income after taxes over the
 * last few full months, after rent and mortgage: scale = (average income ×
 * share − housing) ÷ (purchases at scale 1), the group's parts of the flows'
 * monthly amounts. A group with no income this window spends from what it
 * holds at its usual scale. The opening month is partial and isn't counted.
 */
function closeMonths(rt: ResidentsRuntime, month: string): void {
  if (month === rt.openingMonth) return;
  const fixed = new Map<number, number>(),
    atOne = new Map<number, number>();
  for (const flow of rt.flows.values()) {
    if (
      flow.endedAt ||
      flow.kind !== "purchase" ||
      flow.payerId !== flow.residentsId ||
      !rt.input.accounts.some((row) => row.accountId === flow.payerId)
    )
      continue;
    const monthly = (flow.amountMinor * perYear(flow)) / 12;
    const weights = flowWeights(rt, flow);
    const total = [...weights.values()].reduce((n, v) => n + v, 0);
    if (total <= 0) continue;
    const into =
      flow.financeKind === FIXED_SPENDING || HOUSING_KINDS.has(flow.financeKind)
        ? fixed
        : atOne;
    for (const [group, weight] of weights)
      into.set(group, (into.get(group) ?? 0) + (monthly * weight) / total);
  }
  rt.housingDue = new Map(
    [...fixed].map(([group, amount]) => [
      group,
      Math.round(amount + (rt.arrears.get(group) ?? 0)),
    ]),
  );
  for (const [key, row] of rt.monthly) {
    if (row.month !== month) continue;
    const history = [...(rt.incomeHistory.get(key) ?? []), row.incomeMinor];
    while (history.length > rt.incomeWindow) history.shift();
    rt.incomeHistory.set(key, history);
    const group = Number(key.slice(2));
    const income = history.reduce((n, v) => n + v, 0) / history.length;
    const purchases = atOne.get(group) ?? 0;
    if (purchases <= 0 || income <= 0) continue;
    rt.spendScale.set(
      key,
      Math.max(
        0,
        (income * rt.outlayShare - (fixed.get(group) ?? 0)) / purchases,
      ),
    );
  }
}

function runResidentsDay(api: CoreAPI): void {
  const core = api.state,
    rt = runtimes.get(core);
  if (!rt) return;
  rt.api = api;
  if (!rt.funded) fundGroups(api, rt);
  // A new month: each group's spending follows its income, and money no
  // engine keyed to anyone goes to the place's groups.
  const month = core.date.slice(0, 7);
  if (rt.lastMonth !== month) {
    if (rt.lastMonth) {
      rt.outlayShare = countedParameter("countedOutlayShareOfDisposableIncome");
      rt.incomeWindow = api.parameter("residentsIncomeWindowMonths");
      closeMonths(rt, rt.lastMonth);
      sweepResidual(api, rt);
    }
    rt.lastMonth = month;
  }
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

/**
 * The records' count of people in a school class or workgroup, as the full
 * build saw it, so people filled in later join the same-sized peer group.
 * Pass as buildDeepPast's peerCohortSize option.
 */
export function peerCohortSize(
  core: CoreState,
  circle: string,
  contextKey: string,
): number | undefined {
  return runtimes.get(core)?.input.cohortSizes?.[`${circle}|${contextKey}`];
}

/** The record of someone still in the wider population, built from their group's columns. */
export function residentPerson(
  core: CoreState,
  personId: PersonId,
): PersonInput | undefined {
  const rt = runtimes.get(core);
  const m = rt?.store.countedMember(personId);
  if (m === undefined) return undefined;
  const store = rt!.store;
  const id = store.ids[m]!;
  return store
    .peopleOf(store.households[store.household[m]!]!)
    .find((row) => row.id === id);
}

/** Whether a counted (or filled-in) person was in the opening's counts, so has a past before it. */
export function countedSinceOpening(
  core: CoreState,
  personId: PersonId,
): boolean {
  const rt = runtimes.get(core);
  const m = rt?.store.memberOf.get(personId);
  return m !== undefined && m < rt!.store.openingMembers;
}

/** The counted household a person belongs to, if they are still counted. */
export function countedHouseholdOf(
  core: CoreState,
  personId: PersonId,
): CountedHousehold | undefined {
  const rt = runtimes.get(core);
  const m = rt?.store.countedMember(personId);
  return m === undefined
    ? undefined
    : rt!.store.households[rt!.store.household[m]!];
}

const partsOf = (householdId: string) =>
  new Set([
    householdPart(householdId),
    `household:${householdId}`,
    `${MORTGAGE_KEY}${householdId}`,
  ]);
const MORTGAGE_KEY = "mortgage:";

/**
 * The standing bills a filled-in household takes over from the merged
 * flows, as its own contracts: each purchase part, its mortgage and its
 * rent, due on the flow's next date. Outside living costs stay a flow of its
 * own (`releaseResidentHousehold`).
 */
function householdContracts(
  rt: ResidentsRuntime,
  h: CountedHousehold,
  payerIds: readonly PersonId[],
): FinanceContractInput[] {
  if (!payerIds.length) return [];
  const out: FinanceContractInput[] = [];
  const part = householdPart(h.id),
    mortgage = `${MORTGAGE_KEY}${h.id}`;
  for (const flow of rt.flows.values()) {
    if (flow.endedAt || flow.kind !== "purchase") continue;
    const months = flow.cadence.kind === "months" ? flow.cadence.every : 1;
    const base = {
      householdId: h.id,
      payerIds: [...payerIds],
      payeeId: flow.payeeId,
      dueAt: flow.nextAt,
      periodMonths: months,
      source: flow.source,
    };
    if (flow.id === `rent:${h.id}` && flow.amountMinor > 0)
      out.push({
        ...base,
        id: `lease:${h.id}`,
        kind: "household-purchase",
        amountMinor: flow.amountMinor,
        accruesArrears: true,
      });
    const amounts = flow.amountByContract;
    if (!amounts) continue;
    if ((amounts[mortgage] ?? 0) > 0)
      out.push({
        ...base,
        id: mortgage,
        kind: "household-purchase",
        amountMinor: amounts[mortgage]!,
        accruesArrears: true,
      });
    if ((amounts[part] ?? 0) > 0)
      out.push({
        ...base,
        id: `${flow.id}:${h.id}`,
        kind: flow.financeKind,
        amountMinor: amounts[part]!,
        accruesArrears: false,
        ...(flow.salesReceipt ? { salesReceipt: true } : {}),
        ...(flow.marketAdjusted ? { marketAdjusted: true } : {}),
      });
  }
  return [...out, ...h.incomeContracts];
}

/**
 * What a filled-in household takes back from the merged flows: its workers'
 * share of each wage flow, its purchase parts, its mortgage part and its
 * rent. Returns the employer calendars its jobs were paid on and its share of
 * the residents' cash (by opening cash, of everyone still counted there).
 */
export function releaseResidentHousehold(
  core: CoreState,
  record: ResidentHouseholdRecord,
  /** False when the household is gone (its last member died): its payments just end. */
  options: { ownFlows?: boolean } = {},
): {
  calendars: Map<string, WorkPayrollCalendarInput>;
  cashShare: number;
  accountId?: string;
} {
  const rt = runtimes.get(core)!;
  const householdId = record.household.id;
  const jobIds = new Set(record.jobs.map((row) => row.id));
  const parts = partsOf(householdId);
  let outsideLiving: { amount: number; flow: FlowState } | undefined;
  const retirees: FlowState[] = [];
  const incomeIds = new Set(
    record.contracts.filter((row) => row.recipientIncome).map((row) => row.id),
  );
  for (const flow of rt.flows.values()) {
    if (flow.id === `rent:${householdId}` && !flow.endedAt) {
      end(flow, core.date, "filled-in");
      continue;
    }
    if (flow.kind === "wages" && flow.perDayMinorByJob) {
      // Copy only a flow that pays one of these jobs.
      const present = flow.perDayMinorByJob;
      let member = false;
      for (const id of jobIds)
        if (present[id] !== undefined) {
          member = true;
          break;
        }
      if (!member) continue;
      const perDay = { ...present };
      for (const id of jobIds) delete perDay[id];
      flow.perDayMinorByJob = perDay;
      flow.jobIds = (flow.jobIds ?? []).filter((id) => !jobIds.has(id));
      let total = 0;
      for (const value of Object.values(perDay)) total += value;
      flow.amountMinor = Math.round(total * (flow.periodFactor ?? 1));
    } else if (flow.kind === "retirement" && flow.amountByContract) {
      const present = flow.amountByContract;
      if (![...incomeIds].some((id) => present[id] !== undefined)) continue;
      // Each retiree in the household is now paid their own award directly.
      const amounts = { ...flow.amountByContract };
      for (const contract of record.contracts) {
        const amount = amounts[contract.id];
        if (amount === undefined || !contract.recipientIncome) continue;
        delete amounts[contract.id];
        retirees.push({
          ...flow,
          id: `${flow.id}:${contract.recipientIncome.personId}`,
          payeeId: contract.recipientIncome.personId,
          amountMinor: amount,
          amountByContract: { [contract.id]: amount },
          arrearsMinor: 0,
        });
      }
      flow.amountByContract = amounts;
      flow.amountMinor = Object.values(amounts).reduce((n, v) => n + v, 0);
    } else if (flow.kind === "purchase" && flow.amountByContract) {
      const present = flow.amountByContract;
      let removed = 0;
      for (const id of parts) removed += present[id] ?? 0;
      if (!removed) continue;
      const amounts = { ...present };
      for (const id of parts) {
        if (
          id === `household:${householdId}` &&
          flow.financeKind === FIXED_SPENDING &&
          amounts[id]
        )
          outsideLiving = { amount: amounts[id]!, flow };
        delete amounts[id];
      }
      flow.amountByContract = amounts;
      flow.amountMinor = Math.max(0, flow.amountMinor - removed);
    }
  }
  for (const id of jobIds) rt.wageFlowByJob.delete(id);
  const ownFlows = options.ownFlows !== false;
  // Admitted after the scan: the person must be a full person by now.
  for (const flow of ownFlows ? retirees : []) {
    rt.flows.set(flow.id, flow);
    schedule(rt, flow);
  }
  const placeId = record.household.placeId;
  const own = record.people.reduce((n, row) => n + row.liquidMinor, 0);
  const remaining = rt.openingCashByPlace.get(placeId) ?? 0;
  rt.openingCashByPlace.set(placeId, remaining - own);
  // Its share of its group's money goes to its people, by their opening cash.
  const cash = rt.fillInCash.get(householdId);
  rt.fillInCash.delete(householdId);
  let paidFromFund = false;
  if (cash && rt.api && rt.funded && ownFlows) {
    paidFromFund = true;
    const lines: { accountId: string; deltaMinor: number }[] = [];
    const weights = new Map(
      record.people.map((row, i) => [i, Math.max(row.liquidMinor, 1)]),
    );
    let total = 0;
    for (const [i, amount] of splitWhole(cash.amount, weights)) {
      if (amount <= 0 || !core.people.has(record.people[i]!.id)) continue;
      lines.push({
        accountId: rt.api.accounts().main(record.people[i]!.id),
        deltaMinor: amount,
      });
      total += amount;
    }
    if (total > 0)
      transferSplit(core, rt.api, {
        id: `fill-in:${householdId}:cash`,
        lines: [
          { accountId: fundOf(rt.api, rt, cash.group), deltaMinor: -total },
          ...lines,
        ],
        reasonKey: "residents.fill-in.cash",
        source: rt.input.source,
      });
  }
  const calendars = new Map(
    (rt.input.calendars ?? []).map((row) => [row.id, row]),
  );
  // The household now pays its own outside living costs from its payer.
  const payer = record.people.find((row) => row.livingCostDailyMinor > 0);
  if (ownFlows && outsideLiving && payer) {
    const flow: FlowState = {
      ...outsideLiving.flow,
      id: `residents:outside-living:${householdId}`,
      payerId: payer.id,
      amountMinor: outsideLiving.amount,
      amountByContract: undefined,
      arrearsMinor: 0,
    };
    rt.flows.set(flow.id, flow);
    schedule(rt, flow);
  }
  return {
    calendars,
    // Paid from its group's account above; the pool's share is for a world
    // whose groups hold no money yet.
    cashShare: paidFromFund ? 0 : remaining > 0 ? own / remaining : 0,
    accountId: rt.input.accounts.find((row) => row.placeId === placeId)
      ?.accountId,
  };
}

/**
 * Take a person's household out of the counts, for fill-in: its members as
 * person records built from the group's columns (no past: fill-in builds it),
 * its jobs and work, and its standing bills as its own contracts.
 */
export function takeResidentHousehold(
  core: CoreState,
  personId: PersonId,
): ResidentHouseholdRecord | undefined {
  const rt = runtimes.get(core);
  const m = rt?.store.countedMember(personId);
  if (!rt || m === undefined) return undefined;
  const store = rt.store;
  const h = store.households[store.household[m]!]!;
  const members = store.countedMembers(h);
  const people = members.map((i) => store.personInput(i));
  const payers = people
    .filter((row) => row.livingCostDailyMinor > 0)
    .map((row) => row.id);
  const record: ResidentHouseholdRecord = {
    household: {
      id: h.id,
      placeId: h.placeId,
      memberIds: people.map((row) => row.id),
      source: h.source,
    },
    people,
    jobs: [...h.jobs],
    workCommitments: [...h.workCommitments],
    contracts: householdContracts(
      rt,
      h,
      payers.length ? payers : people.slice(0, 1).map((row) => row.id),
    ),
  };
  rt.fillInCash.set(h.id, { group: h.group, amount: householdCash(rt, h) });
  store.retire(h, MemberState.Filled);
  rt.filledIn.add(h.id);
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

/** The account that pays and receives for a place's counted residents (benefits, taxes). */
export function residentsAccountFor(
  core: CoreState,
  placeId: PlaceId,
): string | undefined {
  const row = runtimes
    .get(core)
    ?.input.accounts.find((account) => account.placeId === placeId);
  return row
    ? core.cashJournal.residualAccountByOwner.get(row.accountId)
    : undefined;
}

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
  const store = rt.store;
  for (const h of store.liveHouseholds()) {
    const counts = byPlace.get(h.placeId)!;
    counts.households++;
    for (const m of store.countedMembers(h)) {
      const age = ageOn(store.born[m]!, at);
      counts.people++;
      if (age >= 18) counts.adults++;
      const band = ageBandOf(age);
      counts.byAgeBand[band] = (counts.byAgeBand[band] ?? 0) + 1;
    }
    for (const job of h.jobs) {
      if (endedJobs.has(job.id)) continue;
      counts.workers++;
      counts.workersByOrganization[job.organizationId] =
        (counts.workersByOrganization[job.organizationId] ?? 0) + 1;
    }
  }
  return [...byPlace.values()];
}

export interface MarketEntry {
  organizationId: string;
  placeId: PlaceId;
  /** Purchase kinds it sells (e.g. household.food); or copy a rival's. */
  financeKinds?: readonly string[];
  like?: string;
  /** Yearly sales it can serve, from its own books. */
  capacityMinor: number;
  /** Its price against the market's (1 = the same). */
  relativePrice?: number;
}

const perYear = (flow: FlowState) =>
  flow.cadence.kind === "months"
    ? 12 / flow.cadence.every
    : DAYS_PER_YEAR / flow.cadence.every;

/**
 * A business founded mid-run enters its kinds' market: the counted
 * households' purchases are split again among the sellers by capacity and
 * price (`splitMarketDemand`), each incumbent at its current sales. The
 * entrant's flows take exactly what the incumbents' flows give up, contract
 * by contract, so filling a household in later still takes back its own.
 * Full households keep their own contracts and stores.
 */
export function enterResidentMarket(
  core: CoreState,
  entry: MarketEntry,
): { financeKind: string; annualDemandMinor: number }[] {
  const rt = runtimes.get(core);
  if (!rt) return [];
  if (!core.organizations.has(entry.organizationId))
    throw new Error(`No recorded business: ${entry.organizationId}`);
  const live = [...rt.flows.values()].filter(
    (flow) =>
      flow.kind === "purchase" &&
      !flow.endedAt &&
      flow.placeId === entry.placeId,
  );
  const kinds = new Set(
    entry.financeKinds ??
      live
        .filter((flow) => flow.payeeId === entry.like)
        .map((flow) => flow.financeKind),
  );
  if (!kinds.size)
    throw new Error(
      `No purchase kinds to enter for ${entry.organizationId} (give financeKinds or a rival).`,
    );
  if (live.some((flow) => flow.payeeId === entry.organizationId))
    throw new Error(`Already in this market: ${entry.organizationId}`);
  const result: { financeKind: string; annualDemandMinor: number }[] = [];
  for (const kind of [...kinds].sort()) {
    const flows = live
      .filter((flow) => flow.financeKind === kind && flow.amountByContract)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!flows.length) continue;
    const bySeller = new Map<string, number>();
    for (const flow of flows)
      bySeller.set(
        flow.payeeId,
        (bySeller.get(flow.payeeId) ?? 0) + flow.amountMinor * perYear(flow),
      );
    const total = [...bySeller.values()].reduce((n, v) => n + v, 0);
    const split = splitMarketDemand(total, [
      ...[...bySeller].map(([organizationId, current]) => ({
        organizationId,
        capacityMinor: current,
        relativePrice: 1,
      })),
      {
        organizationId: entry.organizationId,
        capacityMinor: entry.capacityMinor,
        relativePrice: entry.relativePrice ?? 1,
      },
    ]);
    const keep = new Map(
      split.allocations.map((row) => [
        row.organizationId,
        total > 0 ? row.annualDemandMinor / total : 0,
      ]),
    );
    const share = keep.get(entry.organizationId) ?? 0;
    // One entrant flow per residents account, on the largest incumbent's dates.
    const byAccount = new Map<string, FlowState[]>();
    for (const flow of flows)
      byAccount.set(flow.residentsId, [
        ...(byAccount.get(flow.residentsId) ?? []),
        flow,
      ]);
    let annual = 0;
    for (const [residentsId, group] of byAccount) {
      const taken: Record<string, number> = {};
      for (const flow of group) {
        const amounts = { ...flow.amountByContract! };
        for (const [id, amount] of Object.entries(amounts)) {
          const give = Math.round(amount * share);
          if (!give) continue;
          amounts[id] = amount - give;
          taken[id] = (taken[id] ?? 0) + give;
        }
        flow.amountByContract = amounts;
        flow.amountMinor = Object.values(amounts).reduce((n, v) => n + v, 0);
      }
      const amount = Object.values(taken).reduce((n, v) => n + v, 0);
      if (!amount) continue;
      const model = [...group].sort(
        (a, b) => b.amountMinor - a.amountMinor || a.id.localeCompare(b.id),
      )[0]!;
      const flow: FlowState = {
        ...model,
        id: `residents:purchase:${residentsId}:${kind}:${entry.organizationId}`,
        payeeId: entry.organizationId,
        amountMinor: amount,
        amountByContract: taken,
        arrearsMinor: 0,
        firstAt: model.nextAt,
        nextAt: model.nextAt,
      };
      rt.flows.set(flow.id, flow);
      schedule(rt, flow);
      annual += amount * perYear(flow);
    }
    result.push({ financeKind: kind, annualDemandMinor: Math.round(annual) });
  }
  return result;
}

/**
 * A closing employer's counted workers' pay earned since their last payday:
 * each wage flow's amount for the share of its period already worked.
 */
export function countedWagesEarned(
  core: CoreState,
  organizationId: string,
): { residentsId: string; amountMinor: number }[] {
  const rt = runtimes.get(core);
  if (!rt) return [];
  const out: { residentsId: string; amountMinor: number }[] = [];
  for (const flow of rt.flows.values()) {
    if (flow.kind !== "wages" || flow.endedAt) continue;
    if (flow.payerId !== organizationId) continue;
    const periodDays =
      flow.cadence.kind === "days"
        ? flow.cadence.every
        : Math.round((DAYS_PER_YEAR * flow.cadence.every) / 12);
    const remaining = Math.max(
      0,
      Math.round(
        (Date.parse(`${flow.nextAt}T00:00:00Z`) -
          Date.parse(`${core.date}T00:00:00Z`)) /
          86_400_000,
      ),
    );
    const worked = Math.max(0, periodDays - remaining);
    const amount = Math.round((flow.amountMinor * worked) / periodDays);
    if (amount > 0)
      out.push({ residentsId: flow.payeeId, amountMinor: amount });
  }
  return out;
}

/*
 * The counted population's drift (PW-8): births, deaths and moves applied to
 * the records the counts are read from, so counts, fill-in and the merged
 * flows stay one story. Callers decide how many from rates and which record
 * from its circumstances; these only keep the records and flows consistent.
 */

/** Counted households in each place, as recorded today. */
export function countedHouseholdsByPlace(
  core: CoreState,
): Map<PlaceId, ResidentHouseholdRecord[]> {
  const rt = runtimes.get(core);
  const byPlace = new Map<PlaceId, ResidentHouseholdRecord[]>();
  if (!rt) return byPlace;
  for (const row of rt.input.accounts) byPlace.set(row.placeId, []);
  for (const record of rt.households.values())
    byPlace.get(record.household.placeId)?.push(record);
  return byPlace;
}

/**
 * Merged maps the drift may edit in place: copied once (the opening input
 * stays as built), then edited without copying thousands of entries per move.
 */
const ownedMaps = new WeakSet<object>();
function ownMap(map: Readonly<Record<string, number>>): Record<string, number> {
  if (ownedMaps.has(map)) return map as Record<string, number>;
  const copy = { ...map };
  ownedMaps.add(copy);
  return copy;
}

/** Remove counted jobs from their employers' wage flows (the worker is gone). */
function dropCountedJobs(rt: ResidentsRuntime, jobIds: ReadonlySet<string>) {
  if (!jobIds.size) return;
  for (const flow of rt.flows.values()) {
    if (flow.kind !== "wages" || !flow.perDayMinorByJob) continue;
    let changed = false;
    for (const id of jobIds)
      if (flow.perDayMinorByJob[id] !== undefined) changed = true;
    if (!changed) continue;
    const perDay = ownMap(flow.perDayMinorByJob);
    for (const id of jobIds) delete perDay[id];
    flow.perDayMinorByJob = perDay;
    flow.jobIds = (flow.jobIds ?? []).filter((id) => !jobIds.has(id));
    let total = 0;
    for (const value of Object.values(perDay)) total += value;
    flow.amountMinor = Math.round(total * (flow.periodFactor ?? 1));
  }
  for (const id of jobIds) {
    rt.wageFlowByJob.delete(id);
    rt.jobs.delete(id);
  }
}

/** Remove merged contract amounts (retirement awards, household purchases). */
function dropCountedContracts(
  rt: ResidentsRuntime,
  contractIds: ReadonlySet<string>,
  kinds: readonly ResidentFlowInput["kind"][],
) {
  if (!contractIds.size) return;
  for (const flow of rt.flows.values()) {
    if (!kinds.includes(flow.kind) || !flow.amountByContract) continue;
    let removed = 0;
    for (const id of contractIds) removed += flow.amountByContract[id] ?? 0;
    if (!removed) continue;
    const amounts = ownMap(flow.amountByContract);
    for (const id of contractIds) delete amounts[id];
    flow.amountByContract = amounts;
    flow.amountMinor = Math.max(0, flow.amountMinor - removed);
  }
}

/**
 * A counted person died: they leave their household, their job leaves the
 * employer's books and their retirement award stops. Their cash stays with
 * the counted residents (their heirs). A household left empty leaves the
 * counts with its purchases. The household's group follows its facts.
 */
export function removeCountedPerson(core: CoreState, personId: PersonId): void {
  const rt = runtimes.get(core);
  const m = rt?.store.countedMember(personId);
  if (!rt || m === undefined) return;
  const store = rt.store;
  const h = store.households[store.household[m]!]!;
  const jobs = h.jobs.filter((row) => row.personId === personId);
  dropCountedJobs(rt, new Set(jobs.map((row) => row.id)));
  const awards = h.incomeContracts.filter(
    (row) => row.recipientIncome?.personId === personId,
  );
  dropCountedContracts(rt, new Set(awards.map((row) => row.id)), [
    "retirement",
  ]);
  store.state[m] = MemberState.Dead;
  store.version++;
  store.membersVersion++;
  store.touch(h);
  h.jobs = h.jobs.filter((row) => row.personId !== personId);
  h.workCommitments = h.workCommitments.filter(
    (row) => row.personId !== personId,
  );
  h.incomeContracts = h.incomeContracts.filter(
    (row) => row.recipientIncome?.personId !== personId,
  );
  h.wagesMinorYear = h.jobs
    .filter((job) => job.endsAt === undefined)
    .reduce((n, job) => n + job.wageDailyMinor * DAYS_PER_YEAR, 0);
  h.retirementMinorYear = h.incomeContracts.reduce(
    (n, row) => n + (row.amountMinor * 12) / Math.max(1, row.periodMonths),
    0,
  );
  // Their opening cash stays in the place's pool; the heirs hold it.
  const heirs = store.countedMembers(h);
  if (heirs.length) {
    store.liquid[heirs[0]!] = store.liquid[heirs[0]!]! + store.liquid[m]!;
    store.liquid[m] = 0;
    regroupHousehold(rt, h, core.date);
    return;
  }
  endHouseholdFlows(rt, h, core.date);
  rt.openingCashByPlace.set(
    h.placeId,
    (rt.openingCashByPlace.get(h.placeId) ?? 0) - store.liquid[m]!,
  );
  store.retire(h, MemberState.Dead);
}

/** A household leaving the counts: its purchases, mortgage, rent and awards stop here. */
function endHouseholdFlows(
  rt: ResidentsRuntime,
  h: CountedHousehold,
  date: IsoDate,
): void {
  dropCountedJobs(rt, new Set(h.jobs.map((row) => row.id)));
  dropCountedContracts(
    rt,
    new Set([...h.incomeContracts.map((row) => row.id), ...partsOf(h.id)]),
    ["purchase", "retirement"],
  );
  const rent = rt.flows.get(`rent:${h.id}`);
  if (rent && !rent.endedAt) end(rent, date, "household-left");
}

/**
 * A counted household moved away: it leaves the counts, its workers leave
 * their employers' books, its purchases and retirement awards stop here, and
 * its share of the residents' cash leaves with it. Returns that cash share.
 */
export function departCountedHousehold(
  core: CoreState,
  householdId: string,
): { cashShare: number; accountId?: string; placeId: PlaceId } | undefined {
  const rt = runtimes.get(core);
  const ix = rt?.store.householdOf.get(householdId);
  const h = ix === undefined ? undefined : rt!.store.households[ix];
  if (!rt || !h || h.gone) return undefined;
  const store = rt.store;
  endHouseholdFlows(rt, h, makeIsoDate(core.date));
  const placeId = h.placeId;
  const own = store.countedMembers(h).reduce((n, m) => n + store.liquid[m]!, 0);
  const remaining = rt.openingCashByPlace.get(placeId) ?? 0;
  rt.openingCashByPlace.set(placeId, remaining - own);
  // Its share of its group's money leaves with it.
  const cash = householdCash(rt, h);
  const outsideOwner = outsideMarketOf(core, rt, placeId);
  const paidFromFund = !!(rt.api && rt.funded && outsideOwner);
  if (paidFromFund && cash > 0)
    transferSplit(core, rt.api!, {
      id: `counted-departure:${h.id}:${core.date}`,
      lines: [
        { accountId: fundOf(rt.api!, rt, h.group), deltaMinor: -cash },
        {
          accountId: core.cashJournal.residualAccountByOwner.get(
            outsideOwner!,
          )!,
          deltaMinor: cash,
        },
      ],
      reasonKey: "residents.counted-departure.cash",
      source: rt.input.source,
    });
  store.retire(h, MemberState.Moved);
  return {
    cashShare: paidFromFund ? 0 : remaining > 0 ? own / remaining : 0,
    accountId: rt.input.accounts.find((row) => row.placeId === placeId)
      ?.accountId,
    placeId,
  };
}

/** The place's account for buyers, sellers and movers outside the town. */
export function countedOutsideAccount(
  core: CoreState,
  placeId: PlaceId,
): string | undefined {
  const rt = runtimes.get(core);
  return rt ? outsideMarketFor(core, rt, placeId) : undefined;
}

/** A baby born into a counted household joins its record and its group. */
export function addCountedPerson(
  core: CoreState,
  householdId: string,
  person: PersonInput,
): void {
  const rt = runtimes.get(core);
  const ix = rt?.store.householdOf.get(householdId);
  const h = ix === undefined ? undefined : rt!.store.households[ix];
  if (!rt || !h || h.gone)
    throw new Error(`Not a counted household: ${householdId}`);
  const m = rt.store.addMember(person, h.index);
  for (const other of person.familyIds) {
    const o = rt.store.countedMember(other);
    if (o !== undefined && rt.store.household[o] === h.index) h.kin.push(o, m);
  }
  h.members.push(m);
  rt.store.touch(h);
  regroupHousehold(rt, h, core.date);
}

/** A household that moved in joins the counts (no job or contracts yet). */
export function admitCountedHousehold(
  core: CoreState,
  record: ResidentHouseholdRecord,
): void {
  const rt = runtimes.get(core);
  if (!rt) throw new Error("Residents are not admitted.");
  if (rt.store.householdOf.has(record.household.id))
    throw new Error(`Duplicate counted household: ${record.household.id}`);
  const h = rt.store.addHousehold(record, {
    tenure: "other",
    unplacedWorkers: 0,
  });
  regroupHousehold(rt, h, core.date);
  // Newcomers bring their money from outside the town into their group.
  const cash = record.people.reduce((n, row) => n + row.liquidMinor, 0);
  const outsideOwner = outsideMarketOf(core, rt, h.placeId);
  if (rt.api && rt.funded && cash > 0 && outsideOwner)
    transferSplit(core, rt.api, {
      id: `counted-arrival:${h.id}:${core.date}`,
      lines: [
        {
          accountId: core.cashJournal.residualAccountByOwner.get(outsideOwner)!,
          deltaMinor: -cash,
        },
        { accountId: fundOf(rt.api, rt, h.group), deltaMinor: cash },
      ],
      reasonKey: "residents.counted-arrival.cash",
      source: rt.input.source,
    });
}

/**
 * Newcomers move into a counted home its people just left: the old members
 * leave the counts (their jobs and awards end), the newcomers take their
 * places with the home's purchases, mortgage and rent, and no job yet.
 */
export function replaceCountedMembers(
  core: CoreState,
  householdId: string,
  newcomers: readonly PersonInput[],
): void {
  const rt = runtimes.get(core);
  const ix = rt?.store.householdOf.get(householdId);
  const h = ix === undefined ? undefined : rt!.store.households[ix];
  if (!rt || !h || h.gone)
    throw new Error(`Not a counted household: ${householdId}`);
  const store = rt.store;
  dropCountedJobs(rt, new Set(h.jobs.map((row) => row.id)));
  dropCountedContracts(rt, new Set(h.incomeContracts.map((row) => row.id)), [
    "retirement",
  ]);
  for (const m of store.countedMembers(h)) store.state[m] = MemberState.Moved;
  store.membersVersion++;
  store.touch(h);
  const members = newcomers.map((person) => store.addMember(person, h.index));
  const position = new Map(newcomers.map((p, i) => [p.id, members[i]!]));
  h.kin = [];
  for (const person of newcomers)
    for (const other of person.familyIds) {
      const a = position.get(person.id)!,
        b = position.get(other);
      if (b !== undefined && a < b) h.kin.push(a, b);
    }
  h.members = [...h.members, ...members];
  h.jobs = [];
  h.workCommitments = [];
  h.incomeContracts = [];
  h.wagesMinorYear = 0;
  h.retirementMinorYear = 0;
  h.unplacedWorkers = 0;
  regroupHousehold(rt, h, core.date);
}
