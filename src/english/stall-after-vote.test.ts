import { describe, expect, it } from "vitest";
import type { Fact } from "./bank-line";
import { fitting, type SceneMove } from "./scene-talk-words";

// On a reporter's call after a bill's vote, nobody speaks of the vote as still
// ahead ("I'm still reading it.", "They'll see when I vote.", "The vote's in
// two weeks."); before it, those lines still play. The packet is
// the one the reporter's call built in play: Salem, Ohio (3969834), seed
// rank-m4 (src/director/press-comment-context.test.ts), Nov 15.
// Old premise: that packet as play built it before #9433, with no `acted`.
// New premise (Account lead, Nov 15 12:50Z): after the vote it carries
// `acted`, as play now sets it for a member who voted on the call's bill
// (src/director/vote-stand-facts.ts); before the vote it does not.
// Old premise for the yes packet: after a yes vote the plain answer offers
// two wordings with no reason behind them. New premise (Account lead, Nov 15
// 22:24Z): a "why" is answered by the largest reason the roll holds, so the
// yes packet carries `top-reason-own-view` and `top-reason-people`, as play
// builds them at Bagdad, Arizona (0405140) when the player votes yes on
// another member's bill (src/director/press-comment-after-vote.test.ts).
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
  "It's too early to say.",
  "I want to hear from the people I represent first.",
  "Let me look at the numbers first.",
  "We'll know more next week.",
  "You'll have it the same day everybody else does.",
  "Ask me next week, when there's more to say.",
  "Let me check and call you back today.",
  "Fine. I'm leaning yes. That's all you get.",
  "Put this in: I'll vote yes, and I'll own it.",
];
// Placed on the vote: the honest ways to put a reporter off about a vote
// already cast, none promising anything later (Words lead, Nov 15).
const AFTER_VOTE = [
  "I'd rather not get into it today.",
  "I have nothing to add to how I voted.",
  "I'm not talking about that vote.",
  "I heard you the first time. Not today.",
  "I'm not going to answer that.",
  "My vote is on the record. That's my statement.",
  "Everyone in that room voted. Ask them too.",
  "I'll let my vote speak for itself.",
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
  const voted = {
    ...Object.fromEntries(
      Object.entries(words).map(([key, text]) => [key, fact(text)]),
    ),
    acted: fact("yes"),
  };
  const votedYes = {
    ...Object.fromEntries(
      Object.entries(voted).filter(([key]) => key !== "voted-no"),
    ),
    "voted-yes": fact("2025-1"),
    "top-reason-own-view": fact("yes"),
    "top-reason-people": fact("yes"),
  };
  const before = Object.fromEntries(
    Object.entries(voted).filter(
      ([key]) => key !== "vote-held" && key !== "voted-no" && key !== "acted",
    ),
  );
  const AFTER = [undefined, "press", "ask", "confront", "deflect", "refuse"];
  // The cut of Nov 17 (#10063) emptied the in-office press lines; they come back with pool item
  // story-lines-office-press-and-pressure (CTO, #9750 and #9747, Nov 19 04:53Z).
  for (const spot of SPOTS)
    it.fails(
      `${spot.step} ${spot.move}: none after the vote, and every turn still offers two`,
      () => {
        for (const facts of [voted, votedYes])
          for (const a of AFTER) {
            const after = offered(spot, facts, a);
            expect(after.filter((text) => AHEAD.includes(text))).toEqual([]);
            if (after.length) expect(new Set(after).size).toBeGreaterThan(1);
          }
        expect(AFTER.some((a) => offered(spot, voted, a).length)).toBe(true);
        const ahead = AFTER.flatMap((a) => offered(spot, before, a));
        expect(ahead.some((text) => AHEAD.includes(text))).toBe(true);
        expect(ahead.filter((text) => AFTER_VOTE.includes(text))).toEqual([]);
      },
    );
  it.fails(
    "the bill speaks for itself only after a yes, the vote only after a no",
    () => {
      const deflects = (facts: Record<string, Fact>) =>
        AFTER.flatMap((a) => offered(SPOTS[1]!, facts, a));
      expect(deflects(voted)).not.toContain(
        "I'll let the bill speak for itself.",
      );
      expect(deflects(votedYes)).not.toContain(
        "I'll let my vote speak for itself.",
      );
      expect(deflects(voted)).toContain("I'll let my vote speak for itself.");
      expect(deflects(votedYes)).toContain(
        "I'll let the bill speak for itself.",
      );
    },
  );
});
