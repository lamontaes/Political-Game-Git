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
});
