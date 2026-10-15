/**
 * Work outside the town. At the opening, the residents the opening couldn't
 * place in a town firm (the core's stand-in pays them as one pooled flow,
 * SG-CORE-unplaced-workers-income) get jobs of their own at employers
 * elsewhere: as many as the stand-in paid, each household's own unplaced
 * workers from its jobless working-age adults, closest to prime working age
 * first, at the town's median recorded pay, paid from
 * outside the town on the place's payday. The stand-in's flow ends. From
 * then on those jobs are an employer like any other for the jobs engine:
 * workers quit, retire and are let go, and the employer elsewhere hires to
 * a staff that follows the region's jobs since the opening.
 */
import { regionalMonth } from "./modules/regional";
import { regroupHousehold, residentsRuntime } from "./modules/residents";
import { addCountedJobsAt } from "./residents-economy";
import { stopgap } from "./stopgaps";
import { transferCash } from "./world-transfer";
import jobsData from "./data/jobs/jobs.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import type {
  CoreAPI,
  CoreState,
  JobInput,
  Source,
  WorkCommitmentInput,
} from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";

const UNPLACED = "residents:unplaced-wages:";
/** The employer full people placed outside the town work for, one per place. */
const FULL_ELSEWHERE = "organization:work-elsewhere:";

/** The stand-in's pooled pay for unplaced workers: its flow, the town's median recorded pay a day, and how many workers it pays. */
function unplaced(api: CoreAPI) {
  const c = api.state as CoreState;
  const rt = residentsRuntime(c);
  if (!rt) return undefined;
  const flow = [...rt.flows.values()].find(
    (row) => row.id.startsWith(UNPLACED) && !row.endedAt && !row.endsAt,
  );
  if (!flow || flow.cadence.kind !== "days") return undefined;
  // The town's median recorded pay a day, as the stand-in paid it.
  const wages: number[] = [];
  for (const job of c.jobs.values())
    if (job.endsAt === undefined) wages.push(job.wageDailyMinor);
  for (const [jobId, wageFlow] of rt.wageFlowByJob) {
    const job = rt.jobs.get(jobId);
    if (job && job.endsAt === undefined && !wageFlow.endedAt)
      wages.push(job.wageDailyMinor);
  }
  wages.sort((a, b) => a - b);
  const medianDaily = wages[Math.floor(wages.length / 2)] ?? 0;
  if (!(medianDaily > 0)) return undefined;
  const count = Math.round(
    flow.amountMinor / (medianDaily * flow.cadence.every),
  );
  return { flow, medianDaily, count };
}

/** Where the stand-in's pooled pay goes and how many workers it stands for, if there is one. */
export function unplacedWorkers(
  api: CoreAPI,
): { placeId: string; count: number } | undefined {
  const found = unplaced(api);
  return found
    ? { placeId: found.flow.placeId, count: found.count }
    : undefined;
}

