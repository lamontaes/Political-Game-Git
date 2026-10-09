import { describe, expect, it } from "vitest";

import lieAndTellBank from "../../data/english/parts/lie-and-tell.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { recordWorldEvent, type EntityId, type World } from "../simulation";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import type { PartGradeLedger } from "./english-grades";
import { composeLieAndTell, type LieReply } from "./lie-and-tell-english";

/**
 * The Lie and the tell: the denial and the listener's answer are worded from
 * real speech, the denial only as far as the speaker's own record allows, and
 * the answer as the listener decided it.
 */

const SEED = "lie-and-tell-oct8";
const PLACE = drawRandomPlace(SEED);
const MOVES = new Map(
  (lieAndTellBank as { parts: { key: string; move: string }[] }).parts.map(
    (part) => [`bank:${part.key}`, part.move],
  ),
);
const ANSWERS: readonly LieReply[] = ["accept", "ask", "challenge"];

/** An event the given person took part in, as the fixture's recorded moment. */
function withEvent(
  world: World,
  person: EntityId,
  type: "life.conversation" | "civic.hearing-held",
  role: string,
): { world: World; eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey: `fixture:lie:${type}:${role}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [person],
    participants: [{ personId: person, role, detail: "Took part" }],
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

/** The same world under 60 identities, so the stable picks range over the bank. */
function across(world: World): World[] {
  return Array.from(
    { length: 60 },
    (_, day) => ({ ...world, id: `${world.id}:${day}` }) as World,
  );
}

describe("the Lie and the tell", () => {
  it("words a denial and each answer in every one of the 56 places", () => {
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
      for (const answer of ANSWERS) {
        const told = composeLieAndTell(
          world,
          small.personId,
          listener,
          eventId,
          answer,
        );
        expect(told, `${state.usps} ${answer}`).not.toBeNull();
        expect(MOVES.get(told!.lie.parts[0]!)).toBe("deny");
        expect(told!.lie.text + told!.reply.text).not.toMatch(/[{}]/);
      }
    }
  });

  it("words the answer the listener decided, and changes nothing", () => {
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
    for (const dated of across(world)) {
      const reply = (answer: LieReply) =>
        composeLieAndTell(dated, small.personId, listener, eventId, answer)!
          .reply;
      const accepted = reply("accept");
      expect(MOVES.get(accepted.parts[0]!)).toBe("accept");
      const asked = reply("ask");
      expect(MOVES.get(asked.parts[0]!)).toBe("doubt");
      expect(asked.text).toMatch(/\?$/);
      const challenged = reply("challenge");
      expect(MOVES.get(challenged.parts[0]!)).toBe("doubt");
      expect(challenged.text).toMatch(/[.!]$/);
    }
    expect(JSON.stringify(world)).toBe(before);
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
    for (const dated of across(world)) {
      const told = composeLieAndTell(
        dated,
        small.personId,
        listener!,
        eventId,
        "accept",
      );
      expect(told?.lie.text ?? "").not.toMatch(/^(?:I|No, I)\b/);
    }
  });

  it('says "I never said that." only where the record shows the speaker spoke', () => {
    const small = smallWorld({ place: PLACE.key, seed: SEED });
    const listener = small.world.personOrder.find(
      (id) => id !== small.personId,
    )!;
    const denials = (
      type: "life.conversation" | "civic.hearing-held",
      role: string,
    ): Set<string> => {
      const { world, eventId } = withEvent(
        small.world,
        small.personId,
        type,
        role,
      );
      return new Set(
        across(world).map(
          (dated) =>
            composeLieAndTell(dated, small.personId, listener, eventId, "ask")!
              .lie.text,
        ),
      );
    };
    // Took part without speaking.
    expect(denials("civic.hearing-held", "agency:actor")).not.toContain(
      "I never said that.",
    );
    // Spoke at a hearing, and began a conversation.
    expect(denials("civic.hearing-held", "agency:speaker")).toContain(
      "I never said that.",
    );
    expect(denials("life.conversation", "agency:initiator")).toContain(
      "I never said that.",
    );
  });

  it("gives way to another line when the owner graded one down", () => {
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
    const held = (keys: readonly string[]): PartGradeLedger => ({
      schema: "english-part-grades/1",
      batches: ["batch-test"],
      parts: Object.fromEntries(
        keys.map((key) => [
          key,
          {
            good: 0,
            bad: 1,
            fix: 0,
            sharedGood: 0,
            sharedBad: 0,
            sharedFix: 0,
          },
        ]),
      ),
    });
    for (const answer of ANSWERS) {
      const first = composeLieAndTell(
        world,
        small.personId,
        listener,
        eventId,
        answer,
      )!;
      const again = composeLieAndTell(
        world,
        small.personId,
        listener,
        eventId,
        answer,
        held([first.lie.parts[0]!, first.reply.parts[0]!]),
      )!;
      expect(again.lie.parts, answer).not.toEqual(first.lie.parts);
      expect(again.reply.parts, answer).not.toEqual(first.reply.parts);
    }
  });
});
