import { describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { smallWorld } from "../../tests/fixtures/small-world";
import { campaigns } from "./campaign-queries";
import {
  answerAfterOfficeEndorsementScene,
  afterOfficeEndorsementCandidates,
  decideAfterOfficeEndorsement,
  projectAfterOfficeEndorsementScenes,
  recordAfterOfficeEndorsementRequest,
} from "./after-office-endorsements";
import { recordFavor } from "./favors";
import { recordPublicPosition } from "./politics";
import { lifePlaceStateIdentities } from "./life-places";
import { pickDistinct, SeededRng } from "./rng";
import { recordEventKnowledge, recordRelationshipInteraction } from "./records";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";

const seed = "a117-recorded-standing";
const [place] = pickDistinct(
  new SeededRng(seed),
  lifePlaceStateIdentities(),
  1,
);

function fixture(options: { readonly candidatePositionKnown?: boolean } = {}): {
  world: World;
  campaignId: EntityId;
  candidateId: EntityId;
  formerId: EntityId;
  relationshipEventId: EntityId;
  propositionId: EntityId;
} {
  const candidatePositionKnown = options.candidatePositionKnown !== false;
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
  world = recordWorldEvent(world, {
    stableKey: `${seed}:candidate-position-event`,
    type: "career.endorsement-position",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: candidatePositionKnown
      ? [candidateId, formerId]
      : [candidateId],
    participants: [
      candidateId,
      ...(candidatePositionKnown ? [formerId] : []),
    ].map((personId) => ({
      personId,
      role: personId === candidateId ? "agency:stated" : "presence:witnessed",
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: ["career:public-position"],
    summary: "The candidate stated their position on a public question.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const candidatePositionEventId = world.history.events.at(-1)!.id;
  world = recordPublicPosition(world, {
    stableKey: `${seed}:candidate-position`,
    personId: candidateId,
    propositionId,
    statedAt: world.currentDate,
    stance: "support",
    statement: "Supports the recorded proposition.",
    audience: "public",
    venue: null,
    sourceEventId: candidatePositionEventId,
    supersedesPublicPositionId: null,
  });
  if (candidatePositionKnown) {
    world = recordEventKnowledge(world, {
      stableKey: `${seed}:former-knows-candidate-position`,
      personId: formerId,
      eventId: candidatePositionEventId,
      learnedAt: world.currentDate,
      believedSummary: "The candidate supports the recorded proposition.",
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
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
  it("weighs agreement and relationship without assuming endorsement is repayment", () => {
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

    const controlled = {
      ...world,
      control: { kind: "person" as const, personId: formerId },
    };
    const playerAsk = recordAfterOfficeEndorsementRequest(controlled, {
      stableKey: `${seed}:player-ask`,
      formerOfficialPersonId: formerId,
      candidatePersonId: candidateId,
      campaignId,
    });
    const [scene] = projectAfterOfficeEndorsementScenes(
      playerAsk.world,
      formerId,
    );
    expect(scene).toMatchObject({
      candidatePersonId: candidateId,
      lines: [{ speechAct: "request-endorsement" }],
      replies: [
        { optionKey: "endorse", label: "Endorse" },
        { optionKey: "decline", label: "Decline" },
      ],
      reasons: expect.arrayContaining([
        expect.objectContaining({
          stableKey: expect.stringContaining(`agreement:${propositionId}`),
        }),
      ]),
    });
    const playerDecline = answerAfterOfficeEndorsementScene(playerAsk.world, {
      stableKey: `${seed}:player-decline`,
      formerOfficialPersonId: formerId,
      candidatePersonId: candidateId,
      campaignId,
      requestEventId: playerAsk.requestEventId,
      endorsed: false,
    });
    expect(playerDecline.endorsed).toBe(false);
    expect(playerDecline.returnedFavorId).toBeNull();
    expect(playerDecline.decisionTraceId).toBeNull();
    expect(
      playerDecline.world.history.events.find(
        (row) => row.id === playerDecline.responseEventId,
      )?.visibility,
    ).toBe("private");
    expect(() =>
      answerAfterOfficeEndorsementScene(playerDecline.world, {
        stableKey: `${seed}:duplicate-decline`,
        formerOfficialPersonId: formerId,
        candidatePersonId: candidateId,
        campaignId,
        requestEventId: playerAsk.requestEventId,
        endorsed: false,
      }),
    ).toThrow(/no longer available/i);
    expect(() =>
      answerAfterOfficeEndorsementScene(playerAsk.world, {
        stableKey: `${seed}:wrong-candidate`,
        formerOfficialPersonId: formerId,
        candidatePersonId: formerId,
        campaignId,
        requestEventId: playerAsk.requestEventId,
        endorsed: true,
      }),
    ).toThrow(/no longer available/i);

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
    expect(reciprocal.returnedFavorId).toBeNull();
    expect(reciprocal.world.history.favors).toEqual(
      reciprocalWorld.history.favors,
    );

    expect(() =>
      decideAfterOfficeEndorsement(ask.world, {
        stableKey: `${seed}:wrong-request-kind`,
        formerOfficialPersonId: formerId,
        candidatePersonId: candidateId,
        campaignId,
        requestEventId: relationshipEventId,
      }),
    ).toThrow(/active campaign by somebody the former official knows/i);
  });

  it("uses only a candidate position the endorser knows from an accurate record", () => {
    const { world, campaignId, candidateId, formerId, propositionId } = fixture(
      { candidatePositionKnown: false },
    );
    const ask = recordAfterOfficeEndorsementRequest(world, {
      stableKey: `${seed}:unwitnessed-position-ask`,
      formerOfficialPersonId: formerId,
      candidatePersonId: candidateId,
      campaignId,
    });
    const answer = decideAfterOfficeEndorsement(ask.world, {
      stableKey: `${seed}:unwitnessed-position-answer`,
      formerOfficialPersonId: formerId,
      candidatePersonId: candidateId,
      campaignId,
      requestEventId: ask.requestEventId,
    });
    const trace = answer.world.history.decisionTraces.find(
      (row) => row.id === answer.decisionTraceId,
    )!;
    expect(
      trace.context.considerations.some((row) =>
        row.stableKey.includes(`agreement:${propositionId}`),
      ),
    ).toBe(false);
    expect(
      trace.context.considerations.some((row) =>
        row.stableKey.includes("relationship:"),
      ),
    ).toBe(true);
  });
});
