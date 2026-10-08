import { describe, expect, it } from "vitest";
import { combineResults } from "./combine";
import { toGradingBatch } from "./grading";
import type { BatchLine, BatchResult } from "./run";

/*
 * Two stand-in runs: what is under test is how runs combine (seeds kept per
 * line, repeated wording counted once, absent kinds kept only when no run
 * produced them), not any line's wording.
 */
function line(id: string, text: string, place: string): BatchLine {
  return {
    id,
    axis: "place",
    composer: "test composer",
    situation: "A test situation.",
    speaker: {
      name: "Pat Doe",
      age: 40,
      relation: null,
      isPlayer: true,
      traits: {},
      observed: [],
    },
    line: text,
    parts: [
      id.startsWith("text-journal") ? `journal:chapter:${text}` : `bank:${id}`,
    ],
    world: { place, player: "Pat Doe", playerAge: 40, date: "2026-01-05" },
    harness: [],
  };
}

function run(seed: string, place: string, lines: BatchLine[]): BatchResult {
  return {
    seed,
    worlds: [
      {
        index: 0,
        place,
        player: "Pat Doe",
        playerAge: 40,
        date: "2026-01-05",
        advancedDays: 0,
        people: 10,
      },
    ],
    lines,
    skipped: [],
    absent: [
      { kind: "news", reason: `${place}: no vote` },
      { kind: "hearing", reason: `${place}: no body` },
    ],
    stats: [],
  };
}

describe("combining batch runs", () => {
  const a = run("seed-a", "Ames, Iowa", [
    line("text-meeting-1", "Madam Chair, I thank Ames, Iowa.", "Ames, Iowa"),
    line("text-journal-1", "I began work in 2011.", "Ames, Iowa"),
  ]);
  const b = run("seed-b", "Hilo, Hawaii", [
    line(
      "text-meeting-1",
      "Madam Chair, I thank Hilo, Hawaii.",
      "Hilo, Hawaii",
    ),
    line("text-hearing-1", "Good morning.", "Hilo, Hawaii"),
  ]);
  const combined = combineResults([a, b]);

  it("keeps each line's own seed and counts repeated wording once", () => {
    expect(combined.lines.map((row) => row.line)).toEqual([
      "Madam Chair, I thank Ames, Iowa.",
      "I began work in 2011.",
      "Good morning.",
    ]);
    expect(combined.lines.map((row) => row.seed)).toEqual([
      "seed-a:0",
      "seed-a:0",
      "seed-b:0",
    ]);
    expect(combined.worlds.map((world) => world.index)).toEqual([0, 1]);
  });

  it("takes at most two of a kind from one world and numbers ids across runs", () => {
    const busy = run("seed-c", "Nome, Alaska", [
      line("text-journal-1", "I moved in 2001.", "Nome, Alaska"),
      line("text-journal-2", "I married in 2009.", "Nome, Alaska"),
      line("text-journal-3", "I retired in 2024.", "Nome, Alaska"),
    ]);
    const both = combineResults([a, busy]);
    expect(both.lines.map((row) => [row.id, row.line])).toEqual([
      ["text-meeting-1", "Madam Chair, I thank Ames, Iowa."],
      ["text-journal-1", "I began work in 2011."],
      ["text-journal-2", "I moved in 2001."],
      ["text-journal-3", "I married in 2009."],
    ]);
  });

  it("keeps an absent kind only when no run produced it", () => {
    expect(combined.absent?.map((row) => row.kind)).toEqual(["news"]);
    expect(combined.absent?.[0]?.reason).toBe(
      "Ames, Iowa: no vote; Hilo, Hawaii: no vote",
    );
  });

  it("numbers the grading items in order with their axis and seed", () => {
    const { batch } = toGradingBatch(combined, {
      id: "batch-test",
      head: "test-head",
      at: new Date("2026-10-08T17:00:00.000Z"),
    });
    expect(batch.items.map((item) => [item.i, item.id, item.axis])).toEqual([
      [0, "text-meeting-1", "place"],
      [1, "text-journal-1", "place"],
      [2, "text-hearing-1", "place"],
    ]);
    expect(batch.items[2]!.seed).toBe("seed-b:0");
  });
});
