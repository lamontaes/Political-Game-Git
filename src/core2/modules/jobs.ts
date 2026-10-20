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
import { addDays, daysBetween, makeIsoDate } from "../kernel/dates";
import { chooseAct, decisionFromScores, scoreOffers } from "../choice";
import jobsData from "../data/jobs/jobs.json" with { type: "json" };
import jobsParameters from "../data/jobs/parameters.json" with { type: "json" };
import seasonal from "../data/jobs/seasonal.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import { traitLean } from "../choice";
import {
  decisionLean,
  decisionTraitWeight,
  traitLeanBetween,
} from "../trait-decisions";
import {
  businessTradingMonth,
  ownerOf,
  type BusinessTradingMonth,
} from "./business";
import { LAWS_MODULE_ID, lawInForce, socialSecurityAges } from "./laws";
import { publicPayFloorHourly } from "../public-pay-floor";
import { inCustody } from "./justice";
import { regionalMonth } from "./regional";
import { isDemoted } from "../counted-groups";
import { residentPerson, residentsRuntime } from "./residents";
import { claimRetirementNow } from "./retirement-claims";
import { MOVED_AWAY_EVENT } from "./moves";
import { endClaim, fileClaim, payClaims } from "../jobs-benefits";
import { meetAtWork } from "../encounters";
import {
  addCountedJob,
  countedHeadsOf,
  countedJobsOf,
  endCountedJob,
  rerateCountedJobs,
} from "../residents-economy";
import type {
  ActOffer,
  ActionDefinition,
  CoreAPI,
  CoreModule,
  CoreState,
  JobInput,
  WorkCommitmentInput,
  PersonState,
  Source,
} from "../types";
import type { WorkPayrollCalendarInput } from "../work-pay-period";
import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
import {
  playerClockFrontierV1,
  registerModuleStopV1,
  releaseModuleStopV1,
  type ModuleStopTokenV1,
} from "../player-stops-v1";

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
}
/** A job offered to the person the player controls: theirs to accept or decline. */
export interface JobOfferRow {
  id: string;
  personId: string;
  positionId: string;
  organizationId: string;
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
}
interface EmployerRow {
  id: string;
  openingStaff: number;
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
  /** What each of those jobs stood for at the last review, in jobs (the household weight), for a worker whose household is gone. */
  countedHeads?: Record<string, number>;
}

function store(api: CoreAPI) {
  return api.moduleState(JOBS_MODULE_ID);
}
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
function currentJobs(api: CoreAPI, organizationId: string) {
  return [
    ...fullJobs(api, organizationId),
    ...countedJobsOf(core(api), organizationId),
  ];
}

