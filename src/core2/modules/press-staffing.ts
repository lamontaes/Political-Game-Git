import type { CoreAPI, CoreState } from "../types";
import { type StaffRow, STAFF_ROLES } from "../press-staff";
import { residentsRuntime } from "./residents";
import { countedJobsOf } from "./residents";
import { JOBS_MODULE_ID } from "./jobs";
import { addDays, makeIsoDate, daysBetweenText } from "../kernel/dates";
import { lawChain } from "./laws";
import type { ModuleRow } from "../module-data";
import { fillInPerson } from "../state";
import { ownerOf } from "./business";
import { pressStaffChanged } from "../press-conflict";
import {
  installOutletMoney,
  outsideCustomersOf,
  payWiderAudience,
  payMarket,
  outletYearlyRevenue,
} from "../press-money";
import { spendLivingCost } from "./executive";
import {
  PRESS_MODULE_ID,
  expectedRevenueYearMinor,
  openOfKind,
  outletMoneyDeps,
  outletsHere,
  outsideNewsroomYearMinor,
  table,
} from "./press-base";

/** A town outlet's people: its head and reporters, with their roles. */
export function staffOf(api: CoreAPI, outletId: string): readonly StaffRow[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return table(api, "staff").query("byOutlet", [
    outletId,
  ]) as unknown as StaffRow[];
}

/**
 * Whether a person holds a job today: a full person's own job, or a job in
 * the counted workforce that the person was hired into (a hire from the
 * counts becomes a named person on the desk but keeps the counted job, and
 * may hold another job as well).
 */
function holdsJob(core: CoreState, personId: string, jobId: string): boolean {
  const job = core.jobs.get(jobId) ?? residentsRuntime(core)?.jobs.get(jobId);
  return (
    !!job &&
    job.personId === personId &&
    job.endsAt === undefined &&
    (core.people.get(personId)?.jobId === jobId || !core.jobs.has(jobId))
  );
}

/** Why one of an outlet's people left: death, a move, or the jobs engine's record. */
function whyLeft(api: CoreAPI, row: StaffRow): string {
  const person = api.state.people.get(row.id);
  if (!person?.alive) return "died";
  if (!row.jobId) return "unknown";
  if (!api.state.modules.has(JOBS_MODULE_ID)) return "left-job";
  const changes = api.moduleState(JOBS_MODULE_ID).table("changes");
  // The departure fell within the week since the last check.
  for (let back = 0; back < 7; back += 1) {
    const date = addDays(makeIsoDate(api.state.date), -back);
    for (const kind of ["layoff", "quit", "left-work", "closure"])
      if (changes.get(`job-change:${date}:${row.jobId}:${kind}`)) return kind;
  }
  return person.placeId === lawChain(api).townPlaceId ? "left-job" : "moved";
}

/**
 * Refresh the masthead from employment records. The jobs engine alone fills
 * vacancies; a reporter hired from the counts becomes a named person when
 * they join the desk. Off-town staff have no modeled payroll yet, so a death
 * leaves that role vacant rather than manufacturing another person.
 */
