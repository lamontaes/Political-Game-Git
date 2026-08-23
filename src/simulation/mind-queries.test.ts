import { describe, expect, it } from "vitest";

import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { makeIsoDate } from "./dates";
import { createDemoWorld } from "./demo";
import {
  createMindProvenance,
  recordAppraisal,
  recordGoalState,
  recordPersonalValue,
  recordPersonalityTendency,
  recordPerception,
  recordTemporaryState,
} from "./mind";
import { SYNTHETIC_MIND_IDS } from "./mind-catalog";
import {
  activeGoalStatesAt,
  activeTemporaryStatesAt,
  appraisalHistory,
  currentHistoricalCutoff,
  decisionTraceById,
  decisionTraceForDecision,
  decisionTraceHistory,
  didPeoplePreviouslyWorkTogether,
  explicitPerceptionHistory,
  explicitPerceptionsAbout,
  goalStateHistory,
  latestAppraisal,
  latestGoalState,
  latestGoalStatesForPerson,
  latestPersonalValue,
  latestPersonalValuesForPerson,
  latestPersonalityTendenciesForPerson,
  latestPersonalityTendency,
  personalValueHistory,
  personalityTendencyHistory,
} from "./queries";
import { appendPersonFact } from "./records";
import type {
  DecisionContext,
  EntityId,
  HistoricalCutoff,
  World,
} from "./types";
import { advanceWorld } from "./world";

