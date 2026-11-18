import { describe, expect, it } from "vitest";
import { playable } from "./bank-parts";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import {
  factsSetBy,
  fitting,
  type BankPart,
  type Fact,
  type SceneMove,
} from "./scene-talk-words";
import { follows, tableOf, type ReplyFollowsTable } from "./reply-follows";
import { replyPairs } from "./reply-pairs";
import { talkReplyFlow, talkScenes } from "../director/scene-talk";
import {
  buildTalks,
  fact,
  facts as factsOfFixture,
  observedPairs,
  type ObservedPair,
} from "../../tests/support/scene-talk-fixture";

const parts = (sceneBank as unknown as { parts: BankPart[] }).parts.filter(
  playable,
);
const NONE: ReplyFollowsTable = new Map();

/**
 * The facts that hold where a pair's reply is said: the fixture's, and the
 * facts the lines said before it on the path set (setsFacts), read through
 * the picker's own reader. Old premise: the rival check read only the
 * fixture's facts, so after a line that sets a fact (the desk visit's
 * deadline line sets asked-only) it counted a reply the fact rules out
 * ("You've made your case. Bring the pen.") as a rival that fit, though
 * play never offers it there. New premise: the check reads the set facts
 * as the picker does.
 */
function factsAt(pair: ObservedPair): Record<string, Fact> {
  const spot = {
    purpose: pair.ask.purpose,
    family: pair.ask.family,
    key: pair.ask.key,
  };
  return {
    ...factsOfFixture,
    ...Object.fromEntries(
      factsSetBy(pair.said, spot).map((key) => [key, fact("yes")]),
    ),
  };
}
/** A pair said after a line that set a fact for its spot. */
const afterSetFact = (pair: ObservedPair) =>
  factsSetBy(pair.said, {
    purpose: pair.ask.purpose,
    family: pair.ask.family,
    key: pair.ask.key,
  }).length > 0;
const tagged = (part: BankPart) =>
  part.uses.some((u) => u.requiresFacts?.some((n) => n.startsWith("asked_")));

/** The picker's question for a pair, read back from the pair and the reply's own use. */
function askOf(pair: {
  before: string;
  reply: string;
  step: string;
  move: string;
  purpose: string;
  key: string;
}): SceneMove {
  const before = parts.find((part) => part.key === pair.before)!;
  const reply = parts.find((part) => part.key === pair.reply)!;
  // A pair at the flow's "continue" step is said by a reply written for the
  // "state" step of the same move, so the move alone finds its use there.
  const use = (reply.uses.find(
    (u) => u.step === pair.step && u.move === pair.move,
  ) ?? reply.uses.find((u) => u.move === pair.move))!;
  return {
    step: pair.step as SceneMove["step"],
    move: pair.move,
    role: use.role,
    purpose: pair.purpose,
    key: pair.key,
    after: before.uses.find((u) => u.subject === "scene")!.move,
    afterPiece: pair.before,
  };
}

