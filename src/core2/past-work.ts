/**
 * The working life before the start (history-past-work; owner, Oct 27, 2026:
 * "fix history not simulating before 2025"). Every full adult's work from
 * leaving school to day one runs through the pre-start window quarter by
 * quarter, by the same decisions the jobs engine makes in play: an employer
 * keeps or lets go by how they work (`jobs.value-worker`), a worker looks
 * around by their lean toward looking (`jobs.review-worker`), and someone out
 * of work finds a job by their lean toward applying (`jobs.apply`). Each
 * quarter's pull comes from the economy pass's own month
 * (`economy.conditions`): layoffs rise as unemployment rises, quits fall and
 * finding work slows as it stays high. No roll decides anything: a pull adds
 * up quarter by quarter and the separation or hire happens on the day it
 * reaches one whole event, so the same person in the same economy has the
 * same life, and a different town or seed has different people and firms.
 *
 * The run ends in the opening as it stands: the job held on day one began on
 * its own recorded date, and someone jobless on day one stopped working on a
 * date their own records give (a child's birth, a retirement claim) or, if
 * none does, as long ago as their own pull toward finding work says they
 * would still be looking. Past jobs are at the businesses of the person's
 * town that were open by then (the business pass's founding dates), each
 * hire taking the employer with the most openings left that quarter.
 * Records name only full people; a person filled in later gets theirs then
 * (`pastWorkFor`), read against the openings the full people left.
 */
import { addDays, ageOnDate, daysBetween, makeIsoDate } from "./kernel/dates";
import { decisionLean, traitLeanBetween } from "./trait-decisions";
import jobsJson from "./data/jobs/jobs.json" with { type: "json" };
import { profileFor } from "./opening-profile";
import {
  kindergartenYear,
  onCalendar,
  SCHOOL_STAGE_CALENDAR,
} from "./past-school-calendar";
import { countedHeadcountOf } from "./residents-economy";
import {
  coarseSteps,
  grainDate,
  ownWindowOf,
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  wholePastOnce,
  type HistoryRecord,
  type HistoryWriter,
  type PreStartWindow,
} from "./pre-start";
import { ownPastKind } from "./own-past-kinds";
import { residenceOn } from "./past-moves";
import { openingWorkStatus } from "./jobs-elsewhere";
import { registerWorldMapPart } from "./snapshot";
import { stopgap } from "./stopgaps";
import { coreAPI } from "./state";
import type {
  CoreAPI,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  Source,
} from "./types";

export const PAST_WORK_SPELL = ownPastKind("person.work-spell");
/** The tier of relatives living elsewhere: kept out of the run over everyone, opened one at a time. */
const ELSEWHERE_TIER = "husk";
export const PAST_WORK_OUT = ownPastKind("person.out-of-work");

/** How a spell ended: let go, left for another job, stopped for a reason on record, or still held on day one. */
export type PastWorkEnd =
  "let-go" | "moved-on" | "child-born" | "retired" | "held-at-start";
/** How a spell began. */
/** "before-the-run": held when the run began in its first year, begun on or before that day. */
export type PastWorkHow =
  "first-job" | "after-out-of-work" | "moved-on" | "before-the-run";

interface Conditions {
  date: IsoDate;
  recordId: string;
  unemploymentPct: number;
  hourlyEarnings?: number;
}

interface Firm {
  id: string;
  placeId: string;
  foundedAt?: IsoDate;
  openingsPerQuarter: number;
  /** Its going hourly rate on day one: the mean of the jobs it pays. */
  hourlyMinor?: number;
  /** That rate against the mean of its town's employers (one where unknown). */
  payRatio: number;
}

/** What one person's run needs, read from their records before it starts. */
interface Plan {
  person: PersonState;
  /** First day out of school and able to work. */
  entry: IsoDate;
  /** The day the run stops: their day-one job's start, or the day they stopped working. */
  end: IsoDate;
  endCause: PastWorkEnd | "took-current-job";
  endCauseRecordId?: string;
  current?: {
    jobId: string;
    organizationId: string;
    since: IsoDate;
    hourlyMinor: number;
  };
  /** Hourly pay on day one (their job's, else the place's fallback wage). */
  hourlyMinor: number;
  layoffLean: number;
  quitLean: number;
  applyLean: number;
}

interface Spell {
  organizationId?: string;
  startedAt: IsoDate;
  how: PastWorkHow;
  hourlyMinor: number;
}

interface RunState {
  plan: Plan;
  spells: {
    spell: Spell;
    endedAt?: IsoDate;
    end?: PastWorkEnd;
    causeRecordId?: string;
  }[];
  outs: { startedAt: IsoDate; endedAt?: IsoDate; causeSpell: number }[];
  employed?: Spell;
  layoffPull: number;
  quitPull: number;
  findPull: number;
  /** The first quarter the person's clocks run in (a hire mid-quarter waits for the next). */
  from: IsoDate;
  done: boolean;
}

/** The jobs engine's actions by option id: the act kinds its chooser weighs. */
const JOB_ACTIONS: Readonly<Record<string, { actKinds: readonly string[] }>> =
  Object.fromEntries(
    Object.values(
      jobsJson.actions as Record<string, { id: string; actKinds: string[] }>,
    ).map((row) => [row.id, row]),
  );

