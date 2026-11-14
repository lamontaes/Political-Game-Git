/**
 * A words builder who adds or rewords reply lines judges only the pairs those
 * lines made (`words:pairs --since <ref>`), so line-rules stays green on their
 * own pull request. Fixtures in our own words.
 */
import { describe, expect, it } from "vitest";
import type { PartGradeLedger } from "../../src/english/english-grades";
import type { JudgedStore } from "../../src/english/judged";
import type { LineRule, RulePiece } from "../../src/english/line-rules";
import { changedSince, exchangeSheets } from "./reply-pairs";
import { readBankPieces } from "./run-rules";

const piece = (key: string, text: string, move: string): RulePiece => ({
  bank: "scene-talk",
  key,
  text,
  kind: "spoken",
  move,
  uses: [{ subject: "scene", role: "asked", move, step: "reply" }],
});
const ask = piece("ask", "Will you fix the bus route by Friday?", "state-ask");
const other = piece("other", "Nice weather today.", "state-small");
const promise = piece("promise", "I'll do it. I promise.", "reply-promise");
const PIECES = [ask, other, promise];
const PAIRS = [
  { before: "ask", reply: "promise" },
  { before: "other", reply: "promise" },
];
const NO_GRADES: PartGradeLedger = {
  schema: "english-part-grades/1",
  batches: [],
  parts: {},
};
const EMPTY: JudgedStore = { no: new Map(), yes: new Set() } as JudgedStore;
const RULE: LineRule = {
  id: "commits",
  says: "A line that commits names who, what or why.",
  judges: "exchange",
  from: [{ date: "2026-10-15", words: "his words" }],
  status: "sample",
  test: { kind: "judged" },
  applies: { moves: "promise" },
};
const sheetPairs = (changed?: ReadonlySet<string>) =>
  [
    ...exchangeSheets(
      RULE,
      PIECES,
      NO_GRADES,
      EMPTY,
      PAIRS,
      400,
      undefined,
      changed,
    ).values(),
  ].flatMap((sheet) =>
    sheet.lines.flatMap((row) => row.after.map((a) => `${a.key}>${row.key}`)),
  );

describe("judging only the pairs new lines made", () => {
  it("keeps a pair only when one of its lines is new or reworded", () => {
    expect(sheetPairs()).toEqual(["ask>promise", "other>promise"]);
    expect(sheetPairs(new Set(["ask"]))).toEqual(["ask>promise"]);
    expect(sheetPairs(new Set(["promise"]))).toEqual([
      "ask>promise",
      "other>promise",
    ]);
    expect(sheetPairs(new Set(["nobody"]))).toEqual([]);
  });

  it("names the bank lines that are new or say different words since a commit", () => {
    const [same, reworded] = readBankPieces();
    const changed = changedSince("HEAD", [
      same!,
      { ...reworded!, text: `${reworded!.text} Again.` },
      piece("a-line-no-commit-has", "Brand new.", "reply-tell"),
    ]);
    expect([...changed].sort()).toEqual(
      [reworded!.key, "a-line-no-commit-has"].sort(),
    );
  }, 60_000);
});
