/**
 * Jobs: openings from need, looking and applying as choices, hiring on fit,
 * quits and layoffs for reasons, and unemployment as a recorded state.
 *
 * Monthly, on the 1st: each open business compares the staff its books call
 * for with the staff it has and opens positions or lays off; each worker
 * chooses to stay, look around, or leave work. Weekly, on Mondays: seekers
 * apply to open positions through the shared chooser, each employer offers
 * its best-placed applicant, and the applicant accepts or declines. Every
 * job change is a record with its reason and, for a layoff, who decided it.
 */
import type { ModuleTable } from "../module-state";
import { addDays, daysBetweenText, makeIsoDate } from "../kernel/dates";
import { chooseAct, decisionFromScores, scoreOffers } from "../choice";
import jobsData from "../data/jobs/jobs.json" with { type: "json" };
import ageUnemployment from "../data/jobs/age-unemployment.json" with { type: "json" };
import jobsParameters from "../data/jobs/parameters.json" with { type: "json" };
import seasonal from "../data/jobs/seasonal.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import {
  decisionLean,
  decisionTraitWeight,
  leanedByKinds,
} from "../trait-decisions";
import {
  businessTradingMonth,
  ownerOf,
  type BusinessTradingMonth,
} from "./business";
import {
  ageBiasAt,
  recordEmployerBound,
  recordHiredUnderBan,
} from "../jobs-age-bias";
import { LAWS_MODULE_ID, lawInForce, socialSecurityAges } from "./laws";
import { publicPayFloorHourly } from "../public-pay-floor";
import { inCustody } from "./justice";
import { regionalMonth } from "./regional";
import { ageOn, isDemoted } from "../counted-groups";
import { webFactorFor, type Subject } from "../outcome-web-reach";
import {
  countedFacts,
  fullFacts,
  inGroup,
  lowWageStaffFactor,
  markUnwiredLaborLinks,
  participationShift,
  type LaborFacts,
} from "../jobs-web";
import {
  countedHouseholdJobChanged,
  keepCalendar,
  countedHouseholdOf,
  householdCash,
  residentFacts,
  residentPerson,
  residentsRuntime,
} from "./residents";
import { PROFILE_FACT_KINDS, profileFor } from "../opening-profile";
import { collegeOf, graduationOf } from "../school-outcomes";
import { SCHOOL_MODULE_ID } from "../school-measures";
import { claimRetirementNow } from "./retirement-claims";
import { MOVED_AWAY_EVENT } from "./moves";
import { endClaim, fileClaim, payClaims } from "../jobs-benefits";
import { meetAtWork } from "../encounters";
import { lawApplied } from "../law-reach/applied";
import {
  addCountedJob,
  countedJobHeads,
  countedJobsOf,
  endCountedJob,
  rerateCountedJobs,
} from "../residents-economy";
import type {
  ActOffer,
  ActionDefinition,
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  JobInput,
  WorkCommitmentInput,
  PersonState,
  Source,
} from "../types";
import type { WorkPayrollCalendarInput } from "../work-pay-period";
import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
import { DEFAULT_HEALTH_DATA, severityImpulse } from "./health";
import { fillInPerson } from "../state";
import { worldOffsetShare, worldRate } from "../world-draw";

export const JOBS_MODULE_ID = "jobs";
export const JOBS_PARAMETERS = jobsParameters as unknown as Readonly<
  Record<string, Parameter>
>;
export const JOBS_DATA = jobsData;
const PULL = "jobs:pull";
const MONDAY = 1;
const DAYS_PER_WEEK = 7;

type Kind = keyof typeof jobsData.actions;
export interface PositionRow {
  id: string;
  organizationId: string;
  placeId: string;
  templateJobId: string;
  title: string;
  occupation: string;
  hourlyMinor: number;
  openedAt: string;
  status: "open" | "filled" | "withdrawn";
  reasonKey: string;
  filledBy?: string;
  /** The job of the worker this opening replaces (who died, moved, quit or retired), and who held it. */
  replacesJobId?: string;
  replacesPersonId?: string;
  /** Held for the person the player controls while they decide on its offer. */
  offeredTo?: string;
  offerId?: string;
  /** How many jobs the opening stands for: a counted worker's household weight; absent for one. */
  heads?: number;
  /** The owner raised this unfilled opening's pay: when last, how many times, and what it first offered. */
  raisedOn?: string;
  raises?: number;
  firstHourlyMinor?: number;
  raisedBy?: string;
  /** The budget line (and the measure that changed it) that funds this opening at a public employer. */
  fundedBy?: { readonly key: string; readonly lawId: string };
}
/** A job offered to the person the player controls: theirs to accept or decline. */
export interface JobOfferRow {
  id: string;
  personId: string;
  positionId: string;
  organizationId: string;
  /** The person at the employer who makes the offer: the scene it stages is theirs. */
  offeredBy: string;
  title: string;
  hourlyMinor: number;
  fit: number;
  offeredAt: string;
  /** The last day to answer; the employer withdraws the offer after it. */
  deadline: string;
  status: "pending" | "accepted" | "declined" | "lapsed" | "withdrawn";
  answeredAt?: string;
}
interface SeekerRow {
  id: string;
  personId: string;
  placeId: string;
  employed: boolean;
  since: string;
  reasonKey: string;
  /** Pay the seeker measures offers against: their own, or their last. */
  referenceHourlyMinor: number;
  /** The chooser's reasons for the decision that made them a seeker, each as a number with their sum. */
  reasons?: Record<string, number>;
}
interface EmployerRow {
  id: string;
  openingStaff: number;
  /**
   * How many jobs each of its opening job records stood for, on average (one
   * at the sample size). Its books are kept at one worker per record, so
   * receipts taken in at the town's weight are read against them divided by
   * this.
   */
  openingScale?: number;
  /** Fractional staffing need carried between reviews: positive hires, negative lays off. */
  need: number;
  /** Sales-supported staff, smoothed as receipts arrive across paydays. */
  salesStaff?: number;
  /** A new business's template for its first roles. */
  templateFromId?: string;
  /** The staff mix at the opening: each role's head count and a job to copy for it. */
  mix?: Record<string, { count: number; templateJobId: string }>;
  /** Fraction of a posting's withdrawal carried to the next review. */
  withdrawCarry?: number;
  /** Jobs of workers who left (died, moved, quit, retired), oldest first, each to be replaced. */
  leavers?: { jobId: string; personId: string; heads?: number }[];
  /** The counted workers' jobs at the last review (job to worker), to find who left outside the jobs engine. */
  countedJobs?: Record<string, string>;
  /** The full people's jobs at the last review (job to worker), to find who left outside the jobs engine (hired to a public post, appointed, taken into custody). */
  fullJobs?: Record<string, string>;
  /** What each of those jobs stood for at the last review, in jobs (the household weight), for a worker whose household is gone. */
  countedHeads?: Record<string, number>;
}

function store(api: CoreAPI) {
  return api.moduleState(JOBS_MODULE_ID);
}
/** The reason on a seeker row for someone jobless when the world opened. */
const OPENING_UNEMPLOYED = "opening-unemployed";

const core = (api: CoreAPI) => api.state as CoreState;

function source(api: CoreAPI, estimatedFrom: string): Source {
  return {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation: jobsData.source.citation,
    estimatedFrom,
  };
}

function fullJobs(api: CoreAPI, organizationId: string) {
  const c = core(api);
  return [...(c.finance.jobsByOrganization.get(organizationId) ?? [])]
    .map((id) => c.jobs.get(id)!)
    .filter((job) => job.endsAt === undefined && c.people.get(job.personId));
}

/** An employer's staff: its full people's jobs and its counted workers' jobs. */
export function currentJobs(api: CoreAPI, organizationId: string) {
  return [
    ...fullJobs(api, organizationId),
    ...countedJobsOf(core(api), organizationId),
  ];
}

/** How many jobs a job record stands for: one for a full person's, the household weight for a counted worker's. */
function headsOf(c: CoreState, job: Pick<JobInput, "id" | "personId">): number {
  return c.jobs.has(job.id) ? 1 : countedJobHeads(c, job);
}

/** The jobs a staff holds, a counted worker's record standing for its household's weight. */
function staffHeads(c: CoreState, jobs: readonly JobInput[]): number {
  let heads = 0;
  for (const job of jobs) heads += headsOf(c, job);
  return heads;
}

/** The jobs an opening stands for. */
const positionHeads = (position: Pick<PositionRow, "heads">): number =>
  position.heads ?? 1;

/** A person's traits, whether they are a full person or still counted. */
function traitsOf(
  api: CoreAPI,
  personId: string,
): Readonly<Record<string, number>> {
  return (
    core(api).people.get(personId)?.traits ??
    residentFacts(core(api), personId)?.traits ??
    {}
  );
}

/**
 * The person the player controls decides their own work: the engine never
 * chooses for them whether to look, apply, take, quit or leave a job.
 */
function controlled(c: CoreState, personId: string): boolean {
  return personId === c.playerId || isExplicitlyControlledPersonV1(c, personId);
}

/** In the counts: no full record, or a full person returned to the counts (their jobs are counted jobs). */
function isCounted(api: CoreAPI, personId: string): boolean {
  const person = core(api).people.get(personId);
  return !person || isDemoted(person);
}

function definition(kind: Kind): ActionDefinition {
  const row = jobsData.actions[kind];
  return {
    id: row.id,
    actKinds: row.actKinds,
    // A goal the act serves (securing a home again) adds its urgency.
    goalKinds: (row as { goalKinds?: readonly string[] }).goalKinds ?? [],
    need: jobsData.need,
    effortParameter: jobsData.effortParameter,
    effectParameter: jobsData.effectParameter,
    targetKind: jobsData.targetKind,
    effect: jobsData.effect,
  };
}

/** One offer whose module reasons carry their already-measured values. */
function offer(
  kind: Kind,
  targetId: string,
  reasons: Readonly<Record<string, number>>,
): ActOffer {
  return {
    definition: definition(kind),
    targetId,
    availableHours: 1,
    effortHours: 0,
    reasonBindings: Object.entries(reasons).map(([id, value]) => ({
      id,
      provider: PULL,
      weightParameter: "jobsRateWeight",
      arguments: { value: String(value) },
    })),
  };
}

function record(
  api: CoreAPI,
  row: {
    personId: string;
    organizationId: string;
    jobId: string;
    kind: "hire" | "quit" | "layoff" | "staff-shed" | "closure" | "left-work";
    reasonKey: string;
    decidedBy: string;
    values?: Readonly<Record<string, number>>;
    tradingId?: string;
    /** The jobs the change itself moved, where fewer than the job stands for (a staff cut that sheds part of a counted job). */
    heads?: number;
  },
): void {
  // The people the change stands for when it happens (a counted job's heads,
  // one for a full person), kept on the change so a later fill-in doesn't
  // rewrite it.
  const heads =
    row.heads ?? headsOf(core(api), { id: row.jobId, personId: row.personId });
  // A worker who leaves (a quit, retirement, move or death) is replaced: the employer's need grows by one at once.
  if (row.kind === "quit" || row.kind === "left-work")
    noteLeaver(api, row.organizationId, row.jobId, row.personId, heads);
  store(api)
    .table("changes")
    .put({
      id: `job-change:${api.state.date}:${row.jobId}:${row.kind}`,
      date: api.state.date,
      ...row,
      heads,
      values: { ...(row.values ?? {}) },
    });
}

/**
 * Someone left an employer's staff: its need grows by the jobs they stood for (one for a full person) at once, and the
 * leaver's job waits to be replaced in the same role (owner, Oct 14: every
 * role is refilled when its holder dies, leaves or is removed).
 */
function noteLeaver(
  api: CoreAPI,
  organizationId: string,
  jobId: string,
  personId: string,
  heads: number,
): void {
  const employer = store(api).table("employers").get(organizationId) as
    EmployerRow | undefined;
  if (!employer) return;
  store(api)
    .table("employers")
    .put({
      ...employer,
      need: employer.need + heads,
      leavers: [
        ...(employer.leavers ?? []),
        { jobId, personId, ...(heads === 1 ? {} : { heads }) },
      ],
    });
}

/** A job by id, a full person's or a counted worker's. */
function jobById(api: CoreAPI, jobId: string): JobInput | undefined {
  return (
    core(api).jobs.get(jobId) ?? residentsRuntime(core(api))?.jobs.get(jobId)
  );
}

/**
 * A worker died: their job ends at the next day's calendar work (a job
 * ends before the day's work, never after a shift), and they are replaced.
 */
function workerDied(api: CoreAPI, personId: string, eventId: string): void {
  const person = core(api).people.get(personId);
  const job = person?.jobId ? core(api).jobs.get(person.jobId) : undefined;
  if (!job || job.endsAt !== undefined) return;
  record(api, {
    personId,
    organizationId: job.organizationId,
    jobId: job.id,
    kind: "left-work",
    reasonKey: jobsData.reasons.died,
    decidedBy: eventId,
  });
  const date = addDays(makeIsoDate(api.state.date), 1);
  api.moduleCalendar(JOBS_MODULE_ID).schedule({
    key: `end:${job.id}`,
    date,
    kind: "jobs-end",
    source: source(api, `The job of a worker who died (${eventId}) ends.`),
    sourceRecordIds: [job.id, eventId],
  });
}

/** A worker moved away: the moves engine ended their job; they are replaced. */
function workerMoved(
  api: CoreAPI,
  event: Readonly<{
    id: string;
    personIds: readonly string[];
    facts?: Readonly<Record<string, unknown>>;
  }>,
): void {
  for (const personId of event.personIds) {
    // Someone who moved away is no longer looking for work here: their search
    // ends with the move, in whichever tier it was held.
    for (const table of ["seekers", "countedSeekers"] as const)
      store(api).table(table).remove(personId);
    for (const row of store(api)
      .table("spells")
      .query("open", [personId, true]))
      store(api)
        .table("spells")
        .put({ ...row, endedAt: api.state.date, open: false });
    const jobId = event.facts?.[`person:${personId}:job`];
    if (typeof jobId !== "string") continue;
    const job = jobById(api, jobId);
    if (!job) continue;
    record(api, {
      personId,
      organizationId: job.organizationId,
      jobId,
      kind: "left-work",
      reasonKey: jobsData.reasons.movedAway,
      decidedBy: personId,
    });
  }
}

/**
 * Counted workers who left an employer outside the jobs engine since the
 * last review (the wider population's deaths and moves, which end or drop
 * their jobs) are replaced as full workers are: their jobs join their
 * employers' leavers. Each employer keeps the counted jobs it had at the last
 * review; one that is gone, not ended by the jobs engine and not now a full
 * person's job, left. Counted leavers keep no reasons (owner, Oct 14, ruling
 * 3). One pass a month.
 */
function noteCountedLeavers(api: CoreAPI): void {
  const c = core(api),
    rt = residentsRuntime(c);
  if (!rt) return;
  const changes = store(api).table("changes");
  const employers = store(api).table("employers");
  // The jobs engine's own endings need no replacement beyond what it queued.
  // A death is recorded the day before its job ends.
  const endedByJobs = (endsAt: string, id: string) =>
    ["layoff", "quit", "left-work", "closure", "staff-shed"].some((kind) =>
      [endsAt, addDays(makeIsoDate(endsAt), -1)].some((date) =>
        changes.get(`job-change:${date}:${id}:${kind}`),
      ),
    );
  const live = new Map<string, Record<string, string>>();
  for (const job of rt.jobs.values())
    if (!job.endsAt) {
      const held = live.get(job.organizationId) ?? {};
      held[job.id] = job.personId;
      live.set(job.organizationId, held);
    }
  for (const row of employers.query("all", [
    true,
  ]) as unknown as EmployerRow[]) {
    const now = live.get(row.id) ?? {};
    const closed = c.finance.businesses.get(row.id)?.closedAt;
    // A counted job a full person now holds counts as theirs; one they held
    // and lost since the last review is a leaver like any other.
    const held = { ...row.countedJobs, ...row.fullJobs };
    for (const id of closed ? [] : Object.keys(held)) {
      if (now[id]) continue;
      const job = c.jobs.get(id) ?? rt.jobs.get(id);
      if (job && c.jobs.has(id) && job.endsAt === undefined) continue;
      if (job?.endsAt !== undefined && endedByJobs(job.endsAt, id)) continue;
      noteLeaver(api, row.id, id, held[id]!, row.countedHeads?.[id] ?? 1);
    }
    const fresh = (employers.get(row.id) as unknown as EmployerRow) ?? row;
    const heads: Record<string, number> = {};
    for (const [id, personId] of Object.entries(now)) {
      const weight = countedJobHeads(c, { id, personId });
      if (weight !== 1) heads[id] = weight;
    }
    const fullNow: Record<string, string> = {};
    for (const id of c.finance.jobsByOrganization.get(row.id) ?? []) {
      const job = c.jobs.get(id);
      if (job && job.endsAt === undefined) fullNow[id] = job.personId;
    }
    employers.put({
      ...fresh,
      countedJobs: now,
      fullJobs: fullNow,
      ...(Object.keys(heads).length ? { countedHeads: heads } : {}),
    });
  }
}

/**
 * A seeker's push to apply: a jobless seeker needs work (`need`, in play the
 * household's runway-scaled need from `unemployedNeed`), and the push fades
 * as the search drags on (a long search wears down the effort a seeker puts
 * in: Krueger and Mueller 2011 report search time falling sharply through
 * the spell). It is half its starting size after `jobsSearchFatigueWeeks`; a
 * worker looking while employed has none. The one reason full and counted
 * seekers weigh, so a seeker's own search length, not a flat constant, sets
 * where personality can tip the choice.
 */
