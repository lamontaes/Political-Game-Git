import { appendDecisionTraceRecord } from "./history";
import { createStableId } from "./ids";
import { lifeEntityExists } from "./life-integrity";
import { resourceHousingEntityExists } from "./resource-integrity";
import {
  lifeHistoryReferenceKey,
  resolveLifeHistorySource,
} from "./life-sources";
import { validateMindSourceReferences } from "./mind";
import { factsForPerson } from "./people";
import { validateCutoff } from "./perception";
import { SeededRng } from "./rng";
import {
  assertOpenTaxonomyKey,
  decisionSourceRequiresReference,
  DECISION_SOURCE_NAMESPACES,
  PERCEPTION_SUBJECT_NAMESPACES,
} from "./taxonomy";
import type {
  DecisionConsideration,
  DecisionContext,
  DecisionEvaluation,
  DecisionImportance,
  DecisionOptionEvaluation,
  DecisionPreference,
  DecisionSourceSnapshot,
  EntityId,
  MindConfidence,
  MindSourceReference,
  RandomContribution,
  World,
} from "./types";
import { assertWorldIntegrity, resolveEntityLabel } from "./world";

const IMPORTANCES = ["slight", "moderate", "strong", "decisive"] as const;
const CONFIDENCES = ["low", "medium", "high"] as const;
const RANDOMNESS_POLICIES = ["none", "close-choices"] as const;
const RETENTION_POLICIES = ["ephemeral", "durable"] as const;

const IMPORTANCE_WEIGHT: Record<DecisionImportance, number> = {
  slight: 1,
  moderate: 2,
  strong: 4,
  decisive: 6,
};
const CONFIDENCE_WEIGHT: Record<MindConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};
const CLOSE_CHOICE_WINDOW = 2;

