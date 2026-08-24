import { describe, expect, it } from "vitest";

import {
  SYNTHETIC_MIND_IDS,
  SYNTHETIC_POLICY_IDS,
  advanceWorld,
  applyNpcPoliticalBeliefFormation,
  assertWorldIntegrity,
  buildSubjectivePerception,
  createDevelopmentProposal,
  createDemoWorld,
  createFormationContext,
  createMindProvenance,
  createPartnership,
  deserializeWorld,
  evaluateDecision,
  evaluatePoliticalBeliefFormation,
  recordAppraisal,
  recordCampaignCommitment,
  recordGoalState,
  recordPerception,
  recordPersonalValue,
  recordPersonalityTendency,
  recordPrivateBelief,
  recordPrinciple,
  recordPropositionExposure,
  recordPublicPosition,
  recordRelationshipInteraction,
  recordSubjectKnowledge,
  recordWorldEvent,
  serializeWorld,
} from "./index";
import type {
  DecisionContext,
  EntityId,
  HistoricalCutoff,
  SourceCredibility,
  World,
} from "./types";

function personId(world: World, index: number): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing fixture person ${index}.`);
  return id;
}

function currentCutoff(world: World): HistoricalCutoff {
  return {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
}

const STRONG_OPEN_BELIEF = {
  conviction: "strong",
  salience: "moderate",
  flexibility: "open",
} as const;

const TENTATIVE_HIGH_SALIENCE_BELIEF = {
  conviction: "tentative",
  salience: "high",
  flexibility: "open",
} as const;

function basicDecision(world: World, actorPersonId: EntityId): DecisionContext {
  return {
    stableKey: `test:subjective-cutoff:${actorPersonId}`,
    decisionType: "test-subjective-choice",
    actorPersonId,
    cutoff: currentCutoff(world),
    subject: { kind: "context:situation", key: "test", entityId: null },
    options: [
      { key: "act", label: "Act", description: "Act now." },
      { key: "wait", label: "Wait", description: "Wait for more context." },
    ],
    constraints: [],
    considerations: [],
    perceptionIds: [],
    randomness: "close-choices" as const,
    retention: "ephemeral" as const,
  };
}

interface TrustedCueFixture {
  readonly world: World;
  readonly actorId: EntityId;
  readonly sourceId: EntityId;
  readonly propositionId: EntityId;
  readonly perceptionId: EntityId;
}

function trustedSpouseFixture(
  seed: string,
  sourceCredibility: SourceCredibility,
): TrustedCueFixture {
  let world = createDemoWorld(seed);
  const actorId = personId(world, 1);
  const sourceId = personId(world, 2);
  const propositionId = SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps;

  world = createPartnership(world, {
    stableKey: `partnership:spouse:${actorId}:${sourceId}`,
    personIds: [actorId, sourceId],
    startedAt: world.currentDate,
    kind: "legal:marriage",
    provenance: {
      kind: "authored",
      note: "Synthetic Stage 4 trusted-cue fixture.",
    },
  });
  world = recordRelationshipInteraction(world, {
    stableKey: `relationship:spouse-support:${actorId}:${sourceId}`,
    personIds: [actorId, sourceId],
    eventId: null,
    occurredAt: world.currentDate,
    kind: "support:given",
    change: "strengthened",
    significance: "major",
    summary: "Repeated practical support strengthened this marriage.",
    tags: ["relationship.spouse", "relationship.support"],
  });
  const interaction = world.history.relationshipInteractions.at(-1);
  if (!interaction) throw new Error("Missing relationship fixture.");
  world = recordSubjectKnowledge(world, {
    stableKey: `knowledge:${sourceId}:healthcare`,
    personId: sourceId,
    subjectId: SYNTHETIC_POLICY_IDS.subjects.healthcare,
    recordedAt: world.currentDate,
    familiarity: "deep",
    understanding: "expert",
    expertise: "authority",
    practicalExperience: "extensive",
    provenance: {
      kind: "manual",
      note: "Synthetic expertise fixture.",
    },
    supersedesKnowledgeId: null,
  });
  world = recordPublicPosition(world, {
    stableKey: `position:${sourceId}:price-caps`,
    personId: sourceId,
    propositionId,
    statedAt: world.currentDate,
    stance: "support",
    statement: "I support the synthetic price-cap proposition.",
    audience: "limited",
    venue: "Conversation with spouse",
    sourceEventId: null,
    supersedesPublicPositionId: null,
  });
  const position = world.history.publicPositions.at(-1);
  if (!position) throw new Error("Missing source position fixture.");
  world = recordPropositionExposure(world, {
    stableKey: `exposure:${actorId}:spouse-price-caps`,
    personId: actorId,
    propositionId,
    encounteredAt: world.currentDate,
    summary: "The actor heard their spouse support the price-cap proposition.",
    provenance: {
      kind: "told-by",
      sourcePersonId: sourceId,
      claimId: null,
    },
  });
  const exposure = world.history.propositionExposures.at(-1);
  if (!exposure) throw new Error("Missing recipient exposure fixture.");
  world = recordPerception(world, {
    stableKey: `perception:${actorId}:spouse-price-caps`,
    personId: actorId,
    perceivedAt: world.currentDate,
    subjectKind: "domain:policy-proposition",
    subjectKey: `proposition:${propositionId}`,
    subjectEntityId: propositionId,
    assertion: "My spouse believes the proposal would help patients.",
    confidence: "high",
    sourceCredibility,
    source: {
      kind: "trusted-cue",
      sourcePersonId: sourceId,
      communicationRecordIds: [exposure.id, position.id],
      relationshipInteractionIds: [interaction.id],
      sourceLabel: "spouse",
    },
    supersedesPerceptionId: null,
  });
  const perception = world.history.perceptions.at(-1);
  if (!perception) throw new Error("Missing trusted-cue perception fixture.");
  return {
    world,
    actorId,
    sourceId,
    propositionId,
    perceptionId: perception.id,
  };
}

describe("sparse mind separation and player development hooks", () => {
  it("allows conflicting goals while values, principles, and personality remain separate", () => {
    let world = createDemoWorld("stage4-mind-concept-separation");
    const actorId = personId(world, 1);
    const politicalCounts = {
      beliefs: world.history.privateBeliefs.length,
      positions: world.history.publicPositions.length,
      commitments: world.history.campaignCommitments.length,
    };
    world = recordPersonalityTendency(world, {
      stableKey: `tendency:${actorId}:ambition`,
      personId: actorId,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.ambition,
      recordedAt: world.currentDate,
      expressionKey: "ambitious",
      strength: "strong",
      confidence: "medium",
      scopeTags: ["goal.pursuit"],
      provenance: createMindProvenance("authored"),
      supersedesTendencyId: null,
    });
    world = recordPersonalValue(world, {
      stableKey: `value:${actorId}:stability`,
      personId: actorId,
      valueId: SYNTHETIC_MIND_IDS.values.institutionalStability,
      recordedAt: world.currentDate,
      orientation: "embraces",
      strength: "strong",
      salience: "high",
      qualification: "A personal value, not a policy conclusion.",
      provenance: createMindProvenance("authored"),
      supersedesValueId: null,
    });
    world = recordPrinciple(world, {
      stableKey: `principle:${actorId}:stability`,
      personId: actorId,
      principleId: SYNTHETIC_POLICY_IDS.principles.institutionalStability,
      formedAt: world.currentDate,
      stance: "conflicted",
      conviction: "tentative",
      flexibility: "open",
      qualification: "The political principle remains under consideration.",
      formation: createFormationContext("reflection:initial"),
      supersedesPrincipleRecordId: null,
    });
    for (const [goalKey, objective] of [
      ["protect-reputation", "Protect a valued reputation."],
      ["speak-candidly", "Speak candidly despite reputational risk."],
    ] as const) {
      world = recordGoalState(world, {
        stableKey: `goal:${actorId}:${goalKey}`,
        goalKey,
        personId: actorId,
        recordedAt: world.currentDate,
        objective,
        domain: "personal",
        scope: "Synthetic conflicting-goal fixture",
        priority: "high",
        status: "active",
        targetEntityId: null,
        deadline: null,
        outcome: null,
        provenance: createMindProvenance("authored"),
        replacesGoalId: null,
        supersedesGoalStateId: null,
      });
    }

    expect(
      world.history.goalStates.filter(
        (record) => record.personId === actorId && record.status === "active",
      ),
    ).toHaveLength(2);
    expect(
      world.history.personalValues.find((record) => record.personId === actorId)
        ?.id,
    ).not.toBe(
      world.history.principles.find((record) => record.personId === actorId)
        ?.id,
    );
    expect(world.history.privateBeliefs).toHaveLength(politicalCounts.beliefs);
    expect(world.history.publicPositions).toHaveLength(
      politicalCounts.positions,
    );
    expect(world.history.campaignCommitments).toHaveLength(
      politicalCounts.commitments,
    );
  });

  it("does not force an appraisal and makes controlled-person development non-applying", () => {
    let world = createDemoWorld("stage4-development-proposal");
    const actorId = personId(world, 1);
    world = recordWorldEvent(world, {
      stableKey: `event:${actorId}:no-forced-appraisal`,
      type: "personal.minor-neutral-occurrence",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [actorId],
      participants: [
        { personId: actorId, role: "focus:subject", detail: null },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["fixture.minor"],
      summary: "A minor occurrence with no forced psychological meaning.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing neutral event fixture.");
    expect(
      world.history.appraisals.some((record) => record.eventId === event.id),
    ).toBe(false);

    const controlled: World = {
      ...world,
      control: { kind: "person", personId: actorId },
    };
    assertWorldIntegrity(controlled);
    const before = structuredClone(controlled);
    const proposal = createDevelopmentProposal(controlled, {
      stableKey: `development:${actorId}:risk`,
      personId: actorId,
      proposedAt: controlled.currentDate,
      target: {
        kind: "personality",
        tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
        expressionKey: "cautious",
      },
      direction: "reconsider",
      sourceRefs: [{ kind: "historical-event", eventId: event.id }],
      repetitionKey: "minor-neutral-occurrence",
      rationale: "Future systems may present a gradual-development choice.",
    });
    expect(proposal.requiresPlayerChoice).toBe(true);
    expect(controlled).toStrictEqual(before);
    expect(() =>
      recordPersonalityTendency(controlled, {
        stableKey: `tendency:${actorId}:silent-rewrite`,
        personId: actorId,
        tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
        recordedAt: controlled.currentDate,
        expressionKey: "cautious",
        strength: "moderate",
        confidence: "medium",
        scopeTags: [],
        provenance: createMindProvenance("development-proposal", {
          sourceRefs: [{ kind: "historical-event", eventId: event.id }],
        }),
        supersedesTendencyId: null,
      }),
    ).toThrow(/requires player-choice provenance/);
  });
});

describe("subjective perception and historical cutoffs", () => {
  it("excludes later-appended backdated information from an earlier cutoff", () => {
    let world = createDemoWorld("stage4-no-future-leakage");
    const actorId = personId(world, 1);
    const context = basicDecision(world, actorId);
    const earlier = evaluateDecision(world, context);

    world = recordPerception(world, {
      stableKey: `perception:${actorId}:late-backfill`,
      personId: actorId,
      perceivedAt: world.currentDate,
      subjectKind: "context:situation",
      subjectKey: "backfilled-information",
      subjectEntityId: null,
      assertion: "Information appended after the original decision cutoff.",
      confidence: "high",
      sourceCredibility: "high",
      source: { kind: "authored", note: "Backfill fixture." },
      supersedesPerceptionId: null,
    });
    const latePerception = world.history.perceptions.at(-1);
    if (!latePerception) throw new Error("Missing late perception.");

    const historical = buildSubjectivePerception(
      world,
      actorId,
      context.cutoff,
    );
    expect(historical.items.map((item) => item.id)).not.toContain(
      latePerception.id,
    );
    expect(evaluateDecision(world, context)).toStrictEqual(earlier);
    expect(() =>
      evaluateDecision(world, {
        ...context,
        perceptionIds: [latePerception.id],
      }),
    ).toThrow(/Unavailable perception/);
  });

  it("retains contradictory perceptions without exposing diagnostic truth fields", () => {
    let world = createDemoWorld("stage4-contradictory-perception");
    const actorId = personId(world, 1);
    const shared = {
      personId: actorId,
      perceivedAt: world.currentDate,
      subjectKind: "context:situation" as const,
      subjectKey: "same-question",
      subjectEntityId: null,
      confidence: "medium" as const,
      sourceCredibility: "unknown" as const,
      supersedesPerceptionId: null,
    };
    world = recordPerception(world, {
      ...shared,
      stableKey: `perception:${actorId}:claim-a`,
      assertion: "The plan will probably work.",
      source: { kind: "authored", note: "First uncertain report." },
    });
    world = recordPerception(world, {
      ...shared,
      stableKey: `perception:${actorId}:claim-b`,
      assertion: "The plan will probably fail.",
      source: { kind: "authored", note: "Conflicting uncertain report." },
    });

    const snapshot = buildSubjectivePerception(world, actorId);
    const assertions = snapshot.items
      .filter((item) => item.kind === "perception")
      .map((item) => item.summary);
    expect(assertions).toEqual(
      expect.arrayContaining([
        "The plan will probably work.",
        "The plan will probably fail.",
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toContain("relationshipToTruth");
    expect(JSON.stringify(snapshot)).not.toContain("accuracy");
  });

  it("does not introduce sequence-less biography facts into a reconstructed past", () => {
    const initial = createDemoWorld("stage4-biography-availability-boundary");
    const actorId = personId(initial, 1);
    const world = advanceWorld(initial, 1);
    const fact = world.people[actorId]?.establishedFacts[0];
    if (!fact) throw new Error("Missing biography fact fixture.");
    const context = basicDecision(world, actorId);
    const historicalContext = {
      ...context,
      stableKey: `${context.stableKey}:historical-fact`,
      cutoff: {
        asOfDate: initial.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      considerations: [
        {
          stableKey: "historical-fact-without-availability",
          optionKey: "act",
          sourceType: "information:known-fact" as const,
          direction: "supports" as const,
          importance: "moderate" as const,
          confidence: "high" as const,
          explanation: "A fact cannot be proven available at this old cutoff.",
          sourceRefs: [{ kind: "person-fact" as const, factId: fact.id }],
        },
      ],
    };
    expect(() => evaluateDecision(world, historicalContext)).toThrow(
      /lack append availability/,
    );
    expect(
      buildSubjectivePerception(
        world,
        actorId,
        historicalContext.cutoff,
      ).items.map((item) => item.kind),
    ).not.toContain("person-fact");
  });
});

describe("person-based trusted political cues", () => {
  it("uses communicated expert spouse advice as a consideration without dictating the result", () => {
    const fixture = trustedSpouseFixture("stage4-spouse-cue", "high");
    const proposal = evaluatePoliticalBeliefFormation(fixture.world, {
      stableKey: `formation:${fixture.actorId}:resists-spouse`,
      personId: fixture.actorId,
      propositionId: fixture.propositionId,
      beliefDimensions: STRONG_OPEN_BELIEF,
      perceptionIds: [fixture.perceptionId],
      randomness: "none",
      factors: [
        {
          stableKey: "contrary-personal-experience",
          favors: "opposition",
          sourceType: "context:risk",
          importance: "decisive",
          confidence: "high",
          explanation:
            "A stronger contrary personal interpretation outweighs, but does not erase, the spouse's advice.",
          sourceRefs: [],
        },
      ],
    });

    expect(
      proposal.evaluation.context.considerations.some(
        (item) =>
          item.sourceType === "social:trusted-cue" &&
          item.optionKey === "support",
      ),
    ).toBe(true);
    expect(proposal.outcome).toBe("opposition");
    expect(
      fixture.world.history.subjectKnowledge.some(
        (record) =>
          record.personId === fixture.sourceId &&
          record.expertise === "authority",
      ),
    ).toBe(true);
  });

  it("gives a weak-credibility cue limited influence", () => {
    const fixture = trustedSpouseFixture("stage4-weak-spouse-cue", "low");
    const proposal = evaluatePoliticalBeliefFormation(fixture.world, {
      stableKey: `formation:${fixture.actorId}:weak-spouse-cue`,
      personId: fixture.actorId,
      propositionId: fixture.propositionId,
      perceptionIds: [fixture.perceptionId],
      randomness: "none",
    });

    const cue = proposal.evaluation.context.considerations.find(
      (item) => item.sourceType === "social:trusted-cue",
    );
    expect(cue?.importance).toBe("slight");
    expect(proposal.outcome).toBe("no-opinion");
  });

  it("does not use relationship or another person's private belief without communication", () => {
    let world = createDemoWorld("stage4-no-private-belief-leak");
    const actorId = personId(world, 1);
    const sourceId = personId(world, 2);
    world = recordRelationshipInteraction(world, {
      stableKey: `relationship:${actorId}:${sourceId}:support`,
      personIds: [actorId, sourceId],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "support:given",
      change: "strengthened",
      significance: "major",
      summary: "A close relationship without a policy conversation.",
      tags: ["relationship.support"],
    });
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps;
    world = recordPrivateBelief(world, {
      stableKey: `private-belief:${sourceId}:uncommunicated-support`,
      personId: sourceId,
      propositionId,
      formedAt: world.currentDate,
      position: "support",
      conviction: "settled",
      salience: "high",
      flexibility: "firm",
      rationale: "A deliberately uncommunicated source-person belief.",
      formation: createFormationContext("reflection:initial", {
        note: "No communication record exists for the recipient.",
      }),
      supersedesBeliefId: null,
    });
    expect(
      world.history.privateBeliefs.some(
        (belief) =>
          belief.personId === sourceId &&
          belief.propositionId === propositionId,
      ),
    ).toBe(true);

    const proposal = evaluatePoliticalBeliefFormation(world, {
      stableKey: `formation:${actorId}:no-communication`,
      personId: actorId,
      propositionId,
      randomness: "none",
    });
    expect(proposal.outcome).toBe("no-opinion");
    expect(
      proposal.evaluation.context.considerations.some(
        (item) => item.sourceType === "social:trusted-cue",
      ),
    ).toBe(false);
  });
});

describe("bounded and actor-isolated general decisions", () => {
  it("keeps conflicting soft considerations explanatory rather than blocking", () => {
    const world = createDemoWorld("stage4-soft-conflict");
    const actorId = personId(world, 1);
    const context = basicDecision(world, actorId);
    const evaluation = evaluateDecision(world, {
      ...context,
      stableKey: `${context.stableKey}:soft-conflict`,
      randomness: "none",
      considerations: [
        {
          stableKey: "goal-supports-action",
          optionKey: "act",
          sourceType: "context:competing-goal",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation: "One goal supports acting.",
          sourceRefs: [],
        },
        {
          stableKey: "risk-opposes-action",
          optionKey: "act",
          sourceType: "context:risk",
          direction: "opposes",
          importance: "strong",
          confidence: "high",
          explanation: "Perceived risk opposes acting.",
          sourceRefs: [],
        },
      ],
    });
    expect(
      evaluation.optionEvaluations.every((option) => option.available),
    ).toBe(true);
    expect(
      evaluation.context.considerations.map((item) => item.direction),
    ).toEqual(["supports", "opposes"]);
  });

  it("is unaffected by evaluating another actor first", () => {
    const world = createDemoWorld("stage4-actor-isolation");
    const targetId = personId(world, 1);
    const otherId = personId(world, 2);
    const targetContext = basicDecision(world, targetId);
    const before = evaluateDecision(world, targetContext);
    evaluateDecision(world, basicDecision(world, otherId));
    expect(evaluateDecision(world, targetContext)).toStrictEqual(before);
  });

  it("uses only slight deterministic variation for close available choices", () => {
    const observed = new Set<string>();
    for (let index = 0; index < 12; index += 1) {
      const world = createDemoWorld(`stage4-close-choice-${index}`);
      const evaluation = evaluateDecision(
        world,
        basicDecision(world, personId(world, 1)),
      );
      for (const option of evaluation.optionEvaluations) {
        expect(option.available).toBe(true);
        observed.add(option.randomContribution);
      }
    }
    expect(observed).toContain("none");
    expect(observed.has("slight-boost") || observed.has("slight-penalty")).toBe(
      true,
    );
    expect(
      [...observed].every((value) =>
        ["none", "slight-boost", "slight-penalty"].includes(value),
      ),
    ).toBe(true);

    const separatedWorld = createDemoWorld("stage4-separated-choice");
    const separatedContext = basicDecision(
      separatedWorld,
      personId(separatedWorld, 1),
    );
    const separated = evaluateDecision(separatedWorld, {
      ...separatedContext,
      stableKey: `${separatedContext.stableKey}:clearly-separated`,
      considerations: [
        {
          stableKey: "strong-reason-to-act",
          optionKey: "act",
          sourceType: "context:incentive",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation: "The action is clearly preferred before randomness.",
          sourceRefs: [],
        },
      ],
    });
    expect(
      separated.optionEvaluations.map((option) => option.randomContribution),
    ).toEqual(["none", "none"]);
  });
});

describe("political adapter diversity without automatic mappings", () => {
  it("allows strong values to exist without automatically creating a stance", () => {
    let world = createDemoWorld("stage4-value-no-policy-map");
    const actorId = personId(world, 1);
    world = recordPersonalValue(world, {
      stableKey: `value:${actorId}:equality`,
      personId: actorId,
      valueId: SYNTHETIC_MIND_IDS.values.equality,
      recordedAt: world.currentDate,
      orientation: "embraces",
      strength: "defining",
      salience: "central",
      qualification: null,
      provenance: createMindProvenance("authored", {
        note: "A value with no proposition-specific framing.",
      }),
      supersedesValueId: null,
    });

    const proposal = evaluatePoliticalBeliefFormation(world, {
      stableKey: `formation:${actorId}:unmapped-value`,
      personId: actorId,
      propositionId: SYNTHETIC_POLICY_IDS.propositions.collectiveBargaining,
      randomness: "none",
    });
    expect(proposal.outcome).toBe("no-opinion");
  });

  it("allows an expert to defer and a low-knowledge actor to hold a strong belief", () => {
    let world = createDemoWorld("stage4-knowledge-not-conviction");
    const expertId = personId(world, 1);
    const lowKnowledgeId = personId(world, 2);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps;
    world = recordSubjectKnowledge(world, {
      stableKey: `knowledge:${expertId}:healthcare`,
      personId: expertId,
      subjectId: SYNTHETIC_POLICY_IDS.subjects.healthcare,
      recordedAt: world.currentDate,
      familiarity: "deep",
      understanding: "expert",
      expertise: "authority",
      practicalExperience: "extensive",
      provenance: { kind: "study", reference: "Synthetic expert fixture" },
      supersedesKnowledgeId: null,
    });
    const expertise = world.history.subjectKnowledge.at(-1);
    if (!expertise) throw new Error("Missing expertise fixture.");
    const expertProposal = evaluatePoliticalBeliefFormation(world, {
      stableKey: `formation:${expertId}:expert-defers`,
      personId: expertId,
      propositionId,
      randomness: "none",
      factors: [
        {
          stableKey: "expert-recognizes-uncertainty",
          favors: "defer",
          sourceType: "information:expertise",
          importance: "strong",
          confidence: "high",
          explanation:
            "Expertise exposes unresolved tradeoffs and supports waiting for evidence.",
          sourceRefs: [
            { kind: "subject-knowledge", subjectKnowledgeId: expertise.id },
          ],
        },
      ],
    });
    expect(expertProposal.outcome).toBe("defer");

    const lowKnowledgeProposal = evaluatePoliticalBeliefFormation(world, {
      stableKey: `formation:${lowKnowledgeId}:strong-with-little-knowledge`,
      personId: lowKnowledgeId,
      propositionId,
      beliefDimensions: STRONG_OPEN_BELIEF,
      randomness: "none",
      factors: [
        {
          stableKey: "identity-laden-impression",
          favors: "support",
          sourceType: "context:incentive",
          importance: "decisive",
          confidence: "high",
          explanation:
            "A personally forceful impression supports a strong view despite sparse subject knowledge.",
          sourceRefs: [],
        },
      ],
    });
    world = applyNpcPoliticalBeliefFormation(world, lowKnowledgeProposal);
    const belief = world.history.privateBeliefs.at(-1);
    expect(belief).toMatchObject({
      personId: lowKnowledgeId,
      position: "support",
      conviction: "strong",
    });
    expect(
      world.history.subjectKnowledge.some(
        (record) => record.personId === lowKnowledgeId,
      ),
    ).toBe(false);
  });

  it("lets similar principles produce different beliefs when histories are framed differently", () => {
    let world = createDemoWorld("stage4-history-divergence");
    const firstId = personId(world, 1);
    const secondId = personId(world, 2);
    const propositionId =
      SYNTHETIC_POLICY_IDS.propositions.collectiveBargaining;
    for (const actorId of [firstId, secondId]) {
      world = recordPrinciple(world, {
        stableKey: `principle:${actorId}:stability`,
        personId: actorId,
        principleId: SYNTHETIC_POLICY_IDS.principles.institutionalStability,
        formedAt: world.currentDate,
        stance: "endorses",
        conviction: "strong",
        flexibility: "conditional",
        qualification: null,
        formation: createFormationContext("reflection:initial"),
        supersedesPrincipleRecordId: null,
      });
    }
    world = recordWorldEvent(world, {
      stableKey: "event:shared-workplace-dispute",
      type: "work.workplace-dispute",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [firstId, secondId],
      participants: [
        { personId: firstId, role: "presence:participant", detail: null },
        { personId: secondId, role: "presence:participant", detail: null },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["fixture.workplace-dispute"],
      summary: "Both people witnessed the same synthetic workplace dispute.",
      context: {
        location: null,
        socialContext: "The same dispute affected both observers.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing divergent-history event.");
    world = recordAppraisal(world, {
      stableKey: `appraisal:${firstId}:workplace-dispute`,
      personId: firstId,
      eventId: event.id,
      memoryId: null,
      eventKnowledgeId: null,
      appraisedAt: world.currentDate,
      meanings: [
        {
          key: "unfairness",
          label: "Unfair treatment",
          valence: "negative",
          intensity: "strong",
        },
      ],
      interpretation: "The dispute showed an unfair imbalance in bargaining.",
      confidence: "high",
      involvedPersonIds: [firstId, secondId],
      provenance: createMindProvenance("reflection", {
        sourceRefs: [{ kind: "historical-event", eventId: event.id }],
      }),
      supersedesAppraisalId: null,
    });
    const firstAppraisal = world.history.appraisals.at(-1);
    world = recordAppraisal(world, {
      stableKey: `appraisal:${secondId}:workplace-dispute`,
      personId: secondId,
      eventId: event.id,
      memoryId: null,
      eventKnowledgeId: null,
      appraisedAt: world.currentDate,
      meanings: [
        {
          key: "instability",
          label: "Destabilizing conflict",
          valence: "negative",
          intensity: "strong",
        },
      ],
      interpretation:
        "The dispute showed how quickly bargaining can destabilize work.",
      confidence: "high",
      involvedPersonIds: [firstId, secondId],
      provenance: createMindProvenance("reflection", {
        sourceRefs: [{ kind: "historical-event", eventId: event.id }],
      }),
      supersedesAppraisalId: null,
    });
    const secondAppraisal = world.history.appraisals.at(-1);
    if (!firstAppraisal || !secondAppraisal) {
      throw new Error("Missing divergent appraisals.");
    }
    const firstProposal = evaluatePoliticalBeliefFormation(world, {
      stableKey: `formation:${firstId}:history-support`,
      personId: firstId,
      propositionId,
      beliefDimensions: TENTATIVE_HIGH_SALIENCE_BELIEF,
      randomness: "none",
      factors: [
        {
          stableKey: "history-as-fairness",
          favors: "tentative-support",
          sourceType: "information:appraisal",
          importance: "strong",
          confidence: "high",
          explanation: "Prior experience is interpreted as a fairness concern.",
          sourceRefs: [{ kind: "appraisal", appraisalId: firstAppraisal.id }],
        },
      ],
    });
    const secondProposal = evaluatePoliticalBeliefFormation(world, {
      stableKey: `formation:${secondId}:history-opposition`,
      personId: secondId,
      propositionId,
      beliefDimensions: TENTATIVE_HIGH_SALIENCE_BELIEF,
      randomness: "none",
      factors: [
        {
          stableKey: "history-as-instability",
          favors: "tentative-opposition",
          sourceType: "information:appraisal",
          importance: "strong",
          confidence: "high",
          explanation:
            "A different prior experience is interpreted as a stability concern.",
          sourceRefs: [{ kind: "appraisal", appraisalId: secondAppraisal.id }],
        },
      ],
    });
    expect(firstProposal.outcome).toBe("tentative-support");
    expect(secondProposal.outcome).toBe("tentative-opposition");
  });

  it("appends a reconsidered belief without rewriting speech or commitments", () => {
    let world = createDemoWorld("stage4-adapter-supersession");
    const actorId = personId(world, 1);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.drugNegotiation;
    world = recordPublicPosition(world, {
      stableKey: `position:${actorId}:drug-negotiation`,
      personId: actorId,
      propositionId,
      statedAt: world.currentDate,
      stance: "undecided",
      statement: "I remain publicly undecided.",
      audience: "public",
      venue: "Synthetic fixture",
      sourceEventId: null,
      supersedesPublicPositionId: null,
    });
    world = recordCampaignCommitment(world, {
      stableKey: `commitment:${actorId}:drug-negotiation`,
      personId: actorId,
      propositionId,
      madeAt: world.currentDate,
      stance: "defer",
      level: "conditional",
      statement: "I will wait for more information.",
      conditions: "Pending evidence",
      sourceEventId: null,
      supersedesCommitmentId: null,
    });
    const speechBefore = structuredClone(world.history.publicPositions);
    const commitmentsBefore = structuredClone(
      world.history.campaignCommitments,
    );
    const support = evaluatePoliticalBeliefFormation(world, {
      stableKey: `formation:${actorId}:initial-support`,
      personId: actorId,
      propositionId,
      beliefDimensions: {
        conviction: "strong",
        salience: "low",
        flexibility: "firm",
      },
      randomness: "none",
      factors: [
        {
          stableKey: "initial-personal-reason",
          favors: "support",
          sourceType: "context:incentive",
          importance: "decisive",
          confidence: "high",
          explanation: "A synthetic personal reason favors support.",
          sourceRefs: [],
        },
      ],
    });
    world = applyNpcPoliticalBeliefFormation(world, support);
    const firstBelief = world.history.privateBeliefs.at(-1);
    if (!firstBelief) throw new Error("Missing initial autonomous belief.");
    const firstBeliefBytes = structuredClone(firstBelief);

    const opposition = evaluatePoliticalBeliefFormation(world, {
      stableKey: `formation:${actorId}:later-opposition`,
      personId: actorId,
      propositionId,
      beliefDimensions: {
        conviction: "strong",
        salience: "central",
        flexibility: "open",
      },
      randomness: "none",
      factors: [
        {
          stableKey: "later-contrary-experience",
          favors: "opposition",
          sourceType: "context:risk",
          importance: "decisive",
          confidence: "high",
          explanation: "A later synthetic interpretation favors opposition.",
          sourceRefs: [],
        },
      ],
    });
    world = applyNpcPoliticalBeliefFormation(world, opposition);
    const latest = world.history.privateBeliefs.at(-1);
    expect(latest).toMatchObject({
      personId: actorId,
      propositionId,
      position: "oppose",
      supersedesBeliefId: firstBelief.id,
    });
    expect(
      world.history.privateBeliefs.find(
        (record) => record.id === firstBelief.id,
      ),
    ).toStrictEqual(firstBeliefBytes);
    expect(world.history.publicPositions).toStrictEqual(speechBefore);
    expect(world.history.campaignCommitments).toStrictEqual(commitmentsBefore);
  });
});

describe("Stage 4 persistence and load-time integrity", () => {
  it("round-trips every Stage 4 demo family through the current snapshot", () => {
    const world = createDemoWorld("stage4-json-roundtrip");
    const payload = serializeWorld(world);
    const restored = deserializeWorld(payload);
    expect(
      (JSON.parse(payload) as { formatVersion: number }).formatVersion,
    ).toBe(13);
    expect(restored).toStrictEqual(world);
    expect(restored.history.personalityTendencies.length).toBeGreaterThan(0);
    expect(restored.history.personalValues.length).toBeGreaterThan(0);
    expect(restored.history.goalStates.length).toBeGreaterThan(0);
    expect(restored.history.appraisals.length).toBeGreaterThan(0);
    expect(restored.history.perceptions.length).toBeGreaterThan(0);
    expect(restored.history.temporaryStates.length).toBeGreaterThan(0);
    expect(restored.history.decisionTraces.length).toBeGreaterThan(0);
  });

  it("rejects tampered Stage 4 discriminators, chronology, and provenance", () => {
    const world = createDemoWorld("stage4-integrity-tampering");
    const invalidExpression = JSON.parse(serializeWorld(world));
    invalidExpression.world.history.personalityTendencies[0].expressionKey =
      "not-in-catalog";
    expect(() => deserializeWorld(JSON.stringify(invalidExpression))).toThrow(
      /invalid tendency/,
    );

    const invalidInterval = JSON.parse(serializeWorld(world));
    const state = invalidInterval.world.history.temporaryStates[0];
    state.endsAt = state.startsAt;
    expect(() => deserializeWorld(JSON.stringify(invalidInterval))).toThrow(
      /invalid interval/,
    );

    const invalidSource = JSON.parse(serializeWorld(world));
    invalidSource.world.history.perceptions[0].source.kind = "omniscient-truth";
    expect(() => deserializeWorld(JSON.stringify(invalidSource))).toThrow(
      /Invalid perception source/,
    );

    const invalidDecisionSubject = JSON.parse(serializeWorld(world));
    invalidDecisionSubject.world.history.decisionTraces[0].context.subject.kind =
      "situation";
    expect(() =>
      deserializeWorld(JSON.stringify(invalidDecisionSubject)),
    ).toThrow(/recognized semantic namespace/);

    const unreferencedDecisionSource = JSON.parse(serializeWorld(world));
    unreferencedDecisionSource.world.history.decisionTraces[0].context.considerations[0].sourceType =
      "domain:unreferenced-claim";
    expect(() =>
      deserializeWorld(JSON.stringify(unreferencedDecisionSource)),
    ).toThrow(/lacks provenance references/);
  });
});
