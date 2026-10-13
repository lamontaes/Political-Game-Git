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
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import { chooseAct } from "../choice";
import jobsData from "../data/jobs/jobs.json" with { type: "json" };
import jobsParameters from "../data/jobs/parameters.json" with { type: "json" };
import seasonal from "../data/jobs/seasonal.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import { traitLean } from "../choice";
import { traitLeanBetween } from "../trait-decisions";
import { ownerOf } from "./business";
import { residentPerson, residentsRuntime } from "./residents";
import { endClaim, fileClaim, payClaims } from "../jobs-benefits";
import {
  addCountedJob,
  addCountedRetiree,
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
  /** A new business's template for its first roles. */
  templateFromId?: string;
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
function pinned(c: CoreState): Set<string> {
  let ids = pinnedByCore.get(c);
  if (ids) return ids;
  stopgap("SG-WORLD-jobs-agreement-pinned");
  ids = new Set();
  collectJobIds(Object.values(c.placeMetadata ?? {}), ids);
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
  // A worker who leaves (a quit or retirement) is replaced: the employer's need grows by one at once.
  if (row.kind === "quit" || row.kind === "left-work") {
    const employer = store(api).table("employers").get(row.organizationId) as
      EmployerRow | undefined;
    if (employer)
      store(api)
        .table("employers")
        .put({ ...employer, need: employer.need + 1 });
  }
  store(api)
    .table("changes")
    .put({
      id: `job-change:${api.state.date}:${row.jobId}:${row.kind}`,
      date: api.state.date,
      ...row,
      values: { ...(row.values ?? {}) },
    });
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
  for (const record of rt.households.values()) {
    const adults = record.people.filter((person) => {
      const age =
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
        api.parameter("jobsDaysPerYear");
      return age >= young && age < old;
    });
    if (!adults.length) continue;
    const share =
      adults.filter((person) => working.has(person.id)).length / adults.length;
    for (const person of adults)
      if (!working.has(person.id))
        candidates.push({
          personId: person.id,
          placeId: person.placeId,
          share,
        });
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

function open(api: CoreAPI): void {
  const c = core(api);
  for (const [id, book] of c.finance.businesses)
    if (!book.closedAt)
      store(api)
        .table("employers")
        .put({
          id,
          isEmployer: true,
          openingStaff: currentJobs(api, id).length,
          need: 0,
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
    if (!jobs.length && !positions.length && !row.templateFromId) continue;
    const target =
      (book.capacityMinor > 0
        ? // Real demand: the books' demand in the business's own opening prices.
          (row.openingStaff * book.annualDemandMinor) /
          ((book.price / book.anchorPrice || 1) * book.capacityMinor)
        : row.openingStaff) *
      // The season: the industry's staffing this month against the opening's (BLS CES seasonal factors).
      seasonalStaffing(book.kindId, c.date, opened);
    const monthlyPayroll = book.annualPayrollMinor / p("macroMonthsPerYear");
    const cash = c.organizations.get(row.id)!.liquidMinor;
    // Hiring leans on the cash in reach of a few months of payroll; a gap below staff needs no cash to act on.
    const reach =
      cash / (cash + p("jobsCashCoverMonths") * monthlyPayroll || 1);
    // At or above target, a business no longer needs its open positions: it withdraws them.
    if (target <= jobs.length)
      while (positions.length) {
        const position = positions.pop()!;
        store(api)
          .table("positions")
          .put({ ...position, status: "withdrawn" });
      }
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
    while (need >= 1 && fromJobs.length) {
      // A full person's job gives a new position its schedule and payday; counted jobs only when there is none.
      const full = fullJobs(api, from);
      const pool = full.length ? full : fromJobs;
      const template = [...pool].sort((a, b) => a.id.localeCompare(b.id))[
        (positions.length + Math.floor(need)) % pool.length
      ]!;
      const id = `position:${row.id}:${api.state.date}:${Math.floor(need)}`;
      store(api)
        .table("positions")
        .put({
          id,
          organizationId: row.id,
          placeId: c.organizations.get(row.id)!.placeId,
          templateJobId: template.id,
          title: template.title,
          occupation: template.occupationClassification ?? template.title,
          hourlyMinor: payFor(api, row.id, template),
          openedAt: api.state.date,
          status: "open",
          reasonKey: jobsData.reasons.opening,
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
          demand: book.annualDemandMinor,
          capacity: book.capacityMinor,
        });
      }
      need += 1;
    }
    store(api)
      .table("employers")
      .put({ ...row, need });
  }
}

/** A new hire's pay: what the business pays that role now, moved with the region's pay since. */
function payFor(
  api: CoreAPI,
  organizationId: string,
  template: JobInput,
): number {
  const peers = currentJobs(api, organizationId).filter(
    (job) => job.occupationClassification === template.occupationClassification,
  );
  const rates = peers.map((job) => job.hourlyMinor ?? 0).sort((a, b) => a - b);
  return rates[Math.floor(rates.length / 2)] ?? template.hourlyMinor ?? 0;
}

function tenureYears(api: CoreAPI, job: JobInput): number {
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
  const keepScore = keep(job);
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
    reasonKey: jobsData.reasons.layoff,
    decidedBy: decidedBy ?? organizationId,
    values: { ...values, keepScore },
  });
  api.emit({
    id: `event:work.job-lost:${api.state.date}:${job.id}`,
    date: api.state.date,
    kind: "work.job-lost",
    // A counted worker is not a full person; the change row names them until fill-in.
    personIds: counted ? [] : [job.personId],
    placeId: (c.people.get(job.personId) ?? residentPerson(c, job.personId))!
      .placeId,
    source: source(api, "A layoff decided from the business's books."),
    publicRecord: false,
    topic: organizationId,
  });
  // Laid off through no choice of their own: a claim under the state's program.
  fileClaim(
    api,
    store(api).table("claims"),
    job,
    jobsData.reasons.layoff,
    weeksWorked,
  );
  if (counted)
    store(api)
      .table("countedSeekers")
      .put({
        id: job.personId,
        isSeeker: true,
        personId: job.personId,
        placeId: residentPerson(c, job.personId)!.placeId,
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
    const pastRetirementAge = Math.max(0, age - p("jobsEarliestRetirementAge"));
    const result = chooseAct(c, person.id, [
      offer("stay", job.id, {}),
      offer("look", job.id, {
        baseline: p("jobsLookBaseline"),
        payGap: p("jobsPayGapWeight") * payGap,
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
    if (chosen === jobsData.actions.look.id)
      if (ownerOf(api, job.organizationId) !== person.id)
        startSeeking(api, person.id, true, "looking-around", pay);
      else if (chosen === jobsData.actions.leave.id) {
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
    const row = pay.get(job.id) as { level: number; at: string } | undefined;
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
    pay.put({ id: job.id, level: now, at: c.date });
  }
  rerateCountedJobs(c, counted);
}

/** Jobless working-age adults choose whether to look for work, pushed by how few days their money covers. */
function reviewJobless(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    [young, old] = jobsData.workingAge as [number, number];
  const worked = new Set([...c.jobs.values()].map((job) => job.personId));
  for (const person of c.people.values()) {
    if (
      !person.alive ||
      person.jobId ||
      store(api).table("seekers").get(person.id)
    )
      continue;
    if (!c.households.has(person.householdId)) continue;
    // Only people who have worked in this world are in its labor market; the rest are the wider population (see the opening-seekers stopgap).
    if (!worked.has(person.id)) continue;
    const age =
      daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
      p("jobsDaysPerYear");
    if (age < young || age >= old) continue;
    const days =
      person.livingCostDailyMinor > 0
        ? person.liquidMinor / person.livingCostDailyMinor
        : Number.POSITIVE_INFINITY;
    const result = chooseAct(c, person.id, [
      offer("wait", person.id, {}),
      offer("look", person.id, {
        baseline: p("jobsEnterBaseline"),
        needWork:
          p("jobsUnemployedNeedWeight") /
          (p("one") + days / (p("jobsDaysPerYear") / p("macroMonthsPerYear"))),
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
  const positions = store(api)
    .table("positions")
    .query("byStatus", ["open"]) as unknown as PositionRow[];
  if (!positions.length) return;
  const byPlace = new Map<string, PositionRow[]>();
  for (const row of positions)
    byPlace.set(row.placeId, [...(byPlace.get(row.placeId) ?? []), row]);
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
    const result = chooseAct(c, person.id, [
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
    if (result.selected!.definition.id !== jobsData.actions.apply.id) continue;
    const id = result.selected!.targetId;
    apply(id, seeker);
  }
  // Counted seekers apply to every opening in their place; they decide nothing through the chooser until filled in (stopgap).
  const counted = store(api)
    .table("countedSeekers")
    .query("all", [true]) as unknown as SeekerRow[];
  if (counted.length) stopgap("SG-WORLD-jobs-counted-choices");
  for (const seeker of counted) {
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
  // Each seeker's fit for an occupation, worked out once a week.
  const fits = new Map<string, number>();
  for (const position of positions) {
    // A role copied from a counted worker can go only to a counted seeker until full roles exist there.
    const fullRole = c.jobs.has(position.templateJobId);
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
              experienceYears(api, seeker.personId, position.occupation) +
            p("jobsFitReliabilityWeight") *
              (traitsOf(api, seeker.personId)[jobsData.traits.reliability] ??
                0)),
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
    // A counted applicant who can't be placed gives way to the next best.
    let pool = [...applicants];
    let best = pick(pool);
    while (isCounted(api, best.personId)) {
      // A counted seeker answers the offer by the same reasons a full person
      // weighs, every trait included.
      const person = { traits: traitsOf(api, best.personId) };
      const reference = best.referenceHourlyMinor;
      const accepts =
        p("jobsRateWeight") *
          (p("jobsAcceptBaseline") +
            p("jobsApplyPayWeight") *
              (reference > 0 ? position.hourlyMinor / reference - 1 : 0) +
            (best.employed ? 0 : p("jobsUnemployedNeedWeight"))) +
          p("traitWeight") *
            (traitLean(c, person, jobsData.actions.accept.actKinds) -
              traitLean(c, person, jobsData.actions.decline.actKinds)) >
        0;
      if (accepts && hireCounted(api, position, best, fit(best))) {
        for (const row of applications.values())
          for (let i = row.length - 1; i >= 0; i--)
            if (row[i]!.personId === best.personId) row.splice(i, 1);
        break;
      }
      pool = pool.filter((row) => row !== best);
      if (!pool.length) break;
      best = pick(pool);
    }
    if (isCounted(api, best.personId) || !pool.length) continue;
    const reference = best.referenceHourlyMinor;
    const answer = chooseAct(c, best.personId, [
      offer("decline", position.id, {}),
      offer("accept", position.id, {
        baseline: p("jobsAcceptBaseline"),
        pay:
          p("jobsApplyPayWeight") *
          (reference > 0 ? position.hourlyMinor / reference - 1 : 0),
        needWork: best.employed ? 0 : p("jobsUnemployedNeedWeight"),
      }),
    ]);
    if (answer.selected!.definition.id !== jobsData.actions.accept.id) continue;
    hire(api, position, best, fit(best));
    for (const row of applications.values()) {
      const i = row.indexOf(best);
      if (i >= 0) row.splice(i, 1);
    }
  }
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
      reasonKey: jobsData.reasons.betterOffer,
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

/** Counted workers 62 and over weigh retiring by the same reasons as full people, without the chooser (stopgap). */
function reviewCountedRetirements(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const rows: { id: string; job: JobInput; age: number; score: number }[] = [];
  for (const [organizationId] of c.finance.businesses) {
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
          p("jobsCountedRestlessWeight") *
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
    // Their income goes on as their place's retirees' does (stand-in until their own claim is modeled).
    stopgap("SG-WORLD-jobs-counted-retiree-income");
    const placeId = residentPerson(c, job.personId)?.placeId;
    if (placeId) addCountedRetiree(c, placeId, job.personId);
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
            (age - young < youthSpan ? youth : 0),
      });
    }
  // Out of work and looking, some stop looking each month (to school, family or retirement).
  const leaving: { id: string; score: number }[] = [];
  for (const row of seekers.query("all", [true]) as unknown as SeekerRow[])
    if (!row.employed)
      leaving.push({
        id: row.personId,
        score: p("jobsCountedStopLookingBaseline"),
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
 * Counted workers who leave a job without another: their industry's quit
 * rate (JOLTS), less the share of quits that go straight to a new job (the
 * looking-around choice covers those), pulled further by pay below the going
 * rate. They look for work with no claim (a quit doesn't qualify).
 */
function reviewCountedQuits(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    hundred = p("macroHundred");
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
    const sector =
      (jobsData.kindSector as Record<string, string>)[book.kindId] ??
      jobsData.kindSector["*"];
    const quits = (
      jobsData.turnover.industries as Record<
        string,
        { quits: { mean: number } }
      >
    )[sector]?.quits.mean;
    if (!quits) continue;
    const share = (quits / hundred) * p("jobsQuitToNonemploymentShare");
    const base = Math.log(share / (p("one") - share));
    for (const job of countedJobsOf(c, organizationId)) {
      if (pinned(c).has(job.id) || seekers.get(job.personId)) continue;
      if (ownerOf(api, organizationId) === job.personId) continue;
      const person = residentPerson(c, job.personId);
      const pay = job.hourlyMinor ?? 0;
      if (!person || pay <= 0) continue;
      const payGap = Math.max(
        0,
        (going.get(job.occupationClassification ?? job.title) ?? pay) / pay - 1,
      );
      rows.push({
        id: job.id,
        job,
        placeId: person.placeId,
        score: base + p("jobsPayGapWeight") * payGap,
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
      if (pinned(c).has(job.id) || seekers.get(job.personId)) continue;
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
          p("jobsPayGapWeight") * payGap +
          p("jobsCountedRestlessWeight") * restless,
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

function hire(
  api: CoreAPI,
  position: PositionRow,
  seeker: SeekerRow,
  fit: number,
): void {
  const c = core(api),
    person = c.people.get(seeker.personId)!;
  // A counted worker's role has no schedule a full person can be given yet.
  const template = c.jobs.get(position.templateJobId);
  if (!template) return;
  const templateCommitment = [
    ...(c.work.commitmentsByPerson.get(template.personId) ?? []),
  ]
    .map((id) => c.work.commitments.get(id)!)
    .find((row) => row.jobId === template.id);
  const calendarId =
    templateCommitment &&
    c.work.payrollCalendarByCommitment.get(templateCommitment.id);
  const calendar = calendarId
    ? c.work.payrollCalendars.get(calendarId)
    : undefined;
  if (!templateCommitment || !calendar) return;
  if (person.jobId && pinned(c).has(person.jobId)) return;
  if (person.jobId) {
    const old = c.jobs.get(person.jobId)!;
    api.endJob(old.id, `jobs:quit:${api.state.date}`);
    record(api, {
      personId: person.id,
      organizationId: old.organizationId,
      jobId: old.id,
      kind: "quit",
      reasonKey: jobsData.reasons.betterOffer,
      decidedBy: person.id,
      values: {
        offeredHourlyMinor: position.hourlyMinor,
        hourlyMinor: old.hourlyMinor ?? 0,
      },
    });
  }
  const startsAt = addDays(makeIsoDate(api.state.date), 1);
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
    occupationClassification: template.occupationClassification,
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
    basisRecordIds: [position.organizationId, template.id],
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
  eventKinds: ["organization.closed"],
  onEvent(api, event) {
    if (!store(api).table("state").get("jobs:state")) return;
    // The closure event's id ends with the closed business.
    const organizationId = event.id.split(":").slice(2).join(":");
    // The closed business's counted workers look for work too, with their claims.
    const rt = residentsRuntime(core(api));
    for (const job of rt?.jobs.values() ?? []) {
      if (job.organizationId !== organizationId) continue;
      if (job.endsAt && job.endsAt !== api.state.date) continue;
      if (store(api).table("countedSeekers").get(job.personId)) continue;
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
    if (work.kind === "jobs-review") {
      // Agreements made since last month may name jobs too.
      pinnedByCore.delete(core(api));
      reviewEmployers(api);
      reviewWorkers(api);
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
