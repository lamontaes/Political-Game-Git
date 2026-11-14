import { describe, expect, it } from "vitest";
import { causeGroupForm, causeGroupName } from "./group-names";
import { allQuestions } from "./policy-names";

describe("cause group names", () => {
  it("names a group from its topic, the same way every time, with no key in it", () => {
    const topic = allQuestions()[0]!;
    const key = `organization:cause-group:person-1:drive-${topic}`;
    const name = causeGroupName(key, topic);
    expect(name).toBeTruthy();
    expect(name).toBe(causeGroupName(key, topic));
    expect(name).not.toMatch(/[:_]/);
    // Cased whole, like any name: every word of the topic but the small ones.
    expect(name).toMatch(/^[A-Z]/);
    for (const word of name!.split(" "))
      if (
        ![
          "a",
          "an",
          "and",
          "for",
          "in",
          "of",
          "on",
          "or",
          "the",
          "to",
        ].includes(word)
      )
        expect(word.charAt(0), name!).toBe(word.charAt(0).toUpperCase());
  });
  it("says nothing for a topic with no name", () => {
    expect(
      causeGroupName("organization:cause-group:x:y", "no-such-topic"),
    ).toBeNull();
  });
  // A founded group's name keeps its capitals and its number (P2, Fruitland,
  // Idaho, Nov 13: "The friends of policing backs Clara Evans").
  it("knows the form a name was made from and the verb it takes", () => {
    expect(causeGroupForm("Friends of policing")).toEqual({ plural: true });
    expect(causeGroupForm("Neighbors Concerned About rental rules")).toEqual({
      plural: true,
    });
    expect(causeGroupForm("Coalition for clean water")).toEqual({
      plural: false,
    });
    expect(causeGroupForm("the Republican Party")).toBeNull();
  });
  // The two sides of one question never share a name, and a name never
  // contradicts its side (Words lead, Nov 14): a group against something is
  // never "Friends of" it or "for" it.
  it("names the two sides of every question apart, each from its own forms", () => {
    let named = 0;
    for (const question of allQuestions()) {
      const forName = causeGroupName(
        `organization:group:town:${question}:for`,
        question,
      );
      const againstName = causeGroupName(
        `organization:group:town:${question}:against`,
        question,
      );
      expect(Boolean(forName), question).toBe(Boolean(againstName));
      if (!forName || !againstName) continue;
      named += 1;
      expect(againstName, question).not.toBe(forName);
      // Take the topic out: what is left is the form.
      const topic = againstName
        .replace(/^Citizens' Council on /, "")
        .replace(/ Watch$/, "");
      const form = againstName.replace(topic, "{topic}");
      expect(form, `${question}: ${againstName}`).toMatch(
        /^(\{topic\} Watch|Citizens' Council on \{topic\})$/,
      );
      expect(form, againstName).not.toMatch(/\bfor\b|Friends of/);
      expect(causeGroupForm(againstName), againstName).toEqual({
        plural: false,
      });
    }
    expect(named).toBeGreaterThan(0);
  });
  // The two sides of one question in a named place and a fixed world (Laurel,
  // Montana 3042700, seed 61920e6d...; the endorsement of Nina Jacobs in
  // src/bench/endorsement-played.test.ts): the id is the played group's.
  it("names the same question from each side with a different name", () => {
    const question =
      "us-policy-positions:justice-public-safety.civilian-oversight-of-police";
    const id = (side: string) =>
      `organization:group:jurisdiction_8eebeac6136504cb:${question}:${side}`;
    expect(causeGroupName(id("against"), question)).toBe("Policing Watch");
    expect(causeGroupName(id("for"), question)).not.toBe("Policing Watch");
    expect(causeGroupName(id("for"), question)).toMatch(
      /^(Citizens for|Neighbors Concerned About|Coalition for|Friends of) /,
    );
  });
});
