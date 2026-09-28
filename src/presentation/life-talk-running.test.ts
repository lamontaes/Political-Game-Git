import { beforeAll, describe, expect, it } from "vitest";

import type { EntityId, World } from "../simulation";
import { assertWorldIntegrity } from "../simulation";
import type {
  PeopleTrait,
  TraitValue,
} from "../simulation/people-trait-definitions";
import { recordTraitChange } from "../simulation/people-traits";
import { learnedTraits } from "./learned-traits";
import {
  RUNNING_MAX_EXCHANGES,
  RUNNING_MIN_EXCHANGES,
  RUNNING_PREFIX,
} from "./life-talk-running";
import { explicitNewGameSetup } from "./new-game-geography";
import { createOpeningLifeController } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { startPersonalGoal } from "./people-goals";
import { projectPlayerConversation } from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import { DEFAULT_INTERRUPTIONS } from "./shell-navigation";
import { submitTimeCommand } from "./time-command";

/**
 * Telling the person you live with that you are thinking of running.
 *
 * A new adult life in Columbus, Ohio, through the normal setup, with a
 * housemate at home. The player sets the aim of running for office on the
 * goals screen's own writer, then talks through the same projection and
 * commit the conversation screen uses.
 */

const OPEN = `${RUNNING_PREFIX}open`;

interface Life {
  readonly world: World;
  readonly playerId: EntityId;
  readonly housemateId: EntityId;
}

function openLife(): Life {
  const game = createOpeningLifeController(
    explicitNewGameSetup({
      placeKey: "3918000",
      seed: "run-a",
      startAge: 22 as never,
      depth: "summarize-earlier-life",
    }),
  ).finishTransition().game!;
  const playerId = game.playerPersonId;
  const world = openOrdinaryLife(game.world, playerId);
  const view = projectPlayerConversation(world, playerId, "life-talk");
  const housemateId = view?.room.eligibleAddresseePersonIds[0];
  if (!housemateId) throw new Error("Nobody is at home in this life.");
  return { world, playerId, housemateId };
}

function intents(world: World, playerId: EntityId, personId: EntityId) {
  return projectPlayerConversation(world, playerId, "life-talk", {
    addressee: personId,
  })!.intents;
}

function say(
  world: World,
  playerId: EntityId,
  personId: EntityId,
  intent: string,
) {
  const view = projectPlayerConversation(world, playerId, "life-talk", {
    addressee: personId,
  })!;
  expect(view.intents.map((option) => option.key)).toContain(intent);
  const result = commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: personId,
    audibility: view.audibility,
    intent,
  });
  const event = result.world.history.events.at(-1)!;
  expect(event.type).toBe("life.conversation");
  return { world: result.world, reply: event.context.immediateReaction! };
}

function seeking(life: Life): World {
  return startPersonalGoal(life.world, {
    personId: life.playerId,
    family: "seek-office",
    targetEntityId: null,
  });
}

/** Take every topic offered, in order, until the talk offers only leaving. */
function talkItThrough(world: World, life: Life) {
  let next = say(world, life.playerId, life.housemateId, OPEN).world;
  const exchanges: { label: string; reply: string; leaveOffered: boolean }[] =
    [];
  exchanges.push({
    label: OPEN,
    reply: next.history.events.at(-1)!.context.immediateReaction!,
    leaveOffered: false,
  });
  for (;;) {
    const options = intents(next, life.playerId, life.housemateId);
    const leave = options.some((option) => option.key === "leave");
    exchanges[exchanges.length - 1] = {
      ...exchanges[exchanges.length - 1]!,
      leaveOffered: leave,
    };
    const topic = options.find((option) =>
      option.key.startsWith(RUNNING_PREFIX),
    );
    if (!topic) break;
    const said = say(next, life.playerId, life.housemateId, topic.key);
    next = said.world;
    exchanges.push({
      label: topic.label,
      reply: said.reply,
      leaveOffered: false,
    });
  }
  return { world: next, exchanges };
}

