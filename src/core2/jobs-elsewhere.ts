/**
 * Work outside the town. At the opening, the residents the opening couldn't
 * place in a town firm (the core's stand-in pays them as one pooled flow,
 * SG-CORE-unplaced-workers-income) get jobs of their own at employers
 * elsewhere: as many as the stand-in paid, the working-age adults closest to
 * prime working age first, at the town's median recorded pay, paid from
 * outside the town on the place's payday. The stand-in's flow ends. From
 * then on those jobs are an employer like any other for the jobs engine:
 * workers quit, retire and are let go, and the employer elsewhere hires to
 * a staff that follows the region's jobs since the opening.
 */
import { regionalMonth } from "./modules/regional";
import { residentsRuntime } from "./modules/residents";
import { addCountedJobsAt } from "./residents-economy";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState, JobInput, Source } from "./types";

const UNPLACED = "residents:unplaced-wages:";

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
): { organizationId: string; placeId: string; staff: number } | undefined {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key);
  const rt = residentsRuntime(c),
    found = unplaced(api);
  if (!rt || !found) return undefined;
  const { flow, medianDaily, count } = found;
  // Working-age adults with no job, closest to prime working age first (CPS: employment peaks at 35 to 49).
  const year = Number(c.date.slice(0, 4));
  const prime = p("jobsElsewherePrimeAge");
  const candidates: { personId: string; distance: number }[] = [];
  for (const record of rt.households.values())
    for (const person of record.people) {
      const age = year - Number(person.birthDate.slice(0, 4));
      if (age < 18 || age >= p("jobsEarliestRetirementAge")) continue;
      if (!isJobless(person.id)) continue;
      candidates.push({ personId: person.id, distance: Math.abs(age - prime) });
    }
  candidates.sort(
    (a, b) => a.distance - b.distance || a.personId.localeCompare(b.personId),
  );
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
  const jobs: JobInput[] = candidates.slice(0, count).map(({ personId }) => ({
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
  // The stand-in's pooled pay ends: each worker is paid by their own job now.
  flow.endsAt = c.date;
  return { organizationId, placeId: flow.placeId, staff: placed };
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
