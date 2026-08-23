import { describe, expect, it } from "vitest";

import {
  SYNTHETIC_MIND_IDS,
  SYNTHETIC_POLICY_IDS,
  addDays,
  advanceWorld,
  applyNpcPoliticalBeliefFormation,
  assertWorldIntegrity,
  buildSubjectivePerception,
  createDemoWorld,
  createMindProvenance,
  evaluateDecision,
  evaluatePoliticalBeliefFormation,
  recordAppraisal,
  recordDurableDecisionTrace,
  recordPersonalValue,
  recordPersonalityTendency,
  recordPerception,
  recordPropositionExposure,
  recordTemporaryState,
  recordWorldEvent,
} from "./index";
import type {
  DecisionContext,
  EntityId,
  PoliticalBeliefFormationFactor,
  World,
} from "./index";

function personId(world: World, index = 0): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing fixture person at index ${index}.`);
  return id;
}

function propositionId(world: World): EntityId {
  const id = SYNTHETIC_POLICY_IDS.propositions.drugNegotiation;
  if (!world.policyCatalog.propositions[id]) {
    throw new Error("Missing synthetic policy proposition.");
  }
  return id;
}

function decisiveFactor(
  favors: PoliticalBeliefFormationFactor["favors"],
  stableKey: string,
): PoliticalBeliefFormationFactor {
  return {
    stableKey,
    favors,
    sourceType: "context:incentive",
    importance: "decisive",
    confidence: "high",
    explanation: `Fixture strongly favors ${favors}.`,
    sourceRefs: [],
  };
}

const STRONG_OPEN_BELIEF = {
  conviction: "strong",
  salience: "moderate",
  flexibility: "open",
} as const;

function basicDecisionContext(
  world: World,
  actorPersonId: EntityId,
): DecisionContext {
  return {
    stableKey: "decision:hard-versus-soft",
    decisionType: "fixture-choice",
    actorPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:situation",
      key: "fixture-situation",
      entityId: null,
    },
    options: [
      {
        key: "desired",
        label: "Desired option",
        description: "Strongly preferred but unavailable.",
      },
      {
        key: "available",
        label: "Available option",
        description: "Less preferred but possible.",
      },
    ],
    constraints: [
      {
        stableKey: "constraint:desired-unavailable",
        optionKey: "desired",
        kind: "fixture-hard-block",
        explanation: "The desired option is categorically unavailable.",
        sourceRefs: [],
      },
    ],
    considerations: [
      {
        stableKey: "consideration:strong-desire",
        optionKey: "desired",
        sourceType: "context:strong-desire",
        direction: "supports",
        importance: "decisive",
        confidence: "high",
        explanation: "The actor strongly wants the desired option.",
        sourceRefs: [],
      },
      {
        stableKey: "consideration:available-fallback",
        optionKey: "available",
        sourceType: "context:risk",
        direction: "supports",
        importance: "slight",
        confidence: "low",
        explanation: "The fallback remains minimally acceptable.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  };
}

describe("sparse character-mind histories", () => {
  it("keeps tendencies and conflicting values sparse while preserving supersession", () => {
    let world = createDemoWorld("mind-sparse-history");
    const actorId = personId(world, 1);

    world = recordPersonalityTendency(world, {
      stableKey: "tendency:risk:initial",
      personId: actorId,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
      recordedAt: world.currentDate,
      expressionKey: "cautious",
      strength: "moderate",
      confidence: "medium",
      scopeTags: ["career"],
      provenance: createMindProvenance("authored", {
        note: "Sparse fixture tendency.",
      }),
      supersedesTendencyId: null,
    });
    const initialTendency = world.history.personalityTendencies.at(-1);
    if (!initialTendency) throw new Error("Missing initial tendency.");

    world = recordPersonalityTendency(world, {
      stableKey: "tendency:risk:revision",
      personId: actorId,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
      recordedAt: world.currentDate,
      expressionKey: "risk-seeking",
      strength: "subtle",
      confidence: "high",
      scopeTags: ["career"],
      provenance: createMindProvenance("reflection"),
      supersedesTendencyId: initialTendency.id,
    });

    world = recordPersonalValue(world, {
      stableKey: "value:equality",
      personId: actorId,
      valueId: SYNTHETIC_MIND_IDS.values.equality,
      recordedAt: world.currentDate,
      orientation: "embraces",
      strength: "strong",
      salience: "high",
      qualification: "Equality matters, but its application is contested.",
      provenance: createMindProvenance("authored"),
      supersedesValueId: null,
    });
    world = recordPersonalValue(world, {
      stableKey: "value:order",
      personId: actorId,
      valueId: SYNTHETIC_MIND_IDS.values.order,
      recordedAt: world.currentDate,
      orientation: "embraces",
      strength: "strong",
      salience: "high",
      qualification: "Order can conflict with equality in a concrete choice.",
      provenance: createMindProvenance("authored"),
      supersedesValueId: null,
    });

    const tendencies = world.history.personalityTendencies.filter(
      (record) => record.personId === actorId,
    );
    const values = world.history.personalValues.filter(
      (record) => record.personId === actorId,
    );
    expect(tendencies).toHaveLength(2);
    expect(tendencies[1]).toMatchObject({
      expressionKey: "risk-seeking",
      supersedesTendencyId: initialTendency.id,
    });
    expect(values.map((record) => record.valueId)).toStrictEqual([
      SYNTHETIC_MIND_IDS.values.equality,
      SYNTHETIC_MIND_IDS.values.order,
    ]);
    expect(
      world.history.personalityTendencies.some(
        (record) => record.personId === personId(world, 2),
      ),
    ).toBe(false);
    expect(values).toHaveLength(2);
  });

  it("keeps personal appraisal separate from truth and allows divergent meaning", () => {
    let world = createDemoWorld("appraisal-divergence");
    const firstId = personId(world, 1);
    const secondId = personId(world, 2);
    world = recordWorldEvent(world, {
      stableKey: "event:shared-public-criticism",
      type: "social.public-criticism",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [firstId, secondId],
      participants: [
        {
          personId: firstId,
          role: "focus:subject",
          detail: "Criticized publicly",
        },
        {
          personId: secondId,
          role: "focus:subject",
          detail: "Criticized publicly",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["criticism.public"],
      summary: "Two people received the same public criticism.",
      context: {
        location: null,
        socialContext: "A shared public review.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing criticism event.");
    const historicalTruth = structuredClone(event);

    world = recordAppraisal(world, {
      stableKey: "appraisal:criticism:humiliation",
      personId: firstId,
      eventId: event.id,
      memoryId: null,
      eventKnowledgeId: null,
      appraisedAt: world.currentDate,
      meanings: [
        {
          key: "humiliation",
          label: "Humiliation",
          valence: "negative",
          intensity: "strong",
        },
      ],
      interpretation: "The criticism felt unfair and humiliating.",
      confidence: "high",
      involvedPersonIds: [firstId, secondId],
      provenance: createMindProvenance("reflection", {
        sourceRefs: [{ kind: "historical-event", eventId: event.id }],
      }),
      supersedesAppraisalId: null,
    });
    world = recordAppraisal(world, {
      stableKey: "appraisal:criticism:challenge",
      personId: secondId,
      eventId: event.id,
      memoryId: null,
      eventKnowledgeId: null,
      appraisedAt: world.currentDate,
      meanings: [
        {
          key: "challenge",
          label: "Useful challenge",
          valence: "positive",
          intensity: "moderate",
        },
      ],
      interpretation: "The criticism was useful motivation to improve.",
      confidence: "high",
      involvedPersonIds: [firstId, secondId],
      provenance: createMindProvenance("reflection", {
        sourceRefs: [{ kind: "historical-event", eventId: event.id }],
      }),
      supersedesAppraisalId: null,
    });

    expect(
      world.history.appraisals
        .filter((record) => record.eventId === event.id)
        .map((record) => record.interpretation),
    ).toStrictEqual([
      "The criticism felt unfair and humiliating.",
      "The criticism was useful motivation to improve.",
    ]);
    expect(
      world.history.events.find((record) => record.id === event.id),
    ).toStrictEqual(historicalTruth);
  });

  it("uses a half-open interval for temporary-state activity", () => {
    let world = createDemoWorld("temporary-half-open");
    const actorId = personId(world, 1);
    const startsAt = world.currentDate;
    const endsAt = addDays(startsAt, 2);
    world = recordTemporaryState(world, {
      stableKey: "temporary:fatigue",
      personId: actorId,
      stateKey: "fatigue",
      label: "Fatigue",
      recordedAt: startsAt,
      startsAt,
      endsAt,
      intensity: "moderate",
      decisionTags: ["attention"],
      provenance: createMindProvenance("authored"),
    });
    world = advanceWorld(world, 3);

    const atStart = buildSubjectivePerception(world, actorId, {
      asOfDate: startsAt,
      historySequenceExclusive: world.history.nextSequence,
    });
    const atEnd = buildSubjectivePerception(world, actorId, {
      asOfDate: endsAt,
      historySequenceExclusive: world.history.nextSequence,
    });

    expect(atStart.items.some((item) => item.kind === "temporary-state")).toBe(
      true,
    );
    expect(atEnd.items.some((item) => item.kind === "temporary-state")).toBe(
      false,
    );
  });
});

describe("general autonomous decisions", () => {
  it("never lets soft preference or randomness override a hard constraint", () => {
    const world = createDemoWorld("hard-constraint");
    const actorId = personId(world, 1);
    const evaluation = evaluateDecision(
      world,
      basicDecisionContext(world, actorId),
    );

    expect(evaluation.selectedOptionKey).toBe("available");
    expect(
      evaluation.optionEvaluations.find(
        (option) => option.optionKey === "desired",
      ),
    ).toMatchObject({
      available: false,
      blockedByConstraintKeys: ["constraint:desired-unavailable"],
      finalRank: null,
    });
    expect(
      evaluation.optionEvaluations.map((option) => option.randomContribution),
    ).toEqual(["none", "none"]);
    expect(evaluation.context.considerations).toHaveLength(2);
  });

  it("is deterministic when option and consideration input order changes", () => {
    const world = createDemoWorld("decision-order-independence");
    const actorId = personId(world, 1);
    const context = basicDecisionContext(world, actorId);
    const reversed: DecisionContext = {
      ...context,
      options: [...context.options].reverse(),
      considerations: [...context.considerations].reverse(),
      constraints: [...context.constraints].reverse(),
    };

    expect(evaluateDecision(world, reversed)).toStrictEqual(
      evaluateDecision(world, context),
    );
  });

  it("records an explainable durable trace with frozen source snapshots", () => {
    let world = createDemoWorld("durable-trace-snapshot");
    const actorId = personId(world, 1);
    world = recordPerception(world, {
      stableKey: "perception:opportunity:initial",
      personId: actorId,
      perceivedAt: world.currentDate,
      subjectKind: "context:situation",
      subjectKey: "fixture-opportunity",
      subjectEntityId: null,
      assertion: "The opportunity appears safe enough to pursue.",
      confidence: "medium",
      sourceCredibility: "medium",
      source: { kind: "authored", note: "Initial fixture perception." },
      supersedesPerceptionId: null,
    });
    const perception = world.history.perceptions.at(-1);
    if (!perception) throw new Error("Missing initial perception.");
    const context: DecisionContext = {
      ...basicDecisionContext(world, actorId),
      stableKey: "decision:frozen-source-snapshot",
      constraints: [],
      considerations: [
        {
          stableKey: "consideration:perceived-safety",
          optionKey: "desired",
          sourceType: "information:perception",
          direction: "supports",
          importance: "strong",
          confidence: "medium",
          explanation: "The actor believes the opportunity is safe enough.",
          sourceRefs: [{ kind: "perception", perceptionId: perception.id }],
        },
      ],
      perceptionIds: [perception.id],
      randomness: "none",
    };
    const evaluation = evaluateDecision(world, context);
    world = recordDurableDecisionTrace(world, evaluation);
    const trace = world.history.decisionTraces.at(-1);
    if (!trace) throw new Error("Missing durable decision trace.");

    world = recordPerception(world, {
      stableKey: "perception:opportunity:revision",
      personId: actorId,
      perceivedAt: world.currentDate,
      subjectKind: "context:situation",
      subjectKey: "fixture-opportunity",
      subjectEntityId: null,
      assertion: "The opportunity now appears dangerous.",
      confidence: "high",
      sourceCredibility: "high",
      source: { kind: "authored", note: "Later fixture perception." },
      supersedesPerceptionId: perception.id,
    });

    expect(trace.context.considerations[0]).toMatchObject({
      sourceType: "information:perception",
      explanation: "The actor believes the opportunity is safe enough.",
    });
    expect(trace.sourceSnapshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining(
            "The opportunity appears safe enough to pursue.",
          ),
        }),
      ]),
    );
    expect(trace.sourceSnapshots).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining("dangerous"),
        }),
      ]),
    );
  });
});

describe("political-belief decision adapter", () => {
  it("rejects controlled-person autonomous application atomically but applies the same proposal for an NPC", () => {
    const observerWorld = createDemoWorld("player-autonomy");
    const actorId = personId(observerWorld, 1);
    const controlledWorld: World = {
      ...observerWorld,
      control: { kind: "person", personId: actorId },
    };
    assertWorldIntegrity(controlledWorld);
    const proposal = evaluatePoliticalBeliefFormation(controlledWorld, {
      stableKey: "belief-decision:controlled-support",
      personId: actorId,
      propositionId: propositionId(controlledWorld),
      beliefDimensions: STRONG_OPEN_BELIEF,
      factors: [decisiveFactor("support", "controlled-support")],
      randomness: "none",
    });
    const before = structuredClone(controlledWorld);

    expect(() =>
      applyNpcPoliticalBeliefFormation(controlledWorld, proposal),
    ).toThrow(/controlled person/i);
    expect(controlledWorld).toStrictEqual(before);

    const npcProposal = evaluatePoliticalBeliefFormation(observerWorld, {
      stableKey: "belief-decision:npc-support",
      personId: actorId,
      propositionId: propositionId(observerWorld),
      beliefDimensions: STRONG_OPEN_BELIEF,
      factors: [decisiveFactor("support", "npc-support")],
      randomness: "none",
    });
    const applied = applyNpcPoliticalBeliefFormation(
      observerWorld,
      npcProposal,
    );
    expect(applied.history.decisionTraces).toHaveLength(
      observerWorld.history.decisionTraces.length + 1,
    );
    expect(
      applied.history.privateBeliefs.filter(
        (belief) =>
          belief.personId === actorId &&
          belief.propositionId === propositionId(applied),
      ),
    ).toHaveLength(1);
  });

  it("records no-opinion and defer decisions without beliefs, then applies a substantive belief separately", () => {
    let world = createDemoWorld("belief-adapter-separation");
    const actorId = personId(world, 1);
    const policyId = propositionId(world);
    world = recordPropositionExposure(world, {
      stableKey: `exposure:${actorId}:adapter-no-opinion`,
      personId: actorId,
      propositionId: policyId,
      encounteredAt: world.currentDate,
      summary:
        "The actor encountered the proposition before declining to form a view.",
      provenance: {
        kind: "manual",
        note: "Stage 4 no-opinion adapter fixture.",
      },
    });
    const originalBeliefCount = world.history.privateBeliefs.length;
    const originalTraceCount = world.history.decisionTraces.length;

    const noOpinion = evaluatePoliticalBeliefFormation(world, {
      stableKey: "belief-decision:no-opinion",
      personId: actorId,
      propositionId: policyId,
      randomness: "none",
    });
    expect(noOpinion.outcome).toBe("no-opinion");
    world = applyNpcPoliticalBeliefFormation(world, noOpinion);
    expect(world.history.privateBeliefs).toHaveLength(originalBeliefCount);

    const defer = evaluatePoliticalBeliefFormation(world, {
      stableKey: "belief-decision:defer",
      personId: actorId,
      propositionId: policyId,
      factors: [decisiveFactor("defer", "defer")],
      randomness: "none",
    });
    expect(defer.outcome).toBe("defer");
    world = applyNpcPoliticalBeliefFormation(world, defer);
    expect(world.history.privateBeliefs).toHaveLength(originalBeliefCount);

    const support = evaluatePoliticalBeliefFormation(world, {
      stableKey: "belief-decision:support",
      personId: actorId,
      propositionId: policyId,
      beliefDimensions: STRONG_OPEN_BELIEF,
      factors: [decisiveFactor("support", "support")],
      randomness: "none",
    });
    expect(support.outcome).toBe("support");
    world = applyNpcPoliticalBeliefFormation(world, support);

    const belief = world.history.privateBeliefs.at(-1);
    const trace = world.history.decisionTraces.at(-1);
    expect(world.history.privateBeliefs).toHaveLength(originalBeliefCount + 1);
    expect(belief).toMatchObject({
      personId: actorId,
      propositionId: policyId,
      position: "support",
    });
    expect(belief?.formation.decisionTraceIds).toStrictEqual([trace?.id]);
    expect(world.history.decisionTraces).toHaveLength(originalTraceCount + 3);
  });
});
