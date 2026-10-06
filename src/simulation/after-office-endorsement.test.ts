import { describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { smallWorld } from "../../tests/fixtures/small-world";
import { campaigns } from "./campaign-queries";
import {
  afterOfficeEndorsementCandidates,
  decideAfterOfficeEndorsement,
  recordAfterOfficeEndorsementRequest,
} from "./after-office-endorsements";
import { recordFavor } from "./favors";
import { recordPublicPosition } from "./politics";
import { lifePlaceStateIdentities } from "./life-places";
import { pickDistinct, SeededRng } from "./rng";
import { recordRelationshipInteraction } from "./records";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";

const seed = "a117-recorded-standing";
const [place] = pickDistinct(
  new SeededRng(seed),
  lifePlaceStateIdentities(),
  1,
);

function fixture(): {
  world: World;
  campaignId: EntityId;
  candidateId: EntityId;
  formerId: EntityId;
  relationshipEventId: EntityId;
  propositionId: EntityId;
} {
  const small = smallWorld({
    place: place!.jurisdictionKey,
    seed,
    people: 8,
    offices: ["governor"],
  });
  let world = fileForOffice(small.world, small.personId);
  const campaign = campaigns(world).find(
    (row) => row.candidatePersonId === small.personId,
  )!;
  const candidateId = campaign.candidatePersonId;
  const formerId = world.personOrder.find((id) => id !== candidateId)!;
  const propositionId = world.policyCatalog.propositionOrder[0]!;
  world = recordPublicPosition(world, {
    stableKey: `${seed}:candidate-position`,
    personId: candidateId,
    propositionId,
    statedAt: world.currentDate,
    stance: "support",
    statement: "Supports the recorded proposition.",
    audience: "public",
    venue: null,
    sourceEventId: null,
    supersedesPublicPositionId: null,
  });
  world = recordPublicPosition(world, {
    stableKey: `${seed}:former-position`,
    personId: formerId,
    propositionId,
    statedAt: world.currentDate,
    stance: "support",
    statement: "Supports the same recorded proposition.",
    audience: "public",
    venue: null,
    sourceEventId: null,
    supersedesPublicPositionId: null,
  });
  world = recordWorldEvent(world, {
    stableKey: `${seed}:relationship-event`,
    type: "career.endorsement-test-relationship",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [candidateId, formerId],
    participants: [candidateId, formerId].map((personId) => ({
      personId,
      role: "presence:participant" as const,
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: ["career:relationship"],
    summary: "They worked together on the campaign.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const relationshipEventId = world.history.events.at(-1)!.id;
  world = recordRelationshipInteraction(world, {
    stableKey: `${seed}:relationship`,
    personIds: [candidateId, formerId],
    eventId: relationshipEventId,
    occurredAt: world.currentDate,
    kind: "support:political-alliance",
    change: "strengthened",
    significance: "major",
    summary: "They worked together successfully.",
    tags: ["campaign"],
  });
  return {
    world,
    campaignId: campaign.id,
    candidateId,
    formerId,
    relationshipEventId,
    propositionId,
  };
}

describe("after-office endorsement asks", () => {
  it("weighs agreement and relationship, and records a favor only in return", () => {
    const {
      world,
      campaignId,
      candidateId,
      formerId,
      relationshipEventId,
      propositionId,
    } = fixture();
    expect(afterOfficeEndorsementCandidates(world, formerId)).toContainEqual(
      expect.objectContaining({ campaignId, candidatePersonId: candidateId }),
    );
    const ask = recordAfterOfficeEndorsementRequest(world, {
      stableKey: `${seed}:ordinary-ask`,
      formerOfficialPersonId: formerId,
      candidatePersonId: candidateId,
      campaignId,
    });
    const ordinary = decideAfterOfficeEndorsement(ask.world, {
      stableKey: `${seed}:ordinary-answer`,
      formerOfficialPersonId: formerId,
      candidatePersonId: candidateId,
      campaignId,
      requestEventId: ask.requestEventId,
    });
    const ordinaryTrace = ordinary.world.history.decisionTraces.find(
      (row) => row.id === ordinary.decisionTraceId,
    )!;
    expect(ordinaryTrace.context.considerations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stableKey: expect.stringContaining(`agreement:${propositionId}`),
        }),
        expect.objectContaining({
          stableKey: expect.stringContaining("relationship:"),
        }),
      ]),
    );
    expect(ordinary.endorsed).toBe(true);
    expect(ordinary.returnedFavorId).toBeNull();

    const reciprocalWorld = recordFavor(world, {
      stableKey: `${seed}:earlier-help`,
      giverPersonId: candidateId,
      receiverPersonId: formerId,
      kind: "political:campaign-help",
      description: "helped with the earlier campaign",
      givenAt: world.currentDate,
      eventId: relationshipEventId,
      subject: { kind: "none" },
      motive: "kindness",
      weight: "moderate",
      audience: "public",
      witnessPersonIds: [formerId],
      inReturnForFavorId: null,
      undertakingId: null,
    });
    const reciprocalAsk = recordAfterOfficeEndorsementRequest(reciprocalWorld, {
      stableKey: `${seed}:reciprocal-ask`,
      formerOfficialPersonId: formerId,
      candidatePersonId: candidateId,
      campaignId,
    });
    const reciprocal = decideAfterOfficeEndorsement(reciprocalAsk.world, {
      stableKey: `${seed}:reciprocal-answer`,
      formerOfficialPersonId: formerId,
      candidatePersonId: candidateId,
      campaignId,
      requestEventId: reciprocalAsk.requestEventId,
    });
    expect(reciprocal.endorsed).toBe(true);
    expect(reciprocal.returnedFavorId).not.toBeNull();
    expect(
      reciprocal.world.history.favors?.find(
        (row) => row.id === reciprocal.returnedFavorId,
      ),
    ).toMatchObject({
      motive: "trade",
      inReturnForFavorId: expect.any(String),
    });
  });
});
