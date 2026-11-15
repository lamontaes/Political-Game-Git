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
/** Every wording a set of facts can draw, over several moments. */
const tellings = (
  subject: string,
  facts: Record<string, ReturnType<typeof fact>>,
) =>
  new Set(
    Array.from(
      { length: 24 },
      (_, at) => say(subject, facts, "default", `:${at}`)?.text,
    ),
  );
const BASE = {
  relation: fact("your grandmother"),
  name: fact("Laura"),
  when: fact("yesterday"),
};

describe("a relative's news told at home through the composer", () => {
  it("tells a death, an illness and a prison term from their records", () => {
    expect(say("death-news-say", { ...BASE, age: fact("84") })!.text).toContain(
      "84",
    );
    expect(
      say("death-news-say", { ...BASE, age: fact("50"), young: fact("yes") })!
        .text,
    ).toMatch(/only 50|at 50/);
    // A teller with a tie to the relative says it in their own word
    // ("my mother"); the telling that names the illness is among the ones
    // drawn.
    const kin = { kin: fact("my mother") };
    expect(
      [
        ...tellings("illness-news-say", {
          ...BASE,
          ...kin,
          illness: fact("cancer"),
        }),
      ].some((text) => text?.includes("My mother is very sick. It's cancer.")),
    ).toBe(true);
    expect(
      [
        ...tellings("prison-news-say", {
          ...BASE,
          ...kin,
          term: fact("eight months"),
          offense: fact("taking bribes"),
        }),
      ].some((text) => text?.includes("eight months")),
    ).toBe(true);
  });

  it("answers every reply and names the relative as the player's, not by first name", () => {
    for (const [kind, moves] of [
      ["death-news", ["condole", "ask", "okay", "help"]],
      ["illness-news", ["ask", "comfort", "help"]],
      ["prison-news", ["ask", "comfort", "what"]],
    ] as const)
      for (const move of moves) {
        const back = say(`${kind}-back`, { ...BASE, you: fact("Micah") }, move);
        expect(back, `${kind} ${move}`).toBeTruthy();
        expect(back!.text, `${kind} ${move}`).not.toContain("Laura");
      }
  });

  it("answers 'How?' after an illness the player was told of by saying since when, and never that nobody said how", () => {
    const said = new Set<string>();
    for (let at = 0; at < 24; at += 1) {
      const back = say(
        "death-news-back",
        {
          ...BASE,
          you: fact("Micah"),
          he: fact("yes"),
          "illness-known": fact("yes"),
          since: fact("March"),
        },
        "ask",
        `:${at}`,
      );
      expect(back?.text).toBeTruthy();
      expect(back!.text).not.toContain("Nobody has told us");
      expect(back!.text).not.toContain("don't know yet");
      said.add(back!.text);
    }
    expect([...said].some((text) => text.includes("since March"))).toBe(true);
  });

  it("opens a tie telling with no illness name without naming one", () => {
    const opened = tellings("illness-news-say", {
      ...BASE,
      kin: fact("my mother"),
    });
    expect(
      [...opened].some(
        (text) => text?.includes("my mother") && !/cancer/.test(text),
      ),
    ).toBe(true);
  });
});

describe("the answers that close a death's telling without a promise", () => {
  const heard = (
    stage: string,
    facts: Record<string, ReturnType<typeof fact>>,
  ) =>
    new Set(
      Array.from(
        { length: 60 },
        (_, at) => say("death-news-back", facts, stage, `:${at}`)?.text,
      ),
    );
  const KIN = { kin: fact("my father") };
  it("says it hears it from them when they are kin, and only then", () => {
    expect(heard("condole", KIN)).toContain("I wanted you to hear it from me.");
    expect(heard("condole", {})).not.toContain(
      "I wanted you to hear it from me.",
    );
  });
  it("says no 'nobody knows how' line: a recorded cause with no words yet is not unknown", () => {
    const texts = bank.parts.map((part) => part.text);
    expect(texts).not.toContain("I don't know more than that.");
    expect(
      texts.some((text) => text.startsWith("Nobody has told us how")),
    ).toBe(false);
  });
  it("says it was coming only when the illness was known", () => {
    expect(heard("ask", { "illness-known": fact("yes") })).toContain(
      "We knew it was coming. It's still hard.",
    );
    expect(heard("ask", {})).not.toContain(
      "We knew it was coming. It's still hard.",
    );
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