const source = (api: CoreAPI, citation: string): Source => ({
  tag: "ESTIMATED",
  asOf: api.state.date,
  citation,
  estimatedFrom:
    "The pre-start run of the person's working life: their traits' leans in the jobs engine's own decisions, the economy pass's month and the town's businesses then.",
});

/** The economy pass's months, oldest first, as the run reads them. */
function conditionsOf(core: CoreState): Conditions[] {
  return preStartHistory(core, { kind: "economy.conditions" })
    .filter((row) => typeof row.facts.unemploymentPct === "number")
    .map((row) => ({
      date: row.date,
      recordId: row.id,
      unemploymentPct: row.facts.unemploymentPct as number,
      ...(typeof row.facts.hourlyEarnings === "number"
        ? { hourlyEarnings: row.facts.hourlyEarnings }
        : {}),
    }));
}

/** The month in force on a date: the latest at or before it, else the first. */
function monthOn(months: readonly Conditions[], date: string): Conditions {
  let found = months[0]!;
  for (const row of months) {
    if (row.date > date) break;
    found = row;
  }
  return found;
}

/** The town's businesses, their founding dates (the business pass) and openings a quarter. */
function firmsOf(api: CoreAPI): Firm[] {
  stopgap("SG-HIST-past-work-day-one-town");
  const c = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const founded = new Map(
    preStartHistory(c, { kind: "business.founded" }).map((row) => [
      String(row.facts.organizationId),
      row.date,
    ]),
  );
  // Openings for full people: the employer's hires a quarter at the national
  // hires rate, times the share of the town's workers who are full people.
  let full = 0;
  let all = 0;
  const firms: Firm[] = [];
  for (const book of c.finance.businesses.values()) {
    if (book.closedAt) continue;
    const org = c.organizations.get(book.organizationId);
    if (!org?.placeId) continue;
    const jobs = [...(c.finance.jobsByOrganization.get(org.id) ?? [])]
      .map((id) => c.jobs.get(id))
      .filter((job) => job && job.endsAt === undefined);
    const held = jobs.length;
    const rates = jobs.flatMap((job) =>
      job!.hourlyMinor
        ? [job!.hourlyMinor]
        : job!.hoursDaily > 0
          ? [job!.wageDailyMinor / job!.hoursDaily]
          : [],
    );
    const counted = countedHeadcountOf(c, org.id);
    full += held;
    all += held + counted;
    firms.push({
      id: org.id,
      placeId: org.placeId,
      ...(founded.has(org.id) ? { foundedAt: founded.get(org.id)! } : {}),
      openingsPerQuarter: (held + counted) * p("pastWorkHiresPerQuarter"),
      ...(rates.length
        ? { hourlyMinor: rates.reduce((a, b) => a + b, 0) / rates.length }
        : {}),
      payRatio: 1,
    });
  }
  const share = all > 0 ? full / all : 1;
  const paid = new Map<string, number[]>();
  for (const firm of firms)
    if (firm.hourlyMinor)
      paid.set(firm.placeId, [
        ...(paid.get(firm.placeId) ?? []),
        firm.hourlyMinor,
      ]);
  for (const firm of firms) {
    firm.openingsPerQuarter *= share;
    const town = paid.get(firm.placeId);
    if (firm.hourlyMinor && town?.length)
      firm.payRatio =
        firm.hourlyMinor / (town.reduce((a, b) => a + b, 0) / town.length);
  }
  return firms.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * A person's schooling level from their record (the opening profile's
 * `profile:education` fact, the CES levels `no-college`, `some-college` and
 * `college`), else what the profile gives them; null for a child.
 */
export function educationLevelOf(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
  /** The day the profile is read on: a relative elsewhere is read on the opening day. */
  on: string = core.date,
): string | undefined {
  return (
    (person.pastFacts?.find((row) => row.kind === "profile:education")?.facts
      ?.level as string | undefined) ??
    profileFor(person, core.seed, on)?.education
  );
}

/** The years of college a level holds (IPEDS program lengths), 0 for none. */
export function collegeYearsOf(
  api: CoreAPI,
  level: string | undefined,
): number {
  return level === "college"
    ? api.parameter("pastWorkCollegeYears")
    : level === "some-college"
      ? api.parameter("pastWorkSomeCollegeYears")
      : 0;
}

/** The last day of a person's high school, on the one calendar. */
export function highSchoolEndOf(person: Readonly<PersonState>): string {
  return onCalendar(
    kindergartenYear(makeIsoDate(person.birthDate)) +
      SCHOOL_STAGE_CALENDAR.endsAfterYears.high,
    "ends",
  );
}

/** The day a person is out of school: high school's end plus their college years. */
export function schoolingEndsOf(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
  on: string = core.date,
): string {
  const api = coreAPI(core as CoreState);
  return addDays(
    makeIsoDate(highSchoolEndOf(person)),
    Math.round(
      collegeYearsOf(api, educationLevelOf(core, person, on)) *
        api.parameter("daysPerMeanYear"),
    ),
  );
}
/** The day a person is out of school, by the schooling their record gives (the school pass's own day). */
function entryOf(
  api: CoreAPI,
  person: PersonState,
  /** The day the person's schooling is read on (their profile's day). */
  on: IsoDate,
): IsoDate {
  return makeIsoDate(schoolingEndsOf(api.state, person, on));
}