export function evaluateDecision(
  world: World,
  contextInput: DecisionContext,
): DecisionEvaluation {
  validateCutoff(world, contextInput.actorPersonId, contextInput.cutoff);
  assertNonEmpty(contextInput.stableKey, "Decision stable key");
  assertNonEmpty(contextInput.decisionType, "Decision type");
  assertOpenTaxonomyKey(
    contextInput.subject.kind,
    PERCEPTION_SUBJECT_NAMESPACES,
    "Decision subject kind",
  );
  assertNonEmpty(contextInput.subject.key, "Decision subject key");
  assertMember(
    RANDOMNESS_POLICIES,
    contextInput.randomness,
    "decision randomness policy",
  );
  assertMember(
    RETENTION_POLICIES,
    contextInput.retention,
    "decision retention policy",
  );
  if (
    contextInput.subject.entityId !== null &&
    !decisionSubjectExists(world, contextInput.subject.entityId)
  ) {
    throw new Error(
      `Decision subject entity does not exist: ${contextInput.subject.entityId}`,
    );
  }

  const context = canonicalDecisionContext(contextInput);
  if (context.options.length < 2) {
    throw new Error("A decision requires at least two distinct options.");
  }
  const optionKeys = new Set(context.options.map((option) => option.key));
  if (optionKeys.size !== context.options.length) {
    throw new Error("Decision option keys must be unique.");
  }
  for (const option of context.options) {
    assertNonEmpty(option.key, "Decision option key");
    assertNonEmpty(option.label, "Decision option label");
    assertNonEmpty(option.description, "Decision option description");
  }

  const constraintKeys = new Set<string>();
  for (const constraint of context.constraints) {
    assertNonEmpty(constraint.stableKey, "Decision constraint stable key");
    assertNonEmpty(constraint.kind, "Decision constraint kind");
    assertNonEmpty(constraint.explanation, "Decision constraint explanation");
    if (!optionKeys.has(constraint.optionKey)) {
      throw new Error(
        `Decision constraint references a missing option: ${constraint.optionKey}`,
      );
    }
    if (constraintKeys.has(constraint.stableKey)) {
      throw new Error(
        `Duplicate decision constraint key: ${constraint.stableKey}`,
      );
    }
    constraintKeys.add(constraint.stableKey);
    validateMindSourceReferences(
      world,
      context.actorPersonId,
      context.cutoff.asOfDate,
      constraint.sourceRefs,
      context.cutoff.historySequenceExclusive,
    );
  }

  const considerationKeys = new Set<string>();
  for (const consideration of context.considerations) {
    validateConsideration(
      world,
      context,
      consideration,
      optionKeys,
      considerationKeys,
    );
  }

  validateMindSourceReferences(
    world,
    context.actorPersonId,
    context.cutoff.asOfDate,
    context.perceptionIds.map((perceptionId) => ({
      kind: "perception" as const,
      perceptionId,
    })),
    context.cutoff.historySequenceExclusive,
  );

  const decisionId = createStableId(
    "decision",
    `${world.id}:${context.actorPersonId}:${context.stableKey}`,
  );
  const baseScores = new Map<string, number>();
  const blockedByOption = new Map<string, readonly string[]>();
  for (const option of context.options) {
    const blockers = context.constraints
      .filter((constraint) => constraint.optionKey === option.key)
      .map((constraint) => constraint.stableKey);
    blockedByOption.set(option.key, blockers);
    const score = context.considerations
      .filter((consideration) => consideration.optionKey === option.key)
      .reduce(
        (total, consideration) => total + considerationScore(consideration),
        0,
      );
    baseScores.set(option.key, score);
  }

  const available = context.options.filter(
    (option) => (blockedByOption.get(option.key)?.length ?? 0) === 0,
  );
  const randomByOption = new Map<string, number>();
  for (const option of context.options) randomByOption.set(option.key, 0);
  if (context.randomness === "close-choices" && available.length > 1) {
    const highest = Math.max(
      ...available.map((option) => baseScores.get(option.key) ?? 0),
    );
    const closeOptions = available.filter(
      (option) =>
        highest - (baseScores.get(option.key) ?? 0) <= CLOSE_CHOICE_WINDOW,
    );
    for (const option of closeOptions.length > 1 ? closeOptions : []) {
      const optionRng = new SeededRng(world.seed)
        .fork(`decision-v1:${decisionId}:${context.actorPersonId}`)
        .fork(`option:${option.key}`);
      randomByOption.set(option.key, optionRng.integer(-1, 2));
    }
  }

  const ranked = available
    .map((option) => ({
      option,
      score:
        (baseScores.get(option.key) ?? 0) +
        (randomByOption.get(option.key) ?? 0),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.option.key.localeCompare(right.option.key),
    );
  const rankByOption = new Map(
    ranked.map((entry, index) => [entry.option.key, index + 1]),
  );
  const optionEvaluations: readonly DecisionOptionEvaluation[] =
    context.options.map((option) => {
      const blockers = blockedByOption.get(option.key) ?? [];
      const random = randomByOption.get(option.key) ?? 0;
      return {
        optionKey: option.key,
        available: blockers.length === 0,
        blockedByConstraintKeys: [...blockers],
        considerationKeys: context.considerations
          .filter((consideration) => consideration.optionKey === option.key)
          .map((consideration) => consideration.stableKey),
        preference: preferenceFor(baseScores.get(option.key) ?? 0),
        randomContribution: randomContributionFor(random),
        finalRank: rankByOption.get(option.key) ?? null,
      };
    });

  const sourceRefs = canonicalMindSourceRefs([
    ...context.constraints.flatMap((constraint) => constraint.sourceRefs),
    ...context.considerations.flatMap(
      (consideration) => consideration.sourceRefs,
    ),
    ...context.perceptionIds.map((perceptionId) => ({
      kind: "perception" as const,
      perceptionId,
    })),
  ]);

  return {
    decisionId,
    context,
    optionEvaluations,
    outcomeKind: ranked.length > 0 ? "selected" : "no-available-option",
    selectedOptionKey: ranked[0]?.option.key ?? null,
    sourceSnapshots: sourceRefs.map((reference) =>
      snapshotSource(world, reference),
    ),
    rngVersion: "decision-rng-v1",
  };
}

export function recordDurableDecisionTrace(
  world: World,
  evaluation: DecisionEvaluation,
): World {
  if (evaluation.context.retention !== "durable") {
    throw new Error("Only durable decision evaluations may enter history.");
  }
  if (
    evaluation.context.cutoff.historySequenceExclusive !==
    world.history.nextSequence
  ) {
    throw new Error(
      "A stale decision evaluation cannot be recorded after history changed.",
    );
  }
  const replay = evaluateDecision(world, evaluation.context);
  if (JSON.stringify(replay) !== JSON.stringify(evaluation)) {
    throw new Error("Decision evaluation does not match the current world.");
  }
  const history = appendDecisionTraceRecord(world.history, world.id, {
    ...evaluation,
    stableKey: `${evaluation.context.stableKey}:trace`,
    recordedAt: evaluation.context.cutoff.asOfDate,
  });
  const next = { ...world, history };
  assertWorldIntegrity(next);
  return next;
}

export function assertNpcAutonomousApplication(
  world: World,
  actorPersonId: EntityId,
): void {
  if (!world.people[actorPersonId]) {
    throw new Error(`Missing decision actor: ${actorPersonId}`);
  }
  if (
    world.control.kind === "person" &&
    world.control.personId === actorPersonId
  ) {
    throw new Error(
      "Autonomous application cannot make a major choice for the controlled person.",
    );
  }
}

function validateConsideration(
  world: World,
  context: DecisionContext,
  consideration: DecisionConsideration,
  optionKeys: ReadonlySet<string>,
  considerationKeys: Set<string>,
): void {
  assertNonEmpty(consideration.stableKey, "Decision consideration stable key");
  assertNonEmpty(
    consideration.explanation,
    "Decision consideration explanation",
  );
  if (!optionKeys.has(consideration.optionKey)) {
    throw new Error(
      `Decision consideration references a missing option: ${consideration.optionKey}`,
    );
  }
  if (considerationKeys.has(consideration.stableKey)) {
    throw new Error(
      `Duplicate decision consideration key: ${consideration.stableKey}`,
    );
  }
  considerationKeys.add(consideration.stableKey);
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
      `Decision source ${consideration.sourceType} requires a provenance reference.`,
    );
  }
  if (
    consideration.direction !== "supports" &&
    consideration.direction !== "opposes"
  ) {
    throw new Error(
      `Invalid decision consideration direction: ${String(consideration.direction)}`,
    );
  }
  assertMember(IMPORTANCES, consideration.importance, "decision importance");
  assertMember(CONFIDENCES, consideration.confidence, "decision confidence");
  validateMindSourceReferences(
    world,
    context.actorPersonId,
    context.cutoff.asOfDate,
    consideration.sourceRefs,
    context.cutoff.historySequenceExclusive,
  );
}

