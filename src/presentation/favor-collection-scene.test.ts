import { describe, expect, it } from "vitest";
import {
  assessUndertaking,
  favorAsksOf,
  favorNeed,
  recordFavor,
  recordWorldEvent,
  undertakingsHeldBy,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * Build 22, step 5, in ordinary play: somebody who helped the player and is
 * now out of work calls to ask for help back, and the player's answer is kept.
 */

/** Everybody in town of working age and out of work helped the player once. */
function helpedByTheJobless(seed: string) {
  const life = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
  const player = life.playerPersonId;
  let world: World = life.world;
  const helpers = world.personOrder
    .filter((id) => id !== player && favorNeed(world, id)?.kind === "work")
    .slice(0, 4);
  for (const helper of helpers) {
    world = recordWorldEvent(world, {
      stableKey: `favor-scene:${helper}:help`,
      type: "life.conversation",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [helper, player],
      participants: [
        { personId: helper, role: "focus:subject", detail: "Helped" },
        {
          personId: player,
          role: "presence:participant",
          detail: "Was helped",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["favor-collection-scene-test"],
      summary: "They helped with the move.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    world = recordFavor(world, {
      stableKey: `favor-scene:${helper}:favor`,
      giverPersonId: helper,
      receiverPersonId: player,
      kind: "personal:help",
      description: "helped with the move",
      givenAt: world.currentDate,
      eventId: world.history.events.at(-1)!.id,
      subject: { kind: "none" },
      motive: "trade",
      weight: "moderate",
      audience: "private",
      witnessPersonIds: [],
      inReturnForFavorId: null,
      undertakingId: null,
    });
  }
  return { world, player, helpers };
}

function asked(world: World, player: EntityId): boolean {
  return availablePlayerConversations(world, player).some(
    (entry) =>
      entry.subject === "scene-favor" &&
      !entry.settled &&
      projectPlayerConversation(
        world,
        player,
        "scene-favor",
      )?.topicLabel.endsWith("asks for help"),
  );
}

function passUntilAsked(world: World, player: EntityId): World | null {
  let current = world;
  for (let day = 0; day < 30; day += 1) {
    if (asked(current, player)) return current;
    const next = passOrdinaryDays(current, 1, { stopForTentativeHolds: true });
    if (next === current) return null;
    current = next;
  }
  return asked(current, player) ? current : null;
}

describe("Somebody comes to collect, in ordinary play", () => {
  const setup = helpedByTheJobless("favor-scene-0");
  const { player } = setup;
  const reached = passUntilAsked(setup.world, player);

  it("reaches the player as a call about the help they once gave", () => {
    expect(setup.helpers.length).toBeGreaterThan(0);
    expect(reached, "a helper should come to ask").not.toBeNull();
    const view = projectPlayerConversation(reached!, player, "scene-favor")!;
    expect(view.briefing).toMatch(
      /helped with the move on .+, and is asking for help with finding work\./,
    );
    expect(view.openingLine).toMatch(/finding work/);
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "say-yes",
      "offer-less",
      "not-now",
      "say-no",
    ]);
  });

  it("keeps a yes as the player's promise to the one who asked", () => {
    const view = projectPlayerConversation(reached!, player, "scene-favor")!;
    const answered = commitConversationTurn(reached!, {
      session: view.session,
      room: view.room,
      progress: view.progress,
      turnOrdinal: view.turnOrdinal,
      addressee: view.addressee,
      audibility: view.audibility,
      intent: "say-yes",
    }).world;
    const ask = favorAsksOf(answered, player).at(-1)!;
    expect(ask.answer).toBe("help");
    const promise = undertakingsHeldBy(answered, player).find(
      (entry) =>
        entry.source.store === "lifeCommitments" &&
        entry.owedToPersonIds.includes(ask.askerPersonId),
    )!;
    expect(promise.statement).toBe("Said they would help with finding work.");
    expect(assessUndertaking(answered, promise).standing).toBe("outstanding");
    const after = projectPlayerConversation(answered, player, "scene-favor")!;
    expect(after.settled).toBe(true);
    expect(after.openingLine).toMatch(/be in touch/);
  });
});
