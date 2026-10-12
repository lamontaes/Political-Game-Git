/** Full retained scheduled/work identity and sequence/date availability query closure; first record wins exactly as Native. */
import type {
  EntityId,
  World,
  ScheduledActivityRecord,
  ScheduledActivityStateRecord,
  WorkItemRecord,
  WorkItemStateRecord,
} from "../../simulation/types";
export interface TimeRecordFacts {
  readonly records: Pick<
    World["history"],
    | "scheduledActivities"
    | "scheduledActivityStates"
    | "workItems"
    | "workItemStates"
  >;
}
// STOPGAP: economy.time-record-first-wins
const RECORD_INDEX_ACTIVITY = new WeakMap<
  readonly ScheduledActivityRecord[],
  Map<EntityId, ScheduledActivityRecord>
>();
const RECORD_INDEX_ACTIVITY_STATE = new WeakMap<
  readonly ScheduledActivityStateRecord[],
  Map<EntityId, ScheduledActivityStateRecord>
>();
const RECORD_INDEX_WORK = new WeakMap<
  readonly WorkItemRecord[],
  Map<EntityId, WorkItemRecord>
>();
const RECORD_INDEX_WORK_STATE = new WeakMap<
  readonly WorkItemStateRecord[],
  Map<EntityId, WorkItemStateRecord>
>();
function byId<
  T extends {
    readonly id: EntityId;
  },
>(
  cache: WeakMap<readonly T[], Map<EntityId, T>>,
  records: readonly T[],
): Map<EntityId, T> {
  let index = cache.get(records);
  if (!index) {
    index = new Map();
    for (const record of records)
      if (!index.has(record.id)) index.set(record.id, record);
    cache.set(records, index);
  }
  return index;
}
function timeWorkRecordById(
  facts: TimeRecordFacts,
  id: EntityId,
):
  | ScheduledActivityRecord
  | ScheduledActivityStateRecord
  | WorkItemRecord
  | WorkItemStateRecord
  | null {
  const h = facts.records;
  return (
    byId(RECORD_INDEX_ACTIVITY, h.scheduledActivities).get(id) ??
    byId(RECORD_INDEX_ACTIVITY_STATE, h.scheduledActivityStates).get(id) ??
    byId(RECORD_INDEX_WORK, h.workItems).get(id) ??
    byId(RECORD_INDEX_WORK_STATE, h.workItemStates).get(id) ??
    null
  );
}
export function timeWorkEntityExists(
  facts: TimeRecordFacts,
  id: EntityId,
): boolean {
  return timeWorkRecordById(facts, id) !== null;
}
export function timeWorkEntityAvailableAt(
  facts: TimeRecordFacts,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = timeWorkRecordById(facts, id);
  if (!record || record.sequence >= sequenceExclusive) return false;
  const moment = "createdAt" in record ? record.createdAt : record.recordedAt;
  return moment.date <= asOfDate;
}
