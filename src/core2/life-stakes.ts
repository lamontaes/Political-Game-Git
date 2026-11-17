/**
 * What a person's own life adds to their stance on a policy question (the
 * views engine's life term): the circumstances the engines already record
 * (whether their household rents, its income fifth, whether they work, their
 * health plan, a young child at home, a government job), each measured
 * against the world's own share over the adults whose stances are counted
 * (`stakeReferences`) and weighed by how much their traits lead them
 * to weigh their own stake (`views.own-stake`). One rule for a full person and
 * a counted resident (one model, two tiers): a full person's facts come from
 * the records the engines keep for them, a counted resident's from their
 * household's columns, so the same person reads alike before and after they
 * are filled in. The facts are read again when the records change, so a view
 * moves when a life does. Sizes: `src/core2/data/views/stakes.json`.
 */
import {
  changedFacts,
  DATA,
  LIFE_FACTS,
  WORKING_FROM,
  WORKING_TO,
  YOUNG_CHILD_UNDER,
  type LifeFact,
  type LifeFacts,
  type LifeStake,
  type StakeReference,
} from "./life-stake-rule";
import { ageOnDate } from "./kernel/dates";
import { decisionLean, decisionTraitWeight } from "./trait-decisions";
import { fullHouseholdIncomes, incomeBandOf } from "./counted-income-fifth";
import publicPay from "./data/laws/public-pay-floor.json" with { type: "json" };
import { householdIncome, residentsRuntime } from "./modules/residents";
import { planReaders } from "./life-plan-readers";
import type { CoreState, PersonState } from "./types";
import { coreAPI } from "./state";
import { isDemoted, type CountedHousehold } from "./counted-groups";

/**
 * How much a person weighs their own stake against what they think is right
 * for everyone: their traits' lean toward self-interest over the common good
 * (the shared decision `views.own-stake`), never below zero.
 */
export function lifeCare(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
): number {
  const lean = decisionLean(
    core,
    person,
    DATA.careDecision,
    "own-stake",
    "common-good",
  );
  return Math.exp(decisionTraitWeight(core, DATA.careDecision) * lean);
}

/** No fact known: a life the records do not hold. */
const UNKNOWN: LifeFacts = {
  rents: null,
  incomeFifth: null,
  noWork: null,
  noPrivatePlan: null,
  youngChild: null,
  publicWorker: null,
};

/** The public employer classes (the public pay floor's table of who funds each): a job with one is a government job. */
const PUBLIC_CLASSES = new Set(
  Object.keys(
    (publicPay as unknown as { employerLevels: Record<string, string> })
      .employerLevels,
  ),
);
const isPublicEmployer = (classification: string): boolean =>
  PUBLIC_CLASSES.has(classification);

const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);

/**
 * A world's monthly reads: which places the engines keep records and homes
 * for, and each full household's income (read again as soon as anyone is
 * filled in, so a person met today reads the income their records give).
 */
interface MonthIndex {
  readonly month: string;
  /** The places whose people the engines keep records for (counted households, leases); a full person elsewhere is kept minimal until met. */
  readonly recorded: ReadonlySet<string>;
  /** The places whose homes the housing engine keeps (a lease or a mortgage on record): elsewhere tenure is not known. */
  readonly housed: ReadonlySet<string>;
  incomes: { people: number; byHousehold: ReadonlyMap<string, number> };
  readonly byPerson: Map<string, { date: string; stake: LifeStake }>;
}
const monthIndexes = new WeakMap<CoreState, MonthIndex>();

