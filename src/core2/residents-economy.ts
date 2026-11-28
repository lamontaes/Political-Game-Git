/**
 * The economy engines acting on the wider population (shared seams on the
 * residents engine, for OPUS-CORE review). A counted worker's job can end or
 * begin through their employer's wage flow, and an engine can add a standing
 * flow (rent, a loan payment, spending that leaves town) at runtime.
 */
import { makeIsoDate } from "./kernel/dates";
import { countedHouseholdJobChanged } from "./modules/residents";
import { residentsRuntime } from "./residents-reads";
import type { CoreState, JobInput, WorkCommitmentInput } from "./types";
import {
  countedJobHeads,
  countedJobsOf,
  jobIndexes,
} from "./counted-job-heads";
import { type Flow, type Runtime, addResidentFlow } from "./resident-flows";
export {
  addFlowPart,
  addResidentFlow,
  endFlowPart,
  endResidentFlow,
  reopenResidentFlow,
  setResidentFlowAmount,
} from "./resident-flows";
export {
  limitOutsideSales,
  outputLostPerYear,
  purchaseShareOf,
  scaleOutsideSales,
  shiftPurchaseShare,
  type OutsideSectorFactor,
} from "./outside-sales";
export {
  businessScaleOf,
  countedHeadcountOf,
  countedHeadsOf,
  countedJobHeads,
  countedJobsOf,
} from "./counted-job-heads";

/** A flow and, for a payroll paid twice a month, the other payday's flow, which pays the same jobs. */
function wageHalves(rt: Runtime, flow: Flow): Flow[] {
  const halves = [flow];
  for (const id of flow.partnerFlowIds ?? []) {
    const partner = rt.flows.get(id);
    if (partner && !partner.endedAt) halves.push(partner);
  }
  return halves;
}

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
  for (const half of wageHalves(rt, flow)) {
    const perDay = { ...(half.perDayMinorByJob ?? {}) };
    delete perDay[jobId];
    half.perDayMinorByJob = perDay;
    half.jobIds = (half.jobIds ?? []).filter((id) => id !== jobId);
    recompute(half);
  }
  // Its heads stay on record: the leaver's opening replaces the jobs it held.
  rt.wageFlowByJob.delete(jobId);
  const ended = { ...job, endsAt: makeIsoDate(core.date) };
  rt.jobs.set(jobId, ended);
  countedHouseholdJobChanged(core, ended);
  return ended;
}

/**
 * A counted person is hired: the employer's wage flow grows by their pay.
 * An employer with no counted workers yet (a new business) gets a wage flow
 * on the cadence of `templateJobId`'s; false when there is neither.
 */
export function addCountedJob(
  core: CoreState,
  job: JobInput,
  templateJobId?: string,
  /** The hire's schedule and payday, kept with the household for the day they are met. */
  commitment?: WorkCommitmentInput,
): boolean {
  const rt = residentsRuntime(core);
  if (!rt || (rt.jobs.has(job.id) && rt.jobs.get(job.id)!.endsAt === undefined))
    return false;
  const find = () =>
    [...rt.flows.values()].find(
      (row) =>
        row.kind === "wages" &&
        !row.endedAt &&
        row.organizationId === job.organizationId,
    );
  let flow = find();
  // The template's own wage flow, else any live wage flow in the place (its payday cadence is all that's copied).
  const placeId0 = core.organizations.get(job.organizationId)?.placeId;
  const live = (row: Flow | undefined) =>
    row && row.kind === "wages" && !row.endedAt ? row : undefined;
  const template =
    (templateJobId ? live(rt.wageFlowByJob.get(templateJobId)) : undefined) ??
    (flow
      ? undefined
      : [...rt.flows.values()].find(
          (row) => live(row) && row.placeId === placeId0,
        ));
  if (!flow && template && !template.endedAt) {
    const placeId = core.organizations.get(job.organizationId)?.placeId;
    const account =
      rt.input.accounts.find((row) => row.placeId === placeId)?.accountId ??
      template.payeeId;
    // A public employer's wages come from the treasury that owns its pay
    // authority, as its named staff's do (and a school district's counted
    // staff's at the opening); any other employer pays its own.
    const authorityOwner = core.organizations.get(job.organizationId)
      ?.publicPayAuthority?.ownerId;
    const payerId =
      authorityOwner && core.organizations.has(authorityOwner)
        ? authorityOwner
        : job.organizationId;
    // A twice-monthly payroll starts as both paydays.
    const paydays = wageHalves(rt, template),
      base = `residents:wages:${job.organizationId}:${core.date}`,
      ids = paydays.map((_, index) =>
        paydays.length > 1 ? `${base}:${index}` : base,
      );
    paydays.forEach((payday, index) =>
      addResidentFlow(core, {
        id: ids[index]!,
        kind: "wages",
        financeKind: payday.financeKind,
        payerId,
        payeeId: account,
        residentsId: account,
        placeId: placeId ?? payday.placeId,
        amountMinor: 0,
        firstAt: payday.nextAt,
        cadence: payday.cadence,
        salesReceipt: false,
        marketAdjusted: false,
        organizationId: job.organizationId,
        jobIds: [],
        perDayMinorByJob: {},
        ...(payday.periodFactor !== undefined
          ? { periodFactor: payday.periodFactor }
          : {}),
        ...(ids.length > 1
          ? { partnerFlowIds: ids.filter((_, other) => other !== index) }
          : {}),
        source: job.source,
      }),
    );
    flow = find();
  }
  if (!flow) return false;
  for (const half of wageHalves(rt, flow)) {
    half.perDayMinorByJob = {
      ...(half.perDayMinorByJob ?? {}),
      [job.id]: job.wageDailyMinor,
    };
    half.jobIds = [...(half.jobIds ?? []), job.id];
    recompute(half);
  }
  rt.jobs.set(job.id, job);
  rt.wageFlowByJob.set(job.id, flow);
  countedHouseholdJobChanged(core, job, commitment);
  const index = jobIndexes.get(core);
  if (index?.date === core.date) {
    const set = index.byOrg.get(job.organizationId) ?? new Set<string>();
    set.add(job.id);
    index.byOrg.set(job.organizationId, set);
  }
  return true;
}

