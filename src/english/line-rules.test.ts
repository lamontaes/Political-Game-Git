import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PartGradeLedger } from "./english-grades";
import {
  choicesReport,
  type ChoiceReply,
  type ChoiceSpot,
} from "./choice-sets";
import {
  CHOICES_RULE,
  RULE_JUDGES,
  gradedGood,
  pulledFileOf,
  ruleFlags,
  runRules,
  spotsOf,
  textBreaksRule,
  wholeLine,
  type LineRule,
  type LineRulesFile,
  type RulePiece,
} from "./line-rules";
import {
  gradeNotesOf,
  readingOf,
  type GradeRow,
  type NotesNotRulesFile,
  type RulingsReadFile,
} from "./rulings-read";

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
  judges: "line",
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
    // Each flagged set is listed with its replies.
    expect(report.flagged[0]!.replies.map((row) => row.move)).toEqual([
      "turn",
      "always",
      "plain",
      "brief",
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

  it("lists a short set as a gap in its spot: nothing is pulled, queued or counted as waiting", () => {
    const run = runRules([choicesRule], bankPieces, NO_GRADES, {
      [CHOICES_RULE]: choicesReport([oneAnswerFourWays, fourAnswers], 4),
    });
    expect(run.pulled).toEqual({});
    expect(run.waiting).toEqual({});
    expect(run.totals.waiting).toBe(0);
    expect(run.totals.spotsLeftWithOnlyWaiting).toBe(0);
    expect(run.gaps).toEqual({
      "everyday talk: home-new": {
        offers: ["answers", "turns-back"],
        needs: 2,
        missing: [],
        problems: [
          "two replies of one meaning group",
          "fewer than four meaning groups",
        ],
      },
    });
    expect(run.totals.replySpotsRead).toBe(2);
    expect(run.totals.replySpotsShort).toBe(1);
    expect(pulledFileOf(run).gaps).toEqual(run.gaps);
    expect(run.perRule[CHOICES_RULE]!.choices!.flagged).toHaveLength(1);
    expect(run.totals.playableAfter).toBe(run.totals.playableBefore);
  });

  it("touches no line he graded good: gaps name spots, never lines", () => {
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
    expect(run.conflicts).toEqual([]);
    expect(run.waiting).toEqual({});
    expect(JSON.stringify(run.gaps)).not.toContain("p-plain");
  });

  it("lists a spot with three meanings with the one it is missing, never a spot with four, and puts no line in waiting", () => {
    // The scene allows a "deflect" move here, but no line is written for it
    // after this asker line: that is the meaning the spot is missing.
    const three: ChoiceSpot = {
      ...threeAnswers,
      allowed: ["apologizes", "tells", "confronts", "deflects"],
    };
    const four: ChoiceSpot = {
      ...fourAnswers,
      allowed: ["turns-back", "answers", "adds", "deflects", "refuses"],
    };
    const fill = ["adds", "turns-back", "deflects", "refuses"];
    const pieces = ["r-apologize", "r-tell", "r-confront", "q-plain"].map(
      (key) => piece(key, `The ${key} line.`),
    );
    const run = runRules([choicesRule], pieces, NO_GRADES, {
      [CHOICES_RULE]: choicesReport([three, four], 4, fill),
    });
    expect(Object.keys(run.gaps)).toEqual(["scene: owed-apology after press"]);
    const gap = run.gaps["scene: owed-apology after press"]!;
    expect(gap.offers).toEqual(["apologizes", "confronts", "tells"]);
    expect(gap.needs).toBe(1);
    // Its own unwritten move first, then the groups a new move fills with.
    expect(gap.missing).toEqual(["deflects", "adds", "turns-back", "refuses"]);
    expect(gap.missing[0]).toBe("deflects");
    expect(run.waiting).toEqual({});
    expect(run.pulled).toEqual({});
    expect(run.totals.waiting).toBe(0);
    expect(pulledFileOf(run).waiting).toEqual({});
    expect(pulledFileOf(run).gaps).toEqual(run.gaps);
  });

  it("flags nothing when no set is read", () => {
    const run = runRules([choicesRule], bankPieces, NO_GRADES);
    expect(run.waiting).toEqual({});
    expect(run.conflicts).toEqual([]);
  });
});

const ROOT = path.resolve(__dirname, "../..");
const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;

