/**
 * Who a group B policy reaches, read from records (two-level population):
 * the town's named people one by one, and its counted residents as counts.
 * Age, household size and income, work hours and the children in the house
 * come from each person's own records (jobs, work commitments, household).
 */
import parameters from "../data/laws/reach-group-b-parameters.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import {
  countedJob,
  countedParameter,
  residentsRuntime,
} from "../modules/residents";
import type {
  CoreAPI,
  CoreState,
  JobInput,
  WorkCommitmentInput,
} from "../types";

interface ParameterRow {
  readonly value: number;
}
const table = parameters as unknown as {
  parameters: Record<string, ParameterRow>;
  povertyGuidelineByState: Record<
    string,
    { firstPerson: number; perAddedPerson: number }
  >;
  graduatedSchedules: Record<
    "state" | "local",
    {
      standardDeduction: number;
      brackets: readonly { over: number; rate: number }[];
    }
  >;
};

/** A number from the group B parameter table. */
export function reachParameter(key: string): number {
  const row = table.parameters[key];
  if (!row) throw new Error(`Unknown law-reach parameter: ${key}`);
  return row.value;
}

export function graduatedSchedule(scope: "state" | "local") {
  return table.graduatedSchedules[scope];
}

/** Who a policy reaches; each number is a parameter key. */
export interface PeopleSelector {
  readonly ageFrom?: string;
  readonly ageBelow?: string;
  readonly employed?: boolean;
  readonly incomeBelowPovertyShare?: string;
  readonly hoursBelowPerWeek?: string;
  readonly hoursBelowPerMonth?: string;
  /** No child of the household is younger than this (an exemption). */
  readonly noChildBelow?: string;
  /** One record per household: its oldest member who matches. */
  readonly householdHead?: boolean;
}

/** One resident's facts, named or counted. */
export interface ResidentFacts {
  readonly id: string;
  readonly named: boolean;
  readonly householdId: string;
  readonly age: number;
  readonly weeklyMinutes: number;
  readonly employed: boolean;
  /** A counted member working without a recorded job: their share of the place's unplaced workers. */
  readonly employedShare?: number;
  /** How much of this resident a selection reached (1, or a working share). */
  readonly weight?: number;
  /** Real residents this counted row stands for (its household's weight; absent means one). */
  readonly scale?: number;
}

export interface HouseholdFacts {
  readonly id: string;
  readonly named: boolean;
  readonly size: number;
  readonly incomeDollars: number;
  /** The part of `incomeDollars` that is retirement benefits, not wages. */
  readonly retirementDollars?: number;
  readonly ages: readonly number[];
  /** Real households this counted row stands for (absent means one). */
  readonly scale?: number;
}

export interface TownFacts {
  readonly residents: readonly ResidentFacts[];
  readonly households: ReadonlyMap<string, HouseholdFacts>;
  /** Residents the town's records count, modeled (named plus counted). */
  readonly modeled: number;
}

const cache = new WeakMap<object, { date: string; facts: TownFacts }>();

/** A new pass reads the town as it stands now: births, moves and fill-ins since the last read the same day count. */
export function forgetTownFacts(api: CoreAPI): void {
  cache.delete(api.state as CoreState);
}

function activeMinutes(
  commitments: readonly WorkCommitmentInput[],
  date: string,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of commitments)
    if (c.startsAt <= date && (c.endsAt === undefined || c.endsAt > date))
      out.set(c.personId, (out.get(c.personId) ?? 0) + c.expectedWeeklyMinutes);
  return out;
}

