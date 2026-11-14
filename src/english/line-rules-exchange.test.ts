/**
 * Words machine part 3: a rule that judges a line with the line it answers.
 * Each line is judged after each line it can follow; a "no" pair bars the
 * line after that line only, and the line is pulled only when it is "no"
 * after every line it can follow.
 */
import { describe, expect, it } from "vitest";
import type { PartGradeLedger } from "./english-grades";
import { verdictId, type JudgedStore } from "./judged";
import {
  caseIsOwners,
  exchangeOutcome,
  exchangeSubjects,
  judgesExchanges,
  pulledFileOf,
  runRules,
  type LinePair,
  type LineRule,
  type RulePiece,
} from "./line-rules";
import { REPLY_STORE_TABLE, follows, withBarred } from "./reply-follows";

const piece = (key: string, text: string, move: string): RulePiece => ({
  bank: "scene-talk",
  key,
  text,
  kind: "spoken",
  move,
  uses: [{ subject: "scene", role: "asked", move, step: "reply" }],
});

const NO_GRADES: PartGradeLedger = {
  schema: "english-part-grades/1",
  batches: [],
  parts: {},
};

const exchange = (status: LineRule["status"]): LineRule => ({
  id: "commits",
  says: "A line that commits names who, what or why.",
  judges: "exchange",
  from: [{ date: "2026-10-15", words: "his words" }],
  status,
  test: { kind: "judged" },
  applies: { moves: "promise" },
});

const ask = piece("ask", "Will you fix the bus route by Friday?", "state-ask");
const other = piece("other", "Nice weather today.", "state-small");
const promise = piece("promise", "I'll do it. I promise.", "reply-promise");
const opener = piece("opener", "I promise I'll be there.", "state-promise");
const PIECES = [ask, other, promise, opener];
const PAIRS: LinePair[] = [
  { before: "ask", reply: "promise" },
  { before: "other", reply: "promise" },
];
const pairId = (before: RulePiece, line: RulePiece) =>
  verdictId([before.key, line.key], [before.text, line.text]);
const store = (no: string[], yes: string[] = []): JudgedStore => ({
  no: new Map(no.map((id) => [id, { keys: [], why: "names nothing" }])),
  yes: new Set(yes),
});

describe("exchange subjects", () => {
  it("judges an answering line after each line it can follow, and an opener alone", () => {
    const subjects = exchangeSubjects(
      exchange("sample"),
      PIECES,
      NO_GRADES,
      PAIRS,
    );
    expect(subjects.map((s) => s.keys)).toEqual([
      ["ask", "promise"],
      ["other", "promise"],
      ["opener"],
    ]);
    expect(subjects[0]!.id).toBe(pairId(ask, promise));
    expect(subjects[2]!.id).toBe(verdictId(["opener"], [opener.text]));
  });

  it("is only for judged exchange rules", () => {
    expect(judgesExchanges(exchange("sample"))).toBe(true);
    expect(judgesExchanges({ ...exchange("sample"), judges: "line" })).toBe(
      false,
    );
    expect(
      exchangeSubjects(
        { ...exchange("sample"), judges: "line" },
        PIECES,
        NO_GRADES,
        PAIRS,
      ),
    ).toEqual([]);
  });
});

describe("what a no pair does", () => {
  const subjects = exchangeSubjects(
    exchange("enforced"),
    PIECES,
    NO_GRADES,
    PAIRS,
  );

  it("bars the line after that line only and keeps it in play", () => {
    const outcome = exchangeOutcome(
      subjects,
      store([pairId(other, promise)], [pairId(ask, promise)]),
    );
    expect(outcome.flagged.has("promise")).toBe(false);
    expect([...outcome.barred.get("promise")!.keys()]).toEqual(["other"]);
    expect(outcome.count).toEqual({ judged: 2, bad: 1, waiting: 1 });
  });

  it("flags the line only when it is no after every line it follows", () => {
    const outcome = exchangeOutcome(
      subjects,
      store([pairId(other, promise), pairId(ask, promise)]),
    );
    expect(outcome.flagged.has("promise")).toBe(true);
  });

  it("an enforced rule's bars reach the picker's table, named by rule and verdict", () => {
    const run = runRules(
      [exchange("enforced")],
      PIECES,
      NO_GRADES,
      {},
      new Map([["commits", store([pairId(other, promise)])]]),
      PAIRS,
    );
    expect(run.pulled).toEqual({});
    expect(run.barred).toEqual({
      promise: { other: `commits:${pairId(other, promise)}` },
    });
    const table = withBarred(REPLY_STORE_TABLE, pulledFileOf(run).barred);
    expect(follows("promise", "other", table)).toBe(false);
    expect(follows("promise", "ask", table)).toBe(true);
  });

  it("a sample rule bars nothing and pulls nothing", () => {
    const run = runRules(
      [exchange("sample")],
      PIECES,
      NO_GRADES,
      {},
      new Map([
        ["commits", store([pairId(other, promise), pairId(ask, promise)])],
      ]),
      PAIRS,
    );
    expect(run.barred).toEqual({});
    expect(run.pulled).toEqual({});
    expect(run.sample).toEqual({ promise: ["commits"] });
  });

  it("never bars a line he graded good: the rule is in conflict", () => {
    const liked: PartGradeLedger = {
      ...NO_GRADES,
      parts: { promise: { good: 1, bad: 0 } } as PartGradeLedger["parts"],
    };
    const run = runRules(
      [exchange("enforced")],
      PIECES,
      liked,
      {},
      new Map([["commits", store([pairId(other, promise)])]]),
      PAIRS,
    );
    expect(run.barred).toEqual({});
    expect(run.conflicts).toEqual([{ key: "promise", rule: "commits" }]);
  });
});

describe("whose spare a case is", () => {
  it("a lead's case tests the rule but is never one of the owner's liked lines", () => {
    expect(caseIsOwners("All right.")).toBe(true);
    expect(caseIsOwners({ text: "All right." })).toBe(true);
    expect(caseIsOwners({ text: "Need help moving?", by: "lead" })).toBe(false);
  });
});
