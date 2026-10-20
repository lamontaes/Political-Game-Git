import { describe, expect, it } from "vitest";
import {
  CONVERSATION_BANK,
  MINED_CONVERSATION,
} from "./mined/conversation-bank";

// "Where did you go to school?" has different replies in the stage it is
// asked in, whether the person has graduated or is still enrolled. The owner
// ruled (Oct 6, EN-1 to EN-3) that no text the English engine did not write
// ships, so the two hand-written replies are held (words-authored-parts-
// shippable-sweep) and the replies offered are the mined ones. The owner's
// target of four replies always (Oct 14) needs a fourth the engine writes;
// that is the pool item words-school-answer-fourth-reply.
const MINED_REPLIES = 3;

describe("the school question's replies", () => {
  const authored = new Set(
    CONVERSATION_BANK.parts
      .filter((part) => part.origin === "authored")
      .map((part) => part.text.replace(/\{(\w+)\}/g, "{{$1}}")),
  );
  for (const stage of ["graduated", "enrolled"]) {
    it(`offers the mined replies, and no hand-written one, once ${stage}`, () => {
      const answers = (
        MINED_CONVERSATION.subjects.school?.answers ?? []
      ).filter(
        (move) =>
          (move.key === "at" || move.key === "done") &&
          (!move.stages || move.stages.includes(stage)),
      );
      const texts = [...new Set(answers.map((move) => move.text))];
      expect(texts.length, texts.join(" | ")).toBeGreaterThanOrEqual(
        MINED_REPLIES,
      );
      for (const text of texts)
        expect(
          authored.has(
            text.replace(
              /\{\{([\w-]+)\}\}/g,
              (_m, s: string) => `{{${s.replace(/-/g, "_")}}}`,
            ),
          ),
          `${text} is a hand-written reply`,
        ).toBe(false);
    });
  }
});
