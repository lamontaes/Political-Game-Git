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
import {
  BUDGETS_MODULE_ID,
  governments,
  lineBeforeBill,
} from "../modules/budgets";
import { countedResidents } from "../electorate";
import { lawChain } from "../modules/laws";
import { residentsRuntime } from "../modules/residents";
import { fillInPerson } from "../state";
import { budgetToday } from "./group-a-money";
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
  // The line before this year's budget bill and any act amending it: a change
  // the body adopts (the bill included) is what the line's staff follows.
  const base = lineBeforeBill(api, gov, budget.fiscalYear, line);
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
      (employers.length
        ? currentStaff(api, organizationId).length +
          countedStaff(api, organizationId).length
        : 0);
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

/**
 * An employer's staff in the wider population, held in its counted wage flows
 * (a school district's teachers): one model, two tiers, so a line change
 * reaches them as it reaches the full staff. Each is filled in from the
 * counts when the reach hires beside them or lets them go.
 */
function countedStaff(
  api: CoreAPI,
  organizationId: string,
): readonly { jobId: string; personId: string }[] {
  const rt = residentsRuntime(api.state as CoreState);
  if (!rt) return [];
  const out: { jobId: string; personId: string }[] = [];
  for (const flow of rt.flows.values()) {
    if (
      flow.kind !== "wages" ||
      flow.endedAt ||
      flow.organizationId !== organizationId
    )
      continue;
    for (const jobId of flow.jobIds ?? []) {
      const job = rt.jobs.get(jobId);
      if (job) out.push({ jobId, personId: job.personId });
    }
  }
  return out.sort((a, b) => a.jobId.localeCompare(b.jobId));
}

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

/**
 * The town's counted adults with no work in their records, in the same order
 * (one model, two tiers: the same adults a full person's jobless neighbors
 * are). One of them is filled in from the counts at hire.
 */
function countedCandidates(api: CoreAPI): readonly string[] {
  const state = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const from = reachParameter("adultAge");
  const below = reachParameter("hireAgeBelow");
  const score = (traits: Readonly<Record<string, number>>) =>
    (traits["people-mind-v1:reliability"] ?? 0) +
    (traits["personality-v1:facet-duty-bound"] ?? 0);
  return countedResidents(state)
    .filter((voter) => {
      const age = ageOn(voter.birthDate, state.date);
      return (
        voter.placeId === town &&
        voter.weeklyMinutes <= 0 &&
        age >= from &&
        age < below
      );
    })
    .sort(
      (a, b) => score(b.traits) - score(a.traits) || a.id.localeCompare(b.id),
    )
    .map((voter) => voter.id);
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
  const state = api.state as CoreState;
  const counted = countedStaff(api, row.organizationId);
  const full = currentStaff(api, row.organizationId);
  const headcount = full.length + counted.length;
  const target = Math.round(row.positions);
  const hired: string[] = [];
  const laidOff: string[] = [];
  if (target > headcount && headcount) {
    // Hires copy a coworker's job; a district staffed only from the counts
    // fills one of them in to be the template.
    if (!full.length) fillInPerson(state, counted[0]!.personId);
    const template = currentStaff(api, row.organizationId)[0];
    if (!template) return;
    for (const personId of [...candidates(api), ...countedCandidates(api)]) {
      if (headcount + hired.length >= target) break;
      // A counted adult becomes a full person from their records at hire.
      if (!state.people.has(personId)) fillInPerson(state, personId);
      if (hire(api, row, personId, template, work.source)) hired.push(personId);
      else break;
    }
  } else if (target < headcount) {
    // The newest hires go first; the counted staff follow, last job id first.
    const order = [...[...full].reverse(), ...[...counted].reverse()];
    for (const s of order) {
      if (headcount - laidOff.length <= target) break;
      if (!state.people.has(s.personId)) fillInPerson(state, s.personId);
      if (!state.people.has(s.personId)) continue;
      api.endJob(s.jobId, work.key);
      laidOff.push(s.personId);
    }
  }
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
