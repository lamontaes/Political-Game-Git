import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { factsForPerson } from "./people";
import {
  assertOpenTaxonomyKey,
  DECISION_SOURCE_NAMESPACES,
  decisionSourceRequiresReference,
  PERCEPTION_SUBJECT_NAMESPACES,
} from "./taxonomy";
import type {
  DecisionContext,
  DecisionTraceRecord,
  EntityId,
  IsoDate,
  MindRecordProvenance,
  MindSourceReference,
  PerceptionRecord,
  PerceptionSource,
  World,
} from "./types";

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
const TERMINAL_GOAL_STATUSES = new Set([
  "completed",
  "failed",
  "abandoned",
  "superseded",
]);
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
const DECISION_IMPORTANCES = [
  "slight",
  "moderate",
  "strong",
  "decisive",
] as const;
const DECISION_PREFERENCES = [
  "strongly-opposed",
  "opposed",
  "mixed",
  "supported",
  "strongly-supported",
] as const;
const RANDOM_CONTRIBUTIONS = [
  "none",
  "slight-penalty",
  "slight-boost",
] as const;

/**
 * Validates Stage 4 record graphs loaded from persistence. Command-time checks
 * live beside the transitions; this independent pass protects deserialization
 * and catches discriminator, chronology, identity, and source-access tampering.
 */
export function validateMindHistoryIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  validateFamilyIdentities(
    world,
    ids,
    world.history.personalityTendencies,
    "personality-tendency",
  );
  validateFamilyIdentities(
    world,
    ids,
    world.history.personalValues,
    "personal-value",
  );
  validateFamilyIdentities(world, ids, world.history.goalStates, "goal-state");
  validateFamilyIdentities(world, ids, world.history.appraisals, "appraisal");
  validateFamilyIdentities(world, ids, world.history.perceptions, "perception");
  validateFamilyIdentities(
    world,
    ids,
    world.history.temporaryStates,
    "temporary-state",
  );
  validateFamilyIdentities(
    world,
    ids,
    world.history.decisionTraces,
    "decision-trace",
  );

  for (const goalId of new Set(
    world.history.goalStates.map((record) => record.goalId),
  )) {
    if (ids.has(goalId)) throw new Error(`Duplicate entity ID: ${goalId}`);
    ids.add(goalId);
  }
  for (const decisionId of new Set(
    world.history.decisionTraces.map((record) => record.decisionId),
  )) {
    if (ids.has(decisionId))
      throw new Error(`Duplicate entity ID: ${decisionId}`);
    ids.add(decisionId);
  }

  for (const record of world.history.personalityTendencies) {
    validatePersonDate(world, record.personId, record.recordedAt, record.id);
    const definition = world.mindCatalog.tendencies[record.tendencyId];
    if (
      !definition ||
      !definition.expressions.some(
        (expression) => expression.key === record.expressionKey,
      )
    ) {
      throw new Error(
        `Personality record has an invalid tendency: ${record.id}`,
      );
    }
    assertMember(MIND_STRENGTHS, record.strength, "personality strength");
    assertMember(MIND_CONFIDENCES, record.confidence, "personality confidence");
    assertCanonicalStrings(record.scopeTags, "personality scope tags");
    validateProvenance(
      world,
      record.personId,
      record.recordedAt,
      record.sequence,
      record.provenance,
    );
    validateImmediateSupersession(
      world.history.personalityTendencies,
      record,
      record.supersedesTendencyId,
      (candidate) => candidate.tendencyId,
      (candidate) => candidate.recordedAt,
      "personality tendency",
    );
  }

  for (const record of world.history.personalValues) {
    validatePersonDate(world, record.personId, record.recordedAt, record.id);
    if (!world.mindCatalog.values[record.valueId]) {
      throw new Error(
        `Personal-value record has an invalid value: ${record.id}`,
      );
    }
    assertMember(VALUE_ORIENTATIONS, record.orientation, "value orientation");
    assertMember(MIND_STRENGTHS, record.strength, "value strength");
    assertMember(VALUE_SALIENCES, record.salience, "value salience");
    assertOptionalString(record.qualification, "Value qualification");
    validateProvenance(
      world,
      record.personId,
      record.recordedAt,
      record.sequence,
      record.provenance,
    );
    validateImmediateSupersession(
      world.history.personalValues,
      record,
      record.supersedesValueId,
      (candidate) => candidate.valueId,
      (candidate) => candidate.recordedAt,
      "personal value",
    );
  }

  validateGoalHistory(world);
  validateAppraisalHistory(world);
  validatePerceptionHistory(world);

  for (const record of world.history.temporaryStates) {
    validatePersonDate(world, record.personId, record.recordedAt, record.id);
    const startsAt = makeIsoDate(record.startsAt);
    const endsAt = makeIsoDate(record.endsAt);
    const person = world.people[record.personId]!;
    if (
      startsAt < person.birthDate ||
      startsAt > world.currentDate ||
      endsAt <= startsAt
    ) {
      throw new Error(`Temporary state has an invalid interval: ${record.id}`);
    }
    assertNonEmpty(record.stateKey, "Temporary-state key");
    assertNonEmpty(record.label, "Temporary-state label");
    assertMember(MIND_STRENGTHS, record.intensity, "temporary-state intensity");
    assertCanonicalStrings(
      record.decisionTags,
      "temporary-state decision tags",
    );
    validateProvenance(
      world,
      record.personId,
      record.recordedAt,
      record.sequence,
      record.provenance,
    );
  }

  for (const trace of world.history.decisionTraces) {
    validateDecisionTrace(world, trace);
  }
}

