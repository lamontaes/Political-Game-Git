import { describe, expect, it } from "vitest";

// Loaded first, the way the game loads it. Importing the conversation engine
// on its own reaches this module halfway through a cycle (the reason
// run-b-conversation.test.ts fails to load on main).
import "./player-conversation";
import {
  assessUndertaking,
  undertakingsHeldBy,
  undertakingsKnownTo,
  type World,
} from "../simulation";
import {
  commitConversationTurn,
  createConversationSessionDescriptor,
  type ConversationAddressee,
  type ConversationIntent,
} from "./run-b-conversation";
import {
  createRunBConversationProgress,
  type RunBConversationProgress,
} from "./run-b-conversation-progress";
import { createRunBFixture } from "./run-b-fixture";

/**
 * What people say they will do in the office conversation becomes their own
 * promise, owed to the player who asked, in the words they used.
 */

function office() {
  const fixture = createRunBFixture();
  const session = createConversationSessionDescriptor(
    fixture.world,
    fixture.roomContext,
  );
  let world: World = fixture.world;
  let progress: RunBConversationProgress = createRunBConversationProgress();
  let turnOrdinal = 1;
  const turn = (
    addressee: ConversationAddressee,
    intent: ConversationIntent,
  ) => {
    const result = commitConversationTurn(world, {
      session,
      room: fixture.roomContext,
      progress,
      turnOrdinal,
      addressee,
      audibility: "normal",
      intent,
    });
    world = result.world;
    progress = result.progress as RunBConversationProgress;
    turnOrdinal += 1;
    return result;
  };
  return {
    fixture,
    turn,
    world: () => world,
    lead: fixture.scenePeople[0].personId,
    verifier: fixture.scenePeople[1].personId,
  };
}

const conversationPromises = (world: World, personId: string) =>
  undertakingsHeldBy(world, personId as never).filter(
    (entry) => entry.source.store === "lifeCommitments",
  );

describe("Promises made in the office conversation", () => {
  it("records the verifier's offer to check as their promise to the player", () => {
    const room = office();
    room.turn("everyone", "listen");
    const offered = room.turn("everyone", "listen");
    expect(offered.semantic.outcome).toBe("bystander-interjected");

    const promised = conversationPromises(room.world(), room.verifier);
    expect(promised).toHaveLength(1);
    expect(promised[0]!.owedToPersonIds).toEqual([room.fixture.playerPersonId]);
    expect(promised[0]!.statement).toBe(
      "Said they would check the third county referral and report back before the briefing.",
    );
    expect(promised[0]!.heardByPersonIds).toContain(room.lead);
    expect(
      undertakingsKnownTo(room.world(), room.fixture.playerPersonId).map(
        (entry) => entry.source,
      ),
    ).toContainEqual(promised[0]!.source);
    // Help has no single record that answers it, so it is not judged.
    expect(assessUndertaking(room.world(), promised[0]!).standing).toBe(
      "outstanding",
    );
  });

  it("does not count saying it again as a second promise", () => {
    const room = office();
    room.turn("everyone", "listen");
    room.turn("everyone", "listen");
    const again = room.turn(room.verifier, "request-commitment");
    expect(again.semantic.outcome).toBe("committed");
    expect(conversationPromises(room.world(), room.verifier)).toHaveLength(1);
  });

  it("records no promise from a lead who only states a condition", () => {
    const room = office();
    const answer = room.turn(room.lead, "request-commitment");
    expect(answer.semantic.outcome).not.toBe("committed");
    expect(conversationPromises(room.world(), room.lead)).toHaveLength(0);
  });
});
