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
import { daysBetweenText as daysBetween } from "../kernel/dates";
import type { CoreAPI, Source } from "../types";
import type { ModuleRow } from "../module-data";
import {
  membershipPoints,
  setUnionDues,
  type RtwRow,
} from "../right-to-work-dues";
import type { PolicyHandler } from "./host";
import { onReachCalendar } from "./reach-workers";
import {
  ensureReachA,
  reachParameter,
  reachTable,
  REACH_A_MODULE_ID,
  tomorrow,
} from "./group-a-records";

const KIND = "law-reach-a-union-dues";
const ROW = "right-to-work";
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
  return setUnionDues(api, row);
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