function validateGoalHistory(world: World): void {
  for (const record of world.history.goalStates) {
    validatePersonDate(world, record.personId, record.recordedAt, record.id);
    assertNonEmpty(record.goalKey, "Goal key");
    assertNonEmpty(record.objective, "Goal objective");
    assertNonEmpty(record.domain, "Goal domain");
    assertNonEmpty(record.scope, "Goal scope");
    assertMember(GOAL_PRIORITIES, record.priority, "goal priority");
    assertMember(GOAL_STATUSES, record.status, "goal status");
    assertOptionalString(record.outcome, "Goal outcome");
    const createdAt = makeIsoDate(record.createdAt);
    const person = world.people[record.personId];
    if (
      !person ||
      createdAt < person.birthDate ||
      createdAt > record.recordedAt ||
      record.goalId !==
        createStableId(
          "goal",
          `${world.id}:${record.personId}:${record.goalKey}`,
        ) ||
      (record.deadline !== null && makeIsoDate(record.deadline) < createdAt)
    ) {
      throw new Error(
        `Goal state has invalid identity or chronology: ${record.id}`,
      );
    }
    if (
      record.targetEntityId !== null &&
      !entityExists(world, record.targetEntityId)
    ) {
      throw new Error(`Goal state references a missing target: ${record.id}`);
    }
    const targetPerson =
      record.targetEntityId === null
        ? undefined
        : world.people[record.targetEntityId];
    if (targetPerson && targetPerson.birthDate > record.recordedAt) {
      throw new Error(`Goal state predates its person target: ${record.id}`);
    }
    validateProvenance(
      world,
      record.personId,
      record.recordedAt,
      record.sequence,
      record.provenance,
    );

    const previous = world.history.goalStates
      .filter(
        (candidate) =>
          candidate.personId === record.personId &&
          candidate.goalId === record.goalId &&
          candidate.sequence < record.sequence,
      )
      .at(-1);
    const prior =
      record.supersedesGoalStateId === null
        ? undefined
        : world.history.goalStates.find(
            (candidate) => candidate.id === record.supersedesGoalStateId,
          );
    if (
      (previous === undefined && record.supersedesGoalStateId !== null) ||
      (previous !== undefined &&
        record.supersedesGoalStateId !== previous.id) ||
      (prior !== undefined &&
        (prior.personId !== record.personId ||
          prior.goalId !== record.goalId ||
          prior.goalKey !== record.goalKey ||
          prior.createdAt !== record.createdAt ||
          prior.recordedAt > record.recordedAt ||
          TERMINAL_GOAL_STATUSES.has(prior.status))) ||
      (record.supersedesGoalStateId !== null && prior === undefined)
    ) {
      throw new Error(`Invalid goal-state supersession: ${record.id}`);
    }
    if (
      previous === undefined &&
      record.status !== "proposed" &&
      record.status !== "active"
    ) {
      throw new Error(`A new goal has an invalid initial state: ${record.id}`);
    }
    if (record.replacesGoalId !== null) {
      const replaced = world.history.goalStates
        .filter(
          (candidate) =>
            candidate.personId === record.personId &&
            candidate.goalId === record.replacesGoalId &&
            candidate.sequence < record.sequence,
        )
        .at(-1);
      if (
        !replaced ||
        replaced.status !== "superseded" ||
        record.replacesGoalId === record.goalId
      ) {
        throw new Error(`Goal replacement is unavailable: ${record.id}`);
      }
    }
  }
}

