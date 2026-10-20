/**
 * Law reach, group A: a public-safety or administration budget line pays for
 * people. When the line changes, each public employer it funds in the town
 * (the police department for police, and so on) is funded for its opening
 * staff times the line against its base; the next morning it hires named
 * adults without work (the most reliable first) or lays off its newest
 * hires to match, through the core's job start and end. Where the town has
 * no such employer the funded positions stand on the government's record.
 */
import type {
  CoreAPI,
  CoreState,
  JobInput,
  Source,
  WorkCommitmentInput,
} from "../types";
import type { ModuleRow } from "../module-data";
import type { PolicyHandler } from "./host";
import { lawApplied, lawNoLongerApplies } from "./applied";
import { BUDGETS_MODULE_ID, governments } from "../modules/budgets";
import { baseLine, budgetToday } from "./group-a-money";
import {
  ageOn,
  currentStaff,
  ensureReachA,
  onReachCalendar,
  reachParameter,
  reachTable,
  REACH_A_MODULE_ID,
  specOf,
  STAFFING,
  tomorrow,
  townOrganizations,
  townPeople,
  writeRows,
} from "./group-a-records";

const STAFFING_KIND = "law-reach-a-staffing";

interface StaffingRow {
  readonly id: string;
  readonly key: string;
  readonly organizationId: string;
  readonly baseStaff: number;
  readonly positions: number;
  readonly lawId: string;
  readonly setOn: string;
}

/** The staffing a budget line funds at one employer, if a change has set it. */
export function staffingOf(
  api: CoreAPI,
  key: string,
  organizationId: string,
): StaffingRow | null {
  if (!api.state.modules.has(REACH_A_MODULE_ID)) return null;
  return (
    (reachTable(api, "staffing").get(`${key}:${organizationId}`) as unknown as
      StaffingRow | undefined) ?? null
  );
}

export const staffing: PolicyHandler = (api, change) => {
  ensureReachA(api);
  const rule = STAFFING[change.key];
  if (!rule || !rule.levels.includes(change.level)) return;
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const line = change.key.slice("budget-line:".length);
  const gov = governments(api).find((g) => g.level === change.level);
  const budget = gov ? budgetToday(api, gov) : null;
  if (!gov || !budget) return;
  const base = baseLine(api, gov, budget, line);
  if (base <= 0) return;
  const ratio = (budget.spendingMinor[line] ?? 0) / base;
  const employers = townOrganizations(api, rule.employers);
  const table = reachTable(api, "staffing");
  const funded = employers.length
    ? employers.map((o) => o.id)
    : [gov.organizationId];
  for (const organizationId of funded) {
    const held = staffingOf(api, change.key, organizationId);
    const baseStaff =
      held?.baseStaff ??
      (employers.length ? currentStaff(api, organizationId).length : 0);
    // With no such employer in the town (a county jail elsewhere), the
    // government's record carries the positions the change funds or cuts.
    const positions = employers.length
      ? baseStaff * ratio
      : ((budget.spendingMinor[line] ?? 0) - base) /
        reachParameter("publicPositionAnnualMinor");
    const row: StaffingRow = {
      id: `${change.key}:${organizationId}`,
      key: change.key,
      organizationId,
      baseStaff,
      positions,
      lawId: change.lawId,
      setOn: api.state.date,
    };
    table.put(row as unknown as ModuleRow);
    writeRows(api, change.key, change.lawId, specOf(change.key, "positions"), [
      {
        id: organizationId,
        personId: null,
        count: Math.round(row.positions),
      },
    ]);
    // The staffing engine read the line: the employer is funded for these
    // positions against the staff it opened with, until the line is back at
    // its base.
    if (Math.abs(row.positions - baseStaff) >= 0.5)
      lawApplied(api, {
        key: change.key,
        lawId: change.lawId,
        targetId: organizationId,
        target: "organization",
        engine: REACH_A_MODULE_ID,
        what: row.positions > baseStaff ? "staff-funded" : "staff-cut",
        count: Math.max(1, Math.round(row.positions)),
      });
    else lawNoLongerApplies(api, change.key, organizationId);
    // Two laws changing the same employer's staffing on one day (a city's
    // and a county's budgets adopted together) share one hiring round: the
    // round reads the latest staffing row when it runs.
    const calendar = api.moduleCalendar(REACH_A_MODULE_ID);
    const key = `staffing:${row.id}:${api.state.date}`;
    if (employers.length && !calendar.get(key))
      calendar.schedule({
        key,
        date: tomorrow(api.state.date),
        kind: STAFFING_KIND,
        source: {
          tag: "SOURCED",
          citation: `Budget line ${line} amended by ${change.lawId}`,
          asOf: api.state.date,
        },
        sourceRecordIds: [row.id],
      });
  }
};

