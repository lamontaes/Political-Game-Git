/**
 * A grade the owner gives a line in play (words-grade-control-on-scene): good
 * or bad and a one-word note, written as a row of `data/english/grades/
 * play-grades.json` naming the piece keys that said the line. That file
 * stands on its own (each row carries its parts), so `apply-grades` folds it
 * into the ledger like any batch. Nothing in play reads it until then.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PLAY_GRADES = "play-grades.json";

export interface LineGrade {
  readonly parts: readonly string[];
  readonly grade: "good" | "bad";
  readonly note?: string;
  /** The line as it was said, and the moment that said it, for the reader. */
  readonly text?: string;
  readonly momentId?: string;
}

interface PlayGradeFile {
  batch: string;
  source: string;
  grades: {
    i: number;
    grade: string;
    note?: string;
    parts: string[];
    text?: string;
    moment?: string;
  }[];
}

/** Adds one grade to the play grades file; returns the row's number. */
export function writeLineGrade(
  row: LineGrade,
  dir = "data/english/grades",
): number {
  if (!row.parts.length) throw new Error("A grade needs the line's pieces.");
  const file = join(dir, PLAY_GRADES);
  const data: PlayGradeFile = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as PlayGradeFile)
    : {
        batch: "play-grades",
        source:
          "the owner's grades on lines in play (the bench's grade control)",
        grades: [],
      };
  const i = data.grades.length + 1;
  // One word: the first word of what was typed.
  const note = row.note?.trim().split(/\s+/)[0];
  data.grades.push({
    i,
    grade: row.grade,
    ...(note ? { note } : {}),
    parts: [...row.parts],
    ...(row.text ? { text: row.text } : {}),
    ...(row.momentId ? { moment: row.momentId } : {}),
  });
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return i;
}