export function applyNeed(
  p: (key: string) => number,
  seeker: Pick<SeekerRow, "employed" | "since">,
  today: string,
  need: number = p("jobsUnemployedNeedWeight"),
): number {
  if (seeker.employed) return p("zero");
  const weeks = daysBetweenText(seeker.since, today) / p("daysPerWeek");
  return need / (p("one") + weeks / p("jobsSearchFatigueWeeks"));
}

function startSeeking(
  api: CoreAPI,
  personId: string,
  employed: boolean,
  reasonKey: string,
  referenceHourlyMinor: number,
): void {
  if (inCustody(api, personId)) return;
  const person = core(api).people.get(personId)!;
  store(api).table("seekers").put({
    id: personId,
    isSeeker: true,
    personId,
    placeId: person.placeId,
    employed,
    since: api.state.date,
    reasonKey,
    referenceHourlyMinor,
  });
  if (!employed) {
    store(api)
      .table("spells")
      .put({
        id: `spell:${personId}:${api.state.date}`,
        personId,
        startedAt: api.state.date,
        open: true,
        reasonKey,
      });
  }
}

function endSpell(api: CoreAPI, personId: string): void {
  endClaim(api, store(api).table("claims"), personId);
  for (const row of store(api)
    .table("spells")
    .query("open", [personId, true])) {
    store(api)
      .table("spells")
      .put({ ...row, endedAt: api.state.date, open: false });
  }
}

/**
 * The unemployment rate in a place at the opening, in percent: its region's
 * (the regional series, from the state's and county's labor statistics), else
 * the nation's where the place has no region, else the long-run rate.
 */
function openingRate(api: CoreAPI, placeId: string): number {
  const c = core(api);
  const macro = c.modules.has("macro")
    ? (api.moduleState("macro").table("state").get("macro:state") as
        { latestMonth: string } | undefined)
    : undefined;
  if (macro) {
    const regional = c.modules.has("regional")
      ? regionalMonth(api, placeId, macro.latestMonth)
      : undefined;
    if (regional?.unemploymentPct !== undefined)
      return regional.unemploymentPct;
    const nation = api
      .moduleState("macro")
      .table("months")
      .get(`macro-month:${macro.latestMonth}`) as
      { unemploymentPct: number } | undefined;
    if (nation) return nation.unemploymentPct;
  }
  return api.parameter("macroNaturalUnemploymentPct");
}

/** An age's band in the labor-force table. */
function ageBand(age: number): number {
  const index = ageUnemployment.bands.findIndex(
    (band) => age >= band.from && age < band.to,
  );
  return Math.max(0, index);
}

/** A band's published unemployment rate over the overall rate (calibration). */
export function publishedBandRatio(index: number): number {
  const band = ageUnemployment.bands[index]!,
    total = ageUnemployment.total;
  return (
    band.unemployed / band.laborForce / (total.unemployed / total.laborForce)
  );
}

/**
 * A band's unemployment rate over the overall rate in this world; a place's
 * rate times it is the band's rate there. The band's rate is the published
 * one moved once by the world's offset, relative to its nearer bound (owner,
 * Oct 27: realistic, not real).
 */
export function bandRatio(index: number, seed: string): number {
  const band = ageUnemployment.bands[index]!,
    total = ageUnemployment.total;
  return (
    worldRate(
      band.unemployed / band.laborForce,
      seed,
      `age-unemployment:${index}`,
      "jobsWorldAgeRateSpreadShare",
    ) /
    (total.unemployed / total.laborForce)
  );
}

/**
 * The seekers each age band holds in each place: a band's jobs held times its
 * rate over one minus its rate, the place's rate scaled by the band's ratio.
 * A place's seekers are the sum over its bands, rounded once, and handed to
 * the bands by largest remainder, so a small place keeps its seekers.
 * `held` is keyed `place|band`; the result is keyed the same way.
 */
function bandQuotas(
  api: CoreAPI,
  held: Map<string, number>,
): Map<string, number> {
  const hundred = api.parameter("macroHundred"),
    byPlace = new Map<string, { key: string; exact: number }[]>();
  for (const [key, jobs] of [...held].sort(([a], [b]) => a.localeCompare(b))) {
    const [placeId, index] = key.split("|") as [string, string];
    const rate =
      bandRatio(Number(index), core(api).seed) * openingRate(api, placeId);
    byPlace.set(placeId, [
      ...(byPlace.get(placeId) ?? []),
      { key, exact: (jobs * rate) / (hundred - rate) },
    ]);
  }
  const quotas = new Map<string, number>();
  for (const rows of byPlace.values()) {
    let left =
      Math.round(rows.reduce((sum, row) => sum + row.exact, 0)) -
      rows.reduce((sum, row) => sum + Math.floor(row.exact), 0);
    for (const row of rows) quotas.set(row.key, Math.floor(row.exact));
    for (const row of [...rows].sort(
      (a, b) => (b.exact % 1) - (a.exact % 1) || a.key.localeCompare(b.key),
    )) {
      if (left <= 0) break;
      quotas.set(row.key, quotas.get(row.key)! + 1);
      left--;
    }
  }
  return quotas;
}

/**
 * The opening's seekers among the named people: jobless working-age adults
 * with the most pressing need to work, in each place as many as that place's
 * rate implies against the jobs its named workers hold. (The wider
 * population's seekers are chosen the same way by `openCountedSeekers`.)
 */
function openSeekers(api: CoreAPI): void {
  const c = core(api),
    [young, old] = jobsData.workingAge as [number, number];
  const ageOf = (person: PersonState) =>
    daysBetweenText(person.birthDate, c.date) /
    api.parameter("jobsDaysPerYear");
  // The jobs held, counted by place and age band: the place's labor force.
  const heldBy = new Map<string, number>();
  for (const job of c.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const holder = c.people.get(job.personId);
    if (!holder) continue;
    const key = `${holder.placeId}|${ageBand(ageOf(holder))}`;
    heldBy.set(key, (heldBy.get(key) ?? 0) + 1);
  }
  const jobless = [...c.people.values()].filter((person) => {
    const age = ageOf(person);
    return (
      person.alive &&
      !person.jobId &&
      !controlled(c, person.id) &&
      age >= young &&
      age < old &&
      c.households.has(person.householdId)
    );
  });
  // Need to work: the fewest days the person's money covers.
  const days = (person: PersonState) =>
    person.livingCostDailyMinor > 0
      ? person.liquidMinor / person.livingCostDailyMinor
      : Number.POSITIVE_INFINITY;
  // In each place and age band, as many as the band's rate there implies
  // against the jobs held in the band; the neediest within the band seek.
  const groups = new Map<string, PersonState[]>();
  for (const person of jobless) {
    const key = `${person.placeId}|${ageBand(ageOf(person))}`;
    groups.set(key, [...(groups.get(key) ?? []), person]);
  }
  const quotas = bandQuotas(api, heldBy);
  for (const key of [...groups.keys()].sort()) {
    groups
      .get(key)!
      .sort((a, b) => days(a) - days(b) || a.id.localeCompare(b.id))
      .slice(0, quotas.get(key) ?? 0)
      .forEach((person) =>
        startSeeking(api, person.id, false, OPENING_UNEMPLOYED, 0),
      );
  }
}

/** The wider population's seekers at the opening: jobless working-age adults in the households with the fewest earners, as many as the rate implies. */
function openCountedSeekers(api: CoreAPI): void {
  const c = core(api),
    rt = residentsRuntime(c);
  if (!rt) return;
  const [young, old] = jobsData.workingAge as [number, number];
  const working = new Set(
    [...rt.wageFlowByJob.keys()].map((id) => rt.jobs.get(id)?.personId),
  );
  const candidates: {
    personId: string;
    placeId: string;
    share: number;
    band: number;
  }[] = [];
  const workingBy = new Map<string, number>();
  const counted = rt.store;
  const ageAt = (m: number) =>
    daysBetweenText(counted.born[m]!, c.date) /
    api.parameter("jobsDaysPerYear");
  for (const h of counted.liveHouseholds()) {
    const adults = counted.countedMembers(h).filter((m) => {
      const age = ageAt(m);
      return age >= young && age < old;
    });
    if (!adults.length) continue;
    const share =
      adults.filter((m) => working.has(counted.ids[m]!)).length / adults.length;
    for (const m of adults) {
      const personId = counted.ids[m]!;
      const placeId = counted.strings[counted.placeIx[m]!]!,
        band = ageBand(ageAt(m));
      if (working.has(personId)) {
        const key = `${placeId}|${band}`;
        workingBy.set(key, (workingBy.get(key) ?? 0) + 1);
      }
      if (!working.has(personId) && !inCustody(api, personId))
        candidates.push({ personId, placeId, share, band });
    }
  }
  // In each place and age band, as many as the band's rate there implies
  // against the jobs its counted workers hold: the same rule as the named
  // people, times the count.
  const quotas = bandQuotas(api, workingBy);
  for (const key of [
    ...new Set(candidates.map((row) => `${row.placeId}|${row.band}`)),
  ].sort()) {
    candidates
      .filter((row) => `${row.placeId}|${row.band}` === key)
      .sort((a, b) => a.share - b.share || a.personId.localeCompare(b.personId))
      .slice(0, quotas.get(key) ?? 0)
      .forEach((row) =>
        store(api).table("countedSeekers").put({
          id: row.personId,
          isSeeker: true,
          personId: row.personId,
          placeId: row.placeId,
          employed: false,
          since: c.date,
          reasonKey: OPENING_UNEMPLOYED,
          referenceHourlyMinor: 0,
        }),
      );
  }
}

/** A job's role: its occupation, or its title where it has none. */
const roleOf = (job: Pick<JobInput, "occupationClassification" | "title">) =>
  job.occupationClassification ?? job.title;

/** An employer's staff mix: each role's head count and a job to copy for it (a full worker's, which carries a schedule and payday, before a counted one). */
export function roleMix(
  jobs: readonly JobInput[],
  full: readonly JobInput[] = [],
  heads: (job: JobInput) => number = () => 1,
): Record<string, { count: number; templateJobId: string }> {
  const fullIds = new Set(full.map((job) => job.id));
  const mix: Record<string, { count: number; templateJobId: string }> = {};
  for (const job of [...jobs].sort((a, b) => a.id.localeCompare(b.id))) {
    const role = roleOf(job),
      row = mix[role];
    if (!row) mix[role] = { count: heads(job), templateJobId: job.id };
    else {
      row.count += heads(job);
      if (fullIds.has(job.id) && !fullIds.has(row.templateJobId))
        row.templateJobId = job.id;
    }
  }
  return mix;
}

/**
 * The roles in the order a new position should fill them: most under their
 * share of the staff mix first. A role's deficit is its share of the staff
 * (counting the position being filled) less the staff and open positions it
 * has now; ties go to the role name.
 */
export function rolesByDeficit(
  mix: Readonly<Record<string, { count: number }>>,
  have: Readonly<Record<string, number>>,
  filling = 1,
): string[] {
  const total = Object.values(mix).reduce((sum, row) => sum + row.count, 0);
  const held = Object.values(have).reduce((sum, n) => sum + n, 0);
  if (!total) return [];
  return Object.keys(mix)
    .map((role) => ({
      role,
      deficit:
        (mix[role]!.count / total) * (held + filling) - (have[role] ?? 0),
    }))
    .sort((a, b) => b.deficit - a.deficit || a.role.localeCompare(b.role))
    .map((row) => row.role);
}

/**
 * How far a place's unemployment rate sits above the natural rate, in points,
 * read from the latest month of the regional series (the nation's where the
 * place has no region; 0 where no economy runs). One read per place a day.
 */
const unemploymentReads = new WeakMap<
  CoreState,
  { date: string; byPlace: Map<string, number> }
>();
function unemploymentGap(api: CoreAPI, placeId: string): number {
  const c = core(api);
  let cache = unemploymentReads.get(c);
  if (!cache || cache.date !== c.date)
    unemploymentReads.set(c, (cache = { date: c.date, byPlace: new Map() }));
  const known = cache.byPlace.get(placeId);
  if (known !== undefined) return known;
  let gap = 0;
  const macro = c.modules.has("macro")
    ? (api.moduleState("macro").table("state").get("macro:state") as
        { latestMonth: string } | undefined)
    : undefined;
  if (macro) {
    const regional = c.modules.has("regional")
      ? regionalMonth(api, placeId, macro.latestMonth)
      : undefined;
    const rate =
      regional?.unemploymentPct ??
      (
        api
          .moduleState("macro")
          .table("months")
          .get(`macro-month:${macro.latestMonth}`) as
          { unemploymentPct: number } | undefined
      )?.unemploymentPct;
    if (rate !== undefined)
      gap = rate - api.parameter("macroNaturalUnemploymentPct");
  }
  cache.byPlace.set(placeId, gap);
  return gap;
}

function open(api: CoreAPI): void {
  const c = core(api);
  for (const [id, book] of c.finance.businesses) {
    if (book.closedAt) continue;
    const jobs = currentJobs(api, id);
    const heads = staffHeads(c, jobs);
    const scale = jobs.length ? heads / jobs.length : 1;
    store(api)
      .table("employers")
      .put({
        id,
        isEmployer: true,
        openingStaff: heads,
        ...(scale !== 1 ? { openingScale: scale } : {}),
        need: 0,
        mix: roleMix(jobs, fullJobs(api, id), (job) => headsOf(c, job)),
      });
  }
  openCountedSeekers(api);
  openSeekers(api);
  store(api).table("state").put({ id: "jobs:state", openedAt: c.date });
  scheduleReview(api);
  scheduleWeek(api);
}

function scheduleReview(api: CoreAPI): void {
  const date = `${api.state.date.slice(0, "YYYY-MM".length)}-01`;
  const next =
    addDays(makeIsoDate(date), 32).slice(0, "YYYY-MM".length) + "-01";
  api.moduleCalendar(JOBS_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: "jobs-review",
    source: source(api, "Monthly employer and worker reviews."),
    sourceRecordIds: ["jobs:state"],
  });
}

function scheduleWeek(api: CoreAPI): void {
  let date = addDays(makeIsoDate(api.state.date), 1);
  while (new Date(`${date}T00:00:00Z`).getUTCDay() !== MONDAY)
    date = addDays(date, 1);
  api.moduleCalendar(JOBS_MODULE_ID).schedule({
    key: `week:${date}`,
    date,
    kind: "jobs-week",
    source: source(api, "Weekly applications and offers."),
    sourceRecordIds: ["jobs:state"],
  });
}

function openPositions(api: CoreAPI, organizationId: string): PositionRow[] {
  return store(api)
    .table("positions")
    .query("byEmployerStatus", [
      organizationId,
      "open",
    ]) as unknown as PositionRow[];
}

/** Each open business: the staff its demand calls for against the staff it has. */
/**
 * An industry's employment this month against the opening month's, from BLS
 * CES seasonal factors; 1 for kinds with no series. With a world's seed
 * (play), the industry's swing is this world's own: each month's deviation
 * from 1 moved by one offset for the series (owner, Oct 27: realistic, not
 * real). Without it, the published factors (calibration).
 */
export function seasonalStaffing(
  kindId: string,
  date: string,
  openedAt: string,
  seed?: string,
): number {
  const code = (seasonal.kinds as Record<string, string>)[kindId];
  const factors = code
    ? (seasonal.factors as Record<string, number[]>)[code]
    : undefined;
  if (!factors) return 1;
  const month = (iso: string) => Number(iso.slice(5, 7)) - 1;
  const swing =
    seed === undefined
      ? 1
      : 1 +
        worldOffsetShare(
          seed,
          `seasonal:${code}`,
          "jobsWorldSeasonalSpreadShare",
        );
  const at = (m: number) => 1 + (factors[m]! - 1) * swing;
  return at(month(date)) / at(month(openedAt));
}

/** Persistent losses reduce affordable staff; a profitable month restores it smoothly. */
export function affordableStaff(
  projected: number,
  staff: number,
  trading: BusinessTradingMonth | undefined,
): number {
  if (!trading || trading.payrollMinor <= 0) return projected;
  const deficit = Math.max(0, trading.costsMinor - trading.salesMinor);
  if (deficit === 0) return projected;
  const unaffordable = staff * Math.min(1, deficit / trading.payrollMinor);
  const persistence = trading.lossMonths / (1 + trading.lossMonths);
  return Math.min(projected, Math.max(0, staff - unaffordable * persistence));
}

/**
 * An opening nobody has taken may be offered more by its owner (owner, Oct 16:
 * "if they can't afford it they can't afford it; if they're stubborn they
 * might not do it"). The raise is read from the employer's books and its
 * owner's traits; no step and no waiting period is fixed.
 *
 * - What the seat can carry: each head's share of what the last month left
 *   after purchases and compliance (the wages it has to cover), read against
 *   the opening's pay now. A seat already paid at or above that share is not
 *   raised: the employer cannot afford it.
 * - What the empty seat has cost: the days it has stood empty times that
 *   share a day. Nothing has been lost on the first day, so nothing is raised
 *   on it; the longer it stands, the more the owner will add.
 * - Who decides: the owner's open-handedness, from the shared chooser
 *   (`decisionLean`), scales what they will add; a stubborn owner adds
 *   nothing.
 * The added monthly cost is the least of those three and the room the last
 * month's trading left, which raises already given this review use up. An
 * opening a counted worker will fill stands for their household's weight, so
 * its raise costs that many seats' worth of the room.
 */
