import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  ruleFlags,
  textAsPiece,
  type LineRule,
} from "../../../src/english/line-rules";

/**
 * The English ban on lines that restate the place or who is there: the rule
 * `no-placing-narration` in `data/english/line-rules.json`, with the owner's
 * words and the lines it must and must not flag. This guard runs that rule
 * over everything a player can read beyond the banks the run covers: every
 * English data file, every corpus shape that would mine a line back, and
 * every string in the director, the English engine and the bench.
 */

const ROOT = path.resolve(__dirname, "../../..");

const RULE = (
  JSON.parse(
    readFileSync(path.join(ROOT, "data/english/line-rules.json"), "utf8"),
  ) as { rules: LineRule[] }
).rules.find((rule) => rule.id === "no-placing-narration")!;

const banned = (text: string) => ruleFlags(RULE, textAsPiece(text));

/** Every string value in a JSON document. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) strings(item, out);
  return out;
}

function files(dir: string, keep: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full, keep);
    return keep(full) ? [full] : [];
  });
}

/** The string literals in a source file: quoted, single-quoted and template text. */
function literals(source: string): string[] {
  return [...source.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map(
    (match) => match[1] ?? match[2] ?? "",
  );
}

describe("the English ban: no line restates the place or who is there", () => {
  it("is a rule the build fails on, with lines it catches and spares", () => {
    expect(RULE.failsBuild).toBe(true);
    expect(RULE.catches?.length).toBeGreaterThan(5);
    expect(RULE.spares?.length).toBeGreaterThan(3);
  });

  it("no English bank or corpus shape holds a banned sentence", () => {
    const sources = [
      ...files(path.join(ROOT, "data/english"), (file) =>
        file.endsWith(".json"),
      ).filter(
        // Past grading batches are the record of what the engine once said;
        // the rules file holds the banned lines it must catch.
        (file) =>
          !file.includes(`${path.sep}batches${path.sep}`) &&
          !file.endsWith("line-rules.json"),
      ),
      ...files(path.join(ROOT, "scripts/english-corpus/shapes"), (file) =>
        file.endsWith(".json"),
      ),
    ];
    const found = sources.flatMap((file) =>
      strings(JSON.parse(readFileSync(file, "utf8")))
        .filter(banned)
        .map((text) => `${path.relative(ROOT, file)}: ${text}`),
    );
    expect(found).toEqual([]);
  });

  it("no string in the director, the English engine or the bench says one", () => {
    const sources = ["src/director", "src/english", "src/bench"].flatMap(
      (dir) =>
        files(
          path.join(ROOT, dir),
          (file) =>
            /\.(ts|mjs|js|json)$/.test(file) &&
            !/\.test\.|\.browser\./.test(file),
        ),
    );
    const found = sources.flatMap((file) => {
      const text = readFileSync(file, "utf8");
      const values = file.endsWith(".json")
        ? strings(JSON.parse(text))
        : literals(text);
      return values
        .filter(banned)
        .map((value) => `${path.relative(ROOT, file)}: ${value}`);
    });
    expect(found).toEqual([]);
  });
});
