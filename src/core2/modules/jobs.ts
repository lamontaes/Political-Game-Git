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
import { reviewUnions } from "../jobs-unions";
import { RETIREMENT_CLAIMS_MODULE_ID } from "./retirement-claims";
import { traitLean } from "../choice";
import { traitLeanBetween } from "../trait-decisions";
import { ownerOf } from "./business";
import { REGIONAL_MODULE_ID, regionalMonth } from "./regional";
import { LAWS_MODULE_ID, lawInForce } from "./laws";
import {
  residentPerson,
  residentsRuntime,
  syncCountedJobRecord,
} from "./residents";
import { MOVED_AWAY_EVENT } from "./moves";
import { endClaim, fileClaim, payClaims } from "../jobs-benefits";
import { meetAtWork } from "../encounters";
import {
  elsewhereTarget,
  fundFullElsewhere,
  placeElsewhere,
  unplacedWorkers,
} from "../jobs-elsewhere";
import {
  addCountedJob,
  addCountedRetiree,
  countedJobsOf,
  firstCountedJobOf,
  customerSalesByBusiness,
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

export const JOBS_MODULE_ID = "jobs";
export const JOBS_PARAMETERS = jobsParameters as unknown as Readonly<
  Record<string, Parameter>
>;
export const JOBS_DATA = jobsData;
const PULL = "jobs:pull";
const MONDAY = 1;
const DAYS_PER_WEEK = 7;

type Kind = keyof typeof jobsData.actions;
interface PositionRow {
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
  /** Its customers' spending a year when its staff was `openingStaff`, over the place's pay index then. */
  openingRealSalesMinor?: number;
  /** The staff its customers' spending called for at the last review. */
  target?: number;
  /** Fractional staffing need carried between reviews: positive hires, negative lays off. */
  need: number;
  /** A new business's template for its first roles. */
  templateFromId?: string;
  /** Work outside the town (the opening's unplaced residents): its staff follows the region's jobs. */
  elsewhere?: boolean;
  townPlaceId?: string;
  /** The staff mix at the opening: each role's head count and a job to copy for it. */
  mix?: Record<string, { count: number; templateJobId: string }>;
  /** Fraction of a posting's withdrawal carried to the next review. */
  withdrawCarry?: number;
  /** Jobs of workers who left (died, moved, quit, retired), oldest first, each to be replaced. */
  leavers?: { jobId: string; personId: string }[];
  /** The counted workers' jobs at the last review (job to worker), to find who left outside the jobs engine. */
  countedJobs?: Record<string, string>;
}

/** Every open workplace the jobs engine reviews, with its kind: the town's businesses and employers elsewhere ("*"). */
function workplaces(api: CoreAPI): Map<string, string> {
  const c = core(api);
  const out = new Map<string, string>();
  for (const [id, book] of c.finance.businesses)
    if (!book.closedAt) out.set(id, book.kindId);
  for (const row of store(api)
    .table("employers")
    .query("all", [true]) as unknown as EmployerRow[])
    if (row.elsewhere) out.set(row.id, "*");
  return out;
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

const pinnedByCore = new WeakMap<CoreState, Set<string>>();

/** Every job id a saved record names under `jobIds`, through nested JSON text. */
function collectJobIds(value: unknown, ids: Set<string>): void {
  if (typeof value === "string") {
    if (!value.includes("jobIds")) return;
    try {
      collectJobIds(JSON.parse(value), ids);
    } catch {
      return;
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectJobIds(item, ids);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "jobIds" && Array.isArray(item)) {
        for (const id of item) if (typeof id === "string") ids.add(id);
      } else collectJobIds(item, ids);
    }
  }
}

/**
 * Jobs that a saved agreement (a visitor's lodging, a public supplier
 * contract) names as its provider's qualification. The core rejects the
 * agreement's next payment once such a job ends, so jobs leaves them alone
 * until agreements re-resolve their qualifying worker.
 */
export function pinned(c: CoreState): Set<string> {
  let ids = pinnedByCore.get(c);
  if (ids) return ids;
  // An agreement's named jobs can end now: the core hands the agreement to the supplier's current staff. Jobs a government's records name stay.
  ids = new Set();
  for (const organization of c.organizations.values())
    collectJobIds(Object.values(organization.governmentFacts ?? {}), ids);
  pinnedByCore.set(c, ids);
  return ids;
}

/** An employer's staff: its full people's jobs and its counted workers' jobs. */
function currentJobs(api: CoreAPI, organizationId: string) {
  return [
    ...fullJobs(api, organizationId),
    ...countedJobsOf(core(api), organizationId),
  ];
}

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

const NO_TRAITS = { traits: {} };
/** The person's own record, so the chooser's per-person trait leans are worked out once. */
function actorOf(
  api: CoreAPI,
  personId: string,
): { traits: Readonly<Record<string, number>> } {
  return (
    core(api).people.get(personId) ??
    residentPerson(core(api), personId) ??
    NO_TRAITS
  );
}

function isCounted(api: CoreAPI, personId: string): boolean {
  return !core(api).people.has(personId);
}

function definition(kind: Kind): ActionDefinition {
  const row = jobsData.actions[kind];
  return {
    id: row.id,
    actKinds: row.actKinds,
    goalKinds: [],
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
  },
): void {
  // A worker who leaves (a quit, retirement, move or death) is replaced: the employer's need grows by one at once.
  if (row.kind === "quit" || row.kind === "left-work")
    noteLeaver(api, row.organizationId, row.jobId, row.personId);
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
 * Someone left an employer's staff: its need grows by one at once, and the
 * leaver's job waits to be replaced in the same role (owner, Oct 14: every
 * role is refilled when its holder dies, leaves or is removed).
 */
function noteLeaver(
  api: CoreAPI,
  organizationId: string,
  jobId: string,
  personId: string,
): void {
  const employer = store(api).table("employers").get(organizationId) as
    EmployerRow | undefined;
  if (!employer) return;
  store(api)
    .table("employers")
    .put({
      ...employer,
      need: employer.need + 1,
      leavers: [...(employer.leavers ?? []), { jobId, personId }],
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
      if (!ownEnd) noteLeaver(api, row.id, id, row.countedJobs![id]!);
    }
    const fresh = (employers.get(row.id) as unknown as EmployerRow) ?? row;
    employers.put({ ...fresh, countedJobs: now });
  }
}

function startSeeking(
  api: CoreAPI,
  personId: string,
  employed: boolean,
  reasonKey: string,
  referenceHourlyMinor: number,
): void {
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
function openCountedSeekers(
  api: CoreAPI,
  unemploymentPct: number,
  elsewhere?: { placeId: string; count: number },
): void {
  const c = core(api),
    rt = residentsRuntime(c);
  if (!rt) return;
  stopgap("SG-WORLD-jobs-opening-seekers");
  const [young, old] = jobsData.workingAge as [number, number];
  const working = new Set(
    [...rt.wageFlowByJob.keys()].map((id) => rt.jobs.get(id)?.personId),
  );
  // Each place's own unemployed, against the workers who live there (and those it sends to work elsewhere).
  const workersByPlace = new Map<string, number>();
  if (elsewhere) workersByPlace.set(elsewhere.placeId, elsewhere.count);
  const candidates = new Map<
    string,
    { personId: string; placeId: string; share: number }[]
  >();
  for (const record of rt.households.values()) {
    const placeId = record.household.placeId;
    for (const person of record.people)
      if (working.has(person.id))
        workersByPlace.set(placeId, (workersByPlace.get(placeId) ?? 0) + 1);
    const adults = record.people.filter((person) => {
      const age =
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
        api.parameter("jobsDaysPerYear");
      return age >= young && age < old;
    });
    if (!adults.length) continue;
    const share =
      adults.filter((person) => working.has(person.id)).length / adults.length;
    const list = candidates.get(placeId) ?? [];
    for (const person of adults)
      if (!working.has(person.id))
        list.push({ personId: person.id, placeId: person.placeId, share });
    candidates.set(placeId, list);
  }
  for (const [placeId, list] of [...candidates].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const count = Math.round(
      ((workersByPlace.get(placeId) ?? 0) * unemploymentPct) /
        (api.parameter("macroHundred") - unemploymentPct),
    );
    list
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
}

/** The place's pay index against the opening (the macro's wage price factor), 1 without one. */
function payIndex(c: CoreState, placeId: string | undefined): number {
  if (!placeId) return 1;
  return (
    (c.finance.conditionsByPlace.get(placeId) ?? [])
      .filter((row) => row.at <= c.date)
      .at(-1)?.wagePriceFactor ?? 1
  );
}

/** Each business's customers' spending a year today, over its place's pay index: what its staff can be paid to serve. */
function realSales(c: CoreState): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, row] of customerSalesByBusiness(c))
    out.set(id, row.allMinor / payIndex(c, c.organizations.get(id)?.placeId));
  return out;
}