export function raiseUnfilledPay(
  api: CoreAPI,
  organizationId: string,
  positions: PositionRow[],
  trading: BusinessTradingMonth | undefined,
  heads: number,
): void {
  const c = core(api);
  if (!trading || trading.days <= 0 || heads <= 0) return;
  const ownerId = ownerOf(api, organizationId);
  const owner = ownerId ? c.people.get(ownerId) : undefined;
  if (!ownerId || !owner?.alive) return;
  const lean = decisionLean(
    c,
    owner,
    "jobs.raise-for-opening",
    "raise-pay",
    "hold-pay",
  );
  const openHanded =
    (1 + decisionTraitWeight(c, "jobs.raise-for-opening") * lean) / 2;
  if (openHanded <= 0) return;
  const monthDays = api.parameter("jobsDaysPerYear") / 12;
  const perMonth = monthDays / trading.days;
  // What the last month left after wages, purchases and compliance, in a month's days, less raises already given this review. The trading month's costs already hold all three.
  let room = (trading.salesMinor - trading.costsMinor) * perMonth;
  // What one head's seat can carry in a month: sales less purchases and compliance (the costs less the wages they hold), shared across the heads.
  const carriesMonthly =
    ((trading.salesMinor - trading.costsMinor + trading.payrollMinor) *
      perMonth) /
    heads;
  if (carriesMonthly <= 0) return;
  for (const [at, position] of positions.entries()) {
    if (position.status !== "open" || position.offeredTo) continue;
    const hours = jobById(api, position.templateJobId)?.hoursDaily ?? 0;
    if (hours <= 0) continue;
    const since = position.raisedOn ?? position.openedAt;
    const waited =
      (Date.parse(`${c.date}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) /
      86_400_000;
    // What the seat has cost standing empty since it was last priced.
    const lost = (waited * carriesMonthly) / monthDays;
    const paysMonthly = position.hourlyMinor * hours * monthDays;
    const seats = positionHeads(position);
    const added = Math.min(
      room / seats,
      carriesMonthly - paysMonthly,
      lost * openHanded,
    );
    const next = position.hourlyMinor + Math.floor(added / (hours * monthDays));
    if (next <= position.hourlyMinor) continue;
    room -= (next - position.hourlyMinor) * hours * monthDays * seats;
    const raised: PositionRow = {
      ...position,
      hourlyMinor: next,
      raisedOn: c.date,
      raises: (position.raises ?? 0) + 1,
      firstHourlyMinor: position.firstHourlyMinor ?? position.hourlyMinor,
      raisedBy: ownerId,
    };
    store(api)
      .table("positions")
      .put(raised as unknown as { id: string });
    // The caller's rows are the table's own and read-only: its list takes the raised row.
    positions[at] = raised;
  }
}

function reviewEmployers(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const opened =
    (
      store(api).table("state").get("jobs:state") as
        { openedAt?: string } | undefined
    )?.openedAt ?? c.date;
  for (const row of store(api)
    .table("employers")
    .query("all", [true]) as unknown as EmployerRow[]) {
    const book = c.finance.businesses.get(row.id);
    if (!book || book.closedAt) continue;
    const jobs = currentJobs(api, row.id),
      positions = [...openPositions(api, row.id)];
    // Staff and postings in jobs: a counted worker's record stands for its household's weight.
    const staff = staffHeads(c, jobs);
    recordEmployerBound(
      api,
      row.id,
      c.organizations.get(row.id)?.placeId ?? "",
      staff,
    );
    let posted = positions.reduce((n, row) => n + positionHeads(row), 0);
    const projected =
      (book.capacityMinor > 0
        ? // Real demand: the books' demand in the business's own opening prices.
          (row.openingStaff * book.annualDemandMinor) /
          ((book.price / book.anchorPrice || 1) * book.capacityMinor)
        : row.openingStaff) *
      // The season: the industry's staffing this month against the opening's (BLS CES seasonal factors).
      seasonalStaffing(book.kindId, c.date, opened, c.seed);
    const trading = businessTradingMonth(api, row.id);
    raiseUnfilledPay(api, row.id, positions, trading, staff);
    const observedStaff =
      trading && trading.days > 0 && book.capacityMinor > 0
        ? (row.openingStaff * trading.salesMinor * p("jobsDaysPerYear")) /
          (trading.days *
            (book.price / book.anchorPrice || 1) *
            book.capacityMinor *
            (row.openingScale ?? 1))
        : projected;
    const previousSalesStaff = row.salesStaff ?? projected;
    const salesStaff =
      previousSalesStaff +
      p("jobsStaffGapActedPerMonth") * (observedStaff - previousSalesStaff);
    // The market forecast already reads regional and national conditions.
    // Actual receipts let firms diverge when customers pay different sellers.
    // The web's factor on low-wage jobs (a higher wage floor) moves the
    // employer's own target by the low-wage share of its staff.
    let lowHeads = 0;
    for (const job of jobs)
      if ((job.hourlyMinor ?? 0) < p("jobsLowWageLineHourlyMinor"))
        lowHeads += headsOf(c, job);
    const demandTarget =
      (projected * (1 - p("jobsSalesForecastWeight")) +
        salesStaff * p("jobsSalesForecastWeight")) *
      lowWageStaffFactor(
        api,
        c.organizations.get(row.id)!.placeId,
        lowHeads,
        staff,
      );
    const target =
      trading && trading.lossMonths > 0
        ? affordableStaff(demandTarget, staff, trading)
        : demandTarget;
    const monthlyPayroll = book.annualPayrollMinor / p("macroMonthsPerYear");
    const cash = c.organizations.get(row.id)!.liquidMinor;
    // Hiring leans on the cash in reach of a few months of payroll; a gap below staff needs no cash to act on.
    const reach =
      cash / (cash + p("jobsCashCoverMonths") * monthlyPayroll || 1);
    // Staff and postings beyond the target lapse gradually: each position of surplus withdraws a share of a posting a month, the rest carried.
    const excess = Math.max(0, Math.min(posted, staff + posted - target));
    let carry =
      excess > 0
        ? (row.withdrawCarry ?? 0) + p("jobsWithdrawActedPerMonth") * excess
        : 0;
    while (carry >= 1 && positions.length) {
      const position = positions.pop()!;
      store(api)
        .table("positions")
        .put({ ...position, status: "withdrawn" });
      carry -= positionHeads(position);
      posted -= positionHeads(position);
    }
    if (!positions.length || excess === 0) carry = 0;
    const gap = target - staff - posted;
    // A firm losing money cannot defer the unaffordable payroll as long as
    // an ordinary demand adjustment. The same loss memory that supports a
    // closure moves its response smoothly toward the full staffing gap.
    const lossPressure =
      (trading?.lossMonths ?? 0) / (1 + (trading?.lossMonths ?? 0));
    const adjustment = p("jobsStaffGapActedPerMonth");
    const shrinkAdjustment = adjustment + (1 - adjustment) * lossPressure;
    // Replacements for leavers count only while staff is below target; above it, attrition does the shrinking.
    // A shrink carried from an earlier month is stale once the firm is short of staff: a leaver's job is still owed.
    const owed = (row.leavers ?? []).reduce((n, l) => n + (l.heads ?? 1), 0);
    let need =
      (gap > 0 ? Math.max(row.need, owed) : Math.min(row.need, 0)) +
      (gap > 0 ? adjustment * gap * reach : shrinkAdjustment * gap);
    // A new business's first roles come from its template business.
    const from =
      jobs.length || !row.templateFromId ? row.id : row.templateFromId;
    const activeTemplates = from === row.id ? jobs : currentJobs(api, from);
    const templateEmployer =
      from === row.id
        ? row
        : (store(api).table("employers").get(from) as EmployerRow | undefined);
    // A live firm does not forget its roles when its last worker leaves.
    // Retained jobs still supply the schedule and pay for a replacement.
    const fromJobs = activeTemplates.length
      ? activeTemplates
      : Object.values(templateEmployer?.mix ?? row.mix ?? {}).flatMap(
          (role) => {
            const job = jobById(api, role.templateJobId);
            return job ? [job] : [];
          },
        );
    // With no role to copy, a business can't open positions; its need waits, never past its gap.
    if (!fromJobs.length && need > 0) need = Math.min(need, Math.max(0, gap));
    // The roles the staff is made of (cooks and servers alike, counted workers included), and what the employer holds of each now.
    const mix =
      row.mix ??
      roleMix(fromJobs, fullJobs(api, from), (job) => headsOf(c, job));
    const have: Record<string, number> = {};
    for (const job of jobs)
      have[roleOf(job)] = (have[roleOf(job)] ?? 0) + headsOf(c, job);
    for (const position of positions)
      have[position.occupation] =
        (have[position.occupation] ?? 0) + positionHeads(position);
    // What a new opening stands for when no leaver's job is being replaced: the employer's counted workers' typical weight.
    const countedStaff = jobs.filter((job) => !c.jobs.has(job.id));
    const typical = countedStaff.length
      ? staffHeads(c, countedStaff) / countedStaff.length
      : 1;
    const live = fullJobs(api, from);
    const copyable = (role: string): JobInput | undefined => {
      const ofRole = fromJobs.filter((job) => roleOf(job) === role);
      // A full person's job gives a new position its schedule and payday; a counted job when there is none.
      const full = ofRole.filter((job) =>
        live.some((row) => row.id === job.id),
      );
      const pool = full.length ? full : ofRole;
      if (pool.length)
        return [...pool].sort((a, b) => a.id.localeCompare(b.id))[
          (positions.length + Math.floor(need)) % pool.length
        ];
      // A role nobody holds now is copied from the job that held it.
      const id = mix[role]?.templateJobId;
      return id
        ? (c.jobs.get(id) ?? residentsRuntime(c)?.jobs.get(id))
        : undefined;
    };
    const leavers = [...(row.leavers ?? [])];
    // A leaver recorded with no weight stood for one job.
    const standsFor = (leaver?: { heads?: number }) =>
      leaver ? (leaver.heads ?? 1) : typical;
    while (need >= standsFor(leavers[0]) && fromJobs.length) {
      // A leaver's role is refilled first, as that role; then the role furthest below the mix.
      const replaces = leavers.shift();
      const stands = standsFor(replaces);
      const left = replaces ? jobById(api, replaces.jobId) : undefined;
      const role =
        left && copyable(roleOf(left))
          ? roleOf(left)
          : rolesByDeficit(mix, have, stands).find((r) => copyable(r));
      const template = role ? copyable(role) : undefined;
      if (!template) {
        if (replaces) leavers.unshift(replaces);
        break;
      }
      have[roleOf(template)] = (have[roleOf(template)] ?? 0) + stands;
      const id = `position:${row.id}:${api.state.date}:${Math.floor(need)}`;
      store(api)
        .table("positions")
        .put({
          id,
          organizationId: row.id,
          placeId: c.organizations.get(row.id)!.placeId,
          templateJobId: template.id,
          title: template.title,
          occupation: roleOf(template),
          hourlyMinor: payFor(api, row.id, template),
          openedAt: api.state.date,
          status: "open",
          ...(stands === 1 ? {} : { heads: stands }),
          reasonKey: replaces
            ? jobsData.reasons.replacement
            : jobsData.reasons.opening,
          ...(replaces
            ? {
                replacesJobId: replaces.jobId,
                replacesPersonId: replaces.personId,
              }
            : {}),
          gap,
          target,
        });
      need -= stands;
    }
    const jobChangeIds: string[] = [];
    for (;;) {
      if (positions.length) {
        const position = positions[positions.length - 1]!;
        if (need > -positionHeads(position)) break;
        positions.pop();
        store(api)
          .table("positions")
          .put({ ...position, status: "withdrawn" });
        need += positionHeads(position);
        continue;
      }
      if (need > -1) break;
      const staff = currentJobs(api, row.id);
      if (!staff.length) break;
      const laid = layOff(
        api,
        row.id,
        staff,
        -need,
        {
          target,
          projected,
          observedStaff,
          salesStaff,
          shrinkAdjustment,
          demand: book.annualDemandMinor,
          capacity: book.capacityMinor,
          ...(trading
            ? {
                salesMinor: trading.salesMinor,
                payrollMinor: trading.payrollMinor,
                costsMinor: trading.costsMinor,
                complianceMinor: trading.complianceMinor,
                lossMonths: trading.lossMonths,
              }
            : {}),
        },
        trading?.id,
      );
      // The next worker to go stands for more jobs than the staff is over by,
      // or worked today already: wait for the next review.
      if (laid === "over" || laid === undefined) break;
      if (laid?.id) jobChangeIds.push(laid.id);
      need += laid?.heads ?? 1;
    }
    if (jobChangeIds.length) {
      // The employer's staffing announcement goes to the existing press wire;
      // reporters decide whether to cover it. Private claims are not published.
      const owner = ownerOf(api, row.id);
      api.emit({
        id: `event:business.staff-reduced:${row.id}:${c.date}`,
        date: c.date,
        kind: "business.staff-reduced",
        personIds: owner && c.people.has(owner) ? [owner] : [],
        placeId: c.organizations.get(row.id)!.placeId,
        topic: row.id,
        publicRecord: true,
        facts: {
          organizationId: row.id,
          jobChangeIds: JSON.stringify(jobChangeIds),
          jobsLost: String(jobChangeIds.length),
          projectedStaff: String(projected),
          targetStaff: String(target),
          ...(trading
            ? {
                tradingId: trading.id,
                salesMinor: String(trading.salesMinor),
                costsMinor: String(trading.costsMinor),
                lossMonths: String(trading.lossMonths),
              }
            : {}),
        },
        source: source(
          api,
          "The employer's staffing decision and completed trading month.",
        ),
      });
    }
    // Leavers not refilled this month wait while staff is below target; above it, attrition does the shrinking.
    store(api)
      .table("employers")
      .put({
        ...row,
        need,
        salesStaff,
        withdrawCarry: carry,
        leavers: gap > 0 ? leavers : [],
      });
  }
}

/**
 * A new opening's pay: the role's own rate, moved with the region's pay level
 * since it was set, never under the wage floor in force; the median of whoever
 * holds the role plays no part (owner, Oct 14). What the job's holder has
 * earned in it by tenure and how they work (`raisePay`) stays theirs: the
 * opening is priced from the role's rate without it.
 */
function payFor(
  api: CoreAPI,
  organizationId: string,
  template: JobInput,
): number {
  const placeId = core(api).organizations.get(organizationId)?.placeId;
  const set = store(api).table("pay").get(template.id) as PayRow | undefined;
  const rate =
    (template.hourlyMinor ?? 0) / (set?.grown ?? api.parameter("one"));
  const market = Math.round(
    placeId
      ? (rate * payLevel(api, placeId)) / (set?.level ?? api.parameter("one"))
      : rate,
  );
  // A public employer's opening is posted at the public pay floor in force the day it is posted; a hire from it is paid what it was posted at.
  const publicFloor = core(api).modules.has(LAWS_MODULE_ID)
    ? publicPayFloorHourly(api, organizationId, template)
    : 0;
  return Math.max(market, wageFloor(api), publicFloor);
}

/** The minimum wage in force for the town, in cents an hour (0 where none is recorded). */
function wageFloor(api: CoreAPI): number {
  if (!core(api).modules.has(LAWS_MODULE_ID)) return api.parameter("zero");
  return lawInForce(api, "minimum-wage").value ?? api.parameter("zero");
}

/** Years a worker has held their job: a counted worker by their counted record, a full person by their work commitment (or the job they held before a fill-in). */
export function tenureYears(api: CoreAPI, job: JobInput): number {
  if (isCounted(api, job.personId)) return countedTenureYears(api, job);
  const commitment = [
    ...(core(api).work.commitmentsByPerson.get(job.personId) ?? []),
  ]
    .map((id) => core(api).work.commitments.get(id)!)
    .find((row) => row.jobId === job.id);
  // A counted worker's hire here dates their job, as it did before they were
  // filled in (countedTenureYears); a full hire keeps no such date.
  const since =
    (store(api).table("pay").get(job.id) as { since?: string } | undefined)
      ?.since ??
    commitment?.heldSince ??
    commitment?.startsAt ??
    api.state.startedAt;
  return (
    daysBetweenText(since, api.state.date) / api.parameter("jobsDaysPerYear")
  );
}

/** The full worker who runs a firm with no recorded owner: the best paid of those staying, ties by id. */
function managerOf(
  c: CoreState,
  staff: readonly JobInput[],
  leaving: JobInput,
): string | undefined {
  return staff
    .filter(
      (row) =>
        row.personId !== leaving.personId && c.people.get(row.personId)?.alive,
    )
    .sort(
      (a, b) =>
        (b.hourlyMinor ?? 0) - (a.hourlyMinor ?? 0) ||
        a.personId.localeCompare(b.personId),
    )[0]?.personId;
}

/**
 * What an employer sees of how a person works, in years of tenure or
 * experience: their lean toward diligence over slack (`jobs.value-worker`)
 * times its weight, sized from conscientiousness and job performance (Barrick
 * and Mount 1991). Hiring and layoffs both read it, and a counted worker is
 * valued by the same rule.
 */
export function howTheyWork(api: CoreAPI, personId: string): number {
  const c = core(api);
  return (
    decisionTraitWeight(c, "jobs.value-worker") *
    decisionLean(
      c,
      { traits: traitsOf(api, personId) },
      "jobs.value-worker",
      "keep",
      "let-go",
    )
  );
}

/**
 * How a business values each of its workers, in years: their tenure with it
 * and how they work. A layoff lets go of the worker valued least.
 */
export function workerValues(
  api: CoreAPI,
  organizationId: string,
  staff: readonly JobInput[] = currentJobs(api, organizationId),
): { job: JobInput; tenure: number; work: number }[] {
  return staff.map((job) => ({
    job,
    tenure: api.parameter("jobsKeepTenureWeight") * tenureYears(api, job),
    work: howTheyWork(api, job.personId),
  }));
}

/** The business decides who goes: the worker whose tenure and record it values least. */
export function layOff(
  api: CoreAPI,
  organizationId: string,
  staff: readonly JobInput[],
  budget: number,
  values: Readonly<Record<string, number>>,
  tradingId?: string,
): { heads: number; id?: string } | "over" | undefined {
  const c = core(api);
  const valued = new Map(
    workerValues(api, organizationId, staff).map((row) => [row.job, row]),
  );
  const least = (score: (job: JobInput) => number) =>
    [...staff].sort(
      (a, b) => score(a) - score(b) || a.id.localeCompare(b.id),
    )[0];
  const keep = (job: JobInput) =>
    valued.get(job)!.tenure + valued.get(job)!.work;
  const job = least(keep);
  if (!job) return;
  // Whether how they work, not tenure alone, decided who goes: the record keeps
  // it as a reason.
  const workDecided = least((row) => valued.get(row)!.tenure) !== job;
  // A job ends before its day's work. The worker the business chose played
  // their day before this review ran (the controlled character): the same
  // choice is made at the next review, before that day's work.
  if (
    c.jobs.has(job.id) &&
    c.work.lastAttendanceByJob.get(job.id)?.date === c.date
  )
    return;
  // The jobs this record stands for may not exceed what the staff is over by:
  // a counted job standing for more sheds as many of its jobs as the staff is
  // over by, and its worker's record keeps the rest.
  const heads = headsOf(c, job);
  if (heads > budget + 1e-9) {
    const shed = Math.floor(budget + 1e-9);
    const rt = residentsRuntime(c);
    if (c.jobs.has(job.id) || shed < 1 || !rt) return "over";
    rt.store.setJobHeads(job, heads - shed);
    record(api, {
      personId: job.personId,
      organizationId,
      jobId: job.id,
      kind: "staff-shed",
      reasonKey: jobsData.reasons.layoff,
      decidedBy:
        ownerOf(api, organizationId) ??
        managerOf(c, staff, job) ??
        organizationId,
      values: {
        ...values,
        keepScore: keep(job),
        headsShed: shed,
        headsLeft: heads - shed,
      },
      heads: shed,
      ...(tradingId ? { tradingId } : {}),
    });
    return {
      heads: shed,
      id: `job-change:${api.state.date}:${job.id}:staff-shed`,
    };
  }
  const keepScore = keep(job);
  // Which book holds the job decides how it ends: a person filled in since
  // the hire can still have a job row only in the counted books.
  const counted = isCounted(api, job.personId) || !c.jobs.has(job.id);
  const weeksWorked =
    (tenureYears(api, job) * api.parameter("jobsDaysPerYear")) / DAYS_PER_WEEK;
  // The book that holds the job decides how it ends: a person filled in since
  // the hire is full now, but their job can still live only in the counted books.
  if (c.jobs.has(job.id)) api.endJob(job.id, `jobs:layoff:${api.state.date}`);
  else endCountedJob(c, job.id);
  // The owner decides; a firm with no recorded owner is run by its best-paid
  // full worker still on the staff, ties by id. Only a firm with no one left
  // to decide it lets go of its last worker as itself (it is closing).
  const decidedBy = ownerOf(api, organizationId) ?? managerOf(c, staff, job);
  record(api, {
    personId: job.personId,
    organizationId,
    jobId: job.id,
    kind: "layoff",
    reasonKey: jobsData.reasons.layoff,
    decidedBy: decidedBy ?? organizationId,
    values: {
      ...values,
      keepScore,
      tenureScore: valued.get(job)!.tenure,
      workScore: valued.get(job)!.work,
      workDecided: workDecided ? 1 : 0,
    },
    ...(tradingId ? { tradingId } : {}),
  });
  // Read before the event: an event can fill a counted worker in, after which
  // the counts no longer hold them.
  const placeId = (c.people.get(job.personId) ??
    residentFacts(c, job.personId))!.placeId;
  // A worker filled in since the hire is a full person even when the job they
  // lost lived in the counted books: the event names them, so they learn of it
  // and answer it as anyone named does.
  const full = c.people.has(job.personId);
  const lost: CoreEventInput = {
    id: `event:work.job-lost:${api.state.date}:${job.id}`,
    date: api.state.date,
    kind: "work.job-lost",
    // A counted worker is not a full person; the change row names them until fill-in.
    personIds: full ? [job.personId] : [],
    placeId,
    source: source(api, "A layoff decided from the business's books."),
    publicRecord: false,
    topic: organizationId,
    // Being fired is a life change (Holmes and Rahe, 47 units); how hard it
    // lands is the person's own appraisal (emotion.ts reads their traits).
    ...severityImpulse(api, DEFAULT_HEALTH_DATA.jobLossSeverity),
    // Who decided and where, for the scene at work: the director reads them.
    // A counted worker is named as the event's counted subject, so the people
    // engines perceive it for them by the same rule (drives.ts).
    facts: {
      decidedBy: decidedBy ?? organizationId,
      organizationId,
      ...(full ? {} : { "counted-subject": job.personId }),
    },
  };
  api.emit(lost);
  // Laid off through no choice of their own: a claim under the state's program.
  fileClaim(
    api,
    store(api).table("claims"),
    job,
    jobsData.reasons.layoff,
    weeksWorked,
    lost,
  );
  if (inCustody(api, job.personId)) return { heads };
  if (counted)
    store(api)
      .table("countedSeekers")
      .put({
        id: job.personId,
        isSeeker: true,
        personId: job.personId,
        placeId,
        since: api.state.date,
        reasonKey: jobsData.reasons.layoff,
        referenceHourlyMinor: job.hourlyMinor ?? 0,
        lastJob: { ...job },
      });
  else
    startSeeking(
      api,
      job.personId,
      false,
      jobsData.reasons.layoff,
      job.hourlyMinor ?? 0,
    );
  return { heads, id: `job-change:${api.state.date}:${job.id}:layoff` };
}

/** The highest pay now posted for each occupation: the going rate a worker measures their own against. */
function goingRates(api: CoreAPI): Map<string, number> {
  const going = new Map<string, number>();
  for (const position of store(api)
    .table("positions")
    .query("byStatus", ["open"]) as unknown as PositionRow[])
    going.set(
      position.occupation,
      Math.max(going.get(position.occupation) ?? 0, position.hourlyMinor),
    );
  return going;
}

/** What one worker weighs this month, read from their record: a full person's or a counted worker's. */
interface WorkerFacts {
  job: JobInput;
  placeId: string;
  birthDate: string;
  liquidMinor: number;
  livingCostDailyMinor: number;
  /** Time and health strain; a counted record holds no needs, so its strain is the neutral zero. */
  strain: number;
  /** The outcome web's factor on staying at work for this worker's groups (mothers of young children, married women, 62 to 67): it lowers the pull to leave. */
  stay: number;
}

/**
 * Stay, look around, leave work or retire: the offers a worker weighs, from
 * pay against the going rate, tenure, the place's unemployment, savings,
 * strain and age. A full person and a counted worker are offered the same
 * ones, scored by the same chooser (one model, two tiers).
 */
function workerOffers(
  api: CoreAPI,
  going: ReadonlyMap<string, number>,
  who: WorkerFacts,
): { offers: ActOffer[]; age: number; bufferMonths: number } {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    job = who.job,
    pay = job.hourlyMinor ?? 0;
  const payGap =
    pay > 0
      ? Math.max(
          0,
          (going.get(job.occupationClassification ?? job.title) ?? pay) / pay -
            1,
        )
      : 0;
  const bufferMonths =
    who.livingCostDailyMinor > 0
      ? who.liquidMinor /
        ((who.livingCostDailyMinor * p("jobsDaysPerYear")) /
          p("macroMonthsPerYear"))
      : 0;
  // Years past the earliest Social Security retirement age pull toward retiring, as savings allow.
  const age = daysBetweenText(who.birthDate, c.date) / p("jobsDaysPerYear");
  const pastRetirementAge = Math.max(0, age - retirementOnsetYears(api));
  const gap = unemploymentGap(api, who.placeId);
  const savings =
    p("jobsMoneyBufferWeight") * Math.log1p(Math.max(0, bufferMonths));
  stopgap("SG-WORLD-jobs-quit-rate-uncalibrated");
  return {
    age,
    bufferMonths,
    offers: [
      offer("stay", job.id, {}),
      offer("look", job.id, {
        baseline: p("jobsLookBaseline"),
        payGap: p("jobsPayGapWeight") * payGap,
        // Where jobs are scarce, looking around pays less.
        unemployment: -p("jobsUnemploymentLookWeight") * gap,
      }),
      // Leaving to nothing: the typical-tenure baseline, less for a longer tenure, more for pay below the going
      // rate, less where jobs are scarce; strain on time or health pushes, and savings only make it possible.
      // stopgapId: SG-WORLD-jobs-quit-rate-uncalibrated (quits under the shared chooser not yet checked against JOLTS)
      offer("leave", job.id, {
        ...(who.stay ? { web: -who.stay } : {}),
        quit: quitScore(p, {
          payGap,
          tenureYears: tenureYears(api, job),
          unemploymentGapPts: gap,
        }),
        strain: who.strain * (p("one") + savings),
      }),
      ...(pastRetirementAge > 0
        ? [
            offer("leave", `retire:${job.id}`, {
              baseline: p("jobsRetireBaseline"),
              ...(who.stay ? { web: -who.stay } : {}),
              age: p("jobsRetireAgeWeight") * pastRetirementAge,
              savings,
            }),
          ]
        : []),
    ],
  };
}

/** Each worker: stay, look around, or leave work, from pay against the going rate, savings, needs and traits. */
function reviewWorkers(api: CoreAPI): void {
  const c = core(api);
  const going = goingRates(api);
  for (const job of c.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    // A post held by appointment or by office (the town clerk, a department
    // head, an official's pay job) is left by resigning through the executive
    // or offices engine, which closes the appointment with it; the monthly
    // worker review does not end it behind their back.
    if (job.id.startsWith("job:public:") || job.id.startsWith("job:office:"))
      continue;
    const person = c.people.get(job.personId);
    if (
      !person ||
      !person.alive ||
      inCustody(api, person.id) ||
      controlled(c, person.id)
    )
      continue;
    const strain = (person.needs.time ?? 0) + (person.needs.health ?? 0);
    const { offers, age, bufferMonths } = workerOffers(api, going, {
      job,
      placeId: person.placeId,
      birthDate: person.birthDate,
      liquidMinor: person.liquidMinor,
      livingCostDailyMinor: person.livingCostDailyMinor,
      strain,
      stay: person.placeId
        ? participationShift(
            api,
            person.placeId,
            fullFacts(api, person.id, (key) => api.parameter(key))!,
            (key) => api.parameter(key),
          )
        : 0,
    });
    const result = chooseAct(c, person.id, offers);
    const chosen = result.selected!.definition.id;
    const seeking = store(api).table("seekers").get(person.id) as
      SeekerRow | undefined;
    if (chosen === jobsData.actions.look.id) {
      if (ownerOf(api, job.organizationId) !== person.id && !seeking)
        startSeeking(
          api,
          person.id,
          true,
          "looking-around",
          job.hourlyMinor ?? 0,
        );
    } else if (chosen === jobsData.actions.stay.id) {
      // Someone looking around who now weighs staying put stops looking.
      if (seeking?.employed) store(api).table("seekers").remove(person.id);
    } else if (chosen === jobsData.actions.leave.id) {
      const retiring = result.selected!.targetId.startsWith("retire:");
      store(api).table("seekers").remove(person.id);
      endSpell(api, person.id);
      api.endJob(job.id, `jobs:left-work:${api.state.date}`);
      record(api, {
        personId: person.id,
        organizationId: job.organizationId,
        jobId: job.id,
        kind: "left-work",
        reasonKey: retiring
          ? jobsData.reasons.retired
          : jobsData.reasons.leftWork,
        decidedBy: person.id,
        values: { bufferMonths, strain, age },
      });
    }
  }
  markUnwiredLaborLinks();
  reviewJobless(api);
  reviewCountedWorkers(api, going);
  reviewCountedEntry(api);
  raisePay(api);
}

/** The place's pay level against the opening: national hourly earnings times its region's pay. */
export function payLevel(
  api: CoreAPI,
  placeId: string,
  subject?: Subject,
): number {
  const c = core(api);
  const condition = (c.finance.conditionsByPlace.get(placeId) ?? [])
    .filter((row) => row.at <= c.date)
    .at(-1);
  // The web's policy effects on pay (a corporate tax passed to workers, a
  // public bargaining law) land on each worker by their own band.
  return (
    (condition?.wagePriceFactor ?? api.parameter("one")) *
    webFactorFor(api, placeId, "labor.wages", subject) *
    webFactorFor(api, placeId, "labor.median-earnings", subject)
  );
}

/** What the web's pay factors need to know of a worker, from the full or counted record. */
export function workerSubject(
  c: CoreState,
  personId: string,
): Subject | undefined {
  const person = c.people.get(personId);
  if (person) {
    const gender = person.looks?.gender;
    return {
      age: ageOn(person.birthDate, c.date),
      ...(gender === "female" || gender === "male" ? { sex: gender } : {}),
    };
  }
  const store = residentsRuntime(c)?.store;
  const m = store?.countedMember(personId);
  if (!store || m === undefined) return undefined;
  const gender = store.strings[store.genderIx[m]!];
  return {
    age: ageOn(store.born[m]!, c.date),
    ...(gender === "female" || gender === "male" ? { sex: gender } : {}),
    incomeFifth:
      store.groups[store.households[store.household[m]!]!.group]?.incomeBand,
  };
}

/** A job's last pay review: the pay level it was priced at, when, since when it has been held, and what its holder has earned in it. */
interface PayRow {
  id: string;
  level: number;
  at: string;
  since?: string;
  /** What raises for tenure and how they work have multiplied the job's rate by, so an opening copied from it is priced without them. */
  grown?: number;
}

/** A yearly raise a business gave a worker: the market's move and what it added for tenure and how they work, with the share its losses left. */
export interface RaiseRow {
  id: string;
  date: string;
  jobId: string;
  personId: string;
  organizationId: string;
  decidedBy: string;
  /** The jobs the record stands for: one for a full person, the household weight for a counted worker. */
  heads: number;
  counted: boolean;
  values: Readonly<{
    fromHourlyMinor: number;
    toHourlyMinor: number;
    /** The pay the place's pay level alone would have moved it to, unrounded. */
    marketHourlyMinor: number;
    levelFrom: number;
    levelTo: number;
    tenureYears: number;
    sinceYears: number;
    /** How the employer reads their work, in years (`howTheyWork`). */
    workScore: number;
    /** Log points of pay for tenure and for how they work (`withinJobRaise`). */
    tenurePart: number;
    workPart: number;
    /** The share of what adds pay that the business gave (`raiseShare`); one for what lowers it. */
    given: number;
  }>;
}

/**
 * The within-job part of a worker's yearly raise, in log points of pay, for
 * the time since their last one: the return to tenure, on a profile that
 * flattens with the years (full × (1 − e^(−years / span)), sized from the
 * tenure-wage literature), and how the employer reads their work
 * (`howTheyWork`, in years) times the merit spread per year of it, for the
 * same time. Each slides with its input; no step is fixed and nothing is
 * rolled.
 */
export function withinJobRaise(
  p: (key: string) => number,
  row: Readonly<{ tenureYears: number; sinceYears: number; workYears: number }>,
): { tenure: number; work: number } {
  const span = p("jobsTenureReturnYears");
  const to = Math.max(p("zero"), row.tenureYears);
  const from = Math.max(p("zero"), to - row.sinceYears);
  return {
    tenure:
      p("jobsTenureReturnFull") *
      (Math.exp(-from / span) - Math.exp(-to / span)),
    work: p("jobsRaisePerWorkYear") * row.workYears * (to - from),
  };
}

/**
 * The share of what it would add for tenure and how they work that a business
 * gives: all of it while its books carry no memory of losses, less as losses
 * persist (1 / (1 + lossMonths), the business engine's smoothed loss memory
 * that also drives its cuts and closing), sliding toward nothing. A single
 * month's lumpy bills do not decide it. A business with no trading month yet
 * has no recorded loss.
 */
function raiseShare(api: CoreAPI, organizationId: string): number {
  const lossMonths =
    businessTradingMonth(api, organizationId)?.lossMonths ??
    api.parameter("zero");
  return api.parameter("one") / (api.parameter("one") + lossMonths);
}

/**
 * Once a year from its last raise, each job's pay follows the place's pay
 * level since then (Employment Cost Index practice: most employers adjust
 * pay yearly), and a business adds what the worker has earned in the job:
 * the return to their tenure and how it reads their work (`withinJobRaise`),
 * in the share its losses leave it (`raiseShare`). Hires start at the going
 * rate and their own level. A counted worker is raised by the same rule,
 * their record standing for its household's weight. Each raise a business
 * gives is a record with its parts.
 */
function raisePay(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    pay = store(api).table("pay"),
    raises = store(api).table("raises"),
    months = p("macroMonthsPerYear"),
    counted = new Map<string, number>(),
    shares = new Map<string, number>();
  const jobs = [
    ...[...c.jobs.values()].filter(
      (job) => job.endsAt === undefined && c.people.get(job.personId)?.alive,
    ),
    ...[...c.finance.businesses.keys()].flatMap((id) => countedJobsOf(c, id)),
  ];
  for (const job of jobs) {
    const placeId = c.organizations.get(job.organizationId)?.placeId;
    if (!placeId || !job.hourlyMinor) continue;
    const row = pay.get(job.id) as PayRow | undefined;
    const level = row?.level ?? p("one"),
      at = row?.at ?? api.state.startedAt;
    const sinceDays = daysBetweenText(at, c.date);
    if (sinceDays < (p("jobsDaysPerYear") * (months - p("one"))) / months)
      continue;
    const now = payLevel(api, placeId, workerSubject(c, job.personId));
    const market = (job.hourlyMinor * now) / level;
    // A business raises its workers for their tenure and how they work; an
    // owner-operator's own pay is what the business leaves them. A public
    // employer's pay follows its budget line.
    const business = c.finance.businesses.has(job.organizationId);
    if (!business) stopgap("SG-WORLD-jobs-public-pay-growth");
    const earns = business && ownerOf(api, job.organizationId) !== job.personId;
    const reasons = earns
      ? {
          tenureYears: tenureYears(api, job),
          sinceYears: sinceDays / p("jobsDaysPerYear"),
          workYears: howTheyWork(api, job.personId),
        }
      : undefined;
    const parts = reasons ? withinJobRaise(p, reasons) : undefined;
    const added = parts ? parts.tenure + parts.work : p("zero");
    let share = shares.get(job.organizationId);
    if (share === undefined && parts)
      shares.set(
        job.organizationId,
        (share = raiseShare(api, job.organizationId)),
      );
    // Losses hold back what adds pay; what lowers it (a slack worker past
    // their tenure gains) is not held back.
    const given = added > p("zero") ? (share ?? p("one")) : p("one");
    const growth = Math.exp(added * given);
    const hourly = Math.round(market * growth);
    const raised = hourly > p("zero") && hourly !== job.hourlyMinor;
    const raiseId = `pay-change:${c.date}:${job.id}`;
    if (parts && reasons && raised)
      raises.put({
        id: raiseId,
        date: c.date,
        jobId: job.id,
        personId: job.personId,
        organizationId: job.organizationId,
        decidedBy: ownerOf(api, job.organizationId) ?? job.organizationId,
        heads: headsOf(c, job),
        counted: !c.jobs.has(job.id),
        values: {
          fromHourlyMinor: job.hourlyMinor,
          toHourlyMinor: hourly,
          marketHourlyMinor: market,
          levelFrom: level,
          levelTo: now,
          tenureYears: reasons.tenureYears,
          sinceYears: reasons.sinceYears,
          workScore: reasons.workYears,
          tenurePart: parts.tenure,
          workPart: parts.work,
          given,
        },
      } satisfies RaiseRow);
    if (raised && !c.jobs.has(job.id)) counted.set(job.id, hourly);
    else if (raised)
      api.rerateJob(
        job.id,
        hourly,
        source(
          api,
          parts
            ? `A yearly raise (${raiseId}): the place's pay level ${level} to ${now} against the opening, and ${parts.tenure} log points for tenure and ${parts.work} for how they work, ${given} of it given past the employer's losses.`
            : `A yearly raise following the place's pay level, ${level.toFixed(4)} to ${now.toFixed(4)} against the opening.`,
        ),
      );
    const grown = (row?.grown ?? p("one")) * growth;
    pay.put({
      id: job.id,
      level: now,
      at: c.date,
      ...(row?.since ? { since: row.since } : {}),
      ...(grown === p("one") ? {} : { grown }),
    } satisfies PayRow);
  }
  rerateCountedJobs(c, counted);
}

