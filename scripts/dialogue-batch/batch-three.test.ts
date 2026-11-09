import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readMapPieces } from "./grade-map";

const batch = JSON.parse(
  readFileSync("docs/coordination/batches/2026-11-09-batch-3.json", "utf8"),
) as {
  moments: {
    kind: string;
    description: string;
    speaker: string;
    lines: {
      key: string;
      line: string;
      spans: { start: number; end: number; text: string }[];
    }[];
  }[];
};
const pieces = readMapPieces({});

describe("batch 3 mixes the kinds the owner asked for", () => {
  it("every line is a bank line, three to a moment, each moment described", () => {
    for (const moment of batch.moments) {
      expect(moment.lines).toHaveLength(3);
      expect(moment.description.length).toBeGreaterThan(20);
      expect(moment.speaker.length).toBeGreaterThan(2);
      for (const line of moment.lines)
        expect(
          pieces.get(line.key)?.text.replace(/\bAlright\b/g, "All right"),
        ).toBe(line.line.replace(/\bAlright\b/g, "All right"));
    }
  });

  it("never runs three moments of one kind in a row", () => {
    const kinds = batch.moments.map((moment) => moment.kind);
    for (let at = 2; at < kinds.length; at += 1)
      expect(
        kinds[at] === kinds[at - 1] && kinds[at] === kinds[at - 2],
        `moments ${at - 1} to ${at + 1}`,
      ).toBe(false);
  });

  it("holds speeches, legislation, reactions, constituents, liked variants and batch 2 put back", () => {
    const kinds = new Set(batch.moments.map((moment) => moment.kind));
    for (const kind of [
      "speech",
      "legislation",
      "reaction",
      "constituent",
      "liked",
      "again",
    ])
      expect(kinds.has(kind), kind).toBe(true);
  });

  it("every span's offsets point at its own text", () => {
    for (const moment of batch.moments)
      for (const line of moment.lines)
        for (const span of line.spans)
          expect(line.line.slice(span.start, span.end)).toBe(span.text);
  });
});
