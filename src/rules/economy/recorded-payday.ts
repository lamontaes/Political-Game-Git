/** Retained full saved-flow weekly office-payday selection and shared town payday calendar. */
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import {
  growingIndex,
  recordById,
  type GrowingIndexKind,
} from "./raw-record-index";
import type {
  World,
  EntityId,
  ResourceFlow,
  ResourceFlowTermsRecord,
  IsoDate,
} from "../../simulation/types";
import type { workStatusAt as nativeStatus } from "../../simulation/life-queries";
export interface RecordedPaydayFacts {
  readonly onDate: IsoDate;
  readonly records: Pick<
    World["history"],
    "resourceFlows" | "workRelationships"
  >;
  readonly terms: ReadonlyMap<EntityId, ResourceFlowTermsRecord | null>;
  readonly statuses: ReadonlyMap<EntityId, ReturnType<typeof nativeStatus>>;
}
function resourceFlowTermsAt(facts: RecordedPaydayFacts, id: EntityId) {
  if (!facts.terms.has(id)) throw Error("Missing flow terms receipt: " + id);
  return facts.terms.get(id) ?? null;
}
function workStatusAt(facts: RecordedPaydayFacts, id: EntityId) {
  if (!facts.statuses.has(id))
    throw Error("Missing work status receipt: " + id);
  return facts.statuses.get(id) ?? null;
}
function weekday(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
function lastDayOfMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  );
}
export function nextPaydayDate(date: IsoDate): IsoDate {
  for (let n = 1; n <= 7; n += 1) {
    const next = addDays(date, n);
    if (
      weekday(next) === 5 ||
      next.slice(8, 10) === "15" ||
      next === lastDayOfMonth(next)
    )
      return next;
  }
  throw new Error("No payday within a week.");
}
const OFFICE_CALENDAR_FLOWS: GrowingIndexKind<ResourceFlow[]> = {
  create: () => [],
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (flow.stableKey.startsWith("office-salary:")) flows.push(flow);
  },
};
export function nextRecordedPaydayDate(facts: RecordedPaydayFacts): IsoDate {
  let dueAt = nextPaydayDate(facts.onDate);
  for (const flow of growingIndex(
    OFFICE_CALENDAR_FLOWS,
    facts.records.resourceFlows,
  )) {
    if (flow.basisReference.kind !== "work") continue;
    const terms = resourceFlowTermsAt(facts, flow.id);
    if (terms?.status !== "active" || terms.cadenceKind !== "schedule:weekly")
      continue;
    const work = recordById(
      facts.records.workRelationships,
      flow.basisReference.workRelationshipId,
    );
    if (!work || workStatusAt(facts, work.id)?.status !== "active") continue;
    const week = Math.max(
      1,
      Math.floor(daysBetween(flow.startsAt, facts.onDate) / 7) + 1,
    );
    const officeDue = addDays(flow.startsAt, week * 7);
    if (officeDue < dueAt) dueAt = officeDue;
  }
  return dueAt;
}
