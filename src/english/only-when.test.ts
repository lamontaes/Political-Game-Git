import { describe, expect, it } from "vitest";
import type { Fact } from "./bank-line";
import type { ReplyFollowsTable } from "./reply-follows";
import {
  fitting,
  wordSceneMove,
  type BankPart,
  type SceneMove,
} from "./scene-talk-words";

const NONE: ReplyFollowsTable = new Map();

// `onlyWhen` names a fact a line needs only to be true (Words lead, Nov 14:
// "requiresFacts when the fact is what the line is about; onlyWhen when the
// fact only keeps the line from being false"). It filters like
// `requiresFacts` and adds nothing to the rank, so a guarded line never
// crowds out its siblings and the speaker's bearing picks among them.
const ask: SceneMove = {
  step: "state",
  move: "ask",
  role: "asker",
  purpose: "press-comment.hostile",
  key: "routine",
};
const use = (extra: object) => ({
  subject: "scene",
  step: "state" as const,
  move: "ask",
  role: "asker" as const,
  purpose: "press-comment.hostile",
  key: "routine",
  requiresFacts: ["bill"],
  ...extra,
});
const parts: BankPart[] = [
  { key: "plain", text: "I have questions about {bill}.", uses: [use({})] },
  {
    key: "introduced",
    text: "Why {bill}, and why now?",
    uses: [use({ onlyWhen: ["introduced"] })],
  },
  {
    key: "stopped",
    text: "Why stop {bill}?",
    uses: [use({ onlyWhen: ["stopped-it"] })],
  },
];
const fact = (text: string): Fact => ({ text, sourceRecordIds: ["r1"] });
const keys = (facts: Record<string, Fact>) =>
  fitting(ask, facts, () => true, parts, NONE)
    .map((part) => part.key)
    .sort();

describe("a line guarded by onlyWhen", () => {
  it("ties with its siblings when the fact holds, and is out when it does not", () => {
    const bill = fact("the parking bill");
    expect(keys({ bill })).toEqual(["plain"]);
    expect(keys({ bill, introduced: fact("1") })).toEqual([
      "introduced",
      "plain",
    ]);
    expect(keys({ bill, "stopped-it": fact("1") })).toEqual([
      "plain",
      "stopped",
    ]);
  });

  it("leaves the pick among the tied lines to the speaker", () => {
    const facts = { bill: fact("the parking bill"), introduced: fact("1") };
    const said = new Set<string>();
    for (let n = 0; n < 40; n++) {
      const worded = wordSceneMove({
        move: ask,
        facts,
        seed: "only-when",
        speakerId: `reporter-${n}`,
        traits: {},
        momentKey: `m-${n}`,
        said: new Set(),
        options: { parts, replyFollows: NONE, includeHeld: true },
      });
      if (worded && "pieceKey" in worded) said.add(worded.pieceKey);
    }
    expect([...said].sort()).toEqual(["introduced", "plain"]);
  });
});
