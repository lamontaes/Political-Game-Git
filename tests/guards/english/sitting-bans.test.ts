import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  ruleFlags,
  textAsPiece,
  type LineRule,
} from "../../../src/english/line-rules";

/**
 * The owner's pattern bans (owner, Oct 15 to Oct 28; the words and director
 * plan, approved Oct 28, section 2: "When you say 'remove every X is home,'
 * that is a ban on a pattern, not a grade on a line") now live as rules in
 * `data/english/line-rules.json`, each with his words and the lines it must
 * catch and spare; `line-rules.test.ts` checks them and that no bank line
 * breaks one. What stays here is what is not a line rule: a corpus shape that
 * would mine a banned line back, and the director's own spoken date.
 */

const ROOT = path.resolve(__dirname, "../../..");

const RULES = (
  JSON.parse(
    readFileSync(path.join(ROOT, "data/english/line-rules.json"), "utf8"),
  ) as { rules: LineRule[] }
).rules;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

describe("the owner's pattern bans hold outside the banks", () => {
  it("no corpus shape would mine a banned line back", () => {
    const shapes = path.join(ROOT, "scripts/english-corpus/shapes");
    const found = files(shapes)
      .filter((file) => file.endsWith(".json"))
      .flatMap((file) => {
        const text = readFileSync(file, "utf8");
        // The rules that apply in every bank and every move, as they did before.
        return RULES.filter(
          (rule) =>
            rule.failsBuild &&
            !rule.applies &&
            ruleFlags(rule, textAsPiece(text)),
        ).map((rule) => `${rule.id}: ${path.relative(ROOT, file)}`);
      });
    expect(found).toEqual([]);
  });

  it("the director says a date in speech with the director's own spoken date", () => {
    // The kernel's spokenDate always says the year; the director's drops it
    // within the year, as people say a date.
    const found = files(path.join(ROOT, "src/director"))
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .filter((file) =>
        /import \{[^}]*\bspokenDate\b[^}]*\} from "\.\.\/core2\/kernel\/dates"/.test(
          readFileSync(file, "utf8"),
        ),
      )
      .map((file) => path.relative(ROOT, file));
    expect(found).toEqual([]);
  });
});
