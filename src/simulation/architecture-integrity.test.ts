import { describe, expect, it } from "vitest";

import {
  SYNTHETIC_POLICY_IDS,
  appendPersonFact,
  applyNpcPoliticalBeliefFormation,
  assertWorldIntegrity,
  createDemoWorld,
  createFormationContext,
  didPeoplePreviouslyWorkTogether,
  evaluateDecision,
  evaluatePoliticalBeliefFormation,
  hasExperiencedTaggedEvent,
  recordPerception,
  recordPrivateBelief,
  recordRelationshipInteraction,
  recordWorldEvent,
} from "./index";
import type { EntityId, World } from "./types";

function personId(world: World, index: number): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing architecture-audit person ${index}.`);
  return id;
}

describe("open content taxonomies", () => {
  it("accepts semantically namespaced content beyond the design examples", () => {
    let world = createDemoWorld("architecture-open-taxonomies");
    const actorId = personId(world, 4);
    const otherId = personId(world, 5);

    world = appendPersonFact(world, actorId, {
      stableKey: `audit:family:${actorId}:${otherId}:cousin`,
      kind: "family-relationship",
      occurredAt: world.currentDate,
      endedAt: null,
      jurisdictionId: null,
      relatedPersonId: otherId,
      relationship: "extended:cousin",
      summary: "The two people are cousins.",
      provenance: {
        method: "manual",
        sourceEventId: null,
        note: "Architecture audit fixture for an extended family relation.",
      },
    });
    world = recordWorldEvent(world, {
      stableKey: "audit:facilitated-listening-session",
      type: "community.facilitated-listening-session",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [actorId],
      participants: [
        {
          personId: actorId,
          role: "coordination:facilitator",
          detail: "Facilitated rather than merely attending.",
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["community.listening"],
      summary:
        "The actor facilitated a structured neighborhood listening session.",
      context: {
        location: null,
        socialContext: "Residents compared practical concerns.",
        pressure: null,
        choice: "Keep the discussion balanced.",
        motivation: "Understand competing priorities.",
        immediateReaction: "Several residents offered follow-up details.",
      },
    });
    world = recordRelationshipInteraction(world, {
      stableKey: `audit:mentorship:${actorId}:${otherId}`,
      personIds: [actorId, otherId],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "mentorship:strategic-advice",
      change: "strengthened",
      significance: "meaningful",
      summary: "One person offered specific strategic advice to the other.",
      tags: ["relationship.mentorship"],
    });
    world = recordRelationshipInteraction(world, {
      stableKey: `audit:work:${actorId}:${otherId}`,
      personIds: [actorId, otherId],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "work:co-led-project",
      change: "strengthened",
      significance: "meaningful",
      summary: "The pair co-led a short project.",
      tags: [],
    });
    world = recordPerception(world, {
      stableKey: `audit:perception:${actorId}:appointment-process`,
      personId: actorId,
      perceivedAt: world.currentDate,
      subjectKind: "domain:appointment",
      subjectKey: "appointment-process:synthetic",
      subjectEntityId: null,
      assertion:
        "The appointment process may reward preparation over visibility.",
      confidence: "medium",
      sourceCredibility: "unknown",
      source: {
        kind: "authored",
        note: "Architecture audit fixture for an unanticipated domain subject.",
      },
      supersedesPerceptionId: null,
    });
    const appointmentPerception = world.history.perceptions.at(-1);
    if (!appointmentPerception) {
      throw new Error("Missing open-taxonomy perception fixture.");
    }
    world = recordPrivateBelief(world, {
      stableKey: `audit:belief:${actorId}:comparative-review`,
      personId: actorId,
      propositionId: SYNTHETIC_POLICY_IDS.propositions.cleanElectricity,
      formedAt: world.currentDate,
      position: "uncertain",
      conviction: "moderate",
      salience: "low",
      flexibility: "open",
      rationale: "The actor compared several competing accounts.",
      formation: createFormationContext("deliberation:comparative-review"),
      supersedesBeliefId: null,
    });
    world = recordPrivateBelief(world, {
      stableKey: `audit:belief:${actorId}:neighborhood-assembly`,
      personId: actorId,
      propositionId: SYNTHETIC_POLICY_IDS.propositions.concealedCarry,
      formedAt: world.currentDate,
      position: "conflicted",
      conviction: "tentative",
      salience: "moderate",
      flexibility: "open",
      rationale: "A neighborhood assembly raised competing concerns.",
      formation: createFormationContext("cue:community-forum", {
        cue: {
          kind: "community:neighborhood-assembly",
          sourcePersonId: null,
          sourceLabel: "Neighborhood assembly",
        },
      }),
      supersedesBeliefId: null,
    });

    const evaluation = evaluateDecision(world, {
      stableKey: `audit:decision:${actorId}:listen-to-testimony`,
      decisionType: "architecture-audit-choice",
      actorPersonId: actorId,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      subject: {
        kind: "domain:public-consultation",
        key: "consultation:synthetic",
        entityId: null,
      },
      options: [
        {
          key: "listen",
          label: "Listen",
          description: "Consider the testimony.",
        },
        {
          key: "skip",
          label: "Skip",
          description: "Do not consider it now.",
        },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: "constituent-testimony",
          optionKey: "listen",
          sourceType: "domain:constituent-testimony",
          direction: "supports",
          importance: "strong",
          confidence: "medium",
          explanation: "Firsthand testimony is relevant to this consultation.",
          sourceRefs: [
            {
              kind: "perception",
              perceptionId: appointmentPerception.id,
            },
          ],
        },
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "ephemeral",
    });

    expect(evaluation.selectedOptionKey).toBe("listen");
    expect(
      hasExperiencedTaggedEvent(world, actorId, "community.listening"),
    ).toBe(true);
    expect(
      world.people[actorId]?.establishedFacts.some(
        (fact) =>
          fact.kind === "family-relationship" &&
          fact.relationship === "extended:cousin",
      ),
    ).toBe(true);
    expect(world.history.events.at(-1)?.participants[0]?.role).toBe(
      "coordination:facilitator",
    );
    expect(
      world.history.relationshipInteractions.some(
        (interaction) => interaction.kind === "mentorship:strategic-advice",
      ),
    ).toBe(true);
    expect(didPeoplePreviouslyWorkTogether(world, actorId, otherId)).toBe(true);
    expect(world.history.perceptions.at(-1)?.subjectKind).toBe(
      "domain:appointment",
    );
    expect(world.history.privateBeliefs.at(-2)?.formation.reason).toBe(
      "deliberation:comparative-review",
    );
    expect(world.history.privateBeliefs.at(-1)?.formation.cue?.kind).toBe(
      "community:neighborhood-assembly",
    );
    assertWorldIntegrity(world);
  });

  it("rejects unnamespaced subjects and unreferenced non-context sources", () => {
    const world = createDemoWorld("architecture-taxonomy-guardrails");
    const actorId = personId(world, 4);
    const baseContext = {
      stableKey: `audit:decision:${actorId}:taxonomy-guardrails`,
      decisionType: "architecture-audit-choice",
      actorPersonId: actorId,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      options: [
        { key: "act", label: "Act", description: "Act now." },
        { key: "wait", label: "Wait", description: "Wait for now." },
      ],
      constraints: [],
      perceptionIds: [],
      randomness: "none" as const,
      retention: "ephemeral" as const,
    };

    expect(() =>
      evaluateDecision(world, {
        ...baseContext,
        subject: {
          kind: "situation" as "context:situation",
          key: "audit:invalid-subject",
          entityId: null,
        },
        considerations: [],
      }),
    ).toThrow(/recognized semantic namespace/);

    expect(() =>
      evaluateDecision(world, {
        ...baseContext,
        subject: {
          kind: "domain:public-consultation",
          key: "audit:valid-subject",
          entityId: null,
        },
        considerations: [
          {
            stableKey: "unreferenced-domain-source",
            optionKey: "act",
            sourceType: "domain:constituent-testimony",
            direction: "supports",
            importance: "moderate",
            confidence: "medium",
            explanation:
              "A record-backed domain claim cannot omit its provenance.",
            sourceRefs: [],
          },
        ],
      }),
    ).toThrow(/requires a provenance reference/);
  });
});

describe("autonomous belief dimension independence", () => {
  it("forms the same position with independently supplied conviction, salience, and flexibility", () => {
    let world = createDemoWorld("architecture-belief-dimensions");
    const firstId = personId(world, 3);
    const secondId = personId(world, 4);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.defenseReadiness;
    const factor = {
      stableKey: "unanticipated-domain-reason",
      favors: "support" as const,
      sourceType: "context:scenario-premise" as const,
      importance: "decisive" as const,
      confidence: "high" as const,
      explanation: "The explicit audit scenario premise favors support.",
      sourceRefs: [],
    };

    const first = evaluatePoliticalBeliefFormation(world, {
      stableKey: `audit:formation:${firstId}:support`,
      personId: firstId,
      propositionId,
      beliefDimensions: {
        conviction: "strong",
        salience: "low",
        flexibility: "firm",
      },
      factors: [factor],
      randomness: "none",
    });
    world = applyNpcPoliticalBeliefFormation(world, first);

    const second = evaluatePoliticalBeliefFormation(world, {
      stableKey: `audit:formation:${secondId}:support`,
      personId: secondId,
      propositionId,
      beliefDimensions: {
        conviction: "moderate",
        salience: "central",
        flexibility: "open",
      },
      factors: [factor],
      randomness: "none",
    });
    world = applyNpcPoliticalBeliefFormation(world, second);

    const beliefs = world.history.privateBeliefs.filter(
      (belief) =>
        belief.propositionId === propositionId &&
        (belief.personId === firstId || belief.personId === secondId),
    );
    expect(beliefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          personId: firstId,
          position: "support",
          conviction: "strong",
          salience: "low",
          flexibility: "firm",
        }),
        expect.objectContaining({
          personId: secondId,
          position: "support",
          conviction: "moderate",
          salience: "central",
          flexibility: "open",
        }),
      ]),
    );
  });
});
