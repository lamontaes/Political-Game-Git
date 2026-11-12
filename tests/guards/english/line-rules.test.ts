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
import { freshRun, roseMessage } from "../../../scripts/words/run-rules";
import {
  REPLY_FOLLOWS_RUBRIC,
  REPLY_RULE,
} from "../../../src/english/reply-follows";
import {
  idsHash,
  verdictId,
  type JudgedFile,
} from "../../../src/english/judged";
import {
  JUDGED_DIR,
  rubricOf,
  storeName,
  storeRule,
} from "../../../scripts/words/verdicts";

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
  !["place", "judged", "composed"].includes(rule.test.kind);

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
      else if (rule.test.kind === "composed")
        // A composed rule reads whole texts, never a bank line: its checks are
        // registered and fixture-tested in composed-rules.test.ts.
        expect(rule.status, rule.id).not.toBe("enforced");
      else if (rule.test.kind === "judged") {
        // A judged rule leaves awaiting-test with one line it must catch, one
        // it must leave alone, and its first verdicts folded.
        const store = path.join(ROOT, JUDGED_DIR, `${storeName(rule)}.json`);
        expect((rule.catches ?? []).length, rule.id).toBeGreaterThan(0);
        expect((rule.spares ?? []).length, rule.id).toBeGreaterThan(0);
        expect(existsSync(store), `${rule.id} has no verdicts folded`).toBe(
          true,
        );
        const file = JSON.parse(readFileSync(store, "utf8")) as JudgedFile;
        expect(file.judged, rule.id).toBeGreaterThan(0);
      } else if (rule.test.kind === "place") {
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

  it("no judged rule has more lines waiting for a verdict than committed", () => {
    // A new or changed line comes with its verdicts: the count only falls.
    expect(run.rose.map(roseMessage)).toEqual([]);
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

describe("line rules: the saved verdicts", () => {
  const stores = run.rules.filter(
    (rule) =>
      storeRule(rule) &&
      existsSync(path.join(ROOT, JUDGED_DIR, `${storeName(rule)}.json`)),
  );
  const read = (name: string) =>
    readFileSync(path.join(ROOT, JUDGED_DIR, name), "utf8");
  const text = new Map(run.pieces.map((piece) => [piece.key, piece.text]));

  it("the reply rule's verdicts are in the store", () => {
    expect(stores.map((rule) => rule.id)).toContain(REPLY_RULE);
  });

  it("every verdict is about lines the bank holds in those words (npm run words:verdicts drops the rest)", () => {
    const stale = stores.flatMap((rule) =>
      Object.entries(
        (JSON.parse(read(`${storeName(rule)}.json`)) as JudgedFile).no,
      )
        .filter(
          ([id, row]) =>
            row.keys.some((key) => !text.has(key)) ||
            verdictId(
              row.keys,
              row.keys.map((key) => text.get(key)!),
            ) !== id,
        )
        .map(
          ([, row]) =>
            `${rule.id}: ${row.keys.join(" then ")} changed or is gone; run npm run words:verdicts`,
        ),
    );
    expect(stale).toEqual([]);
  });

  it("each store's rubric is its rule's question, word for word, and every no has a reason", () => {
    for (const rule of stores) {
      const file = JSON.parse(read(`${storeName(rule)}.json`)) as JudgedFile;
      expect(file.rule).toBe(rule.id);
      expect(file.rubric, rule.id).toBe(rubricOf(rule));
      for (const row of Object.values(file.no))
        expect(row.why.trim(), rule.id).not.toBe("");
    }
    expect(rubricOf(run.rules.find((r) => r.id === REPLY_RULE)!)).toBe(
      REPLY_FOLLOWS_RUBRIC,
    );
  });

  it("each store agrees with itself: the count judged, and the hash and order of the yes list", () => {
    for (const rule of stores) {
      const file = JSON.parse(read(`${storeName(rule)}.json`)) as JudgedFile;
      const yes = read(`${storeName(rule)}.yes.txt`)
        .split("\n")
        .filter(Boolean);
      const no = Object.keys(file.no);
      expect(file.judged, rule.id).toBe(yes.length + no.length);
      expect(yes, rule.id).toEqual([...yes].sort());
      expect(new Set([...yes, ...no]).size, rule.id).toBe(
        yes.length + no.length,
      );
      expect(file.yesHash, rule.id).toBe(idsHash(yes));
    }
  });

  it("the run reports the reply rule and pulls nothing for it", () => {
    const row = run.result.perRule[REPLY_RULE]!;
    const file = JSON.parse(read("reply-follows.json")) as JudgedFile;
    expect(row.pulled + row.waiting + row.flagged).toBe(0);
    expect(row.report!.judged).toBe(file.judged);
  });
});
