import { makeIsoDate } from "./dates";
import {
  appendAppraisalRecord,
  appendGoalStateRecord,
  appendPersonalValueRecord,
  appendPersonalityTendencyRecord,
  appendPerceptionRecord,
  appendTemporaryStateRecord,
} from "./history";
import type {
  AppraisalRecordInput,
  GoalStateRecordInput,
  PersonalValueRecordInput,
  PersonalityTendencyRecordInput,
  PerceptionRecordInput,
  TemporaryStateRecordInput,
} from "./history";
import { createStableId } from "./ids";
import { factsForPerson } from "./people";
import {
  assertOpenTaxonomyKey,
  PERCEPTION_SUBJECT_NAMESPACES,
} from "./taxonomy";
import type {
  DevelopmentProposal,
  DevelopmentTarget,
  EntityId,
  IsoDate,
  MindRecordProvenance,
  MindSourceReference,
  PerceptionSource,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

const MIND_STRENGTHS = ["subtle", "moderate", "strong", "defining"] as const;
const MIND_CONFIDENCES = ["low", "medium", "high"] as const;
const VALUE_ORIENTATIONS = [
  "embraces",
  "questions",
  "rejects",
  "conflicted",
] as const;
const VALUE_SALIENCES = ["low", "moderate", "high", "central"] as const;
const GOAL_PRIORITIES = ["low", "moderate", "high", "critical"] as const;
const GOAL_STATUSES = [
  "proposed",
  "active",
  "completed",
  "failed",
  "abandoned",
  "superseded",
] as const;
const APPRAISAL_VALENCES = [
  "positive",
  "negative",
  "mixed",
  "neutral",
] as const;
const SOURCE_CREDIBILITIES = ["unknown", "low", "medium", "high"] as const;
const MIND_PROVENANCE_KINDS = [
  "authored",
  "reflection",
  "development-proposal",
  "player-choice",
] as const;
const TERMINAL_GOAL_STATUSES = [
  "completed",
  "failed",
  "abandoned",
  "superseded",
] as const;

export type GoalStateInput = Omit<
  GoalStateRecordInput,
  "goalId" | "createdAt"
> & {
  readonly createdAt?: IsoDate;
};

export interface DevelopmentProposalInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly proposedAt: IsoDate;
  readonly target: DevelopmentTarget;
  readonly direction: DevelopmentProposal["direction"];
  readonly sourceRefs: readonly MindSourceReference[];
  readonly repetitionKey: string | null;
  readonly rationale: string;
}

export function createMindProvenance(
  kind: MindRecordProvenance["kind"],
  input: Partial<Omit<MindRecordProvenance, "kind">> = {},
): MindRecordProvenance {
  return {
    kind,
    sourceRefs: input.sourceRefs ?? [],
    note: input.note ?? null,
  };
}

export function recordPersonalityTendency(
  world: World,
  input: PersonalityTendencyRecordInput,
): World {
  requirePersonAt(world, input.personId, input.recordedAt);
  const definition = world.mindCatalog.tendencies[input.tendencyId];
  if (!definition) {
    throw new Error(
      `Missing personality-tendency definition: ${input.tendencyId}`,
    );
  }
  if (
    !definition.expressions.some((item) => item.key === input.expressionKey)
  ) {
    throw new Error(
      `Personality expression is not defined for the tendency: ${input.expressionKey}`,
    );
  }
  assertMember(MIND_STRENGTHS, input.strength, "personality strength");
  assertMember(MIND_CONFIDENCES, input.confidence, "personality confidence");
  assertTags(input.scopeTags, "Personality scope");
  validateMindProvenance(
    world,
    input.personId,
    input.recordedAt,
    input.provenance,
    true,
  );
  validateImmediateSupersession(
    world.history.personalityTendencies,
    input.supersedesTendencyId,
    input.personId,
    input.tendencyId,
    input.recordedAt,
    (record) => record.tendencyId,
    (record) => record.recordedAt,
    "personality tendency",
  );
  return commitHistory(
    world,
    appendPersonalityTendencyRecord(world.history, world.id, input),
  );
}

