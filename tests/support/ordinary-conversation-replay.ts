import { createHash } from "node:crypto";
import { canonicalJson, type World } from "../../src/simulation";
import { createNewGameWorld } from "../../src/presentation/new-game";
import {
  householdConversationRoom,
  openOrdinaryLife,
} from "../../src/presentation/ordinary-life";
import {
  commitConversationTurn,
  createConversationSessionDescriptor,
  type ConversationRoomContext,
} from "../../src/presentation/run-b-conversation";
import {
  createHouseholdObligationProgress,
  createRunBConversationProgress,
  type ConversationProgress,
} from "../../src/presentation/run-b-conversation-progress";
import { createRunBFixture } from "../../src/presentation/run-b-fixture";

/** Same replay runs on the pinned pre-integration main and the reconciled head. */
export function ordinaryConversationReplay() {
  function replay(
    initial: World,
    room: ConversationRoomContext,
    initialProgress: ConversationProgress,
    intents: readonly string[],
  ) {
    let world = initial;
    let progress = initialProgress;
    const session = createConversationSessionDescriptor(world, room);
    const turns = intents.map((intent, index) => {
      const result = commitConversationTurn(world, {
        session,
        room,
        progress,
        turnOrdinal: index + 1,
        addressee: room.eligibleAddresseePersonIds[0]!,
        audibility: "normal",
        intent,
      });
      world = result.world;
      progress = result.progress;
      return {
        semantic: result.semantic,
        presentation: result.presentation,
        progress,
      };
    });
    const groups = {
      relationship: world.history.relationshipInteractions.slice(
        initial.history.relationshipInteractions.length,
      ),
      commitment: world.history.lifeCommitments.slice(
        initial.history.lifeCommitments.length,
      ),
      aftermath: world.history.futureDueItems.slice(
        initial.history.futureDueItems.length,
      ),
      landed: world.history.events.slice(initial.history.events.length),
      turns,
    };
    return Object.fromEntries(
      Object.entries(groups).map(([key, records]) => [
        key,
        {
          count: records.length,
          sha256: createHash("sha256")
            .update(canonicalJson(records))
            .digest("hex"),
        },
      ]),
    );
  }
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "pr79-ordinary-baseline",
    givenName: null,
    familyName: null,
  });
  const home = openOrdinaryLife(game.world, game.playerPersonId);
  const room = householdConversationRoom(home, game.playerPersonId)!;
  const office = createRunBFixture();
  return {
    household: replay(home, room, createHouseholdObligationProgress(), [
      "raise-obligation",
      "offer-to-cover",
    ]),
    householdCallback: replay(home, room, createHouseholdObligationProgress(), [
      "raise-obligation",
      "ask-for-time",
    ]),
    office: replay(
      office.world,
      office.roomContext,
      createRunBConversationProgress(),
      ["reassure", "request-commitment"],
    ),
  };
}