describe("Telling someone at home you are thinking of running", () => {
  let life: Life;
  beforeAll(() => {
    life = openLife();
  }, 180_000);

  it("is offered only once the player means to run", () => {
    expect(
      intents(life.world, life.playerId, life.housemateId).map((o) => o.key),
    ).not.toContain(OPEN);
    expect(
      intents(seeking(life), life.playerId, life.housemateId).map((o) => o.key),
    ).toContain(OPEN);
  });

  it("runs three to eight exchanges, each answered, leaving from the third", () => {
    const { world, exchanges } = talkItThrough(seeking(life), life);
    assertWorldIntegrity(world);
    expect(exchanges.length).toBeGreaterThanOrEqual(RUNNING_MIN_EXCHANGES);
    expect(exchanges.length).toBeLessThanOrEqual(RUNNING_MAX_EXCHANGES);
    exchanges.forEach((exchange, index) => {
      expect(exchange.reply.trim().length).toBeGreaterThan(0);
      // Leaving is offered after the third exchange and not before.
      expect(exchange.leaveOffered).toBe(index + 1 >= RUNNING_MIN_EXCHANGES);
    });
    // Every topic is said once.
    const labels = exchanges.map((exchange) => exchange.label);
    expect(new Set(labels).size).toBe(labels.length);
    // Once it is over, only leaving is left, and it is not offered again.
    const after = say(world, life.playerId, life.housemateId, "leave").world;
    expect(
      intents(after, life.playerId, life.housemateId).map((o) => o.key),
    ).not.toContain(OPEN);
  });

  it("never raises a date that has passed as if it were ahead", () => {
    const { world, exchanges } = talkItThrough(seeking(life), life);
    const today = world.currentDate;
    for (const { label } of exchanges) {
      const date = /(\w+ \d{1,2}, \d{4})/.exec(label)?.[1];
      if (!date) continue;
      const iso = new Date(`${date} 12:00 UTC`).toISOString().slice(0, 10);
      if (label.startsWith("Tell them the election")) {
        expect(iso > today).toBe(true);
      }
      if (label.startsWith("Remind them of")) {
        expect(iso < today).toBe(true);
      }
    }
  });

  it("keeps the opening answer as a decision the card can learn from", () => {
    const { world } = talkItThrough(seeking(life), life);
    const decisions = world.history.decisionTraces.filter(
      (trace) =>
        trace.context.actorPersonId === life.housemateId &&
        trace.context.subject.entityId === life.playerId &&
        trace.context.decisionType.startsWith("life-talk.running-"),
    );
    expect(decisions.map((trace) => trace.context.decisionType)).toEqual([
      "life-talk.running-open",
      "life-talk.running-help",
    ]);
    // Whatever temperament decided these answers is now learned; nothing else.
    for (const trait of learnedTraits(world, life.playerId, life.housemateId)) {
      expect(decisions.map((trace) => trace.id)).toContain(
        trait.decisionTraceId,
      );
    }
  });

  it("answers differently for a cautious housemate and one who takes chances", () => {
    // A hello first, so the housemate has an event of their own to cite.
    const greeted = say(
      seeking(life),
      life.playerId,
      life.housemateId,
      "greet",
    ).world;
    const eventId = greeted.history.events.at(-1)!.id;
    const withTemperament = (
      traits: Partial<Record<PeopleTrait, TraitValue>>,
    ) => {
      let world = greeted;
      for (const [trait, value] of Object.entries(traits) as [
        PeopleTrait,
        TraitValue,
      ][])
        world = recordTraitChange(world, {
          personId: life.housemateId,
          trait,
          value,
          eventId,
          reason: "Test temperament for the housemate.",
        });
      return world;
    };
    const even = {
      sociability: 0,
      deliberation: 0,
      reliability: 0,
      conflict: 0,
    } as const;
    const bold = say(
      withTemperament({ ...even, risk: 2 }),
      life.playerId,
      life.housemateId,
      OPEN,
    );
    const cautious = say(
      withTemperament({ ...even, risk: -2 }),
      life.playerId,
      life.housemateId,
      OPEN,
    );
    const chosen = (world: World) =>
      world.history.decisionTraces.at(-1)!.selectedOptionKey;
    expect(chosen(bold.world)).toBe("encourage");
    expect(chosen(cautious.world)).toBe("discourage");
    expect(bold.reply).not.toBe(cautious.reply);
  });

  it("recalls a talk from an earlier day as past, never as ahead", () => {
    const talked = say(
      seeking(life),
      life.playerId,
      life.housemateId,
      "matter",
    ).world;
    const nextDay = submitTimeCommand(talked, {
      requestId: "running-talk:day",
      personId: life.playerId,
      sourceMoment: talked.currentMoment,
      command: { kind: "days", days: 1 },
      interruptions: DEFAULT_INTERRUPTIONS,
    }).world;
    expect(nextDay.currentDate > talked.currentDate).toBe(true);
    const opened = say(nextDay, life.playerId, life.housemateId, OPEN).world;
    const remember = intents(opened, life.playerId, life.housemateId).find(
      (option) => option.key === `${RUNNING_PREFIX}remember`,
    );
    expect(remember?.label).toMatch(
      /^Remind them of [A-Z][a-z]+ \d{1,2}, \d{4}, when you talked about the news: /,
    );
    const said = /of (\w+ \d{1,2}, \d{4}),/.exec(remember!.label)![1]!;
    const iso = new Date(`${said} 12:00 UTC`).toISOString().slice(0, 10);
    expect(iso).toBe(talked.currentDate);
    expect(iso < opened.currentDate).toBe(true);
  });
});
