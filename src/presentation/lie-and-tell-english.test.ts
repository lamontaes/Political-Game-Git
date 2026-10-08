import { describe, expect, it } from "vitest";

import lieAndTellBank from "../../data/english/parts/lie-and-tell.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  recordEventKnowledge,
  recordWorldEvent,
  type EntityId,
  type World,
} from "../simulation";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import type { PartGradeLedger } from "./english-grades";
import { composeLieAndTell } from "./lie-and-tell-english";

/**
 * The Lie and the tell: the denial is worded from real speech, and whether the
 * listener believes it comes from what the listener's records say they know,
 * never from chance.
 */

const SEED = "lie-and-tell-oct8";
const PLACE = drawRandomPlace(SEED);
const MOVES = new Map(
  (lieAndTellBank as { parts: { key: string; move: string }[] }).parts.map(
    (part) => [`bank:${part.key}`, part.move],
  ),
);

/** An event the speaker took part in, as the fixture's recorded moment. */
function withEvent(
  world: World,
  speaker: EntityId,
  type: "life.conversation" | "civic.hearing-held",
  role: string,
): { world: World; eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey: `fixture:lie:${type}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [speaker],
    participants: [{ personId: speaker, role, detail: "Took part" }],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fixture:lie"],
    summary: "The fixture moment the speaker will deny.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

function knows(
  world: World,
  listener: EntityId,
  eventId: EntityId,
  confidence: "low" | "medium" | "high",
): World {
  return recordEventKnowledge(world, {
    stableKey: `fixture:lie:knows:${confidence}`,
    personId: listener,
    eventId,
    learnedAt: world.currentDate,
    believedSummary: "The speaker was there.",
    accuracy: "accurate",
    confidence,
    // Read in a public record: the listener need not have been there.
    source: { kind: "public-record", reference: "fixture record" },
  });
}

describe("the Lie and the tell", () => {
  it("words a denial and a reply in every one of the 56 places", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const small = smallWorld({ place: state.usps, seed: SEED });
      const listener = small.world.personOrder.find(
        (id) => id !== small.personId,
      )!;
      const { world, eventId } = withEvent(
        small.world,
        small.personId,
        "life.conversation",
        "agency:initiator",
      );
      const told = composeLieAndTell(world, small.personId, listener, eventId);
      expect(told, state.usps).not.toBeNull();
      expect(MOVES.get(told!.lie.parts[0]!)).toBe("deny");
      expect(MOVES.get(told!.reply.parts[0]!)).toBe("accept");
      expect(told!.believed).toBe(true);
    }
  });

  it("is doubted by a listener who knows what happened, and only then", () => {
    const small = smallWorld({ place: PLACE.key, seed: SEED });
    const listener = small.world.personOrder.find(
      (id) => id !== small.personId,
    )!;
    const { world, eventId } = withEvent(
      small.world,
      small.personId,
      "civic.hearing-held",
      "agency:speaker",
    );
    const before = JSON.stringify(world);
    const unaware = composeLieAndTell(
      world,
      small.personId,
      listener,
      eventId,
    )!;
    expect(JSON.stringify(world)).toBe(before);
    expect(unaware.believed).toBe(true);
    expect(unaware.becauseKnowledgeIds).toEqual([]);

    for (const confidence of ["low", "medium", "high"] as const) {
      const informed = knows(world, listener, eventId, confidence);
      const told = composeLieAndTell(
        informed,
        small.personId,
        listener,
        eventId,
      )!;
      expect(told.believed, confidence).toBe(false);
      expect(MOVES.get(told.reply.parts[0]!)).toBe("doubt");
      expect(told.becauseKnowledgeIds).toEqual([
        informed.history.knowledge.at(-1)!.id,
      ]);
      // An unsure listener asks rather than contradicts.
      if (confidence === "low") expect(told.reply.text).toMatch(/\?$/);
    }
  });

  it("denies in the first person only what the speaker's record shows", () => {
    const small = smallWorld({ place: PLACE.key, seed: SEED });
    const [listener, bystander] = small.world.personOrder.filter(
      (id) => id !== small.personId,
    );
    // The bystander, not the speaker, took part.
    const { world, eventId } = withEvent(
      small.world,
      bystander!,
      "civic.hearing-held",
      "agency:speaker",
    );
    for (let day = 1; day <= 28; day += 1) {
      const dated = {
        ...world,
        id: `${world.id}:${day}`,
      } as World;
      const told = composeLieAndTell(dated, small.personId, listener!, eventId);
      expect(told?.lie.text ?? "").not.toMatch(/^(?:I|No, I)\b/);
    }
  });

  it("gives way to another denial when the owner graded one down", () => {
    const small = smallWorld({ place: PLACE.key, seed: SEED });
    const listener = small.world.personOrder.find(
      (id) => id !== small.personId,
    )!;
    const { world, eventId } = withEvent(
      small.world,
      small.personId,
      "life.conversation",
      "agency:initiator",
    );
    const first = composeLieAndTell(world, small.personId, listener, eventId)!;
    const held: PartGradeLedger = {
      schema: "english-part-grades/1",
      batches: ["batch-test"],
      parts: {
        [first.lie.parts[0]!]: {
          good: 0,
          bad: 1,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    };
    const again = composeLieAndTell(
      world,
      small.personId,
      listener,
      eventId,
      held,
    )!;
    expect(again.lie.parts).not.toEqual(first.lie.parts);
  });
});
