import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { createOrganization, createOrganizationParticipation } from "../life";
import type { EntityId, PrivateBeliefRecord } from "../types";
import { movementOf } from "./movements";

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