/** A job's role: its occupation, or its title where it has none. */
const roleOf = (job: Pick<JobInput, "occupationClassification" | "title">) =>
  job.occupationClassification ?? job.title;

/** An employer's staff mix: each role's head count and a job to copy for it (a full worker's, which carries a schedule and payday, before a counted one). */
export function roleMix(
  jobs: readonly JobInput[],
  full: readonly JobInput[] = [],
): Record<string, { count: number; templateJobId: string }> {
  const fullIds = new Set(full.map((job) => job.id));
  const mix: Record<string, { count: number; templateJobId: string }> = {};
  for (const job of [...jobs].sort((a, b) => a.id.localeCompare(b.id))) {
    const role = roleOf(job),
      row = mix[role];
    if (!row) mix[role] = { count: 1, templateJobId: job.id };
    else {
      row.count += 1;
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
): string[] {
  const total = Object.values(mix).reduce((sum, row) => sum + row.count, 0);
  const held = Object.values(have).reduce((sum, n) => sum + n, 0);
  if (!total) return [];
  return Object.keys(mix)
    .map((role) => ({
      role,
      deficit: (mix[role]!.count / total) * (held + 1) - (have[role] ?? 0),
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
  const sales = realSales(c);
  for (const [id, book] of c.finance.businesses)
    if (!book.closedAt)
      store(api)
        .table("employers")
        .put({
          id,
          isEmployer: true,
          openingStaff: currentJobs(api, id).length,
          ...(sales.get(id) ? { openingRealSalesMinor: sales.get(id) } : {}),
          need: 0,
          mix: roleMix(currentJobs(api, id), fullJobs(api, id)),
        });
  // The opening's unemployment: the region's or the nation's when the economy runs; the long-run rate otherwise.
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
  // Where the regional economy runs, the town's region's rate: the place with the most businesses.
  const placeCounts = new Map<string, number>();
  for (const id of c.finance.businesses.keys()) {
    const placeId = c.organizations.get(id)?.placeId;
    if (placeId) placeCounts.set(placeId, (placeCounts.get(placeId) ?? 0) + 1);
  }
  const town = [...placeCounts].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0]?.[0];
  const region =
    macro && town && c.modules.has(REGIONAL_MODULE_ID)
      ? regionalMonth(api, town, macro.latestMonth)
      : undefined;
  const opening =
    region?.unemploymentPct ??
    nation?.unemploymentPct ??
    api.parameter("macroNaturalUnemploymentPct");
  // The opening's unemployed first, against a labor force that includes the residents working elsewhere.
  openCountedSeekers(api, opening, unplacedWorkers(api));
  openSeekers(api, opening);
  // Then the residents the opening couldn't place get jobs elsewhere, from the jobless who aren't looking.
  const working = new Set<string>();
  const rt0 = residentsRuntime(c);
  for (const [jobId, flow] of rt0?.wageFlowByJob ?? []) {
    const job = rt0!.jobs.get(jobId);
    if (job && job.endsAt === undefined && !flow.endedAt)
      working.add(job.personId);
  }
  const looking = store(api).table("countedSeekers"),
    lookingFull = store(api).table("seekers");
  const elsewhere = placeElsewhere(
    api,
    (id) => !working.has(id) && !looking.get(id) && !lookingFull.get(id),
  );
  if (elsewhere)
    store(api).table("employers").put({
      id: elsewhere.organizationId,
      isEmployer: true,
      openingStaff: elsewhere.staff,
      need: 0,
      elsewhere: true,
      townPlaceId: elsewhere.placeId,
    });
  if (elsewhere?.fullOrganizationId)
    store(api)
      .table("employers")
      .put({
        id: elsewhere.fullOrganizationId,
        isEmployer: true,
        openingStaff: elsewhere.fullStaff ?? 0,
        need: 0,
        elsewhere: true,
        townPlaceId: elsewhere.placeId,
      });
  store(api).table("state").put({ id: "jobs:state", openedAt: c.date });
  // Where each place's people work at the opening: the places a seeker can look for work.
  const links: Record<string, string[]> = {};
  const link = (personPlace: string | undefined, organizationId: string) => {
    const workPlace = c.organizations.get(organizationId)?.placeId;
    if (!personPlace || !workPlace || personPlace === workPlace) return;
    const list = (links[personPlace] ??= []);
    if (!list.includes(workPlace)) list.push(workPlace);
  };
  for (const job of c.jobs.values())
    if (job.endsAt === undefined)
      link(c.people.get(job.personId)?.placeId, job.organizationId);
  for (const [organizationId] of c.finance.businesses)
    for (const job of countedJobsOf(c, organizationId))
      link(residentPerson(c, job.personId)?.placeId, organizationId);
  // Work elsewhere too: a place whose people hold jobs outside the town looks for work where those jobs are recorded.
  if (elsewhere)
    for (const job of countedJobsOf(c, elsewhere.organizationId))
      link(residentPerson(c, job.personId)?.placeId, elsewhere.organizationId);
  for (const list of Object.values(links)) list.sort();
  store(api).table("state").put({ id: "jobs:commutes", links });
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

function reviewEmployers(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const opened =
    (
      store(api).table("state").get("jobs:state") as
        { openedAt?: string } | undefined
    )?.openedAt ?? c.date;
  const sales = realSales(c);
  for (const row of store(api)
    .table("employers")
    .query("all", [true]) as unknown as EmployerRow[]) {
    const book = c.finance.businesses.get(row.id);
    if (!row.elsewhere && (!book || book.closedAt)) continue;
    const kindId = book?.kindId ?? "*";
    const jobs = currentJobs(api, row.id),
      positions = [...openPositions(api, row.id)];
    if (!jobs.length && !positions.length && !row.templateFromId) continue;
    // A business that joined mid-run measures against its first month of sales.
    const openingSales = row.openingRealSalesMinor ?? sales.get(row.id);
    const target =
      (!book
        ? // Work elsewhere follows the region's jobs since the opening.
          elsewhereTarget(api, row.townPlaceId ?? "", row.openingStaff)
        : openingSales
          ? // What its customers spend now against the opening, over pay: the work they bring.
            (row.openingStaff * (sales.get(row.id) ?? 0)) / openingSales
          : book.capacityMinor > 0
            ? // No customers' flows: the books' demand in the business's own opening prices.
              (row.openingStaff * book.annualDemandMinor) /
              ((book.price / book.anchorPrice || 1) * book.capacityMinor)
            : row.openingStaff) *
      // The season: the industry's staffing this month against the opening's (BLS CES seasonal factors).
      seasonalStaffing(kindId, c.date, opened);
    // Hiring leans on the cash in reach of a few months of payroll; a gap below staff needs no cash to act on. Pay elsewhere comes from outside.
    const monthlyPayroll = book
      ? book.annualPayrollMinor / p("macroMonthsPerYear")
      : 0;
    const cash = c.organizations.get(row.id)?.liquidMinor ?? 0;
    const reach = book
      ? cash / (cash + p("jobsCashCoverMonths") * monthlyPayroll || 1)
      : 1;
    // Staff and postings beyond the target lapse gradually: each position of surplus withdraws a share of a posting a month, the rest carried.
    const excess = Math.max(
      0,
      Math.min(positions.length, jobs.length + positions.length - target),
    );
    let carry =
      excess > 0
        ? (row.withdrawCarry ?? 0) + p("jobsWithdrawActedPerMonth") * excess
        : 0;
    while (carry >= 1 && positions.length) {
      const position = positions.pop()!;
      store(api)
        .table("positions")
        .put({ ...position, status: "withdrawn" });
      carry -= 1;
    }
    if (!positions.length || excess === 0) carry = 0;
    const gap = target - jobs.length - positions.length;
    // Replacements for leavers count only while staff is below target; above it, attrition does the shrinking.
    let need =
      (gap > 0 ? row.need : Math.min(row.need, 0)) +
      p("jobsStaffGapActedPerMonth") * (gap > 0 ? gap * reach : gap);
    // A new business's first roles come from its template business.
    const from =
      jobs.length || !row.templateFromId ? row.id : row.templateFromId;
    const fromJobs = from === row.id ? jobs : currentJobs(api, from);
    // With no role to copy, a business can't open positions; its need waits, never past its gap.
    if (!fromJobs.length && need > 0) need = Math.min(need, Math.max(0, gap));
    // The roles the staff is made of (cooks and servers alike, counted workers included), and what the employer holds of each now.
    const mix = row.mix ?? roleMix(fromJobs, fullJobs(api, from));
    const have: Record<string, number> = {};
    for (const job of jobs) have[roleOf(job)] = (have[roleOf(job)] ?? 0) + 1;
    for (const position of positions)
      have[position.occupation] = (have[position.occupation] ?? 0) + 1;
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
    while (need >= 1 && fromJobs.length) {
      // A leaver's role is refilled first, as that role; then the role furthest below the mix.
      const replaces = leavers.shift();
      const left = replaces ? jobById(api, replaces.jobId) : undefined;
      const role =
        left && copyable(roleOf(left))
          ? roleOf(left)
          : rolesByDeficit(mix, have).find((r) => copyable(r));
      const template = role ? copyable(role) : undefined;
      if (!template) {
        if (replaces) leavers.unshift(replaces);
        break;
      }
      have[roleOf(template)] = (have[roleOf(template)] ?? 0) + 1;
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
      need -= 1;
    }
    while (need <= -1) {
      if (positions.length) {
        const position = positions.pop()!;
        store(api)
          .table("positions")
          .put({ ...position, status: "withdrawn" });
      } else {
        const staff = currentJobs(api, row.id);
        if (!staff.length) break;
        layOff(api, row.id, staff, {
          target,
          demand: book?.annualDemandMinor ?? 0,
          capacity: book?.capacityMinor ?? 0,
        });
      }
      need += 1;
    }
    // Leavers not refilled this month wait while staff is below target; above it, attrition does the shrinking.
    store(api)
      .table("employers")
      .put({
        ...row,
        need,
        // Without the season: what its customers call for over the year.
        target: target / seasonalStaffing(kindId, c.date, opened),
        ...(openingSales ? { openingRealSalesMinor: openingSales } : {}),
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
  return Math.max(market, wageFloor(api));
}

/** The minimum wage in force for the town, in cents an hour (0 where none is recorded). */
function wageFloor(api: CoreAPI): number {
  if (!core(api).modules.has(LAWS_MODULE_ID)) return api.parameter("zero");
  return lawInForce(api, "minimum-wage").value ?? api.parameter("zero");
}

function tenureYears(api: CoreAPI, job: JobInput): number {
  const commitment = [
    ...(core(api).work.commitmentsByPerson.get(job.personId) ?? []),
  ]
    .map((id) => core(api).work.commitments.get(id)!)
    .find((row) => row.jobId === job.id);
  const started = api.state.startedAt,
    since =
      commitment?.startsAt ??
      (job.source.asOf > started ? job.source.asOf : started);
  const years =
    daysBetween(makeIsoDate(since), makeIsoDate(api.state.date)) /
    api.parameter("jobsDaysPerYear");
  if (since > started) return years;
  // A job held at the opening was held for years before it: the median for the worker's age then (BLS Employee Tenure).
  const person =
    core(api).people.get(job.personId) ??
    residentPerson(core(api), job.personId);
  if (!person) return years;
  const age =
    daysBetween(makeIsoDate(person.birthDate), makeIsoDate(started)) /
    api.parameter("jobsDaysPerYear");
  const band = jobsData.tenureByAge.bands.find(
    (row) =>
      age >= row.minAge &&
      (row.maxAgeExclusive === null || age < row.maxAgeExclusive),
  );
  const workingYears = Math.max(0, age - jobsData.workingAge[0]!);
  return years + Math.min(band?.medianYears ?? 0, workingYears);
}

/** The pay a worker gives up by moving: their pay with what their years at the employer have added (job-specific skill). */
function tenuredPay(api: CoreAPI, job: JobInput): number {
  const p = (key: string) => api.parameter(key);
  return (
    (job.hourlyMinor ?? 0) *
    (p("one") +
      p("jobsTenureReturnPerYear") *
        Math.min(tenureYears(api, job), p("jobsTenureReturnYearsCap")))
  );
}

/** The business decides who goes: the worker whose tenure and record it values least. */
function layOff(
  api: CoreAPI,
  organizationId: string,
  staff: readonly JobInput[],
  values: Readonly<Record<string, number>>,
): void {
  const c = core(api),
    reliability = jobsData.traits.reliability;
  const keep = (job: JobInput) =>
    api.parameter("jobsKeepTenureWeight") * tenureYears(api, job) +
    api.parameter("jobsFitReliabilityWeight") *
      (traitsOf(api, job.personId)[reliability] ?? 0);
  const job = [...staff]
    .filter((row) => !pinned(c).has(row.id))
    .sort((a, b) => keep(a) - keep(b) || a.id.localeCompare(b.id))[0];
  if (!job) return;
  letGo(api, organizationId, job, jobsData.reasons.layoff, {
    ...values,
    keepScore: keep(job),
  });
}

/** The business ends a worker's job for `reasonKey`: their record, the event, their claim and their search. */
function letGo(
  api: CoreAPI,
  organizationId: string,
  job: JobInput,
  reasonKey: string,
  values: Readonly<Record<string, number>>,
): void {
  const c = core(api);
  const counted = isCounted(api, job.personId);
  const weeksWorked =
    (tenureYears(api, job) * api.parameter("jobsDaysPerYear")) / DAYS_PER_WEEK;
  if (counted) endCountedJob(c, job.id);
  else api.endJob(job.id, `jobs:layoff:${api.state.date}`);
  // The owner decides; a business without a recorded owner decides as itself.
  const decidedBy = ownerOf(api, organizationId);
  if (!decidedBy) stopgap("SG-WORLD-jobs-layoff-decider");
  record(api, {
    personId: job.personId,
    organizationId,
    jobId: job.id,
    kind: "layoff",
    reasonKey,
    decidedBy: decidedBy ?? organizationId,
    values: { ...values },
  });
  api.emit({
    id: `event:work.job-lost:${api.state.date}:${job.id}`,
    date: api.state.date,
    kind: "work.job-lost",
    // A counted worker is not a full person; the change row names them until fill-in.
    personIds: counted ? [] : [job.personId],
    placeId: (c.people.get(job.personId) ?? residentPerson(c, job.personId))!
      .placeId,
    source: source(
      api,
      reasonKey === jobsData.reasons.layoff
        ? "A layoff decided from the business's books."
        : "A worker let go for their record at the job.",
    ),
    publicRecord: false,
    topic: organizationId,
  });
  // Laid off through no choice of their own: a claim under the state's program.
  fileClaim(api, store(api).table("claims"), job, reasonKey, weeksWorked);
  if (counted)
    store(api)
      .table("countedSeekers")
      .put({
        id: job.personId,
        isSeeker: true,
        personId: job.personId,
        placeId: residentPerson(c, job.personId)!.placeId,
        since: api.state.date,
        reasonKey,
        referenceHourlyMinor: job.hourlyMinor ?? 0,
        lastJob: { ...job },
      });
  else startSeeking(api, job.personId, false, reasonKey, job.hourlyMinor ?? 0);
}

/** How much more often its industry turns over than the nation's (JOLTS 2001-2019 means), as a log ratio. */
function industryLean(kindId: string, measure: "layoffs" | "quits"): number {
  const industries = jobsData.turnover.industries as Record<
    string,
    Record<string, { mean: number }>
  >;
  const sector =
    (jobsData.kindSector as Record<string, string>)[kindId] ??
    jobsData.kindSector["*"];
  const own = industries[sector!]?.[measure]?.mean,
    total = industries.total![measure]!.mean;
  return own && total ? Math.log(own / total) : 0;
}

/**
 * Each month an employer weighs letting go each worker whose record at the
 * job is weak: the less reliable and the newer to the job, the stronger the
 * pull, more so in industries that turn over more (JOLTS layoffs). The role
 * stays: the business hires to replace them.
 */
function reviewMatches(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    reliability = jobsData.traits.reliability;
  const places = workplaces(api);
  const rows: {
    id: string;
    organizationId: string;
    job: JobInput;
    score: number;
  }[] = [];
  for (const employer of store(api)
    .table("employers")
    .query("all", [true]) as unknown as EmployerRow[]) {
    const kindId = places.get(employer.id);
    if (kindId === undefined) continue;
    const owner = ownerOf(api, employer.id);
    for (const job of currentJobs(api, employer.id)) {
      if (pinned(c).has(job.id) || job.personId === owner) continue;
      // A worker gone from the world (moved away, died) has no record left to weigh.
      if (!c.people.has(job.personId) && !residentPerson(c, job.personId))
        continue;
      rows.push({
        id: job.id,
        organizationId: employer.id,
        job,
        score:
          p("jobsLetGoBaseline") +
          industryLean(kindId, "layoffs") -
          p("jobsLetGoReliabilityWeight") *
            (traitsOf(api, job.personId)[reliability] ?? 0) -
          p("jobsLetGoTenureWeight") * Math.log1p(tenureYears(api, job)),
      });
    }
  }
  for (const row of strongestPullsBy(
    api,
    "let-go",
    rows,
    (row) => row.organizationId,
  )) {
    letGo(api, row.organizationId, row.job, jobsData.reasons.letGo, {
      pull: row.score,
    });
    const employer = store(api).table("employers").get(row.organizationId) as
      EmployerRow | undefined;
    if (employer)
      store(api)
        .table("employers")
        .put({ ...employer, need: employer.need + 1 });
  }
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
    if (job.endsAt !== undefined || pinned(c).has(job.id)) continue;
    const person = c.people.get(job.personId);
    if (!person || !person.alive || store(api).table("seekers").get(person.id))
      continue;
    const pay = tenuredPay(api, job);
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
    const pastRetirementAge = Math.max(0, age - p("jobsEarliestRetirementAge"));
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
      if (ownerOf(api, job.organizationId) !== person.id)
        startSeeking(api, person.id, true, "looking-around", pay);
    } else if (chosen === jobsData.actions.leave.id) {
      const retiring = result.selected!.targetId.startsWith("retire:");
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
/** Each counted seeker's trait lean toward applying over waiting, and toward accepting an offer over declining it, by person (a counted person's traits don't change). */
const applyLeans = new WeakMap<CoreState, Map<string, number>>();
const acceptLeans = new WeakMap<CoreState, Map<string, number>>();

function runWeek(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const positions = (
    store(api)
      .table("positions")
      .query("byStatus", ["open"]) as unknown as PositionRow[]
  ).filter(
    // A closed business's openings went with it.
    (row) => !c.finance.businesses.get(row.organizationId)?.closedAt,
  );
  if (!positions.length) return;
  const inPlace = new Map<string, PositionRow[]>();
  for (const row of positions) {
    const list = inPlace.get(row.placeId);
    if (list) list.push(row);
    else inPlace.set(row.placeId, [row]);
  }
  // A seeker looks at home and wherever their place's people commute to work.
  const commutes =
    (
      store(api).table("state").get("jobs:commutes") as
        { links: Record<string, string[]> } | undefined
    )?.links ?? {};
  const reach = new Map<string, PositionRow[]>();
  const byPlace = {
    get(placeId: string): PositionRow[] | undefined {
      let list = reach.get(placeId);
      if (!list) {
        list = [placeId, ...(commutes[placeId] ?? [])].flatMap(
          (id) => inPlace.get(id) ?? [],
        );
        reach.set(placeId, list);
      }
      return list.length ? list : undefined;
    },
  };
  const applications = new Map<string, SeekerRow[]>();
  const apply = (positionId: string, seeker: SeekerRow) => {
    const list = applications.get(positionId);
    if (list) list.push(seeker);
    else applications.set(positionId, [seeker]);
  };
  for (const seeker of store(api)
    .table("seekers")
    .query("all", [true]) as unknown as SeekerRow[]) {
    const nearby = byPlace.get(seeker.placeId);
    const person = c.people.get(seeker.personId);
    if (!nearby || !person || !person.alive) continue;
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
  // Counted seekers apply to every opening in their place; they decide nothing through the chooser until filled in (stopgap).
  const counted = (
    store(api)
      .table("countedSeekers")
      .query("all", [true]) as unknown as SeekerRow[]
  ).filter((seeker) => {
    // A seeker who has moved away or died is no longer looking here.
    if (residentPerson(c, seeker.personId) || c.people.has(seeker.personId))
      return true;
    store(api).table("countedSeekers").remove(seeker.personId);
    return false;
  });
  if (counted.length) stopgap("SG-WORLD-jobs-counted-choices");
  const rateWeight = p("jobsRateWeight"),
    payWeight = p("jobsApplyPayWeight"),
    switchCost = p("jobsSwitchCost"),
    needWeight = p("jobsUnemployedNeedWeight"),
    traitWeight = p("traitWeight");
  // Each counted seeker's reasons, worked out once; they apply to every opening within reach that clears them.
  type Applier = {
    seeker: SeekerRow;
    reference: number;
    standing: number;
    traitTerm: number;
  };
  const applies = (row: Applier, hourlyMinor: number) =>
    rateWeight *
      (payWeight * (row.reference > 0 ? hourlyMinor / row.reference - 1 : 0) +
        row.standing) +
      row.traitTerm >
    0;
  // Who can reach each place's openings: its own seekers and those who commute there.
  const reaching = new Map<string, Applier[]>();
  for (const seeker of counted) {
    // The same reasons a full person weighs: pay against their reference,
    // the need for work, and every trait's lean toward applying or waiting.
    // A counted person's traits don't change, so their lean is worked out once.
    let leans = applyLeans.get(c);
    if (!leans) applyLeans.set(c, (leans = new Map()));
    let lean = leans.get(seeker.personId);
    if (lean === undefined) {
      const person = actorOf(api, seeker.personId);
      lean =
        traitLean(c, person, jobsData.actions.apply.actKinds) -
        traitLean(c, person, jobsData.actions.wait.actKinds);
      leans.set(seeker.personId, lean);
    }
    const row: Applier = {
      seeker,
      reference: seeker.referenceHourlyMinor,
      // Someone with a job gives up what they have to move: it takes a raise.
      standing: seeker.employed ? -switchCost : needWeight,
      traitTerm: traitWeight * lean,
    };
    for (const placeId of new Set([
      seeker.placeId,
      ...(commutes[seeker.placeId] ?? []),
    ])) {
      if (!inPlace.has(placeId)) continue;
      const list = reaching.get(placeId);
      if (list) list.push(row);
      else reaching.set(placeId, [row]);
    }
  }
  // Matching takes time (Petrongolo and Pissarides 2001): each place fills no
  // more of its openings with counted applicants this week than its matching
  // function gives, efficiency x applicants^(1-a) x openings^a; the fraction
  // left carries to next week.
  // Who is counted, once a week.
  const countedNow = new Map<string, boolean>();
  const counts = (personId: string) => {
    let value = countedNow.get(personId);
    if (value === undefined)
      countedNow.set(personId, (value = isCounted(api, personId)));
    return value;
  };
  // A place's counted applicants: those within reach whom one of its openings clears (the rule is linear in pay, so the best- or worst-paid one decides).
  const applicantsAt = new Map<string, Set<string>>();
  for (const [placeId, open] of inPlace) {
    let low = Number.POSITIVE_INFINITY,
      high = Number.NEGATIVE_INFINITY;
    for (const position of open) {
      low = Math.min(low, position.hourlyMinor);
      high = Math.max(high, position.hourlyMinor);
    }
    const set = new Set<string>();
    for (const row of reaching.get(placeId) ?? [])
      if (
        counts(row.seeker.personId) &&
        (applies(row, high) || applies(row, low))
      )
        set.add(row.seeker.personId);
    if (set.size) applicantsAt.set(placeId, set);
  }
  const vacancyShare = p("jobsMatchingVacancyElasticity");
  const weekOfMonth =
    DAYS_PER_WEEK / (p("jobsDaysPerYear") / p("macroMonthsPerYear"));
  const matchesLeft = new Map<string, number>();
  for (const [placeId, open] of inPlace) {
    const carry =
      (
        store(api).table("state").get(`matches:${placeId}`) as
          { carry: number } | undefined
      )?.carry ?? 0;
    const applicants = applicantsAt.get(placeId)?.size ?? 0;
    matchesLeft.set(
      placeId,
      carry +
        p("jobsMatchingEfficiencyPerMonth") *
          weekOfMonth *
          applicants ** (1 - vacancyShare) *
          open.length ** vacancyShare,
    );
  }
  // Each seeker's fit for an occupation, worked out once a week.
  const hired = new Set<string>();
  const fitWeights = {
    experience: p("jobsFitExperienceWeight"),
    reliability: p("jobsFitReliabilityWeight"),
  };
  const fitsBy = new Map<string, Map<string, number>>();
  const sortedReach = new Map<string, Applier[]>();
  const hiredPast = new Map<Applier[], number>();
  const acceptTerms = {
    rate: p("jobsRateWeight"),
    baseline: p("jobsAcceptBaseline"),
    pay: p("jobsApplyPayWeight"),
    switchCost: p("jobsSwitchCost"),
    need: p("jobsUnemployedNeedWeight"),
    trait: p("traitWeight"),
  };
  for (const position of positions) {
    // A full person can take only a role whose schedule is on record.
    const fullRole = roleTemplate(c, position) !== undefined;
    const full = (applications.get(position.id) ?? []).filter(
      (row) => !hired.has(row.personId) && (fullRole || counts(row.personId)),
    );
    // With no match left in this place and no full applicant, nobody can be hired here this week.
    if (!full.length && (matchesLeft.get(position.placeId) ?? 0) < 1) continue;
    let byPerson = fitsBy.get(position.occupation);
    if (!byPerson) fitsBy.set(position.occupation, (byPerson = new Map()));
    const fits = byPerson;
    const fit = (seeker: SeekerRow) => {
      let value = fits.get(seeker.personId);
      if (value === undefined)
        fits.set(
          seeker.personId,
          (value =
            fitWeights.experience *
              experienceYears(api, seeker.personId, position.occupation) +
            fitWeights.reliability *
              (traitsOf(api, seeker.personId)[jobsData.traits.reliability] ??
                0)),
        );
      return value;
    };
    // The best fit first; ties to the earlier id.
    const before = (a: SeekerRow, b: SeekerRow) => {
      const gap = fit(a) - fit(b);
      // Ids are plain ASCII, so code-unit order (much faster than a locale compare) decides ties.
      return gap !== 0 ? gap > 0 : a.id < b.id;
    };
    const order = (a: SeekerRow, b: SeekerRow) =>
      before(a, b) ? -1 : before(b, a) ? 1 : 0;
    // The counted within reach in fit order, sorted once a week for each place and occupation.
    const key = `${position.placeId}|${position.occupation}`;
    let sorted = sortedReach.get(key);
    if (!sorted) {
      sorted = [...(reaching.get(position.placeId) ?? [])].sort((a, b) =>
        order(a.seeker, b.seeker),
      );
      sortedReach.set(key, sorted);
    }
    const fullSorted = [...full].sort(order);
    // The applicants in fit order: the full and the counted this opening's pay clears, not yet hired.
    // Those hired this week stay hired: the front of the list past them is kept.
    let first = hiredPast.get(sorted) ?? 0;
    while (first < sorted.length && hired.has(sorted[first]!.seeker.personId))
      first += 1;
    hiredPast.set(sorted, first);
    const list = sorted;
    let i = first,
      j = 0;
    const nextApplicant = (): SeekerRow | undefined => {
      while (i < list.length) {
        const row = list[i]!;
        if (
          !hired.has(row.seeker.personId) &&
          (fullRole || counts(row.seeker.personId)) &&
          applies(row, position.hourlyMinor)
        )
          break;
        i += 1;
      }
      const counted = list[i]?.seeker,
        person = fullSorted[j];
      if (counted && (!person || before(counted, person))) {
        i += 1;
        return counted;
      }
      if (person) j += 1;
      return person;
    };
    let best = nextApplicant();
    if (!best) continue;
    // A counted applicant who can't be placed gives way to the next best.
    let settled = false;
    while (counts(best.personId)) {
      // No match left in this place this week: its counted applicants wait.
      if ((matchesLeft.get(position.placeId) ?? 0) < 1) {
        settled = true;
        break;
      }
      // A counted seeker answers the offer by the same reasons a full person
      // weighs, every trait included.
      let acceptLeansNow = acceptLeans.get(c);
      if (!acceptLeansNow) acceptLeans.set(c, (acceptLeansNow = new Map()));
      let lean = acceptLeansNow.get(best.personId);
      if (lean === undefined) {
        const person = actorOf(api, best.personId);
        lean =
          traitLean(c, person, jobsData.actions.accept.actKinds) -
          traitLean(c, person, jobsData.actions.decline.actKinds);
        acceptLeansNow.set(best.personId, lean);
      }
      const reference = best.referenceHourlyMinor;
      const accepts =
        acceptTerms.rate *
          (acceptTerms.baseline +
            acceptTerms.pay *
              (reference > 0 ? position.hourlyMinor / reference - 1 : 0) +
            (best.employed ? acceptTerms.switchCost : acceptTerms.need)) +
          acceptTerms.trait * lean >
        0;
      if (accepts && hireCounted(api, position, best, fit(best))) {
        matchesLeft.set(
          position.placeId,
          (matchesLeft.get(position.placeId) ?? 0) - 1,
        );
        // Hired: no longer among anyone's applicants.
        hired.add(best.personId);
        settled = true;
        break;
      }
      const following = nextApplicant();
      if (!following) {
        settled = true;
        break;
      }
      best = following;
    }
    if (settled) continue;
    const held = best.employed
      ? c.jobs.get(c.people.get(best.personId)?.jobId ?? "")
      : undefined;
    // An employed worker measures the offer against the job they hold now, with what its years have added.
    const reference = held ? tenuredPay(api, held) : best.referenceHourlyMinor;
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
    if (answer.selected!.definition.id !== jobsData.actions.accept.id) continue;
    hire(api, position, best, fit(best));
    hired.add(best.personId);
  }
  // What's left of each place's matches carries to next week, never more than one.
  for (const [placeId, left] of matchesLeft)
    store(api)
      .table("state")
      .put({ id: `matches:${placeId}`, carry: Math.max(0, Math.min(1, left)) });
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
  const c = core(api);
  const template =
    c.jobs.get(position.templateJobId) ??
    residentsRuntime(c)?.jobs.get(position.templateJobId) ??
    firstCountedJobOf(c, position.organizationId);
  if (!template) return false;
  const jobId = `job:${position.id}:${seeker.personId}`;
  const hours = template.hoursDaily;
  const job: JobInput = {
    id: jobId,
    personId: seeker.personId,
    organizationId: position.organizationId,
    title: position.title,
    ...(template.occupationClassification
      ? { occupationClassification: template.occupationClassification }
      : {}),
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
    values: { fit, hourlyMinor: position.hourlyMinor, counted: 1 },
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

/**
 * The same, shared among groups (each employer, each market): the summed
 * pulls decide how many act, with one carry; each act goes to the group
 * furthest behind its own accumulated pulls, and within it to the strongest
 * pull. A business where few would leave isn't emptied by one where many
 * would, and small groups act on time rather than all at once.
 */
export function strongestPullsBy<T extends { id: string; score: number }>(
  api: CoreAPI,
  key: string,
  rows: readonly T[],
  groupOf: (row: T) => string,
): T[] {
  stopgap("SG-WORLD-jobs-counted-choices");
  const state = store(api).table("state");
  const saved = (state.get(`pulls:${key}`) as
    { carry: number; owed?: Record<string, number> } | undefined) ?? {
    carry: 0,
  };
  const owed = { ...(saved.owed ?? {}) };
  const groups = new Map<string, T[]>();
  let total = saved.carry;
  for (const row of rows) {
    const group = groupOf(row);
    const pull = 1 / (1 + Math.exp(-row.score));
    total += pull;
    owed[group] = (owed[group] ?? 0) + pull;
    const list = groups.get(group);
    if (list) list.push(row);
    else groups.set(group, [row]);
  }
  for (const list of groups.values())
    list.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  let count = Math.floor(total);
  const chosen: T[] = [];
  while (count > 0) {
    const next = [...groups]
      .filter(([, list]) => list.length)
      .sort(
        (a, b) =>
          (owed[b[0]] ?? 0) - (owed[a[0]] ?? 0) || a[0].localeCompare(b[0]),
      )[0];
    if (!next) break;
    chosen.push(next[1].shift()!);
    owed[next[0]] = (owed[next[0]] ?? 0) - 1;
    count -= 1;
  }
  // A group with no one left to act this month keeps what it's owed, never more than a month's worth.
  for (const [group, list] of groups)
    if (!list.length && (owed[group] ?? 0) > 0)
      owed[group] = Math.min(owed[group]!, 1);
  for (const group of Object.keys(owed))
    if (!groups.has(group)) delete owed[group];
  state.put({
    id: `pulls:${key}`,
    carry: total - Math.floor(total) + count,
    owed,
  });
  return chosen;
}

/** Counted workers 62 and over weigh retiring by the same reasons as full people, without the chooser (stopgap). */
function reviewCountedRetirements(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const rows: { id: string; job: JobInput; age: number; score: number }[] = [];
  for (const organizationId of workplaces(api).keys()) {
    for (const job of countedJobsOf(c, organizationId)) {
      if (pinned(c).has(job.id)) continue;
      // An owner retires through their business (the business module's closing choice), not off its payroll.
      if (ownerOf(api, organizationId) === job.personId) continue;
      const person = residentPerson(c, job.personId);
      if (!person) continue;
      const age =
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
        p("jobsDaysPerYear");
      const past = age - p("jobsEarliestRetirementAge");
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
    endCountedJob(c, job.id);
    // Their Social Security starts at their own claim age (the core's retirement claims); without that engine, their place's retirees' average income stands in.
    if (!c.modules.has(RETIREMENT_CLAIMS_MODULE_ID)) {
      stopgap("SG-WORLD-jobs-counted-retiree-income");
      const placeId = residentPerson(c, job.personId)?.placeId;
      if (placeId) addCountedRetiree(c, placeId, job.personId);
    }
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
  for (const row of rt.households.values())
    for (const personId of row.household.memberIds) {
      if (working.has(personId) || seekers.get(personId)) continue;
      const person = residentPerson(c, personId);
      if (!person) continue;
      const age =
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
        p("jobsDaysPerYear");
      if (age < young || age >= p("jobsEarliestRetirementAge")) continue;
      // Youth pulls hardest as school ends, rising over the first years after 18.
      const youth = Math.max(0, Math.min(age - young, youthSpan)) / youthSpan;
      rows.push({
        id: personId,
        placeId: person.placeId,
        score:
          p("jobsCountedEntryBaseline") +
          p("jobsCountedEntryYouthWeight") *
            (age - young < youthSpan ? youth : 0) -
          p("jobsUnemploymentEntryWeight") *
            unemploymentGap(api, person.placeId),
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
  for (const organizationId of workplaces(api).keys()) {
    for (const job of countedJobsOf(c, organizationId)) {
      if (pinned(c).has(job.id) || seekers.get(job.personId)) continue;
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
  for (const { job, placeId } of strongestPullsBy(
    api,
    "counted-quit",
    rows,
    (row) => row.job.organizationId,
  )) {
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
  const places = workplaces(api);
  for (const organizationId of places.keys()) {
    for (const job of countedJobsOf(c, organizationId)) {
      if (pinned(c).has(job.id) || seekers.get(job.personId)) continue;
      // An owner runs their own business; they don't look for a job elsewhere.
      if (ownerOf(api, organizationId) === job.personId) continue;
      const person = residentPerson(c, job.personId);
      const pay = tenuredPay(api, job);
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
  for (const { job, placeId } of strongestPullsBy(
    api,
    "look",
    rows,
    (row) => row.job.organizationId,
  ))
    seekers.put({
      id: job.personId,
      isSeeker: true,
      personId: job.personId,
      placeId,
      employed: true,
      since: c.date,
      reasonKey: jobsData.reasons.lookingAround,
      referenceHourlyMinor: tenuredPay(api, job),
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
    for (const record of rt.households.values())
      for (const row of record.workCommitments) {
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

function hire(
  api: CoreAPI,
  position: PositionRow,
  seeker: SeekerRow,
  fit: number,
): void {
  const c = core(api),
    person = c.people.get(seeker.personId)!;
  const role = roleTemplate(c, position);
  if (!role) return;
  const { template, commitment: templateCommitment, calendar } = role;
  if (person.jobId && pinned(c).has(person.jobId)) return;
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
  const job: JobInput = {
    id: jobId,
    personId: person.id,
    organizationId: position.organizationId,
    title: position.title,
    ...(template.occupationClassification
      ? { occupationClassification: template.occupationClassification }
      : {}),
    hourlyMinor: position.hourlyMinor,
    hoursDaily: template.hoursDaily,
    wageDailyMinor: Math.round(position.hourlyMinor * template.hoursDaily),
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
  store(api)
    .table("positions")
    .put({ ...position, status: "filled", filledBy: person.id });
  store(api).table("seekers").remove(person.id);
  endSpell(api, person.id);
  // The new hire meets the full people already working there.
  meetAtWork(
    api,
    person.id,
    position.organizationId,
    coworkerIds,
    template.hoursDaily,
    `job-change:${api.state.date}:${jobId}:hire`,
  );
  record(api, {
    personId: person.id,
    organizationId: position.organizationId,
    jobId,
    kind: "hire",
    reasonKey: jobsData.reasons.hired,
    decidedBy: position.organizationId,
    values: { fit, hourlyMinor: position.hourlyMinor },
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
      pay: {},
      unions: {},
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
  eventKinds: ["organization.closed", "life.death", MOVED_AWAY_EVENT],
  onEvent(api, event) {
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
    // Its openings close with it.
    for (const position of openPositions(api, organizationId))
      store(api)
        .table("positions")
        .put({ ...position, status: "withdrawn" });
    // The closed business's counted workers look for work too, with their claims.
    const rt = residentsRuntime(core(api));
    for (const job of rt?.jobs.values() ?? []) {
      if (job.organizationId !== organizationId) continue;
      if (job.endsAt && job.endsAt !== api.state.date) continue;
      if (store(api).table("countedSeekers").get(job.personId)) continue;
      // The job ends with the employer today; its wage flow stops paying at its next date.
      if (!job.endsAt && !endCountedJob(core(api), job.id)) {
        const ended = { ...job, endsAt: api.state.date };
        rt!.jobs.set(job.id, ended);
        syncCountedJobRecord(core(api), ended);
      }
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
      store(api)
        .table("countedSeekers")
        .put({
          id: job.personId,
          isSeeker: true,
          personId: job.personId,
          placeId: person.placeId,
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
      if (!person || store(api).table("seekers").get(personId)) continue;
      record(api, {
        personId,
        organizationId,
        jobId: event.id,
        kind: "closure",
        reasonKey: jobsData.reasons.closure,
        // The owner answers for the closure; a business without one answers as itself.
        decidedBy: ownerOf(api, organizationId) ?? organizationId,
      });
      startSeeking(api, personId, false, jobsData.reasons.closure, 0);
      const lost = [
        ...(core(api).finance.jobsByOrganization.get(organizationId) ?? []),
      ]
        .map((id) => core(api).jobs.get(id))
        .find((job) => job?.personId === personId);
      if (lost)
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
      // Agreements made since last month may name jobs too.
      pinnedByCore.delete(core(api));
      noteCountedLeavers(api);
      // Full people's employers outside the town are paid in for the month first.
      fundFullElsewhere(api);
      reviewMatches(api);
      reviewEmployers(api);
      reviewWorkers(api);
      reviewUnions(api, store(api).table("unions"), (id) =>
        Boolean(
          (store(api).table("employers").get(id) as EmployerRow | undefined)
            ?.elsewhere,
        ),
      );
      scheduleReview(api);
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
      ...(templateFromId ? { templateFromId } : {}),
    });
}