function canonicalDecisionContext(input: DecisionContext): DecisionContext {
  return {
    ...input,
    cutoff: { ...input.cutoff },
    subject: { ...input.subject },
    options: input.options
      .map((option) => ({ ...option }))
      .sort((left, right) => left.key.localeCompare(right.key)),
    constraints: input.constraints
      .map((constraint) => ({
        ...constraint,
        sourceRefs: canonicalMindSourceRefs(constraint.sourceRefs),
      }))
      .sort((left, right) => left.stableKey.localeCompare(right.stableKey)),
    considerations: input.considerations
      .map((consideration) => ({
        ...consideration,
        sourceRefs: canonicalMindSourceRefs(consideration.sourceRefs),
      }))
      .sort((left, right) => left.stableKey.localeCompare(right.stableKey)),
    perceptionIds: [...new Set(input.perceptionIds)].sort(),
  };
}

function considerationScore(consideration: DecisionConsideration): number {
  const magnitude =
    IMPORTANCE_WEIGHT[consideration.importance] *
    CONFIDENCE_WEIGHT[consideration.confidence];
  return consideration.direction === "supports" ? magnitude : -magnitude;
}

function preferenceFor(score: number): DecisionPreference {
  if (score <= -8) return "strongly-opposed";
  if (score < 0) return "opposed";
  if (score === 0) return "mixed";
  if (score < 8) return "supported";
  return "strongly-supported";
}

function randomContributionFor(value: number): RandomContribution {
  if (value < 0) return "slight-penalty";
  if (value > 0) return "slight-boost";
  return "none";
}