export function recordPersonalValue(
  world: World,
  input: PersonalValueRecordInput,
): World {
  requirePersonAt(world, input.personId, input.recordedAt);
  if (!world.mindCatalog.values[input.valueId]) {
    throw new Error(`Missing personal-value definition: ${input.valueId}`);
  }
  assertMember(VALUE_ORIENTATIONS, input.orientation, "value orientation");
  assertMember(MIND_STRENGTHS, input.strength, "value strength");
  assertMember(VALUE_SALIENCES, input.salience, "value salience");
  assertOptional(input.qualification, "Value qualification");
  validateMindProvenance(
    world,
    input.personId,
    input.recordedAt,
    input.provenance,
    true,
  );
  validateImmediateSupersession(
    world.history.personalValues,
    input.supersedesValueId,
    input.personId,
    input.valueId,
    input.recordedAt,
    (record) => record.valueId,
    (record) => record.recordedAt,
    "personal value",
  );
  return commitHistory(
    world,
    appendPersonalValueRecord(world.history, world.id, input),
  );
}

export function recordGoalState(world: World, input: GoalStateInput): World {
  requirePersonAt(world, input.personId, input.recordedAt);
  assertNonEmpty(input.goalKey, "Goal key");
  assertNonEmpty(input.objective, "Goal objective");
  assertNonEmpty(input.domain, "Goal domain");
  assertNonEmpty(input.scope, "Goal scope");
  assertMember(GOAL_PRIORITIES, input.priority, "goal priority");
  assertMember(GOAL_STATUSES, input.status, "goal status");
  assertOptional(input.outcome, "Goal outcome");
  const goalId = createStableId(
    "goal",
    `${world.id}:${input.personId}:${input.goalKey}`,
  );
  const prior = input.supersedesGoalStateId
    ? world.history.goalStates.find(
        (record) => record.id === input.supersedesGoalStateId,
      )
    : undefined;
  const createdAt = makeIsoDate(
    input.createdAt ?? prior?.createdAt ?? input.recordedAt,
  );
  const person = requirePerson(world, input.personId);
  if (createdAt < person.birthDate || createdAt > input.recordedAt) {
    throw new Error(
      "A goal must be created during the person's life and no later than its state record.",
    );
  }
  if (input.deadline !== null && makeIsoDate(input.deadline) < createdAt) {
    throw new Error("A goal deadline cannot predate goal creation.");
  }
  if (
    input.targetEntityId !== null &&
    !entityExists(world, input.targetEntityId)
  ) {
    throw new Error(
      `Goal target entity does not exist: ${input.targetEntityId}`,
    );
  }
  const targetPerson =
    input.targetEntityId === null
      ? undefined
      : world.people[input.targetEntityId];
  if (targetPerson && targetPerson.birthDate > input.recordedAt) {
    throw new Error("A goal cannot target a person before that person exists.");
  }
  validateMindProvenance(
    world,
    input.personId,
    input.recordedAt,
    input.provenance,
    true,
  );
  const historyForGoal = world.history.goalStates.filter(
    (record) => record.goalId === goalId,
  );
  const current = historyForGoal.at(-1);
  if (
    (current === undefined && input.supersedesGoalStateId !== null) ||
    (current !== undefined && input.supersedesGoalStateId !== current.id) ||
    (prior !== undefined &&
      (prior.personId !== input.personId ||
        prior.goalId !== goalId ||
        prior.createdAt !== createdAt ||
        prior.recordedAt > input.recordedAt ||
        TERMINAL_GOAL_STATUSES.includes(prior.status as never)))
  ) {
    throw new Error(
      `Invalid goal-state supersession: ${input.supersedesGoalStateId}`,
    );
  }
  if (
    current === undefined &&
    input.status !== "proposed" &&
    input.status !== "active"
  ) {
    throw new Error("A new goal must begin as proposed or active.");
  }
  if (input.replacesGoalId !== null) {
    const replaced = world.history.goalStates
      .filter(
        (record) =>
          record.goalId === input.replacesGoalId &&
          record.personId === input.personId,
      )
      .at(-1);
    if (
      !replaced ||
      replaced.sequence >= world.history.nextSequence ||
      replaced.status !== "superseded"
    ) {
      throw new Error(
        `Goal replacement target is unavailable: ${input.replacesGoalId}`,
      );
    }
  }
  const completeInput: GoalStateRecordInput = {
    ...input,
    goalId,
    createdAt,
  };
  return commitHistory(
    world,
    appendGoalStateRecord(world.history, world.id, completeInput),
  );
}

