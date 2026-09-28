import { beforeAll, describe, expect, it } from "vitest";

import {
  recordRelationshipInteraction,
  type EntityId,
  type World,
} from "../simulation";
import type { PeopleTrait } from "../simulation/people-trait-definitions";
import { personTrait, recordTraitChange } from "../simulation/people-traits";
import type { TraitValue } from "../simulation/people-trait-definitions";
import { explicitNewGameSetup } from "./new-game-geography";
import { createOpeningLifeController } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { projectPlayerConversation } from "./player-conversation";
import {
  evaluateReplyMeaning,
  type ReplyMeanings,
  type ReplyTraitLean,
} from "./reply-meaning";
import { commitConversationTurn } from "./run-b-conversation";
import { conversationStanding } from "./conversation-consequences";
import { DEFAULT_INTERRUPTIONS } from "./shell-navigation";
import { submitTimeCommand } from "./time-command";

/**
 * Personality in everyday replies, through the doorstep conversation an
 * ordinary adult life offers.
 *
 * Each world starts through the normal new-game setup and passes a Day with
 * the Day command. The neighbor is whoever that world put next door; the
 * player asks through the same projection and commit the conversation screen
 * uses. Only the neighbor's recorded temperament, or the recorded history
 * between the two of them, differs between the compared worlds, and each
 * difference is written through the ordinary writers for those records.
 */

const SUBJECT = "neighborhood-meeting-notice" as const;

interface Life {
  readonly world: World;
  readonly playerId: EntityId;
  readonly neighborId: EntityId;
}

function ordinaryAdultLife(placeKey: string, seed: string): Life {
  const game = createOpeningLifeController(
    explicitNewGameSetup({
      placeKey,
      seed,
      startAge: 34 as never,
      depth: "summarize-earlier-life",
    }),
  ).finishTransition().game!;
  const playerId = game.playerPersonId;
  const opened = openOrdinaryLife(game.world, playerId);
  const world = submitTimeCommand(opened, {
    requestId: `${seed}:day`,
    personId: playerId,
    sourceMoment: opened.currentMoment,
    command: { kind: "days", days: 1 },
    interruptions: DEFAULT_INTERRUPTIONS,
  }).world;
  const view = projectPlayerConversation(world, playerId, SUBJECT);
  if (!view) throw new Error("This life offers no doorstep conversation.");
  return {
    world,
    playerId,
    neighborId: view.room.roles["the-other-person"]!,
  };
}

function say(world: World, playerId: EntityId, intent: string) {
  const view = projectPlayerConversation(world, playerId, SUBJECT)!;
  expect(view.intents.map((option) => option.key)).toContain(intent);
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent,
  });
}

/** Mention the notice, then ask the neighbor to come; returns their answer. */
function askNeighborToGo(world: World, playerId: EntityId) {
  const mentioned = say(world, playerId, "mention-meeting");
  const asked = say(mentioned.world, playerId, "ask-them-to-go");
  const decision = asked.world.history.decisionTraces.at(-1)!;
  expect(decision.context.decisionType).toBe(
    "conversation.meeting-attendance-response",
  );
  return {
    outcome: asked.semantic.outcome,
    dialogue: asked.presentation.beat?.dialogue ?? null,
    chosen: decision.selectedOptionKey,
  };
}

/** An event the neighbor was part of, for a temperament record to cite. */
function neighborEvent(world: World, neighborId: EntityId): EntityId {
  const event = world.history.events.find((candidate) =>
    candidate.involvedEntityIds.includes(neighborId),
  );
  if (!event) throw new Error("The neighbor has no recorded event.");
  return event.id;
}

function withTemperament(
  life: Life,
  traits: Partial<Record<PeopleTrait, TraitValue>>,
): World {
  const eventId = neighborEvent(life.world, life.neighborId);
  let world = life.world;
  for (const [trait, value] of Object.entries(traits) as [
    PeopleTrait,
    TraitValue,
  ][]) {
    world = recordTraitChange(world, {
      personId: life.neighborId,
      trait,
      value,
      eventId,
      reason: "Test temperament for the neighbor.",
    });
  }
  return world;
}

/** Everyone balanced on the traits this question reads, then one lean. */
const BALANCED: Partial<Record<PeopleTrait, TraitValue>> = {
  sociability: 0,
  conflict: 0,
  deliberation: 0,
  reliability: 0,
  risk: 0,
};

function withHistory(
  world: World,
  life: Life,
  kind: "support:helped" | "conflict:argument",
  change: "strengthened" | "strained",
): World {
  let next = world;
  for (let index = 0; index < 3; index += 1) {
    next = recordRelationshipInteraction(next, {
      stableKey: `reply-meaning-test:${kind}:${index}`,
      personIds: [life.playerId, life.neighborId],
      eventId: null,
      occurredAt: next.currentDate,
      kind: kind as never,
      change,
      significance: "meaningful",
      summary:
        kind === "support:helped"
          ? "They helped each other out."
          : "They argued and did not settle it.",
      tags: [],
    });
  }
  return next;
}

