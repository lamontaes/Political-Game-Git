import { describe, expect, it } from "vitest";
import type { Fact } from "./bank-line";
import { fitting, type SceneMove } from "./scene-talk-words";

// On a reporter's call after a bill's vote, nobody speaks of the vote as still
// ahead ("I'm still reading it.", "They'll see when I vote.", "The vote's in
// two weeks."); before it, those lines still play. The packet is
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
  "I'm voting no, and I'll tell you why.",
  "I'm voting for it, and you can quote me.",
  "The vote's in two weeks. After is too late for my readers.",
  "Everybody else on the council has told me where they are.",
  "We'll see how it holds up after the vote.",
];
const SPOTS = [
  { step: "reply", move: "stall", role: "asked" },
  { step: "reply", move: "deflect", role: "asked" },
  { step: "reply", move: "answer", role: "asked" },
  { step: "follow", move: "press", role: "asker" },
  { step: "close", move: "promise", role: "asker", outcome: "resolved" },
];
const offered = (
  spot: (typeof SPOTS)[number],
  facts: Record<string, Fact>,
  after?: string,
) =>
  fitting(
    {
      ...spot,
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
  const AFTER = [undefined, "press", "ask", "confront", "deflect", "refuse"];
  for (const spot of SPOTS)
    it(`${spot.step} ${spot.move}: none after the vote, and the spot still has lines`, () => {
      const after = AFTER.flatMap((a) => offered(spot, voted, a));
      expect(after.filter((text) => AHEAD.includes(text))).toEqual([]);
      expect(after.length).toBeGreaterThan(0);
      const ahead = AFTER.flatMap((a) => offered(spot, before, a));
      expect(ahead.some((text) => AHEAD.includes(text))).toBe(true);
    });
});
