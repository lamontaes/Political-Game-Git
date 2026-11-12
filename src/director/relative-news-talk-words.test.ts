/**
 * A relative's death, illness or prison term told at home through the words
 * composer (Words builder W1, Nov 12, 2026): `<kind>-say` from the record it
 * cites, answered back under `<kind>-back` by the reply's move. Each telling
 * names the relative as the player's relative and when; each reply's answer
 * names them the same way, never by first name to the player about their own
 * grandmother (seen in Hysham, Montana: "Let's call Laura together.").
 */
import { describe, expect, it } from "vitest";
import { composeConversationLine } from "../english/conversation-words";
import type { PersonId } from "../core2/types";

const fact = (text: string) => ({ text, sourceRecordIds: ["event:test"] });
const say = (
  subject: string,
  facts: Record<string, ReturnType<typeof fact>>,
  stage = "default",
) =>
  composeConversationLine({
    seed: "relative-news-talk-words",
    subject,
    speakerId: "person_test" as PersonId,
    traits: {},
    facts,
    stage,
    momentKey: `${subject}:${stage}`,
  });
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
    expect(
      say("illness-news-say", { ...BASE, illness: fact("cancer") })!.text,
    ).toContain("cancer");
    expect(
      say("prison-news-say", {
        ...BASE,
        term: fact("eight months"),
        offense: fact("taking bribes"),
      })!.text,
    ).toContain("eight months");
  });

  it("answers every reply and names the relative as the player's, not by first name", () => {
    for (const [kind, moves] of [
      ["death-news", ["comfort", "help"]],
      ["illness-news", ["ask", "comfort", "help"]],
      ["prison-news", ["ask", "comfort", "help"]],
    ] as const)
      for (const move of moves) {
        const back = say(`${kind}-back`, { ...BASE, you: fact("Micah") }, move);
        expect(back, `${kind} ${move}`).toBeTruthy();
        expect(back!.text, `${kind} ${move}`).not.toContain("Laura");
      }
  });
});
