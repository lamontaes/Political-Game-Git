import { describe, expect, it } from "vitest";
import hearingBank from "../../data/english/parts/hearing.json" with { type: "json" };
import legislationBank from "../../data/english/parts/legislation.json" with { type: "json" };
import meetingBank from "../../data/english/parts/meeting.json" with { type: "json" };
import minutesBank from "../../data/english/parts/minutes.json" with { type: "json" };
import winningLosingBank from "../../data/english/parts/winning-losing.json" with { type: "json" };

import { DEFAULT_AGES, runDialogueBatch } from "./run";
import { toGradingBatch } from "./grading";

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

describe("the dialogue batch avoids menu prompts", () => {
  it(
    "creates a 40-item grading batch from recorded producer output",
    { timeout: 300_000 },
    () => {
      const result = runDialogueBatch({
        seed: "eng-20261007-endpoint",
        ages: DEFAULT_AGES,
        newsDays: 10,
        max: 80,
      });
      const { batch, bin } = toGradingBatch(result, {
        id: "eng-20261007-proof",
        head: "test-head",
        at: new Date("2026-10-07T17:00:00.000Z"),
      });

      expect(batch.items.length).toBeGreaterThanOrEqual(40);
      expect(bin).toHaveLength(0);
      expect(batch.items.every((item) => item.parts.length > 0)).toBe(true);
      expect(result.lines.every((line) => line.id.startsWith("text-"))).toBe(
        true,
      );
      const situationRelationships = batch.items.map(
        (item) => `${item.situation}|${item.cell.relationship}`,
      );
      expect(new Set(situationRelationships).size).toBe(batch.items.length);
      const sourcedParts = [
        ...hearingBank.parts,
        ...legislationBank.parts,
        ...meetingBank.parts,
        ...minutesBank.parts,
        ...winningLosingBank.parts,
      ];
      for (const item of batch.items)
        for (const key of item.parts) {
          if (key.startsWith("bank:")) {
            const part = sourcedParts.find((row) => row.key === key.slice(5));
            expect(part?.source?.url, key).toBeTruthy();
          } else {
            expect(
              key.startsWith("news:story:event_") ||
                key.startsWith("journal:chapter:"),
              key,
            ).toBe(true);
          }
        }
      expect(
        batch.absent.every((item) =>
          item.reason.startsWith("no output, because"),
        ),
      ).toBe(true);
    },
  );
});
