/**
 * A relative's death, illness or prison term told at home through the words
 * composer (Words builder W1, Nov 12, 2026): `<kind>-say` from the record it
 * cites, answered back under `<kind>-back` by the reply's move. Each telling
 * names the relative as the player's relative and when; each reply's answer
 * names them the same way, never by first name to the player about their own
 * grandmother (seen in Hysham, Montana: "Let's call Laura together.").
 */
import { describe, expect, it } from "vitest";
import bank from "../../data/english/parts/conversation.json";
import { composeConversationLine } from "../english/conversation-words";
import type { PersonId } from "../core2/types";

const fact = (text: string) => ({ text, sourceRecordIds: ["event:test"] });
const say = (
  subject: string,
  facts: Record<string, ReturnType<typeof fact>>,
  stage = "default",
  moment = "",
) =>
  composeConversationLine({
    seed: "relative-news-talk-words",
    subject,
    speakerId: "person_test" as PersonId,
    traits: {},
    facts,
    stage,
    momentKey: `${subject}:${stage}${moment}`,
  });

describe("the answers that close a death's telling without a promise", () => {
  it("says no 'nobody knows how' line: a recorded cause with no words yet is not unknown", () => {
    const texts = bank.parts.map((part) => part.text);
    expect(texts).not.toContain("I don't know more than that.");
    expect(
      texts.some((text) => text.startsWith("Nobody has told us how")),
    ).toBe(false);
  });
});

describe("how a relative says how someone died, from what the record holds", () => {
  const asked = (facts: Record<string, ReturnType<typeof fact>>) =>
    new Set(
      Array.from(
        { length: 60 },
        (_, at) => say("death-news-back", facts, "ask", `:${at}`)?.text,
      ),
    );
  const yes = fact("yes");
  it("tells a suicide as family words and never the method", () => {
    const told = asked({ "cause-suicide": yes, she: yes });
    expect(told).toContain("She took her own life.");
    expect(told).toContain("She took her own life. None of us knew.");
    for (const text of told) expect(text).not.toMatch(/gun|shot|shoot/i);
  });
  it("tells a shooting as the act, never who or why", () => {
    const told = asked({ "cause-shot": yes, they: yes });
    expect(told).toContain("They were shot.");
    expect(told).toContain("Somebody shot them.");
  });
  it("states an illness the house knew of in family words, only when the player was not told", () => {
    const facts = { "house-illness": yes, he: yes, illness: fact("bad lungs") };
    expect(asked(facts)).toContain("He had bad lungs. I thought you knew.");
    expect(asked({ ...facts, "illness-known": yes })).not.toContain(
      "He had bad lungs. I thought you knew.",
    );
  });
});
