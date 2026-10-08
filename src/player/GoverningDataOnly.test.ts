import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/GoverningBriefing.tsx",
  "src/player/GoverningOfficeDesk.tsx",
  "src/player/ExecutiveBudgetRequest.tsx",
  "src/player/OfficeStaffHiring.tsx",
  "src/player/ExecutiveBillResults.tsx",
  "src/player/IncidentResponsePanel.tsx",
  "src/player/ExecutiveWorkCard.tsx",
];

/** Text between tags that reads as a sentence: a capital, 25+ characters, a stop. */
const JSX_SENTENCE = />\s*[A-Z][^<>{}]{25,}[.?!]\s*</;
const STRING_SENTENCE = /"[A-Z][^"]{25,}[.?!]"/;

describe("the governing screens print no hand-written sentence", () => {
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