describe("every rule says what it judges", () => {
  const { rules } = readJson<LineRulesFile>("data/english/line-rules.json");

  it("each rule judges a line, a set, an exchange or a line in its context", () => {
    const wrong = rules
      .filter((rule) => !RULE_JUDGES.includes(rule.judges))
      .map((rule) => `${rule.id}: judges is ${String(rule.judges)}`);
    expect(wrong).toEqual([]);
  });

  it("a rule on a set or an exchange whose detector reads one line says so, and no other rule does", () => {
    const wrong = rules.flatMap((rule) => {
      const readsOneLine = ["phrases", "patterns", "sentences"].includes(
        rule.test.kind,
      );
      const whole = rule.judges === "set" || rule.judges === "exchange";
      if (whole && readsOneLine && rule.detectorReads !== "line")
        return [
          `${rule.id} judges a ${rule.judges} but its detector reads a line; set detectorReads`,
        ];
      if (rule.detectorReads && !(whole && readsOneLine))
        return [`${rule.id} has detectorReads but no mismatch`];
      return [];
    });
    expect(wrong).toEqual([]);
  });
});

describe("the rulings read from every place", () => {
  const { rules } = readJson<LineRulesFile>("data/english/line-rules.json");
  const file = readJson<RulingsReadFile>("data/english/rulings-read.json");
  const ids = new Set(rules.map((rule) => rule.id));
  const pending = new Set(Object.keys(file.pendingRules));

  it("every ruling has a rule that exists (or is being built) or a reason it is not a rule", () => {
    const wrong = file.rulings.flatMap((row) => {
      const has = [row.rule, row.notARule].filter(Boolean).length;
      if (has !== 1)
        return [`${row.id}: needs exactly one of rule and notARule`];
      if (row.rule && !ids.has(row.rule) && !pending.has(row.rule))
        return [`${row.id}: rule ${row.rule} does not exist`];
      if (row.notARule && row.notARule.trim().length < 20)
        return [`${row.id}: notARule is not a reason`];
      return [];
    });
    expect(wrong).toEqual([]);
    expect(new Set(file.rulings.map((row) => row.id)).size).toBe(
      file.rulings.length,
    );
  });

  it("a rule being built elsewhere is named only until it exists here", () => {
    const wrong = [...pending].filter((id) => ids.has(id));
    expect(wrong, "move these out of pendingRules").toEqual([]);
  });

  it("a superseded ruling names the later row", () => {
    const rowIds = new Set(file.rulings.map((row) => row.id));
    const wrong = file.rulings
      .filter((row) => row.supersededBy && !rowIds.has(row.supersededBy))
      .map((row) => row.id);
    expect(wrong).toEqual([]);
  });

  it("every quoted word is in its source file, and at most forty words", () => {
    const wrong = file.rulings.flatMap((row) => {
      const [source] = row.source.split(" :: ");
      const text = readFileSync(path.join(ROOT, source!), "utf8");
      return [
        ...(text.includes(row.words)
          ? []
          : [`${row.id}: not in ${source}: ${row.words.slice(0, 60)}`]),
        ...(row.words.split(/\s+/).length > 40
          ? [`${row.id}: more than forty words`]
          : []),
      ];
    });
    expect(wrong).toEqual([]);
  });
});

describe("the grade notes no rule cites", () => {
  const { rules } = readJson<LineRulesFile>("data/english/line-rules.json");
  const dir = path.join(ROOT, "data/english/grades");
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => ({
      file: name,
      grades: (
        JSON.parse(readFileSync(path.join(dir, name), "utf8")) as {
          grades: GradeRow[];
        }
      ).grades,
    }));
  const reading = readingOf(
    rules,
    gradeNotesOf(files),
    readJson<RulingsReadFile>("data/english/rulings-read.json"),
    readJson<NotesNotRulesFile>("data/english/notes-not-rules.json"),
  );
  const reasons = readJson<NotesNotRulesFile>(
    "data/english/notes-not-rules.json",
  );

  it("each has its own reason, and no reason is left for a note a rule now cites", () => {
    const unattached = new Set(
      reading.unattachedNotes.map((note) => `${note.file}::${note.key}`),
    );
    const given = new Set(
      reasons.notes.map((row) => `${row.file}::${row.key}`),
    );
    expect(
      [...unattached].filter((key) => !given.has(key)),
      "unattached notes with no reason",
    ).toEqual([]);
    expect(
      [...given].filter((key) => !unattached.has(key)),
      "reasons for notes that are attached now",
    ).toEqual([]);
    expect(reading.unattachedNotes.filter((n) => n.reason.length < 20)).toEqual(
      [],
    );
  });

  it("a reason is not just 'other' and is not shared by every note", () => {
    const reasonsText = reasons.notes.map((row) => row.reason);
    expect(reasonsText.filter((r) => /^other\b/i.test(r))).toEqual([]);
    expect(new Set(reasonsText).size).toBeGreaterThan(10);
  });
});
