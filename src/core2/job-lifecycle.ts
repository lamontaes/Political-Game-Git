/**
 * core2-api-v12: one job starts or ends mid-run (shared core seam for OPUS-CORE review).
 * A start admits the job, the person's commitment and its payroll calendar
 * through the existing writers; an end stops future work the way an employer
 * closure does, keeping any wages already earned for the next recorded payday.
 */
import { makeIsoDate } from "../simulation/dates";
import { financeIndex } from "./finance-state";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
import type {
  CoreAPI,
  CoreState,
  JobInput,
  WorkCommitmentInput,
} from "./types";

export function startRecordedJob(
  core: CoreState,
  api: CoreAPI,
  job: JobInput,
  commitment: WorkCommitmentInput,
  calendar: WorkPayrollCalendarInput,
): void {
  const actor = core.people.get(job.personId);
  if (
    !actor ||
    !core.organizations.has(job.organizationId) ||
    core.jobs.has(job.id) ||
    job.endsAt !== undefined
  )
    throw new Error("A job start needs a recorded person and employer.");
  if (actor.jobId && core.jobs.get(actor.jobId)?.endsAt === undefined)
    throw new Error("A person's current job must end before another starts.");
  if (
    commitment.jobId !== job.id ||
    commitment.personId !== job.personId ||
    commitment.organizationId !== job.organizationId ||
    !calendar.workCommitmentIds.includes(commitment.id) ||
    makeIsoDate(commitment.startsAt) < core.date
  )
    throw new Error("A job start's commitment and calendar must be its own.");
  core.jobs.set(job.id, { ...job });
  financeIndex(core.finance.jobsByOrganization, job.organizationId, job.id);
  api.updatePerson(actor.id, { jobId: job.id });
  api.addWorkCommitment(commitment);
  api.addWorkPayrollCalendar(calendar);
}

export function endRecordedJob(
  core: CoreState,
  api: CoreAPI,
  jobId: string,
  sourceId: string,
): void {
  const job = core.jobs.get(jobId);
  if (!job || job.endsAt !== undefined)
    throw new Error("Only a current recorded job can end.");
  const actor = core.people.get(job.personId);
  if (!actor || !core.knowledgeByPerson.has(actor.id))
    throw new Error("Ending job has no recorded worker or knowledge index.");
  // An end takes effect before the day's work (calendar work runs first); a shift already worked today stays a closure's case.
  if (core.work.lastAttendanceByJob.get(jobId)?.date === core.date)
    throw new Error("A job ends before its day's work, from calendar work.");
  job.endsAt = core.date;
  if (actor.jobId === jobId) delete actor.jobId;
  for (const commitmentId of core.work.commitmentsByPerson.get(actor.id) ??
    []) {
    const commitment = core.work.commitments.get(commitmentId)!;
    if (commitment.jobId !== jobId || commitment.endsAt !== undefined) continue;
    commitment.endsAt = core.date;
    const residues = core.work.byPeriodResidue.get(commitment.periodDays);
    for (const [residue, ids] of residues ?? []) {
      ids.delete(commitmentId);
      if (!ids.size) residues!.delete(residue);
    }
    if (residues && !residues.size)
      core.work.byPeriodResidue.delete(commitment.periodDays);
    actor.goals.delete(`work:${commitment.id}`);
  }
  api.observe(actor.id, {
    key: `job:${jobId}:status`,
    value: "ended",
    learnedAt: core.date,
    sourceId,
    access: "self",
  });
}
