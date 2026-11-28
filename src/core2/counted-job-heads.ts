/**
 * The counted population's job heads: the counted jobs a firm or a household
 * holds, by its job index, and the heads and staffed scale those jobs make.
 * They import only the residents runtime and types, so a reader takes them
 * without loading the residents economy's ring; residents-economy.ts re-exports
 * each one.
 */
import { residentsRuntime } from "./residents-reads";
import type { CoreState, JobInput } from "./types";

/** The counted workers of an employer, by job, from its live wage flows. */
export function countedJobsOf(
  core: CoreState,
  organizationId: string,
): JobInput[] {
  const rt = residentsRuntime(core);
  if (!rt) return [];
  const out: JobInput[] = [];
  for (const jobId of jobIndex(core).get(organizationId) ?? []) {
    const flow = rt.wageFlowByJob.get(jobId),
      job = rt.jobs.get(jobId);
    // The index can run ahead of fill-in and endings within a day: check each job is still counted and open.
    if (
      flow &&
      !flow.endedAt &&
      flow.organizationId === organizationId &&
      job &&
      job.endsAt === undefined
    )
      out.push(job);
  }
  return out;
}

/**
 * How many real jobs an employer's counted workers stand for: each counted
 * job is worth the heads its employer's staffing set (`countedJobHeads`). Readers that count heads read this; readers that
 * pick one worker keep the record from `countedJobsOf`.
 */
export function countedHeadcountOf(
  core: CoreState,
  organizationId: string,
): number {
  if (!residentsRuntime(core)?.store) return 0;
  let heads = 0;
  for (const job of countedJobsOf(core, organizationId))
    heads += countedJobHeads(core, job);
  return heads;
}

/**
 * How many businesses one business record stands for: its staff in heads
 * over its job records, a counted worker's record standing for its
 * household's weight (one with no staff, and one in a town whose households
 * each stand for one). A full owner is one household and owns one of them.
 */
export function businessScaleOf(
  core: CoreState,
  organizationId: string,
): number {
  let rows = 0;
  for (const jobId of core.finance.jobsByOrganization.get(organizationId) ?? [])
    if (core.jobs.get(jobId)?.endsAt === undefined) rows += 1;
  const full = rows;
  rows += countedJobsOf(core, organizationId).length;
  return rows ? (full + countedHeadcountOf(core, organizationId)) / rows : 1;
}

/**
 * How many real jobs one counted job stands for: its worker's household
 * weight, unless its employer's staffing set it otherwise (`CountedStore.
 * headsOfJob`); one where the counts no longer hold the worker.
 */
export function countedJobHeads(
  core: CoreState,
  job: Pick<JobInput, "id" | "personId">,
): number {
  const store = residentsRuntime(core)?.store;
  const m = store?.countedMember(job.personId);
  const home =
    store && m !== undefined
      ? store.households[store.household[m]!]
      : undefined;
  return store && home ? store.headsOfJob(home, job.id) : 1;
}

/** How many people one counted person's record stands for: their household's weight (one where the counts no longer hold them). */
export function countedHeadsOf(core: CoreState, personId: string): number {
  const store = residentsRuntime(core)?.store;
  const m = store?.countedMember(personId);
  const home =
    store && m !== undefined
      ? store.households[store.household[m]!]
      : undefined;
  return store && home ? store.weightOf(home) : 1;
}

/** Counted jobs by employer, rebuilt once a day and kept current by this file's hires. */
export const jobIndexes = new WeakMap<
  CoreState,
  { date: string; byOrg: Map<string, Set<string>> }
>();

function jobIndex(core: CoreState): Map<string, Set<string>> {
  const cached = jobIndexes.get(core);
  if (cached && cached.date === core.date) return cached.byOrg;
  const byOrg = new Map<string, Set<string>>();
  for (const [jobId, flow] of residentsRuntime(core)?.wageFlowByJob ?? []) {
    if (!flow.organizationId) continue;
    const set = byOrg.get(flow.organizationId) ?? new Set<string>();
    set.add(jobId);
    byOrg.set(flow.organizationId, set);
  }
  jobIndexes.set(core, { date: core.date, byOrg });
  return byOrg;
}
