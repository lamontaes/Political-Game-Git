import { describe, expect, it } from "vitest";

import {
  activeEducationEnrollmentsAt,
  didPeopleShareEducationOrganization,
  householdMembershipsAt,
  peopleInHouseholdAt,
  recordWorldEvent,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { openNextLifeScene } from "./life-scene-flow";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { projectPlayerConversation } from "./player-conversation";
import {
  commitConversationTurn,
  createConversationSessionDescriptor,
} from "./run-b-conversation";
import { schoolConversationRoom } from "./formative-play";
import { createSchoolProjectProgress } from "./run-b-conversation-progress";
import {
  conversationProgressFromHistory,
  recordedConversationIntents,
} from "./conversation-continuity";
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
  if (subject === "school-project-share") {
    const room = schoolConversationRoom(world, personId)!;
    return commitConversationTurn(world, {
      session: createConversationSessionDescriptor(world, room),
      room,
      progress: createSchoolProjectProgress({
        work: "The worksheet in this authored test scenario",
        deadline: "The due date in this authored test scenario",
      }),
      turnOrdinal: 1,
      addressee: choice.addressee ?? room.eligibleAddresseePersonIds[0]!,
      audibility: choice.audibility ?? "normal",
      intent,
    }).world;
  }
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

  it("shows the last exchange in the quiet room a player walks into", () => {
    // No opening scene: the room itself, where a player talks to whoever is
    // standing there. Its turns are tagged with the quiet room, not a scene.
    const game = createNewGameWorld({
      startKind: "custom",
      placeKey: "nebraska",
      startAge: 22,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "pt3-quiet-room",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    } as NewGameSetup);
    const personId = game.playerPersonId;
    const started = openOrdinaryLife(game.world, personId);
    expect(
      projectPlayerConversation(started, personId, "life-talk"),
    ).toBeNull();
    const membership = householdMembershipsAt(started, personId).find(
      (entry) => entry.state.residenceRole === "primary",
    )!;
    const present = peopleInHouseholdAt(started, membership.household.id);
    const jurisdictionId = started.people[personId]!.homeJurisdictionId;
    const world = recordWorldEvent(started, {
      stableKey: "pt3-quiet-home-presence",
      type: "life.scene.opened",
      occurredAt: started.currentDate,
      recordedAt: started.currentDate,
      jurisdictionId,
      involvedEntityIds: present,
      participants: present.map((id) => ({
        personId: id,
        role: "presence:participant",
        detail: "Present in the authored quiet-home test scenario.",
      })),
      personFactConstraints: [],
      visibility: "private",
      tags: [`moment:${JSON.stringify(started.currentMoment)}`],
      summary: "The recorded participants are together at home.",
      context: {
        location: { jurisdictionId, label: "Home", setting: "home" },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const view = projectPlayerConversation(world, personId, "life-talk")!;
    expect(view).not.toBeNull();
    const other = view.addressee as EntityId;
    const after = say(world, personId, "life-talk", "greet", {
      addressee: other,
    });
    const current = currentExchangeTurn(
      conversationExchangeTurns(after, personId, "life-talk", other),
    )!;
    expect(current).not.toBeNull();
    expect(current.playerLine).toBe("You say hello.");
    expect(current.speakerPersonId).toBe(other);
  });

  it("keeps the last turn when the player turns to somebody else, and says who heard it", () => {
    const game = life(
      {
        startAge: 15,
        depth: "play-formative-years",
      },
      "pt3-talk-school",
    );
    const personId = game.personId;
    const classmates = game.world.personOrder.filter(
      (id) =>
        id !== personId &&
        activeEducationEnrollmentsAt(game.world, id).length > 0 &&
        didPeopleShareEducationOrganization(game.world, personId, id),
    );
    const world = recordWorldEvent(game.world, {
      stableKey: "pt3-school-presence",
      type: "life.scene.opened",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId: game.world.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId, ...classmates],
      participants: [personId, ...classmates].map((id) => ({
        personId: id,
        role: "presence:participant",
        detail: "Present in the authored school conversation fixture.",
      })),
      personFactConstraints: [],
      visibility: "private",
      tags: [`moment:${JSON.stringify(game.world.currentMoment)}`],
      summary: "The recorded classmates are together in the school corridor.",
      context: {
        location: {
          jurisdictionId: game.world.people[personId]!.homeJurisdictionId,
          label: "School",
          setting: "school",
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const opening = schoolConversationRoom(world, personId);
    expect(opening).not.toBeNull();
    // Actual school presence does not prove a saved assignment or its deadline.
    expect(
      projectPlayerConversation(world, personId, "school-project-share"),
    ).toBeNull();
    const [first, second] = opening!.eligibleAddresseePersonIds;
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

    // Explicit authored-fixture turns keep their historical vocabulary.
    expect(
      recordedConversationIntents(loud, personId, "school-project-share"),
    ).toEqual(["raise-share"]);
    // Reopening production never supplies a guessed project from those turns.
    expect(
      conversationProgressFromHistory(loud, personId, "school-project-share"),
    ).toBeNull();
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
    expect(serializeWorld(world)).toBe(before);
  });
});