/** Jobless working-age adults choose whether to look for work, pushed by how few days their household's money covers. */
export function reviewJobless(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    [young, old] = jobsData.workingAge as [number, number];
  const worked = new Set([...c.jobs.values()].map((job) => job.personId));
  const twoLevel = residentsRuntime(c) !== undefined;
  // Light relatives who live elsewhere (inactive tiers) make no choices here.
  const inactive = new Set(
    c.data.tiers
      .filter((tier) => tier.cadence === "inactive")
      .map((tier) => tier.id),
  );
  for (const person of c.people.values()) {
    if (
      !person.alive ||
      person.jobId ||
      inCustody(api, person.id) ||
      controlled(c, person.id)
    )
      continue;
    // Someone already looking is weighed again below, as a counted seeker is.
    const seeking = store(api).table("seekers").get(person.id) as
      SeekerRow | undefined;
    if (seeking && !searchBeganByChoice(seeking)) continue;
    if (!c.households.has(person.householdId) || inactive.has(person.tier))
      continue;
    // Without the two-level population, only people who have worked in this world are in its labor market (see the opening-seekers stopgap).
    // With it, the counts hold the wider population, so every full person of working age is in it, a first job included.
    if (!twoLevel && !worked.has(person.id)) continue;
    const age =
      daysBetweenText(person.birthDate, c.date) / p("jobsDaysPerYear");
    if (age < young || age >= old) continue;
    const enter = participationShift(
      api,
      person.placeId,
      fullFacts(api, person.id, p)!,
      p,
    );
    const result = chooseAct(c, person.id, [
      offer("wait", person.id, {}),
      offer("look", person.id, {
        baseline: p("jobsEnterBaseline"),
        ...(enter ? { web: enter } : {}),
        // A dependent's own living cost is carried by the household, so the
        // pressure is how few days the household's money covers its costs.
        needWork: unemployedNeed(api, person.id),
        // Where jobs are scarce, fewer start looking (discouraged workers).
        unemployment:
          -p("jobsUnemploymentEntryWeight") *
          unemploymentGap(api, person.placeId),
      }),
    ]);
    settleEntryChoice(
      api,
      person.id,
      "seekers",
      result.selected!.definition.id === jobsData.actions.look.id,
      seeking,
      () =>
        startSeeking(
          api,
          person.id,
          false,
          jobsData.reasons.startedLooking,
          lastPay(api, person.id),
        ),
    );
  }
}