describe("A neighbor's answer comes from who they are", () => {
  let life: Life;
  beforeAll(() => {
    life = ordinaryAdultLife("3918000", "reply-meaning-temperament");
  }, 120_000);

  it("gives different answers to different temperaments on the same doorstep", () => {
    const outgoing = withTemperament(life, { ...BALANCED, sociability: 2 });
    const withdrawn = withTemperament(life, {
      ...BALANCED,
      sociability: -2,
      conflict: 2,
    });
    const accommodating = withTemperament(life, { ...BALANCED, conflict: -2 });
    const careful = withTemperament(life, { ...BALANCED, deliberation: -2 });

    expect(personTrait(outgoing, life.neighborId, "sociability").value).toBe(2);
    expect(personTrait(withdrawn, life.neighborId, "conflict").value).toBe(2);

    const answers = {
      outgoing: askNeighborToGo(outgoing, life.playerId),
      withdrawn: askNeighborToGo(withdrawn, life.playerId),
      accommodating: askNeighborToGo(accommodating, life.playerId),
      careful: askNeighborToGo(careful, life.playerId),
    };
    expect(answers.outgoing.chosen).toBe("attend-the-meeting");
    expect(answers.outgoing.outcome).toBe("continued");
    expect(answers.withdrawn.chosen).toBe("decline-the-meeting");
    expect(answers.withdrawn.outcome).toBe("boundary-held");
    expect(answers.accommodating.chosen).toBe("suggest-you-go");
    expect(answers.accommodating.outcome).toBe("proposal-countered");
    expect(answers.careful.chosen).toBe("not-sure-yet");
    expect(answers.careful.outcome).toBe("undecided");
    // Four temperaments, four meanings, four different things said.
    expect(new Set(Object.values(answers).map((a) => a.dialogue)).size).toBe(4);
  });

  it("gives different answers to the same temperament with a different history", () => {
    const even = withTemperament(life, BALANCED);
    const helped = withHistory(even, life, "support:helped", "strengthened");
    const quarreled = withHistory(even, life, "conflict:argument", "strained");

    const fromHelp = askNeighborToGo(helped, life.playerId);
    const fromQuarrel = askNeighborToGo(quarreled, life.playerId);
    expect(fromHelp.chosen).toBe("attend-the-meeting");
    expect(fromQuarrel.chosen).toBe("decline-the-meeting");
    expect(fromHelp.dialogue).not.toBe(fromQuarrel.dialogue);
  });
});

describe("Reordering the possible answers does not change what is meant", () => {
  let life: Life;
  beforeAll(() => {
    life = ordinaryAdultLife("3918000", "reply-meaning-order");
  }, 120_000);

  const MEANINGS: ReplyMeanings = {
    agree: { key: "attend-the-meeting", description: "Go to the meeting." },
    decline: { key: "decline-the-meeting", description: "Keep the evening." },
    counter: { key: "suggest-you-go", description: "Suggest they go." },
    undecided: { key: "not-sure-yet", description: "Not decided yet." },
  };
  const LEANS: readonly ReplyTraitLean[] = [
    { meaning: "agree", trait: "sociability", pole: "high", explanation: "a" },
    { meaning: "decline", trait: "sociability", pole: "low", explanation: "b" },
    { meaning: "counter", trait: "conflict", pole: "low", explanation: "c" },
    { meaning: "decline", trait: "conflict", pole: "high", explanation: "d" },
    {
      meaning: "undecided",
      trait: "deliberation",
      pole: "low",
      explanation: "e",
    },
  ];

  function permutations<T>(items: readonly T[]): T[][] {
    if (items.length <= 1) return [[...items]];
    return items.flatMap((item, index) =>
      permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
        (rest) => [item, ...rest],
      ),
    );
  }

  function decide(
    world: World,
    order: readonly (keyof ReplyMeanings)[],
    leans: readonly ReplyTraitLean[],
  ) {
    const meanings = Object.fromEntries(
      order.map((meaning) => [meaning, MEANINGS[meaning]]),
    ) as unknown as ReplyMeanings;
    return evaluateReplyMeaning(world, {
      turnKey: "reply-meaning-order",
      actorPersonId: life.neighborId,
      playerPersonId: life.playerId,
      decisionType: "conversation.meeting-attendance-response",
      subjectKind: "context:neighborhood-conversation",
      subjectKey: "ask-them-to-go:who-gives-the-evening",
      standing: conversationStanding(
        world,
        life.playerId,
        life.neighborId,
        "conversation.subject.neighborhood-meeting",
      ),
      meanings,
      traitLeans: leans,
      playerLeans: [],
    }).meaning;
  }

  it("keeps each temperament's meaning under every order of answers and leans", () => {
    const temperaments: Partial<Record<PeopleTrait, TraitValue>>[] = [
      { ...BALANCED, sociability: 2 },
      { ...BALANCED, sociability: -2, conflict: 2 },
      { ...BALANCED, conflict: -2 },
      { ...BALANCED, deliberation: -2 },
      { ...BALANCED },
    ];
    const orders = permutations([
      "agree",
      "decline",
      "counter",
      "undecided",
    ] as const);
    const seen = new Set<string>();
    for (const temperament of temperaments) {
      const world = withTemperament(life, temperament);
      const reference = decide(
        world,
        ["agree", "decline", "counter", "undecided"],
        LEANS,
      );
      seen.add(reference);
      for (const [index, order] of orders.entries()) {
        const leans = index % 2 === 0 ? LEANS : [...LEANS].reverse();
        expect(decide(world, order, leans)).toBe(reference);
      }
    }
    // The orders were tested against temperaments that mean different things.
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});
