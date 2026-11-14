/**
 * A school honor is told as a short story that opens (brief M, owner, Nov 14:
 * "a paragraph or two for some of the smaller stories"): the lede, then the
 * school and grade in one sentence when both are on record, the family when
 * the parents are, and what comes next. Never two sentences in a row that
 * open with the winner's name, and a fact the record lacks is left out.
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
    momentKey: "honor-story",
    worldSeed: "honor-story",
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

const ALL = {
  "bee-local": "yes",
  won: "yes",
  place: "Mapleton",
  name: "Dana Reyes",
  school: "Mapleton Middle School",
  grade: "seventh",
  "a-grade": "a seventh",
  month: "March",
  kin: "daughter",
  parents: "Ana and Luis Reyes",
};

describe("a spelling bee told as a story", () => {
  for (const turn of [0, 1, 2, 3]) {
    it(`a named winner with everything on record, outlet turn ${turn}`, () => {
      const story = composeNewsStory(packet(ALL), "honor", turn);
      const body = story.paragraphs ?? [];
      expect(body.length).toBeGreaterThan(2);
      expect(body.join(" ")).toContain("Mapleton Middle School");
      expect(body.join(" ")).toContain("seventh");
      expect(body.join(" ")).toContain("March");
      expect(body.join(" ")).toContain("Ana and Luis Reyes");
      // No two sentences in a row open with the winner's name.
      for (let i = 1; i < body.length; i += 1)
        expect(
          body[i - 1]!.startsWith("Dana Reyes") &&
            body[i]!.startsWith("Dana Reyes"),
          body.join(" | "),
        ).toBe(false);
      // The school and the grade are one sentence, said once.
      expect(
        body.filter((s) => s.includes("Mapleton Middle School")),
      ).toHaveLength(1);
    });
  }
  it("a counted winner is unnamed: the school and what comes next", () => {
    const { name, grade, kin, parents, ...rest } = ALL;
    void name;
    void grade;
    void kin;
    void parents;
    const body = composeNewsStory(packet(rest), "honor", 0).paragraphs ?? [];
    expect(body.length).toBe(3);
    expect(body.join(" ")).not.toContain("Dana");
  });
  it("a regional bee in the month the paper is printed is said as later this month", () => {
    const { month, ...rest } = ALL;
    void month;
    const body =
      composeNewsStory(
        packet({ ...rest, soon: "later this month" }),
        "honor",
        0,
      ).paragraphs ?? [];
    expect(body.join(" ")).toContain("later this month");
    expect(body.join(" ")).not.toContain("in March");
  });
  it("a record with no school says only the lede", () => {
    const body = composeNewsStory(
      packet({ "bee-local": "yes", won: "yes", place: "Mapleton" }),
      "honor",
      0,
    );
    expect(body.paragraphs).toBeUndefined();
    expect(body.brief).toBe(true);
  });
});