/**
 * Whether a search began as the choice to look for work (the opening's
 * jobless and those who started looking), which the monthly review weighs
 * again. A search that began with losing a job, or from a job already held, is
 * ended by being hired, not by this review.
 */
function searchBeganByChoice(seeker: SeekerRow): boolean {
  return (
    !seeker.employed &&
    (seeker.reasonKey === jobsData.reasons.startedLooking ||
      seeker.reasonKey === OPENING_UNEMPLOYED)
  );
}

/**
 * The one result of weighing waiting against looking, for a full person and a
 * counted one alike: looking starts a search when none is open; waiting ends
 * the search of someone who has no job (the seeker row, the open spell and
 * the claim), and leaves someone who is employed and shopping around alone.
 */
function settleEntryChoice(
  api: CoreAPI,
  personId: string,
  table: "seekers" | "countedSeekers",
  looks: boolean,
  seeking: SeekerRow | undefined,
  start: () => void,
): void {
  if (looks) {
    if (!seeking) start();
  } else if (seeking && searchBeganByChoice(seeking)) {
    store(api).table(table).remove(personId);
    endSpell(api, personId);
  }
}

function lastPay(api: CoreAPI, personId: string): number {
  const c = core(api);
  let pay = 0,
    latest = "";
  for (const id of c.work.commitmentsByPerson.get(personId) ?? []) {
    const row = c.work.commitments.get(id)!;
    if (row.startsAt >= latest) {
      latest = row.startsAt;
      pay = row.hourlyMinor;
    }
  }
  return pay;
}

/**
 * How much an unemployed person needs work: the base need shrunk by how many
 * months their household's money covers its costs, so a person with a long
 * runway applies less eagerly than one a month from the rent. A full person's
 * household is its members' records; a counted person's is its counted
 * household's share of its group's money (its columns where groups hold none), which is what a
 * fill-in hands its members, so filling one in leaves the need as it was.
 */
export function unemployedNeed(api: CoreAPI, personId: string): number {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const person = c.people.get(personId);
  let liquid = 0,
    cost = 0;
  if (person) {
    const household = c.households.get(person.householdId);
    for (const memberId of household?.memberIds ?? [personId]) {
      const member = c.people.get(memberId);
      if (!member?.alive) continue;
      liquid += member.liquidMinor;
      cost += member.livingCostDailyMinor;
    }
  } else {
    const counted = countedHouseholdOf(c, personId);
    const rt = residentsRuntime(c);
    if (counted && rt) {
      // Its money is its share of its group's account, which a fill-in hands
      // its members; a world whose groups hold no money keeps it in the
      // members' columns.
      for (const member of rt.store.factsOfHousehold(counted)) {
        if (!rt.funded) liquid += member.liquidMinor;
        cost += member.livingCostDailyMinor;
      }
      if (rt.funded) liquid += householdCash(rt, counted);
    }
  }
  const days = cost > 0 ? liquid / cost : Number.POSITIVE_INFINITY;
  return (
    p("jobsUnemployedNeedWeight") /
    (p("one") + days / (p("jobsDaysPerYear") / p("macroMonthsPerYear")))
  );
}

/** Seekers apply; employers offer their best-placed applicant; applicants accept or decline. */
function runWeek(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  // A position held for the player's answer is no one else's this week.
  const positions = (
    store(api)
      .table("positions")
      .query("byStatus", ["open"]) as unknown as PositionRow[]
  ).filter((row) => !row.offeredTo);
  if (!positions.length) return;
  const byPlace = new Map<string, PositionRow[]>();
  for (const row of positions)
    byPlace.set(row.placeId, [...(byPlace.get(row.placeId) ?? []), row]);
  const applications = new Map<string, SeekerRow[]>();
  const apply = (positionId: string, seeker: SeekerRow) => {
    if (inCustody(api, seeker.personId)) return;
    const list = applications.get(positionId);
    if (list) list.push(seeker);
    else applications.set(positionId, [seeker]);
  };
  // A seeker, full or counted, weighs waiting against each opening near them by the same
  // chooser; the pick is the recorded choice, and they apply to every opening worth more than waiting.
  const consider = (seeker: SeekerRow, nearby: readonly PositionRow[]) => {
    const reference = seeker.referenceHourlyMinor;
    // The runway-scaled need for work, eased by the weeks looked.
    const needWork = applyNeed(
      p,
      seeker,
      c.date,
      unemployedNeed(api, seeker.personId),
    );
    const scored = scoreOffers(c, seeker.personId, [
      offer("wait", seeker.id, {}),
      ...nearby.map((position) =>
        offer("apply", position.id, {
          pay:
            p("jobsApplyPayWeight") *
            (reference > 0 ? position.hourlyMinor / reference - 1 : 0),
          needWork,
        }),
      ),
    ]);
    const result = decisionFromScores(c, seeker.personId, scored);
    if (result.selected!.definition.id !== jobsData.actions.apply.id) return;
    const wait = scored[0]!.score;
    for (const row of scored)
      if (
        row.offer.definition.id === jobsData.actions.apply.id &&
        row.score > wait
      )
        apply(row.offer.targetId, seeker);
  };
  for (const seeker of store(api)
    .table("seekers")
    .query("all", [true]) as unknown as SeekerRow[]) {
    const nearby = byPlace.get(seeker.placeId);
    const person = c.people.get(seeker.personId);
    // A seeker returned to the counts looks for work as a counted seeker, not through a full person's chooser.
    if (person && isDemoted(person)) {
      store(api).table("seekers").remove(seeker.personId);
      store(api)
        .table("countedSeekers")
        .put({ ...seeker, id: seeker.personId, isSeeker: true } as never);
      continue;
    }
    if (
      !nearby ||
      !person ||
      !person.alive ||
      inCustody(api, person.id) ||
      controlled(c, person.id)
    )
      continue;
    consider(seeker, nearby);
  }
  // The person the player controls, out of work and of working age, is
  // considered for every opening near them; an employer that picks them makes
  // an offer, and the player answers it.
  const player = openToOffers(api);
  if (player)
    for (const position of byPlace.get(player.placeId) ?? [])
      apply(position.id, player);
  // Counted seekers apply by the same rule as full people, each record for the household it stands for.
  const counted = store(api)
    .table("countedSeekers")
    .query("all", [true]) as unknown as SeekerRow[];
  for (const seeker of counted) {
    if (inCustody(api, seeker.personId)) continue;
    // A seeker who died or moved away with their household is no one to hire.
    if (!c.people.has(seeker.personId) && !residentFacts(c, seeker.personId)) {
      store(api).table("countedSeekers").remove(seeker.personId);
      continue;
    }
    const nearby = byPlace.get(seeker.placeId);
    if (nearby) consider(seeker, nearby);
  }
  // Counted applicants retain their work history. Read it once for this
  // matching round, including jobs hired and ended during play.
  const countedExperience = new Map<string, number>();
  const rt = residentsRuntime(c);
  if (rt && counted.length) {
    const seeking = new Set(counted.map((row) => row.personId));
    const roles = countedRolesOf(rt).byJob;
    const pay = store(api).table("pay");
    for (const job of rt.jobs.values()) {
      if (!seeking.has(job.personId)) continue;
      const since =
        (pay.get(job.id) as { since?: string } | undefined)?.since ??
        roles.get(job.id)?.startsAt;
      if (!since) continue;
      const years =
        Math.max(0, daysBetweenText(since, job.endsAt ?? c.date)) /
        p("jobsDaysPerYear");
      const key = `${job.personId}|${roleOf(job)}`;
      countedExperience.set(key, (countedExperience.get(key) ?? 0) + years);
    }
  }
  // Each seeker's fit for an occupation, worked out once a week.
  const fits = new Map<string, number>();
  for (const position of positions) {
    // A full person can take only a role whose schedule is on record.
    const fullRole = roleTemplate(c, position) !== undefined;
    const applicants = applications
      .get(position.id)
      ?.filter((row) => fullRole || isCounted(api, row.personId));
    if (!applicants?.length) continue;
    const fit = (seeker: SeekerRow) => {
      const key = `${seeker.personId}|${position.occupation}`;
      let value = fits.get(key);
      if (value === undefined)
        fits.set(
          key,
          (value =
            p("jobsFitExperienceWeight") *
              (isCounted(api, seeker.personId)
                ? (countedExperience.get(key) ?? 0)
                : experienceYears(api, seeker.personId, position.occupation)) +
            howTheyWork(api, seeker.personId) +
            // An official's word for them counts as one more reason, and
            // fades the longer ago it was given.
            p("jobsFitReferralWeight") *
              referralStanding(api, seeker.personId)),
        );
      return value;
    };
    // Where no law bars it, a small employer weighs an older applicant down;
    // a ban in the town takes that off, and the pick is made on fit alone.
    const bias = ageBiasAt(
      api,
      position.placeId,
      staffHeads(c, currentJobs(api, position.organizationId)),
    );
    const birthOf = (personId: string) =>
      c.people.get(personId)?.birthDate ??
      residentFacts(c, personId)?.birthDate;
    const weighed = (seeker: SeekerRow, penalized: boolean) => {
      const born = penalized && bias ? birthOf(seeker.personId) : undefined;
      return fit(seeker) - (born && bias ? bias.penaltyOf(born) : 0);
    };
    const pick = (pool: readonly SeekerRow[], penalized: boolean) => {
      let top = pool[0]!;
      for (const row of pool) {
        const gap = weighed(row, penalized) - weighed(top, penalized);
        if (gap > 0 || (gap === 0 && row.id.localeCompare(top.id) < 0))
          top = row;
      }
      return top;
    };
    // An opening that stands for several jobs stays open after a hire; one who already held a job of it is not offered it again.
    // A declined offer leaves the opening available to the next applicant.
    let pool = applicants.filter(
      (row) => !c.jobs.has(`job:${position.id}:${row.personId}`),
    );
    while (pool.length) {
      const best = pick(pool, !bias?.ban);
      // Under the ban: would the penalty have chosen someone else?
      const overruled = !!bias?.ban && pick(pool, true).id !== best.id;
      pool = pool.filter((row) => row !== best);
      let placed = false;
      if (isCounted(api, best.personId)) {
        // A counted seeker answers the offer by the same reasons a full person
        // weighs, every trait included.
        const person = {
          id: best.personId,
          traits: traitsOf(api, best.personId),
        };
        // An employed worker measures the offer against the job they hold now, and moving costs something.
        const current = best.employed
          ? countedJobOfPerson(c, best.personId)?.hourlyMinor
          : undefined;
        const reference = current ?? best.referenceHourlyMinor;
        const accepts = leanedByKinds(
          c,
          person,
          "jobs.counted-accept",
          jobsData.actions.accept.actKinds,
          jobsData.actions.decline.actKinds,
          acceptScore(p, position.hourlyMinor, reference, best.employed),
        );
        placed = accepts && hireCounted(api, position, best, fit(best));
      } else if (controlled(c, best.personId)) {
        // A past decline or lapse is an answer, not a permanent hold.
        if (
          store(api)
            .table("offers")
            .get(`job-offer:${position.id}:${best.personId}`)
        )
          continue;
        offerToPlayer(api, position, best.personId, fit(best));
        placed = true;
      } else {
        const held = best.employed
          ? c.jobs.get(c.people.get(best.personId)?.jobId ?? "")
          : undefined;
        const reference = held?.hourlyMinor ?? best.referenceHourlyMinor;
        const answer = chooseAct(c, best.personId, [
          offer("decline", position.id, {}),
          offer("accept", position.id, {
            baseline: p("jobsAcceptBaseline"),
            switchCost: best.employed ? p("jobsSwitchCost") : 0,
            pay:
              p("jobsApplyPayWeight") *
              (reference > 0 ? position.hourlyMinor / reference - 1 : 0),
            needWork: best.employed ? 0 : p("jobsUnemployedNeedWeight"),
          }),
        ]);
        if (answer.selected!.definition.id !== jobsData.actions.accept.id)
          continue;
        hire(api, position, best, fit(best));
        placed =
          c.people.get(best.personId)?.jobId ===
          `job:${position.id}:${best.personId}`;
      }
      if (!placed) continue;
      if (overruled && bias)
        recordHiredUnderBan(
          api,
          bias,
          {
            personId: best.personId,
            counted: isCounted(api, best.personId),
            heads: positionHeads(position),
          },
          Math.round(
            position.hourlyMinor *
              ((
                c.jobs.get(position.templateJobId) ??
                residentsRuntime(c)?.jobs.get(position.templateJobId)
              )?.hoursDaily ?? 0) *
              p("jobsDaysPerYear"),
          ),
        );
      for (const row of applications.values())
        for (let i = row.length - 1; i >= 0; i--)
          if (row[i]!.personId === best.personId) row.splice(i, 1);
      break;
    }
  }
}

