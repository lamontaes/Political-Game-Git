import { describe, expect, it } from "vitest";
import type { PartGradeLedger } from "./english-grades";
import {
  choicesReport,
  type ChoiceReply,
  type ChoiceSpot,
} from "./choice-sets";
import {
  CHOICES_RULE,
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

  it("queues what a rewrite rule flags, still playing, though another line could stand in", () => {
    const run = runRules(
      [{ ...bad, status: "rewrite" }],
      [piece("a", "A bad line."), piece("b", "A fine line.")],
      NO_GRADES,
    );
    // An enforced rule would pull "a" here, because "b" serves the same spot.
    expect(run.pulled).toEqual({});
    expect(run.waiting).toEqual({ a: ["r1"] });
    expect(run.totals.playableAfter).toBe(run.totals.playableBefore);
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

describe("four-replies-are-four-answers: the rule that reads a whole set of replies", () => {
  const reply = (move: string, group: string, key: string): ChoiceReply => ({
    move,
    group,
    pieces: [key],
    text: `The ${move} line.`,
  });
  // Seen on main on Nov 10: "Where are you from?" offered "I'm from
  // Grandville. And you?", "I grew up here.", "I'm from Grandville." and "Here
  // in Grandville." (turns it back, then three wordings of one answer).
  const oneAnswerFourWays: ChoiceSpot = {
    id: "everyday talk: home-new",
    replies: [
      reply("turn", "turns-back", "p-turn"),
      reply("always", "answers", "p-always"),
      reply("plain", "answers", "p-plain"),
      reply("brief", "answers", "p-brief"),
    ],
  };
  const fourAnswers: ChoiceSpot = {
    id: "everyday talk: fine",
    replies: [
      reply("turn", "turns-back", "q-turn"),
      reply("plain", "answers", "q-plain"),
      reply("detail", "adds", "q-detail"),
      reply("change", "deflects", "q-change"),
    ],
  };
  const threeAnswers: ChoiceSpot = {
    id: "scene: owed-apology after press",
    replies: [
      reply("apologize", "apologizes", "r-apologize"),
      reply("tell", "tells", "r-tell"),
      reply("confront", "confronts", "r-confront"),
    ],
  };

  it("flags a set that holds two replies of one meaning group, and one with fewer than four groups", () => {
    const report = choicesReport(
      [oneAnswerFourWays, fourAnswers, threeAnswers],
      4,
    );
    expect(report.spots).toBe(3);
    expect(report.fourOfFour).toBe(1);
    expect(report.flagged.map((row) => [row.spot, row.problems])).toEqual([
      [
        "everyday talk: home-new",
        ["two replies of one meaning group", "fewer than four meaning groups"],
      ],
      ["scene: owed-apology after press", ["fewer than four meaning groups"]],
    ]);
    // Each flagged set is listed with its replies, and every piece in it is queued.
    expect(report.flagged[0]!.replies.map((row) => row.move)).toEqual([
      "turn",
      "always",
      "plain",
      "brief",
    ]);
    expect(Object.keys(report.pieces)).toEqual([
      "p-always",
      "p-brief",
      "p-plain",
      "p-turn",
      "r-apologize",
      "r-confront",
      "r-tell",
    ]);
  });

  it("is the same whatever order the spots come in", () => {
    const spots = [oneAnswerFourWays, fourAnswers, threeAnswers];
    expect(choicesReport(spots, 4)).toEqual(
      choicesReport([...spots].reverse(), 4),
    );
  });

  const choicesRule = rule({
    id: CHOICES_RULE,
    test: { kind: "place", reads: "src/director/data/reply-meanings.json" },
  });
  const bankPieces = [
    "p-turn",
    "p-always",
    "p-plain",
    "p-brief",
    "q-plain",
  ].map((key) =>
    piece(key, `The ${key} line.`, [{ subject: key, role: "answer" }]),
  );

  it("queues every piece of a flagged set for a rewrite and keeps them all playing", () => {
    const run = runRules([choicesRule], bankPieces, NO_GRADES, {
      [CHOICES_RULE]: choicesReport([oneAnswerFourWays, fourAnswers], 4),
    });
    expect(run.pulled).toEqual({});
    expect(run.waiting).toEqual({
      "p-always": [CHOICES_RULE],
      "p-brief": [CHOICES_RULE],
      "p-plain": [CHOICES_RULE],
      "p-turn": [CHOICES_RULE],
    });
    expect(run.perRule[CHOICES_RULE]!.choices!.flagged).toHaveLength(1);
    expect(run.totals.playableAfter).toBe(run.totals.playableBefore);
  });

  it("never queues a piece he graded good: it reports it as kept in a flagged set instead", () => {
    const ledger: PartGradeLedger = {
      ...NO_GRADES,
      parts: {
        "p-plain": {
          good: 1,
          bad: 0,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    };
    const run = runRules([choicesRule], bankPieces, ledger, {
      [CHOICES_RULE]: choicesReport([oneAnswerFourWays], 4),
    });
    // The set is short, not the line wrong: kept in play and listed for him.
    expect(run.conflicts).toEqual([]);
    expect(run.keptInFlaggedSets).toEqual([
      { key: "p-plain", rule: CHOICES_RULE },
    ]);
    expect(Object.keys(run.waiting)).toEqual(["p-always", "p-brief", "p-turn"]);
  });

  it("flags nothing when no set is read", () => {
    const run = runRules([choicesRule], bankPieces, NO_GRADES);
    expect(run.waiting).toEqual({});
    expect(run.conflicts).toEqual([]);
  });
});
