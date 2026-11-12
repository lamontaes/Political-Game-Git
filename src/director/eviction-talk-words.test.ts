/**
 * An eviction told through the words composer (Words builder W1, Nov 12,
 * 2026): `eviction-say` from the housing engine's case and status, answered
 * back under `eviction-back` by the reply's move. Every way the records can
 * fall (someone the player lives with, a household of their own, someone who
 * lives alone; what was owed or how many months; a relative, a shelter bed or
 * nowhere) has a telling that names the eviction, and every reply has an
 * answer that says what comes next. The answer is composed from the facts
 * the conversation hands it after the telling (`backOmitsTold`): a figure the
 * telling said is never said again (owner, Nov 12: "basically saying the same
 * thing"). Played talks in drawn places: scripts/words/told-talk-proof.ts --kind eviction.
 */
import { describe, expect, it } from "vitest";
import { composeConversationLine } from "../english/conversation-words";
import type { PersonId } from "../core2/types";
import rules from "./data/conversation-rules.json" with { type: "json" };

const fact = (text: string) => ({ text, sourceRecordIds: ["case:test"] });
const OWED = "about $1,800";
const BEHIND = "about two months";
const say = (
  subject: string,
  facts: Record<string, ReturnType<typeof fact>>,
  stage = "default",
  at = "0",
) =>
  composeConversationLine({
    seed: "eviction-talk-words",
    subject,
    speakerId: "person_test" as PersonId,
    traits: {},
    facts,
    stage,
    momentKey: `${subject}:${stage}:${at}`,
  });

const WHO: Record<string, Record<string, ReturnType<typeof fact>>> = {
  together: { together: fact("yes") },
  family: {},
  alone: { alone: fact("yes") },
};
const WHERE: Record<string, Record<string, ReturnType<typeof fact>>> = {
  relative: { host: fact("my sister") },
  shelter: { "shelter-place": fact("Leoma") },
  nowhere: { "no-bed-place": fact("Leoma") },
};

describe("an eviction told through the composer", () => {
  it("tells it from the case in every household, naming when and what was owed or how long", () => {
    for (const [who, people] of Object.entries(WHO))
      for (const figure of [{ owed: fact(OWED) }, { behind: fact(BEHIND) }]) {
        const line = say("eviction-say", {
          when: fact("yesterday"),
          ...people,
          ...figure,
        });
        expect(line, `${who} ${Object.keys(figure)[0]}`).toBeTruthy();
        expect(line!.text).toContain("yesterday");
      }
  });

  it("answers every reply with what comes next, and never says a figure the telling said", () => {
    expect(rules.dayTalk.backOmitsTold).toContain("eviction");
    for (const [who, people] of Object.entries(WHO))
      for (const [where, place] of Object.entries(WHERE))
        for (const move of ["where", "help", "comfort"]) {
          // The telling said what was owed, so the answer is handed the rest.
          const facts = { when: fact("yesterday"), ...people, ...place };
          const back = say(
            "eviction-back",
            { ...facts, you: fact("Eva") },
            move,
          );
          expect(back, `${who} ${where} ${move}`).toBeTruthy();
          expect(back!.text).not.toContain(OWED);
          expect(back!.text).not.toContain(BEHIND);
        }
  });

  it("answers how it happened only from a job lost before it", () => {
    const facts = {
      when: fact("yesterday"),
      alone: fact("yes"),
      "lost-at": fact("Lopez's Market"),
    };
    expect(say("eviction-back", facts, "ask")!.text).toContain(
      "Lopez's Market",
    );
    expect(
      say(
        "eviction-back",
        { when: fact("yesterday"), alone: fact("yes") },
        "ask",
      ),
    ).toBeNull();
  });
});
