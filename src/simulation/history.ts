import { createStableId } from "./ids";
import type {
  ClaimAudience,
  ClaimProvenance,
  ClaimRecord,
  ClaimRelationshipToTruth,
  EntityId,
  EventContext,
  EventKnowledgeRecord,
  EventParticipant,
  EventVisibility,
  HistoricalEvent,
  HistoryStore,
  IsoDate,
  KnowledgeAccuracy,
  KnowledgeConfidence,
  KnowledgeSource,
  MemoryRecord,
  MemoryStrength,
  PersonFactConstraint,
  RelationshipChange,
  RelationshipInteraction,
  RelationshipInteractionKind,
  RelationshipSignificance,
} from "./types";

export interface HistoricalEventInput {
  readonly stableKey: string;
  readonly type: string;
  readonly occurredAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly jurisdictionId: EntityId | null;
  readonly involvedEntityIds: readonly EntityId[];
  readonly participants: readonly EventParticipant[];
  readonly personFactConstraints: readonly PersonFactConstraint[];
  readonly visibility: EventVisibility;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly context: EventContext;
}

export interface MemoryRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly eventId: EntityId;
  readonly formedAt: IsoDate;
  readonly rememberedSummary: string;
  readonly interpretation: string;
  readonly strength: MemoryStrength;
  readonly relevanceTags: readonly string[];
  readonly supersedesMemoryId: EntityId | null;
}

export interface EventKnowledgeRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly eventId: EntityId;
  readonly learnedAt: IsoDate;
  readonly believedSummary: string;
  readonly accuracy: KnowledgeAccuracy;
  readonly confidence: KnowledgeConfidence;
  readonly source: KnowledgeSource;
}

export interface ClaimRecordInput {
  readonly stableKey: string;
  readonly speakerPersonId: EntityId;
  readonly eventId: EntityId;
  readonly madeAt: IsoDate;
  readonly audience: ClaimAudience;
  readonly statement: string;
  readonly relationshipToTruth: ClaimRelationshipToTruth;
  readonly provenance: ClaimProvenance;
}

export interface RelationshipInteractionInput {
  readonly stableKey: string;
  readonly personIds: readonly [EntityId, EntityId];
  readonly eventId: EntityId | null;
  readonly occurredAt: IsoDate;
  readonly kind: RelationshipInteractionKind;
  readonly change: RelationshipChange;
  readonly significance: RelationshipSignificance;
  readonly summary: string;
  readonly tags: readonly string[];
}

export function createHistoryStore(): HistoryStore {
  return {
    nextSequence: 0,
    events: [],
    memories: [],
    knowledge: [],
    claims: [],
    relationshipInteractions: [],
  };
}

export function appendHistoricalEvent(
  history: HistoryStore,
  worldId: EntityId,
  input: HistoricalEventInput,
): HistoryStore {
  assertUniqueStableKey(history.events, input.stableKey, "event");

  const involvedEntityIds = [...new Set(input.involvedEntityIds)].sort();
  const participants = input.participants
    .map((participant) => ({ ...participant }))
    .sort(
      (left, right) =>
        left.personId.localeCompare(right.personId) ||
        left.role.localeCompare(right.role) ||
        (left.detail ?? "").localeCompare(right.detail ?? ""),
    );
  const personFactConstraints = input.personFactConstraints
    .map((constraint) => ({ ...constraint }))
    .sort(
      (left, right) =>
        left.personId.localeCompare(right.personId) ||
        left.kind.localeCompare(right.kind),
    );
  const id = createStableId("event", `${worldId}:${input.stableKey}`);

  const event: HistoricalEvent = {
    id,
    stableKey: input.stableKey,
    sequence: history.nextSequence,
    type: input.type,
    occurredAt: input.occurredAt,
    recordedAt: input.recordedAt,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds,
    participants,
    personFactConstraints,
    visibility: input.visibility,
    tags: canonicalTags(input.tags),
    summary: input.summary,
    context: cloneEventContext(input.context),
  };

  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    events: [...history.events, event],
  };
}

export function appendMemoryRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: MemoryRecordInput,
): HistoryStore {
  assertUniqueStableKey(history.memories, input.stableKey, "memory");
  const memory: MemoryRecord = {
    ...input,
    id: createStableId("memory", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    relevanceTags: canonicalTags(input.relevanceTags),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    memories: [...history.memories, memory],
  };
}

export function appendEventKnowledgeRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: EventKnowledgeRecordInput,
): HistoryStore {
  assertUniqueStableKey(history.knowledge, input.stableKey, "knowledge");
  const knowledge: EventKnowledgeRecord = {
    ...input,
    id: createStableId("knowledge", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    source: { ...input.source },
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    knowledge: [...history.knowledge, knowledge],
  };
}

export function appendClaimRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: ClaimRecordInput,
): HistoryStore {
  assertUniqueStableKey(history.claims, input.stableKey, "claim");
  const claim: ClaimRecord = {
    ...input,
    id: createStableId("claim", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    provenance: { ...input.provenance },
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    claims: [...history.claims, claim],
  };
}

export function appendRelationshipInteraction(
  history: HistoryStore,
  worldId: EntityId,
  input: RelationshipInteractionInput,
): HistoryStore {
  assertUniqueStableKey(
    history.relationshipInteractions,
    input.stableKey,
    "relationship interaction",
  );
  const sortedPersonIds = [...input.personIds].sort() as [EntityId, EntityId];
  const interaction: RelationshipInteraction = {
    ...input,
    id: createStableId("relationship", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    personIds: sortedPersonIds,
    tags: canonicalTags(input.tags),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    relationshipInteractions: [
      ...history.relationshipInteractions,
      interaction,
    ],
  };
}

export function eventsInvolving(
  history: HistoryStore,
  entityId: EntityId,
): readonly HistoricalEvent[] {
  return history.events.filter((event) =>
    event.involvedEntityIds.includes(entityId),
  );
}

export function eventsNewestFirst(
  history: HistoryStore,
): readonly HistoricalEvent[] {
  return [...history.events].sort((left, right) => {
    const byDate = right.occurredAt.localeCompare(left.occurredAt);
    return (
      byDate ||
      right.sequence - left.sequence ||
      right.id.localeCompare(left.id)
    );
  });
}

function canonicalTags(tags: readonly string[]): readonly string[] {
  return [...new Set(tags)].sort();
}

function cloneEventContext(context: EventContext): EventContext {
  return {
    ...context,
    location: context.location ? { ...context.location } : null,
  };
}

function assertUniqueStableKey(
  records: readonly { readonly stableKey: string }[],
  stableKey: string,
  label: string,
): void {
  if (stableKey.trim().length === 0) {
    throw new Error(`${label} stable key must not be empty.`);
  }
  if (records.some((record) => record.stableKey === stableKey)) {
    throw new Error(`${label} stable key already exists: ${stableKey}`);
  }
}
