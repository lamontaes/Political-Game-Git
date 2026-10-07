import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/PlacesWorkspace.tsx",
  "src/player/PlaceConditions.tsx",
];
const JSX_SENTENCE = />\s*[A-Z][^<>{}]{25,}[.?!]\s*</;
const STRING_SENTENCE = /["`][A-Z][^"`]{25,}[.?!]["`]/;

describe("the places screens print no hand-written sentence", () => {
  for (const file of FILES) {
    it(file, () => {
      const text = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(text).not.toMatch(JSX_SENTENCE);
      expect(text).not.toMatch(STRING_SENTENCE);
      expect(text).not.toMatch(
        /^\s+[A-Z][a-z’]+ [a-z’][^<>{}\n]{12,}[.?!]\s*$/m,
      );
    });
  }
});
