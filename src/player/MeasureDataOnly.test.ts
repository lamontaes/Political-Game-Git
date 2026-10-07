import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/MeasurePaperWorkspace.tsx",
  "src/player/MeasureFloorSurface.tsx",
];
const AUTHORED_HELPERS = [
  "Open until",
  "Settled",
  "Back to the room",
  "AS IT NOW READS",
  "Preview only",
  "What you can do with the bill",
  "What has happened so far",
  "What people have said",
  "What was asked for",
  "Stated ground:",
  "Prepared by",
  "Ask ${world.people[seat.guardianPersonId]!.familyName} back in",
  "Wait until ${world.people[seat.guardianPersonId]!.familyName} steps out",
  "can hear everything",
  "stays between you",
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
      for (const helper of AUTHORED_HELPERS) {
        expect(text).not.toContain(helper);
      }
    });
  }
});