export function recordAppraisal(
  world: World,
  input: AppraisalRecordInput,
): World {
  requirePersonAt(world, input.personId, input.appraisedAt);
  const event = world.history.events.find(
    (record) => record.id === input.eventId,
  );
  if (
    !event ||
    event.sequence >= world.history.nextSequence ||
    event.occurredAt > input.appraisedAt
  ) {
    throw new Error(
      `Appraisal references an unavailable event: ${input.eventId}`,
    );
  }
  const memory = input.memoryId
    ? world.history.memories.find((record) => record.id === input.memoryId)
    : undefined;
  const knowledge = input.eventKnowledgeId
    ? world.history.knowledge.find(
        (record) => record.id === input.eventKnowledgeId,
      )
    : undefined;
  if (input.memoryId !== null && !memory) {
    throw new Error(`Appraisal references a missing memory: ${input.memoryId}`);
  }
  if (input.eventKnowledgeId !== null && !knowledge) {
    throw new Error(
      `Appraisal references missing event knowledge: ${input.eventKnowledgeId}`,
    );
  }
  if (
    memory &&
    (memory.personId !== input.personId ||
      memory.eventId !== input.eventId ||
      memory.formedAt > input.appraisedAt)
  ) {
    throw new Error(
      `Appraisal references an incompatible memory: ${memory.id}`,
    );
  }
  if (
    knowledge &&
    (knowledge.personId !== input.personId ||
      knowledge.eventId !== input.eventId ||
      knowledge.learnedAt > input.appraisedAt)
  ) {
    throw new Error(
      `Appraisal references incompatible event knowledge: ${knowledge.id}`,
    );
  }
  if (
    !event.involvedEntityIds.includes(input.personId) &&
    !memory &&
    !knowledge
  ) {
    throw new Error(
      "An appraisal requires direct event involvement or the person's memory/knowledge.",
    );
  }
  if (input.meanings.length === 0) {
    throw new Error("An appraisal requires at least one meaning.");
  }
  const meaningKeys = new Set<string>();
  for (const meaning of input.meanings) {
    assertNonEmpty(meaning.key, "Appraisal meaning key");
    assertNonEmpty(meaning.label, "Appraisal meaning label");
    assertMember(APPRAISAL_VALENCES, meaning.valence, "appraisal valence");
    assertMember(MIND_STRENGTHS, meaning.intensity, "appraisal intensity");
    if (meaningKeys.has(meaning.key)) {
      throw new Error(`Duplicate appraisal meaning: ${meaning.key}`);
    }
    meaningKeys.add(meaning.key);
  }
  assertNonEmpty(input.interpretation, "Appraisal interpretation");
  assertMember(MIND_CONFIDENCES, input.confidence, "appraisal confidence");
  for (const personId of input.involvedPersonIds) {
    if (
      !world.people[personId] ||
      !event.involvedEntityIds.includes(personId)
    ) {
      throw new Error(`Appraisal references an uninvolved person: ${personId}`);
    }
  }
  validateMindProvenance(
    world,
    input.personId,
    input.appraisedAt,
    input.provenance,
    true,
  );
  validateImmediateSupersession(
    world.history.appraisals,
    input.supersedesAppraisalId,
    input.personId,
    input.eventId,
    input.appraisedAt,
    (record) => record.eventId,
    (record) => record.appraisedAt,
    "appraisal",
  );
  return commitHistory(
    world,
    appendAppraisalRecord(world.history, world.id, input),
  );
}

export function recordPerception(
  world: World,
  input: PerceptionRecordInput,
): World {
  requirePersonAt(world, input.personId, input.perceivedAt);
  assertOpenTaxonomyKey(
    input.subjectKind,
    PERCEPTION_SUBJECT_NAMESPACES,
    "Perception subject kind",
  );
  assertNonEmpty(input.subjectKey, "Perception subject key");
  assertNonEmpty(input.assertion, "Perception assertion");
  assertMember(MIND_CONFIDENCES, input.confidence, "perception confidence");
  assertMember(
    SOURCE_CREDIBILITIES,
    input.sourceCredibility,
    "source credibility",
  );
  if (
    input.subjectEntityId !== null &&
    !entityExists(world, input.subjectEntityId)
  ) {
    throw new Error(
      `Perception subject entity does not exist: ${input.subjectEntityId}`,
    );
  }
  validatePerceptionSource(
    world,
    input.personId,
    input.perceivedAt,
    input.source,
  );
  if (input.supersedesPerceptionId !== null) {
    const prior = world.history.perceptions.find(
      (record) => record.id === input.supersedesPerceptionId,
    );
    if (
      !prior ||
      prior.personId !== input.personId ||
      prior.subjectKind !== input.subjectKind ||
      prior.subjectKey !== input.subjectKey ||
      prior.subjectEntityId !== input.subjectEntityId ||
      prior.perceivedAt > input.perceivedAt
    ) {
      throw new Error(
        `Invalid perception supersession: ${input.supersedesPerceptionId}`,
      );
    }
  }
  return commitHistory(
    world,
    appendPerceptionRecord(world.history, world.id, input),
  );
}

