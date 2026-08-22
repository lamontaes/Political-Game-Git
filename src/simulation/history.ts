import { createStableId } from "./ids";
import type {
  BeliefConviction,
  BeliefFormationContext,
  BeliefPosition,
  CampaignCommitmentLevel,
  CampaignCommitmentRecord,
  CampaignCommitmentStance,
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
  PoliticalFlexibility,
  PoliticalSalience,
  PrincipleRecord,
  PrincipleStance,
  PrivateBeliefRecord,
  PropositionExposureProvenance,
  PropositionExposureRecord,
  PublicPositionRecord,
  PublicPositionStance,
  PersonFactConstraint,
  RelationshipChange,
  RelationshipInteraction,
  RelationshipInteractionKind,
  RelationshipSignificance,
  SubjectExpertise,
  SubjectFamiliarity,
  SubjectKnowledgeProvenance,
  SubjectKnowledgeRecord,
  SubjectUnderstanding,
  PracticalExperience,
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

export interface PrivateBeliefRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly formedAt: IsoDate;
  readonly position: BeliefPosition;
  readonly conviction: BeliefConviction;
  readonly salience: PoliticalSalience;
  readonly flexibility: PoliticalFlexibility;
  readonly rationale: string | null;
  readonly formation: BeliefFormationContext;
  readonly supersedesBeliefId: EntityId | null;
}

export interface PropositionExposureRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly encounteredAt: IsoDate;
  readonly summary: string;
  readonly provenance: PropositionExposureProvenance;
}

export interface PublicPositionRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly statedAt: IsoDate;
  readonly stance: PublicPositionStance;
  readonly statement: string;
  readonly audience: "limited" | "public";
  readonly venue: string | null;
  readonly sourceEventId: EntityId | null;
  readonly supersedesPublicPositionId: EntityId | null;
}

export interface CampaignCommitmentRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly madeAt: IsoDate;
  readonly stance: CampaignCommitmentStance;
  readonly level: CampaignCommitmentLevel;
  readonly statement: string;
  readonly conditions: string | null;
  readonly sourceEventId: EntityId | null;
  readonly supersedesCommitmentId: EntityId | null;
}

export interface PrincipleRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly principleId: EntityId;
  readonly formedAt: IsoDate;
  readonly stance: PrincipleStance;
  readonly conviction: BeliefConviction;
  readonly flexibility: PoliticalFlexibility;
  readonly qualification: string | null;
  readonly formation: BeliefFormationContext;
  readonly supersedesPrincipleRecordId: EntityId | null;
}

export interface SubjectKnowledgeRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly subjectId: EntityId;
  readonly recordedAt: IsoDate;
  readonly familiarity: SubjectFamiliarity;
  readonly understanding: SubjectUnderstanding;
  readonly expertise: SubjectExpertise;
  readonly practicalExperience: PracticalExperience;
  readonly provenance: SubjectKnowledgeProvenance;
  readonly supersedesKnowledgeId: EntityId | null;
}

export function createHistoryStore(): HistoryStore {
  return {
    nextSequence: 0,
    events: [],
    memories: [],
    knowledge: [],
    claims: [],
    relationshipInteractions: [],
    propositionExposures: [],
    privateBeliefs: [],
    publicPositions: [],
    campaignCommitments: [],
    principles: [],
    subjectKnowledge: [],
  };
}

export function appendPropositionExposureRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: PropositionExposureRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.propositionExposures,
    input.stableKey,
    "proposition exposure",
  );
  const exposure: PropositionExposureRecord = {
    ...input,
    id: createStableId("proposition-exposure", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    provenance: { ...input.provenance },
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    propositionExposures: [...history.propositionExposures, exposure],
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

export function appendPrivateBeliefRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: PrivateBeliefRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.privateBeliefs,
    input.stableKey,
    "private belief",
  );
  const belief: PrivateBeliefRecord = {
    ...input,
    id: createStableId("belief", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    formation: cloneFormation(input.formation),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    privateBeliefs: [...history.privateBeliefs, belief],
  };
}

export function appendPublicPositionRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: PublicPositionRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.publicPositions,
    input.stableKey,
    "public position",
  );
  const position: PublicPositionRecord = {
    ...input,
    id: createStableId("public-position", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    publicPositions: [...history.publicPositions, position],
  };
}

export function appendCampaignCommitmentRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: CampaignCommitmentRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.campaignCommitments,
    input.stableKey,
    "campaign commitment",
  );
  const commitment: CampaignCommitmentRecord = {
    ...input,
    id: createStableId("commitment", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    campaignCommitments: [...history.campaignCommitments, commitment],
  };
}

export function appendPrincipleRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: PrincipleRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.principles,
    input.stableKey,
    "principle record",
  );
  const principle: PrincipleRecord = {
    ...input,
    id: createStableId("principle", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    formation: cloneFormation(input.formation),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    principles: [...history.principles, principle],
  };
}

export function appendSubjectKnowledgeRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: SubjectKnowledgeRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.subjectKnowledge,
    input.stableKey,
    "subject knowledge",
  );
  const knowledge: SubjectKnowledgeRecord = {
    ...input,
    id: createStableId("subject-knowledge", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    provenance: cloneSubjectKnowledgeProvenance(input.provenance),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    subjectKnowledge: [...history.subjectKnowledge, knowledge],
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

function cloneFormation(
  formation: BeliefFormationContext,
): BeliefFormationContext {
  return {
    ...formation,
    relevantEventIds: canonicalEntityIds(formation.relevantEventIds),
    sourceFactIds: canonicalEntityIds(formation.sourceFactIds),
    propositionExposureIds: canonicalEntityIds(
      formation.propositionExposureIds,
    ),
    memoryIds: canonicalEntityIds(formation.memoryIds),
    eventKnowledgeIds: canonicalEntityIds(formation.eventKnowledgeIds),
    claimIds: canonicalEntityIds(formation.claimIds),
    relationshipInteractionIds: canonicalEntityIds(
      formation.relationshipInteractionIds,
    ),
    subjectKnowledgeIds: canonicalEntityIds(formation.subjectKnowledgeIds),
    cue: formation.cue ? { ...formation.cue } : null,
  };
}

function cloneSubjectKnowledgeProvenance(
  provenance: SubjectKnowledgeProvenance,
): SubjectKnowledgeProvenance {
  if (provenance.kind === "person-facts") {
    return { ...provenance, factIds: canonicalEntityIds(provenance.factIds) };
  }
  if (provenance.kind === "historical-events") {
    return { ...provenance, eventIds: canonicalEntityIds(provenance.eventIds) };
  }
  return { ...provenance };
}

function canonicalEntityIds(ids: readonly EntityId[]): readonly EntityId[] {
  return [...new Set(ids)].sort();
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
