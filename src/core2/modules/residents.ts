/**
 * The wider population's money on recorded dates: count workers' wages,
 * retirement income from outside, and household purchases at local firms.
 * Each occurrence is one balanced journal entry; nothing scans the world.
 */
import { registerCountedPersonSource } from "../counted-actor";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  advanceCadence,
  nextMonthDay,
  RESIDENTS_KIND,
  RESIDENTS_STOPGAP,
  type ResidentFlowInput,
  type ResidentHouseholdRecord,
  type ResidentsInput,
} from "../residents";
import { transfer, transferSplit } from "../accounts";
import { livingCostParts } from "../living-cost-split";
import { splitMarketDemand } from "../business-books";
import { OUTSIDE_MARKET_KIND } from "../opening-outside-market";
import { notifyCountedWages, notifySalesReceipt } from "./finance";
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
  Source,
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
  type Tenure,
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
  flowScale,
  splitWhole,
  placeWeights,
  sweepResidual,
  workersByGroup,
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
} as const;

interface FlowState extends ResidentFlowInput {
  nextAt: IsoDate;
  arrearsMinor: number;
  /** A household's living cost written off past the creditors' charge-off age (never paid, never asked again). */
  writtenOffMinor?: number;
  /** Latest settled request and payment, read by lenders rather than opening cash or promised pay. */
  lastRequestedMinor?: number;
  lastPaidMinor?: number;
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
  /** When each filled-in household left the counts. */
  filledAt: Map<string, IsoDate>;
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
  /** The benefit level each retirement flow's amount reflects (1 = base). */
  retirementLevel: Map<string, number>;
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
  fillInCash: Map<string, { group: number; amount: number; unplaced: number }>;
  /** Households released to full people so far: each release names its own transfers, since a household can return to the counts and be filled in again. */
  fillIns: number;
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
      moneyCache,
      ...rest
    } = rt;
    void [_h, _p, _a];
    return {
      ...rest,
      input: undefined,
      store: encodeStore(store),
      moneySerial: moneyCache.serial,
    };
  },
  restore: (core, data) => {
    const rebuilt = runtimes.get(core);
    if (!data || !rebuilt) return void runtimes.delete(core);
    const { moneySerial, ...saved } = data as Omit<
      ResidentsRuntime,
      "store" | "households" | "householdOfPerson"
    > & { store: unknown; moneySerial?: number };
    const store = decodeStore(saved.store);
    runtimes.set(core, {
      ...saved,
      input: rebuilt.input,
      moneyCache: { serial: moneySerial ?? 0 },
      retirementLevel: saved.retirementLevel ?? new Map(),
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

/** A counted-group parameter's spread, as its table gives it. */
export function countedSpread(key: string): { low: number; high: number } {
  const row = (
    COUNTED_ROWS as unknown as Record<
      string,
      { spread?: { low: number; high: number } }
    >
  )[key];
  if (!row?.spread) throw new Error(`Counted parameter has no spread: ${key}`);
  return { low: row.spread.low, high: row.spread.high };
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
  const people = rt.store.weightedCount(h);
  const groupBefore = before >= 0 ? peopleInGroup(rt, before) : 0;
  rt.store.regroup(h, groupKeyOf(rt, h, date));
  // Its share of the old group's money goes with it.
  if (rt.api && before !== h.group)
    moveShare(rt.api, rt, before, h.group, people, groupBefore);
}

/** A household's share of its place's unplaced workers (their pay follows them out of the counts). */
function unplacedShare(rt: ResidentsRuntime, h: CountedHousehold): number {
  if (h.unplacedWorkers <= 0) return 0;
  let total = 0;
  for (const x of rt.store.liveHouseholds())
    if (x.placeId === h.placeId)
      total += x.unplacedWorkers * rt.store.weightOf(x);
  return total > 0 ? h.unplacedWorkers / total : 0;
}

/**
 * A counted household's share of its group's money: the group's account
 * times its people over the group's people.
 */
export function householdCash(
  rt: ResidentsRuntime,
  h: CountedHousehold,
): number {
  return householdCashReader(rt)(h);
}

/**
 * The same read for a pass over many households at one moment: each group's
 * people and fund balance are counted once, not once per household (counting a
 * group's people walks all its households). Valid only until the next posting.
 */
export function householdCashReader(
  rt: ResidentsRuntime,
): (h: CountedHousehold) => number {
  const groups = new Map<number, { people: number; balance: number }>();
  return (h) => {
    if (!rt.api || !rt.funded || h.group < 0) return 0;
    let group = groups.get(h.group);
    if (!group) {
      const people = peopleInGroup(rt, h.group);
      group = {
        people,
        balance: people > 0 ? fundBalance(rt.api, rt, h.group) : 0,
      };
      groups.set(h.group, group);
    }
    return group.people > 0
      ? Math.floor((group.balance * rt.store.countedCount(h)) / group.people)
      : 0;
  };
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
const FILLED_UNPLACED_STOPGAP = "SG-CORE-filled-unplaced-income";

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
  const people = ordered.reduce((n, h) => n + rt.store.weightedCount(h), 0);
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
    filled += rt.store.weightedCount(h);
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
        ...weightOf(input.weights, placeId),
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
    // A record stands for as many households as its weight says.
    eligible.set(
      h.placeId,
      (eligible.get(h.placeId) ?? 0) + n * store.weightOf(h),
    );
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

/** The weight a place's counted households carry, as facts for `addHousehold`. */
function weightOf(
  weights: ResidentsInput["weights"],
  placeId: PlaceId,
): { weight?: number } {
  const weight = weights?.[placeId];
  return weight !== undefined && weight !== 1 ? { weight } : {};
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
      ...(input.weights ? { weights: input.weights } : {}),
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
    filledAt: new Map(),
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
    retirementLevel: new Map(),
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
    fillIns: 0,
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

/**
 * What a household's living cost takes from each member who can pay it: the
 * bill's payer first, then the others living there in id order, each from what
 * they hold, until the amount is met.
 */
function livingLegs(
  core: CoreState,
  householdId: string,
  payerId: string,
  amount: number,
): { payerId: string; amount: number }[] {
  const members = (core.households.get(householdId)?.memberIds ?? [])
    .filter((id) => id !== payerId && core.people.get(id)?.alive)
    .sort();
  const legs: { payerId: string; amount: number }[] = [];
  let left = amount;
  for (const id of [payerId, ...members]) {
    if (left <= 0) break;
    const pay = Math.min(left, spendable(core, id));
    if (pay <= 0) continue;
    legs.push({ payerId: id, amount: pay });
    left -= pay;
  }
  return legs;
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
    const amounts = ownMap(flow.amountByContract!);
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

const WAGES_CREDIT_STOPGAP = "SG-WORLD-wages-skip-credit-line";

/** The household's oldest living member who pays living costs, ties broken by id. */
function livingPayerOf(
  core: CoreState,
  householdId: string,
): string | undefined {
  const members = core.households.get(householdId)?.memberIds ?? [];
  return members
    .map((id) => core.people.get(id))
    .filter((m) => m?.alive && m.livingCostDailyMinor > 0)
    .sort(
      (a, b) =>
        a!.birthDate.localeCompare(b!.birthDate) || a!.id.localeCompare(b!.id),
    )[0]?.id;
}

function settle(api: CoreAPI, rt: ResidentsRuntime, flow: FlowState): void {
  const core = api.state,
    date = core.date,
    finance = core.finance;
  if (flow.endsAt && date >= flow.endsAt) return end(flow, date, "ended");
  // A household bill is paid by someone living: when its payer has died the
  // household's oldest living payer takes it over, and with none left it ends,
  // so the dead person's account stays whole for their estate.
  const payerPerson = core.people.get(flow.payerId);
  if (payerPerson && !payerPerson.alive) {
    const successor = livingPayerOf(core, payerPerson.householdId);
    if (!successor) return end(flow, date, "payer-died");
    flow.payerId = successor;
  }
  // Nothing is paid to someone who has died: their wages stop with them.
  const payeePerson = core.people.get(flow.payeeId);
  if (payeePerson && !payeePerson.alive) return end(flow, date, "payee-died");
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
  if (flow.payIndexed) base = Math.round(base * payLevel(core, flow.placeId));
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
  // Each part of the flow stands for as many real households as its
  // household's weight says (one model, two tiers).
  if (countedPays || countedPaid) {
    const times = flowScale(rt, flow);
    if (times !== 1) base = Math.round(base * times);
  }
  const fixed =
    flow.financeKind === FIXED_SPENDING || HOUSING_KINDS.has(flow.financeKind);
  // A household's living cost it could not pay is carried and asked again each
  // day until paid (like rent), so cash that arrives after the 1st still pays it.
  const carries =
    flow.financeKind === FIXED_SPENDING && !countedPays && !countedPaid;
  const askedBefore = carries ? flow.arrearsMinor : 0;
  if (carries && date < flow.nextAt) base = 0;
  let requested =
    base + (flow.kind === "wages" || carries ? flow.arrearsMinor : 0);
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
        // A part of the living cost is a government's charges (budgets).
        if (flow.financeKind === FIXED_SPENDING) {
          const governments = livingCostParts(
            core,
            flow.placeId,
            total,
          ).flatMap((row) => {
            const accountId = core.cashJournal.residualAccountByOwner.get(
              row.organizationId,
            );
            return accountId ? [{ accountId, deltaMinor: row.minor }] : [];
          });
          return [
            {
              accountId: seller,
              deltaMinor:
                total - governments.reduce((n, row) => n + row.deltaMinor, 0),
            },
            ...governments,
          ];
        }
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
    // A household's living cost is paid by the bill's payer first, then by the
    // household's other living members, each from what they hold.
    const legs =
      carries && payerPerson && !outside
        ? livingLegs(core, payerPerson.householdId, flow.payerId, requested)
        : [{ payerId: flow.payerId, amount: 0 }];
    paid = outside
      ? requested
      : carries && payerPerson
        ? legs.reduce((n, leg) => n + leg.amount, 0)
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
      // The employer's share of payroll tax on those counted wages.
      if (flow.kind === "wages" && !outside) {
        const workers = [...workersByGroup(rt, flow).values()].reduce(
          (sum, n) => sum + n,
          0,
        );
        if (workers > 0)
          notifyCountedWages(api, {
            id: `${flow.id}@${date}`,
            date,
            employerId: flow.payerId,
            placeId: flow.placeId,
            paidMinor: paid,
            workers,
            periodDays:
              flow.cadence.kind === "days"
                ? flow.cadence.every
                : Math.round((365 / 12) * flow.cadence.every),
          });
      }
    } else if (paid > 0 && carries && payerPerson && !outside) {
      for (const leg of legs)
        if (leg.amount > 0) post(api, flow, leg.amount, leg.payerId);
    } else if (paid > 0) post(api, flow, paid);
  }
  if (carries) {
    // What is still unpaid after the creditors' charge-off age (a number of
    // monthly bills) is written off: it stays on the books as written off and
    // is not asked again, so a household with no job and no cash does not owe
    // a growing sum forever.
    const owed = requested - paid;
    const ceiling = Math.round(
      flow.amountMinor * api.parameter("livingCostWriteOffBills"),
    );
    flow.arrearsMinor = Math.min(owed, ceiling);
    if (owed > ceiling)
      flow.writtenOffMinor = (flow.writtenOffMinor ?? 0) + (owed - ceiling);
  }
  flow.lastRequestedMinor = requested;
  flow.lastPaidMinor = paid;
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
      // stopgapId: SG-WORLD-wages-skip-credit-line
      // Wages short of cash are recorded as a shortfall; an approved credit
      // line on the employer is not drawn, because the credit engine draws
      // only against a standing finance contract (drawCredit), not a flow.
      if (payerBook.creditFacilityId) api.stopgap(WAGES_CREDIT_STOPGAP);
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
    requestedMinor: totals.requestedMinor + requested - askedBefore,
    paidMinor: totals.paidMinor + paid,
    unfundedMinor: totals.unfundedMinor + (requested - askedBefore - paid),
  });
}

function post(
  api: CoreAPI,
  flow: FlowState,
  paid: number,
  payerId: string = flow.payerId,
): void {
  const core = api.state;
  const governments =
    flow.financeKind === FIXED_SPENDING
      ? livingCostParts(core, flow.placeId, paid).flatMap((row) => {
          const accountId = core.cashJournal.residualAccountByOwner.get(
            row.organizationId,
          );
          return accountId ? [{ accountId, deltaMinor: row.minor }] : [];
        })
      : [];
  if (governments.length) {
    const toGovernments = governments.reduce((n, row) => n + row.deltaMinor, 0);
    transferSplit(core, api, {
      id: `${flow.id}@${core.date}${payerId === flow.payerId ? "" : `:${payerId}`}`,
      lines: [
        {
          accountId: core.cashJournal.residualAccountByOwner.get(payerId)!,
          deltaMinor: -paid,
        },
        {
          accountId: core.cashJournal.residualAccountByOwner.get(flow.payeeId)!,
          deltaMinor: paid - toGovernments,
        },
        ...governments,
      ],
      reasonKey: flow.financeKind,
      source: flow.source,
    });
    return;
  }
  transfer(core, api, {
    id: `${flow.id}@${core.date}${payerId === flow.payerId ? "" : `:${payerId}`}`,
    from: core.cashJournal.residualAccountByOwner.get(payerId)!,
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
export function outsideMarketFor(
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
    const monthly =
      (flow.amountMinor * perYear(flow) * flowScale(rt, flow)) / 12;
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
    const retry = core.date < flow.nextAt;
    settle(api, rt, flow);
    if (flow.endedAt) continue;
    if (!retry) flow.nextAt = advanceCadence(flow.nextAt, flow.cadence);
    schedule(rt, flow);
    // What a household could not pay is asked again tomorrow, until the next bill.
    if (flow.arrearsMinor > 0 && flow.financeKind === FIXED_SPENDING) {
      const tomorrow = makeIsoDate(addDays(makeIsoDate(core.date), 1));
      if (tomorrow < flow.nextAt) {
        const ids = rt.due.get(tomorrow) ?? new Set<string>();
        ids.add(flow.id);
        rt.due.set(tomorrow, ids);
      }
    }
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

registerCountedPersonSource(residentPerson);

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

/**
 * The flows a filled-in household can be taking its share back from: the
 * pooled wage flows (they name jobs), the pooled retirement and purchase
 * flows (they name contracts). Most flows are one household's own rent, which
 * a fill-in finds by its id, so the scan skips them; the list keeps the order
 * of the flows and grows with them, since flows are only ever added.
 */
const pooled = new WeakMap<object, { scanned: number; ids: string[] }>();
export function* pooledFlows(rt: ResidentsRuntime): Generator<FlowState> {
  let seen = pooled.get(rt.flows);
  if (!seen) pooled.set(rt.flows, (seen = { scanned: 0, ids: [] }));
  const pools = (flow: FlowState) =>
    (flow.kind === "wages" && flow.perDayMinorByJob) ||
    ((flow.kind === "retirement" || flow.kind === "purchase") &&
      flow.amountByContract);
  if (seen.scanned < rt.flows.size) {
    let at = 0;
    for (const [id, flow] of rt.flows) {
      if (at++ < seen.scanned) continue;
      if (pools(flow)) seen.ids.push(id);
    }
    seen.scanned = rt.flows.size;
  }
  // By id, so a flow replaced since is read as it stands now.
  for (const id of seen.ids) {
    const flow = rt.flows.get(id)!;
    if (pools(flow)) yield flow;
  }
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
  core: CoreState,
  rt: ResidentsRuntime,
  h: CountedHousehold,
  payerIds: readonly PersonId[],
): FinanceContractInput[] {
  if (!payerIds.length) return [];
  const contracts = core.finance.contracts;
  const out: FinanceContractInput[] = [];
  const part = householdPart(h.id),
    mortgage = `${MORTGAGE_KEY}${h.id}`;
  for (const flow of rt.flows.values()) {
    if (flow.endedAt || flow.kind !== "purchase") continue;
    // Bills to someone outside the town stay flows of the household's own
    // (releaseResidentHousehold), as its outside living costs do.
    if (core.organizations.get(flow.payeeId)?.outsideFlow !== undefined)
      continue;
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
  // A household filled in a second time (it returned to the counts between)
  // takes new contract ids; its first ones are on record, ended.
  const taken = (id: string) => contracts.has(id);
  return [
    ...out.map((row) =>
      taken(row.id) ? { ...row, id: `${row.id}@${row.dueAt}` } : row,
    ),
    ...h.incomeContracts,
  ];
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
  /** This release's number, for naming its transfers. */
  sequence: number;
} {
  const rt = runtimes.get(core)!;
  const householdId = record.household.id;
  const sequence = (rt.fillIns += 1);
  const jobIds = new Set(record.jobs.map((row) => row.id));
  const parts = partsOf(householdId);
  let outsideLiving: { amount: number; flow: FlowState } | undefined;
  const ownOutside: { amount: number; flow: FlowState }[] = [];
  const retirees: FlowState[] = [];
  const incomeIds = new Set(
    record.contracts.filter((row) => row.recipientIncome).map((row) => row.id),
  );
  // The household's own rent ends; the scan below is of the pooled flows only.
  const rent = rt.flows.get(`rent:${householdId}`);
  if (rent && rent.id === `rent:${householdId}` && !rent.endedAt)
    end(rent, core.date, "filled-in");
  for (const flow of pooledFlows(rt)) {
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
      const perDay = ownMap(present);
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
      const amounts = ownMap(flow.amountByContract);
      for (const contract of record.contracts) {
        const amount = amounts[contract.id];
        if (amount === undefined || !contract.recipientIncome) continue;
        delete amounts[contract.id];
        // The retiree's own award is at the level its pooled flow was paid.
        const level = rt.retirementLevel.get(flow.id);
        if (level !== undefined)
          rt.retirementLevel.set(
            `${flow.id}:${contract.recipientIncome.personId}`,
            level,
          );
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
      const outside =
        core.organizations.get(flow.payeeId)?.outsideFlow !== undefined;
      for (const id of parts) {
        if (
          id === `household:${householdId}` &&
          flow.financeKind === FIXED_SPENDING &&
          amounts[id]
        )
          outsideLiving = { amount: amounts[id]!, flow };
        else if (outside && amounts[id])
          ownOutside.push({ amount: amounts[id]!, flow });
        delete amounts[id];
      }
      flow.amountByContract = amounts;
      flow.amountMinor = Math.max(0, flow.amountMinor - removed);
    }
  }
  // The jobs are full records now (core.jobs): the counted books keep no row for them.
  for (const id of jobIds) {
    rt.wageFlowByJob.delete(id);
    rt.jobs.delete(id);
  }
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
        id: `fill-in:${householdId}:${sequence}:cash`,
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
  // Its workers without a recorded job keep their pay: its share of the
  // place's unplaced workers' flow becomes a flow of its own, to its
  // working-age people (SG-CORE-filled-unplaced-income).
  if (ownFlows && cash && cash.unplaced > 0) {
    const unplaced = [...rt.flows.values()].find(
      (flow) =>
        !flow.endedAt &&
        flow.financeKind === "work.unplaced-residents" &&
        flow.placeId === placeId,
    );
    const worker = record.people.find(
      (row) => row.livingCostDailyMinor > 0 && core.people.has(row.id),
    );
    if (unplaced && worker) {
      const amount = Math.round(unplaced.amountMinor * cash.unplaced);
      if (amount > 0) {
        stopgap(FILLED_UNPLACED_STOPGAP);
        unplaced.amountMinor -= amount;
        const flow: FlowState = {
          ...unplaced,
          id: `${unplaced.id}:${householdId}`,
          payeeId: worker.id,
          amountMinor: amount,
          arrearsMinor: 0,
        };
        rt.flows.set(flow.id, flow);
        schedule(rt, flow);
      }
    }
  }
  // Its bills to someone outside the town (a mortgage held outside, outside
  // purchases) are paid from its payer as flows of its own.
  for (const own of ownFlows && payer ? ownOutside : []) {
    const flow: FlowState = {
      ...own.flow,
      id: `${own.flow.id}:${householdId}`,
      payerId: payer!.id,
      amountMinor: own.amount,
      amountByContract: undefined,
      arrearsMinor: 0,
    };
    rt.flows.set(flow.id, flow);
    schedule(rt, flow);
  }
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
    sequence,
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
      core,
      rt,
      h,
      payers.length ? payers : people.slice(0, 1).map((row) => row.id),
    ),
  };
  rt.fillInCash.set(h.id, {
    group: h.group,
    amount: householdCash(rt, h),
    unplaced: unplacedShare(rt, h),
  });
  // One real household is filled in; the rest it stood for stay counted.
  store.releaseWeight(h);
  store.retire(h, MemberState.Filled);
  rt.filledIn.add(h.id);
  rt.filledAt.set(h.id, makeIsoDate(core.date));
  return record;
}

/** The place's pay level against the opening (latest finance condition's wage factor). */
function payLevel(core: CoreState, placeId: string): number {
  const conditions = core.finance.conditionsByPlace.get(placeId);
  if (!conditions) return 1;
  let factor = 1;
  for (const row of conditions)
    if (row.at <= core.date) factor = row.wagePriceFactor;
  return factor;
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

/**
 * Counts of the wider population by place, age and employer, from its
 * records, each record times the households it stands for (its weight).
 */
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
    // A record stands for as many households as its weight says.
    const weight = store.weightOf(h);
    counts.households += weight;
    for (const m of store.countedMembers(h)) {
      const age = ageOn(store.born[m]!, at);
      counts.people += weight;
      if (age >= 18) counts.adults += weight;
      const band = ageBandOf(age);
      counts.byAgeBand[band] = (counts.byAgeBand[band] ?? 0) + weight;
    }
    for (const job of h.jobs) {
      if (endedJobs.has(job.id)) continue;
      counts.workers += weight;
      counts.workersByOrganization[job.organizationId] =
        (counts.workersByOrganization[job.organizationId] ?? 0) + weight;
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

/**
 * What a place's households owe each month for living costs paid outside the
 * town's sellers (the fixed spending), counted groups times their weights.
 */
export function monthlyLivingCostMinor(
  core: CoreState,
  placeId: PlaceId,
): number {
  const rt = runtimes.get(core);
  if (!rt) return 0;
  let total = 0;
  for (const flow of rt.flows.values()) {
    if (
      flow.endedAt ||
      flow.kind !== "purchase" ||
      flow.financeKind !== FIXED_SPENDING ||
      flow.placeId !== placeId
    )
      continue;
    total +=
      flow.payerId === flow.residentsId
        ? (flow.amountMinor * perYear(flow) * flowScale(rt, flow)) / 12
        : (flow.amountMinor * perYear(flow)) / 12;
  }
  return Math.round(total);
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
        const amounts = ownMap(flow.amountByContract!);
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
/**
 * A flow's parts map this module may change in place: copied once on the
 * first change (the opening's maps may be shared or frozen), then reused.
 * A merged flow holds a part for every counted household, so copying it on
 * every change was most of fill-in's cost.
 */
export function ownMap(
  map: Readonly<Record<string, number>>,
): Record<string, number> {
  if (ownedMaps.has(map)) return map as Record<string, number>;
  const copy = { ...map };
  ownedMaps.add(copy);
  return copy;
}

/**
 * Every job row the counted books hold for these people: the household's
 * opening jobs and the ones its members were hired into since (those live in
 * `rt.jobs` only), so a leaver never leaves a job standing for a person who
 * is gone.
 */
function countedJobIdsOf(
  rt: ResidentsRuntime,
  householdJobs: readonly JobInput[],
  personIds: ReadonlySet<PersonId>,
): Set<string> {
  const ids = new Set(
    householdJobs
      .filter((row) => personIds.has(row.personId))
      .map((row) => row.id),
  );
  for (const job of rt.jobs.values())
    if (personIds.has(job.personId)) ids.add(job.id);
  return ids;
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
export function removeCountedPerson(
  core: CoreState,
  personId: PersonId,
): readonly { readonly heirId: PersonId; readonly amountMinor: number }[] {
  const rt = runtimes.get(core);
  const m = rt?.store.countedMember(personId);
  if (!rt || m === undefined) return [];
  const store = rt.store;
  const h = store.households[store.household[m]!]!;
  dropCountedJobs(rt, countedJobIdsOf(rt, h.jobs, new Set([personId])));
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
  // Their cash stays in the place's pool and passes to the household that
  // outlives them, as a full person's estate does: to the kin of theirs who
  // live there in equal shares (the first takes the odd cents), else to
  // whoever lives there. It is returned so the town's record names each heir.
  const survivors = store.countedMembers(h);
  if (survivors.length) {
    const kin = new Set<number>();
    for (let i = 0; i < h.kin.length; i += 2) {
      if (h.kin[i] === m) kin.add(h.kin[i + 1]!);
      else if (h.kin[i + 1] === m) kin.add(h.kin[i]!);
    }
    const near = survivors.filter((member) => kin.has(member));
    const takers = (near.length ? near : survivors).sort((a, b) =>
      store.ids[a]!.localeCompare(store.ids[b]!),
    );
    const estate = store.liquid[m]!;
    const share = Math.floor(estate / takers.length);
    const paid = takers.map((member, index) => {
      const amountMinor =
        index === 0 ? estate - share * (takers.length - 1) : share;
      store.liquid[member] = store.liquid[member]! + amountMinor;
      return { heirId: store.ids[member]! as PersonId, amountMinor };
    });
    store.liquid[m] = 0;
    regroupHousehold(rt, h, core.date);
    return paid.filter((row) => row.amountMinor > 0);
  }
  endHouseholdFlows(rt, h, core.date);
  rt.openingCashByPlace.set(
    h.placeId,
    (rt.openingCashByPlace.get(h.placeId) ?? 0) - store.liquid[m]!,
  );
  store.retire(h, MemberState.Dead);
  return [];
}

/** A household leaving the counts: its purchases, mortgage, rent and awards stop here. */
function endHouseholdFlows(
  rt: ResidentsRuntime,
  h: CountedHousehold,
  date: IsoDate,
): void {
  dropCountedJobs(
    rt,
    countedJobIdsOf(
      rt,
      h.jobs,
      new Set(rt.store.countedMembers(h).map((m) => rt.store.ids[m]!)),
    ),
  );
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
  /** Real households it stands for; the place's weight when omitted. */
  weight?: number,
): void {
  const rt = runtimes.get(core);
  if (!rt) throw new Error("Residents are not admitted.");
  if (rt.store.householdOf.has(record.household.id))
    throw new Error(`Duplicate counted household: ${record.household.id}`);
  const h = rt.store.addHousehold(record, {
    tenure: "other",
    unplacedWorkers: 0,
    ...(weight !== undefined && weight !== 1
      ? { weight }
      : weightOf(rt.input.weights, record.household.placeId)),
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

/**
 * A full household returns to the counts (demotion): its people are packed
 * into its group again under their own ids, with the jobs and income it
 * brings, and its standing bills as parts of the merged flows (the caller
 * ends its own contracts and moves its cash). Returns the household.
 */
export function returnToCounts(
  core: CoreState,
  record: ResidentHouseholdRecord,
  facts: {
    tenure: Tenure;
    /** Merged-flow parts its bills become: flow id to amount. */
    parts: ReadonlyMap<string, number>;
    /** A rent it pays, payee and amount: a counted rent flow again. */
    rent?: { payeeId: string; amountMinor: number; source: Source };
  },
): CountedHousehold {
  const rt = runtimes.get(core);
  if (!rt) throw new Error("Residents are not admitted.");
  const h = rt.store.addHousehold(record, {
    tenure: facts.tenure,
    unplacedWorkers: 0,
  });
  for (const contract of h.incomeContracts)
    rt.incomeContractHousehold.set(contract.id, h.index);
  rt.filledIn.delete(h.id);
  rt.filledAt.delete(h.id);
  const part = householdPart(h.id);
  for (const [flowId, amount] of facts.parts) {
    const flow = rt.flows.get(flowId);
    if (!flow || flow.endedAt || !flow.amountByContract || amount <= 0)
      continue;
    const key = flowId.startsWith(MORTGAGE_KEY)
      ? `${MORTGAGE_KEY}${h.id}`
      : part;
    flow.amountByContract = {
      ...flow.amountByContract,
      [key]: (flow.amountByContract[key] ?? 0) + amount,
    };
    flow.amountMinor += amount;
  }
  const account = rt.input.accounts.find(
    (row) => row.placeId === h.placeId,
  )?.accountId;
  if (facts.rent && account) {
    const flow: FlowState = {
      id: `rent:${h.id}`,
      kind: "purchase",
      financeKind: "household.rent",
      payerId: account,
      payeeId: facts.rent.payeeId,
      residentsId: account,
      placeId: h.placeId,
      amountMinor: facts.rent.amountMinor,
      firstAt: nextMonthDay(makeIsoDate(addDays(makeIsoDate(core.date), 1)), 1),
      nextAt: nextMonthDay(makeIsoDate(addDays(makeIsoDate(core.date), 1)), 1),
      cadence: { kind: "months", every: 1, day: 1 },
      salesReceipt: false,
      marketAdjusted: false,
      source: facts.rent.source,
      arrearsMinor: 0,
    };
    rt.flows.set(flow.id, flow);
    schedule(rt, flow);
  }
  regroupHousehold(rt, h, core.date);
  return h;
}

/** A counted household's group's account, opening it if needed (money a demotion brings). */
export function countedFundOf(
  core: CoreState,
  householdId: string,
): string | undefined {
  const rt = runtimes.get(core);
  const ix = rt?.store.householdOf.get(householdId);
  if (!rt || ix === undefined || !rt.api) return undefined;
  const h = rt.store.households[ix]!;
  return h.gone || h.group < 0 ? undefined : fundOf(rt.api, rt, h.group);
}

/** A payday calendar a returning worker was paid on, kept so a later fill-in pays them on it again. */
export function keepCalendar(
  core: CoreState,
  calendar: WorkPayrollCalendarInput,
): void {
  const rt = runtimes.get(core);
  if (!rt) return;
  const calendars = rt.input.calendars ?? [];
  if (calendars.some((row) => row.id === calendar.id)) return;
  rt.input = { ...rt.input, calendars: [...calendars, calendar] };
}

/**
 * A household returning to the counts brings its unplaced workers' pay back
 * to its place's flow, and its share of those workers with it.
 */
export function returnUnplacedPay(
  core: CoreState,
  householdId: string,
  ownFlowId: string,
): void {
  const rt = runtimes.get(core);
  const own = rt?.flows.get(ownFlowId);
  const ix = rt?.store.householdOf.get(householdId);
  if (!rt || !own || own.endedAt || ix === undefined) return;
  const base = rt.flows.get(ownFlowId.slice(0, -`:${householdId}`.length));
  end(own, makeIsoDate(core.date), "returned-to-counts");
  if (!base || base.endedAt) return;
  const h = rt.store.households[ix]!;
  let others = 0;
  for (const x of rt.store.liveHouseholds())
    if (x.placeId === h.placeId && x !== h) others += x.unplacedWorkers;
  const share = own.amountMinor / (base.amountMinor + own.amountMinor);
  base.amountMinor += own.amountMinor;
  h.unplacedWorkers = share < 1 ? (share * others) / (1 - share) : 0;
  regroupHousehold(rt, h, core.date);
}

/**
 * Retirement benefits paid to the counts follow the benefit line in force:
 * every retirement flow (the counted groups' pooled awards and the awards of
 * people filled in from them) is paid at `level` times its base amount from
 * its next payment on, the same rule a full person's award follows. Returns
 * each flow whose amount changed.
 */
export function rerateCountedRetirement(
  core: CoreState,
  level: number,
): { flowId: string; fromMinor: number; toMinor: number }[] {
  const rt = runtimes.get(core);
  if (!rt || !(level > 0)) return [];
  const changed: { flowId: string; fromMinor: number; toMinor: number }[] = [];
  for (const flow of rt.flows.values()) {
    if (flow.kind !== "retirement" || flow.endedAt) continue;
    const ratio = level / (rt.retirementLevel.get(flow.id) ?? 1);
    rt.retirementLevel.set(flow.id, level);
    if (ratio === 1) continue;
    const fromMinor = flow.amountMinor;
    if (flow.amountByContract) {
      const amounts: Record<string, number> = {};
      let total = 0;
      for (const [id, amount] of Object.entries(flow.amountByContract)) {
        amounts[id] = Math.round(amount * ratio);
        total += amounts[id];
      }
      flow.amountByContract = amounts;
      flow.amountMinor = total;
    } else flow.amountMinor = Math.round(flow.amountMinor * ratio);
    changed.push({ flowId: flow.id, fromMinor, toMinor: flow.amountMinor });
  }
  return changed;
}