/** The person's day-one job, its start and pay, from the jobs engine's records. */
function currentOf(core: CoreState, person: PersonState): Plan["current"] {
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  if (!job || job.endsAt !== undefined) return undefined;
  const commitment = [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((id) => core.work.commitments.get(id)!)
    .find((row) => row?.jobId === job.id);
  const since = makeIsoDate(
    commitment?.heldSince ?? commitment?.startsAt ?? core.startedAt,
  );
  const hourlyMinor =
    job.hourlyMinor ??
    (job.hoursDaily > 0 ? job.wageDailyMinor / job.hoursDaily : 0);
  return {
    jobId: job.id,
    organizationId: job.organizationId,
    since,
    hourlyMinor,
  };
}

/**
 * A person's scaled lean (about -1 to 1) in one of the jobs engine's
 * decisions: the employer's formula decision by its own act kinds, a
 * worker's chooser decision by the act kinds of the jobs engine's actions.
 * The decisions' own weights are in their own units (years of tenure, score);
 * how far a lean moves a quarter's pull is `pastWorkTraitSpread`.
 */
const lean = (
  core: CoreState,
  person: PersonState,
  decisionId: string,
  toward: string,
  over: string,
) =>
  decisionId === "jobs.value-worker"
    ? decisionLean(core, person, decisionId, toward, over)
    : traitLeanBetween(
        core,
        person,
        JOB_ACTIONS[toward]!.actKinds,
        JOB_ACTIONS[over]!.actKinds,
      );

/** The quarterly pull toward finding work in a month, for a person's lean. */
function findRate(
  api: CoreAPI,
  plan: Plan,
  month: Conditions,
  mean: number,
  age: number,
): number {
  return findPerQuarter(api, mean / month.unemploymentPct, plan.applyLean, age);
}

/*
 * The working life's quarterly pulls: the one rule the pre-start run and the
 * review of lives elsewhere in play (src/core2/jobs-elsewhere.ts) share. Each
 * is a JOLTS or CPS rate moved by the economy's month, the person's age and
 * their traits' lean in the jobs engine's own decision; a pull adds up and an
 * event happens when it reaches one whole, never by a roll.
 */

/** How the pull to leave or be let go falls with age (the steady rate at the reference age). */
export function workAgeFactor(api: CoreAPI, age: number): number {
  const p = (key: string) => api.parameter(key);
  return Math.pow(
    Math.max(age, p("pastWorkYoungestAge")) / p("pastWorkAgeReferenceYears"),
    -p("pastWorkAgeElasticity"),
  );
}

/**
 * How finding work slows with age past the reference age (CPS mean weeks
 * unemployed run longer for the old); nobody finds faster for being young.
 * One factor for the pre-start run and the lives in play
 * (stopgapId: SG-LABOR-find-age-estimated).
 */
export function findAgeFactor(api: CoreAPI, age: number): number {
  const p = (key: string) => api.parameter(key);
  stopgap("SG-LABOR-find-age-estimated");
  return Math.pow(
    Math.max(age, p("pastWorkFindAgeReferenceYears")) /
      p("pastWorkFindAgeReferenceYears"),
    -p("pastWorkFindAgeElasticity"),
  );
}

/** Layoffs a quarter: JOLTS's rate, raised by a rise in unemployment (points over the quarter). */
export function layoffPerQuarter(
  api: CoreAPI,
  rise: number,
  lean: number,
  ageFactor: number,
): number {
  const p = (key: string) => api.parameter(key);
  return (
    p("pastWorkLayoffsPerQuarter") *
    (1 + p("pastWorkLayoffRisePerPoint") * rise) *
    Math.exp(p("pastWorkTraitSpread") * lean) *
    ageFactor
  );
}

/** Moves to another job a quarter: JOLTS's quits, fewer when work is scarce (mean over now) and when the pay is better. */
export function quitPerQuarter(
  api: CoreAPI,
  meanOverNow: number,
  lean: number,
  payRatio: number,
  ageFactor: number,
): number {
  const p = (key: string) => api.parameter(key);
  return (
    p("pastWorkQuitsPerQuarter") *
    Math.pow(meanOverNow, p("pastWorkQuitUnemploymentElasticity")) *
    Math.exp(p("pastWorkTraitSpread") * lean) *
    Math.pow(payRatio, -p("pastWorkQuitPayElasticity")) *
    ageFactor
  );
}

/** Finding work a quarter: CPS's spells out of work, longer when work is scarce. */
export function findPerQuarter(
  api: CoreAPI,
  meanOverNow: number,
  lean: number,
  /** The seeker's age in years; omitted, no age effect (the reference age's rate). */
  age?: number,
): number {
  const p = (key: string) => api.parameter(key);
  return (
    p("pastWorkFindsPerQuarter") *
    (age === undefined ? 1 : findAgeFactor(api, age)) *
    Math.pow(meanOverNow, p("pastWorkFindUnemploymentElasticity")) *
    Math.exp(p("pastWorkTraitSpread") * lean)
  );
}

/** A person's traits' leans in the jobs engine's three working-life decisions. */
export function workLeans(
  core: CoreState,
  person: PersonState,
): { layoffLean: number; quitLean: number; applyLean: number } {
  return {
    layoffLean: lean(core, person, "jobs.value-worker", "let-go", "keep"),
    quitLean: lean(
      core,
      person,
      "jobs.review-worker",
      "jobs-look",
      "jobs-stay",
    ),
    applyLean: lean(core, person, "jobs.apply", "jobs-apply", "jobs-wait"),
  };
}

function planOf(
  api: CoreAPI,
  person: PersonState,
  window: PreStartWindow,
  months: readonly Conditions[],
  mean: number,
): Plan | undefined {
  const c = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  // Someone living elsewhere keeps no job record: where they stood in work on
  // the opening day (the lives-elsewhere rule) is where their run ends, read
  // on that day so the past is the same whenever their card is opened.
  const elsewhere = person.tier === ELSEWHERE_TIER;
  if (elsewhere) stopgap("SG-LIVES-past-read-where-opened");
  const start = makeIsoDate(elsewhere ? c.startedAt : c.date);
  const entry = entryOf(api, person, start);
  if (entry > window.through) return undefined;
  const dayOne = elsewhere ? openingWorkStatus(api, person) : undefined;
  const current = currentOf(c, person);
  const fallbackHourly =
    p("fallbackAnnualWageMinor") /
    (p("pastWorkWeeksPerYear") * p("pastWorkFullTimeWeeklyHours"));
  const base = {
    person,
    entry,
    hourlyMinor: current?.hourlyMinor || fallbackHourly,
    ...workLeans(c, person),
  };
  if (current)
    return {
      ...base,
      current,
      end: current.since,
      endCause: "took-current-job",
      endCauseRecordId: current.jobId,
    };
  // At work on day one, with no employer on record: the spell is still held.
  if (dayOne === "employed")
    return { ...base, end: start, endCause: "held-at-start" };
  // Jobless on day one: retired by their own claim, home since their youngest
  // child was born, or still looking for as long as their pull to find work says.
  const age = ageOnDate(person.birthDate, start);
  const claim = person.pastFacts?.find(
    (row) => row.kind === "opening-income:retirement-claim",
  );
  if (claim || dayOne === "retired" || age >= p("jobsEarliestRetirementAge")) {
    const retiredAt = makeIsoDate(
      claim?.date ??
        addDays(
          makeIsoDate(person.birthDate),
          Math.round(p("jobsEarliestRetirementAge") * p("daysPerMeanYear")),
        ),
    );
    return {
      ...base,
      end: retiredAt < start ? retiredAt : window.through,
      endCause: "retired",
      ...(claim ? { endCauseRecordId: claim.id } : {}),
    };
  }
  // Looking for work on day one: no child's birth ended their working life.
  const child = (dayOne === "looking" ? [] : (person.pastFacts ?? []))
    .filter(
      (row) =>
        row.kind === "family:child" && row.date > entry && row.date < start,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (child)
    return {
      ...base,
      end: makeIsoDate(child.date),
      endCause: "child-born",
      endCauseRecordId: child.id,
    };
  // Still looking on day one: the spell began as many quarters back as one
  // whole find takes at day one's month and their lean.
  const plan = { ...base, end: start, endCause: "let-go" as const };
  const quarters = 1 / findRate(api, plan, monthOn(months, start), mean, age);
  return {
    ...plan,
    end: makeIsoDate(
      addDays(start, -Math.round(quarters * p("pastWorkDaysPerQuarter"))),
    ),
  };
}

/**
 * Runs the working lives of `people` through the window and returns their
 * records. `openings` is the employers' openings by firm and quarter, shared
 * across the run (and kept, so a person filled in later reads what was left).
 */
export function runPastWork(
  api: CoreAPI,
  window: PreStartWindow,
  people: readonly PersonState[],
  openings: Map<string, number>,
  /**
   * The same run over the years before the world's window (a person's own
   * past): `worldFrom` is the first day of the world's window, where the
   * person's life goes on in the run of the window itself. The dates a spell
   * is told on are the person's birthday in that year (`grainDate`), the
   * records the opening already holds keep their own days, and a life still
   * going at `worldFrom` is handed over, not closed.
   */
  before?: { worldFrom: IsoDate },
): Omit<HistoryRecord, "moduleId">[] {
  const c = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const months = conditionsOf(c);
  if (!months.length) return [];
  if (before) stopgap("SG-PEOPLE-whole-past-first-month-economy");
  const mean =
    months.reduce((sum, row) => sum + row.unemploymentPct, 0) / months.length;
  const latestEarnings = [...months]
    .reverse()
    .find((row) => row.hourlyEarnings)?.hourlyEarnings;
  const firms = firmsOf(api);
  const quarterDays = p("pastWorkDaysPerQuarter");
  const steps = coarseSteps({
    ...window,
    step: before ? "year" : "quarter",
  });
  const runs: RunState[] = [];
  // The run is for people living where the world keeps businesses; the
  // working lives of officials and others elsewhere wait for their own
  // records (history-past-officials).
  const places = new Set(firms.map((firm) => firm.placeId));
  for (const person of [...people].sort((a, b) => a.id.localeCompare(b.id))) {
    // A relative living elsewhere, opened one at a time, works where the
    // world keeps no employers: no employer is named (SG-LIVES-work-no-employer).
    if (!places.has(person.placeId) && person.tier !== ELSEWHERE_TIER) continue;
    const plan = planOf(api, person, window, months, mean);
    if (!plan || plan.end <= window.from) {
      if (plan?.current && !before) runs.push(heldOnly(plan, window));
      continue;
    }
    const from = plan.entry > window.from ? plan.entry : window.from;
    if (plan.end <= from) {
      if (plan.current && !before) runs.push(heldOnly(plan, window));
      continue;
    }
    runs.push({
      plan,
      spells: [],
      outs: [],
      layoffPull: 0,
      quitPull: 0,
      findPull: 0,
      from,
      done: false,
    });
  }
  const firmById = new Map(firms.map((firm) => [firm.id, firm]));
  // Before the world's window a spell is told on the person's birthday in its
  // year (a year at a step); a day inside the window keeps its own.
  const told = (plan: Plan, date: string): IsoDate => {
    if (!before || date >= before.worldFrom) return makeIsoDate(date);
    const day = grainDate(plan.person, date, before.worldFrom);
    // Never later than the day the run stops: the job held on day one, a
    // retirement or a child's birth keep their own days, so a spell told on
    // the birthday of the year before is still before it.
    return day > plan.end
      ? grainDate(
          plan.person,
          `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`,
          before.worldFrom,
        )
      : day;
  };
  // The economy pass's record in force on a date; before its first month
  // the first month stands (SG-PEOPLE-whole-past-first-month-economy).
  const causeOn = (date: string) => monthOn(months, date).recordId;
  // Pay then: the employer's going rate (else the person's own on day one),
  // moved back by the national hourly earnings of the month.
  const payOn = (plan: Plan, date: string, organizationId?: string) => {
    const earned = monthOn(months, date).hourlyEarnings;
    return Math.round(
      (firmById.get(organizationId ?? "")?.hourlyMinor ?? plan.hourlyMinor) *
        (earned && latestEarnings ? earned / latestEarnings : 1),
    );
  };
  // A hire takes the open employer of the town with the most openings left
  // this quarter, never the one just left; ties by record id. Someone who
  // quit for other work takes the best-paying one with an opening that pays
  // more than the job they left (the jobs engine's better offer).
  const hire = (
    run: RunState,
    date: IsoDate,
    quarter: string,
    left?: string,
    better?: number,
  ) => {
    // The day-one employer is the one they went to last, never before.
    // Before they came to the county they worked where they lived then,
    // where the world keeps no employers (history-past-moves).
    const livedIn = residenceOn(c, run.plan.person, date).placeId;
    const open = firms.filter(
      (firm) =>
        firm.placeId === livedIn &&
        (!firm.foundedAt || firm.foundedAt <= date) &&
        firm.id !== left &&
        firm.id !== run.plan.current?.organizationId,
    );
    // A new employer before one worked for already, while the town has one.
    const before = new Set(run.spells.map((row) => row.spell.organizationId));
    const fresh = open.filter((firm) => !before.has(firm.id));
    const town = fresh.length ? fresh : open;
    // Someone whose town has no business on record (an official elsewhere)
    // worked where the records do not reach: no employer is named.
    const remaining = (firm: Firm) =>
      openings.get(`${firm.id}|${quarter}`) ?? firm.openingsPerQuarter;
    let best: Firm | undefined;
    if (better !== undefined)
      for (const firm of town)
        if (
          remaining(firm) > 0 &&
          (firm.hourlyMinor ?? 0) > better &&
          (!best || firm.hourlyMinor! > best.hourlyMinor!)
        )
          best = firm;
    if (!best)
      for (const firm of town)
        if (!best || remaining(firm) > remaining(best)) best = firm;
    if (best) openings.set(`${best.id}|${quarter}`, remaining(best) - 1);
    return best?.id;
  };
  const begin = (
    run: RunState,
    date: IsoDate,
    how: PastWorkHow,
    quarter: string,
    left?: string,
    better?: number,
  ) => {
    const organizationId = hire(run, date, quarter, left, better);
    run.employed = {
      ...(organizationId ? { organizationId } : {}),
      startedAt: date,
      how,
      hourlyMinor: payOn(run.plan, date, organizationId),
    };
    run.layoffPull = 0;
    run.quitPull = 0;
  };
  const close = (
    run: RunState,
    date: IsoDate,
    end: PastWorkEnd,
    causeRecordId?: string,
  ) => {
    run.spells.push({
      spell: run.employed!,
      endedAt: date,
      end,
      ...(causeRecordId ? { causeRecordId } : {}),
    });
    run.employed = undefined;
  };
  // Day one's own ending of the run: the job the person holds now, or the
  // reason on record they stopped.
  const finish = (run: RunState) => {
    const { plan } = run;
    run.done = true;
    if (plan.endCause === "held-at-start") {
      // At work on day one: a stretch out of work ends in the job still held.
      const out = run.outs.at(-1);
      if (!run.employed && out && !out.endedAt) {
        out.endedAt = plan.end;
        begin(
          run,
          plan.end,
          "after-out-of-work",
          plan.end.slice(0, "YYYY-MM".length),
          run.spells.at(-1)?.spell.organizationId,
        );
      }
      if (run.employed) {
        run.spells.push({ spell: run.employed, end: "held-at-start" });
        run.employed = undefined;
      }
      return;
    }
    if (plan.endCause === "took-current-job") {
      if (run.employed) close(run, plan.end, "moved-on", plan.current!.jobId);
      else if (run.outs.at(-1) && !run.outs.at(-1)!.endedAt)
        run.outs.at(-1)!.endedAt = plan.end;
      return;
    }
    if (run.employed)
      close(
        run,
        plan.end,
        plan.endCause as PastWorkEnd,
        plan.endCause === "let-go" ? causeOn(plan.end) : plan.endCauseRecordId,
      );
    // Out of work when the run ended: still out on day one (or for good).
    if (plan.endCause === "let-go" && !run.outs.some((row) => !row.endedAt))
      run.outs.push({ startedAt: plan.end, causeSpell: run.spells.length - 1 });
  };
  for (const [index, step] of steps.entries()) {
    const next = steps[index + 1] ?? addDays(makeIsoDate(window.through), 1);
    const quarter = step.slice(0, "YYYY-MM".length);
    const month = monthOn(months, step);
    // The rise in unemployment over the quarter, from the month a step back.
    const previous = monthOn(months, steps[index - 1] ?? step);
    const rise = Math.max(0, month.unemploymentPct - previous.unemploymentPct);
    for (const run of runs) {
      if (run.done || run.from >= next) continue;
      const { plan } = run;
      if (!run.employed && !run.outs.length && !run.spells.length) {
        // Out of school inside the run: first looking for work, from the day
        // they left. Out of school before it: at work when it begins.
        if (plan.entry >= window.from)
          run.outs.push({ startedAt: told(plan, run.from), causeSpell: -1 });
        else begin(run, run.from, "before-the-run", quarter);
      }
      const begins = run.from > step ? run.from : step;
      const until = plan.end < next ? plan.end : next;
      const span =
        daysBetween(makeIsoDate(begins), makeIsoDate(until)) / quarterDays;
      const age = ageOnDate(plan.person.birthDate, step);
      const ageFactor = workAgeFactor(api, age);
      let at = 0;
      while (at < span) {
        if (run.employed) {
          const layoff = layoffPerQuarter(
            api,
            rise,
            plan.layoffLean,
            ageFactor,
          );
          // Better pay than the town's keeps a worker longer.
          const quit = quitPerQuarter(
            api,
            mean / month.unemploymentPct,
            plan.quitLean,
            firmById.get(run.employed.organizationId ?? "")?.payRatio ?? 1,
            ageFactor,
          );
          const toLayoff = (1 - run.layoffPull) / layoff;
          const toQuit = (1 - run.quitPull) / quit;
          const left = span - at;
          if (Math.min(toLayoff, toQuit) >= left) {
            run.layoffPull += layoff * left;
            run.quitPull += quit * left;
            at = span;
            break;
          }
          at += Math.min(toLayoff, toQuit);
          const date = told(
            plan,
            addDays(makeIsoDate(begins), Math.round(at * quarterDays)),
          );
          const leftFirm = run.employed.organizationId;
          if (toLayoff <= toQuit) {
            close(run, date, "let-go", causeOn(date));
            run.outs.push({
              startedAt: date,
              causeSpell: run.spells.length - 1,
            });
            run.findPull = 0;
          } else {
            const was = run.employed.hourlyMinor;
            close(run, date, "moved-on");
            begin(run, date, "moved-on", quarter, leftFirm, was);
          }
        } else {
          const find = findRate(api, plan, month, mean, age);
          const toFind = (1 - run.findPull) / find;
          const left = span - at;
          if (toFind >= left) {
            run.findPull += find * left;
            at = span;
            break;
          }
          at += toFind;
          const date = told(
            plan,
            addDays(makeIsoDate(begins), Math.round(at * quarterDays)),
          );
          const out = run.outs.at(-1)!;
          out.endedAt = date;
          const lastFirm = run.spells.at(-1)?.spell.organizationId;
          begin(
            run,
            date,
            out.causeSpell < 0 ? "first-job" : "after-out-of-work",
            quarter,
            lastFirm,
          );
        }
      }
      if (plan.end < next) finish(run);
    }
  }
  for (const run of runs) {
    if (run.done) continue;
    // A life still going where the world's window starts is handed to the run
    // of the window: its open spell or time out of work is left open.
    if (before && run.plan.end > before.worldFrom) {
      if (run.employed) {
        run.spells.push({ spell: run.employed });
        run.employed = undefined;
      }
      run.done = true;
    } else finish(run);
  }
  return runs.flatMap((run) => recordsOf(api, run, window, before));
}

/** A day-one job held since before the run (or since before school ended): its one record. */
function heldOnly(plan: Plan, window: PreStartWindow): RunState {
  return {
    plan,
    spells: [],
    outs: [],
    layoffPull: 0,
    quitPull: 0,
    findPull: 0,
    from: window.from,
    done: true,
  };
}

function recordsOf(
  api: CoreAPI,
  run: RunState,
  window: PreStartWindow,
  before?: { worldFrom: IsoDate },
): Omit<HistoryRecord, "moduleId">[] {
  const { plan } = run;
  const personId = plan.person.id;
  // The years before the world's window have their own ids, so a record of
  // the window's run and one of the years before it never share one.
  const mark = before ? "pre:" : "";
  // Each spell where the person lived when it began (history-past-moves).
  const placeOn = (date: string) =>
    residenceOn(api.state, plan.person, date).placeId;
  const told = (date: IsoDate) => inWindow(date);
  const inWindow = (date: IsoDate) =>
    before
      ? date < before.worldFrom
        ? grainDate(plan.person, date, before.worldFrom)
        : date
      : date < window.from
        ? window.from
        : date;
  const said = source(api, "Pre-start working life (src/core2/past-work.ts).");
  const rows: Omit<HistoryRecord, "moduleId">[] = [];
  const spellId = (index: number) =>
    `past-work:${personId}:${mark}${index + 1}`;
  run.spells.forEach((row, index) => {
    if (row.endedAt && row.endedAt < window.from) return;
    if (row.spell.startedAt > window.through) return;
    rows.push({
      id: spellId(index),
      date: inWindow(row.spell.startedAt),
      kind: PAST_WORK_SPELL,
      placeId: placeOn(row.spell.startedAt),
      personIds: [personId],
      facts: {
        personId,
        startedAt: row.spell.startedAt,
        how: row.spell.how,
        hourlyMinor: row.spell.hourlyMinor,
        ...(row.spell.organizationId
          ? { organizationId: row.spell.organizationId }
          : {}),
        ...(row.endedAt ? { endedAt: row.endedAt } : {}),
        ...(row.end ? { end: row.end } : {}),
        ...(row.causeRecordId ? { causeRecordId: row.causeRecordId } : {}),
      },
      publicRecord: false,
      source: said,
    });
  });
  run.outs.forEach((row, index) => {
    if (row.endedAt && row.endedAt < window.from) return;
    // Years before the window are told a year at a step: a stretch that began
    // and ended in one year (the months after school) is not told.
    if (before && row.endedAt && told(row.endedAt) === told(row.startedAt))
      return;
    if (row.startedAt > window.through) return;
    rows.push({
      id: `past-work:${personId}:${mark}out:${index + 1}`,
      date: inWindow(row.startedAt),
      kind: PAST_WORK_OUT,
      placeId: placeOn(row.startedAt),
      personIds: [personId],
      facts: {
        personId,
        startedAt: row.startedAt,
        ...(row.endedAt ? { endedAt: row.endedAt } : {}),
        ...(row.causeSpell >= 0
          ? { causeRecordId: spellId(row.causeSpell) }
          : { after: "school" }),
      },
      publicRecord: false,
      source: said,
    });
  });
  // The job held on day one, with how it began.
  if (plan.current && plan.current.since <= window.through) {
    const last = run.spells.at(-1);
    const out = run.outs.at(-1);
    const how: PastWorkHow =
      last && last.end === "moved-on" && last.endedAt === plan.current.since
        ? "moved-on"
        : out && out.endedAt === plan.current.since && out.causeSpell >= 0
          ? "after-out-of-work"
          : plan.current.since < window.from ||
              plan.entry < window.from ||
              plan.current.since < plan.entry
            ? "before-the-run"
            : "first-job";
    rows.push({
      id: `past-work:${personId}:held`,
      date: inWindow(plan.current.since),
      kind: PAST_WORK_SPELL,
      placeId: plan.person.placeId,
      personIds: [personId],
      facts: {
        personId,
        startedAt: plan.current.since,
        how,
        hourlyMinor: Math.round(plan.current.hourlyMinor),
        organizationId: plan.current.organizationId,
        jobId: plan.current.jobId,
        end: "held-at-start",
      },
      publicRecord: false,
      source: said,
    });
  }
  return rows;
}

/** The people the run is for: full people who are not relatives living elsewhere. */
export function pastWorkPeople(core: CoreState): PersonState[] {
  return [...core.people.values()].filter(
    (person) => person.alive && person.tier !== ELSEWHERE_TIER,
  );
}

/** The employers' openings left by quarter once the full people's run is over. */
const OPENINGS = new WeakMap<CoreState, Map<string, number>>();
registerWorldMapPart("core2-past-work-openings", OPENINGS);

/** The pre-start pass's own entry: everyone full, written through the history. */
export function pastWorkHistory(
  api: CoreAPI,
  window: PreStartWindow,
  history: HistoryWriter,
): void {
  const openings = new Map<string, number>();
  OPENINGS.set(api.state as CoreState, openings);
  for (const row of runPastWork(
    api,
    window,
    pastWorkPeople(api.state as CoreState),
    openings,
  ))
    history.record(row);
}

/**
 * A person's working life from leaving school up to the day the world's
 * window starts, a year at a step (their own past), and how it joins the
 * run of the window: the run of the window began them at its first day in a
 * job "held since before the run", and the years before are what that
 * clipped. A spell still going at the window's first day is that first record
 * with its true start and how it began; a stretch out of work still going
 * ends where the window's first job begins; a job held on day one since
 * before the window gets its true start. Returns the records to drop (the
 * window's own, restated) and the records to write.
 */
function withYearsBefore(
  api: CoreAPI,
  person: PersonState,
  window: PreStartWindow,
  inside: readonly Omit<HistoryRecord, "moduleId">[],
  openings: ReadonlyMap<string, number>,
): { drop: string[]; add: Omit<HistoryRecord, "moduleId">[] } {
  const own = ownWindowOf(api.state as CoreState, person);
  if (!own || own.from >= window.from) return { drop: [], add: [] };
  const years = runPastWork(
    api,
    {
      from: own.from,
      through: addDays(makeIsoDate(window.from), -1),
      step: "year",
    },
    [person],
    new Map(openings),
    { worldFrom: window.from },
  );
  const drop: string[] = [];
  const add = [...years];
  const id = (tail: string) => `past-work:${person.id}:${tail}`;
  const first = inside.find((row) => row.id === id("1"));
  const held = inside.find((row) => row.id === id("held"));
  const openSpell = years.find(
    (row) => row.kind === PAST_WORK_SPELL && row.facts.endedAt === undefined,
  );
  const openOut = years.find(
    (row) => row.kind === PAST_WORK_OUT && row.facts.endedAt === undefined,
  );
  if (first?.facts.how === "before-the-run" && (openSpell || openOut)) {
    drop.push(first.id);
    if (openSpell) {
      // The same spell, begun in the years before the window.
      add.splice(add.indexOf(openSpell), 1);
      add.push({
        ...first,
        date: openSpell.date,
        facts: {
          ...first.facts,
          startedAt: openSpell.facts.startedAt!,
          how: openSpell.facts.how!,
        },
      });
    } else if (openOut) {
      // Out of work until the window's first job.
      add.splice(add.indexOf(openOut), 1, {
        ...openOut,
        facts: { ...openOut.facts, endedAt: first.facts.startedAt! },
      });
      add.push({
        ...first,
        facts: { ...first.facts, how: "after-out-of-work" },
      });
    }
  }
  // A year-before record never shares an id with a record of the window,
  // except the job held on day one, which the years before restate.
  const ids = new Set(add.map((row) => row.id));
  if (held && ids.has(held.id)) drop.push(held.id);
  else if (held?.facts.how === "before-the-run") {
    const since = held.facts.startedAt;
    const moved = years.find(
      (row) => row.kind === PAST_WORK_SPELL && row.facts.endedAt === since,
    );
    const out = years.find(
      (row) => row.kind === PAST_WORK_OUT && row.facts.endedAt === since,
    );
    const how = moved ? "moved-on" : out ? "after-out-of-work" : undefined;
    if (how) {
      drop.push(held.id);
      add.push({ ...held, facts: { ...held.facts, how } });
    }
  }
  return { drop, add };
}

/**
 * A person's whole working life, once (their own past): the run of the world's
 * window (the one the pre-start run gave a full person, else the one a person
 * filled in later gets, against the openings the full people left, each
 * reading them as they stood, so who is filled in first changes nobody's
 * past) and the years before it. A full person's records of the window stay;
 * the years before join them.
 */
export function pastWorkFor(
  core: CoreState,
  people: readonly PersonState[],
  moduleId: string,
): void {
  const window = preStartWindowOf(core);
  const openings = OPENINGS.get(core);
  if (!window || !openings || !people.length) return;
  const api = coreAPI(core);
  for (const person of people) {
    if (!wholePastOnce(core, person.id, "work")) continue;
    const held = pastWorkOf(core, person.id);
    const inside = held.length
      ? held
      : runPastWork(api, window, [person], new Map(openings));
    const { drop, add } = withYearsBefore(
      api,
      person,
      window,
      inside,
      openings,
    );
    const gone = new Set(drop);
    recordPreStartLater(
      core,
      moduleId,
      held.length
        ? add
        : [...inside.filter((row) => !gone.has(row.id)), ...add],
      { person: person.id, drop: held.length ? drop : [] },
    );
  }
}

/** A person's working life before the start, oldest first. */
export function pastWorkOf(
  core: CoreState,
  personId: PersonId,
): readonly HistoryRecord[] {
  return preStartHistory(core, { personId }).filter(
    (row) => row.kind === PAST_WORK_SPELL || row.kind === PAST_WORK_OUT,
  );
}

/** The record of the job a person holds on day one, with when they started it. */
export function heldSinceRecord(
  core: CoreState,
  personId: PersonId,
  jobId: string | undefined,
): HistoryRecord | undefined {
  if (!jobId) return undefined;
  return pastWorkOf(core, personId).find(
    (row) => row.kind === PAST_WORK_SPELL && row.facts.jobId === jobId,
  );
}
