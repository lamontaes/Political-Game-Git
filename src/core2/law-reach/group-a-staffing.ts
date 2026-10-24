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
import { countedParameter, residentsRuntime } from "../modules/residents";
import { fillInPerson } from "../state";
import { budgetToday } from "./group-a-money";
import { onReachCalendar } from "./reach-workers";
import {
  ageOn,
  currentStaff,
  ensureReachA,
  reachParameter,
  reachTable,
  REACH_A_MODULE_ID,
  specOf,
  STAFFING,
  tomorrow,
  townOrganizations,
  townPeople,
  writeRows,
  endRows,
  openReach,
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
  /** The fiscal year the base staff was taken in; a new year starts from the staff then in place. */
  readonly fiscalYear?: number;
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
  // The line before this year's own budget bill: the amount the staff in place
  // was sized for, so a bill's raise or cut reaches the people it funds.
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
      held?.fiscalYear === budget.fiscalYear
        ? held.baseStaff
        : employers.length
          ? currentStaff(api, organizationId).length +
            countedStaff(api, organizationId).length
          : 0;
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
      fiscalYear: budget.fiscalYear,
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
 * counts when the reach hires beside them or lets them go. `startsAt` is the
 * day their work commitment began, the same date a full person's commitment
 * carries, so one hire-date order covers both tiers.
 */
function countedStaff(
  api: CoreAPI,
  organizationId: string,
): readonly { jobId: string; personId: string; startsAt: string }[] {
  const rt = residentsRuntime(api.state as CoreState);
  if (!rt) return [];
  const out: { jobId: string; personId: string; startsAt: string }[] = [];
  for (const flow of rt.flows.values()) {
    if (
      flow.kind !== "wages" ||
      flow.endedAt ||
      flow.organizationId !== organizationId
    )
      continue;
    for (const jobId of flow.jobIds ?? []) {
      const job = rt.jobs.get(jobId);
      // A counted job that has ended is no longer staff.
      if (!job || job.endsAt !== undefined) continue;
      const household = rt.households.get(
        rt.householdOfPerson.get(job.personId) ?? "",
      );
      const commitment = household?.workCommitments.find(
        (c) => c.jobId === jobId,
      );
      out.push({
        jobId,
        personId: job.personId,
        startsAt: commitment?.startsAt ?? "",
      });
    }
  }
  return out.sort((a, b) => a.jobId.localeCompare(b.jobId));
}

/** A reach hire's rank: the more reliable and duty-bound first. The same for a named adult and a counted one. */
function hireScore(traits: Readonly<Record<string, number>>): number {
  return (
    (traits["people-mind-v1:reliability"] ?? 0) +
    (traits["personality-v1:facet-duty-bound"] ?? 0)
  );
}

/**
 * The counted adults whose fill-in gives them an outside job: in a household
 * holding a share of the place's unplaced workers, its first working-age
 * member without work takes the commuter job (the fill-in's own pick). They
 * already work, so they are not jobless candidates in either tier.
 */
function commuters(
  state: CoreState,
  voters: ReadonlyMap<string, { birthDate: string; weeklyMinutes: number }>,
): ReadonlySet<string> {
  const out = new Set<string>();
  const rt = residentsRuntime(state);
  if (!rt) return out;
  const from = countedParameter("countedWorkingAgeFrom");
  const below = countedParameter("countedWorkingAgeBelow");
  for (const h of rt.store.liveHouseholds()) {
    if (h.unplacedWorkers <= 0) continue;
    for (const m of rt.store.countedMembers(h)) {
      const id = rt.store.ids[m]!;
      const voter = voters.get(id);
      if (!voter || voter.weeklyMinutes > 0) continue;
      const age = ageOn(voter.birthDate, state.date);
      if (age < from || age >= below) continue;
      out.add(id);
      break;
    }
  }
  return out;
}

/**
 * Adults without work who could fill a vacancy, named and counted ranked
 * together by one rule (one model, two tiers): the most reliable first, then
 * by id. Filling a counted adult in keeps their traits, so their place in this
 * order is the same before and after.
 */
export function hiringOrder(api: CoreAPI): readonly string[] {
  const state = api.state as CoreState;
  const date = state.date;
  const from = reachParameter("adultAge");
  const below = reachParameter("hireAgeBelow");
  const town = lawChain(api).townPlaceId;
  const ranked: { id: string; score: number }[] = [];
  for (const p of townPeople(api)) {
    const age = ageOn(p.birthDate, date);
    if (age < from || age >= below) continue;
    const job = p.jobId ? state.jobs.get(p.jobId) : undefined;
    if (job && job.endsAt === undefined) continue;
    ranked.push({ id: p.id, score: hireScore(p.traits) });
  }
  const counted = countedResidents(state);
  const working = commuters(state, new Map(counted.map((v) => [v.id, v])));
  for (const voter of counted) {
    const age = ageOn(voter.birthDate, date);
    if (
      voter.placeId !== town ||
      working.has(voter.id) ||
      voter.weeklyMinutes > 0 ||
      age < from ||
      age >= below
    )
      continue;
    ranked.push({ id: voter.id, score: hireScore(voter.traits) });
  }
  return ranked
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((r) => r.id);
}

/**
 * An employer's staff, named and counted, in the order a cut lets them go:
 * the newest hires first across both tiers (latest start, then last job id).
 */
export function layoffOrder(
  api: CoreAPI,
  organizationId: string,
): readonly { jobId: string; personId: string; startsAt: string }[] {
  return [
    ...currentStaff(api, organizationId),
    ...countedStaff(api, organizationId),
  ].sort(
    (a, b) =>
      b.startsAt.localeCompare(a.startsAt) || b.jobId.localeCompare(a.jobId),
  );
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
    for (const personId of hiringOrder(api)) {
      if (headcount + hired.length >= target) break;
      // A counted adult becomes a full person from their records at hire.
      if (!state.people.has(personId)) fillInPerson(state, personId);
      if (hire(api, row, personId, template, work.source)) hired.push(personId);
      else break;
    }
  } else if (target < headcount) {
    // The newest hires go first, whichever tier they are in.
    for (const s of layoffOrder(api, row.organizationId)) {
      if (headcount - laidOff.length <= target) break;
      if (!state.people.has(s.personId)) fillInPerson(state, s.personId);
      if (!state.people.has(s.personId)) continue;
      // Filling a person in keeps their job record; one that ended since the
      // list was made is not laid off again.
      const own = state.jobs.get(s.jobId);
      if (!own || own.endsAt !== undefined) continue;
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
  // Someone hired on the line and now laid off no longer holds the job it funded.
  const hiredSpec = specOf(row.key, "hired").id;
  endRows(
    api,
    row.key,
    hiredSpec,
    new Set(
      openReach(api, row.key)
        .filter((r) => r.spec === hiredSpec && !laidOff.includes(r.targetId))
        .map((r) => r.targetId),
    ),
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