/** A referral on record: an official sent a resident to the workforce office. */
export interface ReferralRow {
  readonly id: string;
  readonly personId: string;
  readonly officialId: string;
  readonly givenOn: string;
  readonly caseId: string;
}

/**
 * An official refers a resident looking for work to the workforce office.
 * Employers read it when they choose among applicants (`referralStanding`).
 */
export function recordReferral(
  api: CoreAPI,
  input: {
    readonly caseId: string;
    readonly personId: string;
    readonly officialId: string;
  },
): void {
  // A world without the jobs engine has no employer to read it.
  if (!api.state.modules.has(JOBS_MODULE_ID)) return;
  store(api)
    .table("referrals")
    .put({
      id: `referral:${input.caseId}`,
      personId: input.personId,
      officialId: input.officialId,
      givenOn: api.state.date,
      caseId: input.caseId,
    } satisfies ReferralRow);
}

/**
 * How much an official's word helps a person with an employer today: 1 on the
 * day it is given, fading evenly to 0 over the days the parameter names, then
 * the latest referral on record counts, nothing sooner or later.
 */
export function referralStanding(api: CoreAPI, personId: string): number {
  const rows = store(api)
    .table("referrals")
    .query("byPerson", [personId]) as unknown as ReferralRow[];
  if (!rows.length) return 0;
  const window = api.parameter("jobsReferralDays");
  let standing = 0;
  for (const row of rows) {
    const age = daysBetweenText(row.givenOn, api.state.date);
    standing = Math.max(standing, Math.max(0, 1 - age / window));
  }
  return standing;
}

/** A counted seeker joins the employer's wage flow at the position's pay. */
/** Each counted person's current job, indexed once a day (a hire takes the person out of the seekers, so one day's index holds). */
const personJobIndex = new WeakMap<
  CoreState,
  { date: string; byPerson: Map<string, string> }
>();
function countedJobOfPerson(
  c: CoreState,
  personId: string,
): JobInput | undefined {
  const rt = residentsRuntime(c);
  if (!rt) return undefined;
  let index = personJobIndex.get(c);
  if (!index || index.date !== c.date) {
    const byPerson = new Map<string, string>();
    for (const [jobId, flow] of rt.wageFlowByJob) {
      const job = rt.jobs.get(jobId);
      if (job && !job.endsAt && !flow.endedAt)
        byPerson.set(job.personId, jobId);
    }
    personJobIndex.set(c, (index = { date: c.date, byPerson }));
  }
  const jobId = index.byPerson.get(personId);
  const job = jobId ? rt.jobs.get(jobId) : undefined;
  const flow = jobId ? rt.wageFlowByJob.get(jobId) : undefined;
  return job && !job.endsAt && flow && !flow.endedAt ? job : undefined;
}

/**
 * A counted seeker's score for taking an offer: the accept baseline, pay
 * against what they have, the need for work if jobless, and for an employed
 * worker the cost of changing employers; plus the traits' term. An employed
 * worker moves only if this is above zero.
 */
export function acceptScore(
  p: (key: string) => number,
  offerHourlyMinor: number,
  referenceHourlyMinor: number,
  employed: boolean,
  traitTerm = 0,
): number {
  return (
    p("jobsRateWeight") *
      (p("jobsAcceptBaseline") +
        (employed ? p("jobsSwitchCost") : 0) +
        p("jobsApplyPayWeight") *
          (referenceHourlyMinor > 0
            ? offerHourlyMinor / referenceHourlyMinor - 1
            : 0) +
        (employed ? 0 : p("jobsUnemployedNeedWeight"))) +
    traitTerm
  );
}

/** What drove an employed worker's move: the better pay alone carried it, or else something else did (the label for `other`). */
export function moveLabel(
  p: (key: string) => number,
  offerHourlyMinor: number,
  currentHourlyMinor: number,
  other: string,
): string {
  return acceptScore(p, offerHourlyMinor, currentHourlyMinor, true) > 0
    ? jobsData.reasons.betterOffer
    : other;
}

/**
 * The schooling a person held on `date`: a senior year decided in play by
 * then (a graduate holds a high school diploma, or, once the school engine's
 * college step has them enrolled and normal time has ended, a bachelor's if
 * they completed one and some college if not; a senior who did not graduate
 * holds none), else their education
 * record, or the profile it is drawn from. Undefined for a person with no
 * schooling record (a child).
 */
export function schoolingOn(
  api: CoreAPI,
  personId: string,
  date: string,
): string | undefined {
  const c = core(api);
  const person = c.people.get(personId) ?? residentPerson(c, personId);
  if (!person) return undefined;
  const graduation = api.state.modules.has(SCHOOL_MODULE_ID)
    ? graduationOf(api, personId, person.birthDate)
    : undefined;
  if (graduation && graduation.date <= date) {
    if (!graduation.passed) return "less-than-high-school";
    // A graduate who enrolled holds the bachelor's they completed, or some
    // college, once normal time has ended; until then, the diploma.
    const college = collegeOf(api, personId, person.birthDate);
    return college?.endsOn && college.endsOn <= date
      ? college.completes
        ? "college"
        : "some-college"
      : "no-college";
  }
  return (
    (person.pastFacts?.find((row) => row.kind === PROFILE_FACT_KINDS.education)
      ?.facts?.level as string | undefined) ??
    profileFor(person, c.seed, makeIsoDate(date))?.education
  );
}

/** The BLS weekly earnings of the schooling a person holds today, which their hire pay reads; undefined with no schooling record. */
export function schoolingWeekly(
  api: CoreAPI,
  personId: string,
): number | undefined {
  const level = schoolingOn(api, personId, core(api).date);
  return level === "less-than-high-school"
    ? api.parameter("jobsWeeklyEarningsLessThanHighSchool")
    : level === "college"
      ? api.parameter("jobsWeeklyEarningsCollege")
      : level === "some-college"
        ? api.parameter("jobsWeeklyEarningsSomeCollege")
        : level === "no-college"
          ? api.parameter("jobsWeeklyEarningsNoCollege")
          : undefined;
}

/**
 * What a hire is paid per hour: the position's pay, moved by the person's own
 * schooling (their graduation record from a senior year in play, else their
 * education record, or the profile it is drawn from) by the
 * share of the BLS earnings gap that holds within one role. A person with no
 * schooling record (a child) takes the position's pay as it stands. The same
 * rule prices a full and a counted hire.
 */
export function hirePay(
  api: CoreAPI,
  position: PositionRow,
  personId: string,
): number {
  const c = core(api);
  const weekly = schoolingWeekly(api, personId);
  if (weekly === undefined) return position.hourlyMinor;
  const gap = weekly / api.parameter("jobsWeeklyEarningsAllWorkers") - 1;
  // stopgapId: SG-WORLD-jobs-schooling-pay-share (the within-role share of the schooling pay gap is assumed)
  stopgap("SG-WORLD-jobs-schooling-pay-share");
  const pay = Math.round(
    position.hourlyMinor * (1 + api.parameter("jobsSchoolingPayShare") * gap),
  );
  // Schooling never takes a hire under the floors the opening was posted to
  // respect: the minimum wage and, at a public employer, the public pay floor.
  const template =
    c.jobs.get(position.templateJobId) ??
    residentsRuntime(c)?.jobs.get(position.templateJobId) ??
    countedJobsOf(c, position.organizationId)[0];
  const floor = Math.max(
    wageFloor(api),
    template
      ? publicPayFloorHourly(api, position.organizationId, template)
      : api.parameter("zero"),
  );
  return Math.max(pay, Math.min(position.hourlyMinor, floor));
}

function hireCounted(
  api: CoreAPI,
  position: PositionRow,
  seeker: SeekerRow,
  fit: number,
): boolean {
  if (inCustody(api, seeker.personId)) return false;
  const c = core(api);
  // A closed business hires no one, though its opening may still be listed
  // (a full person's hire refuses it the same way).
  if (c.finance.businesses.get(position.organizationId)?.closedAt) return false;
  const template =
    c.jobs.get(position.templateJobId) ??
    residentsRuntime(c)?.jobs.get(position.templateJobId) ??
    countedJobsOf(c, position.organizationId)[0];
  if (!template) return false;
  const jobId = `job:${position.id}:${seeker.personId}`;
  const hours = template.hoursDaily;
  const pay = hirePay(api, position, seeker.personId);
  const job: JobInput = {
    id: jobId,
    personId: seeker.personId,
    organizationId: position.organizationId,
    title: position.title,
    // Kept only when the template has one: a job record holds no undefined field.
    ...(template.occupationClassification !== undefined
      ? { occupationClassification: template.occupationClassification }
      : {}),
    hourlyMinor: pay,
    hoursDaily: hours,
    wageDailyMinor: Math.round(pay * hours),
    source: source(api, `A counted worker hired to ${position.id}.`),
  };
  const previous = seeker.employed
    ? countedJobOfPerson(c, seeker.personId)
    : undefined;
  if (previous?.organizationId === position.organizationId) return false;
  // The role's schedule and payday, as a full hire takes them, kept with the
  // household so the worker is on that payroll the day they are met.
  const role = roleTemplate(c, { ...position, templateJobId: template.id });
  // A founded firm hires from another employer's role: its hire is paid on the
  // firm's own calendar with that role's payday, one per firm and role, as a
  // full hire's calendar names its own employer (hire, below).
  const calendar: WorkPayrollCalendarInput | undefined =
    role &&
    (role.calendar.organizationId === position.organizationId
      ? role.calendar
      : {
          ...role.calendar,
          id: `${role.calendar.id}:at:${position.organizationId}`,
          organizationId: position.organizationId,
        });
  const commitment: WorkCommitmentInput | undefined = role && {
    ...role.commitment,
    organizationId: position.organizationId,
    id: `work-commitment:${jobId}`,
    jobId,
    personId: seeker.personId,
    payrollCalendarId: calendar!.id,
    startsAt: addDays(makeIsoDate(api.state.date), 1),
    // A new hire's own: a filled-in template's earlier tenure is not copied.
    heldSince: undefined,
    endsAt: undefined,
    hourlyMinor: position.hourlyMinor,
    scheduleTemplateJobId: role.template.id,
    paySource: job.source,
    scheduleSource: job.source,
  };
  if (!addCountedJob(c, job, template.id, commitment)) return false;
  if (calendar) keepCalendar(c, calendar);
  // The hire stands for the jobs the opening offered (one, or the leaver's it
  // replaces), not every household the seeker's record stands for.
  residentsRuntime(c)?.store.setJobHeads(job, position.heads ?? 1);
  if (previous) {
    endCountedJob(c, previous.id);
    record(api, {
      personId: seeker.personId,
      organizationId: previous.organizationId,
      jobId: previous.id,
      kind: "quit",
      // Named for what drove the move: pay above the old job's, or (the switch cost standing) the person's traits.
      reasonKey: moveLabel(
        (key) => api.parameter(key),
        position.hourlyMinor,
        previous.hourlyMinor ?? 0,
        jobsData.reasons.traitDrawn,
      ),
      decidedBy: seeker.personId,
      values: {
        offeredHourlyMinor: position.hourlyMinor,
        hourlyMinor: previous.hourlyMinor ?? 0,
        counted: 1,
      },
    });
  }
  store(api)
    .table("pay")
    .put({
      id: jobId,
      level: payLevel(
        api,
        c.organizations.get(job.organizationId)?.placeId ?? "",
      ),
      at: c.date,
      since: c.date,
    });
  store(api)
    .table("positions")
    .put({ ...position, status: "filled", filledBy: seeker.personId });
  fundedHire(
    api,
    position,
    seeker.personId,
    "group",
    positionHeads(position),
    job.wageDailyMinor,
  );
  store(api).table("countedSeekers").remove(seeker.personId);
  endClaim(api, store(api).table("claims"), seeker.personId);
  record(api, {
    personId: seeker.personId,
    organizationId: position.organizationId,
    jobId,
    kind: "hire",
    reasonKey: jobsData.reasons.hired,
    decidedBy: ownerOf(api, position.organizationId) ?? position.organizationId,
    values: {
      fit,
      referral: referralStanding(api, seeker.personId),
      hourlyMinor: pay,
      // The schooling the pay was read from, as its weekly earnings.
      schoolingWeekly: schoolingWeekly(api, seeker.personId) ?? 0,
      counted: 1,
    },
  });
  return true;
}

/**
 * Who among the counted owners acts this month (founding, closing, borrowing), without dice: each one's pull is
 * the logistic of their reasons; as many act as the pulls add up to (the
 * remainder carries to next month), and the strongest pulls act.
 */
export function strongestPulls<T extends { id: string; score: number }>(
  api: CoreAPI,
  key: string,
  rows: readonly T[],
  /** The table the caller keeps its carry in; the jobs module's own when the caller is the jobs engine. */
  state: ModuleTable = store(api).table("state"),
): T[] {
  stopgap("SG-WORLD-counted-owner-pulls");
  const row = (state.get(`pulls:${key}`) as { carry: number } | undefined) ?? {
    carry: 0,
  };
  let total = row.carry;
  for (const item of rows) total += 1 / (1 + Math.exp(-item.score));
  const count = Math.floor(total);
  state.put({ id: `pulls:${key}`, carry: total - count });
  return [...rows]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, count);
}

const onsetToday = new WeakMap<object, { date: string; years: number }>();

/**
 * The age at which retiring starts to pull on a worker: the earliest Social
 * Security claim age under the law in force, so a law that moves it moves
 * when people leave work (the outcome web's retirement-age link, read by the
 * engine at the moment it decides). Where no law is open, the sourced 62.
 * The earliest claim age is the law's own value, the same for every birth
 * year, so it is read once a day.
 */
export function retirementOnsetYears(api: CoreAPI): number {
  const held = onsetToday.get(api.state);
  if (held?.date === api.state.date) return held.years;
  const years = core(api).modules.has(LAWS_MODULE_ID)
    ? socialSecurityAges(api, "1960-06-01").earliestMonths /
      api.parameter("monthsPerYear")
    : api.parameter("jobsEarliestRetirementAge");
  onsetToday.set(api.state, { date: api.state.date, years });
  return years;
}

/** A decision's recorded reasons as numbers: each reason's share and the score they sum to. */
function reasonsOf(
  result: ReturnType<typeof chooseAct>,
): Record<string, number> {
  const reasons: Record<string, number> = { ...(result.selectedReasons ?? {}) };
  reasons.score = Object.values(reasons).reduce((n, v) => n + v, 0);
  return reasons;
}

/**
 * The labor outcomes the web keeps, read off the records: the share of each
 * group at work (full people and counted members, a counted household
 * standing for its weight) and the share of jobs under the low-wage line.
 */
export function laborGroupShares(
  api: CoreAPI,
  placeId: string,
): Record<
  | "labor.mothers-participation"
  | "labor.married-women-participation"
  | "labor.older-employment"
  | "labor.low-wage-jobs",
  { readonly of: number; readonly at: number }
> {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const out = {
    "labor.mothers-participation": { of: 0, at: 0 },
    "labor.married-women-participation": { of: 0, at: 0 },
    "labor.older-employment": { of: 0, at: 0 },
    "labor.low-wage-jobs": { of: 0, at: 0 },
  };
  // Participation is being at work or looking for work; older employment is being at work.
  const looking = new Set<string>(
    [
      ...(store(api).table("seekers").rows() as unknown as SeekerRow[]),
      ...(store(api).table("countedSeekers").rows() as unknown as SeekerRow[]),
    ].map((row) => row.personId),
  );
  const tally = (
    facts: LaborFacts,
    id: string,
    working: boolean,
    weight: number,
  ) => {
    for (const key of Object.keys(out).slice(0, 3))
      if (inGroup(key, facts, p)) {
        const row = out[key as keyof typeof out];
        row.of += weight;
        if (working || (key !== "labor.older-employment" && looking.has(id)))
          row.at += weight;
      }
  };
  const worked = new Set<string>();
  for (const job of c.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const person = c.people.get(job.personId);
    if (!person?.alive || person.placeId !== placeId) continue;
    worked.add(job.personId);
    out["labor.low-wage-jobs"].of += 1;
    if ((job.hourlyMinor ?? 0) < p("jobsLowWageLineHourlyMinor"))
      out["labor.low-wage-jobs"].at += 1;
  }
  for (const person of c.people.values())
    if (person.alive && person.placeId === placeId)
      tally(fullFacts(api, person.id, p)!, person.id, worked.has(person.id), 1);
  const rt = residentsRuntime(c);
  if (rt) {
    const working = new Set<string>();
    for (const [jobId, flow] of rt.wageFlowByJob) {
      const job = rt.jobs.get(jobId);
      if (job && !job.endsAt && !flow.endedAt) {
        working.add(job.personId);
        const place = rt.store.countedMember(job.personId);
        if (
          place !== undefined &&
          rt.store.strings[rt.store.placeIx[place]!] === placeId
        ) {
          // As many jobs as the counted job stands for.
          const w = rt.store.headsOfJob(
            rt.store.households[rt.store.household[place]!]!,
            jobId,
          );
          out["labor.low-wage-jobs"].of += w;
          if ((job.hourlyMinor ?? 0) < p("jobsLowWageLineHourlyMinor"))
            out["labor.low-wage-jobs"].at += w;
        }
      }
    }
    for (const h of rt.store.liveHouseholds()) {
      if (h.placeId !== placeId) continue;
      const w = rt.store.weightOf(h);
      for (const m of rt.store.countedMembers(h))
        tally(
          countedFacts(api, rt.store, m, p),
          rt.store.ids[m]!,
          working.has(rt.store.ids[m]!),
          w,
        );
    }
  }
  return out;
}

