/**
 * A month's police log is a brief whose body grows with how far the month
 * stands over the town's own usual (Words lead, Nov 14): over it, the log
 * says by how much and what rose most; at or under it, it is the lede alone.
 * Each lede is picked by what the record holds, and no two outlets print the
 * same wording while there are wordings enough.
 */
import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "./grounded-english";
import { composeNewsStory } from "./english-newscast";

const packet = (facts: Record<string, string>): GroundedEnglishPacket => {
  const grounded = Object.fromEntries(
    Object.entries(facts).map(([key, text]) => [
      key,
      { text, sourceRecordIds: [`record:${key}`] },
    ]),
  );
  return {
    surface: "dialogue",
    momentKey: "police-log",
    worldSeed: "police-log",
    bankVersion: "words-newscast-v1",
    stage: "adult",
    sourceRecordIds: ["record:story"],
    facts: grounded,
    speaker: { personId: "anchor", traits: {} },
    knowledge: Object.entries(grounded).map(([factKey, fact]) => ({
      personId: "anchor",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  } as unknown as GroundedEnglishPacket;
};

const month = {
  place: "Marlow",
  month: "March",
  number: "nine",
  crimes: "thefts",
  several: "yes",
};

describe("the police log's body slides with the month's distance over usual", () => {
  for (const turn of [0, 1, 2, 3])
    it(`over usual: how much over and what rose most (outlet turn ${turn})`, () => {
      const story = composeNewsStory(
        packet({
          ...month,
          usual: "six",
          extra: "three",
          rising: "burglaries",
        }),
        "police-log",
        turn,
      );
      const body = story.paragraphs ?? [];
      expect(body.length, JSON.stringify(story)).toBeGreaterThanOrEqual(1);
      expect(body.join(" ")).toMatch(/three|six|burglaries/);
    });
  it("at or under usual the log is its lede alone", () => {
    for (const turn of [0, 1, 2, 3]) {
      const story = composeNewsStory(packet(month), "police-log", turn);
      expect(story.paragraphs ?? []).toEqual([]);
      expect(story.lede).toContain("nine");
    }
  });
  it("two outlets over usual do not print the same lede while there are wordings enough", () => {
    const ledes = new Set(
      [0, 1, 2, 3].map(
        (turn) =>
          composeNewsStory(
            packet({ ...month, usual: "six", extra: "three" }),
            "police-log",
            turn,
          ).lede,
      ),
    );
    expect(ledes.size).toBeGreaterThanOrEqual(3);
  });
});
