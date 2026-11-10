import { describe, expect, it } from "vitest";
import type { PartGradeLedger } from "./english-grades";
import {
  gradedGood,
  ruleFlags,
  runRules,
  spotsOf,
  textBreaksRule,
  wholeLine,
  type LineRule,
  type RulePiece,
} from "./line-rules";

const piece = (
  key: string,
  text: string,
  uses: RulePiece["uses"] = [{ subject: "s", role: "r", move: "m" }],
  extra: Partial<RulePiece> = {},
): RulePiece => ({
  bank: "scene-talk",
  key,
  text,
  kind: "spoken",
  move: "reply-agree",
  uses,
  ...extra,
});

const rule = (over: Partial<LineRule> & Pick<LineRule, "test">): LineRule => ({
  id: "r1",
  says: "says",
  from: [{ date: "2026-10-15", words: "his words" }],
  status: "enforced",
  ...over,
});

const NO_GRADES: PartGradeLedger = {
  schema: "english-part-grades/1",
  batches: [],
  parts: {},
};

describe("a rule's own test", () => {
  it("reads phrases whole, in any case, with curly quotes", () => {
    const r = rule({ test: { kind: "phrases", phrases: ["That's real."] } });
    expect(ruleFlags(r, piece("a", "It is. THAT’S REAL. Take it."))).toBe(true);
    expect(ruleFlags(r, piece("a", "That's real progress."))).toBe(false);
    const word = rule({ test: { kind: "phrases", phrases: ["the doors"] } });
    expect(ruleFlags(word, piece("a", "Knock on the doors."))).toBe(true);
    expect(ruleFlags(word, piece("a", "Knock on the doorstep."))).toBe(false);
  });

  it("reads patterns, a sentence at a time when asked", () => {
    const r = rule({
      test: { kind: "patterns", patterns: ["^Hello\\.$"], each: "sentence" },
    });
    expect(ruleFlags(r, piece("a", "Hello. Good to see you."))).toBe(true);
    const whole = rule({
      test: { kind: "patterns", patterns: ["^Hello\\.$"] },
    });
    expect(ruleFlags(whole, piece("a", "Hello. Good to see you."))).toBe(false);
  });

  it("reads a sentence as the whole line, ignoring case, edge punctuation and spaces", () => {
    const r = rule({
      test: { kind: "sentences", sentences: ["I'll let you get back to it"] },
    });
    expect(ruleFlags(r, piece("a", "  i’ll let you  get back to it. "))).toBe(
      true,
    );
    expect(ruleFlags(r, piece("a", "I'll let you get back to it, then."))).toBe(
      false,
    );
    expect(wholeLine("“Okay.”")).toBe("okay");
  });

  it("applies only to the banks, kinds and moves it names", () => {
    const r = rule({
      test: { kind: "phrases", phrases: ["bye"] },
      applies: { banks: ["conversation"], kinds: ["spoken"], moves: "^reply" },
    });
    expect(ruleFlags(r, piece("a", "Bye."))).toBe(false);
    expect(ruleFlags(r, piece("a", "Bye.", [], { bank: "conversation" }))).toBe(
      true,
    );
    expect(
      ruleFlags(
        r,
        piece("a", "Bye.", [], { bank: "conversation", move: "close-thank" }),
      ),
    ).toBe(false);
    expect(textBreaksRule(r, "Bye.")).toBe(true);
  });

  it("flags nothing for a place or judged rule", () => {
    expect(ruleFlags(rule({ test: { kind: "place" } }), piece("a", "x"))).toBe(
      false,
    );
    expect(ruleFlags(rule({ test: { kind: "judged" } }), piece("a", "x"))).toBe(
      false,
    );
  });
});

describe("the run", () => {
  const bad = rule({ test: { kind: "phrases", phrases: ["bad"] } });

  it("pulls a flagged piece when its spot keeps a line that breaks nothing", () => {
    const run = runRules(
      [bad],
      [piece("a", "A bad line."), piece("b", "A fine line.")],
      NO_GRADES,
    );
    expect(run.pulled).toEqual({ a: ["r1"] });
    expect(run.waiting).toEqual({});
    expect(run.totals.playableBefore).toBe(2);
    expect(run.totals.playableAfter).toBe(1);
    expect(run.totals.spotsMadeSilent).toBe(0);
  });

  it("leaves a flagged piece waiting when pulling it would silence a spot", () => {
    const run = runRules([bad], [piece("a", "A bad line.")], NO_GRADES);
    expect(run.pulled).toEqual({});
    expect(run.waiting).toEqual({ a: ["r1"] });
    expect(run.totals.spotsLeftWithOnlyWaiting).toBe(1);
    expect(run.totals.playableAfter).toBe(1);
  });

  it("is the same whatever order the pieces come in", () => {
    const pieces = [
      piece("a", "A bad line."),
      piece("b", "Another bad line."),
      piece("c", "A fine line.", [{ subject: "other", role: "r", move: "m" }]),
    ];
    expect(runRules([bad], pieces, NO_GRADES)).toEqual(
      runRules([bad], [...pieces].reverse(), NO_GRADES),
    );
  });

  it("never pulls or holds back a piece he graded good, and reports the conflict", () => {
    const ledger: PartGradeLedger = {
      ...NO_GRADES,
      parts: {
        a: {
          good: 1,
          bad: 0,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    };
    const run = runRules(
      [bad],
      [piece("a", "A bad line."), piece("b", "A fine line.")],
      ledger,
    );
    expect(gradedGood("a", ledger)).toBe(true);
    expect(run.pulled).toEqual({});
    expect(run.waiting).toEqual({});
    expect(run.conflicts).toEqual([{ key: "a", rule: "r1" }]);
  });

  it("lists what a sample rule flags and pulls nothing for it", () => {
    const run = runRules(
      [{ ...bad, status: "sample" }],
      [piece("a", "A bad line."), piece("b", "A fine line.")],
      NO_GRADES,
    );
    expect(run.pulled).toEqual({});
    expect(run.sample).toEqual({ a: ["r1"] });
  });

  it("identifies a spot by what the pickers match on", () => {
    const one = piece("a", "x", [
      {
        subject: "scene",
        step: "open",
        move: "greet",
        role: "asker",
        purpose: "p",
      },
    ]);
    const two = piece("b", "y", [
      {
        subject: "scene",
        step: "open",
        move: "greet",
        role: "asker",
        purpose: "q",
      },
    ]);
    expect(spotsOf(one)).not.toEqual(spotsOf(two));
    expect(spotsOf(piece("c", "z", []))).toEqual([]);
  });
});
