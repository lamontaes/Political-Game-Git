import { describe, expect, it } from "vitest";
import type { Fact } from "./bank-line";
import { fitting, type SceneMove } from "./scene-talk-words";

// An official asked about a bill after its vote never says the vote is still
// ahead ("I'm still reading it.", "They'll see when I vote."). The packet is
// the one the reporter's call built in play: Salem, Ohio (3969834), seed
// rank-m4 (src/director/press-comment-context.test.ts), Nov 15.
const fact = (text: string): Fact => ({ text, sourceRecordIds: ["r1"] });
const words: Record<string, string> = {
  name: "River",
  first: "Keanu",
  place: "Salem",
  bill: "Ordinance 2025-1",
  "vote-held": "2025-1",
  "voted-no": "2025-1",
  outlet: "Salem Herald",
  stranger: "River",
  "day-after": "yes",
  daytime: "yes",
  morning: "yes",
  story: "Ordinance 2025-1",
};
const AHEAD = [
  "I'm still reading the latest draft.",
  "I haven't seen the final language.",
  "I'm still reading it.",
  "They'll see when I vote.",
  "I'll have something to say after the vote.",
  "I'm not going to get ahead of the vote.",
  "I'll have more when the committee reports.",
];
const offered = (move: string, facts: Record<string, Fact>, after?: string) =>
  fitting(
    {
      step: "reply",
      move,
      role: "asked",
      purpose: "press-comment",
      key: "routine",
      ...(after ? { after } : {}),
    } as SceneMove,
    facts,
  ).map((part) => part.text);

describe("after the vote, no reply says the vote is still ahead", () => {
  const voted = Object.fromEntries(
    Object.entries(words).map(([key, text]) => [key, fact(text)]),
  );
  const before = Object.fromEntries(
    Object.entries(voted).filter(
      ([key]) => key !== "vote-held" && key !== "voted-no",
    ),
  );
  for (const move of ["stall", "deflect"])
    it(`${move}: none after the vote, and the spot still has lines`, () => {
      const after = [...offered(move, voted), ...offered(move, voted, "press")];
      expect(after.filter((text) => AHEAD.includes(text))).toEqual([]);
      expect(offered(move, voted).length).toBeGreaterThan(0);
      const ahead = [
        ...offered(move, before),
        ...offered(move, before, "press"),
      ];
      expect(ahead.some((text) => AHEAD.includes(text))).toBe(true);
    });
});
