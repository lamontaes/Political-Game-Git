import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  foldVerdicts,
  readStore,
  subjectsOf,
  type SubjectSource,
} from "../scripts/words/verdicts";
import { verdictId } from "../src/english/judged";
import type { LineRule, RulePiece } from "../src/english/line-rules";

/**
 * Words machine part 3 through the one store: a rule that judges a line with
 * the line it answers keys each verdict by [line before, line], and a verdict
 * on the line alone is replaced once the line has lines before it. Fixtures
 * in our own words.
 */
const RULE: LineRule = {
  id: "commits-in-pairs",
  says: "A line that commits names who, what or why.",
  judges: "exchange",
  from: [{ date: "2026-10-15", words: "his words" }],
  status: "sample",
  test: { kind: "judged" },
};

const piece = (key: string, text: string, move: string): RulePiece => ({
  bank: "scene-talk",
  key,
  text,
  kind: "spoken",
  move,
  uses: [{ subject: "scene", role: "asked", move, step: "reply" }],
});
const ASK = piece("ask", "Will you fix the bus route by Friday?", "state-ask");
const PROMISE = piece("promise", "I'll do it. I promise.", "reply-promise");

function fixture(exchangePairs: { before: string; reply: string }[]) {
  const dir = mkdtempSync(join(tmpdir(), "verdict-exchange-"));
  const judged = join(dir, "judged");
  const from = join(dir, "sheets");
  mkdirSync(judged);
  mkdirSync(from);
  const source: SubjectSource = {
    pieces: [ASK, PROMISE],
    ledger: { schema: "english-part-grades/1", batches: [], parts: {} },
    pairs: () => [],
    exchangePairs: () => exchangePairs,
  };
  return { judged, from, source };
}
const write = (dir: string, name: string, body: unknown) =>
  writeFileSync(join(dir, name), JSON.stringify(body));
const alone = verdictId(["promise"], [PROMISE.text]);
const paired = verdictId(["ask", "promise"], [ASK.text, PROMISE.text]);

describe("an exchange rule in the verdict store", () => {
  it("judges a line after the line it answers, and alone when it answers none", () => {
    expect(
      subjectsOf(RULE, fixture([{ before: "ask", reply: "promise" }]).source)
        .filter((s) => s.keys.includes("promise"))
        .map((s) => s.keys),
    ).toEqual([["ask", "promise"]]);
    expect(
      subjectsOf(RULE, fixture([]).source)
        .filter((s) => s.keys.includes("promise"))
        .map((s) => s.keys),
    ).toEqual([["promise"]]);
  });

  it("drops the line's lone verdict once it is judged after the lines it answers", () => {
    const before = fixture([]);
    write(before.from, "a.json", {
      rule: RULE.id,
      verdicts: [{ id: alone, passes: false, why: "Names nothing." }],
    });
    foldVerdicts(before.from, [RULE], before.source, before.judged);
    expect(readStore(RULE.id, before.judged).no.has(alone)).toBe(true);

    const after = fixture([{ before: "ask", reply: "promise" }]);
    const sheets = join(after.from, "next");
    mkdirSync(sheets);
    write(sheets, "b.json", {
      rule: RULE.id,
      verdicts: [{ id: paired, passes: true }],
    });
    const result = foldVerdicts(sheets, [RULE], after.source, before.judged);
    const store = readStore(RULE.id, before.judged);
    expect(store.no.has(alone)).toBe(false);
    expect(store.yes.has(paired)).toBe(true);
    expect(result.perRule[RULE.id]).toEqual({ yes: 1, no: 0, dropped: 1 });
  });
});
