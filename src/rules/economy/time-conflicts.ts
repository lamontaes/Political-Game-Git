/** Full retained scheduled conflict/half-open interval/latest-state/cache closure. */
import { compareSimulationMoments } from "../../simulation/dates";
import type {
  World,
  EntityId,
  SimulationMoment,
  ScheduledActivityStateRecord,
} from "../../simulation/types";
export interface TimeConflictFacts {
  readonly records: Pick<
    World["history"],
    "scheduledActivities" | "scheduledActivityStates"
  >;
}
// STOPGAP: economy.time-conflict-last-state-frontier
function latestIndex<T, K>(
  cache: WeakMap<readonly T[], Map<K, T>>,
  records: readonly T[],
  keyOf: (record: T) => K,
): Map<K, T> {
  let index = cache.get(records);
  if (!index) {
    index = new Map();
    for (const record of records) index.set(keyOf(record), record);
    cache.set(records, index);
  }
  return index;
}
const LATEST_ACTIVITY_STATE = new WeakMap<
  readonly ScheduledActivityStateRecord[],
  Map<EntityId, ScheduledActivityStateRecord>
>();
function latestActivityStateUnchecked(
  facts: TimeConflictFacts,
  activityId: EntityId,
): ScheduledActivityStateRecord | null {
  return (
    latestIndex(
      LATEST_ACTIVITY_STATE,
      facts.records.scheduledActivityStates,
      (state) => state.activityId,
    ).get(activityId) ?? null
  );
}
function intervalsOverlap(
  leftStart: SimulationMoment,
  leftEnd: SimulationMoment,
  rightStart: SimulationMoment,
  rightEnd: SimulationMoment,
): boolean {
  return (
    compareSimulationMoments(leftStart, rightEnd) < 0 &&
    compareSimulationMoments(rightStart, leftEnd) < 0
  );
}
function conflictingActivityIds(
  facts: TimeConflictFacts,
  participantPersonIds: readonly EntityId[],
  start: SimulationMoment,
  end: SimulationMoment,
  excludedActivityId: EntityId | null,
): EntityId[] {
  const participants = new Set(participantPersonIds);
  return facts.records.scheduledActivities
    .filter((activity) => activity.id !== excludedActivityId)
    .filter((activity) =>
      activity.participantPersonIds.some((personId) =>
        participants.has(personId),
      ),
    )
    .filter((activity) => {
      const state = latestActivityStateUnchecked(facts, activity.id);
      return (
        state?.status === "scheduled" &&
        intervalsOverlap(start, end, state.start, state.end)
      );
    })
    .map((activity) => activity.id)
    .sort();
}
export function scheduledConflictExists(
  facts: TimeConflictFacts,
  participantPersonIds: readonly EntityId[],
  start: SimulationMoment,
  end: SimulationMoment,
): boolean {
  return (
    conflictingActivityIds(facts, participantPersonIds, start, end, null)
      .length > 0
  );
}