/** The town's residents and households on today's date, from their records. */
export function townFacts(api: CoreAPI, townPlaceId: string): TownFacts {
  const core = api.state as CoreState;
  const hit = cache.get(core);
  if (hit && hit.date === core.date) return hit.facts;
  const date = makeIsoDate(core.date);
  const days = reachParameter("daysPerYear");
  const cents = reachParameter("centsPerDollar");
  const residents: ResidentFacts[] = [];
  const households = new Map<string, HouseholdFacts>();
  const jobIncome = (jobs: Iterable<JobInput>) => {
    let minor = 0;
    for (const job of jobs) minor += job.wageDailyMinor * days;
    return minor / cents;
  };
  const rt = residentsRuntime(core);
  // A named retiree's award is a standing contract with them as recipient.
  const retirementYearMinor = new Map<string, number>();
  for (const contract of core.finance.contracts.values())
    if (
      !contract.endedAt &&
      contract.recipientIncome &&
      contract.kind === "income.retirement"
    ) {
      const id = contract.recipientIncome.personId;
      retirementYearMinor.set(
        id,
        (retirementYearMinor.get(id) ?? 0) +
          (contract.amountMinor * reachParameter("monthsPerYear")) /
            Math.max(1, contract.periodMonths),
      );
    }
  // Named people: their own jobs and commitments.
  const commitments: WorkCommitmentInput[] = [];
  for (const id of core.peopleByPlace.get(townPlaceId) ?? [])
    for (const cid of core.work.commitmentsByPerson.get(id) ?? []) {
      const row = core.work.commitments.get(cid);
      if (row) commitments.push(row);
    }
  const namedMinutes = activeMinutes(commitments, date);
  const namedByHousehold = new Map<string, string[]>();
  for (const id of core.peopleByPlace.get(townPlaceId) ?? []) {
    const person = core.people.get(id);
    if (!person?.alive) continue;
    const list = namedByHousehold.get(person.householdId) ?? [];
    list.push(id);
    namedByHousehold.set(person.householdId, list);
  }
  for (const [householdId, ids] of namedByHousehold) {
    const ages: number[] = [];
    const jobs: JobInput[] = [];
    for (const id of ids) {
      const person = core.people.get(id)!;
      const age = ageOnDate(makeIsoDate(person.birthDate), date);
      ages.push(age);
      const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
      const working = !!job && job.endsAt === undefined;
      if (working) jobs.push(job);
      residents.push({
        id,
        named: true,
        householdId,
        age,
        weeklyMinutes: namedMinutes.get(id) ?? 0,
        employed: working,
      });
    }
    // A claimed retirement benefit is income the household lives on.
    let retirementMinor = 0;
    for (const id of ids) retirementMinor += retirementYearMinor.get(id) ?? 0;
    households.set(householdId, {
      id: householdId,
      named: true,
      size: ids.length,
      incomeDollars: jobIncome(jobs) + retirementMinor / cents,
      ...(retirementMinor
        ? { retirementDollars: retirementMinor / cents }
        : {}),
      ages,
    });
  }
  // Counted residents: their groups' members, read from the packed columns
  // (one model, two tiers). A working-age member without a recorded job
  // works by their household's share of the place's unplaced workers.
  if (rt) {
    const store = rt.store;
    const from = countedParameter("countedWorkingAgeFrom"),
      below = countedParameter("countedWorkingAgeBelow");
    for (const h of store.liveHouseholds()) {
      if (h.placeId !== townPlaceId) continue;
      const minutes = activeMinutes(h.workCommitments, date);
      const jobs = h.jobs.filter(
        (job) => countedJob(core, job.id) !== undefined,
      );
      const workers = new Set(jobs.map((job) => job.personId));
      const members = store.countedMembers(h);
      // A record stands for as many real households as its weight says.
      const scale = store.weightOf(h);
      const ages = members.map((m) =>
        ageOnDate(makeIsoDate(store.born[m]!), date),
      );
      const eligible = members.filter(
        (m, i) =>
          !workers.has(store.ids[m]!) && ages[i]! >= from && ages[i]! < below,
      ).length;
      const share = eligible > 0 ? h.unplacedWorkers / eligible : 0;
      members.forEach((m, i) => {
        const id = store.ids[m]!;
        const open =
          !workers.has(id) && ages[i]! >= from && ages[i]! < below && share > 0;
        residents.push({
          id,
          named: false,
          householdId: h.id,
          age: ages[i]!,
          weeklyMinutes: minutes.get(id) ?? 0,
          employed: workers.has(id),
          ...(open ? { employedShare: share } : {}),
          ...(scale !== 1 ? { scale } : {}),
        });
      });
      if (ages.length)
        households.set(h.id, {
          id: h.id,
          named: false,
          size: ages.length,
          incomeDollars:
            jobIncome(jobs) +
            (h.unplacedWorkers * (rt.unplacedPerWorker.get(h.placeId) ?? 0)) /
              cents +
            h.retirementMinorYear / cents,
          ...(h.retirementMinorYear
            ? { retirementDollars: h.retirementMinorYear / cents }
            : {}),
          ages,
          ...(scale !== 1 ? { scale } : {}),
        });
    }
  }
  const facts = {
    residents,
    households,
    modeled: residents.reduce((n, r) => n + (r.scale ?? 1), 0),
  };
  cache.set(core, { date: core.date, facts });
  return facts;
}

