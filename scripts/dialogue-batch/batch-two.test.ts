import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readMapPieces } from "./grade-map";

const batch = JSON.parse(
  readFileSync("docs/coordination/batches/2026-11-09-batch-2.json", "utf8"),
) as {
  coverage: { pieces: number; reachedByBatch: number; lines: number };
  moments: {
    description: string;
    speaker: string;
    lines: {
      key: string;
      line: string;
      spans: { start: number; end: number; text: string; features: string[] }[];
      reach: number;
    }[];
  }[];
};
const pieces = readMapPieces({});
/** Lines graded in a batch that a later pass rewrote with his lessons: key to the text he graded. */
const rewritten = (
  JSON.parse(
    readFileSync("data/english/rewritten-after-grading.json", "utf8"),
  ) as { rewritten: Record<string, string> }
).rewritten;

describe("batch 2 lets the owner grade part of a line and reaches the whole game", () => {
  it("every line is a bank line, three to a moment, each moment described", () => {
    for (const moment of batch.moments) {
      expect(moment.lines).toHaveLength(3);
      expect(moment.description.length).toBeGreaterThan(20);
      expect(moment.speaker.length).toBeGreaterThan(2);
      for (const line of moment.lines)
        if (rewritten[line.key]) {
          // He graded this text; a later pass rewrote it with his lessons.
          expect(rewritten[line.key]).toBe(line.line);
          expect(pieces.get(line.key)?.text).toBeTruthy();
        } else
          // The batch keeps the lines as he graded them; a lesson applied to
          // every bank since ("Alright", not "All right") may respell the line.
          expect(
            pieces.get(line.key)?.text.replace(/\bAlright\b/g, "All right"),
          ).toBe(line.line);
    }
    expect(batch.coverage.lines).toBeGreaterThanOrEqual(150);
    expect(batch.coverage.lines).toBeLessThanOrEqual(250);
  });

  it("every span's offsets point at its own text", () => {
    for (const moment of batch.moments)
      for (const line of moment.lines)
        for (const span of line.spans)
          expect(line.line.slice(span.start, span.end)).toBe(span.text);
  });

  it("graded together, the batch reaches at least 95% of all lines", () => {
    // Measured against the banks as they stood when the batch was made; the
    // banks grow after, and the grade map reports today's reach.
    expect(
      batch.coverage.reachedByBatch / batch.coverage.pieces,
    ).toBeGreaterThanOrEqual(0.95);
  });
});
