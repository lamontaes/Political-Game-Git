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
import {
  kindergartenYear,
  onCalendar,
  SCHOOL_STAGE_CALENDAR,
} from "./past-school-calendar";
import { decisionLean, traitLeanBetween } from "./trait-decisions";
import jobsJson from "./data/jobs/jobs.json" with { type: "json" };
import { profileFor } from "./opening-profile";
import { countedHeadcountOf } from "./residents-economy";
import {
  coarseSteps,
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  type HistoryRecord,
  type HistoryWriter,
  type PreStartWindow,
} from "./pre-start";
import { residenceOn } from "./past-moves";
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

export const PAST_WORK_SPELL = "person.work-spell";
export const PAST_WORK_OUT = "person.out-of-work";

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

/** The day a person is out of school, by the schooling their record gives. */
function entryOf(api: CoreAPI, person: PersonState): IsoDate {
  const p = (key: string) => api.parameter(key);
  const graduated = onCalendar(
    kindergartenYear(makeIsoDate(person.birthDate)) +
      SCHOOL_STAGE_CALENDAR.endsAfterYears.high,
    "ends",
  );
  const level =
    (person.pastFacts?.find((row) => row.kind === "profile:education")?.facts
      ?.level as string | undefined) ??
    profileFor(person, api.state.seed, api.state.date)?.education;
  const more =
    level === "college"
      ? p("pastWorkCollegeYears")
      : level === "some-college"
        ? p("pastWorkSomeCollegeYears")
        : 0;
  return makeIsoDate(
    addDays(graduated, Math.round(more * p("daysPerMeanYear"))),
  );
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
): number {
  const p = (key: string) => api.parameter(key);
  return (
    p("pastWorkFindsPerQuarter") *
    Math.pow(
      mean / month.unemploymentPct,
      p("pastWorkFindUnemploymentElasticity"),
    ) *
    Math.exp(p("pastWorkTraitSpread") * plan.applyLean)
  );
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
  const start = makeIsoDate(c.date);
  const entry = entryOf(api, person);
  if (entry > window.through) return undefined;
  const current = currentOf(c, person);
  const fallbackHourly =
    p("fallbackAnnualWageMinor") /
    (p("pastWorkWeeksPerYear") * p("pastWorkFullTimeWeeklyHours"));
  const base = {
    person,
    entry,
    hourlyMinor: current?.hourlyMinor || fallbackHourly,
    layoffLean: lean(c, person, "jobs.value-worker", "let-go", "keep"),
    quitLean: lean(c, person, "jobs.review-worker", "jobs-look", "jobs-stay"),
    applyLean: lean(c, person, "jobs.apply", "jobs-apply", "jobs-wait"),
  };
  if (current)
    return {
      ...base,
      current,
      end: current.since,
      endCause: "took-current-job",
      endCauseRecordId: current.jobId,
    };
  // Jobless on day one: retired by their own claim, home since their youngest
  // child was born, or still looking for as long as their pull to find work says.
  const age = ageOnDate(person.birthDate, start);
  const claim = person.pastFacts?.find(
    (row) => row.kind === "opening-income:retirement-claim",
  );
  if (claim || age >= p("jobsEarliestRetirementAge")) {
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
  const child = (person.pastFacts ?? [])
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
  const quarters = 1 / findRate(api, plan, monthOn(months, start), mean);
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
): Omit<HistoryRecord, "moduleId">[] {
  const c = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const months = conditionsOf(c);
  if (!months.length) return [];
  const mean =
    months.reduce((sum, row) => sum + row.unemploymentPct, 0) / months.length;
  const latestEarnings = [...months]
    .reverse()
    .find((row) => row.hourlyEarnings)?.hourlyEarnings;
  const firms = firmsOf(api);
  const quarterDays = p("pastWorkDaysPerQuarter");
  const steps = coarseSteps({ ...window, step: "quarter" });
  const runs: RunState[] = [];
  // The run is for people living where the world keeps businesses; the
  // working lives of officials and others elsewhere wait for their own
  // records (history-past-officials).
  const places = new Set(firms.map((firm) => firm.placeId));
  for (const person of [...people].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!places.has(person.placeId)) continue;
    const plan = planOf(api, person, window, months, mean);
    if (!plan || plan.end <= window.from) {
      if (plan?.current) runs.push(heldOnly(plan, window));
      continue;
    }
    const from = plan.entry > window.from ? plan.entry : window.from;
    if (plan.end <= from) {
      if (plan.current) runs.push(heldOnly(plan, window));
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
        plan.endCause === "let-go"
          ? monthOn(months, plan.end).recordId
          : plan.endCauseRecordId,
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
          run.outs.push({ startedAt: run.from, causeSpell: -1 });
        else begin(run, run.from, "before-the-run", quarter);
      }
      const begins = run.from > step ? run.from : step;
      const until = plan.end < next ? plan.end : next;
      const span =
        daysBetween(makeIsoDate(begins), makeIsoDate(until)) / quarterDays;
      const age = ageOnDate(plan.person.birthDate, step);
      const ageFactor = Math.pow(
        Math.max(age, p("pastWorkYoungestAge")) /
          p("pastWorkAgeReferenceYears"),
        -p("pastWorkAgeElasticity"),
      );
      let at = 0;
      while (at < span) {
        if (run.employed) {
          const layoff =
            p("pastWorkLayoffsPerQuarter") *
            (1 + p("pastWorkLayoffRisePerPoint") * rise) *
            Math.exp(p("pastWorkTraitSpread") * plan.layoffLean) *
            ageFactor;
          const quit =
            p("pastWorkQuitsPerQuarter") *
            Math.pow(
              mean / month.unemploymentPct,
              p("pastWorkQuitUnemploymentElasticity"),
            ) *
            Math.exp(p("pastWorkTraitSpread") * plan.quitLean) *
            // Better pay than the town's keeps a worker longer.
            Math.pow(
              firmById.get(run.employed.organizationId ?? "")?.payRatio ?? 1,
              -p("pastWorkQuitPayElasticity"),
            ) *
            ageFactor;
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
          const date = makeIsoDate(
            addDays(makeIsoDate(begins), Math.round(at * quarterDays)),
          );
          const leftFirm = run.employed.organizationId;
          if (toLayoff <= toQuit) {
            close(run, date, "let-go", month.recordId);
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
          const find = findRate(api, plan, month, mean);
          const toFind = (1 - run.findPull) / find;
          const left = span - at;
          if (toFind >= left) {
            run.findPull += find * left;
            at = span;
            break;
          }
          at += toFind;
          const date = makeIsoDate(
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
  for (const run of runs) if (!run.done) finish(run);
  return runs.flatMap((run) => recordsOf(api, run, window));
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
): Omit<HistoryRecord, "moduleId">[] {
  const { plan } = run;
  const personId = plan.person.id;
  // Each spell where the person lived when it began (history-past-moves).
  const placeOn = (date: string) =>
    residenceOn(api.state, plan.person, date).placeId;
  const inWindow = (date: IsoDate) => (date < window.from ? window.from : date);
  const said = source(api, "Pre-start working life (src/core2/past-work.ts).");
  const rows: Omit<HistoryRecord, "moduleId">[] = [];
  const spellId = (index: number) => `past-work:${personId}:${index + 1}`;
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
    if (row.startedAt > window.through) return;
    rows.push({
      id: `past-work:${personId}:out:${index + 1}`,
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
    (person) => person.alive && person.tier !== "husk",
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
 * The working lives of people filled in from the counts after the run, by the
 * same rule, against the openings the full people left (each reads them as
 * they stood, so who is filled in first changes nobody's past).
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
  const rows = people.flatMap((person) =>
    runPastWork(api, window, [person], new Map(openings)),
  );
  recordPreStartLater(core, moduleId, rows);
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
