import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { createOrganization, createOrganizationParticipation } from "../life";
import type { EntityId, PrivateBeliefRecord } from "../types";
import { recordRelationshipInteraction } from "../records";
import { recordPersonDeath } from "../vitality";
import { movementOf } from "./movements";
import { decideSuccession } from "./movement-succession";

describe("movementOf", () => {
  it("derives a movement and its members from active organization records", () => {
    const world = createDemoWorld("b20-movement-reader");
    const [leader, member] = world.personOrder;
    expect(leader).toBeDefined();
    expect(member).toBeDefined();
    const leaderId = leader as EntityId;
    const memberId = member as EntityId;
    let next = createOrganization(world, {
      stableKey: "b20-movement-reader:organization",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Movement reader fixture." },
      initialProfile: {
        name: "Residents for Open Government",
        classification: "membership:movement",
        locationJurisdictionId: null,
      },
    });
    const organizationId = next.history.organizations.at(-1)!.id;
    next = createOrganizationParticipation(next, {
      stableKey: "b20-movement-reader:leader",
      personId: leaderId,
      organizationId,
      startedAt: next.currentDate,
      kind: "membership:movement-leadership",
      roleKind: "leader:movement",
      context: "Leads the movement.",
      provenance: { kind: "authored", note: "Movement reader fixture." },
    });
    next = createOrganizationParticipation(next, {
      stableKey: "b20-movement-reader:member",
      personId: memberId,
      organizationId,
      startedAt: next.currentDate,
      kind: "membership:movement",
      roleKind: "member:movement",
      context: "Belongs to the movement.",
      provenance: { kind: "authored", note: "Movement reader fixture." },
    });

    const movement = movementOf(next, leaderId);

    expect(movement?.organizationId).toBe(organizationId);
    expect(movement?.organization).toEqual(
      next.history.organizations.find((row) => row.id === organizationId),
    );
    expect(movement?.members).toEqual([memberId]);
    expect(movement?.following).toEqual([memberId]);
    expect(movementOf(next, memberId)).toBeNull();
  });

  it("returns a following without an organization when saved belief reasons cite the person", () => {
    const world = createDemoWorld("b20-movement-following-only");
    const [elder, observer] = world.personOrder as [EntityId, EntityId];
    const belief: PrivateBeliefRecord = {
      id: "belief_b20_following_only" as EntityId,
      stableKey: "b20-movement-following-only:belief",
      sequence: world.history.nextSequence,
      personId: observer,
      propositionId: null,
      subject: { kind: "official" as const, personId: elder },
      formedAt: world.currentDate,
      position: "support" as const,
      conviction: "moderate" as const,
      salience: "moderate" as const,
      flexibility: "open" as const,
      rationale: null,
      formation: {
        reason: "cue:person",
        relevantEventIds: [],
        sourceFactIds: [],
        propositionExposureIds: [],
        memoryIds: [],
        eventKnowledgeIds: [],
        claimIds: [],
        relationshipInteractionIds: [],
        subjectKnowledgeIds: [],
        decisionTraceIds: [],
        cue: {
          kind: "person:elder",
          sourcePersonId: elder,
          sourceLabel: "elder",
        },
        evidenceReference: null,
        note: null,
      },
      supersedesBeliefId: null,
    };
    const withBelief = {
      ...world,
      history: {
        ...world.history,
        privateBeliefs: [...world.history.privateBeliefs, belief],
      },
    };

    expect(movementOf(withBelief, elder)).toMatchObject({
      organizationId: null,
      members: [],
      following: [observer],
    });
  });
});

