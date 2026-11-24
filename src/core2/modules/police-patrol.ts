/**
 * Patrol hours. Once a month, for each place with a police department, one
 * row (`patrol:<place>:<month>`) holds the hours the police are paid for:
 * the paid hours of every open job whose post resolves to the police line
 * (`lineForPost`, the post-line table in src/core2/data/budgets/treasury-spending.json),
 * full people's jobs and counted people's jobs alike, a counted job for as
 * many heads as it stands for. The police budget line in force is the limit:
 * where the line's wage money for the month is less than the staff's pay,
 * the hours it pays fall in the same proportion (a cut is felt the next
 * month, before anyone is let go), and where it is more, the hours are the
 * staff's own (a raise is felt once officers are hired on it). Counted groups
 * carry no police of their own, so the row stands for the whole place.
 *
 * The table keeps the last twelve months of each place; older rows are
 * dropped as each month is written.
 *
 * Nothing here is rolled: hours follow the department's recorded staff and
 * budget. Every paid police-line hour counts as patrol (see the stopgap
 * SG-WORLD-patrol-all-police-hours).
 */
import { registerModule } from "../state";
import { moduleCalendar } from "../module-calendar";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  budgetInForce,
  employerGovernment,
  lineForPost,
  lineWageShare,
  treasuryParameter,
} from "../budgets-treasury";
import { BUDGETS_MODULE_ID, type GovernmentRow } from "./budgets";
import { countedJobHeads, countedJobsOf } from "./residents";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState } from "../types";

export const PATROL_MODULE_ID = "core2-patrol-v1";
/** The line police pay draws on (src/core2/data/budgets/treasury-spending.json postLines). */
const POLICE_LINE = "police";
/** After the budgets' month has closed on the 1st and the crime engine's on the 4th. */
const SCHEDULE_DAY = "05";
const RUN_KIND = "patrol-month";
const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);

export interface PatrolMonth {
  /** patrol:<place>:<month> */
  id: string;
  placeId: string;
  month: string;
  date: string;
  /** The governments whose police line pays the place's police. */
  governmentIds: string[];
  /** People on the police line (a counted job for its heads). */
  staff: number;
  /** Hours the staff's jobs are paid for this month. */
  staffHours: number;
  /** What the staff are paid this month, in minor units. */
  staffPayMinor: number;
  /** The month's wage money on the police lines in force, in minor units (null where no budget is in force). */
  lineWagesMinor: number | null;
  /** Patrol hours: the staff's hours, limited by what the line's wages pay. */
  hours: number;
}

const table = (api: CoreAPI) =>
  api.moduleState(PATROL_MODULE_ID).table("months");
const core = (api: CoreAPI) => api.state as CoreState;

interface Tally {
  govs: Map<string, GovernmentRow>;
  staff: number;
  hours: number;
  pay: number;
}

