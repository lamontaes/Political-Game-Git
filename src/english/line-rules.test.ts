import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PartGradeLedger } from "./english-grades";
import { verdictId, type JudgedStores } from "./judged";
import {
  RULE_JUDGES,
  awaitingAfter,
  caseBreaksRule,
  caseText,
  gradedGood,
  ruleApplies,
  ruleFlags,
  runRules,
  spotsOf,
  textBreaksRule,
  usesWithTags,
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

  it("flags nothing for a place rule, and a judged rule only where a verdict says no", () => {
    expect(ruleFlags(rule({ test: { kind: "place" } }), piece("a", "x"))).toBe(
      false,
    );
    const judged = rule({ test: { kind: "judged" } });
    expect(ruleFlags(judged, piece("a", "x"))).toBe(false);
    expect(ruleFlags(judged, piece("a", "x"), storesSaying("a", "x"))).toBe(
      true,
    );
  });
});

describe("a rule that judges a piece in its spot", () => {
  const school = rule({
    test: { kind: "patterns", patterns: ["remember \\{school\\}"] },
    applies: {
      uses: {
        has: { role: "^(?:ask|raise)$" },
        lacks: { requiresFacts: "^long-ago$" },
      },
    },
  });

  it("reads a use's tags: what it must have and what it must lack, on lists too", () => {
    const line = "Do you remember {school}?";
    expect(ruleFlags(school, piece("a", line, [{ role: "raise" }]))).toBe(true);
    expect(
      ruleFlags(
        school,
        piece("a", line, [{ role: "raise", requiresFacts: ["long-ago"] }]),
      ),
    ).toBe(false);
    expect(ruleFlags(school, piece("a", line, [{ role: "answer" }]))).toBe(
      false,
    );
    // One use is enough: a piece said in two spots is covered where either fits.
    expect(
      ruleFlags(
        school,
        piece("a", line, [
          { role: "raise", requiresFacts: ["long-ago"] },
          { role: "ask", requiresFacts: ["seen"] },
        ]),
      ),
    ).toBe(true);
    expect(ruleFlags(school, piece("a", line, []))).toBe(false);
  });

  it("applies where any one entry of a list of conditions does", () => {
    const narration = rule({
      test: { kind: "patterns", patterns: ["\\bI\\b"] },
      applies: [
        { banks: ["scene-words"] },
        { banks: ["scene-talk"], uses: { has: { role: "^narrator$" } } },
      ],
    });
    const line = "I walk in.";
    expect(
      ruleFlags(narration, piece("a", line, [], { bank: "scene-words" })),
    ).toBe(true);
    expect(ruleFlags(narration, piece("a", line, [{ role: "narrator" }]))).toBe(
      true,
    );
    expect(ruleFlags(narration, piece("a", line, [{ role: "asked" }]))).toBe(
      false,
    );
    expect(ruleApplies(narration, piece("a", line, [], { bank: "news" }))).toBe(
      false,
    );
  });

  it("copies the part's own tags onto each use, never over the use's own", () => {
    const uses = usesWithTags(
      { bearing: "calm", voice: "plain", device: "contrast", key: "k" },
      [{ role: "asked" }, { role: "asker", bearing: "braced" }],
    );
    expect(uses).toEqual([
      { bearing: "calm", voice: "plain", device: "contrast", role: "asked" },
      { bearing: "braced", voice: "plain", device: "contrast", role: "asker" },
    ]);
    // A spot is what the pickers match on; the part's tags are not part of it.
    expect(spotsOf(piece("a", "x", uses))).toEqual(
      spotsOf(piece("a", "x", [{ role: "asked" }, { role: "asker" }])),
    );
  });

  it("tests a case with its spot where it is said, and a bare line wherever it is said", () => {
    const line = "Do you remember {school}?";
    expect(caseBreaksRule(school, line)).toBe(true);
    expect(
      caseBreaksRule(school, {
        text: line,
        use: { role: "raise", requiresFacts: ["long-ago"] },
      }),
    ).toBe(false);
    expect(caseBreaksRule(school, { text: line, use: { role: "raise" } })).toBe(
      true,
    );
  });
});

/** A store for rule `r1` that judged one line "no" in these words, and others "yes". */
function storesSaying(
  key: string,
  text: string,
  yes: readonly [string, string][] = [],
  ruleId = "r1",
): JudgedStores {
  return new Map([
    [
      ruleId,
      {
        no: new Map([
          [verdictId([key], [text]), { keys: [key], why: "a reason" }],
        ]),
        yes: new Set(yes.map(([k, t]) => verdictId([k], [t]))),
      },
    ],
  ]);
}

