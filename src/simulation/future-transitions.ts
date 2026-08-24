import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  incidentEntityAvailableAt,
  incidentEntityExists,
} from "./incident-integrity";
import { lifeEntityAvailableAt, lifeEntityExists } from "./life-integrity";
import {
  resourceHousingEntityAvailableAt,
  resourceHousingEntityExists,
} from "./resource-integrity";
import type {
  EntityId,
  FutureDueItem,
  FutureDueItemProvenance,
  FutureDueItemStateRecord,
  FutureDueItemStatus,
  FutureDueReasonKey,
  FutureTransitionHandler,
  FutureTransitionHandlerRegistry,
  FutureTransitionKey,
  HistoricalCutoff,
  IsoDate,
  World,
} from "./types";
import {
  assertSemanticTransitionKey,
  worldMetricEntityAvailableAt,
  worldMetricEntityExists,
} from "./world-metrics";
import { assertWorldIntegrity } from "./world";

export interface ScheduleFutureDueItemInput {
  readonly stableKey: string;
  readonly dueAt: string;
  readonly transitionKey: FutureTransitionKey;
  readonly entityIds: readonly EntityId[];
  readonly jurisdictionId: EntityId | null;
  readonly provenance: FutureDueItemProvenance;
}

export interface SetFutureDueItemTerminalStateInput {
  readonly stableKey: string;
  readonly dueItemId: EntityId;
  readonly effectiveAt: string;
  readonly status: "resolved" | "cancelled" | "blocked";
  readonly reasonKey: FutureDueReasonKey | null;
  readonly context: string | null;
  readonly outcomeEventId: EntityId | null;
}

export interface CancelFutureDueItemInput {
  readonly stableKey: string;
  readonly dueItemId: EntityId;
  readonly effectiveAt: string;
  readonly reasonKey: FutureDueReasonKey;
  readonly context: string | null;
}

const FUTURE_DUE_ITEM_STATUSES = [
  "scheduled",
  "resolved",
  "cancelled",
  "blocked",
] as const;

function isFutureDueItemStatus(value: unknown): value is FutureDueItemStatus {
  return (
    typeof value === "string" &&
    FUTURE_DUE_ITEM_STATUSES.includes(value as FutureDueItemStatus)
  );
}

function assertTerminalFutureDueItemStatus(
  value: unknown,
): asserts value is Exclude<FutureDueItemStatus, "scheduled"> {
  if (!isFutureDueItemStatus(value) || value === "scheduled") {
    throw new Error(
      `Invalid terminal future due-item status: ${String(value)}`,
    );
  }
}

export function createFutureTransitionHandlerRegistry(
  entries: readonly (readonly [FutureTransitionKey, FutureTransitionHandler])[],
): FutureTransitionHandlerRegistry {
  const handlers = new Map<FutureTransitionKey, FutureTransitionHandler>();
  for (const [key, handler] of entries) {
    assertSemanticTransitionKey(key, "Future transition key");
    if (handlers.has(key)) {
      throw new Error(`Duplicate future-transition handler: ${key}`);
    }
    handlers.set(key, handler);
  }
  return { get: (transitionKey) => handlers.get(transitionKey) };
}

export const EMPTY_FUTURE_TRANSITION_HANDLERS =
  createFutureTransitionHandlerRegistry([]);