/** Places the unplaced workers in jobs elsewhere; returns the employer and its staff, if any. */
export function placeElsewhere(
  api: CoreAPI,
  isJobless: (personId: string) => boolean,
):
  | {
      organizationId: string;
      placeId: string;
      staff: number;
      /** The employer the full people placed elsewhere work for, and how many. */
      fullOrganizationId?: string;
      fullStaff?: number;
      /** Adults of households whose share of the unplaced workers rounded to nobody: out of work, and looking. */
      lookingIds: string[];
    }
  | undefined {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key);
  const rt = residentsRuntime(c),
    found = unplaced(api);
  if (!rt || !found) return undefined;
  const { flow, medianDaily, count } = found;
  // Each household's own unplaced workers (the stand-in paid it their share):
  // the place's count shared out by households' unplaced workers (largest
  // remainder), each filled from the household's jobless working-age adults
  // closest to prime working age (CPS: employment peaks at 35 to 49).
  const year = Number(c.date.slice(0, 4));
  const prime = p("jobsElsewherePrimeAge");
  const store = rt.store;
  const households = [...store.liveHouseholds()].filter(
    (h) => h.placeId === flow.placeId && h.unplacedWorkers > 0,
  );
  const total = households.reduce((n, h) => n + h.unplacedWorkers, 0);
  const quotas = households.map((h) => {
    const exact = total > 0 ? (h.unplacedWorkers * count) / total : 0;
    return { h, whole: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = count - quotas.reduce((n, q) => n + q.whole, 0);
  for (const q of [...quotas].sort(
    (a, b) => b.rest - a.rest || (a.h.id < b.h.id ? -1 : 1),
  )) {
    if (left <= 0) break;
    q.whole += 1;
    left -= 1;
  }
  const candidates: { personId: string; distance: number }[] = [];
  const placedIn = new Map<(typeof households)[number], number>();
  for (const { h, whole } of quotas) {
    if (whole <= 0) continue;
    const members = store
      .countedMembers(h)
      .map((m) => ({
        personId: store.ids[m]!,
        age: year - Number(store.born[m]!.slice(0, 4)),
      }))
      .filter(
        (row) =>
          row.age >= 18 &&
          row.age < p("jobsEarliestRetirementAge") &&
          isJobless(row.personId),
      )
      .sort(
        (a, b) =>
          Math.abs(a.age - prime) - Math.abs(b.age - prime) ||
          (a.personId < b.personId ? -1 : 1),
      )
      .slice(0, whole);
    for (const row of members)
      candidates.push({
        personId: row.personId,
        distance: Math.abs(row.age - prime),
      });
    if (members.length) placedIn.set(h, members.length);
  }
  // A household whose share rounded to nobody still holds the worker it stood
  // for: its jobless working-age adult closest to prime age is out of work
  // and looking (the town's unemployed), not out of the labor force.
  const lookingIds: string[] = [];
  for (const { h, whole } of quotas) {
    if (whole > 0) continue;
    const best = store
      .countedMembers(h)
      .map((m) => ({
        personId: store.ids[m]!,
        age: year - Number(store.born[m]!.slice(0, 4)),
      }))
      .filter(
        (row) =>
          row.age >= 18 &&
          row.age < p("jobsEarliestRetirementAge") &&
          isJobless(row.personId),
      )
      .sort(
        (a, b) =>
          Math.abs(a.age - prime) - Math.abs(b.age - prime) ||
          (a.personId < b.personId ? -1 : 1),
      )[0];
    if (best) lookingIds.push(best.personId);
  }
  const organizationId = flow.payerId;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: c.date,
    citation: flow.source.citation,
    estimatedFrom:
      "A job outside the town for a resident the opening couldn't place in a town firm, at the town's median recorded pay.",
  };
  // Their industries and employers elsewhere aren't recorded; one employer stands for them (see the stopgap).
  stopgap("SG-WORLD-jobs-elsewhere-employer");
  const hours = p("jobsElsewhereHoursDaily");
  const jobs: JobInput[] = candidates.map(({ personId }) => ({
    id: `job:elsewhere:${personId}`,
    personId,
    organizationId,
    title: "work-elsewhere",
    wageDailyMinor: medianDaily,
    hoursDaily: hours,
    hourlyMinor: Math.round(medianDaily / hours),
    source,
  }));
  const placed = addCountedJobsAt(c, organizationId, flow.placeId, jobs);
  if (!placed) return undefined;
  // Those placed now earn their own pay. Once the stand-in ends, so does every
  // household's fractional share of it: a household whose share rounded to
  // nobody has no worker, and its income on record says so.
  const ends = placed >= count;
  for (const { h } of quotas) {
    const n = placedIn.get(h) ?? 0;
    const next = ends ? 0 : Math.max(0, h.unplacedWorkers - n);
    if (next === h.unplacedWorkers) continue;
    h.unplacedWorkers = next;
    store.touch(h);
    regroupHousehold(rt, h, c.date);
  }
  // The full people the same gap stands for work elsewhere too (the stand-in paid only the counted adults' share).
  const fullPlaced = placeFullElsewhere(api, {
    organizationId,
    placeId: flow.placeId,
    medianDaily,
    source,
    isJobless,
  });
  // The stand-in's pooled pay ends, or shrinks by the share placed: each placed worker is paid by their own job now.
  if (placed >= count) flow.endsAt = c.date;
  else
    flow.amountMinor = Math.round(
      (flow.amountMinor * (count - placed)) / count,
    );
  return {
    organizationId,
    placeId: flow.placeId,
    staff: placed,
    lookingIds,
    ...(fullPlaced
      ? {
          fullOrganizationId: `${FULL_ELSEWHERE}${flow.placeId}`,
          fullStaff: fullPlaced,
        }
      : {}),
  };
}

/** The staff an employer elsewhere keeps: its opening staff moved with the region's jobs since the opening. */
export function elsewhereTarget(
  api: CoreAPI,
  townPlaceId: string,
  openingStaff: number,
): number {
  const c = api.state as CoreState;
  if (!c.modules.has("macro")) return openingStaff;
  const state = api.moduleState("macro").table("state").get("macro:state") as
    { openingMonth?: string; latestMonth?: string } | undefined;
  if (!state?.openingMonth || !state.latestMonth) return openingStaff;
  const first = regionalMonth(api, townPlaceId, state.openingMonth),
    now = regionalMonth(api, townPlaceId, state.latestMonth);
  return first && now
    ? (openingStaff * now.jobsThousands) / first.jobsThousands
    : openingStaff;
}

/**
 * The opening's employment gap (its target less recorded jobs) belongs to
 * every adult in the place; the core's stand-in pays only the counted
 * adults' share, so full adults get jobs elsewhere here until they're
 * employed at the counted adults' rate (once those are placed), from the
 * working-age full adults with no job who aren't looking, closest to prime
 * working age first. Each job keeps the schedule and payday of a
 * counted worker's recorded job in the place.
 */
function placeFullElsewhere(
  api: CoreAPI,
  input: {
    organizationId: string;
    placeId: string;
    medianDaily: number;
    source: Source;
    isJobless: (personId: string) => boolean;
  },
): number {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key);
  const rt = residentsRuntime(c);
  if (!rt) return 0;
  const year = Number(c.date.slice(0, 4));
  const ageOf = (birthDate: string) => year - Number(birthDate.slice(0, 4));
  // The counted adults' employment rate once they're placed: the full adults are held to the same.
  const countedWorking = new Set<string>();
  for (const [jobId, flow] of rt.wageFlowByJob) {
    const job = rt.jobs.get(jobId);
    if (job && job.endsAt === undefined && !flow.endedAt)
      countedWorking.add(job.personId);
  }
  let countedAdults = 0,
    countedEmployed = 0;
  for (const record of rt.households.values())
    if (record.household.placeId === input.placeId)
      for (const person of record.people)
        if (ageOf(person.birthDate) >= 18) {
          countedAdults += 1;
          if (countedWorking.has(person.id)) countedEmployed += 1;
        }
  const working = new Set<string>();
  for (const job of c.jobs.values())
    if (job.endsAt === undefined) working.add(job.personId);
  const full = [...c.people.values()].filter(
    (person) =>
      person.alive &&
      person.placeId === input.placeId &&
      ageOf(person.birthDate) >= 18,
  );
  if (!countedAdults || !full.length) return 0;
  const employed = full.filter((person) => working.has(person.id)).length;
  const want = Math.max(
    0,
    Math.round((countedEmployed / countedAdults) * full.length) - employed,
  );
  const prime = p("jobsElsewherePrimeAge");
  const candidates = full
    .filter((person) => {
      const age = ageOf(person.birthDate);
      return (
        age < p("jobsEarliestRetirementAge") &&
        !working.has(person.id) &&
        input.isJobless(person.id)
      );
    })
    .sort(
      (a, b) =>
        Math.abs(ageOf(a.birthDate) - prime) -
          Math.abs(ageOf(b.birthDate) - prime) || a.id.localeCompare(b.id),
    )
    .slice(0, want);
  if (!candidates.length) return 0;
  // A counted worker's recorded schedule and payday in the place, the first by id.
  const calendars = new Map(
    (rt.input.calendars ?? []).map((row) => [row.id, row]),
  );
  let shape:
    | { commitment: WorkCommitmentInput; calendar: WorkPayrollCalendarInput }
    | undefined;
  for (const record of [...rt.households.values()].sort((a, b) =>
    a.household.id.localeCompare(b.household.id),
  )) {
    if (record.household.placeId !== input.placeId) continue;
    for (const commitment of record.workCommitments) {
      const calendar = commitment.payrollCalendarId
        ? calendars.get(commitment.payrollCalendarId)
        : undefined;
      if (calendar && !commitment.publicPayAuthorityId) {
        shape = { commitment, calendar };
        break;
      }
    }
    if (shape) break;
  }
  if (!shape) return 0;
  // Their employers outside the town stand as one, paid each month from outside (see the stopgap and fundFullElsewhere).
  const employerId = `${FULL_ELSEWHERE}${input.placeId}`;
  if (!c.organizations.has(employerId))
    api.addOrganization({
      id: employerId,
      placeId: input.placeId,
      name: jobsData.elsewhereEmployerNamePattern.replace(
        "{place}",
        c.placeMetadata?.placeName?.split(",")[0] ?? input.placeId,
      ),
      kind: "employer",
      liquidMinor: 0,
      source: input.source,
    });
  const hours =
    shape.commitment.expectedWeeklyMinutes > 0
      ? shape.commitment.expectedWeeklyMinutes /
        60 /
        (p("jobsDaysPerYear") / 52)
      : p("jobsElsewhereHoursDaily");
  const hourlyMinor = Math.max(1, Math.round(input.medianDaily / hours));
  const startsAt = addDays(makeIsoDate(c.date), 1);
  for (const person of candidates) {
    const jobId = `job:elsewhere:${person.id}`,
      commitmentId = `work-commitment:${jobId}`,
      calendarId = `payroll-calendar:${jobId}`;
    api.startJob(
      {
        id: jobId,
        personId: person.id,
        organizationId: employerId,
        title: "work-elsewhere",
        hourlyMinor,
        hoursDaily: hours,
        wageDailyMinor: Math.round(hourlyMinor * hours),
        source: input.source,
      },
      {
        ...shape.commitment,
        id: commitmentId,
        jobId,
        personId: person.id,
        organizationId: employerId,
        payrollCalendarId: calendarId,
        startsAt,
        endsAt: undefined,
        hourlyMinor,
        scheduleTemplateJobId: shape.commitment.jobId,
        paySource: input.source,
        scheduleSource: input.source,
      },
      {
        ...shape.calendar,
        id: calendarId,
        organizationId: employerId,
        workCommitmentIds: [commitmentId],
        basisRecordIds: [employerId],
        effectiveFrom: [startsAt, shape.calendar.effectiveFrom].sort().at(-1)!,
        source: input.source,
      },
    );
  }
  fundFullElsewhere(api);
  return candidates.length;
}

/**
 * Each month the employers outside the town that full people work for are
 * paid enough from outside to meet a month of their payroll (the outside
 * world's money: it enters the town as their pay).
 */
export function fundFullElsewhere(api: CoreAPI): void {
  const c = api.state as CoreState;
  const monthDays =
    api.parameter("jobsDaysPerYear") / api.parameter("macroMonthsPerYear");
  for (const org of c.organizations.values()) {
    if (!org.id.startsWith(FULL_ELSEWHERE)) continue;
    let payroll = 0;
    for (const id of c.finance.jobsByOrganization.get(org.id) ?? []) {
      const job = c.jobs.get(id);
      if (job && job.endsAt === undefined) payroll += job.wageDailyMinor;
    }
    const need = Math.round(payroll * monthDays) - org.liquidMinor;
    const outside = [...c.organizations.values()].find(
      (row) => row.placeId === org.placeId && row.outsideFlow !== undefined,
    );
    if (need <= 0 || !outside) continue;
    transferCash(
      api,
      `work-elsewhere-funding:${org.id}:${c.date}`,
      outside.id,
      org.id,
      need,
      {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: org.source.citation,
        estimatedFrom:
          "A month of the payroll of the full people working outside the town, paid in from outside.",
      },
    );
  }
}
