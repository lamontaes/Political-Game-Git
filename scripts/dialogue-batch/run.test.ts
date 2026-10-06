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
