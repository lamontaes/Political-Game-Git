import { describe, expect, it } from "vitest";
import { MINED_CONVERSATION } from "./mined/conversation-bank";

// "Where did you go to school?" always has four different replies in the
// stage it is asked in (owner, Oct 14: four replies, always; Oct 15: none is
// an acknowledgment), whether the person has graduated or is still enrolled.
describe("the school question's replies", () => {
  for (const stage of ["graduated", "enrolled"]) {
    it(`has four different replies once ${stage}`, () => {
      const answers = (
        MINED_CONVERSATION.subjects.school?.answers ?? []
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