function successionWorld(seed: string) {
  const world = createDemoWorld(seed);
  const adults = world.personOrder.filter(
    (id) => world.people[id]!.birthDate <= world.currentDate,
  );
  const [leaderId, memberId, candidateId, otherCandidateId] = adults as [
    EntityId,
    EntityId,
    EntityId,
    EntityId,
  ];
  let next = createOrganization(world, {
    stableKey: `${seed}:organization`,
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: "Succession test fixture." },
    initialProfile: {
      name: "Open Government Movement",
      classification: "membership:movement",
      locationJurisdictionId: null,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = createOrganizationParticipation(next, {
    stableKey: `${seed}:leader`,
    personId: leaderId,
    organizationId,
    startedAt: next.currentDate,
    kind: "leadership:movement",
    roleKind: "leader:movement",
    context: "Leads the movement.",
    provenance: { kind: "authored", note: "Succession test fixture." },
  });
  for (const [index, personId] of [
    memberId,
    candidateId,
    otherCandidateId,
  ].entries())
    next = createOrganizationParticipation(next, {
      stableKey: `${seed}:member:${index}`,
      personId,
      organizationId,
      startedAt: next.currentDate,
      kind: "membership:movement",
      roleKind: "member:movement",
      context: "Belongs to the movement.",
      provenance: { kind: "authored", note: "Succession test fixture." },
    });
  next = recordRelationshipInteraction(next, {
    stableKey: `${seed}:relationship`,
    personIds: [memberId, candidateId],
    eventId: null,
    occurredAt: next.currentDate,
    kind: "support:campaign",
    change: "strengthened",
    significance: "major",
    summary: "The member and candidate worked on a campaign together.",
    tags: ["campaign-help"],
  });
  next = recordRelationshipInteraction(next, {
    stableKey: `${seed}:second-member-relationship`,
    personIds: [otherCandidateId, candidateId],
    eventId: null,
    occurredAt: next.currentDate,
    kind: "support:campaign",
    change: "strengthened",
    significance: "major",
    summary: "Another member worked with the candidate on a campaign.",
    tags: ["campaign-help"],
  });
  return { world: next, organizationId, leaderId, memberId, candidateId };
}

describe("member-led movement succession", () => {
  it("replays the same successor and preserves an individual recorded vote", () => {
    const fixture = successionWorld("b20-succession-replay");
    const die = () =>
      recordPersonDeath(fixture.world, {
        stableKey: "b20-succession-replay:leader-death",
        personId: fixture.leaderId,
        diedAt: fixture.world.currentDate,
        causeKey: "cause:movement-succession-fixture",
        sourceEntityIds: [fixture.world.id],
        summary: "The movement's leader died in the succession fixture.",
        provenance: {
          kind: "authored",
          note: "Movement succession death fixture.",
        },
      });
    const first = die();
    const replay = die();
    const firstDecision = first.history.events.find((event) =>
      event.stableKey.startsWith("movement-succession:"),
    );
    const replayDecision = replay.history.events.find((event) =>
      event.stableKey.startsWith("movement-succession:"),
    );
    const memberVote = first.history.decisionTraces.find(
      (trace) =>
        trace.context.decisionType === "movement.leadership-succession" &&
        trace.context.actorPersonId === fixture.memberId,
    );

    expect(firstDecision?.tags).toEqual(replayDecision?.tags);
    expect(
      firstDecision?.tags?.find((tag) => tag.startsWith("leader:")),
    ).toMatch(/^leader:person_/);
    expect(memberVote?.selectedOptionKey).toBe(
      `candidate:${fixture.candidateId}`,
    );
    expect(memberVote?.context.randomness).toBe("none");
    expect(
      memberVote?.context.considerations.some((consideration) =>
        consideration.explanation.includes("relationship"),
      ),
    ).toBe(true);
  });

  it("changes the member's consideration when their relationship is strained", () => {
    const fixture = successionWorld("b20-succession-relationship");
    const strained = recordRelationshipInteraction(fixture.world, {
      stableKey: "b20-succession-relationship:later-conflict",
      personIds: [fixture.memberId, fixture.candidateId],
      eventId: null,
      occurredAt: fixture.world.currentDate,
      kind: "conflict:campaign",
      change: "strained",
      significance: "major",
      summary: "The member and candidate disagreed over the campaign.",
      tags: ["campaign-disagreement"],
    });
    const original = decideSuccession(
      fixture.world,
      fixture.organizationId,
      "step-down",
      fixture.leaderId,
    );
    const changed = decideSuccession(
      strained,
      fixture.organizationId,
      "step-down",
      fixture.leaderId,
    );
    const vote = (world: typeof original) =>
      world.history.decisionTraces.find(
        (trace) =>
          trace.context.decisionType === "movement.leadership-succession" &&
          trace.context.actorPersonId === fixture.memberId,
      );
    expect(vote(original)?.selectedOptionKey).toBe(
      `candidate:${fixture.candidateId}`,
    );
    expect(vote(changed)?.selectedOptionKey).not.toBe(
      `candidate:${fixture.candidateId}`,
    );
    expect(vote(changed)?.context.considerations).toContainEqual(
      expect.objectContaining({
        direction: "opposes",
        sourceType: "context:relationship-history",
      }),
    );
  });
});