/** The poverty line for a household of `size` in the town's state. */
export function povertyLineDollars(stateKey: string, size: number): number {
  const row = table.povertyGuidelineByState[stateKey];
  const first =
    row?.firstPerson ?? reachParameter("povertyGuidelineFirstPersonDollars");
  const added =
    row?.perAddedPerson ??
    reachParameter("povertyGuidelinePerAddedPersonDollars");
  return first + added * Math.max(0, size - 1);
}

/** The residents a selector reaches, in id order. */
export function selectResidents(
  facts: TownFacts,
  selector: PeopleSelector,
  stateKey: string,
): ResidentFacts[] {
  const p = (key: string | undefined) =>
    key === undefined ? undefined : reachParameter(key);
  const ageFrom = p(selector.ageFrom);
  const ageBelow = p(selector.ageBelow);
  const incomeShare = p(selector.incomeBelowPovertyShare);
  const weekly =
    selector.hoursBelowPerWeek !== undefined
      ? p(selector.hoursBelowPerWeek)! * reachParameter("minutesPerHour")
      : selector.hoursBelowPerMonth !== undefined
        ? (p(selector.hoursBelowPerMonth)! *
            reachParameter("monthsPerYear") *
            reachParameter("minutesPerHour")) /
          reachParameter("weeksPerYear")
        : undefined;
  const childBelow = p(selector.noChildBelow);
  const adult = reachParameter("adultAge");
  const out: ResidentFacts[] = [];
  for (const r of facts.residents) {
    if (ageFrom !== undefined && r.age < ageFrom) continue;
    if (ageBelow !== undefined && r.age >= ageBelow) continue;
    // A counted member working without a recorded job is reached by their share.
    const weight =
      selector.employed && !r.employed ? (r.employedShare ?? 0) : 1;
    if (weight <= 0) continue;
    if (weekly !== undefined && r.weeklyMinutes >= weekly) continue;
    const household = facts.households.get(r.householdId);
    if (!household) continue;
    if (
      incomeShare !== undefined &&
      household.incomeDollars >=
        incomeShare * povertyLineDollars(stateKey, household.size)
    )
      continue;
    if (
      childBelow !== undefined &&
      household.ages.some((age) => age < Math.min(childBelow, adult))
    )
      continue;
    out.push(weight === 1 ? r : { ...r, weight });
  }
  if (!selector.householdHead) return out.sort(byId);
  // One per household: its oldest matching member.
  const heads = new Map<string, ResidentFacts>();
  for (const r of out) {
    const prior = heads.get(r.householdId);
    if (!prior || r.age > prior.age || (r.age === prior.age && r.id < prior.id))
      heads.set(r.householdId, r);
  }
  return [...heads.values()].sort(byId);
}

const byId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
