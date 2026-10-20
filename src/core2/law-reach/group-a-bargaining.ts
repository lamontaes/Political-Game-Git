/**
 * Law reach, group A: a public-sector bargaining law lets the workers of
 * public employers bargain through a union, and bargained pay runs above what
 * unrepresented public workers earn (the public-sector union wage premium).
 * Where a state adopts the law after the opening, each public job in town is
 * raised toward its pay before the law times the premium, phased in month by
 * month over the first contract years through `rerateJob`. A repeal ends the
 * phase-in and takes no one's pay back (a repeal ends the right, not a
 * contract already paid). A law that stood at the opening is already in the
 * pay the jobs were set from.
 */
import type { CoreAPI, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import { PUBLIC_EMPLOYER_CLASSES } from "../public-pay-floor";
import type { PolicyHandler } from "./host";
import { jobsAt } from "./group-b-money";
import { payReach } from "./pay-reach";
import {
  ensureReachA,
  onReachCalendar,
  reachParameter,
  reachTable,
  REACH_A_MODULE_ID,
  tomorrow,
} from "./group-a-records";

const KIND = "law-reach-a-bargaining";
const ROW = "public-bargaining";
const BARGAINING_KEY =
  "us-policy-positions:labor-workforce.public-sector-collective-bargaining";

interface BargainingRow {
  readonly id: string;
  readonly lawId: string;
  readonly changedOn: string;
  /** Each job's hourly pay before the law, by job id. */
  readonly baseMinor: Readonly<Record<string, number>>;
}

const daysBetween = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
  86_400_000;

const table = (api: CoreAPI) => reachTable(api, "mechanics");

/** The bargaining row, once the law has been enacted after the opening. */
export function bargainingRow(
  api: CoreAPI,
): { active: boolean; facts: BargainingRow } | null {
  if (!api.state.modules.has(REACH_A_MODULE_ID)) return null;
  const found = table(api).get(ROW) as unknown as
    { active: boolean; facts?: BargainingRow } | undefined;
  return found?.facts ? { active: found.active, facts: found.facts } : null;
}

/** The share of the premium paid on `date`, sliding from 0 to 1. */
export function premiumShare(row: BargainingRow, date: string): number {
  return Math.min(
    1,
    daysBetween(row.changedOn, date) /
      (reachParameter("publicBargainingPhaseYears") * 365),
  );
}

function save(api: CoreAPI, row: BargainingRow, active: boolean): void {
  table(api).put({
    id: ROW,
    key: ROW,
    active,
    since: row.changedOn,
    facts: row,
  } as unknown as ModuleRow);
}

/** Raise each public job toward its bargained pay; returns the row with new bases. */
function apply(api: CoreAPI, row: BargainingRow): BargainingRow {
  const core = api.state as CoreState;
  const share = premiumShare(row, core.date);
  const premium = reachParameter("publicBargainingPayPremium");
  const base: Record<string, number> = { ...row.baseMinor };
  const source: Source = {
    tag: "ESTIMATED",
    asOf: core.date,
    citation: `${row.lawId}; public-sector union wage premium`,
    estimatedFrom:
      "Public workers who bargain through a union are paid about five percent more than those who do not.",
  };
  const reach = payReach(api, {
    key: BARGAINING_KEY,
    lawId: row.lawId,
    engine: REACH_A_MODULE_ID,
    what: "bargained-pay-raised",
  });
  for (const job of jobsAt(api, PUBLIC_EMPLOYER_CLASSES)) {
    const hourly = job.hourlyMinor ?? 0;
    if (hourly <= 0) continue;
    base[job.id] ??= hourly;
    const target = Math.ceil(base[job.id]! * (1 + premium * share));
    // Pay already above the bargained level (a floor, a raise) stays.
    if (target > hourly) {
      api.rerateJob(job.id, target, source);
      reach.add(job, (job.wageDailyMinor * (target - hourly)) / hourly);
    }
  }
  reach.flush();
  return { ...row, baseMinor: base };
}

function schedule(api: CoreAPI, row: BargainingRow): void {
  const calendar = api.moduleCalendar(REACH_A_MODULE_ID);
  const next = new Date(`${api.state.date}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1, 1);
  const date = next.toISOString().slice(0, 10);
  const key = `${ROW}:${date}`;
  if (calendar.get(key)) return;
  calendar.schedule({
    key,
    date: date > tomorrow(api.state.date) ? date : tomorrow(api.state.date),
    kind: KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: row.lawId,
      estimatedFrom: "Public-sector union wage premium, phased in.",
    },
    sourceRecordIds: [ROW],
  });
}

export const publicBargaining: PolicyHandler = (api, change) => {
  ensureReachA(api);
  const prior = bargainingRow(api);
  if (!change.inForce) {
    // A repeal ends the phase-in; pay already bargained stays.
    if (prior?.active) save(api, prior.facts, false);
    return;
  }
  // A law standing at the opening is already in the pay the jobs opened with.
  if (change.lawId.endsWith(":starting")) return;
  if (prior?.active) return;
  const row = apply(api, {
    id: ROW,
    lawId: change.lawId,
    changedOn: api.state.date,
    baseMinor: {},
  });
  save(api, row, true);
  schedule(api, row);
};

onReachCalendar(KIND, (api) => {
  const held = bargainingRow(api);
  if (!held?.active) return;
  const next = apply(api, held.facts);
  save(api, next, true);
  if (
    daysBetween(next.changedOn, api.state.date) <
    reachParameter("publicBargainingPhaseYears") * 365
  )
    schedule(api, next);
});
