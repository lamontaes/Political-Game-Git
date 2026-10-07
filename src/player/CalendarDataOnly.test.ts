import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/CalendarWorkspace.tsx",
  "src/player/UX39CalendarGrid.tsx",
  "src/player/VenueActivityPanel.tsx",
];
const JSX_SENTENCE = />\s*[A-Z][^<>{}]{25,}[.?!]\s*</;
const STRING_SENTENCE = /["`][A-Z][^"`]{25,}[.?!]["`]/;

describe("the calendar prints no hand-written sentence", () => {
  for (const file of FILES) {
    it(file, () => {
      const text = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(text).not.toMatch(JSX_SENTENCE);
      expect(text).not.toMatch(STRING_SENTENCE);
      // A multi-line run of JSX text that ends in a stop.
      expect(text).not.toMatch(/^\s+[A-Z][a-z]+ [a-z][^<>{}\n]{18,}[.?!]\s*$/m);
    });
  }
});
