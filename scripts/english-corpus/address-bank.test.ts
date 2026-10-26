import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import { ADDRESS_BANK, ADDRESS_REGISTERS, composeTurn } from "./address-bank";

/**
 * The mined speech bank composed by the English engine's `composeAddress`
 * under each register card: every move is a mined sentence with its slots
 * filled from the facts, and each register opens with its required move.
 */
const facts = Object.fromEntries(
  Object.entries({
    name: "Ruth Alvarez",
    bill: "the Main Street Safety Act",
    place: "Elwood",
    years: "32",
    year: "1989",
    office: "county clerk",
    school: "Elwood High School",
    employer: "Doniphan County Contracting",
    pronoun: "her",
    "pronoun-obj": "her",
    number: "three",
    group: "the Elwood Neighbors Association",
    issue: "the minimum wage",
    goal: "fix the roads",
    did: "voted to raise the fees",
    opponent: "Dale Becker",
    date: "November 2",
  }).map(([key, text]) => [key, { text, sourceRecordIds: [`record:${key}`] }]),
);
const packet = (stage: string): GroundedEnglishPacket =>
  ({
    surface: "dialogue",
    momentKey: "words-address",
    worldSeed: "words-address",
    bankVersion: "words-address-v1",
    stage,
    sourceRecordIds: ["record:speech"],
    facts,
    speaker: { personId: "speaker", traits: {} },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: "speaker",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  }) as unknown as GroundedEnglishPacket;

const patterns = ADDRESS_BANK.parts.map(
  (part) =>
    new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{\w+\}/g, ".+")}$`,
      "i",
    ),
);

describe("the mined speech bank composed by register", () => {
  for (const register of Object.keys(ADDRESS_REGISTERS))
    for (const stage of ["chair-male", "chair-female"])
      it(`composes ${register} (${stage}) from mined sentences`, () => {
        const turn = composeTurn(packet(stage), register);
        expect(turn, register).not.toBeNull();
        for (const move of turn!.moves)
          expect(
            patterns.some((pattern) => pattern.test(move)),
            move,
          ).toBe(true);
        expect(turn!.sourceRecordIds.length).toBeGreaterThan(0);
      });
});
