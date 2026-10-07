import { describe, expect, it } from "vitest";

import { batchStats, echoes } from "./stats";

describe("the batch measures", () => {
  it("counts turn length, short turns, questions and echoes against the card", () => {
    const stats = batchStats([
      { line: "Hi, Nathan. How are you?" },
      { line: "Okay. What game?" },
      { line: "I can't make it." },
      {
        line: "Me too. I've been meaning to make time to learn something.",
        prior: "Tell them you want to make time to learn something",
      },
      {
        line: "Yeah? Learn what?",
        prior: "Tell them you want to make time to learn something",
      },
    ]);
    const by = Object.fromEntries(stats.map((stat) => [stat.key, stat]));
    expect(by["median-words"]).toMatchObject({ value: 4, card: 4, over: 5 });
    expect(by["short-turns"]).toMatchObject({ value: 0.4, card: 0.45 });
    expect(by.questions).toMatchObject({ value: 0.6, over: 5 });
    expect(by.echo).toMatchObject({ value: 0.5, over: 2, card: 0 });
  });

  it("calls a shared topic word alone no echo", () => {
    expect(echoes("Oh yeah? Learn what?", "make time to learn something")).toBe(
      false,
    );
    expect(
      echoes("I want to learn something too.", "time to learn something"),
    ).toBe(true);
  });
});
