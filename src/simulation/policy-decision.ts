import { recordEventKnowledge } from "./records";
import type {
  DecisionConsideration,
  DecisionContext,
  DecisionImportance,
  DecisionOption,
  EntityId,
  KnowledgeAccuracy,
  KnowledgeConfidence,
  MindConfidence,
  MindSourceReference,
  PolicyEstimateRecord,
  World,
} from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

export interface RecordPolicyAnalysisKnowledgeInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly estimateId: EntityId;
  readonly summary: string;
  readonly believedSummary: string;
  readonly accuracy: KnowledgeAccuracy;
  readonly confidence: KnowledgeConfidence;
  readonly visibility: "private" | "limited" | "public";
}

export interface PolicyDecisionAssessment {
  readonly direction: "supports" | "opposes";
  readonly importance: DecisionImportance;
  readonly confidence: MindConfidence;
  readonly explanation: string;
  readonly sourceRefs?: readonly MindSourceReference[];
}

export interface PolicyDecisionOptionInput {
  readonly optionKey: string;
  readonly estimateId: EntityId;
  readonly knowledgeId: EntityId;
  readonly assessment: PolicyDecisionAssessment;
  readonly feasibilityConcern?: PolicyDecisionAssessment;
  readonly blockWhenImplementationBlocked?: boolean;
}

export interface CreatePolicyDecisionContextInput {
  readonly stableKey: string;
  readonly decisionType: string;
  readonly actorPersonId: EntityId;
  readonly options: readonly PolicyDecisionOptionInput[];
  readonly randomness: DecisionContext["randomness"];
  readonly retention: DecisionContext["retention"];
}

/**
 * Makes a forecast available to one person through ordinary event knowledge.
 * Recording an estimate alone never grants this knowledge.
 */
export function recordPolicyAnalysisKnowledge(
  world: World,
  input: RecordPolicyAnalysisKnowledgeInput,
): World {
  const person = world.people[input.personId];
  if (!person)
    throw new Error(`Missing policy-analysis recipient: ${input.personId}`);
  const estimate = requireEstimate(world, input.estimateId);
  if (estimate.recordedAt > world.currentDate) {
    throw new Error("A person cannot learn a future policy estimate.");
  }
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "policy.analysis-reviewed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.personId, estimate.id].sort(),
    participants: [
      {
        personId: input.personId,
        role: "observation:policy-analysis",
        detail: "Reviewed a quantitative policy analysis.",
      },
    ],
    personFactConstraints: [],
    visibility: input.visibility,
    tags: ["policy.analysis", "policy.forecast"],
    summary: input.summary,
    context: {
      location: null,
      socialContext:
        "A quantitative policy forecast was explicitly made available to this person.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1);
  if (!event)
    throw new Error("Policy analysis did not create its knowledge event.");
  next = recordEventKnowledge(next, {
    stableKey: `${input.stableKey}:knowledge`,
    personId: input.personId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: input.believedSummary,
    accuracy: input.accuracy,
    confidence: input.confidence,
    source: { kind: "direct" },
  });
  assertWorldIntegrity(next);
  return next;
}

/**
 * Adapts actor-specific assessments of known estimates to the existing Stage 4
 * decision contract. It deliberately does not convert policy magnitude into a
 * universal preference score; callers supply the actor's interpretation.
 */
export function createPolicyDecisionContext(
  world: World,
  input: CreatePolicyDecisionContextInput,
): DecisionContext {
  if (!world.people[input.actorPersonId]) {
    throw new Error(`Missing policy decision actor: ${input.actorPersonId}`);
  }
  if (input.options.length < 2) {
    throw new Error("A policy decision requires at least two alternatives.");
  }
  const options: DecisionOption[] = [];
  const considerations: DecisionConsideration[] = [];
  const constraints: DecisionContext["constraints"][number][] = [];
  for (const inputOption of input.options) {
    const estimate = requireEstimate(world, inputOption.estimateId);
    const alternative = world.history.policyAlternatives.find(
      (candidate) => candidate.id === estimate.alternativeId,
    );
    if (!alternative) throw new Error("Policy estimate lost its alternative.");
    const knowledge = world.history.knowledge.find(
      (candidate) => candidate.id === inputOption.knowledgeId,
    );
    const knowledgeEvent = knowledge
      ? world.history.events.find(
          (candidate) => candidate.id === knowledge.eventId,
        )
      : undefined;
    if (
      !knowledge ||
      knowledge.personId !== input.actorPersonId ||
      knowledge.learnedAt > world.currentDate ||
      !knowledgeEvent?.involvedEntityIds.includes(estimate.id)
    ) {
      throw new Error(
        `Policy decision requires the actor's explicit knowledge of estimate: ${estimate.id}`,
      );
    }
    const knowledgeRef = {
      kind: "event-knowledge" as const,
      knowledgeId: knowledge.id,
    };
    options.push({
      key: inputOption.optionKey,
      label: alternative.title,
      description: alternative.summary,
    });
    considerations.push(
      assessmentConsideration(
        inputOption.optionKey,
        "estimate",
        inputOption.assessment,
        knowledgeRef,
        "information:quantitative-policy-estimate",
      ),
    );
    if (inputOption.feasibilityConcern) {
      considerations.push(
        assessmentConsideration(
          inputOption.optionKey,
          "implementation",
          inputOption.feasibilityConcern,
          knowledgeRef,
          "institution:implementation-feasibility",
        ),
      );
    }
    if (
      estimate.implementationStatus === "blocked" &&
      inputOption.blockWhenImplementationBlocked !== false
    ) {
      constraints.push({
        stableKey: `${input.stableKey}:${inputOption.optionKey}:implementation-blocked`,
        optionKey: inputOption.optionKey,
        kind: "policy:implementation-blocked",
        explanation:
          "The known implementation profile blocks this alternative under the assessed conditions.",
        sourceRefs: [knowledgeRef],
      });
    }
  }
  return {
    stableKey: input.stableKey,
    decisionType: input.decisionType,
    actorPersonId: input.actorPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:quantitative-policy-choice",
      key: input.stableKey,
      entityId: null,
    },
    options,
    constraints,
    considerations,
    perceptionIds: [],
    randomness: input.randomness,
    retention: input.retention,
  };
}

function assessmentConsideration(
  optionKey: string,
  suffix: string,
  assessment: PolicyDecisionAssessment,
  knowledgeRef: MindSourceReference,
  sourceType: DecisionConsideration["sourceType"],
): DecisionConsideration {
  return {
    stableKey: `${optionKey}:${suffix}`,
    optionKey,
    sourceType,
    direction: assessment.direction,
    importance: assessment.importance,
    confidence: assessment.confidence,
    explanation: assessment.explanation,
    sourceRefs: [...(assessment.sourceRefs ?? []), knowledgeRef],
  };
}

function requireEstimate(world: World, id: EntityId): PolicyEstimateRecord {
  const estimate = world.history.policyEstimates.find(
    (candidate) => candidate.id === id,
  );
  if (!estimate) throw new Error(`Missing policy estimate: ${id}`);
  return estimate;
}
