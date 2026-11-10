import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  foldVerdicts,
  readVerdicts,
  writeVerdicts,
} from "../scripts/words/reply-verdicts";
import { idsHash, pairId, type ReplyPair } from "../src/english/reply-pairs";
import type { ReplyFollowsFile } from "../src/english/reply-follows";

const pair = (before: string, reply: string): ReplyPair => ({
  before,
  reply,
  purpose: "p",
  key: "k",
  step: "reply",
  move: "m",
});
const PAIRS = [pair("b1", "r1"), pair("b1", "r2"), pair("b2", "r1")];
const KEYS = new Set(["b1", "b2", "r1", "r2"]);

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "reply-fold-"));
  const judged = join(dir, "judged");
  const from = join(dir, "sheets");
  mkdirSync(judged);
  mkdirSync(from);
  writeVerdicts({ no: new Map(), yes: new Set() }, judged);
  return { judged, from };
}

const sheet = (rows: [string, string, boolean, string?][]) => ({
  purpose: "p",
  verdicts: rows.map(([before, reply, follows, why]) => ({
    id: pairId(before, reply),
    follows,
    ...(why ? { why } : {}),
  })),
});

describe("folding judges' verdict files", () => {
  it("writes the no pairs by key, the yes pairs by id, the reasons and a matching hash", () => {
    const { judged, from } = fixture();
    writeFileSync(
      join(from, "p.json"),
      JSON.stringify(
        sheet([
          ["b1", "r1", true],
          ["b1", "r2", false, "answers a question nobody asked"],
          ["b2", "r1", false, "agrees with nothing"],
        ]),
      ),
    );
    const result = foldVerdicts(from, PAIRS, KEYS, judged);
    expect(result).toEqual({ sheets: 1, yes: 1, no: 2, dropped: 0 });
    const file = JSON.parse(
      readFileSync(join(judged, "reply-follows.json"), "utf8"),
    ) as ReplyFollowsFile;
    expect(file.no).toEqual({ r1: ["b2"], r2: ["b1"] });
    expect(file.judged).toBe(3);
    expect(file.yesHash).toBe(idsHash([pairId("b1", "r1")]));
    expect(readFileSync(join(judged, "reply-follows.yes.txt"), "utf8")).toBe(
      `${pairId("b1", "r1")}\n`,
    );
    expect(
      readFileSync(join(judged, "reply-follows.why.json"), "utf8"),
    ).toContain("answers a question nobody asked");
  });

  it("is idempotent: folding the same directory twice changes nothing", () => {
    const { judged, from } = fixture();
    writeFileSync(
      join(from, "p.json"),
      JSON.stringify(
        sheet([
          ["b1", "r2", false, "no"],
          ["b1", "r1", true],
        ]),
      ),
    );
    foldVerdicts(from, PAIRS, KEYS, judged);
    const names = ["", ".yes.txt", ".why.json"].map((x) =>
      join(judged, `reply-follows${x === "" ? ".json" : x}`),
    );
    const once = names.map((name) => readFileSync(name, "utf8"));
    foldVerdicts(from, PAIRS, KEYS, judged);
    expect(names.map((name) => readFileSync(name, "utf8"))).toEqual(once);
  });

  it("refuses an id the pairs do not hold and writes nothing", () => {
    const { judged, from } = fixture();
    const before = readFileSync(join(judged, "reply-follows.json"), "utf8");
    writeFileSync(
      join(from, "p.json"),
      JSON.stringify({
        purpose: "p",
        verdicts: [{ id: "notapairid00", follows: false, why: "x" }],
      }),
    );
    expect(() => foldVerdicts(from, PAIRS, KEYS, judged)).toThrow(
      /do not hold/,
    );
    expect(readFileSync(join(judged, "reply-follows.json"), "utf8")).toBe(
      before,
    );
  });

  it("a later verdict replaces an earlier one, and a verdict about a deleted line is dropped", () => {
    const { judged, from } = fixture();
    writeFileSync(
      join(from, "p.json"),
      JSON.stringify(sheet([["b1", "r2", false, "first"]])),
    );
    foldVerdicts(from, PAIRS, KEYS, judged);
    writeFileSync(
      join(from, "p.json"),
      JSON.stringify(sheet([["b1", "r2", true]])),
    );
    foldVerdicts(from, PAIRS, KEYS, judged);
    expect(readVerdicts(judged).no.size).toBe(0);
    expect(readVerdicts(judged).yes.has(pairId("b1", "r2"))).toBe(true);
    writeFileSync(
      join(from, "p.json"),
      JSON.stringify(sheet([["b2", "r1", false, "no"]])),
    );
    foldVerdicts(from, PAIRS, KEYS, judged);
    // r1 is deleted from the bank: its verdict goes on the next fold.
    const result = foldVerdicts(
      from,
      PAIRS,
      new Set(["b1", "b2", "r2"]),
      judged,
    );
    expect(result.dropped).toBe(1);
    expect(readVerdicts(judged).no.size).toBe(0);
  });
});
