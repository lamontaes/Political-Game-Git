/**
 * A face-to-face talk opens with one greeting (Words lead, Nov 16). A composed
 * greeting is an opener ("Hello.", "Hi.", "Hey.") then a core ("Funny running
 * into you, David."); an opener that is itself a whole greeting ("Good to see
 * you.", "Hello there.", "Hi there.") made two greetings in a row. Pinned to
 * Sheridan WY (5669845), seed 7 (skill pinned-tests).
 */
import { describe, expect, it } from "vitest";
import bank from "../../data/english/parts/conversation.json" with { type: "json" };

const WHOLE_GREETINGS = ["Good to see you.", "Hello there.", "Hi there."];

describe("a talk opens with one greeting", () => {
  it("no piece that is a whole greeting is an opener", () => {
    const parts = (
      bank as unknown as {
        parts: { text: string; uses: { move: string }[] }[];
      }
    ).parts;
    for (const text of WHOLE_GREETINGS)
      for (const part of parts.filter((row) => row.text === text))
        expect(
          part.uses.map((use) => use.move),
          text,
        ).not.toContain("greet-opener");
  });
});