/** The web's log factor on the pull to be at work for one counted person, from the counts. */
function countedShift(
  api: CoreAPI,
  personId: string,
  placeId: string,
  p: (key: string) => number,
): number {
  const store = residentsRuntime(core(api))?.store;
  const m = store?.countedMember(personId);
  if (!store || m === undefined) return 0;
  return participationShift(api, placeId, countedFacts(api, store, m, p), p);
}

/**
 * Counted workers (the wider population) stay, look around, quit or retire by
 * the same offers and the same chooser as full people, each record deciding
 * for the household it stands for (its weight is how many jobs end or are
 * looked for with it). Their record holds no needs, so strain is the neutral
 * zero; the rest is read from it: age, savings, traits and tenure. An owner
 * retires through their business, not off its payroll.
 */
function reviewCountedWorkers(
  api: CoreAPI,
  going: ReadonlyMap<string, number>,
): void {
  const c = core(api);
  const seekers = store(api).table("countedSeekers");
  const decided: {
    job: JobInput;
    placeId: string;
    result: ReturnType<typeof chooseAct>;
    age: number;
  }[] = [];
  for (const [organizationId, book] of c.finance.businesses) {
    if (book.closedAt) continue;
    for (const job of countedJobsOf(c, organizationId)) {
      if (inCustody(api, job.personId)) continue;
      if (ownerOf(api, organizationId) === job.personId) continue;
      const person = residentFacts(c, job.personId);
      if (!person) continue;
      const { offers, age } = workerOffers(api, going, {
        job,
        placeId: person.placeId,
        birthDate: person.birthDate,
        liquidMinor: person.liquidMinor,
        livingCostDailyMinor: person.livingCostDailyMinor,
        strain: api.parameter("zero"),
        stay: countedShift(api, job.personId, person.placeId, (key: string) =>
          api.parameter(key),
        ),
      });
      decided.push({
        job,
        placeId: person.placeId,
        age,
        result: chooseAct(c, job.personId, offers),
      });
    }
  }
  for (const { job, placeId, age, result } of decided) {
    const chosen = result.selected!.definition.id;
    const seeking = seekers.get(job.personId) as SeekerRow | undefined;
    if (chosen === jobsData.actions.look.id) {
      if (!seeking)
        seekers.put({
          id: job.personId,
          isSeeker: true,
          personId: job.personId,
          placeId,
          employed: true,
          since: c.date,
          reasonKey: jobsData.reasons.lookingAround,
          referenceHourlyMinor: job.hourlyMinor ?? 0,
          reasons: reasonsOf(result),
        } as never);
    } else if (chosen === jobsData.actions.stay.id) {
      // Someone looking around who now weighs staying put stops looking.
      if (seeking?.employed) seekers.remove(job.personId);
    } else if (result.selected!.targetId.startsWith("retire:")) {
      seekers.remove(job.personId);
      endClaim(api, store(api).table("claims"), job.personId);
      endCountedJob(c, job.id);
      // Their income goes on from their own claim: age, covered work and traits.
      claimRetirementNow(api, job.personId);
      record(api, {
        personId: job.personId,
        organizationId: job.organizationId,
        jobId: job.id,
        kind: "left-work",
        reasonKey: jobsData.reasons.retired,
        decidedBy: job.personId,
        values: { age, counted: 1, ...reasonsOf(result) },
      });
    } else {
      // A quit looks for work with no claim (a quit doesn't qualify).
      endCountedJob(c, job.id);
      record(api, {
        personId: job.personId,
        organizationId: job.organizationId,
        jobId: job.id,
        kind: "quit",
        reasonKey: jobsData.reasons.leftJob,
        decidedBy: job.personId,
        values: { counted: 1, ...reasonsOf(result) },
      });
      seekers.put({
        id: job.personId,
        isSeeker: true,
        personId: job.personId,
        placeId,
        employed: false,
        since: c.date,
        reasonKey: jobsData.reasons.leftJob,
        referenceHourlyMinor: job.hourlyMinor ?? 0,
        lastJob: { ...job },
        reasons: reasonsOf(result),
      } as never);
    }
  }
}

/**
 * Counted adults of working age with no job wait or look for work by the
 * offers a full person weighs (see `reviewJobless`): how few days their
 * household's money covers, the place's unemployment and their traits. The
 * same comparison starts the search and, for someone already looking, ends it.
 */
export function reviewCountedEntry(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    rt = residentsRuntime(c);
  if (!rt) return;
  const [young, old] = jobsData.workingAge as [number, number];
  const working = new Set<string>();
  for (const [jobId, flow] of rt.wageFlowByJob) {
    const job = rt.jobs.get(jobId);
    if (job && !job.endsAt && !flow.endedAt) working.add(job.personId);
  }
  const seekers = store(api).table("countedSeekers");
  const monthDays = p("jobsDaysPerYear") / p("macroMonthsPerYear");
  const counted = rt.store;
  for (const h of counted.liveHouseholds()) {
    let days: number | undefined;
    for (const m of counted.countedMembers(h)) {
      const personId = counted.ids[m]!;
      if (working.has(personId)) continue;
      const age =
        daysBetweenText(counted.born[m]!, c.date) / p("jobsDaysPerYear");
      if (age < young || age >= old) continue;
      // The custody query after the age test, so children and retirees skip it.
      if (inCustody(api, personId)) continue;
      const placeId = counted.strings[counted.placeIx[m]!]!;
      // The household's money against its costs, as a full person's household reads.
      if (days === undefined) {
        let liquid = 0,
          cost = 0;
        for (const member of counted.factsOfHousehold(h)) {
          liquid += member.liquidMinor;
          cost += member.livingCostDailyMinor;
        }
        days = cost > 0 ? liquid / cost : Number.POSITIVE_INFINITY;
      }
      const result = chooseAct(c, personId, [
        offer("wait", personId, {}),
        offer("look", personId, {
          baseline: p("jobsEnterBaseline"),
          // The outcome web's pull toward being at work for this person's groups.
          web: participationShift(
            api,
            placeId,
            countedFacts(api, counted, m, p),
            p,
          ),
          needWork:
            p("jobsUnemployedNeedWeight") / (p("one") + days / monthDays),
          unemployment:
            -p("jobsUnemploymentEntryWeight") * unemploymentGap(api, placeId),
        }),
      ]);
      settleEntryChoice(
        api,
        personId,
        "countedSeekers",
        result.selected!.definition.id === jobsData.actions.look.id,
        seekers.get(personId) as SeekerRow | undefined,
        () =>
          seekers.put({
            id: personId,
            isSeeker: true,
            personId,
            placeId,
            employed: false,
            since: c.date,
            reasonKey: jobsData.reasons.startedLooking,
            referenceHourlyMinor: 0,
            reasons: reasonsOf(result),
          } as never),
      );
    }
  }
}

function experienceYears(
  api: CoreAPI,
  personId: string,
  occupation: string,
): number {
  const c = core(api);
  let years = 0;
  for (const id of c.work.commitmentsByPerson.get(personId) ?? []) {
    const row = c.work.commitments.get(id)!,
      job = c.jobs.get(row.jobId);
    if ((job?.occupationClassification ?? job?.title) !== occupation) continue;
    const end = row.endsAt ?? api.state.date;
    years +=
      daysBetweenText(row.startsAt, end) / api.parameter("jobsDaysPerYear");
  }
  return years;
}

const countedRoles = new WeakMap<
  object,
  {
    byJob: Map<string, WorkCommitmentInput>;
    byOrganization: Map<string, WorkCommitmentInput>;
    calendars: Map<string, WorkPayrollCalendarInput>;
  }
>();

function countedRolesOf(rt: NonNullable<ReturnType<typeof residentsRuntime>>) {
  let roles = countedRoles.get(rt.input);
  if (!roles) {
    roles = {
      byJob: new Map(),
      byOrganization: new Map(),
      calendars: new Map(
        (rt.input.calendars ?? []).map((row) => [row.id, row]),
      ),
    };
    // The counted households' records (the opening's own are not kept).
    for (const h of rt.store.liveHouseholds())
      for (const row of h.workCommitments) {
        roles.byJob.set(row.jobId, row);
        if (!roles.byOrganization.has(row.organizationId))
          roles.byOrganization.set(row.organizationId, row);
      }
    countedRoles.set(rt.input, roles);
  }
  return roles;
}

/** Years a counted worker has held their job: from their hire here, else when they took their opening job (its commitment's heldSince). */
function countedTenureYears(api: CoreAPI, job: JobInput): number {
  const c = core(api),
    rt = residentsRuntime(c);
  const role = rt ? countedRolesOf(rt).byJob.get(job.id) : undefined;
  const since =
    (store(api).table("pay").get(job.id) as { since?: string } | undefined)
      ?.since ??
    role?.heldSince ??
    role?.startsAt ??
    api.state.startedAt;
  return (
    Math.max(0, daysBetweenText(since, c.date)) /
    api.parameter("jobsDaysPerYear")
  );
}

/**
 * A counted worker's pull to quit to nothing this month: the typical-tenure
 * baseline, less for a longer tenure and more for a shorter one, more for pay
 * below the going rate, less where the place's unemployment is above the
 * natural rate, and their traits' lean toward change (`restless`, already weighted by the decision's calibrated trait weight). Sliding in each.
 */
export function quitScore(
  p: (key: string) => number,
  reasons: {
    payGap: number;
    tenureYears: number;
    unemploymentGapPts: number;
    restless?: number;
  },
): number {
  return (
    p("jobsQuitBaseline") +
    p("jobsPayGapWeight") * reasons.payGap +
    p("jobsQuitTenureWeight") *
      (Math.log1p(p("jobsTypicalTenureYears")) -
        Math.log1p(reasons.tenureYears)) -
    p("jobsUnemploymentQuitWeight") * reasons.unemploymentGapPts +
    (reasons.restless ?? 0)
  );
}

/**
 * The role a position copies: its job, work schedule and payday calendar.
 * A full worker's role is read from the core; a counted worker's from the
 * opening records the counts keep, so a full person can take a role first
 * held in the wider population (a first job included). A role copied from a
 * counted hire made during play has no schedule of its own and takes the
 * employer's opening schedule for counted staff.
 */
function roleTemplate(
  c: CoreState,
  position: PositionRow,
):
  | {
      template: JobInput;
      commitment: WorkCommitmentInput;
      calendar: WorkPayrollCalendarInput;
    }
  | undefined {
  // A closed business hires no one, though its opening may still be listed.
  if (c.finance.businesses.get(position.organizationId)?.closedAt)
    return undefined;
  const full = c.jobs.get(position.templateJobId);
  if (full) {
    const commitment = [
      ...(c.work.commitmentsByPerson.get(full.personId) ?? []),
    ]
      .map((id) => c.work.commitments.get(id)!)
      .find((row) => row.jobId === full.id);
    const calendarId =
      commitment && c.work.payrollCalendarByCommitment.get(commitment.id);
    const calendar = calendarId
      ? c.work.payrollCalendars.get(calendarId)
      : undefined;
    return commitment && calendar
      ? { template: full, commitment, calendar }
      : undefined;
  }
  const rt = residentsRuntime(c);
  const template = rt?.jobs.get(position.templateJobId);
  if (!rt || !template) return undefined;
  const roles = countedRolesOf(rt);
  const commitment =
    roles.byJob.get(template.id) ??
    roles.byOrganization.get(position.organizationId);
  const calendar = commitment?.payrollCalendarId
    ? roles.calendars.get(commitment.payrollCalendarId)
    : undefined;
  return commitment && calendar
    ? { template, commitment, calendar }
    : undefined;
}

/** The kind of an employer's offer of a job to the person the player controls. */
export const JOB_OFFERED_EVENT = "job-offered";
/** The replies in an offer's scene that take the job (the same moves an invitation's scene reads). */
const ACCEPTING_REPLIES: ReadonlySet<string> = new Set(["agree", "relent"]);
/** The replies in an offer's scene that turn it down. */
const REFUSING_REPLIES: ReadonlySet<string> = new Set(["decline"]);

/**
 * Who makes an offer at an employer: the full person, other than the
 * applicant, who has held a job there the longest (ties by id). With none, the
 * employer's first counted worker by id, filled in as a full person now. Null
 * when the employer has nobody to make it.
 */
function hiringPerson(
  api: CoreAPI,
  organizationId: string,
  applicantId: string,
): string | null {
  const c = core(api);
  const staff = fullJobs(api, organizationId)
    .filter((job) => job.personId !== applicantId)
    .filter((job) => c.people.get(job.personId)?.alive)
    .filter((job) => !isDemoted(c.people.get(job.personId)!))
    .map((job) => ({ job, years: tenureYears(api, job) }))
    .sort((a, b) => b.years - a.years || a.job.id.localeCompare(b.job.id));
  if (staff[0]) return staff[0].job.personId;
  const rt = residentsRuntime(c);
  const counted = [...(rt?.jobs.values() ?? [])]
    .filter(
      (job) =>
        job.organizationId === organizationId &&
        job.endsAt === undefined &&
        job.personId !== applicantId,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const job of counted) {
    try {
      const person = fillInPerson(c, job.personId);
      if (person.alive) return person.id;
    } catch {
      // Not in the counts any longer: the next worker.
    }
  }
  return null;
}

/**
 * The person the player controls as an applicant this week: out of work, of
 * working age, at home in town, with no offer waiting on them. They decide
 * nothing by applying; an offer is the employer's act.
 */
function openToOffers(api: CoreAPI): SeekerRow | undefined {
  const c = core(api),
    person = c.playerId ? c.people.get(c.playerId) : undefined,
    [young, old] = jobsData.workingAge as [number, number];
  if (
    !person?.alive ||
    person.jobId ||
    inCustody(api, person.id) ||
    !c.households.has(person.householdId)
  )
    return undefined;
  const age =
    daysBetweenText(person.birthDate, c.date) /
    api.parameter("jobsDaysPerYear");
  if (age < young || age >= old) return undefined;
  if (
    store(api).table("offers").query("byPerson", [person.id, "pending"]).length
  )
    return undefined;
  return {
    id: person.id,
    personId: person.id,
    placeId: person.placeId,
    employed: false,
    since: c.date,
    reasonKey: jobsData.reasons.offered,
    referenceHourlyMinor: lastPay(api, person.id),
  };
}

/**
 * The employer picked the person the player controls: a person at the
 * employer makes the offer and holds the position until the deadline. The offer
 * is the `job-offered` record the director stages as a call from that person
 * (owner, Oct 27: a job offer comes through a person and a scene or not at
 * all); the employer withdraws it unanswered after the deadline. With nobody at
 * the employer to make it, there is no offer.
 */
function offerToPlayer(
  api: CoreAPI,
  position: PositionRow,
  personId: string,
  fit: number,
): void {
  const c = core(api);
  const id = `job-offer:${position.id}:${personId}`;
  if (store(api).table("offers").get(id)) return;
  const offeredBy = hiringPerson(api, position.organizationId, personId);
  if (!offeredBy) return;
  const deadline = addDays(makeIsoDate(c.date), api.parameter("jobsOfferDays"));
  const row: JobOfferRow = {
    id,
    personId,
    positionId: position.id,
    organizationId: position.organizationId,
    offeredBy,
    title: position.title,
    // The pay offered is what the person would be hired at, schooling included.
    hourlyMinor: hirePay(api, position, personId),
    fit,
    offeredAt: c.date,
    deadline,
    status: "pending",
  };
  store(api)
    .table("offers")
    .put({ ...row } as never);
  store(api)
    .table("positions")
    .put({ ...position, offeredTo: personId, offerId: id });
  api.moduleCalendar(JOBS_MODULE_ID).schedule({
    key: `jobs-offer-lapse:${id}`,
    date: addDays(makeIsoDate(deadline), 1),
    kind: "jobs-offer-lapse",
    source: source(
      api,
      `The employer withdraws ${id} unanswered after ${deadline}.`,
    ),
    sourceRecordIds: [id],
  });
  const offerer = c.people.get(offeredBy)!;
  api.emit({
    id: `${JOB_OFFERED_EVENT}:${id}`,
    date: c.date,
    kind: JOB_OFFERED_EVENT,
    personIds: [personId, offeredBy],
    placeId: offerer.placeId,
    source: source(
      api,
      `${offeredBy} at ${position.organizationId} offered ${position.title} at ${position.hourlyMinor} cents an hour (${id}).`,
    ),
    facts: {
      offeredBy,
      invitedId: personId,
      offerId: id,
      organizationId: position.organizationId,
      title: position.title,
      hourlyMinor: String(row.hourlyMinor),
      deadline,
    },
  });
}

/**
 * The player's answer to an offer, said in the scene it stages: a yes takes the
 * job, a no turns it down, anything else leaves it waiting for its deadline.
 */
function answerOffer(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  const offer = core(api).durableLog.get(String(facts.causeId ?? "") as never);
  if (offer?.kind !== JOB_OFFERED_EVENT) return;
  const invitedId = String(offer.facts?.invitedId ?? "");
  if (!event.personIds.includes(invitedId)) return;
  const move = String(facts.move);
  const offerId = String(offer.facts?.offerId ?? "");
  if (ACCEPTING_REPLIES.has(move)) acceptJobOffer(api, offerId);
  else if (REFUSING_REPLIES.has(move)) declineJobOffer(api, offerId);
}