export function refreshPressStaff(api: CoreAPI): void {
  const core = api.state as CoreState;
  for (const outlet of outletsHere(api)) {
    const rows = [...staffOf(api, outlet.id)];
    for (const row of rows) {
      if (row.role === "owner" || row.leftOn) continue;
      const person = core.people.get(row.id);
      if (
        person?.alive &&
        (row.jobId === null || holdsJob(core, person.id, row.jobId))
      )
        continue;
      table(api, "staff").put({
        ...row,
        leftOn: core.date,
        leftBecause: whyLeft(api, row),
      } as unknown as ModuleRow);
    }
    // Indexed employer jobs, plus the very same jobs held by counted people.
    const jobs = [
      ...[...(core.finance.jobsByOrganization.get(outlet.organizationId) ?? [])]
        .map((id) => core.jobs.get(id)!)
        .filter((job) => job && job.endsAt === undefined),
      ...countedJobsOf(core, outlet.organizationId),
    ].sort((a, b) => a.id.localeCompare(b.id));
    for (const job of jobs) {
      const role = STAFF_ROLES.find(
        (row) => row.payParameter !== null && row.title === job.title,
      );
      if (!role) continue;
      const previous = table(api, "staff").get(job.personId) as
        StaffRow | undefined;
      if (previous?.jobId === job.id && !previous.leftOn) continue;
      const person = fillInPerson(core, job.personId);
      if (!person.alive || !holdsJob(core, person.id, job.id)) continue;
      table(api, "staff").put({
        id: person.id,
        outletId: outlet.id,
        role: role.id,
        jobId: job.id,
        hiredOn: core.work.commitmentsByPerson.get(person.id)
          ? ([...core.work.commitmentsByPerson.get(person.id)!]
              .map((id) => core.work.commitments.get(id)!)
              .find((row) => row.jobId === job.id)?.startsAt ?? core.date)
          : core.date,
      } as unknown as ModuleRow);
    }
    const active = staffOf(api, outlet.id).filter((row) => !row.leftOn);
    const heads = active.filter((row) => row.role === "head");
    const headId =
      heads.find((row) => row.id === outlet.headId)?.id ?? heads[0]?.id ?? null;
    const reporterIds = active
      .filter((row) => row.role === "reporter")
      .map((row) => row.id);
    table(api, "outlets").put({
      ...outlet,
      ownerId: ownerOf(api, outlet.organizationId) ?? outlet.ownerId,
      headId,
      reporterIds,
    } as unknown as ModuleRow);
  }
  pressStaffChanged(api);
}

/**
 * When a paper closes, the papers left share its market: each takes the
 * readers and newsroom that the market now divides into, by the same formulas
 * as at the opening, and its books' demand and cost are reset to them.
 */
export function reassessSharedMarkets(api: CoreAPI): void {
  const core = api.state as CoreState;
  const enrolled = table(api, "employerEnrollment");
  const open = openOfKind(api, "newspaper");
  for (const outlet of outletsHere(api)) {
    if (outlet.kind !== "newspaper" || outlet.tier === "national") continue;
    const book = core.finance.businesses.get(outlet.organizationId);
    const row = enrolled.get(outlet.id) as unknown as
      { papers?: number } | undefined;
    if (!book || book.closedAt || !row || row.papers === open) continue;
    const demand = expectedRevenueYearMinor(api, outlet);
    const cost = outsideNewsroomYearMinor(
      api,
      outlet,
      staffOf(api, outlet.id).filter((s) => !s.leftOn).length,
    );
    book.anchorAnnualDemandMinor = book.annualDemandMinor = demand;
    book.capacityMinor = demand;
    book.anchorAnnualOtherCostsMinor = book.annualOtherCostsMinor = cost;
    enrolled.put({ ...row, papers: open } as unknown as ModuleRow);
  }
}

/**
 * The first press week of each month, each outlet's yearly revenue is
 * last month's, times twelve.
 */
export function reviewOutletRevenue(api: CoreAPI, monthStart: boolean): void {
  const deps = outletMoneyDeps(api);
  // A restored world has no money hooks until the press puts them back.
  installOutletMoney(api, deps);
  const core = api.state as CoreState;
  const payer = outsideCustomersOf(core, lawChain(api).townPlaceId);
  payWiderAudience(api, deps, payer, api.parameter("daysPerWeek"));
  if (!monthStart) return;
  reassessSharedMarkets(api);
  payMarket(api, deps, payer);
  const last = addDays(makeIsoDate(`${core.date.slice(0, 7)}-01`), -1).slice(
    0,
    7,
  );
  const yearly = outletYearlyRevenue(api, deps, last);
  for (const outlet of outletsHere(api)) {
    const revenue = yearly.get(outlet.organizationId);
    if (revenue === undefined || revenue === outlet.audienceRevenueMinor)
      continue;
    table(api, "outlets").put({
      ...outlet,
      audienceRevenueMinor: revenue,
    } as unknown as ModuleRow);
  }
}

/** Press people given a household cost (owners, and staff from outside the town) spend what it came to since last week out of what they hold. */
export function pressPeopleLive(api: CoreAPI): void {
  for (const raw of table(api, "staff").rows()) {
    const row = raw as unknown as StaffRow;
    if (!row.livedThrough || row.livedThrough >= api.state.date) continue;
    spendLivingCost(
      api,
      row.id,
      daysBetweenText(row.livedThrough, api.state.date),
    );
    table(api, "staff").put({
      ...row,
      livedThrough: api.state.date,
    } as unknown as ModuleRow);
  }
}
