import { describe, expect, it } from "vitest";
import { spokenToSpans, strengthOf } from "./spoken-grades";

describe("a spoken note becomes span grades with strengths", () => {
  it("reads strength from how the owner talks", () => {
    expect(strengthOf("That's perfect.")).toBe(1);
    expect(strengthOf("I like that.")).toBe(0.75);
    expect(strengthOf("It's fine.")).toBe(0.25);
    expect(strengthOf("That's filler.")).toBe(-0.75);
    expect(strengthOf("Nobody says that.")).toBe(-1);
    expect(strengthOf("I don't like it.")).toBe(-0.75);
    expect(strengthOf("It's kind of awkward.")).toBe(-0.375);
    expect(strengthOf("I'd give it 50%.")).toBe(0.5);
    expect(strengthOf("Next one.")).toBeUndefined();
  });

  it("grades the part he quotes and the rest of the line apart", () => {
    const line = "Well, you know, the clerk closes at five.";
    const spans = spokenToSpans(
      line,
      "I like 'the clerk closes at five' but 'you know' is filler.",
    );
    expect(spans).toEqual([
      { start: 16, end: 40, strength: 0.75 },
      { start: 6, end: 14, strength: -0.75 },
    ]);
    expect(line.slice(6, 14)).toBe("you know");
  });

  it("a note that quotes nothing grades the whole line", () => {
    expect(spokenToSpans("Hello.", "That's how people talk.")).toEqual([
      { start: 0, end: 6, strength: 1 },
    ]);
  });
});
