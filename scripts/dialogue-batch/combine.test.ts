import { describe, expect, it } from "vitest";
import { askedKeys, combineResults, leastGradedFirst } from "./combine";
import { gradedCoverage } from "./apply-grades";
import { toGradingBatch } from "./grading";
import { repeatKey, type BatchLine, type BatchResult } from "./run";

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

  it("never asks again for a line an earlier batch already put to the owner", () => {
    const { batch: earlier } = toGradingBatch(combineResults([a]), {
      id: "batch-earlier",
      head: "test-head",
      at: new Date("2026-10-08T17:00:00.000Z"),
    });
    // A news lede from the same bank part, with another town in it, was
    // asked already.
    const asked = run("seed-e", "Ames, Iowa", [
      line("text-news-1", "Ames, Iowa passes a budget.", "Ames, Iowa"),
    ]);
    const { batch: news } = toGradingBatch(combineResults([asked]), {
      id: "batch-news",
      head: "test-head",
      at: new Date("2026-10-08T17:00:00.000Z"),
    });
    const later = run("seed-f", "Hilo, Hawaii", [
      line("text-news-1", "Hilo, Hawaii passes a budget.", "Hilo, Hawaii"),
      line("text-news-2", "Hilo, Hawaii closes a road.", "Hilo, Hawaii"),
    ]);
    expect(
      combineResults([later], askedKeys([news])).lines.map((row) => row.line),
    ).toEqual(["Hilo, Hawaii closes a road."]);
    // A journal chapter that opens its sentences the same way, with other
    // figures, was asked already too.
    const journal = run("seed-d", "Nome, Alaska", [
      line("text-journal-1", "I began work in 2019.", "Nome, Alaska"),
      line("text-journal-2", "I moved in 2001.", "Nome, Alaska"),
    ]);
    expect(
      combineResults([journal], askedKeys([earlier])).lines.map(
        (row) => row.line,
      ),
    ).toEqual(["I moved in 2001."]);
  });

  it("keeps an absent kind only when no run produced it", () => {
    expect(combined.absent?.map((row) => row.kind)).toEqual(["news"]);
    expect(combined.absent?.[0]?.reason).toBe(
      "Ames, Iowa: no vote; Hilo, Hawaii: no vote",
    );
  });

  it("leaves out a kind on purpose and says so among the absent kinds", () => {
    const without = combineResults([a, b], new Set(), new Set(["journal"]));
    expect(without.lines.map((row) => row.id)).not.toContain("text-journal-1");
    expect(without.lines).toHaveLength(combined.lines.length - 1);
    expect(without.absent?.map((row) => row.kind)).toEqual(["news", "journal"]);
    expect(without.absent?.[1]?.reason).toMatch(/--leave-out/);
  });

  it("numbers the owner's items with their axis and seed, and keeps procedure off them", () => {
    const busy = run("seed-c", "Nome, Alaska", [
      line("text-journal-1", "I moved in 2001.", "Nome, Alaska"),
    ]);
    const { batch, bin } = toGradingBatch(combineResults([a, b, busy]), {
      id: "batch-test",
      head: "test-head",
      at: new Date("2026-10-08T17:00:00.000Z"),
    });
    expect(batch.items.map((item) => [item.i, item.id, item.axis])).toEqual([
      [0, "text-journal-1", "place"],
      [1, "text-journal-2", "place"],
    ]);
    expect(batch.items[1]!.seed).toBe("seed-c:0");
    // Meeting and hearing procedure is checked against records instead.
    expect(bin.map((entry) => [entry.item.kind, entry.rule])).toEqual([
      ["meeting", expect.stringMatching(/^procedural wording/)],
      ["hearing", expect.stringMatching(/^procedural wording/)],
    ]);
  });

  it("labels the line a choice answers with the person who said it", () => {
    const choice = {
      ...line("text-choice-1", "Good morning.", "Ames, Iowa"),
      prior: "Hi, Pat. How are you?",
      priorVoice: "Your coworker",
    };
    const { batch } = toGradingBatch(
      combineResults([run("seed-d", "Ames, Iowa", [choice])]),
      {
        id: "batch-test",
        head: "test-head",
        at: new Date("2026-10-08T17:00:00.000Z"),
      },
    );
    expect(batch.items[0]!.prior).toBe("Your coworker: Hi, Pat. How are you?");
  });

  it("says where a kind's lines went when none reached the owner", () => {
    // The hearing line was already asked, and the meeting lines are procedure.
    const asked = new Set([
      repeatKey("text-hearing", "Good morning.", "bank:text-hearing-1"),
    ]);
    const combinedAgain = combineResults([a, b], asked);
    expect(combinedAgain.dropped?.hearing).toEqual({
      repeated: 1,
      overLimit: 0,
    });
    const { batch } = toGradingBatch(combinedAgain, {
      id: "batch-test",
      head: "test-head",
      at: new Date("2026-10-08T17:00:00.000Z"),
    });
    const reasons = new Map(batch.absent.map((row) => [row.kind, row.reason]));
    expect(reasons.get("hearing")).toBe(
      "no output, because 1 line repeated the wording of a line already asked or already in the batch",
    );
    expect(reasons.get("meeting")).toMatch(
      /^no output, because 1 line went to the bin \(procedural/,
    );
    expect(reasons.get("news")).toMatch(/^no output, because/);
  });

  it("counts graded items by axis and kind, and fills the least-graded cells first", () => {
    const table = gradedCoverage([
      {
        batch: {
          id: "batch-x",
          items: [
            { i: 0, parts: ["p0"], axis: "place", kind: "journal" },
            { i: 1, parts: ["p1"], axis: "place", kind: "journal" },
            { i: 2, parts: ["p2"], axis: "relationship", kind: "conversation" },
          ] as never,
        },
        grades: {
          grades: [
            { i: 0, grade: "kill" },
            { i: 1, grade: "good" },
            { i: 2, grade: "rewrite" },
          ],
        },
      },
    ]);
    expect(table).toEqual({
      place: { journal: 2 },
      relationship: { conversation: 1 },
    });
    const journal = line("text-journal-1", "I moved in 2001.", "Nome, Alaska");
    const talk = {
      ...line("conversation-1", "Hi, Pat.", "Nome, Alaska"),
      axis: "relationship" as const,
    };
    const lie = {
      ...line("conversation-2", "I was home all night.", "Nome, Alaska"),
      axis: "lie" as const,
    };
    expect(
      leastGradedFirst([journal, talk, lie], table).map((row) => row.id),
    ).toEqual(["conversation-2", "conversation-1", "text-journal-1"]);
  });
});
