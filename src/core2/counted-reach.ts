/**
 * How many people and how many dollars a rule touches in a place (one model,
 * two tiers): the same rule read for every full person there one by one and
 * for every counted member of every counted group, summed. A counted member
 * working without a recorded job (the place's unplaced workers) counts as
 * working by their household's share of them, so a count can be fractional
 * until it is rounded for show. Law reach, budgets and news call `reachOf`.
 */
import { ageOn } from "./counted-groups";
import { isNoncitizen } from "./citizenship";
import { countedParameter, residentsRuntime } from "./modules/residents";
import type { CoreState, PlaceId } from "./types";

export interface ReachRule {
  readonly ageFrom?: number;
  readonly ageBelow?: number;
  readonly employed?: boolean;
  readonly gender?: string;
  /**
   * Noncitizens only, given the share of the place's adults who are citizens
   * (`isNoncitizen` reads each person, full or counted, the same way).
   */
  readonly noncitizen?: { readonly citizenShare: number };
  /** The household has a child younger than this. */
  readonly withChildBelow?: number;
  /** No child of the household is younger than this (an exemption). */
  readonly noChildBelow?: number;
  /** Scheduled work below this many hours a week. */
  readonly hoursBelowWeekly?: number;
  /** The household's yearly income is below this many dollars, for its size. */
  readonly incomeBelowDollars?: (householdSize: number) => number;
  /** One per household: its oldest member who matches. */
  readonly householdHead?: boolean;
  /** Yearly dollars the rule moves for one person reached (or one household, per head). */
  readonly dollarsPerYear?: (facts: ReachFacts) => number;
}

/** What a dollar rule reads about one person reached. */
export interface ReachFacts {
  readonly age: number;
  /** Their own yearly pay. */
  readonly wageDollars: number;
  readonly householdIncomeDollars: number;
  readonly householdSize: number;
}

export interface GroupReach {
  readonly groupId: string;
  readonly district: string;
  readonly incomeBand: number;
  readonly people: number;
  readonly dollars: number;
}

export interface Reach {
  /** People reached, both tiers (rounded). */
  readonly people: number;
  readonly dollars: number;
  readonly full: {
    readonly people: number;
    readonly ids: readonly string[];
    readonly dollars: number;
  };
  readonly counted: { readonly people: number; readonly dollars: number };
  readonly byGroup: readonly GroupReach[];
}

interface Member {
  readonly id: string;
  readonly age: number;
  readonly gender?: string;
  readonly noncitizen?: boolean;
  /** Working: 1 with a job, a share for an unplaced worker, else 0. */
  readonly working: number;
  readonly weeklyMinutes: number;
  readonly wageDollars: number;
}

function matches(
  rule: ReachRule,
  member: Member,
  household: readonly Member[],
  incomeDollars: number,
): number {
  if (rule.ageFrom !== undefined && member.age < rule.ageFrom) return 0;
  if (rule.ageBelow !== undefined && member.age >= rule.ageBelow) return 0;
  if (rule.gender !== undefined && member.gender !== rule.gender) return 0;
  if (rule.noncitizen && !member.noncitizen) return 0;
  if (
    rule.hoursBelowWeekly !== undefined &&
    member.weeklyMinutes >= rule.hoursBelowWeekly * 60
  )
    return 0;
  if (
    rule.withChildBelow !== undefined &&
    !household.some((m) => m.age < rule.withChildBelow!)
  )
    return 0;
  if (
    rule.noChildBelow !== undefined &&
    household.some((m) => m.age < rule.noChildBelow!)
  )
    return 0;
  if (
    rule.incomeBelowDollars &&
    incomeDollars >= rule.incomeBelowDollars(household.length)
  )
    return 0;
  return rule.employed ? member.working : 1;
}

/** Apply a rule to one household: its weight reached and dollars. */
function applyRule(
  rule: ReachRule,
  household: readonly Member[],
): { people: number; dollars: number; ids: string[] } {
  const income = household.reduce((n, m) => n + m.wageDollars, 0);
  const hits = household
    .map((m) => ({ m, w: matches(rule, m, household, income) }))
    .filter((row) => row.w > 0);
  if (!hits.length) return { people: 0, dollars: 0, ids: [] };
  const chosen = rule.householdHead
    ? [hits.sort((a, b) => b.m.age - a.m.age || (a.m.id < b.m.id ? -1 : 1))[0]!]
    : hits;
  let people = 0,
    dollars = 0;
  for (const { m, w } of chosen) {
    people += w;
    if (rule.dollarsPerYear)
      dollars +=
        w *
        rule.dollarsPerYear({
          age: m.age,
          wageDollars: m.wageDollars,
          householdIncomeDollars: income,
          householdSize: household.length,
        });
  }
  return { people, dollars, ids: chosen.map((row) => row.m.id) };
}