export function recordTemporaryState(
  world: World,
  input: TemporaryStateRecordInput,
): World {
  requirePersonAt(world, input.personId, input.recordedAt);
  const startsAt = makeIsoDate(input.startsAt);
  const endsAt = makeIsoDate(input.endsAt);
  const person = world.people[input.personId]!;
  if (startsAt < person.birthDate) {
    throw new Error(
      "A temporary state cannot begin before the person's birth.",
    );
  }
  if (startsAt > world.currentDate) {
    throw new Error("A temporary state cannot begin in the future.");
  }
  if (endsAt <= startsAt) {
    throw new Error("A temporary state uses a non-empty half-open interval.");
  }
  assertNonEmpty(input.stateKey, "Temporary-state key");
  assertNonEmpty(input.label, "Temporary-state label");
  assertMember(MIND_STRENGTHS, input.intensity, "temporary-state intensity");
  assertTags(input.decisionTags, "Temporary-state decision");
  validateMindProvenance(
    world,
    input.personId,
    input.recordedAt,
    input.provenance,
  );
  return commitHistory(
    world,
    appendTemporaryStateRecord(world.history, world.id, input),
  );
}

export function createDevelopmentProposal(
  world: World,
  input: DevelopmentProposalInput,
): DevelopmentProposal {
  requirePersonAt(world, input.personId, input.proposedAt);
  assertNonEmpty(input.stableKey, "Development-proposal stable key");
  assertNonEmpty(input.rationale, "Development-proposal rationale");
  assertOptional(input.repetitionKey, "Development-proposal repetition key");
  validateDevelopmentTarget(world, input.personId, input.target);
  validateMindSourceReferences(
    world,
    input.personId,
    input.proposedAt,
    input.sourceRefs,
  );
  return {
    ...input,
    id: createStableId(
      "development-proposal",
      `${world.id}:${input.personId}:${input.stableKey}`,
    ),
    sourceRefs: canonicalMindSourceRefs(input.sourceRefs),
    requiresPlayerChoice:
      world.control.kind === "person" &&
      world.control.personId === input.personId,
  };
}

