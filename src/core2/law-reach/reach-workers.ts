/**
 * The group A mechanics' dated and payday workers. The registry imports
 * nothing at run time, so a mechanic module may register its worker while the
 * modules that import it are still loading (an election law registers its
 * cost worker from inside the elections engine's own imports).
 */
import type { CoreAPI } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { WorkPayrollJournalReceipt } from "../work-payroll-cash";

export type CalendarWorker = (
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
) => void;
export type PayrollWorker = (
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
) => void;

const calendarWorkers = new Map<string, CalendarWorker>();
const payrollWorkers: PayrollWorker[] = [];

/** A mechanic's dated work (a hire, a layoff) runs on the module's calendar. */
export function onReachCalendar(kind: string, worker: CalendarWorker): void {
  calendarWorkers.set(kind, worker);
}

/** A mechanic that acts on each payday (a payroll premium). */
export function onReachPayroll(worker: PayrollWorker): void {
  if (!payrollWorkers.includes(worker)) payrollWorkers.push(worker);
}

export function runReachCalendar(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  calendarWorkers.get(work.kind)?.(api, work);
}

export function runReachPayroll(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
): void {
  for (const worker of payrollWorkers) worker(api, receipt);
}
