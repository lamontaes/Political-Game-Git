import { describe, expect, it } from "vitest";
import { CONVERSATION_WORDS } from "../english/conversation-words";

// "Where did you go to school?" always has four different replies in the
// stage it is asked in, none of them an acknowledgment, whether the person
// has graduated or is still enrolled.
describe("the school question's replies", () => {
  for (const stage of ["graduated", "enrolled"]) {
    it(`has four different replies once ${stage}`, () => {
      const answers = (
        CONVERSATION_WORDS.subjects.school?.answers ?? []
      ).filter(
        (move) =>
          (move.key === "at" || move.key === "done") &&
          (!move.stages || move.stages.includes(stage)),
      );
      const texts = new Set(answers.map((move) => move.text));
      expect(texts.size, [...texts].join(" | ")).toBeGreaterThanOrEqual(4);
    });
  }
});
