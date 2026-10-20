/**
 * Law reach, group A: a right-to-work law ends the fees a union could require
 * of the workers it represents, so fewer pay it. Union locals live on the
 * dues their members pay (membership-dues.ts, one standing flow from the
 * place's pooled cash to the local). Where a state adopts the law after the
 * opening, the local's dues fall as membership does: about four points of
 * union membership over five years (Fortin, Lemieux and Lloyd, NBER 30098),
 * phased in month by month; where it repeals one that stood at the opening,
 * they rise by the same. A state whose law stood at the opening already has
 * its effect in the membership rate the dues were set from.
 */
import unionData from "../data/business/union-membership.json" with { type: "json" };
import type { CoreAPI, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import { lawChain } from "../modules/laws";
import { residentsRuntime } from "../modules/residents";
import { setResidentFlowAmount } from "../residents-economy";
import { lawApplied } from "./applied";
import type { PolicyHandler } from "./host";
import {
  ensureReachA,
  onReachCalendar,
  reachParameter,
  reachTable,
  REACH_A_MODULE_ID,
  tomorrow,
} from "./group-a-records";

const KIND = "law-reach-a-union-dues";
const ROW = "right-to-work";
const RTW_KEY = "us-policy-positions:labor-workforce.right-to-work";
const UNION_RATES = (
  unionData as { states: Record<string, { membersPct: number }> }
).states;
const UNION_NATION_PCT = (unionData as { nationMembersPct: number })
  .nationMembersPct;

interface RtwRow {
  readonly id: string;
  /** Whether the law stood at the opening, so the dues already show it. */
  readonly baseline: 0 | 1;
  readonly applied: 0 | 1;
  readonly changedOn: string;
  /** The effect on membership, in points, the day the last change began. */
  readonly startPoints: number;
  readonly lawId: string;
  /** Each local's dues before any change from this law. */
  readonly baseMinor: Readonly<Record<string, number>>;
}

const daysBetween = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
  86_400_000;

/** The law's effect on union membership in points, `date` days into its phase-in. */
export function membershipPoints(row: RtwRow, date: string): number {
  const target =
    -reachParameter("rightToWorkMembershipPoints") *
    (row.applied - row.baseline);
  const done = Math.min(
    1,
    daysBetween(row.changedOn, date) /
      (reachParameter("rightToWorkPhaseYears") * 365),
  );
  return row.startPoints + (target - row.startPoints) * done;
}

function localRate(api: CoreAPI): number {
  const state = (api.state as CoreState).placeMetadata?.housingState ?? "";
  return UNION_RATES[state]?.membersPct ?? UNION_NATION_PCT;
}

function table(api: CoreAPI) {
  return reachTable(api, "mechanics");
}

/** The right-to-work row, if the law has ever changed the town's unions. */
export function rightToWorkRow(api: CoreAPI): RtwRow | null {
  if (!api.state.modules.has(REACH_A_MODULE_ID)) return null;
  const found = table(api).get(ROW) as unknown as
    { facts?: RtwRow } | undefined;
  return found?.facts ?? null;
}

function duesFlows(api: CoreAPI) {
  const rt = residentsRuntime(api.state as CoreState);
  const town = lawChain(api).townPlaceId;
  return [...(rt?.flows.values() ?? [])].filter(
    (f) => f.id.startsWith("dues:") && !f.endedAt && f.placeId === town,
  );
}

/** The town's working people who belong to a union, from the state's membership rate. */
function duesPayers(api: CoreAPI): number {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const inTown = (organizationId: string) =>
    core.organizations.get(organizationId)?.placeId === town;
  let employed = 0;
  for (const job of core.jobs.values())
    if (job.endsAt === undefined && inTown(job.organizationId)) employed += 1;
  const rt = residentsRuntime(core);
  for (const job of rt?.jobs.values() ?? [])
    if (
      !core.jobs.has(job.id) &&
      job.endsAt === undefined &&
      inTown(job.organizationId)
    )
      employed += 1;
  return Math.round((employed * localRate(api)) / 100);
}

function save(api: CoreAPI, row: RtwRow, active: boolean): void {
  table(api).put({
    id: ROW,
    key: ROW,
    active,
    since: row.changedOn,
    facts: row,
  } as unknown as ModuleRow);
}

/** Set each local's dues to the membership the law has brought it to. */
function apply(api: CoreAPI, row: RtwRow): RtwRow {
  const core = api.state as CoreState;
  const factor = Math.max(
    0,
    1 + membershipPoints(row, core.date) / localRate(api),
  );
  const base: Record<string, number> = { ...row.baseMinor };
  const flows = duesFlows(api);
  const members = flows.length ? duesPayers(api) : 0;
  for (const flow of flows) {
    base[flow.id] ??= flow.amountMinor;
    const before = flow.amountMinor;
    setResidentFlowAmount(core, flow.id, base[flow.id]! * factor);
    // The local's dues change, on the local and on the workers who pay them,
    // while the law stands (a repeal's slow return is no law applied).
    if (row.applied !== 1) continue;
    const change = flow.amountMinor - before;
    lawApplied(api, {
      key: RTW_KEY,
      lawId: row.lawId,
      targetId: String(flow.payeeId),
      target: "organization",
      engine: REACH_A_MODULE_ID,
      what: "union-dues-changed",
      amountMinor: change,
    });
    if (members > 0)
      lawApplied(api, {
        key: RTW_KEY,
        lawId: row.lawId,
        targetId: `counted-workers:${flow.id}`,
        target: "group",
        engine: REACH_A_MODULE_ID,
        what: "union-fee-not-required",
        count: members,
      });
  }
  return { ...row, baseMinor: base };
}

function schedule(api: CoreAPI, row: RtwRow): void {
  const calendar = api.moduleCalendar(REACH_A_MODULE_ID);
  const next = new Date(`${api.state.date}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1, 1);
  const date = next.toISOString().slice(0, 10);
  const key = `union-dues:${date}`;
  if (calendar.get(key)) return;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation: `${row.lawId}; Fortin, Lemieux and Lloyd, Right-to-Work Laws, Unionization, and Wage Setting (NBER Working Paper 30098, 2022)`,
    estimatedFrom:
      "Union membership falls about four points over five years after a right-to-work law.",
  };
  calendar.schedule({
    key,
    date: date > tomorrow(api.state.date) ? date : tomorrow(api.state.date),
    kind: KIND,
    source,
    sourceRecordIds: [ROW],
  });
}

export const rightToWork: PolicyHandler = (api, change) => {
  ensureReachA(api);
  const date = api.state.date;
  const prior = rightToWorkRow(api);
  const applied: 0 | 1 = change.inForce ? 1 : 0;
  if (!prior) {
    // The first word on the law: a law standing at the opening is the
    // baseline; one enacted later starts its phase-in today.
    if (!change.inForce) return;
    const baseline: 0 | 1 = change.lawId.endsWith(":starting") ? 1 : 0;
    const row = apply(api, {
      id: ROW,
      baseline,
      applied,
      changedOn: date,
      startPoints: 0,
      lawId: change.lawId,
      baseMinor: {},
    });
    save(api, row, true);
    schedule(api, row);
    return;
  }
  if (prior.applied === applied) return;
  const row = apply(api, {
    ...prior,
    applied,
    changedOn: date,
    startPoints: membershipPoints(prior, date),
    lawId: change.lawId,
  });
  save(api, row, change.inForce);
  schedule(api, row);
};

onReachCalendar(KIND, (api) => {
  const row = rightToWorkRow(api);
  if (!row) return;
  const next = apply(api, row);
  save(api, next, next.applied === 1);
  // Keep reviewing until the phase-in is done.
  if (
    daysBetween(next.changedOn, api.state.date) <
    reachParameter("rightToWorkPhaseYears") * 365
  )
    schedule(api, next);
});