/** How many jobs a job record stands for: one for a full person's, the household weight for a counted worker's. */
function headsOf(c: CoreState, job: Pick<JobInput, "id" | "personId">): number {
  return c.jobs.has(job.id) ? 1 : countedHeadsOf(c, job.personId);
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
    residentPerson(core(api), personId)?.traits ??
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
    kind: "hire" | "quit" | "layoff" | "closure" | "left-work";
    reasonKey: string;
    decidedBy: string;
    values?: Readonly<Record<string, number>>;
    tradingId?: string;
  },
): void {
  // A worker who leaves (a quit, retirement, move or death) is replaced: the employer's need grows by one at once.
  if (row.kind === "quit" || row.kind === "left-work")
    noteLeaver(
      api,
      row.organizationId,
      row.jobId,
      row.personId,
      headsOf(core(api), { id: row.jobId, personId: row.personId }),
    );
  store(api)
    .table("changes")
    .put({
      id: `job-change:${api.state.date}:${row.jobId}:${row.kind}`,
      date: api.state.date,
      ...row,
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
    for (const id of closed ? [] : Object.keys(row.countedJobs ?? {})) {
      if (now[id] || c.jobs.has(id)) continue;
      const job = rt.jobs.get(id);
      const ownEnd =
        job?.endsAt !== undefined &&
        ["layoff", "quit", "left-work", "closure"].some((kind) =>
          changes.get(`job-change:${job.endsAt}:${id}:${kind}`),
        );
      if (!ownEnd)
        noteLeaver(
          api,
          row.id,
          id,
          row.countedJobs![id]!,
          row.countedHeads?.[id] ?? 1,
        );
    }
    const fresh = (employers.get(row.id) as unknown as EmployerRow) ?? row;
    const heads: Record<string, number> = {};
    for (const [id, personId] of Object.entries(now)) {
      const weight = countedHeadsOf(c, personId);
      if (weight !== 1) heads[id] = weight;
    }
    employers.put({
      ...fresh,
      countedJobs: now,
      ...(Object.keys(heads).length ? { countedHeads: heads } : {}),
    });
  }
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

/** The opening's seekers: jobless working-age adults with the most pressing need to work, as many as the region's rate implies. */
function openSeekers(api: CoreAPI, unemploymentPct: number): void {
  // Until the two-level population, only part of the town's work is generated; see the stopgap.
  stopgap("SG-WORLD-jobs-opening-seekers");
  const c = core(api),
    [young, old] = jobsData.workingAge as [number, number];
  const employed = [...c.jobs.values()].filter(
    (job) => job.endsAt === undefined,
  ).length;
  const count = Math.round(
    (employed * unemploymentPct) /
      (api.parameter("macroHundred") - unemploymentPct),
  );
  const jobless = [...c.people.values()].filter((person) => {
    const age =
      daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
      api.parameter("jobsDaysPerYear");
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
  jobless
    .sort((a, b) => days(a) - days(b) || a.id.localeCompare(b.id))
    .slice(0, count)
    .forEach((person) =>
      startSeeking(api, person.id, false, "opening-unemployed", 0),
    );
}

/** The wider population's seekers at the opening: jobless working-age adults in the households with the fewest earners, as many as the rate implies. */
function openCountedSeekers(api: CoreAPI, unemploymentPct: number): void {
  const c = core(api),
    rt = residentsRuntime(c);
  if (!rt) return;
  stopgap("SG-WORLD-jobs-opening-seekers");
  const [young, old] = jobsData.workingAge as [number, number];
  const working = new Set(
    [...rt.wageFlowByJob.keys()].map((id) => rt.jobs.get(id)?.personId),
  );
  const candidates: { personId: string; placeId: string; share: number }[] = [];
  const counted = rt.store;
  for (const h of counted.liveHouseholds()) {
    const adults = counted.countedMembers(h).filter((m) => {
      const age =
        daysBetween(makeIsoDate(counted.born[m]!), makeIsoDate(c.date)) /
        api.parameter("jobsDaysPerYear");
      return age >= young && age < old;
    });
    if (!adults.length) continue;
    const share =
      adults.filter((m) => working.has(counted.ids[m]!)).length / adults.length;
    for (const m of adults) {
      const personId = counted.ids[m]!;
      if (!working.has(personId) && !inCustody(api, personId))
        candidates.push({
          personId,
          placeId: counted.strings[counted.placeIx[m]!]!,
          share,
        });
    }
  }
  const count = Math.round(
    (working.size * unemploymentPct) /
      (api.parameter("macroHundred") - unemploymentPct),
  );
  candidates
    .sort((a, b) => a.share - b.share || a.personId.localeCompare(b.personId))
    .slice(0, count)
    .forEach((row) =>
      store(api).table("countedSeekers").put({
        id: row.personId,
        isSeeker: true,
        personId: row.personId,
        placeId: row.placeId,
        employed: false,
        since: c.date,
        reasonKey: "opening-unemployed",
        referenceHourlyMinor: 0,
      }),
    );
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
  for (const [id, book] of c.finance.businesses)
    if (!book.closedAt)
      store(api)
        .table("employers")
        .put({
          id,
          isEmployer: true,
          openingStaff: staffHeads(c, currentJobs(api, id)),
          need: 0,
          mix: roleMix(currentJobs(api, id), fullJobs(api, id), (job) =>
            headsOf(c, job),
          ),
        });
  // The nation's opening unemployment when the national economy runs; its long-run rate otherwise.
  const macro = c.modules.has("macro")
    ? (api.moduleState("macro").table("state").get("macro:state") as
        { latestMonth: string } | undefined)
    : undefined;
  const nation = macro
    ? (api
        .moduleState("macro")
        .table("months")
        .get(`macro-month:${macro.latestMonth}`) as
        { unemploymentPct: number } | undefined)
    : undefined;
  openCountedSeekers(
    api,
    nation?.unemploymentPct ?? api.parameter("macroNaturalUnemploymentPct"),
  );
  openSeekers(
    api,
    nation?.unemploymentPct ?? api.parameter("macroNaturalUnemploymentPct"),
  );
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
/** An industry's employment this month against the opening month's, from BLS CES seasonal factors; 1 for kinds with no series. */
export function seasonalStaffing(
  kindId: string,
  date: string,
  openedAt: string,
): number {
  const code = (seasonal.kinds as Record<string, string>)[kindId];
  const factors = code
    ? (seasonal.factors as Record<string, number[]>)[code]
    : undefined;
  if (!factors) return 1;
  const month = (iso: string) => Number(iso.slice(5, 7)) - 1;
  return factors[month(date)]! / factors[month(openedAt)]!;
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
 * month's trading left, which raises already given this review use up.
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
  // What the last month left after wages, purchases and compliance, in a month's days, less raises already given this review.
  let room =
    (trading.salesMinor -
      trading.payrollMinor -
      trading.costsMinor -
      trading.complianceMinor) *
    perMonth;
  // What one head's seat can carry in a month: sales less purchases and compliance, shared across the heads.
  const carriesMonthly =
    ((trading.salesMinor - trading.costsMinor - trading.complianceMinor) *
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
    const added = Math.min(
      room,
      carriesMonthly - paysMonthly,
      lost * openHanded,
    );
    const next = position.hourlyMinor + Math.floor(added / (hours * monthDays));
    if (next <= position.hourlyMinor) continue;
    room -= (next - position.hourlyMinor) * hours * monthDays;
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
    let posted = positions.reduce((n, row) => n + positionHeads(row), 0);
    const projected =
      (book.capacityMinor > 0
        ? // Real demand: the books' demand in the business's own opening prices.
          (row.openingStaff * book.annualDemandMinor) /
          ((book.price / book.anchorPrice || 1) * book.capacityMinor)
        : row.openingStaff) *
      // The season: the industry's staffing this month against the opening's (BLS CES seasonal factors).
      seasonalStaffing(book.kindId, c.date, opened);
    const trading = businessTradingMonth(api, row.id);
    raiseUnfilledPay(api, row.id, positions, trading, staff);
    const observedStaff =
      trading && trading.days > 0 && book.capacityMinor > 0
        ? (row.openingStaff * trading.salesMinor * p("jobsDaysPerYear")) /
          (trading.days *
            (book.price / book.anchorPrice || 1) *
            book.capacityMinor)
        : projected;
    const previousSalesStaff = row.salesStaff ?? projected;
    const salesStaff =
      previousSalesStaff +
      p("jobsStaffGapActedPerMonth") * (observedStaff - previousSalesStaff);
    // The market forecast already reads regional and national conditions.
    // Actual receipts let firms diverge when customers pay different sellers.
    const demandTarget =
      projected * (1 - p("jobsSalesForecastWeight")) +
      salesStaff * p("jobsSalesForecastWeight");
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
      // The next worker to go stands for more jobs than the staff is over by: wait.
      if (laid === "over") break;
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
 * A new opening's pay: the role's own rate, moved with the place's pay level
 * since that rate was set (the region's pay), never under the wage floor in
 * force. Each role keeps its own rate above the floor; the median of whoever
 * holds the role now plays no part (owner, Oct 14).
 */
function payFor(
  api: CoreAPI,
  organizationId: string,
  template: JobInput,
): number {
  const placeId = core(api).organizations.get(organizationId)?.placeId;
  const set = store(api).table("pay").get(template.id) as
    { level: number } | undefined;
  const rate = template.hourlyMinor ?? 0;
  const market = placeId
    ? Math.round(
        (rate * payLevel(api, placeId)) / (set?.level ?? api.parameter("one")),
      )
    : rate;
  // A public employer's hire is held to the public pay floor on the day it is made.
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

function tenureYears(api: CoreAPI, job: JobInput): number {
  if (isCounted(api, job.personId)) return countedTenureYears(api, job);
  const commitment = [
    ...(core(api).work.commitmentsByPerson.get(job.personId) ?? []),
  ]
    .map((id) => core(api).work.commitments.get(id)!)
    .find((row) => row.jobId === job.id);
  const since = commitment?.startsAt ?? api.state.startedAt;
  return (
    daysBetween(makeIsoDate(since), makeIsoDate(api.state.date)) /
    api.parameter("jobsDaysPerYear")
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

/** The business decides who goes: the worker whose tenure and record it values least. */
function layOff(
  api: CoreAPI,
  organizationId: string,
  staff: readonly JobInput[],
  budget: number,
  values: Readonly<Record<string, number>>,
  tradingId?: string,
): { heads: number; id?: string } | "over" | undefined {
  const c = core(api),
    reliability = jobsData.traits.reliability;
  const keep = (job: JobInput) =>
    api.parameter("jobsKeepTenureWeight") * tenureYears(api, job) +
    api.parameter("jobsFitReliabilityWeight") *
      (traitsOf(api, job.personId)[reliability] ?? 0);
  const job = [...staff].sort(
    (a, b) => keep(a) - keep(b) || a.id.localeCompare(b.id),
  )[0];
  if (!job) return;
  // The jobs this record stands for may not exceed what the staff is over by.
  const heads = headsOf(c, job);
  if (heads > budget + 1e-9) return "over";
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
    values: { ...values, keepScore },
    ...(tradingId ? { tradingId } : {}),
  });
  // Read before the event: an event can fill a counted worker in, after which
  // the counts no longer hold them.
  const placeId = (c.people.get(job.personId) ??
    residentPerson(c, job.personId))!.placeId;
  api.emit({
    id: `event:work.job-lost:${api.state.date}:${job.id}`,
    date: api.state.date,
    kind: "work.job-lost",
    // A counted worker is not a full person; the change row names them until fill-in.
    personIds: counted ? [] : [job.personId],
    placeId,
    source: source(api, "A layoff decided from the business's books."),
    publicRecord: false,
    topic: organizationId,
    // Who decided and where, for the scene at work: the director reads them.
    facts: { decidedBy: decidedBy ?? organizationId, organizationId },
  });
  // Laid off through no choice of their own: a claim under the state's program.
  fileClaim(
    api,
    store(api).table("claims"),
    job,
    jobsData.reasons.layoff,
    weeksWorked,
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

/** Each worker: stay, look around, or leave work, from pay against the going rate, savings, needs and traits. */
function reviewWorkers(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const going = new Map<string, number>();
  for (const position of store(api)
    .table("positions")
    .query("byStatus", ["open"]) as unknown as PositionRow[])
    going.set(
      position.occupation,
      Math.max(going.get(position.occupation) ?? 0, position.hourlyMinor),
    );
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
    const pay = job.hourlyMinor ?? 0;
    const payGap =
      pay > 0
        ? Math.max(
            0,
            (going.get(job.occupationClassification ?? job.title) ?? pay) /
              pay -
              1,
          )
        : 0;
    const bufferMonths =
      person.livingCostDailyMinor > 0
        ? person.liquidMinor /
          ((person.livingCostDailyMinor * p("jobsDaysPerYear")) /
            p("macroMonthsPerYear"))
        : 0;
    const strain = (person.needs.time ?? 0) + (person.needs.health ?? 0);
    // Years past the earliest Social Security retirement age pull toward retiring, as savings allow.
    const age =
      daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
      p("jobsDaysPerYear");
    const pastRetirementAge = Math.max(0, age - retirementOnsetYears(api));
    const result = chooseAct(c, person.id, [
      offer("stay", job.id, {}),
      offer("look", job.id, {
        baseline: p("jobsLookBaseline"),
        payGap: p("jobsPayGapWeight") * payGap,
        // Where jobs are scarce, looking around pays less.
        unemployment:
          -p("jobsUnemploymentLookWeight") *
          unemploymentGap(api, person.placeId),
      }),
      // Leaving needs a cause (strain on time or health); savings only make it possible.
      offer("leave", job.id, {
        baseline: p("jobsLeaveBaseline"),
        strain:
          strain *
          (p("one") +
            p("jobsMoneyBufferWeight") * Math.log1p(Math.max(0, bufferMonths))),
      }),
      ...(pastRetirementAge > 0
        ? [
            offer("leave", `retire:${job.id}`, {
              baseline: p("jobsRetireBaseline"),
              age: p("jobsRetireAgeWeight") * pastRetirementAge,
              savings:
                p("jobsMoneyBufferWeight") *
                Math.log1p(Math.max(0, bufferMonths)),
            }),
          ]
        : []),
    ]);
    const chosen = result.selected!.definition.id;
    if (chosen === jobsData.actions.look.id) {
      if (
        ownerOf(api, job.organizationId) !== person.id &&
        !store(api).table("seekers").get(person.id)
      )
        startSeeking(api, person.id, true, "looking-around", pay);
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
  reviewJobless(api);
  reviewCountedRetirements(api);
  reviewCountedLooking(api);
  reviewCountedEntry(api);
  reviewCountedQuits(api);
  raisePay(api);
}

/** The place's pay level against the opening: national hourly earnings times its region's pay. */
function payLevel(api: CoreAPI, placeId: string): number {
  const c = core(api);
  const condition = (c.finance.conditionsByPlace.get(placeId) ?? [])
    .filter((row) => row.at <= c.date)
    .at(-1);
  return condition?.wagePriceFactor ?? api.parameter("one");
}

/**
 * Once a year from its last raise, each job's pay follows the place's pay
 * level since then (Employment Cost Index practice: most employers adjust
 * pay yearly). Hires start at the going rate and their own level.
 */
function raisePay(api: CoreAPI): void {
  const c = core(api),
    pay = store(api).table("pay"),
    months = api.parameter("macroMonthsPerYear"),
    counted = new Map<string, number>();
  const jobs = [
    ...[...c.jobs.values()].filter(
      (job) => job.endsAt === undefined && c.people.get(job.personId)?.alive,
    ),
    ...[...c.finance.businesses.keys()].flatMap((id) => countedJobsOf(c, id)),
  ];
  for (const job of jobs) {
    const placeId = c.organizations.get(job.organizationId)?.placeId;
    if (!placeId || !job.hourlyMinor) continue;
    const row = pay.get(job.id) as
      { level: number; at: string; since?: string } | undefined;
    const level = row?.level ?? api.parameter("one"),
      at = row?.at ?? api.state.startedAt;
    if (
      daysBetween(makeIsoDate(at), makeIsoDate(c.date)) <
      (api.parameter("jobsDaysPerYear") * (months - 1)) / months
    )
      continue;
    const now = payLevel(api, placeId);
    const hourly = Math.round((job.hourlyMinor * now) / level);
    if (hourly > 0 && hourly !== job.hourlyMinor && !c.jobs.has(job.id))
      counted.set(job.id, hourly);
    else if (hourly > 0 && hourly !== job.hourlyMinor)
      api.rerateJob(
        job.id,
        hourly,
        source(
          api,
          `A yearly raise following the place's pay level, ${level.toFixed(4)} to ${now.toFixed(4)} against the opening.`,
        ),
      );
    pay.put({
      id: job.id,
      level: now,
      at: c.date,
      ...(row?.since ? { since: row.since } : {}),
    });
  }
  rerateCountedJobs(c, counted);
}

/** Jobless working-age adults choose whether to look for work, pushed by how few days their household's money covers. */
function reviewJobless(api: CoreAPI): void {
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
      controlled(c, person.id) ||
      store(api).table("seekers").get(person.id)
    )
      continue;
    if (!c.households.has(person.householdId) || inactive.has(person.tier))
      continue;
    // Without the two-level population, only people who have worked in this world are in its labor market (see the opening-seekers stopgap).
    // With it, the counts hold the wider population, so every full person of working age is in it, a first job included.
    if (!twoLevel && !worked.has(person.id)) continue;
    const age =
      daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
      p("jobsDaysPerYear");
    if (age < young || age >= old) continue;
    // A dependent's own living cost is carried by the household, so the
    // pressure is how few days the household's money covers its costs.
    let liquid = 0,
      cost = 0;
    for (const memberId of c.households.get(person.householdId)!.memberIds) {
      const member = c.people.get(memberId);
      if (!member?.alive) continue;
      liquid += member.liquidMinor;
      cost += member.livingCostDailyMinor;
    }
    const days = cost > 0 ? liquid / cost : Number.POSITIVE_INFINITY;
    const result = chooseAct(c, person.id, [
      offer("wait", person.id, {}),
      offer("look", person.id, {
        baseline: p("jobsEnterBaseline"),
        needWork:
          p("jobsUnemployedNeedWeight") /
          (p("one") + days / (p("jobsDaysPerYear") / p("macroMonthsPerYear"))),
        // Where jobs are scarce, fewer start looking (discouraged workers).
        unemployment:
          -p("jobsUnemploymentEntryWeight") *
          unemploymentGap(api, person.placeId),
      }),
    ]);
    if (result.selected!.definition.id === jobsData.actions.look.id)
      startSeeking(
        api,
        person.id,
        false,
        "started-looking",
        lastPay(api, person.id),
      );
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
    const reference = seeker.referenceHourlyMinor;
    const scored = scoreOffers(c, person.id, [
      offer("wait", seeker.id, {}),
      ...nearby.map((position) =>
        offer("apply", position.id, {
          pay:
            p("jobsApplyPayWeight") *
            (reference > 0 ? position.hourlyMinor / reference - 1 : 0),
          needWork: seeker.employed ? 0 : p("jobsUnemployedNeedWeight"),
        }),
      ),
    ]);
    const result = decisionFromScores(c, person.id, scored);
    if (result.selected!.definition.id !== jobsData.actions.apply.id) continue;
    // The pick is the recorded choice; like a counted seeker, the person also
    // applies to every other opening worth more than waiting.
    const wait = scored[0]!.score;
    for (const row of scored)
      if (
        row.offer.definition.id === jobsData.actions.apply.id &&
        row.score > wait
      )
        apply(row.offer.targetId, seeker);
  }
  // The person the player controls, out of work and of working age, is
  // considered for every opening near them; an employer that picks them makes
  // an offer, and the player answers it.
  const player = openToOffers(api);
  if (player)
    for (const position of byPlace.get(player.placeId) ?? [])
      apply(position.id, player);
  // Counted seekers apply to every opening in their place; they decide nothing through the chooser until filled in (stopgap).
  const counted = store(api)
    .table("countedSeekers")
    .query("all", [true]) as unknown as SeekerRow[];
  if (counted.length) stopgap("SG-WORLD-jobs-counted-choices");
  for (const seeker of counted) {
    if (inCustody(api, seeker.personId)) continue;
    // A seeker who died or moved away with their household is no one to hire.
    if (!c.people.has(seeker.personId) && !residentPerson(c, seeker.personId)) {
      store(api).table("countedSeekers").remove(seeker.personId);
      continue;
    }
    // The same reasons a full person weighs: pay against their reference,
    // the need for work, and every trait's lean toward applying or waiting.
    const person = { traits: traitsOf(api, seeker.personId) };
    const traitTerm =
      p("traitWeight") *
      (traitLean(c, person, jobsData.actions.apply.actKinds) -
        traitLean(c, person, jobsData.actions.wait.actKinds));
    const reference = seeker.referenceHourlyMinor;
    for (const position of byPlace.get(seeker.placeId) ?? [])
      if (
        p("jobsRateWeight") *
          (p("jobsApplyPayWeight") *
            (reference > 0 ? position.hourlyMinor / reference - 1 : 0) +
            (seeker.employed ? 0 : p("jobsUnemployedNeedWeight"))) +
          traitTerm >
        0
      )
        apply(position.id, seeker);
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
        Math.max(
          0,
          daysBetween(makeIsoDate(since), makeIsoDate(job.endsAt ?? c.date)),
        ) / p("jobsDaysPerYear");
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
            p("jobsFitReliabilityWeight") *
              (traitsOf(api, seeker.personId)[jobsData.traits.reliability] ??
                0) +
            // An official's word for them counts as one more reason, and
            // fades the longer ago it was given.
            p("jobsFitReferralWeight") *
              referralStanding(api, seeker.personId)),
        );
      return value;
    };
    const pick = (pool: readonly SeekerRow[]) => {
      let top = pool[0]!;
      for (const row of pool) {
        const gap = fit(row) - fit(top);
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
      const best = pick(pool);
      pool = pool.filter((row) => row !== best);
      let placed = false;
      if (isCounted(api, best.personId)) {
        // A counted seeker answers the offer by the same reasons a full person
        // weighs, every trait included.
        const person = { traits: traitsOf(api, best.personId) };
        // An employed worker measures the offer against the job they hold now, and moving costs something.
        const current = best.employed
          ? countedJobOfPerson(c, best.personId)?.hourlyMinor
          : undefined;
        const reference = current ?? best.referenceHourlyMinor;
        const accepts =
          acceptScore(
            p,
            position.hourlyMinor,
            reference,
            best.employed,
            p("traitWeight") *
              (traitLean(c, person, jobsData.actions.accept.actKinds) -
                traitLean(c, person, jobsData.actions.decline.actKinds)),
          ) > 0;
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
    const age = daysBetween(
      makeIsoDate(row.givenOn),
      makeIsoDate(api.state.date),
    );
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

function hireCounted(
  api: CoreAPI,
  position: PositionRow,
  seeker: SeekerRow,
  fit: number,
): boolean {
  if (inCustody(api, seeker.personId)) return false;
  const c = core(api);
  const template =
    c.jobs.get(position.templateJobId) ??
    residentsRuntime(c)?.jobs.get(position.templateJobId) ??
    countedJobsOf(c, position.organizationId)[0];
  if (!template) return false;
  const jobId = `job:${position.id}:${seeker.personId}`;
  const hours = template.hoursDaily;
  const job: JobInput = {
    id: jobId,
    personId: seeker.personId,
    organizationId: position.organizationId,
    title: position.title,
    occupationClassification: template.occupationClassification,
    hourlyMinor: position.hourlyMinor,
    hoursDaily: hours,
    wageDailyMinor: Math.round(position.hourlyMinor * hours),
    source: source(api, `A counted worker hired to ${position.id}.`),
  };
  const previous = seeker.employed
    ? countedJobOfPerson(c, seeker.personId)
    : undefined;
  if (previous?.organizationId === position.organizationId) return false;
  if (!addCountedJob(c, job, template.id)) return false;
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
      hourlyMinor: position.hourlyMinor,
      counted: 1,
    },
  });
  return true;
}

/**
 * Who among the counted acts this month, without dice: each one's pull is
 * the logistic of their reasons; as many act as the pulls add up to (the
 * remainder carries to next month), and the strongest pulls act.
 */
export function strongestPulls<T extends { id: string; score: number }>(
  api: CoreAPI,
  key: string,
  rows: readonly T[],
): T[] {
  stopgap("SG-WORLD-jobs-counted-choices");
  const state = store(api).table("state");
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

/** Counted workers 62 and over weigh retiring by the same reasons as full people, without the chooser (stopgap). */
function reviewCountedRetirements(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const rows: { id: string; job: JobInput; age: number; score: number }[] = [];
  for (const [organizationId] of c.finance.businesses) {
    for (const job of countedJobsOf(c, organizationId)) {
      // An owner retires through their business (the business module's closing choice), not off its payroll.
      if (ownerOf(api, organizationId) === job.personId) continue;
      const person = residentPerson(c, job.personId);
      if (!person) continue;
      const age =
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
        p("jobsDaysPerYear");
      const past = age - retirementOnsetYears(api);
      if (past <= 0) continue;
      rows.push({
        id: job.id,
        job,
        age,
        score:
          p("jobsRetireBaseline") +
          p("jobsRetireAgeWeight") * past +
          p("traitWeight") *
            traitLeanBetween(
              c,
              person,
              jobsData.actions.leave.actKinds,
              jobsData.actions.stay.actKinds,
            ),
      });
    }
  }
  for (const { job, age, score } of strongestPulls(api, "retire", rows)) {
    store(api).table("countedSeekers").remove(job.personId);
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
      values: { age, score, counted: 1 },
    });
  }
}

/** Counted workers weigh looking around by their pay against the going rate and their traits (stopgap). */
/**
 * Counted adults out of work and not looking start looking: young people as
 * they leave school (the pull rises from 18 to 25), and a few others coming
 * back to work. By summed pulls, as the other counted choices.
 */
function reviewCountedEntry(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    rt = residentsRuntime(c);
  if (!rt) return;
  const [young] = jobsData.workingAge as [number, number];
  const working = new Set<string>();
  for (const [jobId, flow] of rt.wageFlowByJob) {
    const job = rt.jobs.get(jobId);
    if (job && !job.endsAt && !flow.endedAt) working.add(job.personId);
  }
  const seekers = store(api).table("countedSeekers");
  const youthSpan = p("jobsCountedEntryYouthYears");
  const rows: { id: string; placeId: string; score: number }[] = [];
  const counted = rt.store;
  for (const h of counted.liveHouseholds())
    for (const m of counted.countedMembers(h)) {
      const personId = counted.ids[m]!;
      if (
        working.has(personId) ||
        seekers.get(personId) ||
        inCustody(api, personId)
      )
        continue;
      const placeId = counted.strings[counted.placeIx[m]!]!;
      const age =
        daysBetween(makeIsoDate(counted.born[m]!), makeIsoDate(c.date)) /
        p("jobsDaysPerYear");
      if (age < young || age >= p("jobsEarliestRetirementAge")) continue;
      // Youth pulls hardest as school ends, rising over the first years after 18.
      const youth = Math.max(0, Math.min(age - young, youthSpan)) / youthSpan;
      rows.push({
        id: personId,
        placeId,
        score:
          p("jobsCountedEntryBaseline") +
          p("jobsCountedEntryYouthWeight") *
            (age - young < youthSpan ? youth : 0) -
          p("jobsUnemploymentEntryWeight") * unemploymentGap(api, placeId),
      });
    }
  // Out of work and looking, some stop looking each month (to school, family or retirement).
  const leaving: { id: string; score: number }[] = [];
  for (const row of seekers.query("all", [true]) as unknown as SeekerRow[])
    if (!row.employed)
      leaving.push({
        id: row.personId,
        score:
          p("jobsCountedStopLookingBaseline") +
          p("jobsUnemploymentStopLookingWeight") *
            unemploymentGap(api, row.placeId),
      });
  for (const row of strongestPulls(api, "counted-stop-looking", leaving)) {
    seekers.remove(row.id);
    endClaim(api, store(api).table("claims"), row.id);
  }
  for (const row of strongestPulls(api, "counted-enter", rows))
    seekers.put({
      id: row.id,
      isSeeker: true,
      personId: row.id,
      placeId: row.placeId,
      employed: false,
      since: c.date,
      reasonKey: jobsData.reasons.startedLooking,
      referenceHourlyMinor: 0,
    });
}

/**
 * Counted workers who leave a job without another, each by their own
 * conditions: pay against the going rate for their role, tenure, the place's
 * unemployment and their traits (see `quitScore`). The pulls sum to how many
 * go this month and the strongest go; no industry rate decides it (the JOLTS
 * quit rate checks the total in a test). They look for work with no claim (a
 * quit doesn't qualify).
 */
function reviewCountedQuits(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const going = new Map<string, number>();
  for (const position of store(api)
    .table("positions")
    .query("byStatus", ["open"]) as unknown as PositionRow[])
    going.set(
      position.occupation,
      Math.max(going.get(position.occupation) ?? 0, position.hourlyMinor),
    );
  const seekers = store(api).table("countedSeekers");
  const rows: { id: string; job: JobInput; placeId: string; score: number }[] =
    [];
  for (const [organizationId, book] of c.finance.businesses) {
    if (book.closedAt) continue;
    for (const job of countedJobsOf(c, organizationId)) {
      if (inCustody(api, job.personId)) continue;
      if (ownerOf(api, organizationId) === job.personId) continue;
      const person = residentPerson(c, job.personId);
      const pay = job.hourlyMinor ?? 0;
      if (!person || pay <= 0) continue;
      const payGap = Math.max(0, (going.get(roleOf(job)) ?? pay) / pay - 1);
      rows.push({
        id: job.id,
        job,
        placeId: person.placeId,
        score: quitScore(p, {
          payGap,
          tenureYears: countedTenureYears(api, job),
          unemploymentGapPts: unemploymentGap(api, person.placeId),
          restless: traitLeanBetween(
            c,
            person,
            jobsData.actions.look.actKinds,
            jobsData.actions.stay.actKinds,
          ),
        }),
      });
    }
  }
  for (const { job, placeId } of strongestPulls(api, "counted-quit", rows)) {
    endCountedJob(c, job.id);
    record(api, {
      personId: job.personId,
      organizationId: job.organizationId,
      jobId: job.id,
      kind: "quit",
      reasonKey: jobsData.reasons.leftJob,
      decidedBy: job.personId,
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
    });
  }
}

function reviewCountedLooking(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const going = new Map<string, number>();
  for (const position of store(api)
    .table("positions")
    .query("byStatus", ["open"]) as unknown as PositionRow[])
    going.set(
      position.occupation,
      Math.max(going.get(position.occupation) ?? 0, position.hourlyMinor),
    );
  const seekers = store(api).table("countedSeekers");
  // A worker who looked a while without a better offer stops looking.
  for (const row of seekers.query("all", [true]) as unknown as SeekerRow[])
    if (
      row.employed &&
      daysBetween(makeIsoDate(row.since), makeIsoDate(c.date)) >
        p("jobsOnTheJobSearchMonths") *
          (p("jobsDaysPerYear") / p("macroMonthsPerYear"))
    )
      seekers.remove(row.id);
  const rows: { id: string; job: JobInput; placeId: string; score: number }[] =
    [];
  for (const [organizationId] of c.finance.businesses) {
    for (const job of countedJobsOf(c, organizationId)) {
      if (seekers.get(job.personId) || inCustody(api, job.personId)) continue;
      // An owner runs their own business; they don't look for a job elsewhere.
      if (ownerOf(api, organizationId) === job.personId) continue;
      const person = residentPerson(c, job.personId);
      const pay = job.hourlyMinor ?? 0;
      if (!person || pay <= 0) continue;
      const payGap = Math.max(
        0,
        (going.get(job.occupationClassification ?? job.title) ?? pay) / pay - 1,
      );
      // Every trait's lean toward looking around over staying put.
      const restless = traitLeanBetween(
        c,
        person,
        jobsData.actions.look.actKinds,
        jobsData.actions.stay.actKinds,
      );
      rows.push({
        id: job.id,
        job,
        placeId: person.placeId,
        score:
          p("jobsLookBaseline") +
          p("jobsPayGapWeight") * payGap -
          p("jobsUnemploymentLookWeight") *
            unemploymentGap(api, person.placeId) +
          p("traitWeight") * restless,
      });
    }
  }
  for (const { job, placeId } of strongestPulls(api, "look", rows))
    seekers.put({
      id: job.personId,
      isSeeker: true,
      personId: job.personId,
      placeId,
      employed: true,
      since: c.date,
      reasonKey: jobsData.reasons.lookingAround,
      referenceHourlyMinor: job.hourlyMinor ?? 0,
    });
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
      daysBetween(makeIsoDate(row.startsAt), makeIsoDate(end)) /
      api.parameter("jobsDaysPerYear");
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

/** Years a counted worker has held their job: from their hire here, else their opening work commitment. */
function countedTenureYears(api: CoreAPI, job: JobInput): number {
  const c = core(api),
    rt = residentsRuntime(c);
  const since =
    (store(api).table("pay").get(job.id) as { since?: string } | undefined)
      ?.since ??
    (rt ? countedRolesOf(rt).byJob.get(job.id)?.startsAt : undefined) ??
    api.state.startedAt;
  return (
    Math.max(0, daysBetween(makeIsoDate(since), makeIsoDate(c.date))) /
    api.parameter("jobsDaysPerYear")
  );
}

/**
 * A counted worker's pull to quit to nothing this month: the typical-tenure
 * baseline, less for a longer tenure and more for a shorter one, more for pay
 * below the going rate, less where the place's unemployment is above the
 * natural rate, and their traits' lean toward change. Sliding in each.
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
    p("traitWeight") * (reasons.restless ?? 0)
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

/** Stops registered for each pending offer, released when it is answered. */
const offerStops = new WeakMap<CoreState, Map<string, ModuleStopTokenV1[]>>();

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
    daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
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
 * The employer picked the person the player controls: it offers them the
 * job and holds the position until the deadline. The clock stops now so the
 * player sees the offer, and again on the deadline.
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
  const deadline = addDays(makeIsoDate(c.date), api.parameter("jobsOfferDays"));
  const row: JobOfferRow = {
    id,
    personId,
    positionId: position.id,
    organizationId: position.organizationId,
    title: position.title,
    hourlyMinor: position.hourlyMinor,
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
  if (!isExplicitlyControlledPersonV1(c, personId)) return;
  stopgap("SG-WORLD-jobs-offer-deadline-reminder");
  const stopSource = source(
    api,
    `${position.organizationId} offered ${position.title} at ${position.hourlyMinor} cents an hour (${id}).`,
  );
  const now = playerClockFrontierV1(c, personId) ?? {
    date: addDays(makeIsoDate(c.date), 1),
    minuteOfDay: 0,
  };
  offerStops.set(c, offerStops.get(c) ?? new Map());
  offerStops.get(c)!.set(id, [
    registerModuleStopV1(c, {
      moduleId: JOBS_MODULE_ID,
      recordId: `${id}:offered`,
      controlledPersonId: personId,
      at: now,
      kind: "interrupt",
      reasonKey: jobsData.reasons.offered,
      source: stopSource,
      hold: false,
    }),
    registerModuleStopV1(c, {
      moduleId: JOBS_MODULE_ID,
      recordId: `${id}:deadline`,
      controlledPersonId: personId,
      at: { date: deadline, minuteOfDay: 0 },
      // A reminder, not a hold: until the play screen can answer an offer
      // (OPUS-PLAY), a held deadline would stop the clock for good.
      // stopgapId: SG-WORLD-jobs-offer-deadline-reminder
      kind: "interrupt",
      reasonKey: jobsData.reasons.offered,
      source: stopSource,
      hold: false,
    }),
  ]);
}

/** Closes an offer: its stops released, its position free for others again. */
function settleOffer(
  api: CoreAPI,
  row: JobOfferRow,
  status: JobOfferRow["status"],
): void {
  const c = core(api);
  for (const token of offerStops.get(c)?.get(row.id) ?? []) {
    try {
      releaseModuleStopV1(c, token);
    } catch {
      // A one-shot interrupt the player already acknowledged is gone.
    }
  }
  offerStops.get(c)?.delete(row.id);
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
    occupationClassification: template.occupationClassification,
    hourlyMinor: position.hourlyMinor,
    hoursDaily,
    wageDailyMinor: Math.round(position.hourlyMinor * hoursDaily),
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
      endsAt: undefined,
      hourlyMinor: position.hourlyMinor,
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
  store(api).table("seekers").remove(person.id);
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
      hourlyMinor: position.hourlyMinor,
    },
  });
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
  ],
  onEvent(api, event) {
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
      if (!job.endsAt && !endCountedJob(core(api), job.id))
        rt!.jobs.set(job.id, { ...job, endsAt: api.state.date });
      const person = residentPerson(core(api), job.personId);
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
  store(api)
    .table("employers")
    .put({
      id: organizationId,
      isEmployer: true,
      openingStaff,
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
