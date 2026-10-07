import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/MeasurePaperWorkspace.tsx",
  "src/player/MeasureFloorSurface.tsx",
];

describe("the measure paper and floor print no hand-written sentence", () => {
  for (const file of FILES) {
    it(file, () => {
      const text = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(text).not.toMatch(/>\s*[A-Z][^<>{}]{25,}[.?!]\s*</);
      expect(text).not.toMatch(/["`][A-Z][^"`]{25,}[.?!]["`]/);
      expect(text).not.toContain("can hear everything");
      expect(text).not.toContain("stays between you");
    });
  }
});
