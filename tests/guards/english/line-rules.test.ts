import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  caseBreaksRule,
  caseText,
  ruleFlags,
  textBreaksRule,
  type LineRule,
} from "../../../src/english/line-rules";
import { freshRun } from "../../../scripts/words/run-rules";
import {
  REPLY_FOLLOWS_RUBRIC,
  type ReplyFollowsFile,
} from "../../../src/english/reply-follows";
import { idsHash, pairId } from "../../../src/english/reply-pairs";
import { bankKeys } from "../../../scripts/words/reply-pairs";

/**
 * The owner's notes as rules (`data/english/line-rules.json`, design in
 * `docs/design/words-machine.md`). Every rule is tested against the lines he
 * rejected and the lines he liked, and the rules run over every bank line.
 * A new bank line that breaks an enforced rule fails here by name until
 * `npm run words:rules` has pulled it; a rewrite that passes the rules does
 * not fail.
 */

const ROOT = path.resolve(__dirname, "../../..");
const run = freshRun();
const tested = (rule: LineRule) =>
  !["place", "judged"].includes(rule.test.kind);

describe("line rules: each rule does what it says", () => {
  it("flags every line it must catch and spares every line it must not", () => {
    const wrong = run.rules
      .filter(tested)
      .flatMap((rule) => [
        ...(rule.catches ?? [])
          .filter((line) => !caseBreaksRule(rule, line))
          .map((line) => `${rule.id} must catch: ${JSON.stringify(line)}`),
        ...(rule.spares ?? [])
          .filter((line) => caseBreaksRule(rule, line))
          .map((line) => `${rule.id} must spare: ${JSON.stringify(line)}`),
      ]);
    expect(wrong).toEqual([]);
  });

  it("no enforced rule flags a line he liked, in any rule's spares or in the grades", () => {
    // A spare names no bank or move, so only a rule that applies everywhere
    // can be held to it; the grades are real pieces and hold every rule.
    const enforced = run.rules.filter(
      (rule) => rule.status === "enforced" && !rule.applies,
    );
    const liked = run.rules.flatMap((rule) =>
      (rule.spares ?? []).map(caseText),
    );
    const wrong = enforced.flatMap((rule) =>
      liked
        .filter((line) => textBreaksRule(rule, line))
        .map((line) => `${rule.id} flags a line he liked: ${line}`),
    );
    expect(wrong).toEqual([]);
    expect(run.result.conflicts).toEqual([]);
  });

  it('"No comment" is fine (Oct 15) and no enforced rule flags it', () => {
    const enforced = run.rules.filter((rule) => rule.status === "enforced");
    for (const line of ["No comment.", "No comment at this time."])
      expect(
        enforced.filter((rule) => textBreaksRule(rule, line)).map((r) => r.id),
        line,
      ).toEqual([]);
  });

  it("every rule says where it comes from, in at most 240 characters", () => {
    const wrong = run.rules.flatMap((rule) => [
      ...(rule.from.length === 0 && !(rule.research ?? []).length
        ? [`${rule.id} has no words of his and no research source`]
        : []),
      ...rule.from
        .filter((from) => from.words.length > 240 || !from.words.trim())
        .map((from) => `${rule.id}: ${from.words.slice(0, 40)}`),
    ]);
    expect(wrong).toEqual([]);
    expect(new Set(run.rules.map((rule) => rule.id)).size).toBe(
      run.rules.length,
    );
  });

  it("every whole line he rejected carries its own words, in the same order", () => {
    for (const rule of run.rules)
      if (rule.test.kind === "sentences") {
        expect(rule.from.length, rule.id).toBe(rule.test.sentences.length);
        expect(
          rule.from.every((from) => from.words.trim().length > 0),
          rule.id,
        ).toBe(true);
      }
  });

  it("an example of a line faulted for its place names the line, his words and the date", () => {
    for (const rule of run.rules)
      for (const example of rule.examples ?? []) {
        expect(example.line.trim(), rule.id).not.toBe("");
        expect(example.words.length, rule.id).toBeLessThanOrEqual(240);
        expect(example.date, rule.id).not.toBe("");
      }
  });

  it("a rule that is not enforced has a test the run can read or waits for its step", () => {
    for (const rule of run.rules)
      if (rule.status === "awaiting-test")
        expect(["place", "judged"], rule.id).toContain(rule.test.kind);
      else if (rule.test.kind === "place") {
        // An enforced place rule is judged: it names the verdict file its reader folds.
        expect(rule.test.reads, rule.id).toBeTruthy();
        expect(existsSync(path.join(ROOT, rule.test.reads!)), rule.id).toBe(
          true,
        );
      } else expect(tested(rule), rule.id).toBe(true);
  });
});

