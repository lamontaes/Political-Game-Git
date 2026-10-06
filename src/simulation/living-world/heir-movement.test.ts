import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { createStartingPerson } from "../people";
import { recordKinship } from "../life";
import { createOrganization, createOrganizationParticipation } from "../life";
import { favorStandingBetween, recordFavor } from "../favors";
import {
  retireControlledCharacter,
  continueAsRelative,
} from "../people-continuation";
import { recordRelationshipInteraction } from "../records";
import { recordWorldEvent, createWorld } from "../world";
import { movementOf } from "./movements";
import { stepDownFromLeadership } from "./movement-succession";

function fixture() {
  const source = createDemoWorld("b20-heir-movement", { peopleCount: 6 });
  const predecessorId =
    source.control.kind === "person"
      ? source.control.personId
      : source.personOrder[0]!;
  const predecessor = source.people[predecessorId]!;
  const followerId = source.personOrder.find((id) => id !== predecessorId)!;
  const follower = source.people[followerId]!;
  const secondFollowerId = source.personOrder.find(
    (id) => id !== predecessorId && id !== followerId,
  )!;
  const secondFollower = source.people[secondFollowerId]!;
  const successor = createStartingPerson({
    worldId: source.id,
    worldSeed: source.seed,
    currentDate: source.currentDate,
    homeJurisdictionId: predecessor.homeJurisdictionId,
    age: 25,
    birthMonth: 4,
    birthDay: 12,
  });
  let world = createWorld({
    seed: source.seed,
    currentDate: source.currentDate,
    currentMoment: source.currentMoment,
    jurisdictions: Object.values(source.jurisdictions),
    people: [predecessor, follower, secondFollower, successor],
    control: { kind: "person", personId: predecessorId },
  });
  world = recordKinship(world, {
    stableKey: "b20-heir-movement:parent-child",
    personIds: [predecessorId, successor.id],
    establishedAt: world.currentDate,
    kind: "lineal:parent-child",
    provenance: { kind: "authored", note: "Heir succession fixture." },
  });
  world = createOrganization(world, {
    stableKey: "b20-heir-movement:organization",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: "Movement succession fixture." },
    initialProfile: {
      name: "Open Government Movement",
      classification: "membership:movement",
      locationJurisdictionId: predecessor.homeJurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createOrganizationParticipation(world, {
    stableKey: "b20-heir-movement:leader",
    personId: predecessorId,
    organizationId,
    startedAt: world.currentDate,
    kind: "leadership:movement",
    roleKind: "leader:movement",
    context: "Founded and leads the movement.",
    provenance: { kind: "authored", note: "Movement succession fixture." },
  });
  for (const [index, memberId] of [followerId, secondFollowerId].entries()) {
    world = createOrganizationParticipation(world, {
      stableKey: `b20-heir-movement:follower:${index}`,
      personId: memberId,
      organizationId,
      startedAt: world.currentDate,
      kind: "membership:movement",
      roleKind: "member:movement",
      context: "Joined the movement.",
      provenance: {
        kind: "authored",
        note: "Movement succession fixture.",
      },
    });
    world = recordWorldEvent(world, {
      stableKey: `b20-heir-movement:relationship-event:${index}`,
      type: "movement.heir-relationship",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: predecessor.homeJurisdictionId,
      involvedEntityIds: [memberId, successor.id],
      participants: [memberId, successor.id].map((personId) => ({
        personId,
        role: "presence:participant" as const,
        detail: null,
      })),
      personFactConstraints: [],
      visibility: "public",
      tags: ["movement:test"],
      summary: "The follower worked with the successor on the cause.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const sharedEventId = world.history.events.at(-1)!.id;
    world = recordRelationshipInteraction(world, {
      stableKey: `b20-heir-movement:relationship:${index}`,
      personIds: [memberId, successor.id],
      eventId: sharedEventId,
      occurredAt: world.currentDate,
      kind: "support:political-alliance",
      change: "strengthened",
      significance: "major",
      summary: "The follower worked with the successor on the cause.",
      tags: ["movement"],
    });
  }
  world = recordWorldEvent(world, {
    stableKey: "b20-heir-movement:predecessor-favor-event",
    type: "movement.heir-prior-help",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: predecessor.homeJurisdictionId,
    involvedEntityIds: [predecessorId, followerId],
    participants: [predecessorId, followerId].map((personId) => ({
      personId,
      role: "presence:participant" as const,
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: ["movement:test"],
    summary: "The founder helped the movement member.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const favorEventId = world.history.events.at(-1)!.id;
  world = recordRelationshipInteraction(world, {
    stableKey: "b20-heir-movement:predecessor-bond",
    personIds: [predecessorId, followerId],
    eventId: favorEventId,
    occurredAt: world.currentDate,
    kind: "support:movement-founding",
    change: "strengthened",
    significance: "major",
    summary: "The founder and this member built the movement together.",
    tags: ["movement"],
  });
  world = recordFavor(world, {
    stableKey: "b20-heir-movement:prior-favor",
    giverPersonId: predecessorId,
    receiverPersonId: followerId,
    kind: "political:movement-help",
    description: "helped the movement member",
    givenAt: world.currentDate,
    eventId: favorEventId,
    subject: { kind: "none" },
    motive: "shared-belief",
    weight: "great",
    audience: "public",
    witnessPersonIds: [successor.id],
    inReturnForFavorId: null,
    undertakingId: null,
  });
  return {
    world,
    predecessorId,
    followerIds: [followerId, secondFollowerId].sort(),
    successorId: successor.id,
    organizationId,
  };
}

describe("a chosen heir inherits a movement through its existing records", () => {
  it("continues as the child elected by members without copying relationships or favors", () => {
    const { world, predecessorId, followerIds, successorId, organizationId } =
      fixture();
    const retired = retireControlledCharacter(world, predecessorId);
    const elected = stepDownFromLeadership(
      retired,
      organizationId,
      predecessorId,
    );
    const vote = elected.history.decisionTraces.find(
      (row) =>
        row.context.decisionType === "movement.leadership-succession" &&
        row.selectedOptionKey === `candidate:${successorId}`,
    );
    expect(vote).toBeDefined();
    expect(movementOf(elected, successorId)).toMatchObject({
      organizationId,
      members: followerIds,
      following: expect.arrayContaining(followerIds),
    });

    const continued = continueAsRelative(elected, {
      predecessorId,
      successorId,
    });
    expect(continued.control).toEqual({
      kind: "person",
      personId: successorId,
    });
    expect(movementOf(continued, successorId)).toMatchObject({
      organizationId,
      members: followerIds,
      following: expect.arrayContaining(followerIds),
    });
    expect(
      continued.history.relationshipInteractions.slice(
        0,
        elected.history.relationshipInteractions.length,
      ),
    ).toEqual(elected.history.relationshipInteractions);
    const copiedFounderBond = elected.history.relationshipInteractions.find(
      (row) =>
        row.personIds.includes(predecessorId) &&
        row.personIds.includes(followerIds[0]!) &&
        row.kind === "support:movement-founding",
    )!;
    expect(
      continued.history.relationshipInteractions
        .slice(elected.history.relationshipInteractions.length)
        .some(
          (row) =>
            row.personIds.includes(successorId) &&
            row.personIds.includes(followerIds[0]!) &&
            row.kind === copiedFounderBond.kind &&
            row.summary === copiedFounderBond.summary,
        ),
    ).toBe(false);
    expect(continued.history.favors).toEqual(elected.history.favors);
    expect(
      favorStandingBetween(continued, followerIds[0]!, predecessorId),
    ).toEqual(favorStandingBetween(elected, followerIds[0]!, predecessorId));
    expect(
      favorStandingBetween(continued, followerIds[0]!, successorId)
        .receiverDebt,
    ).toBe("none");
  });
});
