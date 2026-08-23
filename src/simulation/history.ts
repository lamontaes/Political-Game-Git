import { createStableId } from "./ids";
import type {
  AppraisalMeaning,
  AppraisalRecord,
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
  EventType,
  EventVisibility,
  HistoricalEvent,
  HistoryStore,
  IsoDate,
  KnowledgeAccuracy,
  KnowledgeConfidence,
  KnowledgeSource,
  MemoryRecord,
  MemoryStrength,
  MindConfidence,
  MindRecordProvenance,
  MindSourceReference,
  MindStrength,
  PerceptionRecord,
  PerceptionSource,
  PerceptionSubjectKind,
  PersonalValueRecord,
  PersonalityTendencyRecord,
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
  GoalPriority,
  GoalStateRecord,
  GoalStatus,
  TemporaryStateRecord,
  ValueOrientation,
  ValueSalience,
  DecisionEvaluation,
  DecisionTraceRecord,
} from "./types";

export interface HistoricalEventInput {
  readonly stableKey: string;
  readonly type: EventType;
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

export interface PersonalityTendencyRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly tendencyId: EntityId;
  readonly recordedAt: IsoDate;
  readonly expressionKey: string;
  readonly strength: MindStrength;
  readonly confidence: MindConfidence;
  readonly scopeTags: readonly string[];
  readonly provenance: MindRecordProvenance;
  readonly supersedesTendencyId: EntityId | null;
}

export interface PersonalValueRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly valueId: EntityId;
  readonly recordedAt: IsoDate;
  readonly orientation: ValueOrientation;
  readonly strength: MindStrength;
  readonly salience: ValueSalience;
  readonly qualification: string | null;
  readonly provenance: MindRecordProvenance;
  readonly supersedesValueId: EntityId | null;
}

export interface GoalStateRecordInput {
  readonly stableKey: string;
  readonly goalId: EntityId;
  readonly goalKey: string;
  readonly personId: EntityId;
  readonly createdAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly objective: string;
  readonly domain: string;
  readonly scope: string;
  readonly priority: GoalPriority;
  readonly status: GoalStatus;
  readonly targetEntityId: EntityId | null;
  readonly deadline: IsoDate | null;
  readonly outcome: string | null;
  readonly provenance: MindRecordProvenance;
  readonly replacesGoalId: EntityId | null;
  readonly supersedesGoalStateId: EntityId | null;
}

export interface AppraisalRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly eventId: EntityId;
  readonly memoryId: EntityId | null;
  readonly eventKnowledgeId: EntityId | null;
  readonly appraisedAt: IsoDate;
  readonly meanings: readonly AppraisalMeaning[];
  readonly interpretation: string;
  readonly confidence: MindConfidence;
  readonly involvedPersonIds: readonly EntityId[];
  readonly provenance: MindRecordProvenance;
  readonly supersedesAppraisalId: EntityId | null;
}

export interface PerceptionRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly perceivedAt: IsoDate;
  readonly subjectKind: PerceptionSubjectKind;
  readonly subjectKey: string;
  readonly subjectEntityId: EntityId | null;
  readonly assertion: string;
  readonly confidence: MindConfidence;
  readonly sourceCredibility: PerceptionRecord["sourceCredibility"];
  readonly source: PerceptionSource;
  readonly supersedesPerceptionId: EntityId | null;
}

export interface TemporaryStateRecordInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly stateKey: string;
  readonly label: string;
  readonly recordedAt: IsoDate;
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
  readonly intensity: MindStrength;
  readonly decisionTags: readonly string[];
  readonly provenance: MindRecordProvenance;
}

export interface DecisionTraceRecordInput extends DecisionEvaluation {
  readonly stableKey: string;
  readonly recordedAt: IsoDate;
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
    personalityTendencies: [],
    personalValues: [],
    goalStates: [],
    appraisals: [],
    perceptions: [],
    temporaryStates: [],
    decisionTraces: [],
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

export function appendPersonalityTendencyRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: PersonalityTendencyRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.personalityTendencies,
    input.stableKey,
    "personality tendency",
  );
  const record: PersonalityTendencyRecord = {
    ...input,
    id: createStableId("personality-tendency", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    scopeTags: canonicalTags(input.scopeTags),
    provenance: cloneMindProvenance(input.provenance),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    personalityTendencies: [...history.personalityTendencies, record],
  };
}

export function appendPersonalValueRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: PersonalValueRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.personalValues,
    input.stableKey,
    "personal value",
  );
  const record: PersonalValueRecord = {
    ...input,
    id: createStableId("personal-value", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    provenance: cloneMindProvenance(input.provenance),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    personalValues: [...history.personalValues, record],
  };
}

