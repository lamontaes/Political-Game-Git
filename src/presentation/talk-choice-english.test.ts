import { describe, expect, it } from "vitest";

import talkChoiceBank from "../../data/english/parts/talk-choice.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import type { EntityId, World } from "../simulation";
import { describePersonContext } from "../simulation/person-context";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import type { PartGradeLedger } from "./english-grades";
import { LIFE_TALK_INTENTS } from "./life-conversation";
import { composeTalkChoice } from "./talk-choice-english";

/**
 * A conversation choice is a sentence a real person said, filed under the
 * choice it carries out, never a fixed label (CTO 2:46 p.m. Oct 8).
 */

const PARTS = (
  talkChoiceBank as { parts: { key: string; move: string; text: string }[] }
).parts;
const SEED = "talk-choice-oct8";
const PLACE = drawRandomPlace(SEED);

function at(world: World, minuteOfDay: number): World {
  return {
    ...world,
    currentMoment: { ...world.currentMoment, minuteOfDay },
  };
}

const held = (key: string): PartGradeLedger => ({
  schema: "english-part-grades/1",
  batches: ["batch-test"],
  parts: {
    [key]: {
      good: 0,
      bad: 1,
      fix: 0,
      sharedGood: 0,
      sharedBad: 0,
      sharedFix: 0,
    },
  },
});

describe("conversation choices in the player's own words", () => {
  it("files every mined sentence under a choice the game offers", () => {
    expect(PARTS.length).toBeGreaterThan(0);
    for (const part of PARTS)
      expect(Object.keys(LIFE_TALK_INTENTS), part.key).toContain(part.move);
  });

  it("words a greeting in every one of the 56 places, with no blank left", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const { world, personId } = smallWorld({ place: state.usps, seed: SEED });
      const other = world.personOrder.find((id) => id !== personId)!;
      const line = composeTalkChoice(world, personId, other, "greet");
      expect(line, state.usps).not.toBeNull();
      expect(line!.text, state.usps).toMatch(/^[A-Z][^{}]*[.?!]$/);
      expect(PARTS.map((part) => `bank:${part.key}`)).toContain(line!.parts[0]);
    }
  });

  it("says good morning, afternoon or evening only at that hour, and none late at night", () => {
    const { world, personId } = smallWorld({ place: PLACE.key, seed: SEED });
    const others = world.personOrder.filter((id) => id !== personId);
    const hours: [number, RegExp][] = [
      [9 * 60, /Good (?:afternoon|evening)/],
      [14 * 60, /Good (?:morning|evening)/],
      [19 * 60, /Good (?:morning|afternoon)/],
      [2 * 60, /Good (?:morning|afternoon|evening)/],
      [23 * 60, /Good (?:morning|afternoon|evening)/],
    ];
    for (const [minute, wrong] of hours)
      for (let day = 0; day < 40; day += 1)
        for (const other of others) {
          const dated = {
            ...at(world, minute),
            currentDate: `2026-02-${String((day % 28) + 1).padStart(2, "0")}`,
          } as World;
          const line = composeTalkChoice(dated, personId, other, "greet");
          expect(line?.text ?? "").not.toMatch(wrong);
        }
  });

  it("calls a person by name only when a record says how the player knows them", () => {
    const named = (household: boolean) => {
      const { world, personId } = smallWorld({
        place: PLACE.key,
        seed: SEED,
        household,
      });
      let people = 0;
      let calledByName = 0;
      for (const other of world.personOrder.filter((id) => id !== personId)) {
        const known =
          describePersonContext(world, personId, other)?.relationship != null;
        if (known !== household) continue;
        people += 1;
        for (let day = 1; day <= 28; day += 1) {
          const dated = {
            ...world,
            currentDate: `2026-02-${String(day).padStart(2, "0")}`,
          } as World;
          const text = composeTalkChoice(dated, personId, other, "greet")?.text;
          if (text?.includes(world.people[other]!.givenName)) calledByName += 1;
        }
      }
      return { people, calledByName };
    };
    const strangers = named(false);
    expect(strangers.people).toBeGreaterThan(0);
    expect(strangers.calledByName).toBe(0);
    const household = named(true);
    expect(household.people).toBeGreaterThan(0);
    expect(household.calledByName).toBeGreaterThan(0);
  });

  it("gives way to another sentence when the owner graded one down", () => {
    const { world, personId } = smallWorld({ place: PLACE.key, seed: SEED });
    const other = world.personOrder.find((id) => id !== personId)!;
    for (const choice of ["greet", "explain", "acceptProposal"]) {
      const first = composeTalkChoice(world, personId, other, choice)!;
      const again = composeTalkChoice(
        world,
        personId,
        other,
        choice,
        {},
        held(first.parts[0]!),
      )!;
      expect(again.parts).not.toEqual(first.parts);
    }
  });

  it("fills a topic from the records, and says nothing when there is none", () => {
    const { world, personId } = smallWorld({ place: PLACE.key, seed: SEED });
    const other = world.personOrder.find((id) => id !== personId)! as EntityId;
    const topic = "the new county budget";
    const raised = composeTalkChoice(world, personId, other, "matter", {
      topic,
    });
    expect(raised?.text).toContain(topic);
    expect(composeTalkChoice(world, personId, other, "matter")).toBeNull();
  });
});