function validateAppraisalHistory(world: World): void {
  for (const record of world.history.appraisals) {
    validatePersonDate(world, record.personId, record.appraisedAt, record.id);
    const event = world.history.events.find(
      (candidate) => candidate.id === record.eventId,
    );
    const memory =
      record.memoryId === null
        ? undefined
        : world.history.memories.find(
            (candidate) => candidate.id === record.memoryId,
          );
    const knowledge =
      record.eventKnowledgeId === null
        ? undefined
        : world.history.knowledge.find(
            (candidate) => candidate.id === record.eventKnowledgeId,
          );
    if (
      !event ||
      event.sequence >= record.sequence ||
      event.occurredAt > record.appraisedAt ||
      (record.memoryId !== null &&
        (!memory ||
          memory.personId !== record.personId ||
          memory.eventId !== record.eventId ||
          memory.sequence >= record.sequence ||
          memory.formedAt > record.appraisedAt)) ||
      (record.eventKnowledgeId !== null &&
        (!knowledge ||
          knowledge.personId !== record.personId ||
          knowledge.eventId !== record.eventId ||
          knowledge.sequence >= record.sequence ||
          knowledge.learnedAt > record.appraisedAt)) ||
      (!event.involvedEntityIds.includes(record.personId) &&
        !memory &&
        !knowledge)
    ) {
      throw new Error(`Appraisal lacks an available event basis: ${record.id}`);
    }
    if (record.meanings.length === 0) {
      throw new Error(`Appraisal requires a meaning: ${record.id}`);
    }
    const meaningKeys = record.meanings.map((meaning) => meaning.key);
    assertCanonicalStrings(meaningKeys, "appraisal meanings");
    for (const meaning of record.meanings) {
      assertNonEmpty(meaning.key, "Appraisal meaning key");
      assertNonEmpty(meaning.label, "Appraisal meaning label");
      assertMember(APPRAISAL_VALENCES, meaning.valence, "appraisal valence");
      assertMember(MIND_STRENGTHS, meaning.intensity, "appraisal intensity");
    }
    assertNonEmpty(record.interpretation, "Appraisal interpretation");
    assertMember(MIND_CONFIDENCES, record.confidence, "appraisal confidence");
    assertCanonicalIds(record.involvedPersonIds, "appraisal involved people");
    for (const personId of record.involvedPersonIds) {
      if (
        !world.people[personId] ||
        !event.involvedEntityIds.includes(personId)
      ) {
        throw new Error(
          `Appraisal references an uninvolved person: ${record.id}`,
        );
      }
    }
    validateProvenance(
      world,
      record.personId,
      record.appraisedAt,
      record.sequence,
      record.provenance,
    );
    validateImmediateSupersession(
      world.history.appraisals,
      record,
      record.supersedesAppraisalId,
      (candidate) => candidate.eventId,
      (candidate) => candidate.appraisedAt,
      "appraisal",
    );
  }
}

function validatePerceptionHistory(world: World): void {
  for (const record of world.history.perceptions) {
    validatePersonDate(world, record.personId, record.perceivedAt, record.id);
    assertOpenTaxonomyKey(
      record.subjectKind,
      PERCEPTION_SUBJECT_NAMESPACES,
      "Perception subject kind",
    );
    assertNonEmpty(record.subjectKey, "Perception subject key");
    assertNonEmpty(record.assertion, "Perception assertion");
    assertMember(MIND_CONFIDENCES, record.confidence, "perception confidence");
    assertMember(
      SOURCE_CREDIBILITIES,
      record.sourceCredibility,
      "source credibility",
    );
    if (
      record.subjectEntityId !== null &&
      !entityExists(world, record.subjectEntityId)
    ) {
      throw new Error(`Perception references a missing subject: ${record.id}`);
    }
    validatePerceptionSource(world, record);
    if (record.supersedesPerceptionId !== null) {
      const prior = world.history.perceptions.find(
        (candidate) => candidate.id === record.supersedesPerceptionId,
      );
      if (
        !prior ||
        prior.sequence >= record.sequence ||
        prior.personId !== record.personId ||
        prior.subjectKind !== record.subjectKind ||
        prior.subjectKey !== record.subjectKey ||
        prior.subjectEntityId !== record.subjectEntityId ||
        prior.perceivedAt > record.perceivedAt
      ) {
        throw new Error(`Invalid perception supersession: ${record.id}`);
      }
    }
  }
}

