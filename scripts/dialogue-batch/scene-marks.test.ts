import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalibrationTable } from "../../src/english/calibration";
import {
  foldCalibration,
  gradeOfStrength,
  movedByEach,
  spreadBatch,
  type SpotMarkRow,
  withVoiceGrades,
} from "./apply-grades";
import { type RunLine, sceneMarkRows } from "./scene-marks";
import { markKind } from "./spoken-grades";

// The owner's marks on the Scenes page, Nov 15 (cmsg ...Q6ewiKgydCAA9G25DYfW8L),
// folded as data/english/grades/2026-11-15-scenes-page.json.
const MARKS = JSON.parse(
  readFileSync("data/english/grades/2026-11-15-scenes-page.json", "utf8"),
) as { batch: string; grades: SpotMarkRow[] };
const TABLE = JSON.parse(
  readFileSync("data/english/calibration.json", "utf8"),
) as CalibrationTable;
const SPREAD_MAX = (
  TABLE.parameters.step as unknown as { spread: [number, number] }
).spread[1];

describe("a mark on a played line is about its sound or its meaning", () => {
  it("sorts his words the way the Words lead reads them", () => {
    expect(markKind("Both wordings are good for that one.")).toBe("sound");
    expect(
      markKind("I need to say it to myself first is a little awkward."),
    ).toBe("sound");
    expect(
      markKind(
        "Me personally, maybe the actual player would, but I personally have no context for that.",
      ),
    ).toBe("meaning");
    expect(
      markKind(
        "That's not good. ... it sounds like they're talking to each other.",
      ),
    ).toBe("meaning");
    expect(markKind("So wait, I already said no.")).toBe("meaning");
    // A bare "not good" with no reason is left for the Words lead.
    expect(markKind("That's not good.")).toBeUndefined();
  });
});

describe("a mark finds its line and the spot it stood in", () => {
  const line: RunLine = {
    id: "P1.3",
    text: "Dial it.",
    key: "k.dial",
    move: "agree",
    alts: ["Give me the phone."],
    altKeys: ["k.phone"],
    previousMove: "request",
    traits: { "people-mind-v1:risk": 1 },
    register: "scene-talk",
  };
  it("takes the wording he named and the line's move, the move before and the speaker", () => {
    const [row] = sceneMarkRows(
      [line],
      [{ line: "P1.3", wording: 2, note: "I like that one better." }],
      (key) => (key === "k.phone" ? "solemn" : undefined),
    );
    expect(row).toMatchObject({
      id: "P1.3#2",
      key: "k.phone",
      kind: "sound",
      wholeLine: true,
      spot: {
        move: "agree",
        previousMove: "request",
        register: "scene-talk",
        bearing: "solemn",
        speakerTraits: { "people-mind-v1:risk": 1 },
        words: 4,
        sentences: 1,
      },
    });
  });
});

describe("only a sound mark on a whole line spreads", () => {
  const spot = {
    move: "agree",
    previousMove: "request",
    bearing: "solemn",
    speakerTraits: { "personality-v1:facet-friendly": 2 },
  };
  const row = (over: Partial<SpotMarkRow>): SpotMarkRow => ({
    key: "k",
    spans: [{ start: 0, end: 8, strength: 0.75 }],
    kind: "sound",
    wholeLine: true,
    spot,
    ...over,
  });
  it("grades it 3 + 2s on naturalness and trait fit, the scale the bench uses", () => {
    expect(gradeOfStrength(0.75)).toBe(4.5);
    expect(gradeOfStrength(-0.375)).toBe(2.25);
    expect(gradeOfStrength(1.5)).toBe(5);
    const batch = spreadBatch("t", [row({})])!;
    expect(batch.grades.grades![0]!.axes).toEqual({
      naturalness: 4.5,
      "trait fit": 4.5,
    });
  });
  it("leaves out marks on meaning, unsorted marks and marks on part of a line", () => {
    expect(
      spreadBatch("t", [
        row({ kind: "meaning" }),
        row({ kind: undefined }),
        row({ wholeLine: false }),
      ]),
    ).toBeNull();
  });
  it("a mark on meaning or an unsorted one never holds a line in the ledger", () => {
    const dir = mkdtempSync(join(tmpdir(), "marks-"));
    writeFileSync(
      join(dir, "m.json"),
      JSON.stringify({
        batch: "m",
        grades: [
          row({
            key: "a",
            kind: "meaning",
            spans: [{ start: 0, end: 8, strength: -1 }],
          }),
          row({
            key: "b",
            kind: undefined,
            spans: [{ start: 0, end: 8, strength: -1 }],
          }),
          row({ key: "c", spans: [{ start: 0, end: 8, strength: -0.75 }] }),
        ],
      }),
    );
    const ledger = withVoiceGrades(
      { schema: "english-part-grades/1", batches: [], parts: {} },
      dir,
    );
    expect(Object.keys(ledger.parts)).toEqual(["c"]);
  });
});

describe("tonight's marks move the rows other lines share, a step at a time", () => {
  const batch = spreadBatch(`${MARKS.batch}:spread`, MARKS.grades)!;
  it("spreads every sound mark and none on meaning", () => {
    const sound = MARKS.grades.filter((r) => r.kind === "sound" && r.wholeLine);
    expect(batch.batch!.items.length).toBe(sound.length);
  });
  it("no one mark moves a row past the step's spread", () => {
    const base = { ...TABLE, folded: [] };
    for (const { key, moved } of movedByEach(batch, base))
      for (const row of moved) {
        const change = row.row.endsWith("target words")
          ? Math.abs(row.after - row.before) / Math.max(1, row.before)
          : Math.abs(row.after - row.before);
        expect(change, `${key}: ${row.row}`).toBeLessThanOrEqual(SPREAD_MAX);
      }
  });
  it("folding the marks again changes nothing", () => {
    const once = foldCalibration([batch], { ...TABLE, folded: [] });
    expect(foldCalibration([batch], once)).toEqual(once);
  });
});