/** Named adults without work, the most reliable first. */
function candidates(api: CoreAPI): readonly string[] {
  const state = api.state as CoreState;
  const date = state.date;
  const from = reachParameter("adultAge");
  const below = reachParameter("hireAgeBelow");
  const score = (traits: Record<string, number>) =>
    (traits["people-mind-v1:reliability"] ?? 0) +
    (traits["personality-v1:facet-duty-bound"] ?? 0);
  return townPeople(api)
    .filter((p) => {
      const age = ageOn(p.birthDate, date);
      if (age < from || age >= below) return false;
      const job = p.jobId ? state.jobs.get(p.jobId) : undefined;
      return !job || job.endsAt !== undefined;
    })
    .sort(
      (a, b) => score(b.traits) - score(a.traits) || a.id.localeCompare(b.id),
    )
    .map((p) => p.id);
}

function hire(
  api: CoreAPI,
  row: StaffingRow,
  personId: string,
  template: { jobId: string },
  source: Source,
): boolean {
  const state = api.state as CoreState;
  const job = state.jobs.get(template.jobId);
  const commitment = [...state.work.commitments.values()].find(
    (c) => c.jobId === template.jobId,
  );
  const calendar = [...state.work.payrollCalendars.values()].find(
    (c) => commitment && c.workCommitmentIds.includes(commitment.id),
  );
  if (!job || !commitment || !calendar) return false;
  const date = state.date;
  const id = `reach-a:${row.organizationId}:${personId}:${date}`;
  const newJob: JobInput = {
    id: `job:${id}`,
    personId,
    organizationId: row.organizationId,
    title: job.title,
    wageDailyMinor: job.wageDailyMinor,
    hoursDaily: job.hoursDaily,
    source,
    ...(job.occupationClassification
      ? { occupationClassification: job.occupationClassification }
      : {}),
    hourlyMinor: commitment.hourlyMinor,
  };
  const newCommitment: WorkCommitmentInput = {
    id: `commitment:${id}`,
    jobId: newJob.id,
    personId,
    organizationId: row.organizationId,
    payrollCalendarId: `calendar:${id}`,
    startsAt: date,
    anchorDate: date,
    periodDays: commitment.periodDays,
    slots: commitment.slots,
    expectedWeeklyMinutes: commitment.expectedWeeklyMinutes,
    hourlyMinor: commitment.hourlyMinor,
    scheduleSource: source,
    paySource: source,
    // The coworker's employer is the new hire's, and so is its public pay authority.
    ...(commitment.publicPayAuthorityId
      ? { publicPayAuthorityId: commitment.publicPayAuthorityId }
      : {}),
  };
  // The new hire is paid on the same calendar as the coworker whose job they copy.
  api.startJob(newJob, newCommitment, {
    ...calendar,
    id: `calendar:${id}`,
    workCommitmentIds: [newCommitment.id],
    basisRecordIds: [row.organizationId, newJob.id, newCommitment.id],
    effectiveFrom: date,
    source,
  });
  return true;
}

onReachCalendar(STAFFING_KIND, (api, work) => {
  const row = reachTable(api, "staffing").get(
    work.sourceRecordIds[0]!,
  ) as unknown as StaffingRow | undefined;
  if (!row) return;
  const staff = currentStaff(api, row.organizationId);
  const target = Math.round(row.positions);
  const hired: string[] = [];
  const laidOff: string[] = [];
  if (target > staff.length && staff.length) {
    const template = staff[0]!;
    for (const personId of candidates(api)) {
      if (staff.length + hired.length >= target) break;
      if (hire(api, row, personId, template, work.source)) hired.push(personId);
      else break;
    }
  } else if (target < staff.length) {
    // The newest hires go first.
    for (const s of [...staff].reverse()) {
      if (staff.length - laidOff.length <= target) break;
      if (!api.state.people.has(s.personId)) continue;
      api.endJob(s.jobId, work.key);
      laidOff.push(s.personId);
    }
  }
  for (const personId of hired)
    lawApplied(api, {
      key: row.key,
      lawId: row.lawId,
      targetId: personId,
      target: "person",
      engine: REACH_A_MODULE_ID,
      what: "hired-on-budget-line",
    });
  for (const personId of laidOff)
    lawApplied(api, {
      key: row.key,
      lawId: row.lawId,
      targetId: personId,
      target: "person",
      engine: REACH_A_MODULE_ID,
      what: "laid-off-budget-cut",
    });
  const toTargets = (ids: readonly string[]) =>
    ids.map((id) => ({ id, personId: id, count: null }));
  writeRows(
    api,
    row.key,
    row.lawId,
    specOf(row.key, "hired"),
    toTargets(hired),
  );
  writeRows(
    api,
    row.key,
    row.lawId,
    specOf(row.key, "laid-off"),
    toTargets(laidOff),
  );
  if (hired.length || laidOff.length)
    api.emit({
      id: `law-reach-staffing:${row.id}:${api.state.date}`,
      date: api.state.date,
      kind: "public-staffing-changed",
      personIds: [...hired, ...laidOff],
      placeId: (api.state as CoreState).organizations.get(row.organizationId)!
        .placeId,
      source: work.source,
      publicRecord: true,
      news: true,
      facts: {
        organizationId: row.organizationId,
        budgetLine: row.key,
        hired: String(hired.length),
        laidOff: String(laidOff.length),
        lawId: row.lawId,
      },
    });
});
