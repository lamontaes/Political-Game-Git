/**
 * The counted population's reads: the residents runtime a world keeps and the
 * questions asked of it (a resident's facts, a counted household, its job,
 * group, staff and children, the households by place, what suppliers are owed,
 * a household's income and living cost, a group's fund, the unplaced workers'
 * pay). They live here, away from the residents engine, and import only the
 * kernel, the parameters, the counted groups and money reads and the residents
 * table, none of them in a ring, so a reader takes them without loading the
 * engine's ring. modules/residents.ts re-exports each one and stays the one
 * writer of the runtime.
 */
import type { ResidentWageShortfall } from "./budgets-treasury";
import type { CountedHousehold } from "./counted-groups";
import type { ResidentsRuntime, ResidentFacts } from "./modules/residents";
import type { ResidentHouseholdRecord } from "./residents";
import type {
  CoreState,
  JobInput,
  PersonId,
  PersonInput,
  PlaceId,
} from "./types";
import { type ResidentFlowInput, unplacedPoolOf } from "./residents";
import type { IsoDate } from "./types";
import type { ResidentCounts } from "./modules/residents";
import { default as COUNTED_ROWS } from "./data/counted/parameters.json";
import { fieldsOf } from "./module-fields";
import {
  type GroupKey,
  ageOn,
  type HouseholdKind,
  type HeadWork,
  ageBandOf,
} from "./counted-groups";
import { parameter } from "./parameters";
import { incomeBandOf, wageIndexToday } from "./counted-income-reads";
import {
  claimsInGroup,
  fundBalance,
  savingWeight,
  flowScale,
  fundOf,
} from "./counted-money-reads";
import { corePlaceByKey } from "./place-lookup";
import { makeIsoDate } from "./kernel/dates";
import { DAYS_PER_YEAR } from "./household-income";
import type { CoreAPI } from "./types";

export const runtimes = new WeakMap<CoreState, ResidentsRuntime>();

