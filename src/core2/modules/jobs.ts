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
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import { ownerOf } from "./business";
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

function currentJobs(api: CoreAPI, organizationId: string) {
  const c = core(api);
  return [...(c.finance.jobsByOrganization.get(organizationId) ?? [])]
    .map((id) => c.jobs.get(id)!)
    .filter((job) => job.endsAt === undefined && c.people.get(job.personId));
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
    // Unemployment benefits come from the budgets engine (M1-07).
    stopgap("SG-WORLD-jobs-benefits");
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
function reviewEmployers(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  for (const row of store(api)
    .table("employers")
    .query("all", [true]) as unknown as EmployerRow[]) {
    const book = c.finance.businesses.get(row.id);
    if (!book || book.closedAt) continue;
    const jobs = currentJobs(api, row.id),
      positions = openPositions(api, row.id);
    if (!jobs.length && !positions.length) continue;
    const target =
      book.capacityMinor > 0
        ? (row.openingStaff * book.annualDemandMinor) / book.capacityMinor
        : row.openingStaff;
    const monthlyPayroll = book.annualPayrollMinor / p("macroMonthsPerYear");
    const cash = c.organizations.get(row.id)!.liquidMinor;
    // Hiring leans on the cash in reach of a few months of payroll; a gap below staff needs no cash to act on.
    const reach =
      cash / (cash + p("jobsCashCoverMonths") * monthlyPayroll || 1);
    const gap = target - jobs.length - positions.length;
    let need =
      row.need + p("jobsStaffGapActedPerMonth") * (gap > 0 ? gap * reach : gap);
    while (need >= 1 && jobs.length) {
      const template = [...jobs].sort((a, b) => a.id.localeCompare(b.id))[
        (positions.length + Math.floor(need)) % jobs.length
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
      (c.people.get(job.personId)!.traits[reliability] ?? 0);
  const job = [...staff].sort(
    (a, b) => keep(a) - keep(b) || a.id.localeCompare(b.id),
  )[0]!;
  const keepScore = keep(job);
  api.endJob(job.id, `jobs:layoff:${api.state.date}`);
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
    personIds: [job.personId],
    placeId: c.people.get(job.personId)!.placeId,
    source: source(api, "A layoff decided from the business's books."),
    publicRecord: false,
    topic: organizationId,
  });
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
    if (job.endsAt !== undefined) continue;
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
    ]);
    const chosen = result.selected!.definition.id;
    if (chosen === jobsData.actions.look.id)
      startSeeking(api, person.id, true, "looking-around", pay);
    else if (chosen === jobsData.actions.leave.id) {
      api.endJob(job.id, `jobs:left-work:${api.state.date}`);
      record(api, {
        personId: person.id,
        organizationId: job.organizationId,
        jobId: job.id,
        kind: "left-work",
        reasonKey: jobsData.reasons.leftWork,
        decidedBy: person.id,
        values: { bufferMonths, strain },
      });
    }
  }
  reviewJobless(api);
}

/** Jobless working-age adults choose whether to look for work, pushed by how few days their money covers. */
function reviewJobless(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key),
    [young, old] = jobsData.workingAge as [number, number];
  for (const person of c.people.values()) {
    if (
      !person.alive ||
      person.jobId ||
      store(api).table("seekers").get(person.id)
    )
      continue;
    if (!c.households.has(person.householdId)) continue;
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
    applications.set(id, [...(applications.get(id) ?? []), seeker]);
  }
  for (const position of positions) {
    const applicants = applications.get(position.id);
    if (!applicants?.length) continue;
    const fit = (seeker: SeekerRow) =>
      p("jobsFitExperienceWeight") *
        experienceYears(api, seeker.personId, position.occupation) +
      p("jobsFitReliabilityWeight") *
        (c.people.get(seeker.personId)!.traits[jobsData.traits.reliability] ??
          0);
    const best = [...applicants].sort(
      (a, b) => fit(b) - fit(a) || a.id.localeCompare(b.id),
    )[0]!;
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
  const template = c.jobs.get(position.templateJobId)!;
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
      spells: { indexes: { open: { fields: ["personId", "open"] } } },
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
    for (const personId of event.personIds) {
      const person = core(api).people.get(personId);
      if (!person || store(api).table("seekers").get(personId)) continue;
      record(api, {
        personId,
        organizationId,
        jobId: event.id,
        kind: "closure",
        reasonKey: jobsData.reasons.closure,
        decidedBy: organizationId,
      });
      startSeeking(api, personId, false, jobsData.reasons.closure, 0);
    }
  },
  onCalendarWork(api, work) {
    if (work.kind === "jobs-review") {
      reviewEmployers(api);
      reviewWorkers(api);
      scheduleReview(api);
    } else if (work.kind === "jobs-week") {
      runWeek(api);
      scheduleWeek(api);
    }
  },
  onDay(api) {
    if (!store(api).table("state").get("jobs:state")) open(api);
  },
};
