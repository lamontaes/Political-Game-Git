/**
 * Words machine part 3: a rule that judges a path through a scene is judged
 * from the scene's first line up to each line it applies to, on every branch,
 * and the same path in two scenes is one subject. Fixtures in our own words.
 */
import { describe, expect, it } from "vitest";
import type {
  SceneTalk,
  SceneTalkLine,
  TreeNode,
} from "../../src/director/scene-talk";
import { verdictId } from "../../src/english/judged";
import type { LineRule, RulePiece } from "../../src/english/line-rules";
import { scenePaths } from "./scene-paths";

const piece = (key: string, text: string, move: string): RulePiece => ({
  bank: "scene-talk",
  key,
  text,
  kind: "spoken",
  move,
  uses: [],
});
const PIECES = [
  piece("set", "Your neighbor stops you at the mailbox.", "narrate"),
  piece("ask", "Will you fight the bus cut at the council?", "state-plea"),
  piece("yes", "I'll do it. I promise.", "reply-promise"),
  piece("no", "I can't this time.", "reply-refuse"),
  piece("press", "Then promise me you'll read the plan.", "follow-plea"),
  piece("read", "I promise I'll read it.", "reply-promise"),
  piece("skip", "I won't have time to read it.", "reply-refuse"),
];
const said = (key: string, role: SceneTalkLine["role"]): SceneTalkLine =>
  ({
    parts: [key],
    text: PIECES.find((p) => p.key === key)!.text,
    role,
    speaker: role,
    move: PIECES.find((p) => p.key === key)!.move,
  }) as SceneTalkLine;
const node = (
  lines: SceneTalkLine[],
  replies: [SceneTalkLine, TreeNode | null][] = [],
): TreeNode => ({
  lines,
  replies: replies.map(([line, next]) => ({ line, next })),
});
const talk = (typeKey: string): SceneTalk =>
  ({
    typeKey,
    purpose: "rescue-ask",
    narration: [said("set", "narrator")],
    intro: [],
    state: said("ask", "asker"),
    tree: node(
      [],
      [
        [said("yes", "asked"), null],
        [
          said("no", "asked"),
          node(
            [said("press", "asker")],
            [
              [said("read", "asked"), null],
              [said("skip", "asked"), null],
            ],
          ),
        ],
      ],
    ),
  }) as unknown as SceneTalk;

const rule = (moves: string): LineRule => ({
  id: "commits-on-paths",
  says: "A promise names what, to whom and why by the time it is made.",
  judges: "path",
  from: [{ date: "2026-10-15", words: "his words" }],
  status: "sample",
  test: { kind: "judged" },
  applies: { moves },
});
const idOf = (keys: string[]) =>
  verdictId(
    keys,
    keys.map((k) => PIECES.find((p) => p.key === k)!.text),
  );

describe("scene paths", () => {
  it("judges each promise with the whole scene before it, on every branch", () => {
    const paths = scenePaths(rule("promise"), PIECES, [talk("a")]);
    expect(paths.map((p) => p.keys)).toEqual([
      ["set", "ask", "yes"],
      ["set", "ask", "no", "press", "read"],
    ]);
    expect(paths[0]!.id).toBe(idOf(["set", "ask", "yes"]));
  });

  it("judges an ask with what came before it", () => {
    expect(
      scenePaths(rule("^state-plea$"), PIECES, [talk("a")]).map((p) => p.keys),
    ).toEqual([["set", "ask"]]);
  });

  it("shows what the scene can say after a refusal, where a reason given if asked would be", () => {
    const [refusal] = scenePaths(rule("refuse"), PIECES, [talk("a")]);
    expect(refusal!.keys).toEqual(["set", "ask", "no"]);
    expect(refusal!.after.map((line) => line.key)).toEqual([
      "press",
      "read",
      "skip",
    ]);
  });

  it("counts the same path in two scenes once", () => {
    const paths = scenePaths(rule("promise"), PIECES, [talk("a"), talk("b")]);
    expect(paths).toHaveLength(2);
    expect(paths.map((p) => p.scenes)).toEqual([2, 2]);
  });

  const setRule = (sets: "every" | "later", moves?: string): LineRule => ({
    ...rule("unused"),
    id: "replies-differ",
    judges: "set",
    sets,
    applies: moves ? { moves } : undefined,
  });

  it("reads every reply set with the scene before it", () => {
    const sets = scenePaths(setRule("every"), PIECES, [talk("a")]);
    expect(
      sets.map((set) => [set.keys, set.options!.map((line) => line.key)]),
    ).toEqual([
      [
        ["ask", "yes", "no"],
        ["yes", "no"],
      ],
      [
        ["press", "read", "skip"],
        ["read", "skip"],
      ],
    ]);
  });

  it("reads only the sets after the first exchange for a later rule, with the first set beside them", () => {
    const sets = scenePaths(setRule("later"), PIECES, [talk("a")]);
    expect(sets.map((set) => set.options!.map((line) => line.key))).toEqual([
      ["read", "skip"],
    ]);
    expect(sets[0]!.first!.map((line) => line.key)).toEqual(["yes", "no"]);
    expect(sets[0]!.keys).toEqual(["press", "yes", "no", "read", "skip"]);
  });

  it("reads only the sets that answer the lines its applies names", () => {
    const sets = scenePaths(setRule("every", "^follow-plea$"), PIECES, [
      talk("a"),
    ]);
    expect(sets.map((set) => set.lines.at(-1)!.key)).toEqual(["press"]);
  });

  it("leaves a set rule with no sets field to its own reader", () => {
    const plain = { ...setRule("every") };
    delete (plain as { sets?: unknown }).sets;
    expect(scenePaths(plain, PIECES, [talk("a")])).toEqual([]);
  });

  it("is only for judged path rules", () => {
    expect(
      scenePaths({ ...rule("promise"), judges: "line" }, PIECES, [talk("a")]),
    ).toEqual([]);
  });
});
