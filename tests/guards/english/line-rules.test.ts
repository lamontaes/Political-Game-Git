import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  ruleFlags,
  textBreaksRule,
  type LineRule,
} from "../../../src/english/line-rules";
import { freshRun } from "../../../scripts/words/run-rules";

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
          .filter((line) => !textBreaksRule(rule, line))
          .map((line) => `${rule.id} must catch: ${line}`),
        ...(rule.spares ?? [])
          .filter((line) => textBreaksRule(rule, line))
          .map((line) => `${rule.id} must spare: ${line}`),
      ]);
    expect(wrong).toEqual([]);
  });

  it("no enforced rule flags a line he liked, in any rule's spares or in the grades", () => {
    // A spare names no bank or move, so only a rule that applies everywhere
    // can be held to it; the grades are real pieces and hold every rule.
    const enforced = run.rules.filter(
      (rule) => rule.status === "enforced" && !rule.applies,
    );
    const liked = run.rules.flatMap((rule) => rule.spares ?? []);
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
      else expect(tested(rule), rule.id).toBe(true);
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
