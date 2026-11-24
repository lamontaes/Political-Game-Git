import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * A register entry is never glued to another (Nov 9: `gov.json` and the
 * director's `stopgaps.json` each lost an entry that way). `JSON.parse` hides
 * it: when two entries run together into one object their keys repeat, the
 * later value silently wins and the earlier entry vanishes from the register.
 * This guard reads every stopgap family file and the director's register with
 * a scanner that fails on a repeated key inside any object, naming the file,
 * the line and the key.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const FAMILY_DIR = join(REPO_ROOT, "src/core2/data/stopgaps");
const FILES = [
  ...readdirSync(FAMILY_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => `src/core2/data/stopgaps/${name}`),
  "src/director/data/stopgaps.json",
];

export type DuplicateKey = { line: number; key: string; firstLine: number };

/** Every key that repeats inside one object of a JSON text, with its line. */
export function duplicateKeys(text: string): DuplicateKey[] {
  const found: DuplicateKey[] = [];
  // One frame per open container: an object's keys with the line each first
  // appeared on, or null for an array.
  const stack: (Map<string, number> | null)[] = [];
  let line = 1;
  let i = 0;
  // Whether the next string in the open object is a key (after `{` or `,`).
  let expectKey = false;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "\n") {
      line += 1;
      i += 1;
    } else if (ch === "{") {
      stack.push(new Map());
      expectKey = true;
      i += 1;
    } else if (ch === "[") {
      stack.push(null);
      expectKey = false;
      i += 1;
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      expectKey = false;
      i += 1;
    } else if (ch === ",") {
      expectKey = stack[stack.length - 1] instanceof Map;
      i += 1;
    } else if (ch === '"') {
      const start = i;
      const startLine = line;
      i += 1;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === "\\") i += 1;
        if (text[i] === "\n") line += 1;
        i += 1;
      }
      i += 1;
      const top = stack[stack.length - 1];
      if (expectKey && top instanceof Map) {
        const key = JSON.parse(text.slice(start, i)) as string;
        const seen = top.get(key);
        if (seen !== undefined)
          found.push({ line: startLine, key, firstLine: seen });
        else top.set(key, startLine);
        expectKey = false;
      }
    } else {
      i += 1;
    }
  }
  return found;
}

describe("a register entry is never glued to another", () => {
  it("finds a repeated key and the line it repeats on", () => {
    const glued = `[\n  {\n    "id": "A",\n    "status": "open",\n    "id": "B"\n  }\n]`;
    expect(duplicateKeys(glued)).toEqual([
      { line: 5, key: "id", firstLine: 3 },
    ]);
    expect(
      duplicateKeys(`{"a": {"id": 1}, "b": {"id": 2}, "c": ["id", "id"]}`),
    ).toEqual([]);
  });

  it("holds in every stopgap family file and the director's register", () => {
    const problems: string[] = [];
    for (const file of FILES)
      for (const dup of duplicateKeys(
        readFileSync(join(REPO_ROOT, file), "utf8"),
      ))
        problems.push(
          `${file}:${dup.line}: "${dup.key}" repeats the one on line ${dup.firstLine} (two entries run together?)`,
        );
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
