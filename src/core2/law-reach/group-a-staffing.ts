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
  lineWithoutBills,
  type GovernmentRow,
} from "../modules/budgets";
import { countedStaffOf, residentsRuntime } from "../modules/residents";
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
  /** The government whose line it is. */
  readonly governmentId?: string;
}

/**
 * Whether a bill's change still raises a government's line: the line today
 * against the year's adopted line less every change bills have carried into
 * it. A raise carried into a new fiscal year still counts; once the old
 * amount is put back, none does, whatever the year's own adoption added.
 */
export function lineRaisedByBills(
  api: CoreAPI,
  gov: GovernmentRow,
  line: string,
): boolean {
  const budget = budgetToday(api, gov);
  if (!budget) return false;
  return (
    (budget.spendingMinor[line] ?? 0) >
    lineWithoutBills(api, gov, budget.fiscalYear, line)
  );
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

/**
 * The government pays the positions its line funds, so its own row names the
 * pay the line commits to them for a year (paid out is negative): the funded
 * positions themselves where the town has no such employer, else the ones
 * its employers were funded for. The row is set to that pay, not added to.
 */
function paysPositions(
  api: CoreAPI,
  change: Parameters<PolicyHandler>[1],
  governmentOrganizationId: string,
  added: number,
  employed: boolean,
): void {
  const what = added > 0 ? "staff-funded" : "staff-cut";
  if (Math.abs(added) < 0.5) {
    if (employed) lawNoLongerApplies(api, change.key, governmentOrganizationId);
    return;
  }
  const held = appliedOn(api, change.key).find(
    (r) => r.targetId === governmentOrganizationId && r.lawId === change.lawId,
  );
  const pay = -Math.round(added * reachParameter("publicPositionAnnualMinor"));
  lawApplied(api, {
    key: change.key,
    lawId: change.lawId,
    targetId: governmentOrganizationId,
    target: "organization",
    engine: REACH_A_MODULE_ID,
    what: employed ? (added > 0 ? "positions-paid" : "positions-cut") : what,
    count: Math.max(1, Math.round(Math.abs(added))),
    amountMinor: pay - (held?.amountMinor ?? 0),
  });
}

export const staffing: PolicyHandler = (api, change) => {
  ensureReachA(api);
  const rule = STAFFING[change.key];
  if (!rule) return;
  // A line funds the staff of the government that runs the town's department:
  // its city or county. A place with no city or county government (a territory,
  // the District) is run by its state-level government, whose line funds them.
  const localIsState =
    change.level === "state" &&
    !governments(api).some((g) => g.level === "city" || g.level === "county");
  if (!rule.levels.includes(change.level) && !localIsState) return;
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  const line = change.key.slice("budget-line:".length);
  const gov = governments(api).find((g) => g.level === change.level);
  const budget = gov ? budgetToday(api, gov) : null;
  if (!gov || !budget) return;
  // The line before this year's own budget bill: the amount the staff in place
  // was sized for, so a bill's raise or cut reaches the people it funds.
  const base = lineBeforeBill(api, gov, budget.fiscalYear, line);
  const employers = townOrganizations(api, rule.employers);
  // An employer's staff grow with its line by the ratio of the line to what
  // it began the year at, so a line that began at nothing has no ratio; with
  // no such employer in the town, the positions are the added money over what
  // a position costs, which a line that began at nothing has too.
  if (base <= 0 && employers.length) return;
  const ratio = base > 0 ? (budget.spendingMinor[line] ?? 0) / base : 1;
  const table = reachTable(api, "staffing");
  const funded = employers.length
    ? employers.map((o) => o.id)
    : [gov.organizationId];
  let added = 0;
  for (const organizationId of funded) {
    const held = staffingOf(api, change.key, organizationId);
    const inPlace = employers.length
      ? currentStaff(api, organizationId).length +
        countedStaffOf(api.state as CoreState, organizationId)
      : 0;
    const baseStaff = employers.length
      ? baseStaffFor(held, budget.fiscalYear, inPlace)
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
      governmentId: gov.id,
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
    added += row.positions - baseStaff;
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
  paysPositions(api, change, gov.organizationId, added, employers.length > 0);
};

/**
 * An employer's staff, named and counted, in the order a cut lets them go:
 * the newest hires first across both tiers (latest start, then last job id).
 * One model, two tiers: a counted worker's start is the date of their work
 * commitment in the household, the same date a full person's carries, so
 * filling one in does not move them.
 */
export function layoffOrder(
  api: CoreAPI,
  organizationId: string,
): readonly {
  jobId: string;
  personId: string;
  startsAt: string;
  counted: boolean;
}[] {
  const state = api.state as CoreState;
  const named = currentStaff(api, organizationId)
    .filter((s) => state.people.has(s.personId))
    .map((s) => ({ ...s, counted: false }));
  const rt = residentsRuntime(state);
  const wider = countedJobsOf(state, organizationId).map((job) => {
    const household = rt?.households.get(
      rt.householdOfPerson.get(job.personId) ?? "",
    );
    const commitment = household?.workCommitments.find(
      (c) => c.jobId === job.id,
    );
    return {
      jobId: job.id,
      personId: job.personId,
      startsAt: commitment?.startsAt ?? "",
      counted: true,
    };
  });
  return [...named, ...wider].sort(
    (a, b) =>
      b.startsAt.localeCompare(a.startsAt) || b.jobId.localeCompare(a.jobId),
  );
}

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
    const everyone = layoffOrder(api, row.organizationId);
    const hiredOnLine = everyone
      .filter((o) => lineHires.has(o.personId))
      .sort((a, b) =>
        lineHires.get(b.personId)!.localeCompare(lineHires.get(a.personId)!),
      );
    // The rest: the newest hires first across both tiers (the same order for
    // a named person and a counted one).
    for (const s of [
      ...hiredOnLine,
      ...everyone.filter((o) => !lineHires.has(o.personId)),
    ]) {
      if (over <= 0) break;
      if (s.counted) {
        if (!layOffCounted(api, s.jobId)) continue;
      } else api.endJob(s.jobId, work.key);
      laidOff.push({
        id: s.personId,
        target: s.counted ? "group" : "person",
      });
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
  // With no bill's raise left in the line, a raise's hire still on staff
  // (the base had room once others left, or the year's adoption grew the
  // line) holds a base position, and the raise no longer applies to them. A
  // raise carried into a new fiscal year still funds its hires.
  const lineGov = row.governmentId
    ? governments(api).find((g) => g.id === row.governmentId)
    : undefined;
  const raised = lineGov
    ? lineRaisedByBills(api, lineGov, row.key.slice("budget-line:".length))
    : row.positions > row.baseStaff;
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