export function residentsRuntime(
  core: CoreState,
): ResidentsRuntime | undefined {
  return runtimes.get(core);
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

/** How many jobs at an employer are held by people in the wider population, while their wages are still paid (by the employer or the treasury that funds it). */
export function countedStaffOf(
  core: CoreState,
  organizationId: string,
): number {
  const rt = runtimes.get(core);
  if (!rt) return 0;
  let jobs = 0;
  for (const [jobId, job] of rt.jobs)
    if (job.organizationId === organizationId && countedJob(core, jobId))
      jobs += 1;
  return jobs;
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

/** A counted person's place, birth date, job and traits read from the columns; undefined once they are filled in, dead or moved. */
export function residentFacts(
  core: CoreState,
  personId: PersonId,
): ResidentFacts | undefined {
  const store = runtimes.get(core)?.store;
  const m = store?.countedMember(personId);
  if (!store || m === undefined) return undefined;
  return store.factsOf(m);
}

/** The id of the counted group a counted person's household stands in today, if any. */
export function countedGroupIdOf(
  core: CoreState,
  personId: PersonId,
): string | undefined {
  const rt = runtimes.get(core);
  const household = countedHouseholdOf(core, personId);
  return household && household.group >= 0
    ? rt?.store.groups[household.group]?.id
    : undefined;
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

/** How many people under the voting age live in a counted person's household, for a reader that weighs what a run costs the family. */
export function countedChildrenOf(
  core: CoreState,
  personId: PersonId,
  adultAge: number,
): number {
  const rt = runtimes.get(core);
  const home = countedHouseholdOf(core, personId);
  if (!rt || !home) return 0;
  const year = Number(core.date.slice(0, 4));
  return rt.store
    .factsOfHousehold(home)
    .filter((row) => year - Number(row.birthDate.slice(0, 4)) < adultAge)
    .length;
}

export function residentWageShortfall(
  core: CoreState,
  id: string,
): ResidentWageShortfall | undefined {
  return runtimes.get(core)?.shortfalls.get(id);
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

/** Counted households in each place, as recorded today. */
export function countedHouseholdsByPlace(
  core: CoreState,
): Map<PlaceId, ResidentHouseholdRecord[]> {
  const rt = runtimes.get(core);
  const byPlace = new Map<PlaceId, ResidentHouseholdRecord[]>();
  if (!rt) return byPlace;
  for (const row of rt.input.accounts) byPlace.set(row.placeId, []);
  // The live households in record order, as `rt.households` yields them.
  const store = rt.store;
  for (const h of store.households)
    if (!h.gone) byPlace.get(h.placeId)?.push(store.householdView(h));
  return byPlace;
}

/** What each counted household pays these schools now, by household: the school and the monthly amount of its record. */
export function countedTuitionPlans(
  core: CoreState,
  schoolIds: ReadonlySet<string>,
  financeKind: string,
): Map<string, { schoolId: string; monthlyMinor: number }> {
  const rt = runtimes.get(core);
  const out = new Map<string, { schoolId: string; monthlyMinor: number }>();
  if (!rt) return out;
  const prefix = "hh:";
  for (const flow of rt.flows.values()) {
    if (
      flow.endedAt ||
      flow.kind !== "purchase" ||
      flow.financeKind !== financeKind ||
      !schoolIds.has(flow.payeeId) ||
      !flow.amountByContract
    )
      continue;
    for (const [key, amount] of Object.entries(flow.amountByContract))
      if (key.startsWith(prefix) && amount > 0)
        out.set(key.slice(prefix.length), {
          schoolId: flow.payeeId,
          monthlyMinor: amount,
        });
  }
  return out;
}

/**
 * The counted residents' Social Security awards running now, for the law
 * reach: each pooled flow's payee, its amount, the retirees it pays and the
 * line level it was last rated at (`rerateCountedRetirement`).
 */
export function countedRetirementAwards(core: CoreState): {
  readonly flowId: string;
  readonly payeeId: string;
  readonly placeId: string;
  readonly amountMinor: number;
  readonly retirees: number;
  readonly level: number;
}[] {
  const rt = runtimes.get(core);
  if (!rt) return [];
  const out = [];
  for (const flow of rt.flows.values()) {
    if (flow.kind !== "retirement" || flow.endedAt) continue;
    out.push({
      flowId: flow.id,
      payeeId: flow.payeeId,
      placeId: flow.placeId,
      amountMinor: flow.amountMinor,
      retirees: Math.max(1, Object.keys(flow.amountByContract ?? {}).length),
      level: rt.retirementLevel.get(flow.id) ?? 1,
    });
  }
  return out;
}

export interface FlowState extends ResidentFlowInput {
  nextAt: IsoDate;
  arrearsMinor: number;
  /** A household's living cost written off past the creditors' charge-off age (never paid, never asked again). */
  writtenOffMinor?: number;
  /** Latest settled request and payment, read by lenders rather than opening cash or promised pay. */
  lastRequestedMinor?: number;
  lastPaidMinor?: number;
  lastPaidMonth?: string;
  /** outside-costs: the firm's receipts and local purchases already counted. */
  receivedMinor?: number;
  /** Local operating payments when the flow started (a baseline). */
  localPaidMinor?: number;
  accruedCostMinor?: number;
  accrualHistory?: { date: IsoDate; accrued: number }[];
  outsidePaidMinor?: number;
  /** What its payments sent to someone other than its payee (a business's ads in the town's outlets), all time. */
  splitPaidMinor?: number;
  /** wages: what the payer's cash could not pay on its latest short payday (`due`, the day that pay fell due; `date`, the day it was paid), the most its credit line may draw for it. */
  creditNeed?: { date: IsoDate; due: string; minor: number };
  endedAt?: IsoDate;
  endedReason?: string;
}

export const FIXED_SPENDING = "household.outside-living-costs";

/** The core a runtime belongs to, for the counted households' income reads before the first day opens its api. */
export const coreOfRuntime = new WeakMap<ResidentsRuntime, CoreState>();

const COUNTED = COUNTED_ROWS as unknown as Readonly<
  Record<string, { value: number }>
>;

/** A counted-group parameter (src/core2/data/counted/parameters.json). */
export function countedParameter(key: string): number {
  const row = COUNTED[key];
  if (!row) throw new Error(`Untagged counted parameter: ${key}`);
  return row.value;
}

/** A household's part of a merged purchase flow is keyed `hh:<household id>`. */
export const householdPart = (householdId: string) => `hh:${householdId}`;

/** What the welfare line and the veterans line pay one household a year: the sum of what each installed engine says (the `assistanceReader` field; the Census counts public assistance in income). */
function assistanceYear(rt: ResidentsRuntime, householdId: string): number {
  const core = coreOfRuntime.get(rt);
  if (!core) return 0;
  let total = 0;
  for (const read of fieldsOf(core, "assistanceReader"))
    total += read(core, householdId);
  return total;
}

/** A counted household's yearly income: recorded pay, retirement awards, its unplaced workers' pay and the welfare line's cash assistance. */
export function householdIncome(
  rt: ResidentsRuntime,
  h: CountedHousehold,
): number {
  return (
    h.wagesMinorYear +
    h.retirementMinorYear +
    h.unplacedWorkers * unplacedPayPerWorker(rt, h) +
    assistanceYear(rt, h.id)
  );
}

/** What one of a counted household's unplaced workers earns a year at the opening's pay: its place's pool's rate. The pool's flow is paid indexed to the place's pay level, so this is the base the flow's amount is kept in. */
export function unplacedPayPerWorkerBase(
  rt: ResidentsRuntime,
  h: CountedHousehold,
): number {
  return rt.unplacedPerWorker.get(unplacedPoolOf(h.placeId, !!h.quarters)) ?? 0;
}

const levelReads = new WeakMap<
  CoreState,
  { date: string; byPlace: Map<string, number> }
>();

/**
 * What one of a counted household's unplaced workers earns a year now: the
 * pool's rate at the opening times the place's pay level (the pool's flow is
 * paid indexed the same way), so the household's income, and every figure
 * that reads it, follows wages. One read of a place's level a day.
 */
export function unplacedPayPerWorker(
  rt: ResidentsRuntime,
  h: CountedHousehold,
): number {
  const base = unplacedPayPerWorkerBase(rt, h);
  const core = rt.api?.state as CoreState | undefined;
  if (!core || base === 0) return base;
  let cache = levelReads.get(core);
  if (!cache || cache.date !== core.date)
    levelReads.set(core, (cache = { date: core.date, byPlace: new Map() }));
  let level = cache.byPlace.get(h.placeId);
  if (level === undefined)
    cache.byPlace.set(h.placeId, (level = payLevel(core, h.placeId)));
  return base * level;
}

/** What keys a counted household to its group today. */
export function groupKeyOf(
  rt: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): GroupKey {
  const store = rt.store;
  const members = store.countedMembers(h);
  const adultAge = parameter("votingAge");
  let adults = 0,
    children = 0,
    head = -1,
    headAge = -1;
  for (const m of members) {
    const age = ageOn(store.born[m]!, date);
    if (age >= adultAge) adults++;
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
    incomeBand: incomeBandOf(
      householdIncome(rt, h),
      rt.api ? wageIndexToday(rt.api) : 1,
    ),
    tenure: h.tenure,
    ageBand: ageBandOf(Math.max(0, headAge)),
    work,
    ...(h.quarters ? { quarters: h.quarters } : {}),
  };
}

/**
 * The same read for a pass over many households at one moment: each group's
 * people and fund balance are counted once, not once per household (counting a
 * group's people walks all its households). Valid only until the next posting.
 */
export function householdCashReader(
  rt: ResidentsRuntime,
): (h: CountedHousehold) => number {
  const groups = new Map<number, { claims: number; balance: number }>();
  return (h) => {
    if (!rt.api || !rt.funded || h.group < 0) return 0;
    let group = groups.get(h.group);
    if (!group) {
      const claims = claimsInGroup(rt, h.group);
      group = {
        claims,
        balance: claims > 0 ? fundBalance(rt.api, rt, h.group) : 0,
      };
      groups.set(h.group, group);
    }
    // One household of the record: its members at its savings weight, and
    // never more than the record's own claim: a record that stands for less
    // than one household holds only the part of the group's money its own
    // people hold, so a household filled in from it cannot ask for more than
    // the group's fund (Central Falls and the lender replay, Nov 14: a sole
    // record of weight 0.34 asked three times the whole fund).
    return group.claims > 0
      ? Math.floor(
          (group.balance *
            Math.min(rt.store.countedCount(h), rt.store.weightedCount(h)) *
            savingWeight(rt.api.state.seed, h)) /
            group.claims,
        )
      : 0;
  };
}

/** The town's own place id (its jurisdiction), from the world's place key. */
export function townPlaceOf(core: CoreState): PlaceId | undefined {
  const key = core.placeMetadata?.placeKey;
  return key
    ? (corePlaceByKey(key)?.context.jurisdiction.id as PlaceId | undefined)
    : undefined;
}

/** The place's pay level against the opening (latest finance condition's wage factor). */
export function payLevel(core: CoreState, placeId: string): number {
  const conditions = core.finance.conditionsByPlace.get(placeId);
  if (!conditions) return 1;
  let factor = 1;
  for (const row of conditions)
    if (row.at <= core.date) factor = row.wagePriceFactor;
  return factor;
}

/**
 * Counts of the wider population by place, age and employer, from its
 * records, each record times the households it stands for (its weight).
 */
export function residentCounts(core: CoreState): ResidentCounts[] {
  const rt = runtimes.get(core);
  if (!rt) return [];
  const at = makeIsoDate(core.date);
  const adultAge = parameter("votingAge");
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
      if (age >= adultAge) counts.adults += weight;
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

/**
 * What one full household, or the counted households together, owe for
 * living costs in a month: the part of `monthlyLivingCostMinor` a payer's own
 * share of a living-cost payment is set against.
 */
export function payerLivingCostMinor(
  core: CoreState,
  placeId: PlaceId,
  payer: { readonly householdId: string } | "counted",
): number {
  const rt = runtimes.get(core);
  if (!rt) return 0;
  if (payer !== "counted") {
    const flow = rt.flows.get(`residents:outside-living:${payer.householdId}`);
    return flow && !flow.endedAt
      ? Math.round((flow.amountMinor * perYear(flow)) / 12)
      : 0;
  }
  let total = 0;
  for (const flow of rt.flows.values())
    if (
      !flow.endedAt &&
      flow.kind === "purchase" &&
      flow.financeKind === FIXED_SPENDING &&
      flow.placeId === placeId &&
      flow.payerId === flow.residentsId
    )
      total += (flow.amountMinor * perYear(flow) * flowScale(rt, flow)) / 12;
  return Math.round(total);
}

export const perYear = (flow: FlowState) =>
  flow.cadence.kind === "months"
    ? 12 / flow.cadence.every
    : DAYS_PER_YEAR / flow.cadence.every;

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

/**
 * The full, living people who list a counted relative (a husk) as family or
 * hold a tie to them, sorted. The opening records each full person's tie to a
 * counted relative (state.ts, with openingClosenessHours), so the grief
 * reader and the eviction notice find it.
 */
export function fullRelativesOf(api: CoreAPI, huskId: string): string[] {
  const husk = api.state.husks.get(huskId);
  const witnesses = new Set(husk?.familyIds ?? []);
  for (const key of api.state.relationshipsByPerson.get(huskId) ?? []) {
    const tie = api.state.relationships.get(key);
    if (tie) witnesses.add(tie.actorId === huskId ? tie.otherId : tie.actorId);
  }
  return [...witnesses]
    .filter((id) => id !== huskId && api.state.people.get(id)?.alive)
    .sort();
}