/** Closes an offer: its position free for others again. */
function settleOffer(
  api: CoreAPI,
  row: JobOfferRow,
  status: JobOfferRow["status"],
): void {
  const c = core(api);
  store(api)
    .table("offers")
    .put({ ...row, status, answeredAt: c.date } as never);
  const position = store(api).table("positions").get(row.positionId) as
    PositionRow | undefined;
  if (position?.offerId === row.id) {
    const { offeredTo, offerId, ...rest } = position;
    void offeredTo;
    void offerId;
    store(api)
      .table("positions")
      .put({ ...rest });
  }
}

/** The job offers made to a person, newest first. */
export function jobOffersFor(api: CoreAPI, personId: string): JobOfferRow[] {
  return (
    store(api)
      .table("offers")
      .query("byPerson", [personId, "pending"]) as unknown as JobOfferRow[]
  ).sort((a, b) => b.offeredAt.localeCompare(a.offeredAt));
}

/**
 * The player takes the offered job: hired into the position as anyone the
 * employer picks is. False when the offer is no longer open (answered,
 * lapsed, or the employer withdrew the position).
 */
export function acceptJobOffer(api: CoreAPI, offerId: string): boolean {
  const row = store(api).table("offers").get(offerId) as
    JobOfferRow | undefined;
  if (row?.status !== "pending") return false;
  const position = store(api).table("positions").get(row.positionId) as
    PositionRow | undefined;
  if (
    inCustody(api, row.personId) ||
    position?.status !== "open" ||
    position.offerId !== offerId
  ) {
    settleOffer(api, row, "withdrawn");
    return false;
  }
  settleOffer(api, row, "accepted");
  const { offeredTo, offerId: held, ...open } = position;
  void offeredTo;
  void held;
  hire(
    api,
    open,
    {
      id: row.personId,
      personId: row.personId,
      placeId: position.placeId,
      employed: false,
      since: row.offeredAt,
      reasonKey: jobsData.reasons.offered,
      referenceHourlyMinor: lastPay(api, row.personId),
    },
    row.fit,
  );
  return core(api).people.get(row.personId)?.jobId !== undefined;
}

/** The player turns the offer down; the position is open to others again. */
export function declineJobOffer(api: CoreAPI, offerId: string): boolean {
  const row = store(api).table("offers").get(offerId) as
    JobOfferRow | undefined;
  if (row?.status !== "pending") return false;
  settleOffer(api, row, "declined");
  return true;
}

function hire(
  api: CoreAPI,
  position: PositionRow,
  seeker: SeekerRow,
  fit: number,
): void {
  if (inCustody(api, seeker.personId)) return;
  const c = core(api),
    person = c.people.get(seeker.personId)!;
  const role = roleTemplate(c, position);
  if (!role) return;
  const { template, commitment: templateCommitment, calendar } = role;
  if (person.jobId) {
    const old = c.jobs.get(person.jobId)!;
    api.endJob(old.id, `jobs:quit:${api.state.date}`);
    record(api, {
      personId: person.id,
      organizationId: old.organizationId,
      jobId: old.id,
      kind: "quit",
      // Named for what drove the move: pay above the old job's, else the other reasons the person's choice recorded.
      reasonKey: moveLabel(
        (key) => api.parameter(key),
        position.hourlyMinor,
        old.hourlyMinor ?? 0,
        jobsData.reasons.otherOffer,
      ),
      decidedBy: person.id,
      values: {
        offeredHourlyMinor: position.hourlyMinor,
        hourlyMinor: old.hourlyMinor ?? 0,
      },
    });
  }
  const pay = hirePay(api, position, person.id);
  const startsAt = addDays(makeIsoDate(api.state.date), 1);
  const coworkerIds = fullJobs(api, position.organizationId).map(
    (row) => row.personId,
  );
  const jobId = `job:${position.id}:${person.id}`,
    commitmentId = `work-commitment:${jobId}`;
  const jobSource = source(
    api,
    `Hired to ${position.id} at the business's own pay for the role.`,
  );
  // The job states the week the schedule it copies runs (a counted template's
  // own row can state another), so the stated pay is what payroll pays.
  const hoursDaily =
    templateCommitment.expectedWeeklyMinutes > 0
      ? templateCommitment.expectedWeeklyMinutes /
        api.parameter("minutesPerHour") /
        api.parameter("daysPerWeek")
      : template.hoursDaily;
  const job: JobInput = {
    id: jobId,
    personId: person.id,
    organizationId: position.organizationId,
    title: position.title,
    // Kept only when the template has one: a job record holds no undefined field.
    ...(template.occupationClassification !== undefined
      ? { occupationClassification: template.occupationClassification }
      : {}),
    hourlyMinor: pay,
    hoursDaily,
    wageDailyMinor: Math.round(pay * hoursDaily),
    source: jobSource,
  };
  const newCalendar: WorkPayrollCalendarInput = {
    ...calendar,
    organizationId: position.organizationId,
    id: `payroll-calendar:${jobId}`,
    workCommitmentIds: [commitmentId],
    // A counted template is not a saved core record; the employer is the basis.
    basisRecordIds: c.jobs.has(template.id)
      ? [position.organizationId, template.id]
      : [position.organizationId],
    effectiveFrom: [startsAt, calendar.effectiveFrom].sort().at(-1)!,
    source: jobSource,
  };
  api.startJob(
    job,
    {
      ...templateCommitment,
      organizationId: position.organizationId,
      id: commitmentId,
      jobId,
      personId: person.id,
      payrollCalendarId: newCalendar.id,
      startsAt,
      heldSince: undefined,
      endsAt: undefined,
      hourlyMinor: pay,
      scheduleTemplateJobId: template.id,
      paySource: jobSource,
      scheduleSource: jobSource,
    },
    newCalendar,
  );
  store(api)
    .table("pay")
    .put({
      id: jobId,
      level: payLevel(
        api,
        c.organizations.get(job.organizationId)?.placeId ?? "",
      ),
      at: c.date,
    });
  // A full person fills one job of an opening that stands for several; it stays open for the rest.
  const left = positionHeads(position) - 1;
  store(api)
    .table("positions")
    .put(
      left >= 1
        ? { ...position, heads: left }
        : { ...position, status: "filled", filledBy: person.id },
    );
  fundedHire(api, position, person.id, "person", 1, job.wageDailyMinor);
  store(api).table("seekers").remove(person.id);
  // A counted seeker who was met and filled in before being hired keeps its
  // counted row; it must not outlive the hire.
  store(api).table("countedSeekers").remove(person.id);
  endSpell(api, person.id);
  // The new hire meets the full people already working there.
  meetAtWork(
    api,
    person.id,
    position.organizationId,
    coworkerIds,
    hoursDaily,
    `job-change:${api.state.date}:${jobId}:hire`,
  );
  record(api, {
    personId: person.id,
    organizationId: position.organizationId,
    jobId,
    kind: "hire",
    reasonKey: jobsData.reasons.hired,
    decidedBy: position.organizationId,
    values: {
      fit,
      referral: referralStanding(api, seeker.personId),
      hourlyMinor: pay,
      // The schooling the pay was read from, as its weekly earnings.
      schoolingWeekly: schoolingWeekly(api, person.id) ?? 0,
    },
  });
}

/**
 * A hire to an opening a budget line funds: the jobs engine applied the
 * line's change to this worker (a named person, or a counted worker standing
 * for the jobs the opening stood for). The row names the pay the line commits
 * to them for a year (their daily wage over a year, times the jobs the
 * opening stood for), so the money the line pays is on the payee's own record.
 */
function fundedHire(
  api: CoreAPI,
  position: PositionRow,
  personId: string,
  target: "person" | "group",
  count: number,
  wageDailyMinor: number,
): void {
  if (!position.fundedBy) return;
  lawApplied(api, {
    key: position.fundedBy.key,
    lawId: position.fundedBy.lawId,
    targetId: personId,
    target,
    engine: JOBS_MODULE_ID,
    what: "hired-on-budget-line",
    count,
    amountMinor: wageDailyMinor * count * api.parameter("jobsDaysPerYear"),
  });
}

/**
 * Openings a budget line newly funds at a public employer, posted like any
 * opening at the employer's pay for the role: the week's matching fills them
 * from named and counted seekers alike, and each hire records the line.
 */
export function postFundedOpenings(
  api: CoreAPI,
  input: {
    readonly organizationId: string;
    readonly templateJobId: string;
    readonly count: number;
    readonly key: string;
    readonly lawId: string;
  },
): number {
  // With no jobs engine (a unit test's small world) nobody fills an opening.
  if (!api.state.modules.has(JOBS_MODULE_ID)) return 0;
  const c = core(api);
  const template = jobById(api, input.templateJobId);
  const placeId = c.organizations.get(input.organizationId)?.placeId;
  if (!template || !placeId) return 0;
  let posted = 0;
  for (; posted < input.count; posted += 1)
    store(api)
      .table("positions")
      .put({
        id: `position:${input.organizationId}:${api.state.date}:${input.key}:${posted}`,
        organizationId: input.organizationId,
        placeId,
        templateJobId: template.id,
        title: template.title,
        occupation: roleOf(template),
        hourlyMinor: payFor(api, input.organizationId, template),
        openedAt: api.state.date,
        status: "open",
        reasonKey: jobsData.reasons.opening,
        fundedBy: { key: input.key, lawId: input.lawId },
      } satisfies PositionRow);
  return posted;
}

/** An employer's open openings a budget line funds. */
export function fundedOpenings(
  api: CoreAPI,
  organizationId: string,
  key: string,
): readonly PositionRow[] {
  if (!api.state.modules.has(JOBS_MODULE_ID)) return [];
  return openPositions(api, organizationId).filter(
    (row) => row.fundedBy?.key === key,
  );
}

/** Withdraw an opening the line no longer funds (it was cut back before anyone filled it). */
export function withdrawOpening(api: CoreAPI, position: PositionRow): void {
  store(api)
    .table("positions")
    .put({ ...position, status: "withdrawn" });
}

/** End a counted worker's job: a public employer let them go when its line was cut. */
export function layOffCounted(api: CoreAPI, jobId: string): boolean {
  if (!api.state.modules.has(JOBS_MODULE_ID)) return false;
  const c = core(api);
  const job = residentsRuntime(c)?.jobs.get(jobId);
  if (!job) return false;
  endCountedJob(c, jobId);
  record(api, {
    personId: job.personId,
    organizationId: job.organizationId,
    jobId,
    kind: "layoff",
    reasonKey: jobsData.reasons.layoff,
    decidedBy: job.organizationId,
    values: { hourlyMinor: job.hourlyMinor ?? 0, counted: 1 },
  });
  return true;
}

export const JOBS_MODULE: CoreModule = {
  id: JOBS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      employers: { indexes: { all: { fields: ["isEmployer"] } } },
      positions: {
        indexes: {
          byStatus: { fields: ["status"] },
          byEmployerStatus: { fields: ["organizationId", "status"] },
        },
      },
      seekers: { indexes: { all: { fields: ["isSeeker"] } } },
      offers: { indexes: { byPerson: { fields: ["personId", "status"] } } },
      pay: {},
      raises: { indexes: { byPerson: { fields: ["personId"] } } },
      referrals: { indexes: { byPerson: { fields: ["personId"] } } },
      countedSeekers: { indexes: { all: { fields: ["isSeeker"] } } },
      spells: { indexes: { open: { fields: ["personId", "open"] } } },
      claims: {
        indexes: {
          open: { fields: ["open"] },
          byPerson: { fields: ["personId", "open"] },
        },
      },
      changes: {
        indexes: {
          byPerson: { fields: ["personId"] },
          byKind: { fields: ["kind"] },
        },
      },
    },
  },
  reasonProviders: {
    [PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
  eventKinds: [
    "organization.closed",
    "life.death",
    MOVED_AWAY_EVENT,
    "justice.imprisoned",
    "scene.reply",
  ],
  onEvent(api, event) {
    if (event.kind === "scene.reply") {
      answerOffer(api, event);
      return;
    }
    if (event.kind === "justice.imprisoned") {
      for (const personId of event.personIds) {
        if (!inCustody(api, personId)) continue;
        store(api).table("seekers").remove(personId);
        store(api).table("countedSeekers").remove(personId);
        for (const row of jobOffersFor(api, personId))
          settleOffer(api, row, "withdrawn");
      }
      return;
    }
    if (!store(api).table("state").get("jobs:state")) return;
    if (event.kind === "life.death") {
      for (const personId of event.personIds)
        workerDied(api, personId, event.id);
      return;
    }
    if (event.kind === MOVED_AWAY_EVENT) {
      workerMoved(api, event);
      return;
    }
    // The closure event's id ends with the closed business.
    const organizationId = event.id.split(":").slice(2).join(":");
    // The closed business's counted workers look for work too, with their claims.
    const rt = residentsRuntime(core(api));
    const closure = core(api).finance.closures.get(organizationId);
    for (const id of closure?.endedCountedJobIds ?? []) {
      const job = rt?.jobs.get(id);
      if (!job) continue;
      // Only jobs named by this closure ended because of it. A same-day quit did not.
      // Looking for another job does not keep this job alive after closure.
      // The job ends with the employer today; its wage flow stops paying at its next date.
      if (!job.endsAt && !endCountedJob(core(api), job.id)) {
        const ended = { ...job, endsAt: api.state.date };
        rt!.jobs.set(job.id, ended);
        countedHouseholdJobChanged(core(api), ended);
      }
      const person = residentFacts(core(api), job.personId);
      if (!person) continue;
      record(api, {
        personId: job.personId,
        organizationId,
        jobId: job.id,
        kind: "closure",
        reasonKey: jobsData.reasons.closure,
        decidedBy: ownerOf(api, organizationId) ?? organizationId,
      });
      if (inCustody(api, job.personId)) continue;
      store(api)
        .table("countedSeekers")
        .put({
          id: job.personId,
          isSeeker: true,
          personId: job.personId,
          placeId: person.placeId,
          employed: false,
          since: api.state.date,
          reasonKey: jobsData.reasons.closure,
          referenceHourlyMinor: job.hourlyMinor ?? 0,
          lastJob: { ...job },
        });
      fileClaim(
        api,
        store(api).table("claims"),
        job,
        jobsData.reasons.closure,
        (tenureYears(api, job) * api.parameter("jobsDaysPerYear")) /
          DAYS_PER_WEEK,
      );
    }
    for (const personId of event.personIds) {
      const person = core(api).people.get(personId);
      if (!person) continue;
      const lost = (closure?.endedJobIds ?? [])
        .map((id) => core(api).jobs.get(id))
        .find((job) => job?.personId === personId);
      if (!lost) continue;
      record(api, {
        personId,
        organizationId,
        jobId: lost.id,
        kind: "closure",
        reasonKey: jobsData.reasons.closure,
        // The owner answers for the closure; a business without one answers as itself.
        decidedBy: ownerOf(api, organizationId) ?? organizationId,
      });
      startSeeking(
        api,
        personId,
        false,
        jobsData.reasons.closure,
        lost.hourlyMinor ?? 0,
      );
      fileClaim(
        api,
        store(api).table("claims"),
        lost,
        jobsData.reasons.closure,
        (tenureYears(api, lost) * api.parameter("jobsDaysPerYear")) /
          DAYS_PER_WEEK,
      );
    }
  },
  onCalendarWork(api, work) {
    if (work.kind === "jobs-end") {
      const job = core(api).jobs.get(work.sourceRecordIds[0] ?? "");
      if (job && job.endsAt === undefined)
        api.endJob(job.id, work.sourceRecordIds[1] ?? work.key);
    } else if (work.kind === "jobs-review") {
      noteCountedLeavers(api);
      reviewEmployers(api);
      reviewWorkers(api);
      scheduleReview(api);
    } else if (work.kind === "jobs-offer-lapse") {
      const row = store(api)
        .table("offers")
        .get(work.sourceRecordIds[0] ?? "") as JobOfferRow | undefined;
      if (row?.status === "pending") settleOffer(api, row, "lapsed");
    } else if (work.kind === "jobs-week") {
      payClaims(api, store(api).table("claims"));
      runWeek(api);
      scheduleWeek(api);
    }
  },
  onDay(api) {
    if (!store(api).table("state").get("jobs:state")) open(api);
  },
};

/** A newly founded business joins the labor market, staffing toward what its books call for. */
/**
 * A business founded mid-run joins the jobs engine. Until it has staff of
 * its own, its positions copy roles, schedules and pay from `templateFromId`
 * (its parent, or a business of its kind).
 */
export function registerEmployer(
  api: CoreAPI,
  organizationId: string,
  openingStaff: number,
  templateFromId?: string,
): void {
  if (!store(api).table("state").get("jobs:state")) return;
  // Its books are sized like its template's (a business of its kind in the same town), at the same scale.
  const scale = templateFromId
    ? (
        store(api).table("employers").get(templateFromId) as
          EmployerRow | undefined
      )?.openingScale
    : undefined;
  store(api)
    .table("employers")
    .put({
      id: organizationId,
      isEmployer: true,
      openingStaff,
      ...(scale !== undefined ? { openingScale: scale } : {}),
      need: 0,
      // An employer registered after the opening keeps the roles its staff is
      // made of, so a role it loses is refilled as that role even when its
      // last holder leaves (a reporter at an outlet with only an editor left).
      ...(templateFromId
        ? { templateFromId }
        : {
            mix: roleMix(
              currentJobs(api, organizationId),
              fullJobs(api, organizationId),
            ),
          }),
    });
}
