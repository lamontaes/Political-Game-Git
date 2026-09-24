import { describe, expect, it } from "vitest";

import { hasLieReply, lieMarkerFor, repliesForLieMode } from "./lie-marker";

describe("Lie marker", () => {
  it("marks only a choice that declares deliberate deception", () => {
    expect(lieMarkerFor({ truthIntent: "deliberate-deception" })?.label).toBe(
      "Lie",
    );
  });

  it("never marks a sincere choice, even one that may prove mistaken", () => {
    expect(lieMarkerFor({ truthIntent: "sincere" })).toBeNull();
  });

  it("never guesses when a choice declares nothing", () => {
    expect(lieMarkerFor({})).toBeNull();
  });

  it("never marks an answer given from memory", () => {
    expect(lieMarkerFor({ truthIntent: "uncertain" })).toBeNull();
  });
});

describe("Lie reply mode", () => {
  const replies = [
    { key: "believe", truthIntent: "sincere" as const },
    { key: "history", truthIntent: "sincere" as const },
    { key: "ask" },
    {
      key: "deny-belief",
      truthIntent: "deliberate-deception" as const,
      lieVariantOf: "believe",
    },
    {
      key: "invent-conversion",
      truthIntent: "deliberate-deception" as const,
      lieVariantOf: "history",
    },
    {
      key: "invent-date",
      truthIntent: "deliberate-deception" as const,
      lieVariantOf: "history",
    },
    { key: "other-lie", truthIntent: "deliberate-deception" as const },
  ];

  it("shows ordinary replies until Lie is selected", () => {
    expect(repliesForLieMode(replies, false).map((reply) => reply.key)).toEqual(
      ["believe", "history", "ask"],
    );
    expect(hasLieReply(replies)).toBe(true);
  });

  it("can show a different number of false replies without losing neutral choices", () => {
    expect(repliesForLieMode(replies, true).map((reply) => reply.key)).toEqual([
      "ask",
      "deny-belief",
      "invent-conversion",
      "invent-date",
      "other-lie",
    ]);
  });

  it("leaves the control unavailable when no deliberate lie is offered", () => {
    const ordinary = replies.slice(0, 3);
    expect(hasLieReply(ordinary)).toBe(false);
    expect(repliesForLieMode(ordinary, true)).toEqual(ordinary);
  });
});