export function scheduleFutureDueItem(
  world: World,
  input: ScheduleFutureDueItemInput,
): World {
  assertUniqueStableKey(
    world.history.futureDueItems,
    input.stableKey,
    "future due item",
  );
  assertSemanticTransitionKey(input.transitionKey, "Future transition key");
  const scheduledAt = makeIsoDate(world.currentDate);
  const dueAt = makeIsoDate(input.dueAt);
  if (dueAt <= scheduledAt) {
    throw new Error("A future due item must be due after its scheduling date.");
  }
  const entityIds = canonicalEntityIds(
    input.entityIds,
    "Future due-item entities",
  );
  if (entityIds.length === 0) {
    throw new Error(
      "A future due item must reference at least one canonical entity.",
    );
  }
  if (
    input.jurisdictionId !== null &&
    !world.jurisdictions[input.jurisdictionId]
  ) {
    throw new Error(
      `Future due item has missing jurisdiction: ${input.jurisdictionId}`,
    );
  }
  for (const id of entityIds) {
    if (
      !canonicalEntityAvailable(
        world,
        id,
        scheduledAt,
        world.history.nextSequence,
      )
    ) {
      throw new Error(
        `Future due item references an unavailable entity: ${id}`,
      );
    }
  }
  validateDueProvenance(
    world,
    input.provenance,
    scheduledAt,
    world.history.nextSequence,
  );
  const dueItem: FutureDueItem = {
    id: createStableId("future-due-item", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    scheduledAt,
    dueAt,
    transitionKey: input.transitionKey,
    entityIds,
    jurisdictionId: input.jurisdictionId,
    provenance: cloneDueProvenance(input.provenance),
  };
  const stateStableKey = `${input.stableKey}:state:scheduled`;
  const scheduledState: FutureDueItemStateRecord = {
    id: createStableId(
      "future-due-item-state",
      `${world.id}:${stateStableKey}`,
    ),
    stableKey: stateStableKey,
    sequence: world.history.nextSequence + 1,
    dueItemId: dueItem.id,
    effectiveAt: scheduledAt,
    status: "scheduled",
    reasonKey: null,
    context: null,
    outcomeEventId: null,
    supersedesStateId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    futureDueItems: [...world.history.futureDueItems, dueItem],
    futureDueItemStates: [...world.history.futureDueItemStates, scheduledState],
  });
}

