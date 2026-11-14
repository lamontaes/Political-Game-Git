/**
 * A business opening and a retirement are told as short stories that open
 * (brief M): the lede, then what the records add (who started the business,
 * what it is and where, how many it took on; the years of work and where the
 * retiree lives), never two sentences in a row opening on the same name, and
 * nothing said twice.
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
    momentKey: "side-body",
    worldSeed: "side-body",
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

const noRepeatedOpeners = (body: readonly string[], name: string) => {
  for (let i = 1; i < body.length; i += 1)
    expect(
      body[i - 1]!.startsWith(name) && body[i]!.startsWith(name),
      body.join(" | "),
    ).toBe(false);
};

describe("a business opening told as a story", () => {
  const facts = {
    subject: "Dalton Inn",
    year: "2025",
    staff: "six",
    owner: "Ruth Dalton",
    industry: "food services and drinking places",
    place: "Williamstown",
  };
  for (const turn of [0, 1, 2, 3])
    it(`owner, what it is, staff: outlet turn ${turn}`, () => {
      const body =
        composeNewsStory(packet(facts), "opening", turn).paragraphs ?? [];
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(body.join(" ")).toContain("Ruth Dalton");
      expect(body.join(" ")).toContain("Williamstown");
      expect(body.join(" ").match(/six/g)?.length ?? 0).toBeLessThanOrEqual(1);
      noRepeatedOpeners(body, "Ruth Dalton");
    });
  it("with only a name it says its lede, never 'is open for business'", () => {
    for (const turn of [0, 1, 2, 3, 4]) {
      const story = composeNewsStory(
        packet({ subject: "Dalton Inn", year: "2025" }),
        "opening",
        turn,
      );
      expect(story.lede).not.toContain("open for business");
    }
  });
});

describe("a retirement told as a story", () => {
  for (const turn of [0, 1, 2, 3]) {
    it(`employer, years and place: outlet turn ${turn}`, () => {
      const body =
        composeNewsStory(
          packet({
            name: "Holly Neal",
            date: "February 1, 2025",
            employer: "Neal's Market",
            years: "forty-eight",
            place: "Williamstown",
          }),
          "retirement",
          turn,
        ).paragraphs ?? [];
      expect(body.length).toBeGreaterThanOrEqual(2);
      expect(body.join(" ")).toContain("Williamstown");
      noRepeatedOpeners(body, "Holly Neal");
    });
  }
  it("years with no employer: the years once after the lede", () => {
    const body =
      composeNewsStory(
        packet({
          name: "David Workman",
          date: "January 1, 2026",
          years: "eleven",
          place: "Williamstown",
        }),
        "retirement",
        0,
      ).paragraphs ?? [];
    expect(body.join(" ")).toContain("eleven years");
  });
});
