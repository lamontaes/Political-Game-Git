import { describe, expect, it } from "vitest";
import type {
  SceneTalk,
  SceneTalkLine,
  TreeNode,
} from "../src/director/scene-talk";
import {
  answerableAsks,
  askClass,
  type FactPart,
} from "../src/english/answerable-asks";
import bank from "../data/english/parts/scene-talk.json" with { type: "json" };
import baseline from "./english-answerable-asks-baseline.json" with { type: "json" };
import { buildTalks } from "./support/scene-talk-fixture";

/**
 * Rule 108: a question is offered only if the record can answer it. The
 * planted cases (our own words) prove the check refuses what it must and
 * spares what it must; the second test reads every composed scene talk and
 * fails on an asking line that is not in the baseline, which may only shrink.
 */

let n = 0;
function line(
  text: string,
  role: "asker" | "asked",
  over: Partial<SceneTalkLine> = {},
): SceneTalkLine {
  n += 1;
  return {
    n,
    step: "reply",
    role,
    speaker: role,
    text,
    move: "ask",
    register: "scene-talk",
    key: "k",
    purpose: "planted",
    round: 1,
    parts: [`planted.${n}`],
    slotRecordIds: [],
    asks: /\?$/.test(text),
    ...over,
  } as SceneTalkLine;
}
const leaf = (lines: SceneTalkLine[]): TreeNode => ({ lines, replies: [] });
const talkOf = (tree: TreeNode): SceneTalk =>
  ({ purpose: "planted", intro: [], tree }) as unknown as SceneTalk;
const guarded = (
  line: SceneTalkLine,
  facts: string[] = [],
): [string, FactPart] => [
  line.parts[0]!,
  { key: line.parts[0]!, requiresFacts: facts },
];

describe("rule 108: planted cases", () => {
  it("sorts a courtesy, a challenge and a request for information", () => {
    expect(askClass("How are you?")).toBe(1);
    expect(askClass("Are you threatening me?")).toBe(3);
    expect(askClass("Where did the money go?")).toBe(4);
  });

  it("refuses a question whose answer carries no record fact", () => {
    const ask = line("What did the doctor say?", "asker");
    const answer = line("It's been a long week.", "asked", { move: "answer" });
    const { fails } = answerableAsks(
      [talkOf(leaf([ask, answer]))],
      new Map([guarded(answer)]),
    );
    expect(fails.map((f) => f.why)).toEqual([
      "the answer (answer) carries no record fact",
    ]);
  });

  it("passes the same question when its answer is guarded on a record fact", () => {
    const ask = line("What did the doctor say?", "asker");
    const answer = line("It's his heart.", "asked", { move: "answer" });
    const { fails } = answerableAsks(
      [talkOf(leaf([ask, answer]))],
      new Map([guarded(answer, ["health-record"])]),
    );
    expect(fails).toEqual([]);
  });

  it("refuses a scene that ends on a question or on an invitation to ask", () => {
    const ask = line("How would you pay for it?", "asker");
    const invite = line(
      "Sure. I wrote it, so ask me anything about it.",
      "asked",
      { asks: false },
    );
    expect(answerableAsks([talkOf(leaf([ask]))], new Map()).fails).toHaveLength(
      1,
    );
    const invited = answerableAsks([talkOf(leaf([invite]))], new Map()).fails;
    expect(invited.map((f) => f.why)).toEqual([
      "the scene ends on the invitation",
    ]);
  });

  it("spares a courtesy and a challenge a reply follows", () => {
    const hello = line("How are you?", "asker");
    const poke = line("Are you threatening me?", "asker");
    const reply = line("No.", "asked", { move: "reply" });
    const tree = leaf([hello, poke, reply]);
    expect(answerableAsks([talkOf(tree)], new Map()).fails).toEqual([]);
  });
});

describe("rule 108: every composed talk", () => {
  it("has no asking line without an answer from a record beyond the baseline", () => {
    const parts = new Map<string, FactPart>();
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") {
        const row = o as FactPart & { text?: string };
        if (typeof row.key === "string" && typeof row.text === "string")
          parts.set(row.key, row);
        Object.values(o).forEach(walk);
      }
    };
    walk(bank);
    const { fails } = answerableAsks(buildTalks(), parts);
    const known = new Set(baseline.failing);
    const fresh = [
      ...new Set(
        fails.map((f) => `${f.line.parts[0] ?? f.line.text} | ${f.why}`),
      ),
    ].filter((key) => !known.has(key));
    expect(fresh).toEqual([]);
  }, 240_000);
});