describe("a judged rule reads its saved verdicts", () => {
  const judged = rule({ test: { kind: "judged" } });
  const lines = () => [piece("a", "A vague line."), piece("b", "A fine line.")];
  const said = () =>
    storesSaying("a", "A vague line.", [["b", "A fine line."]]);

  it("an enforced rule pulls the line judged bad and counts lines judged, bad and waiting", () => {
    const run = runRules(
      [judged],
      [...lines(), piece("c", "Not judged yet.")],
      NO_GRADES,
      {},
      said(),
    );
    expect(run.pulled).toEqual({ a: ["r1"] });
    expect(run.perRule.r1!.verdicts).toEqual({ judged: 2, bad: 1, waiting: 1 });
    expect(run.awaitingVerdict).toEqual({ r1: 1 });
    process.stdout.write(
      `judged rule r1 (fixture): lines judged ${run.perRule.r1!.verdicts!.judged}, judged bad ${run.perRule.r1!.verdicts!.bad}, waiting ${run.perRule.r1!.verdicts!.waiting}\n`,
    );
  });

  it("a sample rule lists the line and pulls nothing", () => {
    const run = runRules(
      [{ ...judged, status: "sample" }],
      lines(),
      NO_GRADES,
      {},
      said(),
    );
    expect(run.pulled).toEqual({});
    expect(run.sample).toEqual({ a: ["r1"] });
  });

  it("a line nobody has judged passes, plays and is counted as waiting", () => {
    const run = runRules([judged], lines(), NO_GRADES, {}, new Map());
    expect(run.pulled).toEqual({});
    expect(run.waiting).toEqual({});
    expect(run.totals.playableAfter).toBe(2);
    expect(run.perRule.r1!.verdicts).toEqual({ judged: 0, bad: 0, waiting: 2 });
  });

  it("an awaiting-test rule counts its verdicts but is not held to a waiting count", () => {
    const run = runRules(
      [{ ...judged, status: "awaiting-test" }],
      lines(),
      NO_GRADES,
      {},
      said(),
    );
    expect(run.pulled).toEqual({});
    expect(run.awaitingVerdict).toEqual({});
    expect(run.perRule.r1!.verdicts!.bad).toBe(1);
  });

  it("a verdict is tied to the words: change the line and the verdict no longer applies", () => {
    const run = runRules(
      [judged],
      [piece("a", "A vague line, rewritten."), piece("b", "A fine line.")],
      NO_GRADES,
      {},
      said(),
    );
    expect(run.pulled).toEqual({});
    expect(run.perRule.r1!.verdicts).toEqual({ judged: 1, bad: 0, waiting: 1 });
  });

  it("never pulls a line he graded good, and lists the conflict", () => {
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
    const run = runRules([judged], lines(), ledger, {}, said());
    expect(run.pulled).toEqual({});
    expect(run.conflicts).toEqual([{ key: "a", rule: "r1" }]);
  });

  it("never leaves a spot with no line: the only line there waits", () => {
    const run = runRules(
      [judged],
      [piece("a", "A vague line.")],
      NO_GRADES,
      {},
      storesSaying("a", "A vague line."),
    );
    expect(run.pulled).toEqual({});
    expect(run.waiting).toEqual({ a: ["r1"] });
    expect(run.totals.spotsMadeSilent).toBe(0);
  });

  it("a rule about a set or an exchange flags no single line (part 3 keys those)", () => {
    const set = rule({ test: { kind: "judged" }, judges: "set" });
    const run = runRules([set], lines(), NO_GRADES, {}, said());
    expect(run.pulled).toEqual({});
    expect(run.perRule.r1!.verdicts).toBeUndefined();
  });
});

