import { describe, expect, it } from "vitest";
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import openingSpeechBank from "../../data/english/parts/opening-speech.json" with { type: "json" };

/**
 * Two lines that read wrong in the owner's batch 4 (words-trade-refusal-caller-name):
 * a colleague refusing a vote trade said "That's not mine to give." after the
 * player asked for their vote in return, and the address to the Vice President
 * promised a reason ("You'll see why.") no step gives.
 */
type Part = {
  key: string;
  text: string;
  uses: { purpose?: string; step: string; move: string; after?: string }[];
};
const parts = (bank: unknown) => (bank as { parts: Part[] }).parts;

describe("a refused trade answers the trade; the address promises no hidden reason", () => {
  it("no refusal of a trade says it is not theirs to give", () => {
    expect(
      parts(sceneTalkBank).filter((p) => /not mine to give/i.test(p.text)),
    ).toEqual([]);
  });

  it("the refusal after a bargain names the bill the trade was about", () => {
    const refusal = parts(sceneTalkBank).find(
      (p) =>
        p.key ===
        "scene-talk.follow-refuse.i-don-t-trade-votes-not-on-bill-and-not-on-anything-else",
    );
    expect(refusal?.text).toMatch(/\{bill\}/);
    expect(
      refusal?.uses.every((u) => u.after === "bargain" && u.move === "refuse"),
    ).toBe(true);
  });

  it("no address line promises a reason it never gives", () => {
    expect(
      parts(openingSpeechBank).filter((p) => /You'll see why/i.test(p.text)),
    ).toEqual([]);
  });
});