export function appendGoalStateRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: GoalStateRecordInput,
): HistoryStore {
  assertUniqueStableKey(history.goalStates, input.stableKey, "goal state");
  const record: GoalStateRecord = {
    ...input,
    id: createStableId("goal-state", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    provenance: cloneMindProvenance(input.provenance),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    goalStates: [...history.goalStates, record],
  };
}

export function appendAppraisalRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: AppraisalRecordInput,
): HistoryStore {
  assertUniqueStableKey(history.appraisals, input.stableKey, "appraisal");
  const record: AppraisalRecord = {
    ...input,
    id: createStableId("appraisal", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    meanings: input.meanings
      .map((meaning) => ({ ...meaning }))
      .sort((left, right) => left.key.localeCompare(right.key)),
    involvedPersonIds: canonicalEntityIds(input.involvedPersonIds),
    provenance: cloneMindProvenance(input.provenance),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    appraisals: [...history.appraisals, record],
  };
}

export function appendPerceptionRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: PerceptionRecordInput,
): HistoryStore {
  assertUniqueStableKey(history.perceptions, input.stableKey, "perception");
  const record: PerceptionRecord = {
    ...input,
    id: createStableId("perception", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    source: clonePerceptionSource(input.source),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    perceptions: [...history.perceptions, record],
  };
}

export function appendTemporaryStateRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: TemporaryStateRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.temporaryStates,
    input.stableKey,
    "temporary state",
  );
  const record: TemporaryStateRecord = {
    ...input,
    id: createStableId("temporary-state", `${worldId}:${input.stableKey}`),
    sequence: history.nextSequence,
    decisionTags: canonicalTags(input.decisionTags),
    provenance: cloneMindProvenance(input.provenance),
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    temporaryStates: [...history.temporaryStates, record],
  };
}

export function appendDecisionTraceRecord(
  history: HistoryStore,
  worldId: EntityId,
  input: DecisionTraceRecordInput,
): HistoryStore {
  assertUniqueStableKey(
    history.decisionTraces,
    input.stableKey,
    "decision trace",
  );
  const record: DecisionTraceRecord = {
    ...cloneDecisionEvaluation(input),
    id: createStableId("decision-trace", `${worldId}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: history.nextSequence,
    recordedAt: input.recordedAt,
  };
  return {
    ...history,
    nextSequence: history.nextSequence + 1,
    decisionTraces: [...history.decisionTraces, record],
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
    decisionTraceIds: canonicalEntityIds(formation.decisionTraceIds),
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

function cloneMindProvenance(
  provenance: MindRecordProvenance,
): MindRecordProvenance {
  return {
    ...provenance,
    sourceRefs: canonicalMindSourceRefs(provenance.sourceRefs),
  };
}

function clonePerceptionSource(source: PerceptionSource): PerceptionSource {
  switch (source.kind) {
    case "inference":
      return {
        ...source,
        basisPerceptionIds: canonicalEntityIds(source.basisPerceptionIds),
      };
    case "trusted-cue":
      return {
        ...source,
        communicationRecordIds: canonicalEntityIds(
          source.communicationRecordIds,
        ),
        relationshipInteractionIds: canonicalEntityIds(
          source.relationshipInteractionIds,
        ),
      };
    case "relationship-derived":
      return {
        ...source,
        relationshipInteractionIds: canonicalEntityIds(
          source.relationshipInteractionIds,
        ),
      };
    default:
      return { ...source };
  }
}

function cloneDecisionEvaluation(
  evaluation: DecisionEvaluation,
): DecisionEvaluation {
  return {
    ...evaluation,
    context: {
      ...evaluation.context,
      cutoff: { ...evaluation.context.cutoff },
      subject: { ...evaluation.context.subject },
      options: evaluation.context.options.map((option) => ({ ...option })),
      constraints: evaluation.context.constraints.map((constraint) => ({
        ...constraint,
        sourceRefs: canonicalMindSourceRefs(constraint.sourceRefs),
      })),
      considerations: evaluation.context.considerations.map(
        (consideration) => ({
          ...consideration,
          sourceRefs: canonicalMindSourceRefs(consideration.sourceRefs),
        }),
      ),
      perceptionIds: canonicalEntityIds(evaluation.context.perceptionIds),
    },
    optionEvaluations: evaluation.optionEvaluations.map((option) => ({
      ...option,
      blockedByConstraintKeys: [...option.blockedByConstraintKeys],
      considerationKeys: [...option.considerationKeys],
    })),
    sourceSnapshots: evaluation.sourceSnapshots.map((snapshot) => ({
      ...snapshot,
      reference: cloneMindSourceReference(snapshot.reference),
    })),
  };
}

function canonicalMindSourceRefs(
  references: readonly MindSourceReference[],
): readonly MindSourceReference[] {
  const byKey = new Map<string, MindSourceReference>();
  for (const reference of references) {
    byKey.set(
      mindSourceReferenceKey(reference),
      cloneMindSourceReference(reference),
    );
  }
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, reference]) => reference);
}

function cloneMindSourceReference(
  reference: MindSourceReference,
): MindSourceReference {
  return { ...reference };
}

function mindSourceReferenceKey(reference: MindSourceReference): string {
  const id = Object.entries(reference).find(([key]) => key !== "kind")?.[1];
  return `${reference.kind}:${String(id)}`;
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