export function validateMindSourceReferences(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate,
  references: readonly MindSourceReference[],
  historySequenceExclusive = world.history.nextSequence,
): void {
  const ownMemories = new Set(
    references.flatMap((reference) =>
      reference.kind === "memory" ? [reference.memoryId] : [],
    ),
  );
  const ownKnowledge = new Set(
    references.flatMap((reference) =>
      reference.kind === "event-knowledge" ? [reference.knowledgeId] : [],
    ),
  );
  const keys = new Set<string>();
  for (const reference of references) {
    const key = mindSourceReferenceKey(reference);
    if (keys.has(key)) {
      throw new Error(`Duplicate mind source reference: ${key}`);
    }
    keys.add(key);
    switch (reference.kind) {
      case "person-fact": {
        if (
          historySequenceExclusive !== world.history.nextSequence ||
          asOfDate !== world.currentDate
        ) {
          throw new Error(
            "Biography facts lack append availability and cannot be introduced into a reconstructed historical cutoff; durable traces must freeze facts when used at the current frontier.",
          );
        }
        const fact = factsForPerson(requirePerson(world, personId)).find(
          (record) => record.id === reference.factId,
        );
        if (!fact || fact.occurredAt > asOfDate) {
          throw new Error(
            `Unavailable person-fact source: ${reference.factId}`,
          );
        }
        break;
      }
      case "personality-tendency":
        assertOwnedHistoryRecord(
          world.history.personalityTendencies.find(
            (record) => record.id === reference.tendencyRecordId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.recordedAt,
          "personality tendency",
          reference.tendencyRecordId,
        );
        break;
      case "personal-value":
        assertOwnedHistoryRecord(
          world.history.personalValues.find(
            (record) => record.id === reference.valueRecordId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.recordedAt,
          "personal value",
          reference.valueRecordId,
        );
        break;
      case "goal-state":
        assertOwnedHistoryRecord(
          world.history.goalStates.find(
            (record) => record.id === reference.goalStateId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.recordedAt,
          "goal state",
          reference.goalStateId,
        );
        break;
      case "temporary-state":
        assertOwnedHistoryRecord(
          world.history.temporaryStates.find(
            (record) => record.id === reference.temporaryStateId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.recordedAt,
          "temporary state",
          reference.temporaryStateId,
        );
        break;
      case "historical-event": {
        const event = world.history.events.find(
          (record) => record.id === reference.eventId,
        );
        const hasAccess =
          !!event &&
          (event.involvedEntityIds.includes(personId) ||
            world.history.memories.some(
              (memory) =>
                ownMemories.has(memory.id) &&
                memory.personId === personId &&
                memory.eventId === event.id,
            ) ||
            world.history.knowledge.some(
              (knowledge) =>
                ownKnowledge.has(knowledge.id) &&
                knowledge.personId === personId &&
                knowledge.eventId === event.id,
            ));
        if (
          !event ||
          !hasAccess ||
          event.occurredAt > asOfDate ||
          event.sequence >= historySequenceExclusive
        ) {
          throw new Error(
            `Unavailable historical-event source: ${reference.eventId}`,
          );
        }
        break;
      }
      case "memory":
        assertOwnedHistoryRecord(
          world.history.memories.find(
            (record) => record.id === reference.memoryId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.formedAt,
          "memory",
          reference.memoryId,
        );
        break;
      case "event-knowledge":
        assertOwnedHistoryRecord(
          world.history.knowledge.find(
            (record) => record.id === reference.knowledgeId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.learnedAt,
          "event knowledge",
          reference.knowledgeId,
        );
        break;
      case "claim": {
        const claim = world.history.claims.find(
          (record) => record.id === reference.claimId,
        );
        const heard = world.history.knowledge.some(
          (knowledge) =>
            ownKnowledge.has(knowledge.id) &&
            knowledge.personId === personId &&
            knowledge.source.kind === "told-by" &&
            knowledge.source.claimId === reference.claimId,
        );
        if (
          !claim ||
          (claim.speakerPersonId !== personId && !heard) ||
          claim.madeAt > asOfDate ||
          claim.sequence >= historySequenceExclusive
        ) {
          throw new Error(`Unavailable claim source: ${reference.claimId}`);
        }
        break;
      }
      case "relationship-interaction": {
        const interaction = world.history.relationshipInteractions.find(
          (record) => record.id === reference.interactionId,
        );
        if (
          !interaction ||
          !interaction.personIds.includes(personId) ||
          interaction.occurredAt > asOfDate ||
          interaction.sequence >= historySequenceExclusive
        ) {
          throw new Error(
            `Unavailable relationship source: ${reference.interactionId}`,
          );
        }
        break;
      }
      case "proposition-exposure":
        assertOwnedHistoryRecord(
          world.history.propositionExposures.find(
            (record) => record.id === reference.exposureId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.encounteredAt,
          "proposition exposure",
          reference.exposureId,
        );
        break;
      case "private-belief":
        assertOwnedHistoryRecord(
          world.history.privateBeliefs.find(
            (record) => record.id === reference.beliefId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.formedAt,
          "private belief",
          reference.beliefId,
        );
        break;
      case "political-principle":
        assertOwnedHistoryRecord(
          world.history.principles.find(
            (record) => record.id === reference.principleRecordId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.formedAt,
          "political principle",
          reference.principleRecordId,
        );
        break;
      case "subject-knowledge":
        assertOwnedHistoryRecord(
          world.history.subjectKnowledge.find(
            (record) => record.id === reference.subjectKnowledgeId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.recordedAt,
          "subject knowledge",
          reference.subjectKnowledgeId,
        );
        break;
      case "appraisal":
        assertOwnedHistoryRecord(
          world.history.appraisals.find(
            (record) => record.id === reference.appraisalId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.appraisedAt,
          "appraisal",
          reference.appraisalId,
        );
        break;
      case "perception":
        assertOwnedHistoryRecord(
          world.history.perceptions.find(
            (record) => record.id === reference.perceptionId,
          ),
          personId,
          asOfDate,
          historySequenceExclusive,
          (record) => record.perceivedAt,
          "perception",
          reference.perceptionId,
        );
        break;
      case "decision-trace":
        {
          const trace = world.history.decisionTraces.find(
            (record) => record.id === reference.decisionTraceId,
          );
          if (
            !trace ||
            trace.context.actorPersonId !== personId ||
            trace.recordedAt > asOfDate ||
            trace.sequence >= historySequenceExclusive
          ) {
            throw new Error(
              `Unavailable decision trace source: ${reference.decisionTraceId}`,
            );
          }
        }
        break;
      default:
        throw new Error(
          `Invalid mind source reference: ${runtimeKind(reference)}`,
        );
    }
  }
}

function validateMindProvenance(
  world: World,
  personId: EntityId,
  date: IsoDate,
  provenance: MindRecordProvenance,
  requiresPlayerAgency = false,
): void {
  assertMember(MIND_PROVENANCE_KINDS, provenance.kind, "mind provenance kind");
  assertOptional(provenance.note, "Mind provenance note");
  if (
    provenance.kind === "player-choice" &&
    (world.control.kind !== "person" || world.control.personId !== personId)
  ) {
    throw new Error("Player-choice provenance requires the controlled person.");
  }
  if (
    requiresPlayerAgency &&
    world.control.kind === "person" &&
    world.control.personId === personId &&
    provenance.kind !== "player-choice"
  ) {
    throw new Error(
      "A major mind change for the controlled person requires player-choice provenance.",
    );
  }
  validateMindSourceReferences(world, personId, date, provenance.sourceRefs);
}

function validatePerceptionSource(
  world: World,
  personId: EntityId,
  perceivedAt: IsoDate,
  source: PerceptionSource,
): void {
  switch (source.kind) {
    case "person-fact":
      validateMindSourceReferences(world, personId, perceivedAt, [
        { kind: "person-fact", factId: source.factId },
      ]);
      return;
    case "proposition-exposure":
      validateMindSourceReferences(world, personId, perceivedAt, [
        { kind: "proposition-exposure", exposureId: source.exposureId },
      ]);
      return;
    case "subject-knowledge":
      validateMindSourceReferences(world, personId, perceivedAt, [
        {
          kind: "subject-knowledge",
          subjectKnowledgeId: source.subjectKnowledgeId,
        },
      ]);
      return;
    case "appraisal":
      validateMindSourceReferences(world, personId, perceivedAt, [
        { kind: "appraisal", appraisalId: source.appraisalId },
      ]);
      return;
    case "event-knowledge":
      validateMindSourceReferences(world, personId, perceivedAt, [
        { kind: "event-knowledge", knowledgeId: source.knowledgeId },
      ]);
      return;
    case "memory":
      validateMindSourceReferences(world, personId, perceivedAt, [
        { kind: "memory", memoryId: source.memoryId },
      ]);
      return;
    case "heard-claim": {
      const knowledge = world.history.knowledge.find(
        (record) => record.id === source.knowledgeId,
      );
      if (
        !knowledge ||
        knowledge.personId !== personId ||
        knowledge.source.kind !== "told-by" ||
        knowledge.source.claimId !== source.claimId
      ) {
        throw new Error("Heard-claim perception lacks compatible knowledge.");
      }
      validateMindSourceReferences(world, personId, perceivedAt, [
        { kind: "event-knowledge", knowledgeId: source.knowledgeId },
        { kind: "claim", claimId: source.claimId },
      ]);
      return;
    }
    case "inference":
      if (source.basisPerceptionIds.length === 0) {
        throw new Error("An inference requires at least one prior perception.");
      }
      validateMindSourceReferences(
        world,
        personId,
        perceivedAt,
        source.basisPerceptionIds.map((perceptionId) => ({
          kind: "perception" as const,
          perceptionId,
        })),
      );
      return;
    case "trusted-cue":
      validateTrustedCue(world, personId, perceivedAt, source);
      return;
    case "relationship-derived":
      requireOtherPersonAt(world, personId, source.sourcePersonId, perceivedAt);
      validateRelationshipSources(
        world,
        personId,
        source.sourcePersonId,
        perceivedAt,
        source.relationshipInteractionIds,
      );
      return;
    case "authored":
      assertNonEmpty(source.note, "Authored perception note");
      return;
    default:
      throw new Error(`Invalid perception source: ${runtimeKind(source)}`);
  }
}

function validateTrustedCue(
  world: World,
  personId: EntityId,
  perceivedAt: IsoDate,
  source: Extract<PerceptionSource, { readonly kind: "trusted-cue" }>,
): void {
  requireOtherPersonAt(world, personId, source.sourcePersonId, perceivedAt);
  assertNonEmpty(source.sourceLabel, "Trusted-cue source label");
  if (source.communicationRecordIds.length === 0) {
    throw new Error("A trusted cue requires communication evidence.");
  }
  validateRelationshipSources(
    world,
    personId,
    source.sourcePersonId,
    perceivedAt,
    source.relationshipInteractionIds,
  );
  let hasReception = false;
  let hasSourceExpression = false;
  for (const recordId of source.communicationRecordIds) {
    const exposure = world.history.propositionExposures.find(
      (record) => record.id === recordId,
    );
    if (
      exposure &&
      exposure.personId === personId &&
      exposure.encounteredAt <= perceivedAt &&
      exposure.provenance.kind === "told-by" &&
      exposure.provenance.sourcePersonId === source.sourcePersonId
    ) {
      hasReception = true;
      continue;
    }
    const knowledge = world.history.knowledge.find(
      (record) => record.id === recordId,
    );
    if (
      knowledge &&
      knowledge.personId === personId &&
      knowledge.learnedAt <= perceivedAt &&
      knowledge.source.kind === "told-by" &&
      knowledge.source.sourcePersonId === source.sourcePersonId
    ) {
      hasReception = true;
      continue;
    }
    const position = world.history.publicPositions.find(
      (record) => record.id === recordId,
    );
    if (
      position &&
      position.personId === source.sourcePersonId &&
      position.statedAt <= perceivedAt
    ) {
      hasSourceExpression = true;
      continue;
    }
    const claim = world.history.claims.find((record) => record.id === recordId);
    if (
      claim &&
      claim.speakerPersonId === source.sourcePersonId &&
      claim.madeAt <= perceivedAt
    ) {
      hasSourceExpression = true;
      continue;
    }
    throw new Error(
      `Trusted cue references unavailable communication: ${recordId}`,
    );
  }
  if (!hasReception || !hasSourceExpression) {
    throw new Error(
      "A trusted cue requires both recipient-owned reception and source expression evidence.",
    );
  }
}

function validateRelationshipSources(
  world: World,
  personId: EntityId,
  sourcePersonId: EntityId,
  perceivedAt: IsoDate,
  interactionIds: readonly EntityId[],
): void {
  if (interactionIds.length === 0) {
    throw new Error(
      "Relationship-derived information requires prior interactions.",
    );
  }
  for (const interactionId of interactionIds) {
    const interaction = world.history.relationshipInteractions.find(
      (record) => record.id === interactionId,
    );
    if (
      !interaction ||
      !interaction.personIds.includes(personId) ||
      !interaction.personIds.includes(sourcePersonId) ||
      interaction.occurredAt > perceivedAt
    ) {
      throw new Error(`Unavailable relationship interaction: ${interactionId}`);
    }
  }
}

function validateDevelopmentTarget(
  world: World,
  personId: EntityId,
  target: DevelopmentTarget,
): void {
  switch (target.kind) {
    case "personality": {
      const definition = world.mindCatalog.tendencies[target.tendencyId];
      if (
        !definition ||
        !definition.expressions.some(
          (expression) => expression.key === target.expressionKey,
        )
      ) {
        throw new Error(
          "Development proposal has an invalid personality target.",
        );
      }
      return;
    }
    case "value":
      if (!world.mindCatalog.values[target.valueId]) {
        throw new Error("Development proposal has an invalid value target.");
      }
      return;
    case "goal":
      if (
        !world.history.goalStates.some(
          (record) =>
            record.goalId === target.goalId && record.personId === personId,
        )
      ) {
        throw new Error("Development proposal has an invalid goal target.");
      }
      return;
    case "relationship":
      requireOtherPersonAt(
        world,
        personId,
        target.otherPersonId,
        world.currentDate,
      );
      return;
    default:
      throw new Error(`Invalid development target: ${runtimeKind(target)}`);
  }
}

function validateImmediateSupersession<
  T extends {
    readonly id: EntityId;
    readonly personId: EntityId;
  },
>(
  records: readonly T[],
  priorId: EntityId | null,
  personId: EntityId,
  subjectId: EntityId,
  recordDate: IsoDate,
  selectSubject: (record: T) => EntityId,
  selectDate: (record: T) => IsoDate,
  label: string,
): void {
  const current = records
    .filter(
      (record) =>
        record.personId === personId && selectSubject(record) === subjectId,
    )
    .at(-1);
  const prior = priorId
    ? records.find((record) => record.id === priorId)
    : undefined;
  if (
    (current === undefined && priorId !== null) ||
    (current !== undefined && priorId !== current.id) ||
    (prior !== undefined &&
      (prior.personId !== personId ||
        selectSubject(prior) !== subjectId ||
        selectDate(prior) > recordDate))
  ) {
    throw new Error(`Invalid ${label} supersession: ${priorId}`);
  }
}

function assertOwnedHistoryRecord<
  T extends { readonly personId: EntityId; readonly sequence: number },
>(
  record: T | undefined,
  personId: EntityId,
  asOfDate: IsoDate,
  sequenceExclusive: number,
  selectDate: (record: T) => IsoDate,
  label: string,
  id: EntityId,
): void {
  if (
    !record ||
    record.personId !== personId ||
    selectDate(record) > asOfDate ||
    record.sequence >= sequenceExclusive
  ) {
    throw new Error(`Unavailable ${label} source: ${id}`);
  }
}

function requirePerson(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing person: ${personId}`);
  return person;
}

function requirePersonAt(world: World, personId: EntityId, date: IsoDate) {
  const person = requirePerson(world, personId);
  const parsed = makeIsoDate(date);
  if (parsed < person.birthDate || parsed > world.currentDate) {
    throw new Error(
      "Mind record date must be within the person's lived history.",
    );
  }
  return person;
}

function requireOtherPersonAt(
  world: World,
  personId: EntityId,
  otherPersonId: EntityId,
  date: IsoDate,
): void {
  if (personId === otherPersonId) {
    throw new Error("A person-valued source must identify another person.");
  }
  requirePersonAt(world, otherPersonId, date);
}

function entityExists(world: World, id: EntityId): boolean {
  return (
    id === world.id ||
    !!world.people[id] ||
    !!world.jurisdictions[id] ||
    !!world.policyCatalog.domains[id] ||
    !!world.policyCatalog.issues[id] ||
    !!world.policyCatalog.propositions[id] ||
    !!world.policyCatalog.subjects[id] ||
    !!world.policyCatalog.principles[id] ||
    !!world.mindCatalog.tendencies[id] ||
    !!world.mindCatalog.values[id] ||
    world.history.events.some((record) => record.id === id) ||
    world.history.goalStates.some((record) => record.goalId === id) ||
    world.history.decisionTraces.some((record) => record.decisionId === id)
  );
}

function commitHistory(world: World, history: World["history"]): World {
  const next = { ...world, history };
  assertWorldIntegrity(next);
  return next;
}

function canonicalMindSourceRefs(
  references: readonly MindSourceReference[],
): readonly MindSourceReference[] {
  return [...references]
    .map((reference) => ({ ...reference }))
    .sort((left, right) =>
      mindSourceReferenceKey(left).localeCompare(mindSourceReferenceKey(right)),
    );
}

function mindSourceReferenceKey(reference: MindSourceReference): string {
  const id = Object.entries(reference).find(([key]) => key !== "kind")?.[1];
  return `${reference.kind}:${String(id)}`;
}

function assertMember<T extends string>(
  values: readonly T[],
  value: T,
  label: string,
): void {
  if (!values.includes(value)) {
    throw new Error(`Invalid ${label}: ${String(value)}`);
  }
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

function assertTags(tags: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const tag of tags) {
    assertNonEmpty(tag, `${label} tag`);
    if (seen.has(tag))
      throw new Error(`${label} contains a duplicate tag: ${tag}`);
    seen.add(tag);
  }
}

function runtimeKind(value: never): string {
  return String((value as { readonly kind?: unknown }).kind);
}