describe("the count of lines waiting for a verdict only falls", () => {
  it("keeps the committed count where the fresh one is higher, and names the rule", () => {
    const after = awaitingAfter({ a: 5, b: 2, c: 7 }, { a: 4, b: 3 });
    expect(after.counts).toEqual({ a: 4, b: 2, c: 7 });
    expect(after.rose).toEqual([{ rule: "a", fresh: 5, committed: 4 }]);
    expect(awaitingAfter({ a: 1 }, undefined).rose).toEqual([]);
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

describe("the rules that judge a piece in its spot, over the banks", () => {
  const file = JSON.parse(
    readFileSync(
      path.resolve(__dirname, "../../data/english/line-rules.json"),
      "utf8",
    ),
  ) as LineRulesFile;
  const inContext = file.rules.filter(
    (row) => row.judges === "piece-in-context",
  );
  const byId = new Map(file.rules.map((row) => [row.id, row]));
  const bank = (name: string): RulePiece[] => {
    const parts = (
      JSON.parse(
        readFileSync(
          path.resolve(__dirname, "../../data/english/parts", `${name}.json`),
          "utf8",
        ),
      ) as {
        parts: ({
          key: string;
          text: string;
          kind?: string;
          move?: string;
          uses?: Record<string, unknown>[];
        } & Record<string, unknown>)[];
      }
    ).parts;
    return parts.map((part) => ({
      bank: name,
      key: part.key,
      text: part.text,
      kind: part.kind ?? "",
      move: part.move ?? "",
      uses: usesWithTags(part, part.uses ?? []),
    }));
  };
  const flagged = (id: string, pieces: readonly RulePiece[]) =>
    pieces.filter((p) => ruleFlags(byId.get(id)!, p)).map((p) => p.key);

  it("each one has a test that reads where the line is said, or says in its row why it waits", () => {
    expect(inContext.length).toBeGreaterThan(0);
    const wrong = inContext.flatMap((row) => {
      if (row.status === "awaiting-test")
        return row.note?.trim() ? [] : [`${row.id} waits with no reason`];
      // A composed rule reads whole texts; tests/guards/english/composed-rules.test.ts holds it.
      if (row.test.kind === "composed") return [];
      // A judged rule is held by its saved verdicts, its catches and its
      // spares: tests/guards/english/line-rules.test.ts holds it.
      if (row.test.kind === "judged") return [];
      const tested = ["phrases", "patterns", "sentences"].includes(
        row.test.kind,
      );
      const caught = (row.catches ?? []).some(
        (line) => typeof line !== "string" && caseBreaksRule(row, line),
      );
      const spared = (row.spares ?? []).some(
        (line) => typeof line !== "string" && !caseBreaksRule(row, line),
      );
      // The one enforced journal rule predates this part and reads one line.
      if (row.id === "journal-work-line-tells-a-story-in-ten-words") return [];
      return tested && row.applies && caught && spared
        ? []
        : [`${row.id} has no spot test with a case caught and a case spared`];
    });
    expect(wrong).toEqual([]);
  });

  it("an opener asking after a school is said only where the record shows the years since", () => {
    const talk = bank("conversation");
    const asks = talk.filter((p) => /remember \{school\}/i.test(p.text));
    expect(asks.length).toBeGreaterThan(0);
    // Every such opener in the bank requires long-ago, so the rule leaves it alone.
    expect(flagged("no-do-you-remember-the-school", talk)).toEqual([]);
    // The same line in an opener without that fact is caught.
    const bare = {
      ...asks[0]!,
      uses: asks[0]!.uses.map((use) => ({ ...use, requiresFacts: [] })),
    };
    expect(ruleFlags(byId.get("no-do-you-remember-the-school")!, bare)).toBe(
      true,
    );
  });

  it("scene narration speaks as you, and a speaker in the same scene may say I", () => {
    const talk = bank("scene-talk");
    const words = bank("scene-words");
    expect(flagged("narration-person", [...talk, ...words])).toEqual([]);
    const narrator = talk.find((p) =>
      p.uses.some((use) => use.role === "narrator"),
    )!;
    const asked = talk.find(
      (p) =>
        /\bI\b/.test(p.text) && p.uses.every((use) => use.role === "asked"),
    )!;
    const rule = byId.get("narration-person")!;
    expect(ruleFlags(rule, asked)).toBe(false);
    expect(ruleFlags(rule, { ...narrator, text: asked.text })).toBe(true);
  });

  it('"can\'t afford a yes" is flagged outside a bribe offer and spared inside one', () => {
    // The one talk line this rule flagged ("Because those three can't afford
    // a yes, and you can.") went with the scenes that only talked in #8922
    // (c87a517a79), so the bank holds none now. The rule is held by its own
    // cases here, never by a count of bank lines.
    expect(flagged("trade-not-bribe", bank("scene-talk"))).toEqual([]);
    const rule = byId.get("trade-not-bribe")!;
    const line = piece(
      "afford",
      "Because those two can't afford a yes, and you can.",
      [{ subject: "s", role: "asker", move: "m", purpose: "ask-vote" }],
    );
    expect(ruleFlags(rule, line)).toBe(true);
    expect(
      ruleFlags(rule, {
        ...line,
        uses: line.uses.map((use) => ({ ...use, purpose: "bribe-offer" })),
      }),
    ).toBe(false);
  });

  it("a body is called the board only where its name is on record; the vote board is left alone", () => {
    // The three talk lines this rule used to flag (the filing clerk's "the
    // board sets the town's budget" and two more) were rewritten to read the
    // body's name in #8750 (2a68588939), so the bank holds none now. The rule
    // is held by its own cases here, never by a count of bank lines.
    const talk = bank("scene-talk");
    const rule = byId.get("body-named-as-place-names-it")!;
    const clerk = {
      bank: "scene-talk",
      key: "fixture.clerk",
      kind: "",
      move: "",
      text: "You'd run the town day to day: the departments, the budget, and whatever the board sends you to sign.",
      uses: [
        {
          subject: "scene",
          role: "asker",
          purpose: "filing-clerk",
          excludesFacts: ["body"],
        },
      ],
    } as RulePiece;
    expect(ruleFlags(rule, clerk)).toBe(true);
    // The same words where the body's name is not excluded are not flagged.
    expect(
      ruleFlags(rule, {
        ...clerk,
        uses: [{ subject: "scene", role: "asker", purpose: "filing-clerk" }],
      } as RulePiece),
    ).toBe(false);
    // A line that names the body through its slot is not flagged.
    expect(
      ruleFlags(rule, {
        ...clerk,
        text: "The {body} sets the budget and passes the local laws.",
      }),
    ).toBe(false);
    // It flags nothing the bank holds now.
    expect(flagged("body-named-as-place-names-it", talk)).toEqual([]);
    // The vote board's tally line is left alone.
    const tally = talk.find((p) => /^The board shows every name/.test(p.text))!;
    expect(ruleFlags(rule, tally)).toBe(false);
    expect(rule.status).toBe("rewrite");
  });
});

describe("the rules that judge one line", () => {
  const file = JSON.parse(
    readFileSync(
      path.resolve(__dirname, "../../data/english/line-rules.json"),
      "utf8",
    ),
  ) as LineRulesFile;
  const byId = new Map(file.rules.map((r) => [r.id, r]));
  const TESTED: readonly [string, "enforced" | "sample"][] = [
    ["question-names-its-subject", "enforced"],
    ["no-filler", "sample"],
    ["no-stock-phrases", "sample"],
    ["pressure-sounds-like-politics", "enforced"],
    ["traits-read-as-plain-sentences", "enforced"],
    ["office-named-as-people-say-it", "enforced"],
    ["regional-speech-is-word-choice-only", "enforced"],
    ["the-word-lie-never-appears", "enforced"],
  ];

  it.each(TESTED)(
    "%s is tested (%s): it flags its catches and spares its spares",
    (id, status) => {
      const r = byId.get(id)!;
      expect(r.status).toBe(status);
      expect(["phrases", "patterns"]).toContain(r.test.kind);
      expect((r.catches ?? []).length, `${id} catches`).toBeGreaterThan(0);
      expect((r.spares ?? []).length, `${id} spares`).toBeGreaterThan(0);
      for (const line of r.catches ?? [])
        expect(
          caseBreaksRule(r, line),
          `${id} must catch: ${caseText(line)}`,
        ).toBe(true);
      for (const line of r.spares ?? [])
        expect(
          caseBreaksRule(r, line),
          `${id} must spare: ${caseText(line)}`,
        ).toBe(false);
    },
  );

  it("the rules that apply to certain banks flag only there", () => {
    const traits = byId.get("traits-read-as-plain-sentences")!;
    const lie = byId.get("the-word-lie-never-appears")!;
    expect(
      ruleFlags(
        traits,
        piece("t", "Neither, much", [], { bank: "person-history" }),
      ),
    ).toBe(true);
    expect(ruleFlags(traits, piece("t", "Neither, much"))).toBe(false);
    expect(
      ruleFlags(lie, piece("l", "Lie.", [], { bank: "choice-names" })),
    ).toBe(true);
    expect(ruleFlags(lie, piece("l", "Lie.", [], { bank: "journal" }))).toBe(
      false,
    );
  });

  it("a rule left judged says in one sentence why, in its note", () => {
    const left = file.rules.filter(
      (r) =>
        r.judges === "line" &&
        r.status === "awaiting-test" &&
        r.test.kind === "judged",
    );
    expect(left.length).toBeGreaterThan(0);
    for (const r of left)
      expect(r.note ?? "", r.id).toMatch(/^.*Stays judged: [^.]+\./s);
  });
});