export function setFutureDueItemTerminalState(
  world: World,
  input: SetFutureDueItemTerminalStateInput,
): World {
  assertUniqueStableKey(
    world.history.futureDueItemStates,
    input.stableKey,
    "future due-item state",
  );
  assertTerminalFutureDueItemStatus(input.status);
  const dueItem = world.history.futureDueItems.find(
    (candidate) => candidate.id === input.dueItemId,
  );
  if (!dueItem) throw new Error(`Missing future due item: ${input.dueItemId}`);
  const effectiveAt = makeIsoDate(input.effectiveAt);
  if (effectiveAt < dueItem.scheduledAt || effectiveAt > world.currentDate) {
    throw new Error("Future due-item state has invalid effective chronology.");
  }
  if (input.status !== "cancelled" && effectiveAt !== dueItem.dueAt) {
    throw new Error(
      "A resolved or blocked future due item must transition on its due date.",
    );
  }
  if (input.status === "cancelled" && effectiveAt > dueItem.dueAt) {
    throw new Error(
      "A future due item cannot be cancelled after its due date.",
    );
  }
  const previous = latestDueItemStateAtCurrentFrontier(world, dueItem.id);
  if (!previous || previous.status !== "scheduled") {
    throw new Error(
      "Only a scheduled future due item may enter a terminal state.",
    );
  }
  if (input.status === "blocked" && input.reasonKey === null) {
    throw new Error(
      "A blocked future due item requires a structured reason key.",
    );
  }
  if (input.reasonKey !== null) {
    assertSemanticTransitionKey(input.reasonKey, "Future due-item reason key");
  }
  assertOptional(input.context, "Future due-item context");
  if (input.outcomeEventId !== null) {
    const event = world.history.events.find(
      (candidate) => candidate.id === input.outcomeEventId,
    );
    if (
      !event ||
      event.sequence <= dueItem.sequence ||
      event.sequence >= world.history.nextSequence ||
      event.occurredAt !== dueItem.dueAt ||
      event.recordedAt > effectiveAt
    ) {
      throw new Error(
        "Future due-item outcome event is unavailable or mismatched.",
      );
    }
  }
  const record: FutureDueItemStateRecord = {
    id: createStableId(
      "future-due-item-state",
      `${world.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    dueItemId: dueItem.id,
    effectiveAt,
    status: input.status,
    reasonKey: input.reasonKey,
    context: input.context,
    outcomeEventId: input.outcomeEventId,
    supersedesStateId: previous.id,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    futureDueItemStates: [...world.history.futureDueItemStates, record],
  });
}

export function cancelFutureDueItem(
  world: World,
  input: CancelFutureDueItemInput,
): World {
  return setFutureDueItemTerminalState(world, {
    ...input,
    status: "cancelled",
    outcomeEventId: null,
  });
}

export function futureDueItemStateAt(
  world: World,
  dueItemId: EntityId,
  cutoff: HistoricalCutoff,
): FutureDueItemStateRecord | null {
  validateCutoff(world, cutoff);
  return (
    world.history.futureDueItemStates
      .filter(
        (record) =>
          record.dueItemId === dueItemId &&
          record.effectiveAt <= cutoff.asOfDate &&
          record.sequence < cutoff.historySequenceExclusive,
      )
      .sort(bySequence)
      .at(-1) ?? null
  );
}

export function scheduledFutureDueItemsThrough(
  world: World,
  fromInclusive: IsoDate,
  throughInclusive: IsoDate,
): readonly FutureDueItem[] {
  return world.history.futureDueItems
    .filter((item) => {
      const state = latestDueItemStateAtCurrentFrontier(world, item.id);
      return (
        state?.status === "scheduled" &&
        item.dueAt >= fromInclusive &&
        item.dueAt <= throughInclusive
      );
    })
    .sort(compareDueItems);
}

export function resolveFutureDueItemsThrough(
  world: World,
  throughDate: IsoDate,
  registry: FutureTransitionHandlerRegistry,
): World {
  let working = world;
  const startingDate = world.currentDate;
  const initiallyDue = scheduledFutureDueItemsThrough(
    world,
    startingDate,
    throughDate,
  );
  for (const item of initiallyDue) {
    if (!registry.get(item.transitionKey)) {
      throw new Error(
        `Missing future-transition handler for due item ${item.id}: ${item.transitionKey}`,
      );
    }
  }

  while (true) {
    const item = scheduledFutureDueItemsThrough(
      working,
      startingDate,
      throughDate,
    )[0];
    if (!item) return working;
    const handler = registry.get(item.transitionKey);
    if (!handler) {
      throw new Error(
        `Missing future-transition handler for due item ${item.id}: ${item.transitionKey}`,
      );
    }
    const atDueDate: World = { ...working, currentDate: item.dueAt };
    const unchangedInput = JSON.stringify(atDueDate);
    const dueItemsBefore = atDueDate.history.futureDueItems;
    const dueStatesBefore = atDueDate.history.futureDueItemStates;
    const result = handler(atDueDate, item);
    if (JSON.stringify(atDueDate) !== unchangedInput) {
      throw new Error("Future-transition handler mutated its input world.");
    }
    if (
      result.world.id !== world.id ||
      result.world.currentDate !== item.dueAt ||
      result.world.actionSequence !== world.actionSequence
    ) {
      throw new Error(
        "Future-transition handler changed world identity, time, or action sequence.",
      );
    }
    const resultDueItems = result.world.history.futureDueItems;
    const resultDueStates = result.world.history.futureDueItemStates;
    if (
      JSON.stringify(resultDueItems.slice(0, dueItemsBefore.length)) !==
        JSON.stringify(dueItemsBefore) ||
      JSON.stringify(resultDueStates.slice(0, dueStatesBefore.length)) !==
        JSON.stringify(dueStatesBefore)
    ) {
      throw new Error(
        "Future-transition handlers cannot rewrite existing due-item history.",
      );
    }
    const appendedDueItemIds = new Set(
      resultDueItems
        .slice(dueItemsBefore.length)
        .map((candidate) => candidate.id),
    );
    if (
      resultDueStates
        .slice(dueStatesBefore.length)
        .some(
          (state) =>
            state.status !== "scheduled" ||
            !appendedDueItemIds.has(state.dueItemId),
        )
    ) {
      throw new Error(
        "Future-transition handlers may only schedule new future due items.",
      );
    }
    assertWorldIntegrity(result.world);
    working = setFutureDueItemTerminalState(result.world, {
      stableKey: `${item.stableKey}:state:${result.status}:${item.dueAt}`,
      dueItemId: item.id,
      effectiveAt: item.dueAt,
      status: result.status,
      reasonKey: result.reasonKey,
      context: result.context,
      outcomeEventId: result.outcomeEventId,
    });
  }
}

export function futureTransitionHistoryRecords(
  world: World,
): readonly (FutureDueItem | FutureDueItemStateRecord)[] {
  return [
    ...world.history.futureDueItems,
    ...world.history.futureDueItemStates,
  ];
}

export function futureTransitionEntityExists(
  world: World,
  id: EntityId,
): boolean {
  return (
    world.history.futureDueItems.some((record) => record.id === id) ||
    world.history.futureDueItemStates.some((record) => record.id === id)
  );
}

export function futureTransitionEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const item = world.history.futureDueItems.find((record) => record.id === id);
  if (item)
    return item.scheduledAt <= asOfDate && item.sequence < sequenceExclusive;
  const state = world.history.futureDueItemStates.find(
    (record) => record.id === id,
  );
  return !!(
    state &&
    state.effectiveAt <= asOfDate &&
    state.sequence < sequenceExclusive
  );
}

export function assertFutureTransitionIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  assertSequenceOrdered(world.history.futureDueItems, "future due item");
  assertSequenceOrdered(
    world.history.futureDueItemStates,
    "future due-item state",
  );
  const keys = new Set<string>();
  const itemById = new Map<EntityId, FutureDueItem>();
  for (const item of world.history.futureDueItems) {
    assertHistoryIdentity(ids, world, item, "future-due-item");
    if (keys.has(item.stableKey)) {
      throw new Error(
        `Duplicate future due-item stable key: ${item.stableKey}`,
      );
    }
    keys.add(item.stableKey);
    makeIsoDate(item.scheduledAt);
    makeIsoDate(item.dueAt);
    if (item.dueAt <= item.scheduledAt) {
      throw new Error(`Future due item has impossible chronology: ${item.id}`);
    }
    assertSemanticTransitionKey(item.transitionKey, "Future transition key");
    canonicalEntityIds(item.entityIds, "Future due-item entities");
    if (item.entityIds.length === 0) {
      throw new Error(`Future due item has no referenced entity: ${item.id}`);
    }
    if (
      item.jurisdictionId !== null &&
      !world.jurisdictions[item.jurisdictionId]
    ) {
      throw new Error(`Future due item has missing jurisdiction: ${item.id}`);
    }
    for (const id of item.entityIds) {
      if (
        !canonicalEntityAvailable(world, id, item.scheduledAt, item.sequence)
      ) {
        throw new Error(`Future due item has unavailable entity: ${item.id}`);
      }
    }
    validateDueProvenance(
      world,
      item.provenance,
      item.scheduledAt,
      item.sequence,
    );
    itemById.set(item.id, item);
  }

  const priorByItem = new Map<EntityId, FutureDueItemStateRecord[]>();
  const stateKeys = new Set<string>();
  for (const state of world.history.futureDueItemStates) {
    assertHistoryIdentity(ids, world, state, "future-due-item-state");
    if (stateKeys.has(state.stableKey)) {
      throw new Error(
        `Duplicate future due-item state key: ${state.stableKey}`,
      );
    }
    stateKeys.add(state.stableKey);
    const item = itemById.get(state.dueItemId);
    if (!item || item.sequence >= state.sequence) {
      throw new Error(
        `Future due-item state has missing prior item: ${state.id}`,
      );
    }
    makeIsoDate(state.effectiveAt);
    if (!isFutureDueItemStatus(state.status)) {
      throw new Error(`Future due-item state has invalid status: ${state.id}`);
    }
    if (
      state.effectiveAt < item.scheduledAt ||
      state.effectiveAt > world.currentDate
    ) {
      throw new Error(
        `Future due-item state has invalid chronology: ${state.id}`,
      );
    }
    const prior = priorByItem.get(item.id) ?? [];
    const previous = prior.at(-1);
    if (state.status === "scheduled") {
      if (
        previous !== undefined ||
        state.supersedesStateId !== null ||
        state.effectiveAt !== item.scheduledAt ||
        state.reasonKey !== null ||
        state.context !== null ||
        state.outcomeEventId !== null
      ) {
        throw new Error(`Invalid scheduled future due-item state: ${state.id}`);
      }
    } else {
      if (
        !previous ||
        previous.status !== "scheduled" ||
        state.supersedesStateId !== previous.id
      ) {
        throw new Error(
          `Invalid terminal future due-item transition: ${state.id}`,
        );
      }
      if (state.status !== "cancelled" && state.effectiveAt !== item.dueAt) {
        throw new Error(
          `Resolved or blocked future due-item state is not on its due date: ${state.id}`,
        );
      }
      if (state.status === "cancelled" && state.effectiveAt > item.dueAt) {
        throw new Error(
          `Future due-item cancellation occurs after its due date: ${state.id}`,
        );
      }
      if (state.status === "blocked" && state.reasonKey === null) {
        throw new Error(`Blocked future due item lacks a reason: ${state.id}`);
      }
      if (state.reasonKey !== null) {
        assertSemanticTransitionKey(
          state.reasonKey,
          "Future due-item reason key",
        );
      }
      assertOptional(state.context, "Future due-item context");
      if (state.outcomeEventId !== null) {
        const event = world.history.events.find(
          (candidate) => candidate.id === state.outcomeEventId,
        );
        if (
          !event ||
          event.sequence <= item.sequence ||
          event.sequence >= state.sequence ||
          event.occurredAt !== item.dueAt ||
          event.recordedAt > state.effectiveAt
        ) {
          throw new Error(
            `Future due-item state has invalid outcome event: ${state.id}`,
          );
        }
      }
    }
    prior.push(state);
    priorByItem.set(item.id, prior);
  }
  for (const item of world.history.futureDueItems) {
    const states = priorByItem.get(item.id) ?? [];
    if (
      states.length === 0 ||
      states[0]?.status !== "scheduled" ||
      states.length > 2
    ) {
      throw new Error(`Future due item lacks one valid lifecycle: ${item.id}`);
    }
    const latest = states.at(-1);
    if (latest?.status === "scheduled" && item.dueAt < world.currentDate) {
      throw new Error(
        `Future due item was skipped by authoritative time: ${item.id}`,
      );
    }
  }
}

function latestDueItemStateAtCurrentFrontier(
  world: World,
  dueItemId: EntityId,
): FutureDueItemStateRecord | null {
  return (
    world.history.futureDueItemStates
      .filter((record) => record.dueItemId === dueItemId)
      .sort(bySequence)
      .at(-1) ?? null
  );
}

function validateDueProvenance(
  world: World,
  provenance: FutureDueItemProvenance,
  asOfDate: string,
  sequenceExclusive: number,
): void {
  if (provenance.kind === "simulated") {
    const ids = canonicalEntityIds(
      provenance.sourceEntityIds,
      "Future due-item provenance sources",
    );
    for (const id of ids) {
      if (!canonicalEntityAvailable(world, id, asOfDate, sequenceExclusive)) {
        throw new Error(
          `Future due-item provenance source is unavailable: ${id}`,
        );
      }
    }
  } else if (provenance.kind === "initialization") {
    assertOptional(
      provenance.reference,
      "Future due-item initialization reference",
    );
  } else if (provenance.kind === "authored") {
    assertNonEmpty(provenance.note, "Future due-item authored note");
  } else {
    throw new Error("Future due item has invalid provenance.");
  }
}

function canonicalEntityAvailable(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  if (id === world.id || world.jurisdictions[id] || world.people[id])
    return true;
  if (lifeEntityExists(world, id)) {
    return lifeEntityAvailableAt(
      world,
      id,
      makeIsoDate(asOfDate),
      sequenceExclusive,
    );
  }
  if (resourceHousingEntityExists(world, id)) {
    return resourceHousingEntityAvailableAt(
      world,
      id,
      makeIsoDate(asOfDate),
      sequenceExclusive,
    );
  }
  if (worldMetricEntityExists(world, id)) {
    return worldMetricEntityAvailableAt(world, id, asOfDate, sequenceExclusive);
  }
  if (incidentEntityExists(world, id)) {
    return incidentEntityAvailableAt(world, id, asOfDate, sequenceExclusive);
  }
  const policyRecord = [
    ...world.history.policyAlternatives,
    ...world.history.policyBaselines,
    ...world.history.policyOperations,
    ...world.history.policyImplementationProfiles,
    ...world.history.policyEstimates,
    ...world.history.policyRealizations,
  ].find((record) => record.id === id);
  if (policyRecord) {
    return (
      policyRecord.recordedAt <= asOfDate &&
      policyRecord.sequence < sequenceExclusive
    );
  }
  const causalRecord = [
    ...world.history.causalProcesses,
    ...world.history.effectActivations,
  ].find((record) => record.id === id);
  if (causalRecord) {
    return (
      causalRecord.recordedAt <= asOfDate &&
      causalRecord.sequence < sequenceExclusive
    );
  }
  const event = world.history.events.find((record) => record.id === id);
  return !!(
    event &&
    event.recordedAt <= asOfDate &&
    event.sequence < sequenceExclusive
  );
}

function cloneDueProvenance(
  provenance: FutureDueItemProvenance,
): FutureDueItemProvenance {
  return provenance.kind === "simulated"
    ? { kind: "simulated", sourceEntityIds: [...provenance.sourceEntityIds] }
    : { ...provenance };
}

function canonicalEntityIds(
  ids: readonly EntityId[],
  label: string,
): readonly EntityId[] {
  const canonical = [...new Set(ids)].sort();
  if (JSON.stringify(ids) !== JSON.stringify(canonical)) {
    throw new Error(`${label} must be sorted and unique.`);
  }
  return canonical;
}

function compareDueItems(left: FutureDueItem, right: FutureDueItem): number {
  return (
    left.dueAt.localeCompare(right.dueAt) || left.sequence - right.sequence
  );
}

function validateCutoff(world: World, cutoff: HistoricalCutoff): void {
  makeIsoDate(cutoff.asOfDate);
  if (cutoff.asOfDate > world.currentDate) {
    throw new Error("Historical cutoff is after the current world date.");
  }
  if (
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Historical cutoff sequence is outside world history.");
  }
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  kind: "future-due-item" | "future-due-item-state",
): void {
  if (ids.has(record.id)) throw new Error(`Duplicate entity ID: ${record.id}`);
  ids.add(record.id);
  assertNonEmpty(record.stableKey, `${kind} stable key`);
  if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
    throw new Error(`${kind} ID does not match stable key: ${record.id}`);
  }
}

function assertUniqueStableKey(
  records: readonly { readonly stableKey: string }[],
  stableKey: string,
  label: string,
): void {
  assertNonEmpty(stableKey, `${label} stable key`);
  if (records.some((record) => record.stableKey === stableKey)) {
    throw new Error(`Duplicate ${label} stable key: ${stableKey}`);
  }
}

function assertSequenceOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  if (
    records.some(
      (record, index) =>
        index > 0 && record.sequence <= (records[index - 1]?.sequence ?? -1),
    )
  ) {
    throw new Error(`${label} history is not stored in sequence order.`);
  }
}

function bySequence<T extends { readonly sequence: number }>(
  left: T,
  right: T,
): number {
  return left.sequence - right.sequence;
}

function commit(world: World, history: World["history"]): World {
  const next = { ...world, history };
  assertWorldIntegrity(next);
  return next;
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertOptional(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}
