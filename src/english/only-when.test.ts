import { describe, expect, it } from "vitest";
import type { Fact } from "./bank-line";
import type { ReplyFollowsTable } from "./reply-follows";
import { fitting, type BankPart, type SceneMove } from "./scene-talk-words";

const NONE: ReplyFollowsTable = new Map();

// `onlyWhen` names a fact a line needs only to be true (Words lead, Nov 14:
// "requiresFacts when the fact is what the line is about; onlyWhen when the
// fact only keeps the line from being false"). It filters like
// `requiresFacts` and ranks like it too, one per fact: the most specific line
// that fits is said (most-specific-line-wins). Until Nov 15 it added nothing
// to the rank; measured in played scenes, that let plain lines tie with or
// replace lines about the moment (the three cases below).
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
  it("outranks its siblings when the fact holds, and is out when it does not", () => {
    const bill = fact("the parking bill");
    expect(keys({ bill })).toEqual(["plain"]);
    expect(keys({ bill, introduced: fact("1") })).toEqual(["introduced"]);
    expect(keys({ bill, "stopped-it": fact("1") })).toEqual(["stopped"]);
  });
});

// The packets below are the ones the scenes built in play (Nov 15, at the
// train's head 2190669e): the rescue staged through the health engine and
// opened through the bench's storyScene, and the press scenes from
// press-comment-variants and press-comment-context at GOLDEN_PATH_SEED
// rank-m4. Only the facts' words are kept; the ranking reads only which
// facts the record holds.
const played = (words: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(words).map(([key, text]) => [key, fact(text)]),
  );
// What each spot says now, read from the shipped bank: the lines about the
// vote and the family, which plain lines tied with or replaced while onlyWhen
// added no rank.
const TOP_GREET = [
  "A minute. It's about the vote.",
  "A minute. It's about {bill}.",
];
const TOP_ASK = [
  "People keep asking why you voted that way on {bill}.",
  "Who did you talk to before you voted on {bill}?",
];
const TOP_RESCUE = [
  "The youngest in the house, {child}, was in the room when you got sick. Will you sit down with {child} yourself?",
  "Will you let me call the rest of the family? They should hear what happened from someone who was here.",
  "Will you let the others in the house sit with you for a while? They have been worried about you.",
];
const top = (move: SceneMove, facts: Record<string, Fact>) =>
  fitting(move, facts)
    .map((part) => part.text)
    .sort();

describe("the line about the moment is said, in played scenes", () => {
  it("the reporter opens on the vote (Bothell, Washington; seed rank-m4:1)", () => {
    const facts = played({
      name: "Naomi",
      first: "Jeffrey",
      place: "Bothell",
      bill: "Ordinance 2025-2",
      "vote-held": "2025-2",
      "voted-no": "2025-2",
      outlet: "Bothell Record",
      stranger: "Naomi",
      "day-after": "yes",
      daytime: "yes",
      morning: "yes",
      story: "Ordinance 2025-2",
      "read-town-against": "yes",
    });
    const move: SceneMove = {
      step: "open",
      move: "greet",
      role: "asker",
      purpose: "press-comment.hostile",
      key: "routine",
      family: "press-comment",
    };
    expect(top(move, facts)).toEqual(TOP_GREET);
  });

  it("the hostile reporter asks about the vote (Salem, Ohio; seed rank-m4)", () => {
    const facts = played({
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
    });
    const move: SceneMove = {
      step: "state",
      move: "ask",
      role: "asker",
      purpose: "press-comment.hostile",
      key: "routine",
      family: "press-comment",
    };
    expect(top(move, facts)).toEqual(TOP_ASK);
  });

  it("the rescuer asks to call the family (North Ridgeville, Ohio; seed r1)", () => {
    const facts = played({
      name: "William",
      first: "Sean",
      place: "North Ridgeville",
      child: "Mara",
      "others-there": "yes",
      kin: "William",
      acquainted: "William",
      "tie-friend": "William",
      "day-after": "yes",
      daytime: "yes",
      morning: "yes",
    });
    const move: SceneMove = {
      step: "state",
      move: "request",
      role: "asker",
      purpose: "rescue-ask",
      key: "threat",
    };
    expect(top(move, facts)).toEqual(TOP_RESCUE);
  });
});