function personId(world: World, index = 1): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing test person at index ${index}.`);
  return id;
}

function cutoff(
  asOfDate: string,
  historySequenceExclusive: number,
): HistoricalCutoff {
  return {
    asOfDate: makeIsoDate(asOfDate),
    historySequenceExclusive,
  };
}

describe("historical character-mind queries", () => {
  it("uses effective date and append-sequence cutoffs for sparse personality, values, and goals", () => {
    let world = advanceWorld(createDemoWorld("mind-query-cutoffs"), 7);
    const id = personId(world);
    const authored = createMindProvenance("authored", {
      note: "Synthetic query fixture.",
    });

    world = recordPersonalityTendency(world, {
      stableKey: "query:tendency:first",
      personId: id,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
      recordedAt: makeIsoDate("2020-01-01"),
      expressionKey: "cautious",
      strength: "moderate",
      confidence: "medium",
      scopeTags: [],
      provenance: authored,
      supersedesTendencyId: null,
    });
    const firstTendency = world.history.personalityTendencies.at(-1);
    if (!firstTendency) throw new Error("Missing first tendency.");
    const beforeTendencyRevision = world.history.nextSequence;
    world = recordPersonalityTendency(world, {
      stableKey: "query:tendency:second",
      personId: id,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
      recordedAt: makeIsoDate("2021-01-01"),
      expressionKey: "risk-seeking",
      strength: "strong",
      confidence: "high",
      scopeTags: [],
      provenance: authored,
      supersedesTendencyId: firstTendency.id,
    });

    world = recordPersonalValue(world, {
      stableKey: "query:value:first",
      personId: id,
      valueId: SYNTHETIC_MIND_IDS.values.equality,
      recordedAt: makeIsoDate("2020-02-01"),
      orientation: "embraces",
      strength: "strong",
      salience: "high",
      qualification: null,
      provenance: authored,
      supersedesValueId: null,
    });
    const firstValue = world.history.personalValues.at(-1);
    if (!firstValue) throw new Error("Missing first value.");
    const beforeValueRevision = world.history.nextSequence;
    world = recordPersonalValue(world, {
      stableKey: "query:value:second",
      personId: id,
      valueId: SYNTHETIC_MIND_IDS.values.equality,
      recordedAt: makeIsoDate("2021-02-01"),
      orientation: "questions",
      strength: "moderate",
      salience: "moderate",
      qualification: "Conflicted about one application.",
      provenance: authored,
      supersedesValueId: firstValue.id,
    });

    world = recordGoalState(world, {
      stableKey: "query:goal:active",
      goalKey: "protect-reputation",
      personId: id,
      createdAt: makeIsoDate("2020-03-01"),
      recordedAt: makeIsoDate("2020-03-01"),
      objective: "Protect reputation.",
      domain: "personal",
      scope: "synthetic fixture",
      priority: "high",
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: authored,
      replacesGoalId: null,
      supersedesGoalStateId: null,
    });
    const activeGoal = world.history.goalStates.at(-1);
    if (!activeGoal) throw new Error("Missing active goal.");
    const beforeGoalCompletion = world.history.nextSequence;
    world = recordGoalState(world, {
      stableKey: "query:goal:completed",
      goalKey: activeGoal.goalKey,
      personId: id,
      createdAt: activeGoal.createdAt,
      recordedAt: makeIsoDate("2021-03-01"),
      objective: activeGoal.objective,
      domain: activeGoal.domain,
      scope: activeGoal.scope,
      priority: "moderate",
      status: "completed",
      targetEntityId: null,
      deadline: null,
      outcome: "Resolved in the synthetic fixture.",
      provenance: authored,
      replacesGoalId: null,
      supersedesGoalStateId: activeGoal.id,
    });

    const currentSequence = world.history.nextSequence;
    expect(
      latestPersonalityTendency(
        world,
        id,
        SYNTHETIC_MIND_IDS.tendencies.riskApproach,
        cutoff(world.currentDate, beforeTendencyRevision),
      )?.expressionKey,
    ).toBe("cautious");
    expect(
      latestPersonalityTendency(
        world,
        id,
        SYNTHETIC_MIND_IDS.tendencies.riskApproach,
        cutoff("2020-12-31", currentSequence),
      )?.expressionKey,
    ).toBe("cautious");
    expect(
      personalityTendencyHistory(
        world,
        id,
        undefined,
        cutoff(world.currentDate, currentSequence),
      ),
    ).toHaveLength(2);
    expect(latestPersonalityTendenciesForPerson(world, id)).toEqual([
      world.history.personalityTendencies.at(-1),
    ]);

    expect(
      latestPersonalValue(
        world,
        id,
        SYNTHETIC_MIND_IDS.values.equality,
        cutoff(world.currentDate, beforeValueRevision),
      )?.orientation,
    ).toBe("embraces");
    expect(
      personalValueHistory(
        world,
        id,
        undefined,
        cutoff("2020-12-31", currentSequence),
      ),
    ).toEqual([firstValue]);
    expect(latestPersonalValuesForPerson(world, id)).toEqual([
      world.history.personalValues.at(-1),
    ]);

    expect(
      latestGoalState(
        world,
        id,
        activeGoal.goalId,
        cutoff(world.currentDate, beforeGoalCompletion),
      )?.status,
    ).toBe("active");
    expect(
      goalStateHistory(
        world,
        id,
        activeGoal.goalId,
        cutoff("2020-12-31", currentSequence),
      ),
    ).toEqual([activeGoal]);
    expect(
      activeGoalStatesAt(world, id, cutoff("2020-12-31", currentSequence)),
    ).toEqual([activeGoal]);
    expect(activeGoalStatesAt(world, id)).toEqual([]);
    expect(latestGoalStatesForPerson(world, id)).toEqual([
      world.history.goalStates.at(-1),
    ]);
  });

  it("reconstructs appraisals and explicit perceptions without leaking later same-day records", () => {
    let world = advanceWorld(createDemoWorld("appraisal-perception-query"), 7);
    const id = personId(world);
    const event = world.history.events.find((candidate) =>
      candidate.involvedEntityIds.includes(id),
    );
    if (!event) throw new Error("Missing event for appraisal query.");
    const authored = createMindProvenance("authored", {
      note: "Synthetic query fixture.",
    });

    world = recordAppraisal(world, {
      stableKey: "query:appraisal:first",
      personId: id,
      eventId: event.id,
      memoryId: null,
      eventKnowledgeId: null,
      appraisedAt: world.currentDate,
      meanings: [
        {
          key: "challenge",
          label: "Challenge",
          valence: "positive",
          intensity: "moderate",
        },
      ],
      interpretation: "A useful challenge.",
      confidence: "medium",
      involvedPersonIds: [id],
      provenance: authored,
      supersedesAppraisalId: null,
    });
    const firstAppraisal = world.history.appraisals.at(-1);
    if (!firstAppraisal) throw new Error("Missing first appraisal.");
    const beforeAppraisalRevision = world.history.nextSequence;
    world = recordAppraisal(world, {
      stableKey: "query:appraisal:second",
      personId: id,
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
      interpretation: "Later understood as humiliating.",
      confidence: "high",
      involvedPersonIds: [id],
      provenance: authored,
      supersedesAppraisalId: firstAppraisal.id,
    });

    world = recordPerception(world, {
      stableKey: "query:perception:first",
      personId: id,
      perceivedAt: world.currentDate,
      subjectKind: "context:situation",
      subjectKey: "synthetic-criticism",
      subjectEntityId: null,
      assertion: "The criticism may be useful.",
      confidence: "medium",
      sourceCredibility: "unknown",
      source: { kind: "authored", note: "Synthetic first perception." },
      supersedesPerceptionId: null,
    });
    const firstPerception = world.history.perceptions.at(-1);
    if (!firstPerception) throw new Error("Missing first perception.");
    const beforeSecondPerception = world.history.nextSequence;
    world = recordPerception(world, {
      stableKey: "query:perception:second",
      personId: id,
      perceivedAt: world.currentDate,
      subjectKind: "context:situation",
      subjectKey: "synthetic-criticism",
      subjectEntityId: null,
      assertion: "The criticism may also be unfair.",
      confidence: "low",
      sourceCredibility: "unknown",
      source: { kind: "authored", note: "Synthetic contradictory perception." },
      supersedesPerceptionId: null,
    });

    expect(
      latestAppraisal(
        world,
        id,
        event.id,
        cutoff(world.currentDate, beforeAppraisalRevision),
      ),
    ).toEqual(firstAppraisal);
    expect(appraisalHistory(world, id, event.id)).toHaveLength(2);
    expect(
      explicitPerceptionHistory(
        world,
        id,
        cutoff(world.currentDate, beforeSecondPerception),
      ),
    ).toEqual([firstPerception]);
    expect(
      explicitPerceptionsAbout(
        world,
        id,
        "context:situation",
        "synthetic-criticism",
      ),
    ).toHaveLength(2);
  });

  it("uses half-open temporary-state expiry and sequence availability", () => {
    let world = advanceWorld(createDemoWorld("temporary-state-query"), 7);
    const id = personId(world);
    const beforeState = world.history.nextSequence;
    world = recordTemporaryState(world, {
      stableKey: "query:temporary-state",
      personId: id,
      stateKey: "stress",
      label: "Stress",
      recordedAt: makeIsoDate("2026-01-05"),
      startsAt: makeIsoDate("2026-01-05"),
      endsAt: makeIsoDate("2026-01-10"),
      intensity: "moderate",
      decisionTags: ["test"],
      provenance: createMindProvenance("authored", {
        note: "Synthetic temporary-state fixture.",
      }),
    });
    const state = world.history.temporaryStates.at(-1);
    if (!state) throw new Error("Missing temporary state.");
    const afterState = world.history.nextSequence;

    expect(
      activeTemporaryStatesAt(world, id, cutoff("2026-01-05", beforeState)),
    ).toEqual([]);
    expect(
      activeTemporaryStatesAt(world, id, cutoff("2026-01-05", afterState)),
    ).toEqual([state]);
    expect(
      activeTemporaryStatesAt(world, id, cutoff("2026-01-09", afterState)),
    ).toEqual([state]);
    expect(
      activeTemporaryStatesAt(world, id, cutoff("2026-01-10", afterState)),
    ).toEqual([]);
  });

  it("finds durable decision traces only after their append boundary", () => {
    let world = advanceWorld(createDemoWorld("decision-trace-query"), 7);
    const id = personId(world);
    const context = {
      stableKey: "query:decision",
      decisionType: "query-fixture",
      actorPersonId: id,
      cutoff: currentHistoricalCutoff(world),
      subject: {
        kind: "context:situation",
        key: "query-fixture",
        entityId: null,
      },
      options: [
        { key: "act", label: "Act", description: "Take action." },
        { key: "wait", label: "Wait", description: "Wait for now." },
      ],
      constraints: [],
      considerations: [],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    } satisfies DecisionContext;
    const evaluation = evaluateDecision(world, context);
    const beforeTrace = world.history.nextSequence;
    world = recordDurableDecisionTrace(world, evaluation);
    const trace = world.history.decisionTraces.at(-1);
    if (!trace) throw new Error("Missing durable decision trace.");

    expect(
      decisionTraceHistory(world, id, cutoff(world.currentDate, beforeTrace)),
    ).toEqual([]);
    expect(decisionTraceHistory(world, id)).toEqual([trace]);
    expect(decisionTraceForDecision(world, id, evaluation.decisionId)).toEqual(
      trace,
    );
    expect(decisionTraceById(world, trace.id)).toEqual(trace);
  });

  it("does not infer shared work from occupations that begin after the query date", () => {
    let world = createDemoWorld("shared-work-through-date");
    const firstId = personId(world, 2);
    const secondId = personId(world, 3);
    for (const [index, id] of [firstId, secondId].entries()) {
      world = appendPersonFact(world, id, {
        stableKey: `occupation:future-overlap:${index}`,
        kind: "occupation",
        occurredAt: makeIsoDate("2025-01-01"),
        endedAt: makeIsoDate("2025-12-31"),
        jurisdictionId: world.jurisdictionOrder[0] ?? null,
        employer: "Synthetic Future Employer",
        title: "Synthetic role",
        status: "ended",
        subjectIds: [],
        summary: "Synthetic bounded occupation.",
        provenance: { method: "manual", sourceEventId: null, note: "Test." },
      });
    }

    expect(
      didPeoplePreviouslyWorkTogether(
        world,
        firstId,
        secondId,
        makeIsoDate("2024-12-31"),
      ),
    ).toBe(false);
    expect(
      didPeoplePreviouslyWorkTogether(
        world,
        firstId,
        secondId,
        makeIsoDate("2025-06-01"),
      ),
    ).toBe(true);
  });
});
