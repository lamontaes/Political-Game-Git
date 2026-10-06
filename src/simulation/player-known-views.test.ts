import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { pickDistinct, SeededRng } from "./rng";
import { lifePlaceStateIdentities } from "./life-places";
import { statementsHeardByPlayer, officialViewCuesForPresentPeople } from "./player-known-views";
import type { EventKnowledgeRecord, PrivateBeliefRecord } from "./types";

const place = pickDistinct(new SeededRng("b07-player-view-20261006"), lifePlaceStateIdentities(), 1)[0]!;

describe("player known official views", () => {
  it("lists only saved spoken claims delivered through player knowledge", () => {
    const world = smallWorld({ place, seed: "b07-player-view-20261006", people: 4 }).world;
    const [playerId, tellerId, outsiderId] = world.personOrder;
    if (!playerId || !tellerId || !outsiderId) throw new Error("Fixture needs four people.");
    const eventId = "event:known-claim";
    const claim = {
      id: "claim:heard", stableKey: "heard", sequence: world.history.nextSequence,
      speakerPersonId: tellerId, eventId, madeAt: world.currentDate, audience: "limited" as const,
      statement: "She stood with the neighborhood on that vote.", relationshipToTruth: "consistent" as const,
      provenance: { kind: "direct-record" as const },
    };
    const knowledge: EventKnowledgeRecord = {
      id: "knowledge:player", stableKey: "player", sequence: world.history.nextSequence + 1,
      personId: playerId, eventId, learnedAt: world.currentDate, believedSummary: claim.statement,
      accuracy: "accurate", confidence: "high", source: { kind: "told-by", sourcePersonId: tellerId, claimId: claim.id },
    };
    const missingClaim: EventKnowledgeRecord = {
      ...knowledge, id: "knowledge:no-claim", stableKey: "no-claim",
      source: { kind: "told-by", sourcePersonId: tellerId, claimId: null },
    };
    const unrelated: EventKnowledgeRecord = {
      ...knowledge, id: "knowledge:outsider", stableKey: "outsider", personId: outsiderId,
      source: { kind: "told-by", sourcePersonId: outsiderId, claimId: null },
    };
    const changed = {
      ...world,
      history: { ...world.history, claims: [claim], knowledge: [knowledge, missingClaim, unrelated] },
    };
    expect(statementsHeardByPlayer(changed, playerId)).toEqual([expect.objectContaining({
      speakerId: tellerId, statement: claim.statement, saidAt: world.currentDate, learnedAt: world.currentDate,
      claimId: claim.id, knowledgeId: knowledge.id,
    })]);
  });

  it("projects cues only for present people with a saved view of the player", () => {
    const world = smallWorld({ place, seed: "b07-player-view-20261006", people: 3 }).world;
    const [playerId, presentId, noViewId] = world.personOrder;
    if (!playerId || !presentId || !noViewId) throw new Error("Fixture needs three people.");
    const belief: PrivateBeliefRecord = {
      id: "belief:view", stableKey: "view", sequence: world.history.nextSequence,
      personId: presentId, propositionId: null, subject: { kind: "official", personId: playerId },
      formedAt: world.currentDate, position: "support", conviction: "strong", salience: "high",
      flexibility: "negotiable", rationale: null, formation: { reason: "experience:observed", relevantEventIds: [], sourceFactIds: [], propositionExposureIds: [], memoryIds: [], eventKnowledgeIds: [], claimIds: [], relationshipInteractionIds: [], subjectKnowledgeIds: [], decisionTraceIds: [], cue: null, evidenceReference: null, note: null },
      supersedesBeliefId: null,
    };
    const changed = { ...world, history: { ...world.history, privateBeliefs: [belief] } };
    expect(officialViewCuesForPresentPeople(changed, playerId, [presentId, noViewId])).toEqual([
      { personId: presentId, stance: "support" },
    ]);
  });
});
