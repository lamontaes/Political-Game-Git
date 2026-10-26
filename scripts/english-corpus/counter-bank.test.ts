import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import { COUNTER_BANK, composeCounterVisit, type Errand } from "./counter-bank";

/**
 * A visit to the office counter composed from the mined counter bank: every
 * line is a mined sentence with the office's record facts in its slots, and
 * the clerk says a fee, a deadline or another office only from the record.
 */
const packet = (facts: Record<string, string>): GroundedEnglishPacket => {
  const grounded = Object.fromEntries(
    Object.entries(facts).map(([key, text]) => [
      key,
      { text, sourceRecordIds: [`record:${key}`] },
    ]),
  );
  return {
    surface: "dialogue",
    momentKey: "words-counter",
    worldSeed: "words-counter",
    bankVersion: "words-counter-v1",
    stage: "adult",
    sourceRecordIds: ["record:office"],
    facts: grounded,
    speaker: { personId: "clerk", traits: {} },
    knowledge: Object.entries(grounded).map(([factKey, fact]) => ({
      personId: "clerk",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  } as unknown as GroundedEnglishPacket;
};

const patterns = COUNTER_BANK.parts.map(
  (part) =>
    new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{\w+\}/g, ".+")}$`,
      "i",
    ),
);

const visits: [Errand, Record<string, string>][] = [
  ["pay", { fee: "$25", morning: "yes" }],
  ["pay", { "no-fee": "yes" }],
  ["form", {}],
  ["question", { deadline: "June 12" }],
  ["question", { "wrong-office": "yes", body: "the Board of Elections" }],
];

describe("a visit to the counter", () => {
  for (const [errand, facts] of visits)
    it(`words a ${errand} visit (${Object.keys(facts).join(", ") || "no facts"}) from mined sentences`, () => {
      const visit = composeCounterVisit(packet(facts), errand);
      expect(visit).not.toBeNull();
      expect(visit![0]!.speaker).toBe("clerk");
      expect(visit!.some((line) => line.speaker === "visitor")).toBe(true);
      for (const line of visit!) {
        expect(
          patterns.some((pattern) => pattern.test(line.text)),
          line.text,
        ).toBe(true);
        expect(line.text).not.toMatch(/\{/);
      }
      const text = visit!.map((line) => line.text).join(" ");
      if (facts.fee) expect(text).toContain(facts.fee);
      if (facts.body) expect(text).toContain(facts.body);
      if (!facts.morning) expect(text).not.toMatch(/morning/);
    });

  it("can't take a payment without the office's fee record", () => {
    expect(composeCounterVisit(packet({}), "pay")).toBeNull();
  });
});
