/**
 * Who the jobs engine has displaced from a long job, read from its own
 * records for the health engine (health-own.ts). A business that closes ends
 * every worker's job and a business that cuts its staff lets workers go, the
 * one valued least first (tenure counts for most); the jobs engine writes one
 * `closure` or `layoff` change for each full person (the `changes` table,
 * modules/jobs.ts). The tenure of the job they lost runs from the day they
 * first held it (their work commitment's heldSince, else startsAt, else the
 * world's start, as tenureYears reads it) to the day it ended. Sullivan and
 * von Wachter (2009) find the excess in workers who left long jobs at firms
 * that lost 30% or more of their jobs and none in other separators (section
 * 3.4); the jobs engine keeps no firm peak to test that, but it lets the
 * long-tenured go only after everyone it values less, so a layoff of a worker
 * with years on the job is a deep cut (stopgap SG-HEALTH-own-records-counted
 * names the approximation). Read-only.
 */
import { daysBetweenText } from "./kernel/dates";
import type { CoreAPI, CoreState } from "./types";

/** The jobs module's id (modules/jobs.ts JOBS_MODULE_ID, kept here so the health engine imports no jobs code). */
const JOBS_ID = "jobs";

interface ChangeRow {
  readonly id: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly jobId: string;
  readonly kind: string;
  readonly date: string;
}

export interface Displacement {
  /** The jobs engine's change record: job-change:<date>:<job>:closure or :layoff. */
  readonly recordId: string;
  readonly date: string;
  readonly jobId: string;
  readonly organizationId: string;
  /** Years the lost job had been held when it ended. */
  readonly tenureYears: number;
}

/** Every full person's closures and layoffs, oldest first; empty where no jobs engine runs. */
export function displacementsNow(
  api: CoreAPI,
  daysPerYear: number,
): ReadonlyMap<string, readonly Displacement[]> {
  const out = new Map<string, Displacement[]>();
  const core = api.state as CoreState;
  if (!core.modules.has(JOBS_ID)) return out;
  const store = api.moduleState(JOBS_ID);
  const pay = store.table("pay");
  const closures = store
    .table("changes")
    .query("byKind", ["closure"]) as unknown as ChangeRow[];
  const layoffs = store
    .table("changes")
    .query("byKind", ["layoff"]) as unknown as ChangeRow[];
  for (const row of [...closures, ...layoffs]) {
    // A counted worker is no full person: the counted tier is a stopgap.
    if (!core.people.has(row.personId)) continue;
    const commitment = [
      ...(core.work.commitmentsByPerson.get(row.personId) ?? []),
    ]
      .map((id) => core.work.commitments.get(id))
      .find((one) => one?.jobId === row.jobId);
    const since =
      (pay.get(row.jobId) as { since?: string } | undefined)?.since ??
      commitment?.heldSince ??
      commitment?.startsAt ??
      core.startedAt;
    const days = daysBetweenText(since, row.date);
    const list = out.get(row.personId) ?? [];
    list.push({
      recordId: row.id,
      date: row.date,
      jobId: row.jobId,
      organizationId: row.organizationId,
      tenureYears: Math.max(0, days / daysPerYear),
    });
    out.set(row.personId, list);
  }
  for (const list of out.values())
    list.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
