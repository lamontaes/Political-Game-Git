import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/TransitWorkspace.tsx",
  "src/player/TransitCashSummary.tsx",
];
const JSX_SENTENCE = />\s*[A-Z][^<>{}]{25,}[.?!]\s*</;
const STRING_SENTENCE = /["`][A-Z][^"`]{25,}[.?!]["`]/;

describe("the transit screens print no hand-written sentence", () => {
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
      for (const phrase of [
        "Propose added service",
        "Objective: which service to add",
        "Proposal: how much to provide",
        "Commitment: file it",
        "Service period",
        "Total amount provided (USD)",
        "If paid",
        "What changed",
        "Contract records and reports",
        "First period",
        "Second period",
      ]) {
        expect(text).not.toContain(phrase);
      }
    });
  }
});
