/**
 * What a person's own life adds to their stance on a policy question (the
 * views engine's life term): the circumstances the engines already record
 * (whether their household rents, its income fifth, whether they work, their
 * health plan, a young child at home, a government job), each measured
 * against the nation's average and weighed by how much their traits lead them
 * to weigh their own stake (`views.own-stake`). One rule for a full person and
 * a counted resident (one model, two tiers): a full person's facts come from
 * the records the engines keep for them, a counted resident's from their
 * household's columns, so the same person reads alike before and after they
 * are filled in. The facts are read again when the records change, so a view
 * moves when a life does. Sizes: `data/views/stakes.json`.
 */
import {
  DATA,
  reference,
  WORKING_FROM,
  WORKING_TO,
  YOUNG_CHILD_UNDER,
  type LifeFacts,
  type LifeStake,
} from "./life-stake-rule";
import { ageOnDate } from "./kernel/dates";
import { decisionLean, decisionTraitWeight } from "./trait-decisions";
import { fullHouseholdIncomes, incomeBandOf } from "./counted-income-fifth";
import { publicEmployerLevel } from "./public-pay-floor";
import { householdIncome, residentsRuntime } from "./modules/residents";
import { planReaders } from "./life-plan-readers";
import type { CountedHousehold } from "./counted-groups";
import type { CoreState, PersonState } from "./types";

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

/** Every fact at the nation's average: a life the records do not hold. */
const NATIONAL: LifeFacts = {
  rents: reference("rents"),
  incomeFifth: reference("incomeFifth"),
  noWork: reference("noWork"),
  noPrivatePlan: reference("noPrivatePlan"),
  youngChild: reference("youngChild"),
  publicWorker: reference("publicWorker"),
};

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

const openJob = (core: CoreState, person: Readonly<PersonState>) => {
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  return job && job.endsAt === undefined ? job : undefined;
};

/**
 * A full person's circumstances and care, from the records the engines keep:
 * a lease on the books, the household's income, their open job and its
 * employer, their health plan and who lives with them. Kept for the day.
 */
export function fullLifeStake(
  core: CoreState,
  person: Readonly<PersonState>,
): LifeStake {
  const index = monthIndex(core);
  const kept = index.byPerson.get(person.id);
  if (kept?.date === core.date) return kept.stake;
  if (!index.recorded.has(person.placeId)) {
    // Someone living where the engines keep no records (a relative far
    // away): their circumstances are not known, so each sits at the nation's
    // average and adds nothing.
    const stake: LifeStake = { facts: NATIONAL, care: lifeCare(core, person) };
    index.byPerson.set(person.id, { date: core.date, stake });
    return stake;
  }
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
  const stake: LifeStake = {
    facts: {
      rents:
        lease && !lease.endedAt
          ? 1
          : index.housed.has(person.placeId)
            ? 0
            : reference("rents"),
      incomeFifth: incomeBandOf(incomeOf(core, index, person.householdId)),
      noWork: working ? (job ? 0 : 1) : reference("noWork"),
      // A plan the coverage engine keeps no record of is not known: the nation's average.
      noPrivatePlan:
        working && plan !== undefined && plan !== null
          ? plan === "employer"
            ? 0
            : 1
          : reference("noPrivatePlan"),
      youngChild: youngChild ? 1 : 0,
      publicWorker:
        employer?.classification && publicEmployerLevel(employer.classification)
          ? 1
          : 0,
    },
    care: lifeCare(core, person),
  };
  index.byPerson.set(person.id, { date: core.date, stake });
  return stake;
}

/** A counted household's members' facts, kept until the household changes or the month turns. */
const countedHeld = new WeakMap<
  CountedHousehold,
  { rev: number; month: string; byId: Map<string, LifeStake> }
>();

/**
 * A counted resident's circumstances and care, from their household's
 * columns: its tenure, its income (the residents engine's), each member's
 * work commitments and jobs, its health plan record and the members' ages.
 * The household's unplaced workers (working outside a recorded job) count as
 * working, shared over its members of working age with no recorded work.
 * Undefined for anyone the counts do not hold.
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
  const month = monthOf(core.date);
  const rev = h.rev ?? 0;
  let held = countedHeld.get(h);
  if (!held || held.rev !== rev || held.month !== month) {
    held = { rev, month, byId: new Map() };
    countedHeld.set(h, held);
  }
  const kept = held.byId.get(personId);
  if (kept) return kept;
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
      ? reference("noPrivatePlan")
      : underMedicare
        ? 1 - Math.min(1, covered / underMedicare)
        : 0;
  const age = ageOnDate(store.born[m]!, date);
  const publicWorker = h.jobs.some((job) => {
    if (job.personId !== personId || job.endsAt !== undefined) return false;
    const kind = core.organizations.get(job.organizationId)?.classification;
    return !!kind && !!publicEmployerLevel(kind);
  });
  const stake: LifeStake = {
    facts: {
      rents:
        h.tenure === "rent"
          ? 1
          : monthIndex(core).housed.has(h.placeId)
            ? 0
            : reference("rents"),
      incomeFifth: incomeBandOf(householdIncome(rt, h)),
      noWork: working(age)
        ? atWork.has(personId)
          ? 0
          : worklessShare
        : reference("noWork"),
      noPrivatePlan: working(age) ? uncovered : reference("noPrivatePlan"),
      youngChild: ages.some((a) => a < YOUNG_CHILD_UNDER) ? 1 : 0,
      publicWorker: publicWorker ? 1 : 0,
    },
    care: lifeCare(core, { traits: store.packedTraits(m) }),
  };
  held.byId.set(personId, stake);
  return stake;
}
