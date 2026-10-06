import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  statementsHeardByPlayer,
  officialViewCuesForPresentPeople,
} from "./player-known-views";
import type {
  EntityId,
  EventKnowledgeRecord,
  PrivateBeliefRecord,
} from "./types";

const seed = "b07-player-view-random-new-game";
const place = drawRandomPlace(seed);

function newWorld() {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed,
  });
}

describe("player known official views", () => {
  it("lists only saved spoken claims delivered through player knowledge", () => {
    const game = newWorld();
    const world = game.world;
    const playerId = game.playerPersonId;
    const tellerId = world.personOrder.find((id) => id !== playerId);
    const outsiderId = world.personOrder.find(
      (id) => id !== playerId && id !== tellerId,
    );
    if (!tellerId || !outsiderId)
      throw new Error("Fixture needs three people.");
    const eventId = "event:known-claim" as EntityId;
    const claim = {
      id: "claim:heard" as EntityId,
      stableKey: "heard",
      sequence: world.history.nextSequence,
      speakerPersonId: tellerId,
      eventId,
      madeAt: world.currentDate,
      audience: "limited" as const,
      statement: "She stood with the neighborhood on that vote.",
      relationshipToTruth: "consistent" as const,
      provenance: { kind: "direct-record" as const },
    };
    const knowledge: EventKnowledgeRecord = {
      id: "knowledge:player" as EntityId,
      stableKey: "player",
      sequence: world.history.nextSequence + 1,
      personId: playerId,
      eventId,
      learnedAt: world.currentDate,
      believedSummary: claim.statement,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "told-by", sourcePersonId: tellerId, claimId: claim.id },
    };
    const missingClaim: EventKnowledgeRecord = {
      ...knowledge,
      id: "knowledge:no-claim" as EntityId,
      stableKey: "no-claim",
      source: { kind: "told-by", sourcePersonId: tellerId, claimId: null },
    };
    const unrelated: EventKnowledgeRecord = {
      ...knowledge,
      id: "knowledge:outsider" as EntityId,
      stableKey: "outsider",
      personId: outsiderId,
      source: { kind: "told-by", sourcePersonId: outsiderId, claimId: null },
    };
    const changed = {
      ...world,
      history: {
        ...world.history,
        claims: [claim],
        knowledge: [knowledge, missingClaim, unrelated],
      },
    };
    expect(statementsHeardByPlayer(changed, playerId)).toEqual([
      expect.objectContaining({
        speakerId: tellerId,
        statement: claim.statement,
        saidAt: world.currentDate,
        learnedAt: world.currentDate,
        claimId: claim.id,
        knowledgeId: knowledge.id,
      }),
    ]);
  });

  it("projects cues only for present people with a saved view of the player", () => {
    const game = newWorld();
    const world = game.world;
    const playerId = game.playerPersonId;
    const presentId = world.personOrder.find((id) => id !== playerId);
    const noViewId = world.personOrder.find(
      (id) => id !== playerId && id !== presentId,
    );
    if (!presentId || !noViewId) throw new Error("Fixture needs three people.");
    const belief: PrivateBeliefRecord = {
      id: "belief:view" as EntityId,
      stableKey: "view",
      sequence: world.history.nextSequence - 1,
      personId: presentId,
      propositionId: null,
      subject: { kind: "official", personId: playerId },
      formedAt: world.currentDate,
      position: "support",
      conviction: "strong",
      salience: "high",
      flexibility: "negotiable",
      rationale: null,
      formation: {
        reason: "experience:observed",
        relevantEventIds: [],
        sourceFactIds: [],
        propositionExposureIds: [],
        memoryIds: [],
        eventKnowledgeIds: [],
        claimIds: [],
        relationshipInteractionIds: [],
        subjectKnowledgeIds: [],
        decisionTraceIds: [],
        cue: null,
        evidenceReference: null,
        note: null,
      },
      supersedesBeliefId: null,
    };
    const changed = {
      ...world,
      history: { ...world.history, privateBeliefs: [belief] },
    };
    expect(
      officialViewCuesForPresentPeople(changed, playerId, [
        presentId,
        noViewId,
      ]),
    ).toEqual([{ personId: presentId, stance: "support" }]);
  });
});