describe("a reply that does not follow is not offered after that line", () => {
  const pairs = replyPairs(parts, {
    scenes: talkScenes(),
    flow: talkReplyFlow,
  });

  it("follows is true unless a judge said no", () => {
    const table = tableOf({ r: ["b"] });
    expect(follows("r", "b", table)).toBe(false);
    expect(follows("r", "other", table)).toBe(true);
    expect(follows("other", "b", table)).toBe(true);
    expect(follows("r", "b", NONE)).toBe(true);
  });

  it("with a no for (B, R) the picker leaves R out while another reply exists, and offers it when it is the only one", () => {
    const facts: Record<string, Fact> = factsOfFixture;
    let checked = 0;
    for (const pair of pairs) {
      const ask = askOf(pair);
      const all = fitting(ask, facts, (p) => !tagged(p), parts, NONE);
      if (all.length < 2 || !all.some((part) => part.key === pair.reply))
        continue;
      const table = tableOf({ [pair.reply]: [pair.before] });
      const kept = fitting(ask, facts, (p) => !tagged(p), parts, table);
      expect(kept.map((part) => part.key)).not.toContain(pair.reply);
      expect(kept.length).toBeGreaterThan(0);
      const only = fitting(
        ask,
        facts,
        (p) => !tagged(p),
        [parts.find((part) => part.key === pair.reply)!],
        table,
      );
      expect(only.map((part) => part.key)).toEqual([pair.reply]);
      // Marking every one of them "no" never leaves a spot silent: where no
      // other reply fits, the picker serves them all; where a lower-ranked
      // reply fits (the most specific lines were the ones marked), it serves
      // that one instead, and never a "no".
      const every = tableOf(
        Object.fromEntries(all.map((part) => [part.key, [pair.before]])),
      );
      const served = fitting(ask, facts, (p) => !tagged(p), parts, every).map(
        (part) => part.key,
      );
      expect(served.length).toBeGreaterThan(0);
      const allKeys = all.map((part) => part.key);
      if (served.some((key) => allKeys.includes(key)))
        expect(served).toEqual(allKeys);
      else for (const key of served) expect(allKeys).not.toContain(key);
      checked += 1;
      if (checked >= 5) break;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("in 60 or more built scenes, a chosen 5 percent of the pairs seen are not produced where another reply existed", () => {
    const talks = buildTalks();
    expect(talks.length).toBeGreaterThanOrEqual(60);
    const baseline = talks.flatMap(observedPairs);
    const seen = new Map(baseline.map((p) => [`${p.reply}|${p.before}`, p]));
    const ordered = [...seen.keys()].sort();
    expect(ordered.length).toBeGreaterThan(200);
    // A chosen 5 percent, and every pair said after a line that set a fact
    // (the setsFacts path is always checked, whatever the sample draws).
    const chosen = ordered.filter(
      (id, index) => index % 20 === 0 || afterSetFact(seen.get(id)!),
    );
    const no: Record<string, string[]> = {};
    for (const id of chosen) {
      const [reply, before] = id.split("|");
      (no[reply!] ??= []).push(before!);
    }
    const table = tableOf(no);
    const again = buildTalks({ replyFollows: table });
    expect(again.length).toBeGreaterThanOrEqual(60);
    let produced = 0;
    let alternatives = 0;
    const detail: string[] = [];
    for (const pair of again.flatMap(observedPairs)) {
      if (follows(pair.reply, pair.before, table)) continue;
      produced += 1;
      // It was produced, so nothing else fit: ask the picker again without the verdicts.
      const reply = parts.find((part) => part.key === pair.reply)!;
      const use = reply.uses.find(
        (u) => u.step === pair.step && u.move === pair.move,
      )!;
      const ask: SceneMove = {
        step: pair.step as SceneMove["step"],
        move: pair.move,
        role: use.role,
        // A variant says a piece of its family's only when none of its own is left to say.
        ...(pair.ask.family &&
        !reply.uses.some((u) => u.purpose === pair.ask.purpose)
          ? { purpose: pair.ask.family }
          : {
              purpose: pair.ask.purpose,
              ...(pair.ask.family ? { family: pair.ask.family } : {}),
            }),
        key: pair.ask.key,
        after: pair.ask.afterMove,
        afterPiece: pair.before,
      };
      const rivals = fitting(
        ask,
        factsAt(pair),
        (part) => tagged(part) === pair.ask.tagged,
        parts,
        NONE,
      ).filter((part) => follows(part.key, pair.before, table));
      alternatives += rivals.length;
      if (rivals.length)
        detail.push(
          `${pair.scene} ${pair.step}/${pair.move} after ${pair.ask.afterMove} [${pair.ask.purpose}/${pair.ask.family}/${pair.ask.key}] tagged=${pair.ask.tagged}: ${pair.before} then ${pair.reply}; rivals ${rivals.map((r) => r.key).join(", ")}`,
        );
    }
    expect(detail).toEqual([]);
    expect(alternatives).toBe(0);
    // The verdicts changed the talks: the pairs marked "no" are produced less often than before.
    const before = baseline.filter(
      (p) => !follows(p.reply, p.before, table),
    ).length;
    expect(produced).toBeLessThan(before);
  }, 600_000);

  it("the lookup is a Map of Sets built once, and does not slow the picker", () => {
    expect(tableOf({ a: ["b"] }) instanceof Map).toBe(true);
    expect(tableOf({ a: ["b"] }).get("a") instanceof Set).toBe(true);
    const pair = pairs.find((p) => p.step === "follow")!;
    const ask = askOf(pair);
    const big = tableOf(
      Object.fromEntries(
        Array.from({ length: 20000 }, (_, i) => [
          `reply-${i}`,
          [`before-${i}`],
        ]),
      ),
    );
    const time = (table: ReplyFollowsTable) => {
      const start = performance.now();
      for (let i = 0; i < 400; i += 1)
        fitting(ask, {}, undefined, parts, table);
      return performance.now() - start;
    };
    time(NONE);
    // Timed in turn, the best of five each: on a busy machine one slow slice
    // lands on either side, and the best run of each is what the code costs.
    let bare = Infinity,
      withTable = Infinity;
    for (let round = 0; round < 5; round += 1) {
      bare = Math.min(bare, time(NONE));
      withTable = Math.min(withTable, time(big));
    }
    expect(withTable).toBeLessThan(bare * 1.5 + 25);
  });
});