function monthIndex(core: CoreState): MonthIndex {
  const month = monthOf(core.date);
  const held = monthIndexes.get(core);
  if (held?.month === month) return held;
  const housed = new Set<string>();
  for (const [id, row] of core.finance.contracts)
    if (id.startsWith("lease:") && !row.endedAt && row.householdId) {
      const place = core.households.get(row.householdId)?.placeId;
      if (place) housed.add(place);
    }
  const store = residentsRuntime(core)?.store;
  const recorded = new Set<string>(housed);
  if (store)
    for (const h of store.liveHouseholds()) {
      recorded.add(h.placeId);
      if (h.tenure === "rent" || h.tenure === "mortgage") housed.add(h.placeId);
    }
  const index: MonthIndex = {
    month,
    recorded,
    housed,
    incomes: {
      people: core.people.size,
      byHousehold: fullHouseholdIncomes(core),
    },
    byPerson: new Map(),
  };
  monthIndexes.set(core, index);
  return index;
}

/** A full household's yearly income, read again when someone has been filled in since. */
function incomeOf(core: CoreState, index: MonthIndex, householdId: string) {
  if (index.incomes.people !== core.people.size)
    index.incomes = {
      people: core.people.size,
      byHousehold: fullHouseholdIncomes(core),
    };
  return index.incomes.byHousehold.get(householdId) ?? 0;
}

/**
 * Each full person's circumstances as their stance was last told them: set
 * the first time they are read, and moved on when a change is told
 * (`lifeChangesOf`).
 */
const toldBy = new WeakMap<CoreState, Map<string, LifeFacts>>();
function toldOf(core: CoreState): Map<string, LifeFacts> {
  let told = toldBy.get(core);
  if (!told) toldBy.set(core, (told = new Map()));
  return told;
}

/** Keep a full person's reading for the day, and as what their stance was told if nothing was yet. */
function keep(
  core: CoreState,
  index: MonthIndex,
  person: Readonly<PersonState>,
  stake: LifeStake,
): LifeStake {
  index.byPerson.set(person.id, { date: core.date, stake });
  const told = toldOf(core);
  if (!told.has(person.id)) told.set(person.id, stake.facts);
  return stake;
}

/**
 * Which of a full person's circumstances changed since their stance was last
 * told, read from their records now (not the day's kept reading), and tell
 * it: the next call compares against today. Empty the first time they are read.
 */
export function lifeChangesOf(
  core: CoreState,
  person: Readonly<PersonState>,
): LifeFact[] {
  const told = toldOf(core);
  const before = told.get(person.id);
  monthIndex(core).byPerson.delete(person.id);
  const now = fullLifeStake(core, person);
  if (!before) return [];
  told.set(person.id, now.facts);
  return changedFacts(before, now.facts);
}

/** The full people whose circumstances have been read, in the order first read: the ones a review reads again. */
export function lifeReadPeople(core: CoreState): string[] {
  return [...toldOf(core).keys()];
}

/** Stop following someone (died, or returned to the counts). */
export function forgetLife(core: CoreState, personId: string): void {
  toldOf(core).delete(personId);
}

const openJob = (core: CoreState, person: Readonly<PersonState>) => {
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  return job && job.endsAt === undefined ? job : undefined;
};

/** A full person's circumstances, from the records the engines keep (none where the engines keep no records for their place). */
function fullLifeFacts(
  core: CoreState,
  index: MonthIndex,
  person: Readonly<PersonState>,
): LifeFacts {
  // Someone living where the engines keep no records (a relative far away):
  // their circumstances are not known, so none adds anything.
  if (!index.recorded.has(person.placeId)) return UNKNOWN;
  const age = ageOnDate(person.birthDate, core.date);
  const working = age >= WORKING_FROM && age < WORKING_TO;
  const job = openJob(core, person);
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  const plan = planReaders()?.fullPlan(core, person.householdId, person.id);
  const lease = core.finance.contracts.get(`lease:${person.householdId}`);
  const home = core.households.get(person.householdId);
  const youngChild = (home?.memberIds ?? []).some((id) => {
    const member = core.people.get(id);
    return (
      !!member &&
      member.alive &&
      ageOnDate(member.birthDate, core.date) < YOUNG_CHILD_UNDER
    );
  });
  return {
    rents:
      lease && !lease.endedAt ? 1 : index.housed.has(person.placeId) ? 0 : null,
    incomeFifth: incomeBandOf(incomeOf(core, index, person.householdId)),
    noWork: working ? (job ? 0 : 1) : null,
    // A plan the coverage engine keeps no record of is not known.
    noPrivatePlan:
      working && plan !== undefined && plan !== null
        ? plan === "employer"
          ? 0
          : 1
        : null,
    youngChild: youngChild ? 1 : 0,
    publicWorker:
      employer?.classification && isPublicEmployer(employer.classification)
        ? 1
        : 0,
  };
}

