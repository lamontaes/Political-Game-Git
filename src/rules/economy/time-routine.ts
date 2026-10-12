/** Retained routine-minute decisions; clock/history producers are typed common transport requests. */
import {
  addSimulationMinutes,
  compareSimulationMoments,
  sameSimulationMoment,
  simulationMinutesBetween,
} from "../../simulation/dates";
import type { ScheduledActivityPerformanceTiming } from "../../simulation/time-work";
import type {
  World,
  EntityId,
  SimulationMoment,
  ScheduledActivityRecord,
  ScheduledActivityStateRecord,
  RoutineWindow,
} from "../../simulation/types";
export interface TimeRoutineFacts {
  readonly records: World["history"];
  readonly currentMoment: SimulationMoment;
  readonly control: World["control"];
  readonly actionSequence: number;
  readonly sources: TimeRoutineSources;
}
export interface TimeRoutineSources {
  readonly routine?: {
    readonly projectWindows: (
      facts: TimeRoutineFacts,
      target: SimulationMoment,
    ) => readonly RoutineWindow[];
    readonly isAutoResolvableActivity: (
      facts: TimeRoutineFacts,
      id: EntityId,
    ) => boolean;
  };
  readonly stopAtNewTentativeHold?: (
    activity: ScheduledActivityRecord,
  ) => boolean;
}
// STOPGAP: economy.routine-canonical-clock-transport
export type TimeRoutineRequest =
  | { readonly kind: "prepareSchedules" }
  | {
      readonly kind: "ensureScheduled";
      readonly slot: RoutineWindow;
      readonly sourceFacts: TimeRoutineFacts;
    }
  | {
      readonly kind: "recordStoryMoments";
      readonly sourceFacts: TimeRoutineFacts;
    }
  | {
      readonly kind: "canonicalClock";
      readonly sourceFacts: TimeRoutineFacts;
      readonly minutes: number;
      readonly start: SimulationMoment;
      readonly target: SimulationMoment;
      readonly completedActivityId: EntityId | null;
      readonly actionSequence: number;
      readonly historySequence: number;
    };