describe("line rules: the run over every bank line", () => {
  it("data/english/pulled.json is a fresh run", () => {
    const file = JSON.parse(
      readFileSync(path.join(ROOT, "data/english/pulled.json"), "utf8"),
    ) as typeof run.pulledFile;
    const says = new Map(run.rules.map((rule) => [rule.id, rule.says]));
    const message: string[] = [];
    for (const group of ["pulled", "waiting", "sample"] as const)
      for (const [key, ids] of Object.entries(run.pulledFile[group]))
        if (JSON.stringify(file[group][key]) !== JSON.stringify(ids))
          for (const id of ids)
            message.push(
              `${key} breaks rule ${id}: ${says.get(id)} (${group}; fix the line, or run npm run words:rules)`,
            );
    for (const group of ["pulled", "waiting", "sample"] as const)
      for (const key of Object.keys(file[group]))
        if (!run.pulledFile[group][key])
          message.push(
            `${key} is in pulled.json (${group}) but no rule flags it now; run npm run words:rules`,
          );
    expect(message).toEqual([]);
    expect(file).toEqual(run.pulledFile);
  });

  it("no spot is left with no playable line", () => {
    expect(run.result.totals.spotsMadeSilent).toBe(0);
  });

  it("no bank line breaks a rule that used to fail the build, pulled or not", () => {
    const hard = run.rules.filter((rule) => rule.failsBuild);
    expect(hard.length).toBeGreaterThan(0);
    const found = run.pieces.flatMap((piece) =>
      hard
        .filter((rule) => ruleFlags(rule, piece))
        .map((rule) => `${piece.key} breaks rule ${rule.id}: ${rule.says}`),
    );
    expect(found).toEqual([]);
  });
});

describe("line rules: the reply verdicts", () => {
  const read = (name: string) =>
    readFileSync(path.join(ROOT, "data/english/judged", name), "utf8");
  const file = JSON.parse(read("reply-follows.json")) as ReplyFollowsFile;
  const yes = read("reply-follows.yes.txt").split("\n").filter(Boolean);

  it("every line a verdict names is a current bank piece (npm run words:verdicts drops the rest)", () => {
    const keys = bankKeys();
    const gone = Object.entries(file.no).flatMap(([reply, before]) =>
      [reply, ...before].filter((key) => !keys.has(key)),
    );
    expect(gone).toEqual([]);
  });

  it("the rubric in the verdict file is the rubric the judges were given", () => {
    expect(file.rubric).toBe(REPLY_FOLLOWS_RUBRIC);
    expect(file.rule).toBe("reply-follows-the-line-before");
  });

  it("the verdict files agree: the count judged, and the hash and order of the yes list", () => {
    const no = Object.entries(file.no).flatMap(([reply, before]) =>
      before.map((key) => pairId(key, reply)),
    );
    expect(file.judged).toBe(yes.length + no.length);
    expect(yes).toEqual([...yes].sort());
    expect(new Set([...yes, ...no]).size).toBe(yes.length + no.length);
    expect(file.yesHash).toBe(idsHash(yes));
  });

  it("the run reports the rule and pulls nothing for it", () => {
    const row = run.result.perRule["reply-follows-the-line-before"]!;
    expect(row.pulled + row.waiting + row.flagged).toBe(0);
    expect(row.report!.judged).toBe(file.judged);
  });
});