/**
 * An employer's annual payroll for the weight of its counted workers: the
 * book's payroll plus what each counted job's household stands for beyond one
 * (the book counts one worker per counted job). Readers that size a cushion
 * for the next paydays read this.
 */
export function weightedPayrollMinor(
  core: CoreState,
  organizationId: string,
  annualPayrollMinor: number,
  daysPerYear: number,
): number {
  let payroll = annualPayrollMinor;
  for (const job of countedJobsOf(core, organizationId))
    payroll +=
      (countedJobHeads(core, job) - 1) * job.wageDailyMinor * daysPerYear;
  return payroll;
}

/**
 * How many times its book a business runs at: its payroll with its counted
 * workers at their weight over the book's payroll (one with no payroll).
 * Every reader of the book's other figures (its demand, its other costs)
 * multiplies by it the same way.
 */
export function staffedScale(
  core: CoreState,
  organizationId: string,
  annualPayrollMinor: number,
  daysPerYear: number,
): number {
  return annualPayrollMinor > 0
    ? weightedPayrollMinor(
        core,
        organizationId,
        annualPayrollMinor,
        daysPerYear,
      ) / annualPayrollMinor
    : 1;
}

/**
 * New hourly pay for many counted workers at once: each employer's wage flow
 * is recomputed once, not once per worker; the flow is found by job from an
 * index, never by scanning every flow. The core's one seam for a counted
 * worker's new pay (`rerateJob` calls it for one). Returns the jobs changed.
 */
export function rerateCountedJobs(
  core: CoreState,
  hourlyByJob: ReadonlyMap<string, number>,
): number {
  const rt = residentsRuntime(core);
  if (!rt) return 0;
  const touched = new Set<Flow>();
  let changed = 0;
  for (const [jobId, hourlyMinor] of hourlyByJob) {
    const job = rt.jobs.get(jobId),
      flow = rt.wageFlowByJob.get(jobId);
    if (!job || !flow || flow.endedAt || !job.hourlyMinor) continue;
    if (flow.perDayMinorByJob?.[jobId] === undefined) continue;
    const ratio = hourlyMinor / job.hourlyMinor;
    for (const half of wageHalves(rt, flow)) {
      const perDay = half.perDayMinorByJob?.[jobId];
      if (perDay === undefined) continue;
      if (!touched.has(half)) {
        half.perDayMinorByJob = { ...half.perDayMinorByJob };
        touched.add(half);
      }
      (half.perDayMinorByJob as Record<string, number>)[jobId] = perDay * ratio;
    }
    const rerated = {
      ...job,
      hourlyMinor,
      wageDailyMinor: Math.round(job.wageDailyMinor * ratio),
    };
    rt.jobs.set(jobId, rerated);
    countedHouseholdJobChanged(core, rerated);
    changed += 1;
  }
  for (const flow of touched) recompute(flow);
  return changed;
}

/**
 * New daily hours for counted workers (`rehourJob` for a job not in the full
 * table): the wage flow's per-day pay for the job scales with the hours, as
 * `rerateCountedJobs` scales it with the rate. Returns the jobs changed.
 */
export function rehourCountedJobs(
  core: CoreState,
  hoursByJob: ReadonlyMap<string, number>,
): number {
  const rt = residentsRuntime(core);
  if (!rt) return 0;
  const touched = new Set<Flow>();
  let changed = 0;
  for (const [jobId, hoursDaily] of hoursByJob) {
    const job = rt.jobs.get(jobId),
      flow = rt.wageFlowByJob.get(jobId);
    if (!job || !flow || flow.endedAt || !job.hoursDaily) continue;
    if (flow.perDayMinorByJob?.[jobId] === undefined) continue;
    const ratio = hoursDaily / job.hoursDaily;
    for (const half of wageHalves(rt, flow)) {
      const perDay = half.perDayMinorByJob?.[jobId];
      if (perDay === undefined) continue;
      if (!touched.has(half)) {
        half.perDayMinorByJob = { ...half.perDayMinorByJob };
        touched.add(half);
      }
      (half.perDayMinorByJob as Record<string, number>)[jobId] = perDay * ratio;
    }
    const rehoured = {
      ...job,
      hoursDaily,
      wageDailyMinor: Math.round(job.wageDailyMinor * ratio),
    };
    rt.jobs.set(jobId, rehoured);
    countedHouseholdJobChanged(core, rehoured);
    changed += 1;
  }
  for (const flow of touched) recompute(flow);
  return changed;
}
