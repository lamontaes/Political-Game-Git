import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import {
  HEADLINES_BANK,
  NEWSCAST_BANK,
  NEWS_BANK,
  STORY_KINDS,
  composeNewsStory,
  type StoryKind,
} from "./newscast-bank";

/**
 * A news story composed from the mined banks: the anchor, the reporter, the
 * headline and the lede are each a mined sentence with the story's record
 * facts in its slots, and an outcome is said only when the record has it.
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
    momentKey: "words-news",
    worldSeed: "words-news",
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
const story = {
  anchor: "Lena Brooks",
  reporter: "Tom Reyes",
  name: "Ruth Alvarez",
  place: "Elwood",
  age: "84",
  count: "5 to 2",
  subject: "Chen's General Store",
  evening: "yes",
};

const patterns = [NEWSCAST_BANK, HEADLINES_BANK, NEWS_BANK].flatMap((bank) =>
  bank.parts.map(
    (part) =>
      new RegExp(
        `^${part.text
          .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
          .replace(/\{\w+\}/g, ".+")}$`,
        "i",
      ),
  ),
);

describe("a news story from the mined banks", () => {
  for (const kind of Object.keys(STORY_KINDS) as StoryKind[])
    it(`words a ${kind} story from mined sentences`, () => {
      const news = composeNewsStory(packet({ ...story, won: "yes" }), kind);
      expect(news.broadcast.length).toBeGreaterThan(2);
      expect(news.broadcast[0]!.speaker).toBe("anchor");
      const lines = [
        ...news.broadcast.map((line) => line.text),
        ...(news.headline ? [news.headline] : []),
        ...(news.lede ? [news.lede] : []),
      ];
      for (const line of lines) {
        expect(
          patterns.some((pattern) => pattern.test(line)),
          line,
        ).toBe(true);
        expect(line).not.toMatch(/\{/);
        expect(line).not.toMatch(/\bmorning\b/i);
      }
      expect(news.sourceRecordIds.length).toBeGreaterThan(0);
    });

  it("says who won only from the record", () => {
    const won = composeNewsStory(packet({ ...story, won: "yes" }), "election");
    const text = [won.lede, ...won.broadcast.map((line) => line.text)].join(
      " ",
    );
    expect(text).not.toMatch(/\blost\b/);
    const lost = composeNewsStory(
      packet({ ...story, lost: "yes" }),
      "election",
    );
    expect(lost.broadcast.map((line) => line.text).join(" ")).not.toMatch(
      /\bwon\b|elected/,
    );
  });
});