function validatePerceptionSource(
  world: World,
  record: PerceptionRecord,
): void {
  const source = record.source;
  switch (source.kind) {
    case "person-fact":
      validateSourceRefs(
        world,
        record.personId,
        record.perceivedAt,
        record.sequence,
        [{ kind: "person-fact", factId: source.factId }],
      );
      return;
    case "proposition-exposure":
      validateSourceRefs(
        world,
        record.personId,
        record.perceivedAt,
        record.sequence,
        [{ kind: "proposition-exposure", exposureId: source.exposureId }],
      );
      return;
    case "subject-knowledge":
      validateSourceRefs(
        world,
        record.personId,
        record.perceivedAt,
        record.sequence,
        [
          {
            kind: "subject-knowledge",
            subjectKnowledgeId: source.subjectKnowledgeId,
          },
        ],
      );
      return;
    case "appraisal":
      validateSourceRefs(
        world,
        record.personId,
        record.perceivedAt,
        record.sequence,
        [{ kind: "appraisal", appraisalId: source.appraisalId }],
      );
      return;
    case "event-knowledge":
      validateSourceRefs(
        world,
        record.personId,
        record.perceivedAt,
        record.sequence,
        [{ kind: "event-knowledge", knowledgeId: source.knowledgeId }],
      );
      return;
    case "memory":
      validateSourceRefs(
        world,
        record.personId,
        record.perceivedAt,
        record.sequence,
        [{ kind: "memory", memoryId: source.memoryId }],
      );
      return;
    case "heard-claim": {
      const knowledge = world.history.knowledge.find(
        (candidate) => candidate.id === source.knowledgeId,
      );
      if (
        !knowledge ||
        knowledge.personId !== record.personId ||
        knowledge.source.kind !== "told-by" ||
        knowledge.source.claimId !== source.claimId
      ) {
        throw new Error(
          `Heard-claim perception has no reception: ${record.id}`,
        );
      }
      validateSourceRefs(
        world,
        record.personId,
        record.perceivedAt,
        record.sequence,
        [
          { kind: "event-knowledge", knowledgeId: source.knowledgeId },
          { kind: "claim", claimId: source.claimId },
        ],
      );
      return;
    }
    case "inference":
      if (source.basisPerceptionIds.length === 0) {
        throw new Error(`Inference has no basis: ${record.id}`);
      }
      assertCanonicalIds(source.basisPerceptionIds, "inference perception IDs");
      validateSourceRefs(
        world,
        record.personId,
        record.perceivedAt,
        record.sequence,
        source.basisPerceptionIds.map((perceptionId) => ({
          kind: "perception" as const,
          perceptionId,
        })),
      );
      return;
    case "trusted-cue":
      validateTrustedCue(world, record, source);
      return;
    case "relationship-derived":
      validateOtherPerson(world, record, source.sourcePersonId);
      validateRelationshipSources(
        world,
        record,
        source.sourcePersonId,
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
  record: PerceptionRecord,
  source: Extract<PerceptionSource, { readonly kind: "trusted-cue" }>,
): void {
  validateOtherPerson(world, record, source.sourcePersonId);
  assertNonEmpty(source.sourceLabel, "Trusted-cue source label");
  assertCanonicalIds(
    source.communicationRecordIds,
    "trusted-cue communication IDs",
  );
  if (source.communicationRecordIds.length === 0) {
    throw new Error(`Trusted cue has no communication evidence: ${record.id}`);
  }
  validateRelationshipSources(
    world,
    record,
    source.sourcePersonId,
    source.relationshipInteractionIds,
  );
  let hasReception = false;
  let hasSourceExpression = false;
  for (const recordId of source.communicationRecordIds) {
    const exposure = world.history.propositionExposures.find(
      (candidate) => candidate.id === recordId,
    );
    const knowledge = world.history.knowledge.find(
      (candidate) => candidate.id === recordId,
    );
    const position = world.history.publicPositions.find(
      (candidate) => candidate.id === recordId,
    );
    const claim = world.history.claims.find(
      (candidate) => candidate.id === recordId,
    );
    if (
      exposure &&
      exposure.sequence < record.sequence &&
      exposure.personId === record.personId &&
      exposure.encounteredAt <= record.perceivedAt &&
      exposure.provenance.kind === "told-by" &&
      exposure.provenance.sourcePersonId === source.sourcePersonId
    ) {
      hasReception = true;
      continue;
    }
    if (
      knowledge &&
      knowledge.sequence < record.sequence &&
      knowledge.personId === record.personId &&
      knowledge.learnedAt <= record.perceivedAt &&
      knowledge.source.kind === "told-by" &&
      knowledge.source.sourcePersonId === source.sourcePersonId
    ) {
      hasReception = true;
      continue;
    }
    if (
      position &&
      position.sequence < record.sequence &&
      position.personId === source.sourcePersonId &&
      position.statedAt <= record.perceivedAt
    ) {
      hasSourceExpression = true;
      continue;
    }
    if (
      claim &&
      claim.sequence < record.sequence &&
      claim.speakerPersonId === source.sourcePersonId &&
      claim.madeAt <= record.perceivedAt
    ) {
      hasSourceExpression = true;
      continue;
    }
    throw new Error(`Trusted cue has unavailable communication: ${recordId}`);
  }
  if (!hasReception || !hasSourceExpression) {
    throw new Error(
      `Trusted cue needs reception and expression evidence: ${record.id}`,
    );
  }
}

function validateRelationshipSources(
  world: World,
  record: PerceptionRecord,
  sourcePersonId: EntityId,
  interactionIds: readonly EntityId[],
): void {
  assertCanonicalIds(interactionIds, "relationship source IDs");
  if (interactionIds.length === 0) {
    throw new Error(
      `Relationship-derived perception has no history: ${record.id}`,
    );
  }
  for (const interactionId of interactionIds) {
    const interaction = world.history.relationshipInteractions.find(
      (candidate) => candidate.id === interactionId,
    );
    if (
      !interaction ||
      interaction.sequence >= record.sequence ||
      interaction.occurredAt > record.perceivedAt ||
      !interaction.personIds.includes(record.personId) ||
      !interaction.personIds.includes(sourcePersonId)
    ) {
      throw new Error(
        `Perception has unavailable relationship evidence: ${record.id}`,
      );
    }
  }
}

function validateDecisionTrace(world: World, trace: DecisionTraceRecord): void {
  const context = trace.context;
  validatePersonDate(world, context.actorPersonId, trace.recordedAt, trace.id);
  assertNonEmpty(trace.stableKey, "Decision trace stable key");
  assertNonEmpty(context.stableKey, "Decision stable key");
  assertNonEmpty(context.decisionType, "Decision type");
  assertOpenTaxonomyKey(
    context.subject.kind,
    PERCEPTION_SUBJECT_NAMESPACES,
    "Decision subject kind",
  );
  assertNonEmpty(context.subject.key, "Decision subject key");
  if (
    trace.stableKey !== `${context.stableKey}:trace` ||
    trace.decisionId !==
      createStableId(
        "decision",
        `${world.id}:${context.actorPersonId}:${context.stableKey}`,
      ) ||
    trace.recordedAt !== context.cutoff.asOfDate ||
    trace.rngVersion !== "decision-rng-v1" ||
    context.retention !== "durable" ||
    (context.randomness !== "none" && context.randomness !== "close-choices")
  ) {
    throw new Error(
      `Decision trace has invalid identity or policy: ${trace.id}`,
    );
  }
  if (
    !Number.isSafeInteger(context.cutoff.historySequenceExclusive) ||
    context.cutoff.historySequenceExclusive < 0 ||
    context.cutoff.historySequenceExclusive > trace.sequence ||
    context.cutoff.asOfDate < world.people[context.actorPersonId]!.birthDate ||
    context.cutoff.asOfDate > world.currentDate
  ) {
    throw new Error(
      `Decision trace has an invalid historical cutoff: ${trace.id}`,
    );
  }
  if (
    context.subject.entityId !== null &&
    !entityExists(world, context.subject.entityId)
  ) {
    throw new Error(`Decision trace references a missing subject: ${trace.id}`);
  }
  validateDecisionContext(world, trace, context);
}

function validateDecisionContext(
  world: World,
  trace: DecisionTraceRecord,
  context: DecisionContext,
): void {
  if (context.options.length < 2) {
    throw new Error(`Decision trace has too few options: ${trace.id}`);
  }
  const optionKeys = context.options.map((option) => option.key);
  assertCanonicalStrings(optionKeys, "decision option keys");
  for (const option of context.options) {
    assertNonEmpty(option.key, "Decision option key");
    assertNonEmpty(option.label, "Decision option label");
    assertNonEmpty(option.description, "Decision option description");
  }
  const optionSet = new Set(optionKeys);
  const constraintKeys = context.constraints.map(
    (constraint) => constraint.stableKey,
  );
  assertCanonicalStrings(constraintKeys, "decision constraint keys");
  for (const constraint of context.constraints) {
    assertNonEmpty(constraint.stableKey, "Decision constraint key");
    assertNonEmpty(constraint.kind, "Decision constraint kind");
    assertNonEmpty(constraint.explanation, "Decision constraint explanation");
    if (!optionSet.has(constraint.optionKey)) {
      throw new Error(`Decision constraint has a missing option: ${trace.id}`);
    }
    validateSourceRefs(
      world,
      context.actorPersonId,
      context.cutoff.asOfDate,
      context.cutoff.historySequenceExclusive,
      constraint.sourceRefs,
    );
  }
  const considerationKeys = context.considerations.map(
    (consideration) => consideration.stableKey,
  );
  assertCanonicalStrings(considerationKeys, "decision consideration keys");
  for (const consideration of context.considerations) {
    assertNonEmpty(consideration.stableKey, "Decision consideration key");
    assertNonEmpty(
      consideration.explanation,
      "Decision consideration explanation",
    );
    if (!optionSet.has(consideration.optionKey)) {
      throw new Error(
        `Decision consideration has a missing option: ${trace.id}`,
      );
    }
    assertOpenTaxonomyKey(
      consideration.sourceType,
      DECISION_SOURCE_NAMESPACES,
      "Decision source type",
    );
    if (
      decisionSourceRequiresReference(consideration.sourceType) &&
      consideration.sourceRefs.length === 0
    ) {
      throw new Error(
        `Decision source lacks provenance references: ${trace.id}`,
      );
    }
    if (
      consideration.direction !== "supports" &&
      consideration.direction !== "opposes"
    ) {
      throw new Error(
        `Decision consideration has an invalid direction: ${trace.id}`,
      );
    }
    assertMember(
      DECISION_IMPORTANCES,
      consideration.importance,
      "decision importance",
    );
    assertMember(
      MIND_CONFIDENCES,
      consideration.confidence,
      "decision confidence",
    );
    validateSourceRefs(
      world,
      context.actorPersonId,
      context.cutoff.asOfDate,
      context.cutoff.historySequenceExclusive,
      consideration.sourceRefs,
    );
  }
  assertCanonicalIds(context.perceptionIds, "decision perception IDs");
  validateSourceRefs(
    world,
    context.actorPersonId,
    context.cutoff.asOfDate,
    context.cutoff.historySequenceExclusive,
    context.perceptionIds.map((perceptionId) => ({
      kind: "perception" as const,
      perceptionId,
    })),
  );

  if (trace.optionEvaluations.length !== context.options.length) {
    throw new Error(`Decision trace option evaluations disagree: ${trace.id}`);
  }
  const ranks = new Set<number>();
  for (let index = 0; index < trace.optionEvaluations.length; index += 1) {
    const evaluation = trace.optionEvaluations[index]!;
    const option = context.options[index]!;
    const blockers = context.constraints
      .filter((constraint) => constraint.optionKey === option.key)
      .map((constraint) => constraint.stableKey);
    const considerations = context.considerations
      .filter((item) => item.optionKey === option.key)
      .map((item) => item.stableKey);
    if (
      evaluation.optionKey !== option.key ||
      evaluation.available !== (blockers.length === 0) ||
      JSON.stringify(evaluation.blockedByConstraintKeys) !==
        JSON.stringify(blockers) ||
      JSON.stringify(evaluation.considerationKeys) !==
        JSON.stringify(considerations)
    ) {
      throw new Error(
        `Decision option explanation is inconsistent: ${trace.id}`,
      );
    }
    assertMember(
      DECISION_PREFERENCES,
      evaluation.preference,
      "decision preference",
    );
    assertMember(
      RANDOM_CONTRIBUTIONS,
      evaluation.randomContribution,
      "random contribution",
    );
    if (evaluation.available) {
      if (
        evaluation.finalRank === null ||
        !Number.isSafeInteger(evaluation.finalRank) ||
        evaluation.finalRank < 1 ||
        ranks.has(evaluation.finalRank)
      ) {
        throw new Error(`Decision option rank is invalid: ${trace.id}`);
      }
      ranks.add(evaluation.finalRank);
    } else if (
      evaluation.finalRank !== null ||
      evaluation.randomContribution !== "none"
    ) {
      throw new Error(
        `A blocked option received a rank or randomness: ${trace.id}`,
      );
    }
  }
  const winner = trace.optionEvaluations.find(
    (evaluation) => evaluation.finalRank === 1,
  );
  if (
    (trace.outcomeKind === "selected" &&
      (!winner || trace.selectedOptionKey !== winner.optionKey)) ||
    (trace.outcomeKind === "no-available-option" &&
      (winner !== undefined || trace.selectedOptionKey !== null)) ||
    (trace.outcomeKind !== "selected" &&
      trace.outcomeKind !== "no-available-option")
  ) {
    throw new Error(`Decision trace outcome is inconsistent: ${trace.id}`);
  }

  const usedRefs = canonicalSourceRefs([
    ...context.constraints.flatMap((constraint) => constraint.sourceRefs),
    ...context.considerations.flatMap(
      (consideration) => consideration.sourceRefs,
    ),
    ...context.perceptionIds.map((perceptionId) => ({
      kind: "perception" as const,
      perceptionId,
    })),
  ]);
  const snapshotRefs = trace.sourceSnapshots.map(
    (snapshot) => snapshot.reference,
  );
  if (
    JSON.stringify(snapshotRefs) !== JSON.stringify(usedRefs) ||
    trace.sourceSnapshots.some(
      (snapshot) => !nonEmpty(snapshot.label) || !nonEmpty(snapshot.content),
    )
  ) {
    throw new Error(`Decision source snapshots are incomplete: ${trace.id}`);
  }
}

function validateProvenance(
  world: World,
  personId: EntityId,
  date: IsoDate,
  sequence: number,
  provenance: MindRecordProvenance,
): void {
  assertMember(MIND_PROVENANCE_KINDS, provenance.kind, "mind provenance kind");
  assertOptionalString(provenance.note, "Mind provenance note");
  validateSourceRefs(world, personId, date, sequence, provenance.sourceRefs);
}

function validateSourceRefs(
  world: World,
  personId: EntityId,
  asOfDate: IsoDate,
  sequenceExclusive: number,
  references: readonly MindSourceReference[],
): void {
  if (
    JSON.stringify(references) !==
    JSON.stringify(canonicalSourceRefs(references))
  ) {
    throw new Error("Mind source references must be sorted and unique.");
  }
  const ownMemoryIds = new Set(
    references.flatMap((reference) =>
      reference.kind === "memory" ? [reference.memoryId] : [],
    ),
  );
  const ownKnowledgeIds = new Set(
    references.flatMap((reference) =>
      reference.kind === "event-knowledge" ? [reference.knowledgeId] : [],
    ),
  );
  for (const reference of references) {
    switch (reference.kind) {
      case "person-fact": {
        const person = world.people[personId];
        const fact = person
          ? factsForPerson(person).find(
              (candidate) => candidate.id === reference.factId,
            )
          : undefined;
        if (!fact || fact.occurredAt > asOfDate) {
          throw new Error(
            `Unavailable person-fact source: ${reference.factId}`,
          );
        }
        break;
      }
      case "personality-tendency":
        validateOwnedRecord(
          world.history.personalityTendencies.find(
            (candidate) => candidate.id === reference.tendencyRecordId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.recordedAt,
          reference.tendencyRecordId,
        );
        break;
      case "personal-value":
        validateOwnedRecord(
          world.history.personalValues.find(
            (candidate) => candidate.id === reference.valueRecordId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.recordedAt,
          reference.valueRecordId,
        );
        break;
      case "goal-state":
        validateOwnedRecord(
          world.history.goalStates.find(
            (candidate) => candidate.id === reference.goalStateId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.recordedAt,
          reference.goalStateId,
        );
        break;
      case "temporary-state":
        validateOwnedRecord(
          world.history.temporaryStates.find(
            (candidate) => candidate.id === reference.temporaryStateId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.recordedAt,
          reference.temporaryStateId,
        );
        break;
      case "historical-event": {
        const event = world.history.events.find(
          (candidate) => candidate.id === reference.eventId,
        );
        const accessible =
          !!event &&
          (event.involvedEntityIds.includes(personId) ||
            world.history.memories.some(
              (memory) =>
                ownMemoryIds.has(memory.id) &&
                memory.personId === personId &&
                memory.eventId === event.id &&
                memory.sequence < sequenceExclusive,
            ) ||
            world.history.knowledge.some(
              (knowledge) =>
                ownKnowledgeIds.has(knowledge.id) &&
                knowledge.personId === personId &&
                knowledge.eventId === event.id &&
                knowledge.sequence < sequenceExclusive,
            ));
        if (
          !event ||
          !accessible ||
          event.occurredAt > asOfDate ||
          event.sequence >= sequenceExclusive
        ) {
          throw new Error(
            `Unavailable historical-event source: ${reference.eventId}`,
          );
        }
        break;
      }
      case "memory":
        validateOwnedRecord(
          world.history.memories.find(
            (candidate) => candidate.id === reference.memoryId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.formedAt,
          reference.memoryId,
        );
        break;
      case "event-knowledge":
        validateOwnedRecord(
          world.history.knowledge.find(
            (candidate) => candidate.id === reference.knowledgeId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.learnedAt,
          reference.knowledgeId,
        );
        break;
      case "claim": {
        const claim = world.history.claims.find(
          (candidate) => candidate.id === reference.claimId,
        );
        const heard = world.history.knowledge.some(
          (knowledge) =>
            ownKnowledgeIds.has(knowledge.id) &&
            knowledge.personId === personId &&
            knowledge.source.kind === "told-by" &&
            knowledge.source.claimId === reference.claimId &&
            knowledge.sequence < sequenceExclusive,
        );
        if (
          !claim ||
          (claim.speakerPersonId !== personId && !heard) ||
          claim.madeAt > asOfDate ||
          claim.sequence >= sequenceExclusive
        ) {
          throw new Error(`Unavailable claim source: ${reference.claimId}`);
        }
        break;
      }
      case "relationship-interaction": {
        const interaction = world.history.relationshipInteractions.find(
          (candidate) => candidate.id === reference.interactionId,
        );
        if (
          !interaction ||
          !interaction.personIds.includes(personId) ||
          interaction.occurredAt > asOfDate ||
          interaction.sequence >= sequenceExclusive
        ) {
          throw new Error(
            `Unavailable relationship source: ${reference.interactionId}`,
          );
        }
        break;
      }
      case "proposition-exposure":
        validateOwnedRecord(
          world.history.propositionExposures.find(
            (candidate) => candidate.id === reference.exposureId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.encounteredAt,
          reference.exposureId,
        );
        break;
      case "private-belief":
        validateOwnedRecord(
          world.history.privateBeliefs.find(
            (candidate) => candidate.id === reference.beliefId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.formedAt,
          reference.beliefId,
        );
        break;
      case "political-principle":
        validateOwnedRecord(
          world.history.principles.find(
            (candidate) => candidate.id === reference.principleRecordId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.formedAt,
          reference.principleRecordId,
        );
        break;
      case "subject-knowledge":
        validateOwnedRecord(
          world.history.subjectKnowledge.find(
            (candidate) => candidate.id === reference.subjectKnowledgeId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.recordedAt,
          reference.subjectKnowledgeId,
        );
        break;
      case "appraisal":
        validateOwnedRecord(
          world.history.appraisals.find(
            (candidate) => candidate.id === reference.appraisalId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.appraisedAt,
          reference.appraisalId,
        );
        break;
      case "perception":
        validateOwnedRecord(
          world.history.perceptions.find(
            (candidate) => candidate.id === reference.perceptionId,
          ),
          personId,
          asOfDate,
          sequenceExclusive,
          (candidate) => candidate.perceivedAt,
          reference.perceptionId,
        );
        break;
      case "decision-trace": {
        const trace = world.history.decisionTraces.find(
          (candidate) => candidate.id === reference.decisionTraceId,
        );
        if (
          !trace ||
          trace.context.actorPersonId !== personId ||
          trace.recordedAt > asOfDate ||
          trace.sequence >= sequenceExclusive
        ) {
          throw new Error(
            `Unavailable decision trace: ${reference.decisionTraceId}`,
          );
        }
        break;
      }
      default:
        throw new Error(
          `Invalid mind source reference: ${runtimeKind(reference)}`,
        );
    }
  }
}

function validateOwnedRecord<
  T extends { readonly personId: EntityId; readonly sequence: number },
>(
  record: T | undefined,
  personId: EntityId,
  asOfDate: IsoDate,
  sequenceExclusive: number,
  dateOf: (record: T) => IsoDate,
  id: EntityId,
): void {
  if (
    !record ||
    record.personId !== personId ||
    record.sequence >= sequenceExclusive ||
    dateOf(record) > asOfDate
  ) {
    throw new Error(`Unavailable person-owned mind source: ${id}`);
  }
}

function validateImmediateSupersession<
  T extends {
    readonly id: EntityId;
    readonly personId: EntityId;
    readonly sequence: number;
  },
>(
  records: readonly T[],
  record: T,
  priorId: EntityId | null,
  subjectOf: (record: T) => EntityId,
  dateOf: (record: T) => IsoDate,
  label: string,
): void {
  const previous = records
    .filter(
      (candidate) =>
        candidate.personId === record.personId &&
        subjectOf(candidate) === subjectOf(record) &&
        candidate.sequence < record.sequence,
    )
    .at(-1);
  const prior =
    priorId === null ? undefined : records.find((item) => item.id === priorId);
  if (
    (previous === undefined && priorId !== null) ||
    (previous !== undefined && previous.id !== priorId) ||
    (priorId !== null && prior === undefined) ||
    (prior !== undefined &&
      (prior.personId !== record.personId ||
        subjectOf(prior) !== subjectOf(record) ||
        prior.sequence >= record.sequence ||
        dateOf(prior) > dateOf(record)))
  ) {
    throw new Error(`Invalid ${label} supersession: ${record.id}`);
  }
}

function validateFamilyIdentities(
  world: World,
  ids: Set<EntityId>,
  records: readonly { readonly id: EntityId; readonly stableKey: string }[],
  kind:
    | "personality-tendency"
    | "personal-value"
    | "goal-state"
    | "appraisal"
    | "perception"
    | "temporary-state"
    | "decision-trace",
): void {
  const keys = new Set<string>();
  for (const record of records) {
    assertNonEmpty(record.stableKey, `${kind} stable key`);
    if (keys.has(record.stableKey)) {
      throw new Error(`Duplicate ${kind} stable key: ${record.stableKey}`);
    }
    keys.add(record.stableKey);
    if (ids.has(record.id))
      throw new Error(`Duplicate entity ID: ${record.id}`);
    ids.add(record.id);
    if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
      throw new Error(`${kind} ID does not match its stable key: ${record.id}`);
    }
  }
}

function validatePersonDate(
  world: World,
  personId: EntityId,
  date: IsoDate,
  recordId: EntityId,
): void {
  const person = world.people[personId];
  const parsed = makeIsoDate(date);
  if (!person || parsed < person.birthDate || parsed > world.currentDate) {
    throw new Error(`Mind record has invalid person chronology: ${recordId}`);
  }
}

function validateOtherPerson(
  world: World,
  record: PerceptionRecord,
  sourcePersonId: EntityId,
): void {
  const source = world.people[sourcePersonId];
  if (
    !source ||
    sourcePersonId === record.personId ||
    source.birthDate > record.perceivedAt
  ) {
    throw new Error(
      `Perception has an unavailable source person: ${record.id}`,
    );
  }
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

function canonicalSourceRefs(
  references: readonly MindSourceReference[],
): readonly MindSourceReference[] {
  const records = new Map<string, MindSourceReference>();
  for (const reference of references) {
    records.set(sourceRefKey(reference), { ...reference });
  }
  return [...records.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, reference]) => reference);
}

function sourceRefKey(reference: MindSourceReference): string {
  const id = Object.entries(reference).find(([key]) => key !== "kind")?.[1];
  return `${reference.kind}:${String(id)}`;
}

function assertCanonicalIds(ids: readonly EntityId[], label: string): void {
  const expected = [...new Set(ids)].sort();
  if (JSON.stringify(ids) !== JSON.stringify(expected)) {
    throw new Error(`${label} must contain sorted unique IDs.`);
  }
}

function assertCanonicalStrings(
  values: readonly string[],
  label: string,
): void {
  const expected = [...new Set(values)].sort();
  if (JSON.stringify(values) !== JSON.stringify(expected)) {
    throw new Error(`${label} must be sorted and unique.`);
  }
}

function assertMember<T extends string>(
  values: readonly T[],
  value: T,
  label: string,
): void {
  if (!values.includes(value))
    throw new Error(`Invalid ${label}: ${String(value)}`);
}

function assertOptionalString(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (!nonEmpty(value)) throw new Error(`${label} must be a non-empty string.`);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function runtimeKind(value: never): string {
  return String((value as { readonly kind?: unknown }).kind);
}
