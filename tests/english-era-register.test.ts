import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * EM-3, the era and register check for the mined English banks. A part must
 * come from a record of the current era (2015 on, never dated after today),
 * use no archaic wording, and fit its kind: a spoken part carries no marks
 * that only exist on paper, such as section numbers or a bill's "--" heads.
 */

const PARTS_DIR = path.resolve(__dirname, "../data/english/parts");
const COUNTS_DIR = path.resolve(__dirname, "../data/english/counts");
const ERA_START = "2015-01-01";
const TODAY = new Date().toISOString().slice(0, 10);

const ARCHAIC = [
  "whilst",
  "amongst",
  "thee",
  "thou",
  "thy",
  "hath",
  "doth",
  "henceforth",
  "heretofore",
  "forthwith",
  "wherefore",
  "ere",
];
const PAPER_ONLY = [/--/, /\bSec\.\s*\d/, /\(\w\)/, /§/, /``|''/];

type Part = {
  key: string;
  kind: "spoken" | "written";
  text: string;
  source: { date: string };
};
type Bank = { register: string; parts: Part[] };

const banks = readdirSync(PARTS_DIR)
  .filter((name) => name.endsWith(".json"))
  .map(
    (name) =>
      JSON.parse(readFileSync(path.join(PARTS_DIR, name), "utf8")) as Bank,
  );

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/\{\w+\}/g, " ")
    .split(/[^a-z']+/)
    .filter(Boolean);

describe("English era and register check", () => {
  for (const bank of banks) {
    describe(bank.register, () => {
      it("comes from records of the current era", () => {
        for (const part of bank.parts) {
          expect(part.source.date >= ERA_START, part.key).toBe(true);
          expect(part.source.date <= TODAY, part.key).toBe(true);
        }
      });

      it("uses no archaic wording", () => {
        for (const part of bank.parts)
          for (const word of words(part.text))
            expect(ARCHAIC, part.key).not.toContain(word);
      });

      it("keeps paper-only marks out of spoken parts", () => {
        for (const part of bank.parts.filter((p) => p.kind === "spoken"))
          for (const mark of PAPER_ONLY)
            expect(part.text, part.key).not.toMatch(mark);
      });
    });
  }

  it("keeps archaic tokens out of the counts files", () => {
    for (const name of readdirSync(COUNTS_DIR).filter((n) =>
      n.endsWith(".json"),
    )) {
      const keys = JSON.stringify(
        JSON.parse(readFileSync(path.join(COUNTS_DIR, name), "utf8")).counts,
      );
      for (const word of ARCHAIC)
        expect(keys, name).not.toMatch(new RegExp(`"${word}"`));
    }
  });
});
