import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  foldVerdicts,
  readStore,
  storeFiles,
  subjectsOf,
  type SubjectSource,
} from "../scripts/words/verdicts";
import { readRules } from "../scripts/words/run-rules";
import { idsHash, verdictId, type JudgedFile } from "../src/english/judged";
import { REPLY_FOLLOWS_RUBRIC, REPLY_RULE } from "../src/english/reply-follows";
import type { LineRule, RulePiece } from "../src/english/line-rules";

/**
 * The one store every rule a reviewer judges uses (`scripts/words/verdicts.ts`):
 * a rule about one line and the reply rule (pairs) through the same fold.
 * Fixtures are written in our own words; the rule rows are the real ones.
 */
const RULES = readRules();
const LINE_RULE = "no-explaining";
const lineRule = RULES.find((rule) => rule.id === LINE_RULE)!;

const piece = (key: string, text: string): RulePiece => ({
  bank: "scene-talk",
  key,
  text,
  kind: "spoken",
  move: "reply-agree",
  uses: [{ subject: "scene", role: "r", move: "m" }],
});

function fixture(pieces: RulePiece[]) {
  const dir = mkdtempSync(join(tmpdir(), "verdict-store-"));
  const judged = join(dir, "judged");
  const from = join(dir, "sheets");
  mkdirSync(judged);
  mkdirSync(from);
  const source: SubjectSource = {
    pieces,
    ledger: { schema: "english-part-grades/1", batches: [], parts: {} },
    pairs: () => [
      { before: "b1", reply: "r1" },
      { before: "b1", reply: "r2" },
    ],
  };
  return { judged, from, source };
}

const LINES = [
  piece("l1", "Well, you know, I mean it."),
  piece("l2", "The levy pays for the bridge."),
  piece("b1", "Will you sign?"),
  piece("r1", "Show me the page first."),
  piece("r2", "I already did."),
];
const id = (key: string, text: string) => verdictId([key], [text]);
const write = (from: string, name: string, body: unknown) =>
  writeFileSync(join(from, name), JSON.stringify(body));

