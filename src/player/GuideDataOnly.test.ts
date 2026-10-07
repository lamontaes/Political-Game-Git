import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = ["src/player/GuideWorkspace.tsx", "src/player/GuideTerm.tsx"];

describe("the Guide screens print no authored definition", () => {
  for (const file of FILES) {
    it(file, () => {
      const text = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(text).not.toMatch(/\.(shortDefinition|explanation|contextNote)\b/);
      expect(text).not.toMatch(/>\s*[A-Z][^<>{}]{25,}[.?!]\s*</);
      expect(text).not.toMatch(/["`][A-Z][^"`]{25,}[.?!]["`]/);
    });
  }
});
