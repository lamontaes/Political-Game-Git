import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A race's result brought up in talk is read on one path: bring-it-up's
// `resultLean` (the teller's lean against the winner's party, checked by their
// ballot) and `electionLines`, which set the facts the bank's lines require.
// A line that claims a ballot, a shared side or a fair race plays only where
// that path sets the fact, and no line says a figure, a place or a first name.
const root = process.cwd();
const BANK = "data/english/parts/bring-it-up.json";
const READER = "src/director/bring-it-up.ts";

type Part = {
  key: string;
  text: string;
  uses: { subject: string; role: string; requiresFacts?: string[] }[];
};
const parts = (
  JSON.parse(readFileSync(join(root, BANK), "utf8")) as { parts: Part[] }
).parts.filter((part) =>
  part.uses.some((use) => use.subject === "lean" || use.subject === "election"),
);
const reader = readFileSync(join(root, READER), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(root, path)).isDirectory()) return sourceFiles(path);
    return /\.(?:ts|mjs)$/.test(name) && !/\.test\.ts$/.test(name)
      ? [path]
      : [];
  });
}

describe("a race's result brought up in talk", () => {
  it("has its lean and result lines in the bank", () => {
    const roles = new Set(
      parts.flatMap((part) => part.uses.map((u) => `${u.subject}:${u.role}`)),
    );
    expect([...roles].sort()).toEqual([
      "election:result",
      "lean:against",
      "lean:with",
    ]);
  });

  it("requires only facts the one reading path sets", () => {
    const set = new Set(
      [...reader.matchAll(/\b(\w+): \{\s*text:/g)].map((m) => m[1]!),
    );
    for (const part of parts)
      for (const key of part.uses.flatMap((u) => u.requiresFacts ?? []))
        expect(set.has(key), `${part.key} requires ${key}`).toBe(true);
  });

  it("says no figure, place or first name", () => {
    for (const part of parts)
      expect(part.text, part.key).not.toMatch(/\d|\{(?:place|first|seat)\}/);
  });

  it("names the winner at most once in a line", () => {
    for (const part of parts)
      expect(
        (part.text.match(/\{winner\}/g) ?? []).length,
        part.key,
      ).toBeLessThanOrEqual(1);
  });

  it("reads where a teller stands on a result in one place", () => {
    const callers = [...sourceFiles("src"), ...sourceFiles("scripts")].filter(
      (path) => /\bresultLean\(/.test(readFileSync(join(root, path), "utf8")),
    );
    expect(callers).toEqual([READER]);
  });
});
