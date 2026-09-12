import { describe, expect, it } from "vitest";

import { serializeWorld } from "../simulation";
import type { EntityId, World } from "../simulation";
import { openNextLifeScene } from "./life-scene-flow";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { projectPlayerConversation } from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import type { ConversationSubjectKey } from "./run-b-conversation-progress";
import {
  addresseeHeardTurn,
  conversationExchangeTurns,
  conversationHistoryPage,
  currentExchangeTurn,
} from "./scene-conversation";

function life(setup: Partial<NewGameSetup>, seed: string) {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    ...setup,
  } as NewGameSetup);
  const opened = openOrdinaryLife(game.world, game.playerPersonId);
  return {
    world: openNextLifeScene(opened, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

function say(
  world: World,
  personId: EntityId,
  subject: ConversationSubjectKey,
  intent: string,
  choice: {
    addressee?: EntityId | "everyone";
    audibility?: "normal" | "quiet" | "private";
  } = {},
): World {
  const view = projectPlayerConversation(world, personId, subject, choice)!;
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent,
  }).world;
}

describe("PT3 — the scene conversation box reads the record back", () => {
  it("shows the last exchange as what just happened, in the player's voice", () => {
    const { world, personId } = life({}, "pt3-talk-life");
    const view = projectPlayerConversation(world, personId, "life-talk")!;
    const other = view.addressee as EntityId;
    const after = say(world, personId, "life-talk", "greet", {
      addressee: other,
    });
    const turns = conversationExchangeTurns(
      after,
      personId,
      "life-talk",
      other,
    );
    const current = currentExchangeTurn(turns)!;
    expect(current).not.toBeNull();
    expect(current.playerLine).toBe("You say hello.");
    expect(current.speakerPersonId).toBe(other);
    expect(current.reply.length).toBeGreaterThan(0);
  });

  it("reads the household subject's record in the second person", () => {
    const { world, personId } = life({}, "pt3-talk-household");
    const view = projectPlayerConversation(
      world,
      personId,
      "household-obligation",
    )!;
    expect(view).not.toBeNull();
    const after = say(
      world,
      personId,
      "household-obligation",
      "raise-obligation",
    );
    const current = currentExchangeTurn(
      conversationExchangeTurns(
        after,
        personId,
        "household-obligation",
        view.addressee as EntityId,
      ),
    )!;
    expect(current.playerLine).toMatch(/^You brought up the week/);
    expect(current.playerLine).not.toMatch(/The player/);
  });

  it("keeps the last turn when the player turns to somebody else, and says who heard it", () => {
    const { world, personId } = life(
      {
        startAge: 15,
        depth: "play-formative-years",
      },
      "pt3-talk-school",
    );
    const opening = projectPlayerConversation(
      world,
      personId,
      "school-project-share",
    );
    expect(opening).not.toBeNull();
    const [first, second] = opening!.room.eligibleAddresseePersonIds;
    expect(second).toBeDefined();

    // Said normally to the first classmate, in a corridor both are standing in.
    const loud = say(world, personId, "school-project-share", "raise-share", {
      addressee: first!,
    });
    const turn = currentExchangeTurn(
      conversationExchangeTurns(
        loud,
        personId,
        "school-project-share",
        second!,
      ),
    )!;
    // Turning to the second classmate does not restart anything: the turn is
    // still the last thing that happened, and the record says they heard it.
    expect(turn.speakerPersonId).toBe(first);
    expect(addresseeHeardTurn(turn, first!)).toBe("answered");
    expect(addresseeHeardTurn(turn, second!)).toBe("heard");

    // Said quietly, the second classmate is not recorded as hearing it.
    const quiet = say(world, personId, "school-project-share", "raise-share", {
      addressee: first!,
      audibility: "quiet",
    });
    const hushed = currentExchangeTurn(
      conversationExchangeTurns(
        quiet,
        personId,
        "school-project-share",
        second!,
      ),
    )!;
    expect(addresseeHeardTurn(hushed, second!)).toBe("not-heard");

    // And the switched view is the continuing subject, not its opening line.
    const switched = projectPlayerConversation(
      loud,
      personId,
      "school-project-share",
      { addressee: second! },
    )!;
    expect(switched.addressee).toBe(second);
    expect(switched.intents.map((option) => option.key)).not.toContain(
      "raise-share",
    );
  });

  it("offers Listen only while the subject has something pending, and never forever", () => {
    const { world, personId } = life({}, "pt3-talk-listen");
    const view = projectPlayerConversation(
      world,
      personId,
      "household-obligation",
    )!;
    expect(view.intents.map((option) => option.key)).toContain("listen");
    const next = say(world, personId, "household-obligation", "listen");
    // Somebody took the silence and raised it; Listen is no longer an offer.
    const after = projectPlayerConversation(
      next,
      personId,
      "household-obligation",
    )!;
    expect(after.intents.map((option) => option.key)).not.toContain("listen");
    expect(() =>
      say(next, personId, "household-obligation", "listen"),
    ).toThrow();
  });

  it("never offers life-talk a Listen that would only write an empty event", () => {
    const { world, personId } = life({}, "pt3-talk-life");
    const talk = projectPlayerConversation(world, personId, "life-talk")!;
    expect(talk.intents.map((option) => option.key)).not.toContain("listen");
    const next = say(world, personId, "life-talk", "greet");
    expect(
      projectPlayerConversation(next, personId, "life-talk")!.intents.map(
        (option) => option.key,
      ),
    ).not.toContain("listen");
  });

  it("pages earlier turns a fixed number at a time without the current one", () => {
    const { world, personId } = life({}, "pt3-talk-pages");
    const other = projectPlayerConversation(world, personId, "life-talk")!
      .addressee as EntityId;
    let next = world;
    for (const intent of ["greet", "activity", "share", "acknowledge", "leave"])
      next = say(next, personId, "life-talk", intent, { addressee: other });
    const turns = conversationExchangeTurns(next, personId, "life-talk", other);
    expect(turns).toHaveLength(5);
    const newest = conversationHistoryPage(turns, 0);
    expect(newest.count).toBe(2);
    expect(newest.turns.map((turn) => turn.eventId)).toEqual(
      turns.slice(1, 4).map((turn) => turn.eventId),
    );
    const oldest = conversationHistoryPage(turns, 1);
    expect(oldest.turns.map((turn) => turn.eventId)).toEqual([
      turns[0]!.eventId,
    ]);
    // Out-of-range pages are held to the ends rather than going blank.
    expect(conversationHistoryPage(turns, 9).index).toBe(1);
  });

  it("is a pure read", () => {
    const { world, personId } = life({}, "pt3-talk-read");
    const other = projectPlayerConversation(world, personId, "life-talk")!
      .addressee as EntityId;
    const before = serializeWorld(world);
    conversationExchangeTurns(world, personId, "life-talk", other);
    conversationExchangeTurns(world, personId, "household-obligation", other);
    expect(serializeWorld(world)).toBe(before);
  });
});
