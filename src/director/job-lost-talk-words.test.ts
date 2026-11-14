/**
 * A lost job told through the words composer (Words builder W1, Nov 12,
 * 2026): `job-lost-say` from the ended job and the search record, answered
 * back under `job-lost-back` by the reply's move. Every way the records can
 * fall (a layoff, the employer closing, no reason on record; years there or
 * not; looking or not) has a telling that names the employer, and every
 * reply has an answer; the answer is composed from the facts the
 * conversation hands it after the telling (`backOmitsTold`), so a figure the
 * telling said (the hourly pay, the years) is never said again. Played talks
 * in drawn places: scripts/words/told-talk-proof.ts --kind job-lost.
 */
import { describe, expect, it } from "vitest";
import { composeConversationLine } from "../english/conversation-words";
import type { PersonId } from "../core2/types";
import rules from "./data/conversation-rules.json" with { type: "json" };

const fact = (text: string) => ({ text, sourceRecordIds: ["job:test"] });
const WAGE = "about $15";
const say = (
  subject: string,
  facts: Record<string, ReturnType<typeof fact>>,
  stage = "default",
) =>
  composeConversationLine({
    seed: "job-lost-talk-words",
    subject,
    speakerId: "person_test" as PersonId,
    traits: {},
    facts,
    stage,
    momentKey: `${subject}:${stage}`,
  });

const REASONS: Record<string, Record<string, ReturnType<typeof fact>>> = {
  layoff: { layoff: fact("yes"), seeking: fact("yes") },
  closure: { closure: fact("yes"), seeking: fact("yes") },
  none: {},
};

describe("a lost job told through the composer", () => {
  it("tells it from the ended job, naming the employer and when", () => {
    for (const [reason, marks] of Object.entries(REASONS))
      for (const years of [{}, { years: fact("12") }]) {
        const line = say("job-lost-say", {
          employer: fact("Lopez's Market"),
          when: fact("last week"),
          ...marks,
          ...years,
        });
        expect(line, reason).toBeTruthy();
        expect(line!.text).toContain("Lopez's Market");
        expect(line!.text).toContain("last week");
      }
  });

  it("answers every reply, and never says a figure the telling said", () => {
    expect(rules.dayTalk.backOmitsTold).toContain("job-lost");
    for (const [reason, marks] of Object.entries(REASONS))
      for (const move of ["ask", "hope", "help", "comfort"]) {
        // The telling said the hourly pay, so the answer is handed the rest.
        const back = say(
          "job-lost-back",
          {
            employer: fact("Lopez's Market"),
            place: fact("Leoma"),
            you: fact("Eva"),
            ...marks,
          },
          move,
        );
        expect(back, `${reason} ${move}`).toBeTruthy();
        expect(back!.text).not.toContain(WAGE);
      }
  });

  it("says how work is in town as a second sentence, by the town's level and never as a rate", () => {
    for (const level of ["bad", "middling", "good"]) {
      const seen = new Set<string>();
      for (let draw = 0; draw < 24; draw += 1) {
        const line = composeConversationLine({
          seed: `job-lost-level-${draw}`,
          subject: "job-lost-say",
          speakerId: `person_test_${draw}` as PersonId,
          traits: {},
          facts: {
            employer: fact("Lopez's Market"),
            when: fact("last week"),
            closure: fact("yes"),
            [`town-${level}`]: fact("yes"),
          },
          stage: "default",
          momentKey: `level:${draw}`,
        });
        expect(line, level).toBeTruthy();
        expect(line!.text).not.toMatch(/\d|percent|rate/i);
        seen.add(line!.text);
      }
      expect(
        [...seen].some((text) => text.split(/(?<=\.)\s/).length > 2),
        `${level}: ${[...seen].join(" // ")}`,
      ).toBe(true);
    }
  });

  it("never pairs a sure opener with scarce work or an unsure one with plentiful work", () => {
    const SURE = /I'll find something\.$/;
    const UNSURE = /I don't know what's next\.|After all that\./;
    let both = 0;
    for (const level of ["bad", "middling", "good"])
      for (const reason of ["closure", "layoff"])
        for (let draw = 0; draw < 60; draw += 1) {
          const line = composeConversationLine({
            seed: `job-lost-fit-${draw}`,
            subject: "job-lost-say",
            speakerId: `person_test_${draw}` as PersonId,
            traits: {},
            facts: {
              employer: fact("Lopez's Market"),
              when: fact("last week"),
              [reason]: fact("yes"),
              [`town-${level}`]: fact("yes"),
            },
            stage: "default",
            momentKey: `fit:${level}:${reason}:${draw}`,
          });
          expect(line, `${level} ${reason}`).toBeTruthy();
          const sentences = line!.text.split(/(?<=[.?])\s+/);
          const opener = sentences.slice(0, 2).join(" ");
          if (sentences.length > 2) both += 1;
          if (level === "bad")
            expect(SURE.test(opener) && sentences.length > 2, line!.text).toBe(
              false,
            );
          if (level === "good")
            expect(
              UNSURE.test(opener) && sentences.length > 2,
              line!.text,
            ).toBe(false);
        }
    expect(both).toBeGreaterThan(0);
  });

  it("takes a second turn after the hope answer, 'Same kind of work' only when the trade is on the record", () => {
    for (const move of ["where", "find"])
      for (const trade of [false, true]) {
        const texts = new Set<string>();
        for (let draw = 0; draw < 24; draw += 1) {
          const back = composeConversationLine({
            seed: `job-lost-turn-${draw}`,
            subject: "job-lost-back-back",
            speakerId: `person_test_${draw}` as PersonId,
            traits: {},
            facts: {
              employer: fact("Lopez's Market"),
              you: fact("Eva"),
              seeking: fact("yes"),
              ...(trade ? { position: fact("a cashier") } : {}),
            },
            stage: move,
            momentKey: `turn:${move}:${draw}`,
          });
          expect(back, `${move} ${trade}`).toBeTruthy();
          texts.add(back!.text);
        }
        expect(
          [...texts].some((text) => /^Same kind of work/.test(text)),
          `${move} ${trade}`,
        ).toBe(move === "where" && trade);
      }
  });
});
