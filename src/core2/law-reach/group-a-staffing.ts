/**
 * Law reach, group A: a public-safety or administration budget line pays for
 * people. When the line changes, each public employer it funds in the town
 * (the police department for police, and so on) is funded for its opening
 * staff times the line against its base; the next morning it posts openings
 * for the positions it is newly funded for, which the jobs engine fills from
 * named and counted seekers alike (each hire records the line), or withdraws
 * them and lays off the line's own hires first, then its newest staff, to
 * match. Where the town has no such employer the funded positions stand on
 * the government's record.
 */
import type { CoreAPI, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import type { PolicyHandler } from "./host";
import { appliedOn, lawApplied, lawNoLongerApplies } from "./applied";
import {
  BUDGETS_MODULE_ID,
  governments,
  lineBeforeBill,
} from "../modules/budgets";
import { countedStaffOf } from "../modules/residents";
import { countedJobsOf } from "../residents-economy";
import {
  fundedOpenings,
  layOffCounted,
  postFundedOpenings,
  withdrawOpening,
} from "../modules/jobs";
import { budgetToday } from "./group-a-money";
import { onReachCalendar } from "./reach-workers";
import {
  currentStaff,
  ensureReachA,
  reachParameter,
  reachTable,
  REACH_A_MODULE_ID,
  specOf,
  STAFFING,
  tomorrow,
  townOrganizations,
  writeRows,
} from "./group-a-records";

const STAFFING_KIND = "law-reach-a-staffing";

export interface StaffingRow {
  readonly id: string;
  readonly key: string;
  readonly organizationId: string;
  readonly baseStaff: number;
  readonly positions: number;
  readonly lawId: string;
  readonly setOn: string;
  /** The fiscal year the base staff was taken in. */
  readonly fiscalYear?: number;
}

/**
 * The staff a line's base funds at one employer this fiscal year. Within a
 * year it is the base the year's first change took. A new year starts from
 * the positions the line it carried in funded: a position the line funded
 * that nobody filled is still funded, so putting the line back cuts only
 * what the change added, never the staff the employer opened with. With no
 * earlier change, it is the staff in place.
 */
export function baseStaffFor(
  held: StaffingRow | null,
  fiscalYear: number,
  inPlace: number,
): number {
  if (!held) return inPlace;
  return held.fiscalYear === fiscalYear ? held.baseStaff : held.positions;
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
    const baseStaff = employers.length
      ? baseStaffFor(
          staffingOf(api, change.key, organizationId),
          budget.fiscalYear,
          currentStaff(api, organizationId).length +
            countedStaffOf(api.state as CoreState, organizationId),
        )
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

onReachCalendar(STAFFING_KIND, (api, work) => {
  const row = reachTable(api, "staffing").get(
    work.sourceRecordIds[0]!,
  ) as unknown as StaffingRow | undefined;
  if (!row) return;
  const state = api.state as CoreState;
  const staff = currentStaff(api, row.organizationId);
  // The employer's counted workers fill positions too, and the line's open
  // openings are positions already funded.
  const counted = countedJobsOf(state, row.organizationId);
  const open = fundedOpenings(api, row.organizationId, row.key);
  const target = Math.round(row.positions);
  const held = staff.length + counted.length;
  let posted = 0;
  const laidOff: { id: string; target: "person" | "group" }[] = [];
  if (target > held + open.length) {
    // The line funds more positions than are held or posted: the employer
    // posts the rest, and the jobs engine's matching fills them from named and
    // counted seekers alike.
    const template = staff[0]?.jobId ?? counted[0]?.id;
    if (template)
      posted = postFundedOpenings(api, {
        organizationId: row.organizationId,
        templateJobId: template,
        count: target - held - open.length,
        key: row.key,
        lawId: row.lawId,
      });
  } else if (target < held + open.length) {
    // Cut back: openings not yet filled are withdrawn first, then the people
    // the line hired go (the newest first), then the newest of the rest.
    let over = held + open.length - target;
    for (const position of [...open].reverse()) {
      if (over <= 0) break;
      withdrawOpening(api, position);
      over -= 1;
    }
    const lineHires = new Map(
      appliedOn(api, row.key)
        .filter((r) => r.what === "hired-on-budget-line")
        .map((r) => [r.targetId, r.since]),
    );
    const named = staff
      .filter((s) => api.state.people.has(s.personId))
      .map((s) => ({ id: s.personId, jobId: s.jobId, counted: false }));
    const wider = counted.map((job) => ({
      id: job.personId,
      jobId: job.id,
      counted: true,
    }));
    const hiredOnLine = [...named, ...wider]
      .filter((o) => lineHires.has(o.id))
      .sort((a, b) => lineHires.get(b.id)!.localeCompare(lineHires.get(a.id)!));
    // The rest: the newest named staff first (staff is oldest first), then
    // the counted workers.
    for (const s of [
      ...hiredOnLine,
      ...named.filter((o) => !lineHires.has(o.id)).reverse(),
      ...wider.filter((o) => !lineHires.has(o.id)),
    ]) {
      if (over <= 0) break;
      if (s.counted) {
        if (!layOffCounted(api, s.jobId)) continue;
      } else api.endJob(s.jobId, work.key);
      laidOff.push({ id: s.id, target: s.counted ? "group" : "person" });
      over -= 1;
    }
  }
  // Someone the line hired who has since left every employer it funds
  // (quit, moved, died) no longer holds a job it pays for.
  const rule = STAFFING[row.key];
  const funded = new Set<string>();
  for (const org of rule ? townOrganizations(api, rule.employers) : []) {
    for (const s of currentStaff(api, org.id)) funded.add(s.personId);
    for (const job of countedJobsOf(state, org.id)) funded.add(job.personId);
  }
  // Put back at or below its base, the line pays for no raise: a raise's
  // hire still on staff (the base had room once others left) holds a base
  // position, and the raise no longer applies to them.
  const raised = row.positions > row.baseStaff;
  for (const r of appliedOn(api, row.key))
    if (
      r.what === "hired-on-budget-line" &&
      (!funded.has(r.targetId) || !raised)
    )
      lawNoLongerApplies(api, row.key, r.targetId);
  for (const s of laidOff)
    lawApplied(api, {
      key: row.key,
      lawId: row.lawId,
      targetId: s.id,
      target: s.target,
      engine: REACH_A_MODULE_ID,
      what: "laid-off-budget-cut",
    });
  if (posted || laidOff.length)
    api.emit({
      id: `law-reach-staffing:${row.id}:${api.state.date}`,
      date: api.state.date,
      kind: "public-staffing-changed",
      personIds: laidOff.filter((s) => s.target === "person").map((s) => s.id),
      placeId: state.organizations.get(row.organizationId)!.placeId,
      source: work.source,
      publicRecord: true,
      news: true,
      facts: {
        organizationId: row.organizationId,
        budgetLine: row.key,
        posted: String(posted),
        laidOff: String(laidOff.length),
        lawId: row.lawId,
      },
    });
});
