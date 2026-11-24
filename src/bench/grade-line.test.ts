import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  BATCH_DIR,
  foldGrades,
  readGradedBatches,
} from "../../scripts/dialogue-batch/apply-grades";
import { PLAY_GRADES, writeLineGrade } from "./grade-line";

// A grade given in play (words-grade-control-on-scene) is written as a row
// naming the line's pieces, and apply-grades folds it into the ledger the
// English engine reads. Fails when the control writes nothing.
it("a grade in play is written for the line's pieces and folds into the ledger", () => {
  const dir = mkdtempSync(join(tmpdir(), "play-grades-"));
  const piece = "scene-talk.purpose-open.example-piece";
  const i = writeLineGrade(
    {
      parts: [piece],
      grade: "bad",
      note: "stiff and long",
      text: "An example line.",
      momentId: "moment:1",
    },
    dir,
  );
  expect(i).toBe(1);
  const file = JSON.parse(readFileSync(join(dir, PLAY_GRADES), "utf8")) as {
    grades: { grade: string; note?: string; parts: string[] }[];
  };
  // One word of the note is kept.
  expect(file.grades).toEqual([
    expect.objectContaining({ grade: "bad", note: "stiff", parts: [piece] }),
  ]);
  const ledger = foldGrades(readGradedBatches(BATCH_DIR, dir));
  expect(ledger.parts[piece]?.bad).toBe(1);
  // A second grade adds a row; it never replaces the first.
  writeLineGrade({ parts: [piece], grade: "good" }, dir);
  expect(foldGrades(readGradedBatches(BATCH_DIR, dir)).parts[piece]).toEqual(
    expect.objectContaining({ bad: 1, good: 1 }),
  );
});

it("refuses a grade with no pieces to reach", () => {
  const dir = mkdtempSync(join(tmpdir(), "play-grades-"));
  expect(() => writeLineGrade({ parts: [], grade: "good" }, dir)).toThrow();
});
