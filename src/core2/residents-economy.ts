/**
 * The economy engines acting on the wider population (shared seams on the
 * residents engine, for OPUS-CORE review). A counted worker's job can end or
 * begin through their employer's wage flow, and an engine can add a standing
 * flow (rent, a loan payment, spending that leaves town) at runtime.
 */
import { addDays, makeIsoDate } from "../simulation/dates";
import { residentsRuntime } from "./modules/residents";
import type { ResidentFlowInput } from "./residents";
import type { CoreState, JobInput } from "./types";

type Runtime = NonNullable<ReturnType<typeof residentsRuntime>>;
type Flow = Runtime["flows"] extends Map<string, infer F> ? F : never;

function recompute(flow: Flow): void {
  let total = 0;
  for (const value of Object.values(flow.perDayMinorByJob ?? {}))
    total += value;
  flow.amountMinor = Math.round(total * (flow.periodFactor ?? 1));
}

/** A counted worker's job ends today: their employer's wage flow drops exactly their pay. */
export function endCountedJob(
  core: CoreState,
  jobId: string,
): JobInput | undefined {
  const rt = residentsRuntime(core);
  const job = rt?.jobs.get(jobId),
    flow = rt?.wageFlowByJob.get(jobId);
  if (!rt || !job || !flow || flow.endedAt) return undefined;
  const perDay = { ...(flow.perDayMinorByJob ?? {}) };
  delete perDay[jobId];
  flow.perDayMinorByJob = perDay;
  flow.jobIds = (flow.jobIds ?? []).filter((id) => id !== jobId);
  recompute(flow);
  rt.wageFlowByJob.delete(jobId);
  const ended = { ...job, endsAt: makeIsoDate(core.date) };
  rt.jobs.set(jobId, ended);
  return ended;
}

/** A counted person is hired: the employer's wage flow grows by their pay. False when it has none. */
export function addCountedJob(core: CoreState, job: JobInput): boolean {
  const rt = residentsRuntime(core);
  if (!rt || (rt.jobs.has(job.id) && rt.jobs.get(job.id)!.endsAt === undefined))
    return false;
  const flow = [...rt.flows.values()].find(
    (row) =>
      row.kind === "wages" &&
      !row.endedAt &&
      row.organizationId === job.organizationId,
  );
  if (!flow) return false;
  flow.perDayMinorByJob = {
    ...(flow.perDayMinorByJob ?? {}),
    [job.id]: job.wageDailyMinor,
  };
  flow.jobIds = [...(flow.jobIds ?? []), job.id];
  recompute(flow);
  rt.jobs.set(job.id, job);
  rt.wageFlowByJob.set(job.id, flow);
  return true;
}

/** A standing flow begins mid-run, first due on its own date (never today). */
export function addResidentFlow(
  core: CoreState,
  input: ResidentFlowInput,
): void {
  const rt = residentsRuntime(core);
  if (!rt) throw new Error("No wider population to add a flow to.");
  if (rt.flows.has(input.id)) throw new Error(`Duplicate flow: ${input.id}`);
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
    throw new Error(`Invalid flow amount: ${input.id}`);
  for (const id of [input.payerId, input.payeeId])
    if (!core.organizations.has(id) && !core.people.has(id))
      throw new Error(`Flow owner is not recorded: ${id}`);
  let nextAt = makeIsoDate(input.firstAt);
  if (nextAt <= core.date)
    nextAt = makeIsoDate(addDays(makeIsoDate(core.date), 1));
  const flow = { ...input, nextAt, arrearsMinor: 0 } as Flow;
  rt.flows.set(input.id, flow);
  const ids = rt.due.get(nextAt) ?? new Set<string>();
  ids.add(input.id);
  rt.due.set(nextAt, ids);
}

/** The counted workers of an employer, by job, from its live wage flows. */
export function countedJobsOf(
  core: CoreState,
  organizationId: string,
): JobInput[] {
  const rt = residentsRuntime(core);
  if (!rt) return [];
  const out: JobInput[] = [];
  for (const [jobId, flow] of rt.wageFlowByJob)
    if (!flow.endedAt && flow.organizationId === organizationId) {
      const job = rt.jobs.get(jobId);
      if (job && job.endsAt === undefined) out.push(job);
    }
  return out;
}
