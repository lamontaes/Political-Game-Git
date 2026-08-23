import {
  assertNpcAutonomousApplication,
  evaluateDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { activePartnershipsAt, kinshipRelationshipsAt } from "./life-queries";
import type {
  DecisionConstraint,
  DecisionEvaluation,
  DecisionImportance,
  DecisionSourceType,
  BeliefConviction,
  EntityId,
  HistoricalCutoff,
  MindConfidence,
  MindSourceReference,
  PoliticalCue,
  PoliticalFlexibility,
  PoliticalSalience,
  PrivateBeliefRecord,
  World,
} from "./types";

export type PoliticalBeliefFormationOutcome =
  | "no-opinion"
  | "defer"
  | "conflicted"
  | "tentative-support"
  | "support"
  | "tentative-opposition"
  | "opposition";

export interface PoliticalBeliefFormationFactor {
  readonly stableKey: string;
  readonly favors: PoliticalBeliefFormationOutcome;
  readonly sourceType: DecisionSourceType;
  readonly importance: DecisionImportance;
  readonly confidence: MindConfidence;
  readonly explanation: string;
  readonly sourceRefs: readonly MindSourceReference[];
}

export interface PoliticalBeliefFormationInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly cutoff?: HistoricalCutoff;
  readonly perceptionIds?: readonly EntityId[];
  readonly factors?: readonly PoliticalBeliefFormationFactor[];
  readonly constraints?: readonly DecisionConstraint[];
  readonly randomness?: "none" | "close-choices";
  readonly beliefDimensions?: PoliticalBeliefDimensions;
}

export interface PoliticalBeliefDimensions {
  readonly conviction: BeliefConviction;
  readonly salience: PoliticalSalience;
  readonly flexibility: PoliticalFlexibility;
}

export interface PoliticalBeliefFormationProposal {
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly outcome: PoliticalBeliefFormationOutcome;
  readonly beliefDimensions: PoliticalBeliefDimensions | null;
  readonly evaluation: DecisionEvaluation;
}

const OUTCOMES: readonly PoliticalBeliefFormationOutcome[] = [
  "no-opinion",
  "defer",
  "conflicted",
  "tentative-support",
  "support",
  "tentative-opposition",
  "opposition",
];

