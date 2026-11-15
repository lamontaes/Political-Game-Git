/**
 * Turns the owner's marks on the Scenes page into a voice grade file whose
 * rows carry where each line stood (owner, Nov 15: "my grades should hit
 * multiple parts of the engine at once").
 *
 *   node --import tsx scripts/dialogue-batch/scene-marks.ts <runs-dir> <marks.json> <batch-id> > data/english/grades/<batch-id>.json
 *
 * `runs-dir` holds the page's run files (salado-*.json: scenes[].talk with
 * every line's id, key, altKeys, previousMove, traits and register).
 * `marks.json` is `[{ "line": "P33.18", "wording": 3, "note": "..." }]`, his
 * own words for one wording (wording 1 is the line shown, 2 on its first
 * other wording), or `{ "scene": "O2", "key": "...", "note": "..." }` for a
 * piece he named by its words. Each row of the output has the piece's key,
 * the note's span grades (spoken-grades.ts), whether the mark is about sound
 * or meaning (`markKind`), and the line's spot: its move, the move before it,
 * the register, the piece's bearing, the speaker's traits and its length.
 * `apply-grades.ts` counts a sound mark in the ledger and folds it into the
 * calibration (`spreadBatches`); a meaning mark goes to the Words lead.
 *
 * A development tool. It never words anything.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sentenceCount, wordCount } from "../../src/english/calibration";
import { readBankPieces } from "../words/run-rules";
import type { SpotMarkRow } from "./apply-grades";
import { markKind, spokenToSpans } from "./spoken-grades";

export interface RunLine {
  readonly id: string;
  readonly text: string;
  readonly key?: string;
  readonly move?: string;
  readonly alts?: readonly string[];
  readonly altKeys?: readonly string[];
  readonly previousMove?: string;
  readonly traits?: Readonly<Record<string, number>>;
  readonly register?: string;
}

export interface SceneMark {
  /** The line's number on the page ("P33.18"). */
  readonly line?: string;
  /** Which wording, from 1 (the line shown). */
  readonly wording?: number;
  /** The scene ("O2") and the piece, when he named the words instead. */
  readonly scene?: string;
  readonly key?: string;
  readonly note: string;
}

/** Every line of a run file, by its number on the page. */
export function runLines(run: unknown): RunLine[] {
  const out: RunLine[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      const row = node as Record<string, unknown>;
      if (typeof row.id === "string" && typeof row.text === "string")
        out.push(row as unknown as RunLine);
      Object.values(row).forEach(walk);
    }
  };
  walk(run);
  return out;
}

/** The wording a mark names: its key and text, or undefined. */
function wordingOf(
  line: RunLine,
  wording: number,
): { key: string; text: string } | undefined {
  if (wording === 1)
    return line.key ? { key: line.key, text: line.text } : undefined;
  const key = line.altKeys?.[wording - 2];
  const text = line.alts?.[wording - 2];
  return key && text ? { key, text } : undefined;
}

/** The marks as voice grade rows, each with its spot from the run it was played in. */
export function sceneMarkRows(
  lines: readonly RunLine[],
  marks: readonly SceneMark[],
  bearingOf: (key: string) => string | undefined,
): SpotMarkRow[] {
  const byId = new Map<string, RunLine>();
  for (const line of lines) if (!byId.has(line.id)) byId.set(line.id, line);
  return marks.map((mark) => {
    let line: RunLine | undefined;
    let found: { key: string; text: string } | undefined;
    if (mark.line) {
      line = byId.get(mark.line);
      found = line && wordingOf(line, mark.wording ?? 1);
    } else if (mark.scene && mark.key) {
      line = lines.find(
        (row) =>
          row.id.startsWith(`${mark.scene}.`) &&
          (row.key === mark.key || row.altKeys?.includes(mark.key!)),
      );
      const at = line
        ? [line.key, ...(line.altKeys ?? [])].indexOf(mark.key)
        : -1;
      found = line && at >= 0 ? wordingOf(line, at + 1) : undefined;
    }
    if (!line || !found)
      throw new Error(
        `no line for the mark ${JSON.stringify({ line: mark.line, wording: mark.wording, scene: mark.scene, key: mark.key })}`,
      );
    const spans = spokenToSpans(found.text, mark.note);
    const kind = markKind(mark.note);
    const bearing = bearingOf(found.key);
    return {
      id: `${line.id}#${mark.wording ?? [line.key, ...(line.altKeys ?? [])].indexOf(found.key) + 1}`,
      key: found.key,
      spans,
      note: mark.note,
      ...(kind ? { kind } : {}),
      wholeLine:
        spans.length > 0 &&
        spans.every(
          (span) => span.start === 0 && span.end === found.text.length,
        ),
      spot: {
        ...(line.move ? { move: line.move } : {}),
        ...(line.previousMove ? { previousMove: line.previousMove } : {}),
        ...(line.register ? { register: line.register } : {}),
        ...(bearing ? { bearing } : {}),
        ...(line.traits ? { speakerTraits: line.traits } : {}),
        words: wordCount(found.text),
        sentences: sentenceCount(found.text),
      },
    };
  });
}

function main(runsDir: string, marksPath: string, batch: string) {
  const lines = readdirSync(runsDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .flatMap((name) =>
      runLines(JSON.parse(readFileSync(join(runsDir, name), "utf8"))),
    );
  // The bearing a piece is written in, as its uses carry it (run-rules.ts).
  const bearings = new Map(
    readBankPieces().map((piece) => [
      piece.key,
      piece.uses
        .map((use) => (use as { bearing?: unknown }).bearing)
        .find((bearing): bearing is string => typeof bearing === "string"),
    ]),
  );
  const marks = JSON.parse(readFileSync(marksPath, "utf8")) as SceneMark[];
  const grades = sceneMarkRows(lines, marks, (key) => bearings.get(key));
  console.log(JSON.stringify({ batch, grades }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`)
  main(process.argv[2]!, process.argv[3]!, process.argv[4]!);