/** People and dollars a rule touches in a place, at both tiers, by counted group. */
export function reachOf(
  core: CoreState,
  placeId: PlaceId,
  rule: ReachRule,
): Reach {
  const date = core.date;
  // Full people: their own records.
  const full = { people: 0, ids: [] as string[], dollars: 0 };
  const byHousehold = new Map<string, string[]>();
  for (const id of core.peopleByPlace.get(placeId) ?? []) {
    const person = core.people.get(id);
    if (!person?.alive) continue;
    byHousehold.set(person.householdId, [
      ...(byHousehold.get(person.householdId) ?? []),
      id,
    ]);
  }
  for (const ids of byHousehold.values()) {
    const household: Member[] = ids.map((id) => {
      const person = core.people.get(id)!;
      const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
      const working = job && job.endsAt === undefined ? 1 : 0;
      let minutes = 0;
      for (const cid of core.work.commitmentsByPerson.get(id) ?? []) {
        const c = core.work.commitments.get(cid);
        if (
          c &&
          c.startsAt <= date &&
          (c.endsAt === undefined || c.endsAt > date)
        )
          minutes += c.expectedWeeklyMinutes;
      }
      return {
        id,
        age: ageOn(person.birthDate, date),
        ...(person.looks?.gender ? { gender: person.looks.gender } : {}),
        ...(rule.noncitizen &&
        isNoncitizen(core.seed, id, rule.noncitizen.citizenShare)
          ? { noncitizen: true }
          : {}),
        working,
        weeklyMinutes: minutes,
        wageDollars: working ? (job!.wageDailyMinor * 365) / 100 : 0,
      };
    });
    const hit = applyRule(rule, household);
    full.people += hit.people;
    full.dollars += hit.dollars;
    full.ids.push(...hit.ids);
  }
  // Counted groups: each member's packed facts, the same rule.
  const byGroup = new Map<number, { people: number; dollars: number }>();
  const rt = residentsRuntime(core);
  if (rt) {
    const store = rt.store;
    const from = countedParameter("countedWorkingAgeFrom"),
      below = countedParameter("countedWorkingAgeBelow");
    const perUnplaced = (rt.unplacedPerWorker.get(placeId) ?? 0) / 100;
    for (const h of store.liveHouseholds()) {
      if (h.placeId !== placeId) continue;
      const members = store.countedMembers(h);
      const jobs = new Map<string, { wage: number; minutes: number }>();
      for (const job of h.jobs)
        if (job.endsAt === undefined)
          jobs.set(job.personId, {
            wage: (job.wageDailyMinor * 365) / 100,
            minutes: 0,
          });
      for (const c of h.workCommitments) {
        const row = jobs.get(c.personId);
        if (row && (c.endsAt === undefined || c.endsAt > date))
          row.minutes += c.expectedWeeklyMinutes;
      }
      const ages = members.map((m) => ageOn(store.born[m]!, date));
      const eligible = members.filter(
        (m, i) =>
          !jobs.has(store.ids[m]!) && ages[i]! >= from && ages[i]! < below,
      ).length;
      const share = eligible > 0 ? h.unplacedWorkers / eligible : 0;
      const household: Member[] = members.map((m, i) => {
        const id = store.ids[m]!;
        const job = jobs.get(id);
        const open = !job && ages[i]! >= from && ages[i]! < below;
        const gender = store.text(store.genderIx[m]!);
        return {
          id,
          age: ages[i]!,
          ...(gender ? { gender } : {}),
          ...(rule.noncitizen &&
          isNoncitizen(core.seed, id, rule.noncitizen.citizenShare)
            ? { noncitizen: true }
            : {}),
          working: job ? 1 : open ? share : 0,
          weeklyMinutes: job?.minutes ?? 0,
          wageDollars: job ? job.wage : open ? share * perUnplaced : 0,
        };
      });
      const hit = applyRule(rule, household);
      if (!hit.people) continue;
      // A record stands for `weight` real households: the same rule, times that.
      const weight = store.weightOf(h);
      const row = byGroup.get(h.group) ?? { people: 0, dollars: 0 };
      row.people += hit.people * weight;
      row.dollars += hit.dollars * weight;
      byGroup.set(h.group, row);
    }
  }
  let countedPeople = 0,
    countedDollars = 0;
  const groups: GroupReach[] = [];
  for (const [g, row] of [...byGroup].sort((a, b) => a[0] - b[0])) {
    const group = rt!.store.groups[g]!;
    countedPeople += row.people;
    countedDollars += row.dollars;
    groups.push({
      groupId: group.id,
      district: group.district,
      incomeBand: group.incomeBand,
      people: row.people,
      dollars: row.dollars,
    });
  }
  return {
    people: Math.round(full.people + countedPeople),
    dollars: full.dollars + countedDollars,
    full,
    counted: { people: countedPeople, dollars: countedDollars },
    byGroup: groups,
  };
}
