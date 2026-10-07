import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/PermanentShell.tsx",
  "src/player/ShellNav.tsx",
  "src/player/ShellPinRail.tsx",
  "src/player/ShellWorkspaces.tsx",
  "src/player/ReturnToTitleAction.tsx",
];
const JSX_SENTENCE = />\s*[A-Z][^<>{}]{25,}[.?!]\s*</;
const STRING_SENTENCE = /["`][A-Z][^"`]{25,}[.?!]["`]/;

describe("the shell frame prints no hand-written sentence", () => {
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