function run(api: CoreAPI): void {
  const c = core(api);
  if (!c.modules.has(BUDGETS_MODULE_ID)) return;
  const month = api.state.date.slice(0, "YYYY-MM".length);
  // stopgapId: SG-WORLD-patrol-all-police-hours
  api.stopgap("SG-WORLD-patrol-all-police-hours");
  const monthDays =
    treasuryParameter("daysPerYear") / treasuryParameter("monthsPerYear");
  const byPlace = new Map<string, Tally>();
  for (const org of c.organizations.values()) {
    if (!org.placeId) continue;
    const gov = employerGovernment(api, org.id);
    if (!gov || gov.level === "federal") continue;
    // A police department (its class draws on the police line) has a row
    // even on a month its staff have all left.
    const department =
      lineForPost(gov.level, "", org.classification) === POLICE_LINE;
    const tally = byPlace.get(org.placeId) ?? {
      govs: new Map<string, GovernmentRow>(),
      staff: 0,
      hours: 0,
      pay: 0,
    };
    let found = department;
    const add = (wageDailyMinor: number, hoursDaily: number, heads: number) => {
      tally.staff += heads;
      tally.hours += hoursDaily * monthDays * heads;
      tally.pay += wageDailyMinor * monthDays * heads;
      found = true;
    };
    for (const jobId of c.finance.jobsByOrganization.get(org.id) ?? []) {
      const job = c.jobs.get(jobId);
      if (
        job &&
        job.endsAt === undefined &&
        lineForPost(gov.level, job.id, org.classification) === POLICE_LINE
      )
        add(job.wageDailyMinor, job.hoursDaily, 1);
    }
    for (const job of countedJobsOf(c, org.id))
      if (lineForPost(gov.level, job.id, org.classification) === POLICE_LINE)
        add(job.wageDailyMinor, job.hoursDaily, countedJobHeads(c, job));
    if (!found) continue;
    tally.govs.set(gov.id, gov);
    byPlace.set(org.placeId, tally);
  }
  for (const [placeId, tally] of [...byPlace].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const id = `patrol:${placeId}:${month}`;
    if (table(api).get(id)) continue;
    let lineWages: number | null = null;
    for (const gov of tally.govs.values()) {
      const budget = budgetInForce(api, gov.id);
      if (!budget) continue;
      lineWages =
        (lineWages ?? 0) +
        ((budget.spendingMinor[POLICE_LINE] ?? 0) *
          lineWageShare(api, POLICE_LINE)) /
          treasuryParameter("monthsPerYear");
    }
    const paid =
      lineWages === null || tally.pay <= 0
        ? 1
        : Math.min(1, lineWages / tally.pay);
    const row: PatrolMonth = {
      id,
      placeId,
      month,
      date: api.state.date,
      governmentIds: [...tally.govs.keys()].sort(),
      staff: tally.staff,
      staffHours: tally.hours,
      staffPayMinor: Math.round(tally.pay),
      lineWagesMinor: lineWages === null ? null : Math.round(lineWages),
      hours: tally.hours * paid,
    };
    table(api).put(row as unknown as ModuleRow);
    // The table keeps a year: the row a year back goes (no engine reads older).
    table(api).remove(`patrol:${placeId}:${monthsBefore(month, 12)}`);
  }
}

export const PATROL_MODULE: CoreModule = {
  id: PATROL_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { months: {} },
  },
  onCalendarWork(api, work) {
    if (work.kind !== RUN_KIND) return;
    run(api);
    schedule(api, nextRunAfter(api.state.date));
  },
};

/** A month (YYYY-MM) some months before another. */
function monthsBefore(month: string, back: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) - back;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** The first 5th of a month after a date. */
function nextRunAfter(date: string): string {
  const next = monthOf(addDays(makeIsoDate(`${monthOf(date)}-01`), 32));
  return `${next}-${SCHEDULE_DAY}`;
}

function schedule(api: CoreAPI, date: string): void {
  scheduleOn(core(api), date);
}

function scheduleOn(state: CoreState, date: string): void {
  moduleCalendar(state, PATROL_MODULE_ID).schedule({
    key: `${RUN_KIND}:${date}`,
    date,
    kind: RUN_KIND,
    source: {
      tag: "ESTIMATED",
      estimatedFrom: "The budgets and crime engines' own month-close days.",
      asOf: state.date,
      citation:
        "The budgets' month closes on the 1st, the crime engine's on the 4th.",
    },
    sourceRecordIds: ["patrol:months"],
  });
}

export function openPatrol(state: CoreState): void {
  if (state.modules.has(PATROL_MODULE_ID)) return;
  registerModule(state, PATROL_MODULE);
  // The month's row is written on the 5th: this month's if it is still ahead.
  const today = state.date;
  scheduleOn(
    state,
    today.slice(-2) <= SCHEDULE_DAY
      ? `${monthOf(today)}-${SCHEDULE_DAY}`
      : nextRunAfter(today),
  );
}

/** A place's patrol-hours row for a month (YYYY-MM), by its id. */
export function patrolMonth(
  api: CoreAPI,
  placeId: string,
  month: string,
): PatrolMonth | undefined {
  if (!core(api).modules.has(PATROL_MODULE_ID)) return undefined;
  return table(api).get(`patrol:${placeId}:${month}`) as unknown as
    PatrolMonth | undefined;
}