export function evaluatePoliticalBeliefFormation(
  world: World,
  input: PoliticalBeliefFormationInput,
): PoliticalBeliefFormationProposal {
  const person = world.people[input.personId];
  if (!person) throw new Error(`Missing person: ${input.personId}`);
  if (!world.policyCatalog.propositions[input.propositionId]) {
    throw new Error(`Missing policy proposition: ${input.propositionId}`);
  }
  const cutoff = input.cutoff ?? {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const perceptionIds = input.perceptionIds ?? [];
  const factors = input.factors ?? [];
  const considerations = [
    {
      stableKey: "default:no-opinion",
      optionKey: "no-opinion",
      sourceType: "context:opinion-readiness" as const,
      direction: "supports" as const,
      importance: "moderate" as const,
      confidence: "medium" as const,
      explanation:
        "Without enough personally meaningful reason, the actor may leave the question unresolved.",
      sourceRefs: [] as readonly MindSourceReference[],
    },
    ...existingBeliefConsiderations(
      world,
      input.personId,
      input.propositionId,
      cutoff,
    ),
    ...factors.map((factor) => {
      if (!OUTCOMES.includes(factor.favors)) {
        throw new Error(
          `Invalid political belief-formation outcome: ${String(factor.favors)}`,
        );
      }
      validatePoliticalFactorSources(world, input.personId, factor);
      return {
        stableKey: `factor:${factor.stableKey}`,
        optionKey: factor.favors,
        sourceType: factor.sourceType,
        direction: "supports" as const,
        importance: factor.importance,
        confidence: factor.confidence,
        explanation: factor.explanation,
        sourceRefs: factor.sourceRefs,
      };
    }),
    ...trustedCueConsiderations(
      world,
      input.personId,
      input.propositionId,
      cutoff,
      perceptionIds,
    ),
  ];
  const evaluation = evaluateDecision(world, {
    stableKey: input.stableKey,
    decisionType: "political-belief-formation",
    actorPersonId: input.personId,
    cutoff,
    subject: {
      kind: "domain:policy-proposition",
      key: `proposition:${input.propositionId}`,
      entityId: input.propositionId,
    },
    options: OUTCOMES.map((outcome) => ({
      key: outcome,
      label: outcome.replaceAll("-", " "),
      description: descriptionForOutcome(outcome),
    })),
    constraints: input.constraints ?? [],
    considerations,
    perceptionIds,
    randomness: input.randomness ?? "close-choices",
    retention: "durable",
  });
  const outcome = evaluation.selectedOptionKey;
  if (
    !outcome ||
    !OUTCOMES.includes(outcome as PoliticalBeliefFormationOutcome)
  ) {
    throw new Error(
      "Political belief formation produced no available outcome.",
    );
  }
  const politicalOutcome = outcome as PoliticalBeliefFormationOutcome;
  const beliefDimensions =
    politicalOutcome === "no-opinion" || politicalOutcome === "defer"
      ? null
      : validateBeliefDimensions(politicalOutcome, input.beliefDimensions);
  return {
    personId: input.personId,
    propositionId: input.propositionId,
    outcome: politicalOutcome,
    beliefDimensions,
    evaluation,
  };
}

function validatePoliticalFactorSources(
  world: World,
  personId: EntityId,
  factor: PoliticalBeliefFormationFactor,
): void {
  const expectedKind: Readonly<
    Record<string, MindSourceReference["kind"] | undefined>
  > = {
    "mind:personality": "personality-tendency",
    "mind:value": "personal-value",
    "mind:goal": "goal-state",
    "belief:private": "private-belief",
    "belief:political-principle": "political-principle",
    "information:expertise": "subject-knowledge",
    "information:memory": "memory",
    "information:appraisal": "appraisal",
    "information:known-fact": "person-fact",
    "information:perception": "perception",
    "social:relationship": "relationship-interaction",
    "social:trusted-cue": "perception",
    "context:temporary-state": "temporary-state",
  };
  const requiredKind = expectedKind[factor.sourceType];
  if (
    requiredKind !== undefined &&
    !factor.sourceRefs.some((reference) => reference.kind === requiredKind)
  ) {
    throw new Error(
      `Political factor ${factor.stableKey} requires a ${requiredKind} source reference.`,
    );
  }
  if (factor.sourceType === "social:trusted-cue") {
    const hasTrustedCue = factor.sourceRefs.some((reference) => {
      if (reference.kind !== "perception") return false;
      const perception = world.history.perceptions.find(
        (record) => record.id === reference.perceptionId,
      );
      return (
        perception?.personId === personId &&
        perception.source.kind === "trusted-cue"
      );
    });
    if (!hasTrustedCue) {
      throw new Error(
        `Political factor ${factor.stableKey} lacks a trusted-cue perception.`,
      );
    }
  }
}

export function applyNpcPoliticalBeliefFormation(
  world: World,
  proposal: PoliticalBeliefFormationProposal,
): World {
  assertNpcAutonomousApplication(world, proposal.personId);
  if (
    proposal.evaluation.context.actorPersonId !== proposal.personId ||
    proposal.evaluation.context.subject.entityId !== proposal.propositionId ||
    proposal.evaluation.context.subject.kind !== "domain:policy-proposition" ||
    proposal.evaluation.context.decisionType !== "political-belief-formation" ||
    proposal.evaluation.selectedOptionKey !== proposal.outcome
  ) {
    throw new Error(
      "Political belief proposal and decision evaluation disagree.",
    );
  }
  let next = recordDurableDecisionTrace(world, proposal.evaluation);
  const trace = next.history.decisionTraces.at(-1);
  if (!trace || trace.decisionId !== proposal.evaluation.decisionId) {
    throw new Error("Political belief decision trace was not recorded.");
  }
  if (proposal.outcome === "no-opinion" || proposal.outcome === "defer") {
    if (proposal.beliefDimensions !== null) {
      throw new Error("A non-belief outcome cannot carry belief dimensions.");
    }
    return next;
  }
  const beliefDimensions = validateBeliefDimensions(
    proposal.outcome,
    proposal.beliefDimensions ?? undefined,
  );

  const prior = latestPrivateBeliefAtCutoff(
    world,
    proposal.personId,
    proposal.propositionId,
    proposal.evaluation.context.cutoff,
  );
  const sourceRefs = proposal.evaluation.context.considerations.flatMap(
    (consideration) => consideration.sourceRefs,
  );
  const perceptionIds = proposal.evaluation.context.perceptionIds;
  const cue = trustedCueForFormation(
    world,
    proposal.personId,
    proposal.propositionId,
    proposal.evaluation.context.cutoff,
    perceptionIds,
  );
  const formationSources = stageThreeFormationSources(sourceRefs);
  next = recordPrivateBelief(next, {
    stableKey: `${proposal.evaluation.context.stableKey}:belief`,
    personId: proposal.personId,
    propositionId: proposal.propositionId,
    formedAt: proposal.evaluation.context.cutoff.asOfDate,
    position: positionForOutcome(proposal.outcome),
    ...beliefDimensions,
    rationale: `Autonomous proposal selected ${proposal.outcome}; see durable decision trace.`,
    formation: createFormationContext(
      cue
        ? "cue:trusted"
        : prior
          ? "reflection:reconsideration"
          : "reflection:initial",
      {
        ...formationSources,
        decisionTraceIds: [trace.id],
        cue,
        note: "Applied by the Stage 4 general decision engine's political-belief adapter.",
      },
    ),
    supersedesBeliefId: prior?.id ?? null,
  });
  return next;
}

function existingBeliefConsiderations(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  cutoff: HistoricalCutoff,
) {
  const belief = latestPrivateBeliefAtCutoff(
    world,
    personId,
    propositionId,
    cutoff,
  );
  if (!belief) return [];
  return [
    {
      stableKey: `existing-belief:${belief.id}`,
      optionKey: outcomeForBelief(belief),
      sourceType: "belief:private" as const,
      direction: "supports" as const,
      importance:
        belief.conviction === "tentative"
          ? ("moderate" as const)
          : ("strong" as const),
      confidence:
        belief.conviction === "tentative"
          ? ("medium" as const)
          : ("high" as const),
      explanation:
        "The actor's existing private view creates continuity pressure.",
      sourceRefs: [{ kind: "private-belief" as const, beliefId: belief.id }],
    },
  ];
}

function trustedCueConsiderations(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  cutoff: HistoricalCutoff,
  perceptionIds: readonly EntityId[],
) {
  return perceptionIds.flatMap((perceptionId) => {
    const perception = world.history.perceptions.find(
      (record) => record.id === perceptionId,
    );
    if (
      !perception ||
      perception.personId !== personId ||
      perception.subjectKind !== "domain:policy-proposition" ||
      perception.subjectEntityId !== propositionId ||
      perception.source.kind !== "trusted-cue" ||
      perception.perceivedAt > cutoff.asOfDate ||
      perception.sequence >= cutoff.historySequenceExclusive
    ) {
      return [];
    }
    const cueSource = perception.source;
    const sourcePosition = cueSource.communicationRecordIds
      .map((recordId) =>
        world.history.publicPositions.find((record) => record.id === recordId),
      )
      .find(
        (record) =>
          record !== undefined &&
          record.personId === cueSource.sourcePersonId &&
          record.propositionId === propositionId &&
          record.statedAt <= cutoff.asOfDate &&
          record.sequence < cutoff.historySequenceExclusive,
      );
    if (!sourcePosition) return [];
    const outcome = outcomeForPublicStance(sourcePosition.stance);
    if (!outcome) return [];
    const importance: DecisionImportance =
      perception.sourceCredibility === "high"
        ? "strong"
        : perception.sourceCredibility === "medium"
          ? "moderate"
          : "slight";
    return [
      {
        stableKey: `trusted-cue:${perception.id}`,
        optionKey: outcome,
        sourceType: "social:trusted-cue" as const,
        direction: "supports" as const,
        importance,
        confidence: perception.confidence,
        explanation: `${perception.source.sourceLabel}'s communicated view is considered with the actor's own credibility assessment.`,
        sourceRefs: [
          { kind: "perception" as const, perceptionId: perception.id },
        ],
      },
    ];
  });
}

function trustedCueForFormation(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  cutoff: HistoricalCutoff,
  perceptionIds: readonly EntityId[],
): PoliticalCue | null {
  const perception = perceptionIds
    .map((id) => world.history.perceptions.find((record) => record.id === id))
    .find(
      (record) =>
        record?.personId === personId &&
        record.subjectEntityId === propositionId &&
        record.source.kind === "trusted-cue" &&
        record.perceivedAt <= cutoff.asOfDate &&
        record.sequence < cutoff.historySequenceExclusive,
    );
  if (!perception || perception.source.kind !== "trusted-cue") return null;
  const sourcePersonId = perception.source.sourcePersonId;
  const isPartner = activePartnershipsAt(world, personId, cutoff).some(
    (partnership) => partnership.personIds.includes(sourcePersonId),
  );
  const isKin = kinshipRelationshipsAt(world, personId, cutoff).some(
    (kinship) => kinship.personIds.includes(sourcePersonId),
  );
  const hasLegacyFamilySummary = world.people[personId]
    ? [
        ...world.people[personId]!.establishedFacts,
        ...(world.people[personId]!.detailLevel === "materialized"
          ? world.people[personId]!.details.generatedFacts
          : []),
      ].some(
        (fact) =>
          fact.kind === "family-relationship" &&
          fact.relatedPersonId === sourcePersonId &&
          fact.occurredAt <= cutoff.asOfDate &&
          (fact.endedAt === null || fact.endedAt >= cutoff.asOfDate),
      )
    : false;
  return {
    kind:
      isPartner || isKin || hasLegacyFamilySummary
        ? "person:family"
        : "person:social-contact",
    sourcePersonId,
    sourceLabel: perception.source.sourceLabel,
  };
}

function latestPrivateBeliefAtCutoff(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  cutoff: HistoricalCutoff,
): PrivateBeliefRecord | undefined {
  return world.history.privateBeliefs
    .filter(
      (record) =>
        record.personId === personId &&
        record.propositionId === propositionId &&
        record.formedAt <= cutoff.asOfDate &&
        record.sequence < cutoff.historySequenceExclusive,
    )
    .sort(
      (left, right) =>
        left.formedAt.localeCompare(right.formedAt) ||
        left.sequence - right.sequence,
    )
    .at(-1);
}

function outcomeForBelief(
  belief: PrivateBeliefRecord,
): PoliticalBeliefFormationOutcome {
  switch (belief.position) {
    case "support":
      return belief.conviction === "tentative"
        ? "tentative-support"
        : "support";
    case "oppose":
      return belief.conviction === "tentative"
        ? "tentative-opposition"
        : "opposition";
    case "conflicted":
      return "conflicted";
    case "uncertain":
      return "defer";
  }
}

function outcomeForPublicStance(
  stance: World["history"]["publicPositions"][number]["stance"],
): PoliticalBeliefFormationOutcome | null {
  switch (stance) {
    case "support":
      return "support";
    case "oppose":
      return "opposition";
    case "conflicted":
      return "conflicted";
    case "undecided":
      return "defer";
    case "withheld":
      return null;
  }
}

function positionForOutcome(
  outcome: Exclude<PoliticalBeliefFormationOutcome, "no-opinion" | "defer">,
): PrivateBeliefRecord["position"] {
  switch (outcome) {
    case "conflicted":
      return "conflicted";
    case "tentative-support":
    case "support":
      return "support";
    case "tentative-opposition":
    case "opposition":
      return "oppose";
  }
}

function validateBeliefDimensions(
  outcome: Exclude<PoliticalBeliefFormationOutcome, "no-opinion" | "defer">,
  dimensions: PoliticalBeliefDimensions | undefined,
): PoliticalBeliefDimensions {
  if (!dimensions) {
    throw new Error(
      "A substantive political-belief outcome requires explicit conviction, salience, and flexibility.",
    );
  }
  const convictions = ["tentative", "moderate", "strong", "settled"] as const;
  const saliences = ["low", "moderate", "high", "central"] as const;
  const flexibilities = ["open", "negotiable", "conditional", "firm"] as const;
  if (!convictions.includes(dimensions.conviction)) {
    throw new Error(
      `Invalid autonomous belief conviction: ${dimensions.conviction}`,
    );
  }
  if (!saliences.includes(dimensions.salience)) {
    throw new Error(
      `Invalid autonomous belief salience: ${dimensions.salience}`,
    );
  }
  if (!flexibilities.includes(dimensions.flexibility)) {
    throw new Error(
      `Invalid autonomous belief flexibility: ${dimensions.flexibility}`,
    );
  }
  const isTentativeOutcome =
    outcome === "tentative-support" || outcome === "tentative-opposition";
  if (
    (isTentativeOutcome && dimensions.conviction !== "tentative") ||
    ((outcome === "support" || outcome === "opposition") &&
      dimensions.conviction === "tentative")
  ) {
    throw new Error(
      "Tentative formation outcomes and conviction must agree; salience and flexibility remain independent.",
    );
  }
  return { ...dimensions };
}

function stageThreeFormationSources(
  references: readonly MindSourceReference[],
) {
  const sourceIds = <K extends MindSourceReference["kind"]>(
    kind: K,
    select: (
      reference: Extract<MindSourceReference, { readonly kind: K }>,
    ) => EntityId,
  ) =>
    references
      .filter(
        (
          reference,
        ): reference is Extract<MindSourceReference, { readonly kind: K }> =>
          reference.kind === kind,
      )
      .map(select)
      .filter((id, index, ids) => ids.indexOf(id) === index)
      .sort();
  return {
    relevantEventIds: sourceIds("historical-event", (item) => item.eventId),
    sourceFactIds: sourceIds("person-fact", (item) => item.factId),
    propositionExposureIds: sourceIds(
      "proposition-exposure",
      (item) => item.exposureId,
    ),
    memoryIds: sourceIds("memory", (item) => item.memoryId),
    eventKnowledgeIds: sourceIds("event-knowledge", (item) => item.knowledgeId),
    claimIds: sourceIds("claim", (item) => item.claimId),
    relationshipInteractionIds: sourceIds(
      "relationship-interaction",
      (item) => item.interactionId,
    ),
    subjectKnowledgeIds: sourceIds(
      "subject-knowledge",
      (item) => item.subjectKnowledgeId,
    ),
  };
}

function descriptionForOutcome(
  outcome: PoliticalBeliefFormationOutcome,
): string {
  switch (outcome) {
    case "no-opinion":
      return "Do not form a private view at this time.";
    case "defer":
      return "Recognize the question but defer forming a private view.";
    case "conflicted":
      return "Form a private view that retains materially conflicting considerations.";
    case "tentative-support":
      return "Form a tentative private view in support.";
    case "support":
      return "Form a private view in support.";
    case "tentative-opposition":
      return "Form a tentative private view in opposition.";
    case "opposition":
      return "Form a private view in opposition.";
  }
}
