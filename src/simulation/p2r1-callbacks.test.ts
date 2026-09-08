import { describe, expect, it } from "vitest";
import { adultSituationBank } from "./adult-situations";
import {
  LIFE_CALLBACK_TRANSITION_KEY,
  RETURN_SUMMARY,
  lifeCallbackTransitionHandler,
} from "./life-callbacks";
import {
  addDays,
  advanceWorld,
  createFutureTransitionHandlerRegistry,
  assertWorldIntegrity,
  createDemoWorld,
  deserializeWorld,
  recordMemory,
  recordWorldEvent,
  scheduleFutureDueItem,
  serializeWorld,
} from "./index";

// The saved origin is deliberately recorded through the canonical historical
// writer: old saves must remain readable even when new offers are withheld.
function historicalReturn(
  situationKey: string,
  optionKey: string | null,
  oldMemory: string,
) {
  let world = createDemoWorld("p2r1-historical-origin");
  const personId = world.personOrder[0]!; // already has an active commitment
  world = recordWorldEvent(world, {
    stableKey: "p2r1:old-choice",
    type: "life.situation-resolved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Historical player" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      situationKey,
      ...(optionKey
        ? [
            `${situationKey.startsWith("conversation.subject.") ? "conversation.intent" : "choice"}.${optionKey}`,
          ]
        : []),
    ],
    summary: oldMemory,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: optionKey,
      motivation: null,
      immediateReaction: null,
    },
  });
  const origin = world.history.events.at(-1)!;
  world = recordMemory(world, {
    stableKey: "p2r1:old-memory",
    personId,
    eventId: origin.id,
    formedAt: world.currentDate,
    rememberedSummary: oldMemory,
    interpretation: oldMemory,
    strength: "moderate",
    relevanceTags: [situationKey],
    supersedesMemoryId: null,
  });
  const oldMemories = world.history.memories;
  world = scheduleFutureDueItem(world, {
    stableKey: "p2r1:old-return",
    dueAt: addDays(world.currentDate, 1),
    transitionKey: LIFE_CALLBACK_TRANSITION_KEY,
    entityIds: [personId, origin.id].sort(),
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [origin.id] },
  });
  assertWorldIntegrity(world);
  const before = serializeWorld(world);
  const after = advanceWorld(
    world,
    1,
    createFutureTransitionHandlerRegistry([
      [LIFE_CALLBACK_TRANSITION_KEY, lifeCallbackTransitionHandler],
    ]),
  );
  const returnedEvent = after.history.events.find(
    (e) => e.type === "life.earlier-choice-returned",
  );
  const result = {
    world: after,
    status: returnedEvent ? "resolved" : "missing",
    outcomeEventId: returnedEvent?.id,
  };
  expect(serializeWorld(world)).toBe(before);
  expect(result.status).toBe("resolved");
  expect(result.world.history.events.find((e) => e.id === origin.id)).toEqual(
    origin,
  );
  expect(result.world.history.memories.slice(0, oldMemories.length)).toEqual(
    oldMemories,
  );
  assertWorldIntegrity(result.world);
  expect(deserializeWorld(serializeWorld(result.world))).toEqual(result.world);
  const event = result.world.history.events.find(
    (e) => e.id === result.outcomeEventId,
  )!;
  const memory = result.world.history.memories.find(
    (m) => m.eventId === event.id,
  )!;
  expect(memory.rememberedSummary).toBe(event.summary);
  return event.summary;
}

describe("P2R1 every historical originating option, including withheld keys", () => {
  for (const scene of adultSituationBank().filter(
    (s) => RETURN_SUMMARY[s.key],
  )) {
    for (const option of [...scene.options, null]) {
      it(`${scene.key}/${option?.key ?? "missing-option"}: callback adds no unsupported outcome`, () => {
        const text = historicalReturn(
          scene.key,
          option?.key ?? null,
          option?.memory ?? "An old choice with no surviving option detail.",
        );
        expect(text).toBe(RETURN_SUMMARY[scene.key]);
        // Resolution establishes renewed relevance, not payment, gratitude,
        // signatures, successful negotiations, dates or recurrence counts.
        expect(text).not.toMatch(
          /your name on|turned out|third time|a second time|this time|counted|had cost|you took on|you passed on|you settled on|you still owed|you handed over|you agreed to|less room|no room|Saturdays|that Saturday|nobody|everybody|whatever the meeting|from a direction|conversation that was about something else/i,
        );
      });
    }
  }
  // Conversation producers use intent tags rather than adult choice keys.
  // The school key is historical: its current commit contract schedules none.
  for (const [subject, intents] of [
    [
      "household-obligation",
      [
        "raise-obligation",
        "listen",
        "offer-to-cover",
        "ask-to-share",
        "ask-for-time",
      ],
    ],
    [
      "neighborhood-meeting",
      ["mention-meeting", "say-you-will-go", "ask-them-to-go", "listen"],
    ],
    [
      "school-project",
      ["raise-share", "offer-to-do-more", "ask-to-split", "listen"],
    ],
  ] as const) {
    for (const intent of [...intents, null]) {
      it(`conversation ${subject}/${intent ?? "missing-intent"}: preserves a truthful historical return`, () => {
        const tag = `conversation.subject.${subject}`;
        const text = historicalReturn(
          tag,
          intent,
          "A historical conversation choice.",
        );
        expect(text).toBe(RETURN_SUMMARY[tag]);
        expect(text).not.toMatch(
          /you handed over|you agreed to|you would give|counted|warmth|noticed whether|more exactly/i,
        );
      });
    }
  }
  it("a petition refusal never becomes a signature in its callback", () => {
    const scene = adultSituationBank().find(
      (s) => s.key === "adult.petition-ask",
    )!;
    for (const option of scene.options)
      expect(
        historicalReturn(scene.key, option.key, option.memory),
      ).not.toMatch(/your name on|you signed|your signature/i);
  });
});
