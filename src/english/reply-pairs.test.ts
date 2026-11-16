import { describe, expect, it } from "vitest";
import { playable } from "./bank-parts";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import type { BankPart } from "./scene-talk-words";
import {
  distinctPairs,
  pairId,
  replyPairs,
  type ReplyFlow,
  type ReplyScene,
} from "./reply-pairs";
import { talkReplyFlow, talkScenes } from "../director/scene-talk";
import { tableOf } from "./reply-follows";
import { idsHash } from "./judged";
import {
  buildTalks,
  observedPairs,
} from "../../tests/support/scene-talk-fixture";

const parts = (sceneBank as unknown as { parts: BankPart[] }).parts.filter(
  playable,
);

describe("reply pairs", () => {
  const scenes = talkScenes();
  const pairs = replyPairs(parts, { scenes, flow: talkReplyFlow });
  const listed = new Set(pairs.map((pair) => `${pair.before}|${pair.reply}`));
  const every = new Set(
    replyPairs(parts, { scenes, flow: talkReplyFlow, everyFit: true }).map(
      (pair) => `${pair.before}|${pair.reply}`,
    ),
  );

  it("lists every pair the director produced in 60 or more built scenes", () => {
    const talks = buildTalks();
    expect(talks.length).toBeGreaterThanOrEqual(60);
    const observed = talks.flatMap(observedPairs);
    expect(observed.length).toBeGreaterThan(500);
    const missed = [
      ...new Map(
        observed
          .filter((pair) => !listed.has(`${pair.before}|${pair.reply}`))
          .map((pair) => [`${pair.before}|${pair.reply}`, pair]),
      ).values(),
    ];
    expect(
      missed.map(
        (pair) =>
          `${pair.scene} ${pair.step}/${pair.move}: ${pair.before} then ${pair.reply}`,
      ),
    ).toEqual([]);
    // What the pairs list is a part of what any facts could allow.
    expect([...listed].filter((id) => !every.has(id))).toEqual([]);
  }, 300_000);

  it("holds with a table of verdicts too: every pair produced under it is listed under it", () => {
    const seen = [
      ...new Set(
        buildTalks({ replyFollows: new Map() })
          .flatMap(observedPairs)
          .map((p) => `${p.reply}|${p.before}`),
      ),
    ].sort();
    const no: Record<string, string[]> = {};
    for (const id of seen.filter((_, i) => i % 15 === 0)) {
      const [reply, before] = id.split("|");
      (no[reply!] ??= []).push(before!);
    }
    const table = tableOf(no);
    const listedUnder = new Set(
      replyPairs(parts, { scenes, flow: talkReplyFlow, verdicts: table }).map(
        (pair) => `${pair.before}|${pair.reply}`,
      ),
    );
    const missed = buildTalks({ replyFollows: table })
      .flatMap(observedPairs)
      .filter((p) => !listedUnder.has(`${p.before}|${p.reply}`))
      .map((p) => `${p.scene}: ${p.before} then ${p.reply}`);
    expect([...new Set(missed)]).toEqual([]);
  }, 300_000);

  it("only lists playable pieces on both sides, and never a piece after itself", () => {
    const keys = new Set(parts.map((part) => part.key));
    for (const pair of pairs) {
      expect(keys.has(pair.before), pair.before).toBe(true);
      expect(keys.has(pair.reply), pair.reply).toBe(true);
      expect(pair.before).not.toBe(pair.reply);
    }
  });

  it("is the same list on a second asking, and ids are stable and distinct", () => {
    const again = replyPairs(parts, { scenes, flow: talkReplyFlow });
    expect(again).toEqual(pairs);
    const distinct = distinctPairs(pairs);
    const ids = distinct.map((pair) => pairId(pair.before, pair.reply));
    expect(new Set(ids).size).toBe(ids.length);
    expect(idsHash(ids)).toBe(idsHash([...ids].reverse()));
  });

  it("a verdict of no lets the next closest reply into the list", () => {
    const first = pairs.find((pair) => pair.step === "reply")!;
    const none = replyPairs(parts, {
      scenes: [scenes.find((scene) => scene.purpose === first.purpose)!],
      flow: talkReplyFlow,
      verdicts: new Map(),
    });
    const table = new Map([[first.reply, new Set([first.before])]]);
    const after = replyPairs(parts, {
      scenes: [scenes.find((scene) => scene.purpose === first.purpose)!],
      flow: talkReplyFlow,
      verdicts: table,
    });
    const gained = after.filter(
      (pair) =>
        !none.some((o) => o.before === pair.before && o.reply === pair.reply),
    );
    // Every pair gained answers the same line, and the pair judged still stands (it is judged, not gone).
    for (const pair of gained) expect(pair.before).toBe(first.before);
  });

  it("without a flow every move counts: the arc's flow only narrows", () => {
    const scene: ReplyScene = scenes[0]!;
    const open: ReplyFlow = { next: () => new Set() };
    expect(
      replyPairs(parts, { scenes: [scene], flow: open }).filter(
        (pair) => pair.step !== "close",
      ),
    ).toEqual([]);
  });

  // Pairs only lines whose facts can hold together (M5's ruling on the
  // pair-sheet rule, Nov 14): a fact the line before sets counts as held, so
  // a take-up reply after an answer stays on the sheet.
  describe("facts that can hold together", () => {
    const scene: ReplyScene = { purpose: "test-visit", key: "test-visit" };
    const use = (more: Partial<BankPart["uses"][number]>) =>
      ({
        subject: "scene",
        role: "asked",
        purpose: "test-visit",
        key: "test-visit",
        ...more,
      }) as BankPart["uses"][number];
    const piece = (key: string, u: BankPart["uses"][number]): BankPart => ({
      key,
      text: key,
      uses: [u],
    });
    const answer = (more: Partial<BankPart["uses"][number]>) =>
      piece(
        "answer",
        use({ step: "follow", move: "answer", role: "asker", ...more }),
      );
    const reply = (more: Partial<BankPart["uses"][number]>) =>
      piece("reply", use({ step: "reply", move: "agree", ...more }));
    const flow = (apart: string[][] = []): ReplyFlow => ({
      next: () => new Set(["agree"]),
      apart: () => apart,
    });
    const paired = (before: BankPart, after: BankPart, apart?: string[][]) =>
      replyPairs([before, after], { scenes: [scene], flow: flow(apart) }).some(
        (pair) => pair.before === "answer" && pair.reply === "reply",
      );

    it("keeps a reply that needs a fact the line before rules out and sets", () => {
      expect(
        paired(
          answer({ excludesFacts: ["told"], setsFacts: ["told"] }),
          reply({ requiresFacts: ["told"] }),
        ),
      ).toBe(true);
    });
    it("keeps a reply that needs a fact only the line before sets, and drops it after a line that does not", () => {
      const needs = reply({ requiresFacts: ["told"] });
      expect(paired(answer({ setsFacts: ["told"] }), needs)).toBe(true);
      const other = piece(
        "other",
        use({
          step: "follow",
          move: "answer",
          role: "asker",
          setsFacts: ["told"],
        }),
      );
      expect(
        replyPairs([answer({}), other, needs], {
          scenes: [scene],
          flow: flow(),
        }).some((pair) => pair.before === "answer" && pair.reply === "reply"),
      ).toBe(false);
    });
    it("drops a reply that rules out a fact the line before needs or sets", () => {
      expect(
        paired(
          answer({ requiresFacts: ["for"] }),
          reply({ excludesFacts: ["for"] }),
        ),
      ).toBe(false);
      expect(
        paired(
          answer({ setsFacts: ["told"] }),
          reply({ excludesFacts: ["told"] }),
        ),
      ).toBe(false);
    });
    it("drops two facts the arc keeps apart, and keeps one", () => {
      const apart = [["for", "against"]];
      expect(
        paired(
          answer({ requiresFacts: ["for"] }),
          reply({ requiresFacts: ["against"] }),
          apart,
        ),
      ).toBe(false);
      expect(
        paired(
          answer({ requiresFacts: ["for"] }),
          reply({ requiresFacts: ["for"] }),
          apart,
        ),
      ).toBe(true);
    });
  });
});