/**
 * A full person's circumstances and care, from the records the engines keep:
 * a lease on the books, the household's income, their open job and its
 * employer, their health plan and who lives with them, measured against the
 * world's references this month. Kept for the day.
 */
export function fullLifeStake(
  core: CoreState,
  person: Readonly<PersonState>,
): LifeStake {
  const index = monthIndex(core);
  const kept = index.byPerson.get(person.id);
  if (kept?.date === core.date) return kept.stake;
  return keep(core, index, person, {
    facts: fullLifeFacts(core, index, person),
    care: lifeCare(core, person),
    reference: stakeReferences(core).reference,
  });
}

/** A counted household's members' facts, kept until the household changes or the month turns. */
const countedHeld = new WeakMap<
  CountedHousehold,
  { rev: number; month: string; byId: Map<string, LifeFacts> }
>();

/**
 * Each counted member's circumstances, from their household's columns: its
 * tenure, its income (the residents engine's), each member's work
 * commitments and jobs, its health plan record and the members' ages. The
 * household's unplaced workers (working outside a recorded job) count as
 * working, shared over its members of working age with no recorded work.
 */
function countedFacts(
  core: CoreState,
  rt: NonNullable<ReturnType<typeof residentsRuntime>>,
  h: CountedHousehold,
): Map<string, LifeFacts> {
  const store = rt.store;
  const month = monthOf(core.date);
  const rev = h.rev ?? 0;
  const held = countedHeld.get(h);
  if (held && held.rev === rev && held.month === month) return held.byId;
  const date = core.date;
  const members = store.countedMembers(h);
  const ages = members.map((member) => ageOnDate(store.born[member]!, date));
  const working = (age: number) => age >= WORKING_FROM && age < WORKING_TO;
  const atWork = new Set<string>();
  for (const c of h.workCommitments)
    if (c.endsAt === undefined || c.endsAt > date) atWork.add(c.personId);
  const workless = members.filter(
    (member, at) => working(ages[at]!) && !atWork.has(store.ids[member]!),
  ).length;
  const worklessShare = workless
    ? Math.max(0, workless - h.unplacedWorkers) / workless
    : 0;
  const underMedicare = ages.filter((age) => age < WORKING_TO).length;
  const covered = planReaders()?.countedCovered(core, h.id, h.placeId) ?? null;
  const uncovered =
    covered === null
      ? null
      : underMedicare
        ? 1 - Math.min(1, covered / underMedicare)
        : 0;
  const rents =
    h.tenure === "rent" ? 1 : monthIndex(core).housed.has(h.placeId) ? 0 : null;
  const incomeFifth = incomeBandOf(householdIncome(rt, h));
  const youngChild = ages.some((a) => a < YOUNG_CHILD_UNDER) ? 1 : 0;
  const byId = new Map<string, LifeFacts>();
  members.forEach((member, at) => {
    const personId = store.ids[member]!;
    const age = ages[at]!;
    const publicWorker = h.jobs.some((job) => {
      if (job.personId !== personId || job.endsAt !== undefined) return false;
      const kind = core.organizations.get(job.organizationId)?.classification;
      return !!kind && isPublicEmployer(kind);
    });
    byId.set(personId, {
      rents,
      incomeFifth,
      noWork: working(age) ? (atWork.has(personId) ? 0 : worklessShare) : null,
      noPrivatePlan: working(age) ? uncovered : null,
      youngChild,
      publicWorker: publicWorker ? 1 : 0,
    });
  });
  countedHeld.set(h, { rev, month, byId });
  return byId;
}

