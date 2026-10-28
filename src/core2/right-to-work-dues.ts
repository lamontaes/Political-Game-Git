/**
 * Union dues under a right-to-work law, as the engine that sets them: a
 * right-to-work law ends the fees a union could require of the workers it
 * represents, so fewer pay it and the local's dues fall as membership does
 * (about four points of union membership over five years, Fortin, Lemieux and
 * Lloyd, NBER 30098), phased in month by month; where the law is repealed
 * they rise by the same. Union locals live on the dues their members pay
 * (membership-dues.ts, one standing flow from the place's pooled cash to the
 * local). Each month this reads the law in force, sets each local's dues to
 * the membership the law has brought it to, and records the local and the
 * workers who no longer have to pay a fee (the people they stand for).
 * stopgapId: SG-GOV-REACH-A-union-dues
 */
import { daysBetweenText as daysBetween } from "./kernel/dates";
import { worldUnionRatePct } from "./union-rate";
import type { CoreAPI, CoreState } from "./types";
import { lawChain, lawInForce } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { setResidentFlowAmount } from "./residents-economy";
import { lawApplied } from "./law-reach/applied";
import { reachParameter, REACH_A_MODULE_ID } from "./law-reach/group-a-records";

export const RTW_KEY = "us-policy-positions:labor-workforce.right-to-work";

export interface RtwRow {
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
  const core = api.state as CoreState;
  return worldUnionRatePct(core.seed, core.placeMetadata?.housingState);
}

/** Whether a level of the town's chain has the right-to-work law in force today. */
export function rightToWorkStands(api: CoreAPI): boolean {
  return lawInForce(api, RTW_KEY).levels.some(
    (level) => level.row?.value === 1,
  );
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

/** Set each local's dues to the membership the law has brought it to. */
export function setUnionDues(api: CoreAPI, row: RtwRow): RtwRow {
  const core = api.state as CoreState;
  const factor = Math.max(
    0,
    1 + membershipPoints(row, core.date) / localRate(api),
  );
  const base: Record<string, number> = { ...row.baseMinor };
  const standing = rightToWorkStands(api);
  const flows = duesFlows(api);
  const members = flows.length ? duesPayers(api) : 0;
  for (const flow of flows) {
    base[flow.id] ??= flow.amountMinor;
    const before = flow.amountMinor;
    setResidentFlowAmount(core, flow.id, base[flow.id]! * factor);
    // The local's dues change, on the local and on the workers who pay them,
    // while the law stands (a repeal's slow return is no law applied).
    if (row.applied !== 1 || !standing) continue;
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