function cloneMoment(moment: SimulationMoment): SimulationMoment {
  return { ...moment };
}
function* advanceCanonicalMinutes(
  facts: TimeRoutineFacts,
  minutes: number,
  completedActivityId: EntityId | null,
  _sources: TimeRoutineSources,
): Generator<TimeRoutineRequest, TimeRoutineFacts, TimeRoutineFacts> {
  void _sources;
  if (!Number.isSafeInteger(minutes) || minutes <= 0)
    throw new Error(
      "Sub-day time advancement requires positive whole minutes.",
    );
  return yield {
    kind: "canonicalClock",
    sourceFacts: facts,
    minutes,
    start: facts.currentMoment,
    target: addSimulationMinutes(facts.currentMoment, minutes),
    completedActivityId,
    actionSequence: facts.actionSequence,
    historySequence: facts.records.nextSequence,
  };
}
export function* advanceWorldMinutes(
  facts: TimeRoutineFacts,
  minutes: number,
): Generator<TimeRoutineRequest, TimeRoutineFacts, TimeRoutineFacts> {
  const hadRoutine = !!facts.sources.routine;
  const scheduled = yield { kind: "prepareSchedules" };
  let advanced: TimeRoutineFacts;
  if (!hadRoutine) {
    if (
      controlledCommitmentsBlockingMinuteAdvance(scheduled, minutes).length > 0
    )
      return scheduled;
    advanced = yield* advanceStoppingAtNewCommitments(
      scheduled,
      minutes,
      scheduled.sources,
    );
  } else
    advanced = yield* resolveAdvanceWithRoutine(
      scheduled,
      addSimulationMinutes(scheduled.currentMoment, minutes),
      scheduled.sources,
    );
  return compareSimulationMoments(
    advanced.currentMoment,
    scheduled.currentMoment,
  ) === 0
    ? advanced
    : yield { kind: "recordStoryMoments", sourceFacts: advanced };
}
export function latestIndex<T, K>(
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
const ACTIVITY_BY_ID = new WeakMap<
  readonly ScheduledActivityRecord[],
  Map<EntityId, ScheduledActivityRecord>
>();
export function latestActivityStateUnchecked(
  facts: TimeRoutineFacts,
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
export function scheduledActivityState(
  facts: TimeRoutineFacts,
  activityId: EntityId,
): ScheduledActivityStateRecord {
  const activity = latestIndex(
    ACTIVITY_BY_ID,
    facts.records.scheduledActivities,
    (candidate) => candidate.id,
  ).get(activityId);
  const state = latestActivityStateUnchecked(facts, activityId);
  if (!activity || !state) {
    throw new Error(`Missing scheduled activity or state: ${activityId}`);
  }
  return state;
}
export function controlledCommitmentIdsBefore(
  facts: TimeRoutineFacts,
  target: SimulationMoment,
  ignoredActivityId: EntityId | null,
): readonly EntityId[] {
  if (facts.control.kind !== "person") return [];
  const controlledPersonId = facts.control.personId;
  return facts.records.scheduledActivities
    .filter((activity) => activity.id !== ignoredActivityId)
    .filter((activity) =>
      activity.participantPersonIds.includes(controlledPersonId),
    )
    .map((activity) => ({
      activity,
      state: latestActivityStateUnchecked(facts, activity.id),
    }))
    .filter(
      ({ state }) =>
        state?.status === "scheduled" &&
        compareSimulationMoments(state.end, facts.currentMoment) > 0 &&
        compareSimulationMoments(target, state.start) > 0,
    )
    .sort(
      (left, right) =>
        compareSimulationMoments(left.state!.start, right.state!.start) ||
        left.activity.sequence - right.activity.sequence ||
        left.activity.id.localeCompare(right.activity.id),
    )
    .map(({ activity }) => activity.id);
}
export function controlledCommitmentsBlockingMinuteAdvance(
  facts: TimeRoutineFacts,
  minutes: number,
): readonly EntityId[] {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    throw new Error(
      "Sub-day time advancement requires positive whole minutes.",
    );
  }
  return controlledCommitmentIdsBefore(
    facts,
    addSimulationMinutes(facts.currentMoment, minutes),
    null,
  );
}
export function* performRemainingScheduledActivity(
  facts: TimeRoutineFacts,
  activityId: EntityId,
  transitionHandlers: TimeRoutineSources = {},
): Generator<TimeRoutineRequest, TimeRoutineFacts, TimeRoutineFacts> {
  const activity = facts.records.scheduledActivities.find(
    (item) => item.id === activityId,
  );
  const state = activity ? scheduledActivityState(facts, activityId) : null;
  if (
    !activity ||
    !state ||
    state.status !== "scheduled" ||
    facts.control.kind !== "person" ||
    activity.responsiblePersonId !== facts.control.personId ||
    compareSimulationMoments(facts.currentMoment, state.start) <= 0 ||
    compareSimulationMoments(facts.currentMoment, state.end) >= 0
  )
    return facts;
  return yield* concludeScheduledActivity(
    facts,
    activityId,
    transitionHandlers,
  );
}
export function nonRoutineBlockingIds(
  facts: TimeRoutineFacts,
  target: SimulationMoment,
  ignoredActivityId: EntityId | null,
  transitionHandlers: TimeRoutineSources,
): readonly EntityId[] {
  const hook = transitionHandlers.routine;
  return controlledCommitmentIdsBefore(facts, target, ignoredActivityId).filter(
    (id) => !hook?.isAutoResolvableActivity(facts, id),
  );
}
// STOPGAP: economy.routine-half-open-last-state
export function windowOverlapsActivity(
  facts: TimeRoutineFacts,
  slot: {
    start: SimulationMoment;
    end: SimulationMoment;
  },
  activityId: EntityId,
): boolean {
  const state = latestActivityStateUnchecked(facts, activityId);
  if (!state) return false;
  return (
    compareSimulationMoments(slot.start, state.end) < 0 &&
    compareSimulationMoments(state.start, slot.end) < 0
  );
}
// STOPGAP: economy.routine-partial-performance-guards
export function* concludeScheduledActivity(
  facts: TimeRoutineFacts,
  activityId: EntityId,
  transitionHandlers: TimeRoutineSources,
): Generator<TimeRoutineRequest, TimeRoutineFacts, TimeRoutineFacts> {
  const state = scheduledActivityState(facts, activityId);
  if (state.status !== "scheduled") return facts;
  if (compareSimulationMoments(facts.currentMoment, state.start) <= 0)
    return yield* performScheduledActivity(
      facts,
      activityId,
      transitionHandlers,
    );
  if (compareSimulationMoments(facts.currentMoment, state.end) >= 0)
    return facts;
  const remaining = simulationMinutesBetween(facts.currentMoment, state.end);
  if (
    nonRoutineBlockingIds(facts, state.end, activityId, transitionHandlers)
      .length > 0
  )
    return facts;
  return yield* advanceCanonicalMinutes(
    facts,
    remaining,
    activityId,
    transitionHandlers,
  );
}
// STOPGAP: economy.routine-first-source-and-discarded-preparation
export function* completeRoutineWindow(
  facts: TimeRoutineFacts,
  target: SimulationMoment,
  transitionHandlers: TimeRoutineSources,
): Generator<TimeRoutineRequest, TimeRoutineFacts | null, TimeRoutineFacts> {
  const hook = transitionHandlers.routine;
  if (!hook) return null;
  const slot = hook.projectWindows(facts, target)[0];
  if (!slot?.autoResolvable) return null;
  const blockers = nonRoutineBlockingIds(
    facts,
    target,
    null,
    transitionHandlers,
  );
  if (blockers.some((id) => windowOverlapsActivity(facts, slot, id)))
    return null;
  const prepared = yield {
    kind: "ensureScheduled",
    slot: slot,
    sourceFacts: facts,
  };
  if (compareSimulationMoments(slot.end, target) > 0)
    return prepared === facts ? null : prepared;
  const activity = prepared.records.scheduledActivities.find(
    (a) =>
      a.sourceEntityIds.includes(slot.relationshipId) &&
      scheduledActivityState(prepared, a.id).status === "scheduled",
  );
  if (!activity) return null;
  const next = yield* concludeScheduledActivity(
    prepared,
    activity.id,
    transitionHandlers,
  );
  if (next === prepared && prepared === facts) return null;
  if (scheduledActivityState(next, activity.id).status !== "completed")
    return null;
  return next;
}
// STOPGAP: economy.routine-400-and-64-loop-caps
export function* resolveAdvanceWithRoutine(
  facts: TimeRoutineFacts,
  target: SimulationMoment,
  transitionHandlers: TimeRoutineSources,
): Generator<TimeRoutineRequest, TimeRoutineFacts, TimeRoutineFacts> {
  let current = facts;
  for (let step = 0; step < 400; step++) {
    if (compareSimulationMoments(current.currentMoment, target) >= 0)
      return current;
    const completed = yield* completeRoutineWindow(
      current,
      target,
      transitionHandlers,
    );
    if (completed) {
      current = completed;
      continue;
    }
    const remaining = simulationMinutesBetween(current.currentMoment, target);
    const blockers = nonRoutineBlockingIds(
      current,
      target,
      null,
      transitionHandlers,
    );
    if (blockers.length > 0) {
      const stop = scheduledActivityState(current, blockers[0]!).start;
      const minutes = simulationMinutesBetween(current.currentMoment, stop);
      if (minutes > 0)
        current = yield* advanceStoppingAtNewCommitments(
          current,
          minutes,
          transitionHandlers,
        );
      return current;
    }
    return yield* advanceStoppingAtNewCommitments(
      current,
      remaining,
      transitionHandlers,
    );
  }
  throw new Error("Routine time resolution did not converge.");
}
export function scheduledActivityPerformanceTiming(
  facts: TimeRoutineFacts,
  activityId: EntityId,
): ScheduledActivityPerformanceTiming {
  const state = scheduledActivityState(facts, activityId);
  if (state.status !== "scheduled") {
    throw new Error("Only a currently scheduled activity can be performed.");
  }
  const waitMinutes = simulationMinutesBetween(
    facts.currentMoment,
    state.start,
  );
  if (waitMinutes < 0) {
    throw new Error(
      "A scheduled activity cannot be started after its interval began.",
    );
  }
  const activityMinutes = simulationMinutesBetween(state.start, state.end);
  const totalElapsedMinutes = simulationMinutesBetween(
    facts.currentMoment,
    state.end,
  );
  if (totalElapsedMinutes <= 0) {
    throw new Error("Scheduled activity has no remaining future interval.");
  }
  return {
    waitMinutes,
    activityMinutes,
    totalElapsedMinutes,
    targetMoment: cloneMoment(state.end),
  };
}
export function controlledCommitmentsBlockingActivityPerformance(
  facts: TimeRoutineFacts,
  activityId: EntityId,
): readonly EntityId[] {
  const timing = scheduledActivityPerformanceTiming(facts, activityId);
  const activityState = scheduledActivityState(facts, activityId);
  if (!sameSimulationMoment(timing.targetMoment, activityState.end)) {
    throw new Error("Scheduled activity timing projection is inconsistent.");
  }
  return controlledCommitmentIdsBefore(facts, activityState.start, activityId);
}
export function* performScheduledActivity(
  facts: TimeRoutineFacts,
  activityId: EntityId,
  transitionHandlers: TimeRoutineSources = {},
): Generator<TimeRoutineRequest, TimeRoutineFacts, TimeRoutineFacts> {
  const activity = facts.records.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  const state = latestActivityStateUnchecked(facts, activityId);
  if (!activity || state?.status !== "scheduled") {
    throw new Error("Only a currently scheduled activity can be performed.");
  }
  if (!activity.responsiblePersonId || facts.control.kind !== "person") {
    throw new Error("Scheduled activity performance requires person control.");
  }
  if (activity.responsiblePersonId !== facts.control.personId) {
    throw new Error(
      "The controlled person is not responsible for this activity.",
    );
  }
  const timing = scheduledActivityPerformanceTiming(facts, activityId);
  if (
    controlledCommitmentsBlockingActivityPerformance(facts, activityId).length >
    0
  ) {
    return facts;
  }
  return yield* advanceCanonicalMinutes(
    facts,
    timing.totalElapsedMinutes,
    activityId,
    transitionHandlers,
  );
}
export function* advanceStoppingAtNewCommitments(
  facts: TimeRoutineFacts,
  minutes: number,
  transitionHandlers: TimeRoutineSources,
): Generator<TimeRoutineRequest, TimeRoutineFacts, TimeRoutineFacts> {
  let span = minutes;
  for (let attempt = 0; attempt < 64; attempt++) {
    const advanced = yield* advanceCanonicalMinutes(
      facts,
      span,
      null,
      transitionHandlers,
    );
    if (facts.control.kind !== "person") return advanced;
    const personId = facts.control.personId;
    const written = advanced.records.scheduledActivities.slice(
      facts.records.scheduledActivities.length,
    );
    const byId = new Map(
      advanced.records.scheduledActivities.map((entry) => [entry.id, entry]),
    );
    const isStop = (activity: ScheduledActivityRecord): boolean => {
      const holds =
        activity.kind === "travel"
          ? activity.sourceEntityIds.flatMap((id) => {
              const source = byId.get(id);
              return source ? [source] : [];
            })
          : [activity];
      if (holds.length === 0) return true;
      return holds.some(
        (hold) =>
          hold.kind !== "tentative" ||
          (transitionHandlers.stopAtNewTentativeHold?.(hold) ?? false),
      );
    };
    let earliest: SimulationMoment | null = null;
    for (const activity of written) {
      if (!activity.participantPersonIds.includes(personId)) continue;
      if (!isStop(activity)) continue;
      const state = latestActivityStateUnchecked(advanced, activity.id);
      if (state?.status !== "scheduled") continue;
      if (compareSimulationMoments(state.start, facts.currentMoment) <= 0)
        continue;
      if (compareSimulationMoments(state.start, advanced.currentMoment) >= 0)
        continue;
      if (!earliest || compareSimulationMoments(state.start, earliest) < 0)
        earliest = state.start;
    }
    if (!earliest) return advanced;
    span = simulationMinutesBetween(facts.currentMoment, earliest);
  }
  throw new Error("Advancing to a newly scheduled activity did not converge.");
}
