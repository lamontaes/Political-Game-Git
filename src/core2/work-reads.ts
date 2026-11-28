/** The work engine's front door for reads: a person's commitments, a job's last attendance, a payroll calendar. Each function answers one question; none hands back a map. */
import type {
  CoreState,
  WorkAttendanceResult,
  WorkCommitmentInput,
} from "./types";

/** A payroll calendar, as the work engine keeps it. */
export type PayrollCalendar = NonNullable<
  ReturnType<CoreState["work"]["payrollCalendars"]["get"]>
>;

/** One work commitment by its id. */
export function commitmentOf(
  core: CoreState,
  commitmentId: string,
): WorkCommitmentInput | undefined {
  return core.work.commitments.get(commitmentId);
}

/** Every work commitment. */
export function allCommitments(core: CoreState): Iterable<WorkCommitmentInput> {
  return core.work.commitments.values();
}

/** The ids of a person's work commitments. */
export function commitmentIdsOf(
  core: CoreState,
  personId: string,
): ReadonlySet<string> | undefined {
  return core.work.commitmentsByPerson.get(personId);
}

/** A person's work commitments. */
export function commitmentsOf(
  core: CoreState,
  personId: string,
): readonly WorkCommitmentInput[] {
  const out: WorkCommitmentInput[] = [];
  for (const id of core.work.commitmentsByPerson.get(personId) ?? []) {
    const row = core.work.commitments.get(id);
    if (row) out.push(row);
  }
  return out;
}

/** The latest attendance recorded for a job. */
export function lastAttendanceOf(
  core: CoreState,
  jobId: string,
): WorkAttendanceResult | undefined {
  return core.work.lastAttendanceByJob.get(jobId);
}

/** One payroll calendar by its id. */
export function payrollCalendarOf(
  core: CoreState,
  calendarId: string,
): PayrollCalendar | undefined {
  return core.work.payrollCalendars.get(calendarId);
}
