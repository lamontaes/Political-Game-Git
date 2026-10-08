import { describe, expect, it } from "vitest";

import { runDialogueBatch } from "./run";

describe("the dialogue batch", () => {
  it(
    "returns engine lines with part keys, each from a different situation, in one world",
    { timeout: 300_000 },
    () => {
      const result = runDialogueBatch({
        seed: "batch-smoke",
        ages: [34],
        newsDays: 0,
        max: 16,
      });
      expect(result.worlds).toHaveLength(1);
      expect(result.lines.length).toBeGreaterThanOrEqual(5);
      for (const line of result.lines) {
        expect(line.line.trim()).not.toBe("");
        // The engine named the parts it used; nothing here is hand-written.
        expect(line.parts.length).toBeGreaterThan(0);
        expect(line.situation.trim()).not.toBe("");
        expect(line.speaker.name).toBeTruthy();
      }
      expect(new Set(result.lines.map((line) => line.id)).size).toBe(
        result.lines.length,
      );
      expect(new Set(result.lines.map((line) => line.situation)).size).toBe(
        result.lines.length,
      );
      expect(new Set(result.lines.map((line) => line.line)).size).toBe(
        result.lines.length,
      );
      // A situation the records cannot support is skipped with a reason.
      for (const skipped of result.skipped)
        expect(skipped.reason.trim()).not.toBe("");
    },
  );
});

describe("the dialogue batch reaches the requested public replies", () => {
  it(
    "includes an official view, a recorded repeat greeting, and a press answer",
    { timeout: 300_000 },
    () => {
      const result = runDialogueBatch({
        seed: "dh1-20261007-session52",
        ages: [34],
        newsDays: 10,
        max: 40,
      });
      const answer = result.lines.find((line) => line.id === "press-answer");
      const official = result.lines.find(
        (line) => line.id === "officials-view",
      );
      const greeting = result.lines.find((line) => line.id === "greet-again");
      expect(official?.composer).toBe(
        "officialViewLine in small-talk-english.ts",
      );
      expect(official?.line.trim()).not.toBe("");
      expect(greeting?.composer).toBe(
        "greetAgainLine in small-talk-english.ts",
      );
      expect(greeting?.line.trim()).not.toBe("");
      expect(answer?.composer).toBe(
        "composePressLine (answer-unknown) in press-english.ts",
      );
      expect(answer?.line.trim()).not.toBe("");
    },
  );
});