function snapshotSource(
  world: World,
  reference: MindSourceReference,
): DecisionSourceSnapshot {
  switch (reference.kind) {
    case "person-fact": {
      for (const person of Object.values(world.people)) {
        const fact = factsForPerson(person).find(
          (record) => record.id === reference.factId,
        );
        if (fact) {
          return {
            reference: { ...reference },
            label: `Biography · ${fact.kind}`,
            content: fact.summary,
          };
        }
      }
      break;
    }
    case "life-history": {
      const source = resolveLifeHistorySource(world, reference.reference);
      return {
        reference: {
          ...reference,
          reference: { ...reference.reference },
        },
        label: source.label,
        content: source.content,
      };
    }
    case "personality-tendency": {
      const record = world.history.personalityTendencies.find(
        (item) => item.id === reference.tendencyRecordId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: `Personality · ${resolveEntityLabel(world, record.tendencyId)}`,
          content: `${record.expressionKey}; ${record.strength} strength; ${record.confidence} confidence`,
        };
      break;
    }
    case "personal-value": {
      const record = world.history.personalValues.find(
        (item) => item.id === reference.valueRecordId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: `Value · ${resolveEntityLabel(world, record.valueId)}`,
          content: `${record.orientation}; ${record.strength} strength; ${record.salience} salience`,
        };
      break;
    }
    case "goal-state": {
      const record = world.history.goalStates.find(
        (item) => item.id === reference.goalStateId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: `Goal · ${record.domain}`,
          content: `${record.objective} (${record.status}; ${record.priority} priority)`,
        };
      break;
    }
    case "temporary-state": {
      const record = world.history.temporaryStates.find(
        (item) => item.id === reference.temporaryStateId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: `Temporary state · ${record.label}`,
          content: `${record.intensity}; active ${record.startsAt} through ${record.endsAt} (exclusive)`,
        };
      break;
    }
    case "life-load-resolution": {
      const record = world.history.lifeLoadResolutions.find(
        (item) => item.id === reference.lifeLoadResolutionId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Life load and recovery",
          content: `${record.loadBand} load; ${record.effortMode} effort; ${record.futureCapacity} future capacity`,
        };
      break;
    }
    case "historical-event": {
      const record = world.history.events.find(
        (item) => item.id === reference.eventId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: `Event · ${record.type}`,
          content: record.summary,
        };
      break;
    }
    case "memory": {
      const record = world.history.memories.find(
        (item) => item.id === reference.memoryId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Memory",
          content: `${record.rememberedSummary} — ${record.interpretation}`,
        };
      break;
    }
    case "event-knowledge": {
      const record = world.history.knowledge.find(
        (item) => item.id === reference.knowledgeId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Perceived event information",
          content: `${record.believedSummary} (${record.confidence} confidence)`,
        };
      break;
    }
    case "claim": {
      const record = world.history.claims.find(
        (item) => item.id === reference.claimId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: `Claim by ${resolveEntityLabel(world, record.speakerPersonId)}`,
          content: record.statement,
        };
      break;
    }
    case "relationship-interaction": {
      const record = world.history.relationshipInteractions.find(
        (item) => item.id === reference.interactionId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Relationship episode",
          content: record.summary,
        };
      break;
    }
    case "proposition-exposure": {
      const record = world.history.propositionExposures.find(
        (item) => item.id === reference.exposureId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Proposition exposure",
          content: record.summary,
        };
      break;
    }
    case "private-belief": {
      const record = world.history.privateBeliefs.find(
        (item) => item.id === reference.beliefId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Private belief",
          content: `${record.position}; ${record.conviction} conviction; ${record.flexibility}`,
        };
      break;
    }
    case "political-principle": {
      const record = world.history.principles.find(
        (item) => item.id === reference.principleRecordId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Political principle",
          content: `${record.stance}; ${record.conviction} conviction`,
        };
      break;
    }
    case "subject-knowledge": {
      const record = world.history.subjectKnowledge.find(
        (item) => item.id === reference.subjectKnowledgeId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Subject knowledge",
          content: `${record.familiarity}; ${record.understanding}; ${record.expertise}; ${record.practicalExperience}`,
        };
      break;
    }
    case "appraisal": {
      const record = world.history.appraisals.find(
        (item) => item.id === reference.appraisalId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: "Appraisal",
          content: record.interpretation,
        };
      break;
    }
    case "perception": {
      const record = world.history.perceptions.find(
        (item) => item.id === reference.perceptionId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: `Perception · ${record.subjectKind}`,
          content: `${record.assertion} (${record.confidence} confidence; ${record.sourceCredibility} source credibility)`,
        };
      break;
    }
    case "decision-trace": {
      const record = world.history.decisionTraces.find(
        (item) => item.id === reference.decisionTraceId,
      );
      if (record)
        return {
          reference: { ...reference },
          label: `Decision · ${record.context.decisionType}`,
          content: record.selectedOptionKey ?? "No available option",
        };
      break;
    }
  }
  throw new Error(`Decision source could not be resolved: ${reference.kind}`);
}

function canonicalMindSourceRefs(
  references: readonly MindSourceReference[],
): readonly MindSourceReference[] {
  const byKey = new Map<string, MindSourceReference>();
  for (const reference of references) {
    byKey.set(
      referenceKey(reference),
      reference.kind === "life-history"
        ? { ...reference, reference: { ...reference.reference } }
        : { ...reference },
    );
  }
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, reference]) => reference);
}

function referenceKey(reference: MindSourceReference): string {
  if (reference.kind === "life-history") {
    return `${reference.kind}:${lifeHistoryReferenceKey(reference.reference)}`;
  }
  const id = Object.entries(reference).find(([key]) => key !== "kind")?.[1];
  return `${reference.kind}:${String(id)}`;
}

function decisionSubjectExists(world: World, id: EntityId): boolean {
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
    lifeEntityExists(world, id) ||
    resourceHousingEntityExists(world, id) ||
    world.history.events.some((record) => record.id === id) ||
    world.history.goalStates.some((record) => record.goalId === id)
  );
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