/** A counted resident's care, kept for the world: their packed traits do not change while counted. */
const countedCare = new WeakMap<CoreState, Map<string, number>>();

/**
 * A counted resident's circumstances and care, from their household's
 * columns (`countedFacts`), measured against the world's references this
 * month. Undefined for anyone the counts do not hold.
 */
export function countedLifeStake(
  core: CoreState,
  personId: string,
): LifeStake | undefined {
  const rt = residentsRuntime(core);
  const store = rt?.store;
  const m = store?.countedMember(personId);
  if (!rt || !store || m === undefined) return undefined;
  const h = store.households[store.household[m]!];
  if (!h) return undefined;
  const facts = countedFacts(core, rt, h).get(personId);
  if (!facts) return undefined;
  let cares = countedCare.get(core);
  if (!cares) countedCare.set(core, (cares = new Map()));
  let care = cares.get(personId);
  if (care === undefined) {
    care = lifeCare(core, { traits: store.packedTraits(m) });
    cares.set(personId, care);
  }
  return { facts, care, reference: stakeReferences(core).reference };
}

/**
 * The world's references this month: each fact's share (or, for the income
 * fifth, its mean) over the adults whose stances are counted, full people
 * once and counted residents by the people their record stands for, each
 * counting where their records hold the fact. A fact no one's records hold stands at 0 and is read by no one.
 */
export interface StakeReferences {
  readonly month: string;
  readonly people: number;
  readonly reference: StakeReference;
  /** Each fact's sum over the people whose records hold it, and how many those are. */
  readonly sums: Readonly<Record<LifeFact, { sum: number; of: number }>>;
}
const references = new WeakMap<CoreState, StakeReferences>();

export function stakeReferences(core: CoreState): StakeReferences {
  const month = monthOf(core.date);
  const held = references.get(core);
  if (held?.month === month) return held;
  const sums = Object.fromEntries(
    LIFE_FACTS.map((fact) => [fact, { sum: 0, of: 0 }]),
  ) as Record<LifeFact, { sum: number; of: number }>;
  const add = (facts: LifeFacts, weight: number) => {
    people += weight;
    for (const fact of LIFE_FACTS) {
      const value = facts[fact];
      if (value === null) continue;
      sums[fact].sum += weight * value;
      sums[fact].of += weight;
    }
  };
  let people = 0;
  const adult = coreAPI(core).parameter("votingAge");
  const index = monthIndex(core);
  for (const person of core.people.values()) {
    if (!person.alive || isDemoted(person)) continue;
    if (!index.recorded.has(person.placeId)) continue;
    if (ageOnDate(person.birthDate, core.date) < adult) continue;
    add(fullLifeFacts(core, index, person), 1);
  }
  const rt = residentsRuntime(core);
  if (rt)
    for (const h of rt.store.liveHouseholds()) {
      const byId = countedFacts(core, rt, h);
      // Each counted record stands for the real people its household's weight counts.
      const weight = rt.store.weightOf(h);
      for (const member of rt.store.countedMembers(h)) {
        if (ageOnDate(rt.store.born[member]!, core.date) < adult) continue;
        const facts = byId.get(rt.store.ids[member]!);
        if (facts) add(facts, weight);
      }
    }
  const result: StakeReferences = {
    month,
    people,
    reference: Object.fromEntries(
      LIFE_FACTS.map((fact) => [
        fact,
        sums[fact].of ? sums[fact].sum / sums[fact].of : 0,
      ]),
    ) as unknown as StakeReference,
    sums,
  };
  references.set(core, result);
  return result;
}
