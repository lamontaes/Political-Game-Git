import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * SEE-IT screens show record values and English-engine output. This guards the
 * files the SEE-IT pull requests added or changed against a hand-written
 * sentence, the way the menu-reset guards do for the screens they cleaned.
 */
const FILES = [
  "src/player/PersonalObligations.tsx",
  "src/presentation/personal-obligations.ts",
  "src/presentation/journal-own-case.ts",
];
const JSX_SENTENCE = />\s*[A-Z][^<>{}]{25,}[.?!]\s*</;
const STRING_SENTENCE = /["`][A-Z][^"`]{25,}[.?!]["`]/;

describe("SEE-IT files print no hand-written sentence", () => {
  for (const file of FILES) {
    it(file, () => {
      const text = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(text).not.toMatch(JSX_SENTENCE);
      expect(text).not.toMatch(STRING_SENTENCE);
    });
  }
});
