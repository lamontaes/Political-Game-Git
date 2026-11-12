import { describe, expect, it } from "vitest";
import { CONVERSATION_WORDS } from "../english/conversation-words";

// "Where did you go to school?" offers up to four replies in the stage it is
// asked in, every one a different answer and none an acknowledgment, whether
// the person has graduated or is still enrolled (owner, Nov 10: "So just up
// to 4"). One to four, never the same answer worded twice.
describe("the school question's replies", () => {
  for (const stage of ["graduated", "enrolled"]) {
    it(`has different replies, one to four, once ${stage}`, () => {
      const answers = (
        CONVERSATION_WORDS.subjects.school?.answers ?? []
      ).filter(
        (move) =>
          (move.key === "at" || move.key === "done") &&
          (!move.stages || move.stages.includes(stage)),
      );
      const texts = new Set(answers.map((move) => move.text));
      expect(answers.length, [...texts].join(" | ")).toBeGreaterThanOrEqual(1);
      expect(answers.length, [...texts].join(" | ")).toBeLessThanOrEqual(4);
      expect(texts.size, [...texts].join(" | ")).toBe(answers.length);
    });
  }
});