describe("the verdict store: one store, one fold", () => {
  it("a rule's subjects are the lines it applies to, and the reply rule's are pairs", () => {
    const { source } = fixture(LINES);
    expect(lineRule.test.kind, LINE_RULE).toBe("judged");
    expect(subjectsOf(lineRule, source).map((s) => s.keys)).toEqual(
      LINES.map((p) => [p.key]),
    );
    const reply = RULES.find((rule) => rule.id === REPLY_RULE)!;
    expect(subjectsOf(reply, source)[0]).toEqual({
      id: verdictId(
        ["b1", "r1"],
        ["Will you sign?", "Show me the page first."],
      ),
      keys: ["b1", "r1"],
    });
  });

  it("folds a line rule's verdicts in the reply store's shape: no verdicts with reasons, a yes hash, the count", () => {
    const { judged, from, source } = fixture(LINES);
    write(from, "a.json", {
      rule: LINE_RULE,
      verdicts: [
        { id: id("l1", LINES[0]!.text), passes: false, why: "Pure padding." },
        { id: id("l2", LINES[1]!.text), passes: true },
      ],
    });
    const result = foldVerdicts(from, RULES, source, judged);
    expect(result.perRule[LINE_RULE]).toEqual({ yes: 1, no: 1, dropped: 0 });
    const file = JSON.parse(
      readFileSync(join(judged, `${LINE_RULE}.json`), "utf8"),
    ) as JudgedFile;
    expect(file.rule).toBe(LINE_RULE);
    expect(file.rubric).toBe(lineRule.says);
    expect(file.judged).toBe(2);
    expect(file.no).toEqual({
      [id("l1", LINES[0]!.text)]: { keys: ["l1"], why: "Pure padding." },
    });
    expect(file.yesHash).toBe(idsHash([id("l2", LINES[1]!.text)]));
  });

  it("the reply rule folds through the same store, with its own rubric", () => {
    const { judged, from, source } = fixture(LINES);
    const pair = verdictId(["b1", "r2"], ["Will you sign?", "I already did."]);
    write(from, "p.json", {
      rule: REPLY_RULE,
      verdicts: [{ id: pair, passes: false, why: "A has not done anything." }],
    });
    foldVerdicts(from, RULES, source, judged);
    const file = JSON.parse(
      readFileSync(join(judged, "reply-follows.json"), "utf8"),
    ) as JudgedFile;
    expect(file.rubric).toBe(REPLY_FOLLOWS_RUBRIC);
    expect(file.no[pair]!.keys).toEqual(["b1", "r2"]);
  });

  it("folding twice changes nothing", () => {
    const { judged, from, source } = fixture(LINES);
    write(from, "a.json", {
      rule: LINE_RULE,
      verdicts: [
        { id: id("l1", LINES[0]!.text), passes: false, why: "Padding." },
      ],
    });
    foldVerdicts(from, RULES, source, judged);
    const names = [`${LINE_RULE}.json`, `${LINE_RULE}.yes.txt`];
    const once = names.map((n) => readFileSync(join(judged, n), "utf8"));
    foldVerdicts(from, RULES, source, judged);
    expect(names.map((n) => readFileSync(join(judged, n), "utf8"))).toEqual(
      once,
    );
  });

  it("refuses, writing nothing, an id the rule does not judge, a no with no reason, and an unknown rule", () => {
    const { judged, from, source } = fixture(LINES);
    for (const body of [
      {
        rule: LINE_RULE,
        verdicts: [{ id: "notanid0000", passes: false, why: "x" }],
      },
      {
        rule: LINE_RULE,
        verdicts: [{ id: id("l1", LINES[0]!.text), passes: false }],
      },
      { rule: "no-such-rule", verdicts: [] },
    ]) {
      write(from, "a.json", body);
      expect(() => foldVerdicts(from, RULES, source, judged)).toThrow(
        /refused/,
      );
      expect(() => readFileSync(join(judged, `${LINE_RULE}.json`))).toThrow();
    }
  });

  it("drops a verdict when its line's words change, and the changed line waits", () => {
    const { judged, from, source } = fixture(LINES);
    write(from, "a.json", {
      rule: LINE_RULE,
      verdicts: [
        { id: id("l1", LINES[0]!.text), passes: false, why: "Padding." },
        { id: id("l2", LINES[1]!.text), passes: true },
      ],
    });
    foldVerdicts(from, RULES, source, judged);
    const changed = [piece("l1", "I mean it."), piece("l2", "The levy pays.")];
    const result = foldVerdicts(
      undefined,
      RULES,
      { ...source, pieces: changed },
      judged,
    );
    expect(result.perRule[LINE_RULE]).toEqual({ yes: 0, no: 0, dropped: 2 });
    expect(readStore(LINE_RULE, judged).no.size).toBe(0);
  });

  it("a later verdict replaces an earlier one", () => {
    const { judged, from, source } = fixture(LINES);
    const l1 = id("l1", LINES[0]!.text);
    write(from, "a.json", {
      rule: LINE_RULE,
      verdicts: [{ id: l1, passes: false, why: "Padding." }],
    });
    foldVerdicts(from, RULES, source, judged);
    write(from, "a.json", {
      rule: LINE_RULE,
      verdicts: [{ id: l1, passes: true }],
    });
    foldVerdicts(from, RULES, source, judged);
    const store = readStore(LINE_RULE, judged);
    expect(store.no.size).toBe(0);
    expect(store.yes.has(l1)).toBe(true);
  });

  it("the store's bytes are what storeFiles says", () => {
    const store = { no: new Map(), yes: new Set(["b", "a"]) };
    expect(storeFiles(lineRule as LineRule, store).yesText).toBe("a\nb\n");
  });
});
