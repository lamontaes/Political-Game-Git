/**
 * Folds the owner's grades into the ledger the English engine reads.
 *
 *   node --import tsx scripts/dialogue-batch/apply-grades.ts
 *
 * Reads every grade file in data/english/grades/ (one per set of voice notes,
 * plus the file the in-play grade control writes), and counts each grade
 * against the part keys of the line it names. Writes
 * data/english/part-grades.json, which the English engine's english-grades.ts
 * reads. A grade file whose rows carry no part keys needs a batch file of the
 * same name in data/english/batches/ to join them by number; a grade that
 * names no item stops the run with the file and number, so no grade is
 * silently lost.
 *
 * Counting is by batch and row: folding the same files again changes
 * nothing. After a fold, run `npm run words:rules` (scripts/words/run-rules.ts):
 * those two commands are the whole update. The first records what he graded;
 * the second runs every rule he has given over every line and writes the list
 * of lines the game does not play (data/english/pulled.json). There is no
 * map, reach table or odds file to rebuild: a line plays or it does not.
 *
 * A development tool. It never words anything.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type {
  CalibrationTable,
  RunningGrade,
} from "../../src/english/calibration";
import { readBankPieces } from "../words/run-rules";
import {
  type AxisGradeCounts,
  heldByGrades,
  type OwnerGrade,
  type PartGradeCounts,
  type PartGradeLedger,
} from "../../src/english/english-grades";

/** The whole-line strength a voice grade needs to count as a verdict in the ledger. */
export const VOICE_VERDICT = 0.25;

export const BATCH_DIR = "data/english/batches";
export const GRADE_DIR = "data/english/grades";
export const LEDGER_FILE = "data/english/part-grades.json";

/** A variant a multi-axis batch shows beside a line, differing on one axis. */
export interface BatchFileVariant {
  /** Its number on the page, from 1. */
  readonly n: number;
  readonly axis: string;
  readonly parts: readonly string[];
}

/** One line of a bench item with the features the calibration table folds. */
export interface BatchFileLine {
  /** Its number in the item, from 1. */
  readonly n: number;
  readonly parts: readonly string[];
  readonly move?: string;
  /** The move before it in the item, for the move-pair weight. */
  readonly previousMove?: string;
  readonly register?: string;
  readonly bearing?: string;
  /** The speaker's trait levels (-2 to 2), as the profile laid them. */
  readonly speakerTraits?: Readonly<Record<string, number>>;
  readonly words?: number;
  readonly sentences?: number;
  readonly lie?: boolean;
}

export interface BatchFileItem {
  readonly i: number;
  readonly parts: readonly string[];
  /** A bench item's lines, each graded on its own. */
  readonly lines?: readonly BatchFileLine[];
  readonly variants?: readonly BatchFileVariant[];
  /** A conversation turn's choice set: each reply and lie, by its number on the page. */
  readonly choices?: readonly { n: number; parts: readonly string[] }[];
}

export interface BatchFile {
  readonly id: string;
  readonly items: readonly BatchFileItem[];
}

export interface GradeFileRow {
  readonly i?: number;
  readonly n?: number;
  readonly grade?: string;
  readonly verdict?: string;
  readonly note?: string;
  /** Multi-axis batches: a grade per axis, e.g. { "formality": "GOOD" }. */
  readonly axes?: Readonly<Record<string, string | number>>;
  /** A bench grade: the line of the item it grades, from 1. */
  readonly line?: number;
  /** The variant number that is better: per axis, or one number in a scene batch. */
  readonly prefer?: Readonly<Record<string, number>> | number | string;
  /** A choice set's grades, reply by reply: { "1": "good", "3": "bad" }. */
  readonly choices?: Readonly<Record<string, string>>;
  /** The part keys of the graded line, when the grade file carries them. */
  readonly parts?: readonly string[];
}

export interface GradeFile {
  readonly batch?: string;
  readonly grades?: readonly GradeFileRow[];
  readonly items?: readonly GradeFileRow[];
}

/**
 * The owner's word for a grade. The Grade tab writes good, rewrite and kill;
 * GOOD, BAD and FIX mean the same. Anything else names the row that broke.
 */
const GRADE_WORDS: Readonly<Record<string, OwnerGrade>> = {
  good: "good",
  bad: "bad",
  kill: "bad",
  fail: "bad",
  pass: "good",
  fix: "fix",
  rewrite: "fix",
  // Good only with its referent from the life ("That's how it started."):
  // held until rewritten, as a FIX is.
  conditional: "fix",
};

/** A grade file's rows: `{ grades: [...] }`, `{ items: [...] }`, a list, or rows keyed by number. */
function rowsOf(grades: unknown): readonly GradeFileRow[] {
  const file = grades as {
    grades?: readonly GradeFileRow[];
    items?: readonly GradeFileRow[];
  };
  if (file.grades) return file.grades;
  if (file.items) return file.items;
  if (Array.isArray(grades)) return grades as GradeFileRow[];
  return Object.values(grades as Record<string, GradeFileRow>).filter(
    (row) => typeof row === "object" && row !== null && "i" in row,
  );
}

export function ownerGrade(row: GradeFileRow, where: string): OwnerGrade {
  const word = (row.grade ?? row.verdict ?? "").trim().toLowerCase();
  const grade = GRADE_WORDS[word];
  if (grade) return grade;
  throw new Error(
    `${where}: grade "${word}" is not good, rewrite or kill (or GOOD, BAD or FIX)`,
  );
}

const EMPTY: PartGradeCounts = {
  good: 0,
  bad: 0,
  fix: 0,
  sharedGood: 0,
  sharedBad: 0,
  sharedFix: 0,
};

const EMPTY_AXIS: AxisGradeCounts = { good: 0, bad: 0, fix: 0 };

const SHARED = {
  good: "sharedGood",
  bad: "sharedBad",
  fix: "sharedFix",
} as const;

export interface GradedBatch {
  /** The batch file, or null when the grade file carries each line's parts. */
  readonly batch: BatchFile | null;
  readonly grades: GradeFile;
}

function addAxisGrade(
  parts: Record<string, PartGradeCounts>,
  key: string,
  axis: string,
  grade: OwnerGrade,
): void {
  const counts = parts[key] ?? EMPTY;
  const onAxis = counts.axes?.[axis] ?? EMPTY_AXIS;
  parts[key] = {
    ...counts,
    axes: { ...counts.axes, [axis]: { ...onAxis, [grade]: onAxis[grade] + 1 } },
  };
}

/**
 * A multi-axis row. Each axis grade counts against the line's parts on that
 * axis; the variant the owner preferred counts GOOD for its own parts there.
 */
function foldAxes(
  parts: Record<string, PartGradeCounts>,
  row: GradeFileRow,
  lineKeys: readonly string[],
  item: BatchFileItem | undefined,
  where: string,
): void {
  for (const [axis, word] of Object.entries(row.axes ?? {})) {
    // A number from 1 to 5 is a calibration grade, folded by foldCalibration.
    if (typeof word === "number") continue;
    const grade = ownerGrade({ grade: word }, `${where} axis ${axis}`);
    for (const key of new Set(lineKeys)) addAxisGrade(parts, key, axis, grade);
    const preferred =
      typeof row.prefer === "object" ? row.prefer[axis] : undefined;
    if (preferred === undefined) continue;
    const variant = item?.variants?.find(
      (row) => row.n === preferred && row.axis === axis,
    );
    if (!variant)
      throw new Error(
        `${where}: prefer ${axis} ${preferred} names no ${axis} variant`,
      );
    for (const key of new Set(variant.parts))
      addAxisGrade(parts, key, axis, "good");
  }
}

/** A grade in the bench shape: numeric axes on one line of an item. */
export function isBenchGrade(row: GradeFileRow): boolean {
  return (
    row.axes !== undefined &&
    Object.values(row.axes).some((value) => typeof value === "number")
  );
}

export function foldGrades(graded: readonly GradedBatch[]): PartGradeLedger {
  const parts: Record<string, PartGradeCounts> = {};
  const batches: string[] = [];
  for (const { batch, grades } of graded) {
    const id = batch?.id ?? grades.batch ?? "batch";
    batches.push(id);
    const byNumber = new Map(batch?.items.map((item) => [item.i, item]));
    for (const row of rowsOf(grades)) {
      // A bench grade (1 to 5 per axis) tunes the calibration table, not the
      // good/bad ledger (`foldCalibration`).
      if (isBenchGrade(row)) continue;
      const number = row.i ?? row.n;
      const where = `${id} item ${number}`;
      const item = number === undefined ? undefined : byNumber.get(number);
      // A choice set: each reply counts against its own parts.
      if (row.choices) {
        for (const [n, word] of Object.entries(row.choices)) {
          const choice = item?.choices?.find((c) => c.n === Number(n));
          if (!choice?.parts.length)
            throw new Error(`${where}: no reply ${n} in the choice set`);
          const grade = ownerGrade({ grade: word }, `${where} reply ${n}`);
          const field = choice.parts.length === 1 ? grade : SHARED[grade];
          for (const key of new Set(choice.parts)) {
            const counts = parts[key] ?? EMPTY;
            parts[key] = { ...counts, [field]: counts[field] + 1 };
          }
        }
        if (row.grade === undefined && row.verdict === undefined) continue;
      }
      // One preferred alternative, in a scene batch: it is good there.
      if (typeof row.prefer === "number") {
        const better = item?.variants?.find((v) => v.n === row.prefer);
        if (!better)
          throw new Error(
            `${where}: prefer ${row.prefer} names no alternative`,
          );
        for (const key of new Set(better.parts)) {
          const counts = parts[key] ?? EMPTY;
          parts[key] = { ...counts, good: counts.good + 1 };
        }
      }
      const keys =
        row.parts ??
        (number === undefined ? undefined : byNumber.get(number)?.parts);
      if (!keys || keys.length === 0)
        throw new Error(`${where}: no such item in the batch`);
      if (row.axes) {
        foldAxes(parts, row, keys, byNumber.get(number!), where);
        // A row may carry an overall grade too; it counts as in one-axis batches.
        if (row.grade === undefined && row.verdict === undefined) continue;
      }
      const grade = ownerGrade(row, where);
      const field = keys.length === 1 ? grade : SHARED[grade];
      for (const key of new Set(keys)) {
        const counts = parts[key] ?? EMPTY;
        parts[key] = { ...counts, [field]: counts[field] + 1 };
      }
    }
  }
  const sorted: Record<string, PartGradeCounts> = {};
  for (const key of Object.keys(parts).sort()) sorted[key] = parts[key]!;
  return { schema: "english-part-grades/1", batches, parts: sorted };
}

export const CALIBRATION_FILE = "data/english/calibration.json";

const addRunning = (
  table: Record<string, RunningGrade>,
  id: string,
  grade: number,
): void => {
  const was = table[id] ?? { mean: 0, count: 0 };
  table[id] = {
    mean: Number(((was.mean * was.count + grade) / (was.count + 1)).toFixed(4)),
    count: was.count + 1,
  };
};

const axisKey = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * Folds the bench grades of each batch not yet folded into the calibration
 * table, a small step each (`parameters.step`): trait fit moves its speaker's
 * traits' pull toward the line's bearing; "too long" or "too short" moves the
 * register's target length and the speaker's traits' length pull;
 * naturalness moves the move pair. Pure; returns a new table. Weights only,
 * and none of them is a grade of a line.
 */
export function foldCalibration(
  graded: readonly GradedBatch[],
  base: CalibrationTable,
): CalibrationTable {
  const step = base.parameters.step!.value;
  const movePairs: Record<string, RunningGrade> = { ...base.movePairs };
  const traits: Record<
    string,
    { bearing?: Record<string, number>; length?: number }
  > = Object.fromEntries(
    Object.entries(base.traits).map(([id, row]) => [
      id,
      { ...row, ...(row.bearing ? { bearing: { ...row.bearing } } : {}) },
    ]),
  );
  const registers: Record<
    string,
    { targetWords?: number; targetSentences?: number }
  > = Object.fromEntries(
    Object.entries(base.registers).map(([id, row]) => [id, { ...row }]),
  );
  const folded = [...base.folded];
  for (const { batch, grades } of graded) {
    const id = batch?.id ?? grades.batch ?? "batch";
    if (folded.includes(id)) continue;
    let any = false;
    for (const row of rowsOf(grades)) {
      if (!isBenchGrade(row)) continue;
      const where = `${id} item ${row.i ?? row.n}`;
      const item = batch?.items.find((entry) => entry.i === (row.i ?? row.n));
      // A grade of the whole scene (line 0) names no piece: it is kept in
      // the grade file for the page and moves no piece or trait weight.
      if (row.line === 0) continue;
      const line = item?.lines?.find((entry) => entry.n === row.line);
      if (!line) throw new Error(`${where}: no line ${row.line} in the item`);
      any = true;
      const numeric: Record<string, number> = {};
      let length: string | undefined;
      for (const [name, value] of Object.entries(row.axes ?? {})) {
        if (typeof value === "number") {
          if (value < 1 || value > 5)
            throw new Error(`${where}: ${name} is ${value}, not 1 to 5`);
          numeric[axisKey(name)] = value;
        } else if (axisKey(name) === "length") length = value.toLowerCase();
      }
      // A grade of a line's quality moves no weight: a line plays or it does
      // not (the ledger and the rules). Only the pair, the speaker's traits
      // and the register's length move.
      if (numeric.naturalness !== undefined && line.move && line.previousMove)
        addRunning(
          movePairs,
          `${line.previousMove}>${line.move}`,
          numeric.naturalness,
        );
      const levels = Object.entries(line.speakerTraits ?? {}).filter(
        ([, level]) => level !== 0,
      );
      if (numeric.traitfit !== undefined && line.bearing)
        for (const [trait, level] of levels) {
          const row2 = (traits[trait] ??= {});
          const bearing = (row2.bearing ??= {});
          bearing[line.bearing] = Number(
            clamp(
              (bearing[line.bearing] ?? 0) +
                step * ((numeric.traitfit - 3) / 2) * Math.sign(level),
              -1,
              1,
            ).toFixed(4),
          );
        }
      const direction = /long/.test(length ?? "")
        ? -1
        : /short/.test(length ?? "")
          ? 1
          : 0;
      if (direction && line.register) {
        const register = (registers[line.register] ??= {});
        const words = register.targetWords ?? line.words ?? 0;
        if (words)
          register.targetWords = Number(
            Math.max(1, words + direction * step * words).toFixed(2),
          );
        const sentences = register.targetSentences ?? line.sentences ?? 0;
        if (sentences)
          register.targetSentences = Number(
            Math.max(1, sentences + direction * step * sentences).toFixed(2),
          );
        // The speaker's traits that went with a too-long line pull shorter.
        for (const [trait, level] of levels) {
          const row2 = (traits[trait] ??= {});
          row2.length = Number(
            clamp(
              (row2.length ?? 0) + direction * step * Math.sign(level),
              -1,
              1,
            ).toFixed(4),
          );
        }
      }
    }
    if (any) folded.push(id);
  }
  return { ...base, folded, traits, registers, movePairs };
}

export const COVERAGE_FILE = "data/english/coverage.json";

/** How many graded items each axis has in each kind of text (CTO 2:23 p.m. Oct 8). */
export type GradedCoverage = Readonly<
  Record<string, Readonly<Record<string, number>>>
>;

export interface CoverageBatchItem extends BatchFileItem {
  readonly axis?: string;
  readonly kind?: string;
}

/**
 * The graded count for every axis and kind. A grade counts toward its batch
 * item's axis and kind; a grade file without its batch reads them from the
 * grade row, and a row that names neither counts under "unknown".
 */
export function gradedCoverage(graded: readonly GradedBatch[]): GradedCoverage {
  const table: Record<string, Record<string, number>> = {};
  for (const { batch, grades } of graded) {
    const items = new Map(
      (batch?.items as readonly CoverageBatchItem[] | undefined)?.map(
        (item) => [item.i, item],
      ),
    );
    for (const row of rowsOf(grades)) {
      const item = items.get(row.i ?? row.n ?? -1);
      if (row.axes) {
        for (const axis of Object.keys(row.axes)) {
          const kind = item?.kind ?? "unknown";
          table[axis] = {
            ...table[axis],
            [kind]: (table[axis]?.[kind] ?? 0) + 1,
          };
        }
        continue;
      }
      const fromRow = row as GradeFileRow & {
        readonly axis?: string;
        readonly kind?: string;
      };
      const axis = item?.axis ?? fromRow.axis ?? "unknown";
      const kind = item?.kind ?? fromRow.kind ?? "unknown";
      table[axis] = { ...table[axis], [kind]: (table[axis]?.[kind] ?? 0) + 1 };
    }
  }
  return table;
}

/** One batch's graded counts, keyed by the batch's own id. */
export type GradedCoverageByBatch = Readonly<Record<string, GradedCoverage>>;

/**
 * The graded count of each batch on its own, so a batch's share stays in the
 * coverage file after its files are deleted from the repository.
 */
export function gradedCoverageByBatch(
  graded: readonly GradedBatch[],
): GradedCoverageByBatch {
  const byBatch: Record<string, GradedCoverage> = {};
  for (const row of graded) {
    const id = row.batch?.id ?? row.grades.batch;
    if (!id) throw new Error("A graded batch names no id.");
    byBatch[id] = gradedCoverage([row]);
  }
  return byBatch;
}

/** Every batch's graded counts added together, axis by kind. */
export function sumGradedCoverage(
  byBatch: GradedCoverageByBatch,
): GradedCoverage {
  const table: Record<string, Record<string, number>> = {};
  for (const id of Object.keys(byBatch).sort())
    for (const [axis, kinds] of Object.entries(byBatch[id]!))
      for (const [kind, count] of Object.entries(kinds))
        table[axis] = {
          ...table[axis],
          [kind]: (table[axis]?.[kind] ?? 0) + count,
        };
  return table;
}

/**
 * A grade file of span grades (the voice-note reader's output: rows of
 * `{ key, spans }`). Only a span-grade file's whole-line verdicts reach the
 * ledger (`withVoiceGrades`); the ledger's fold of whole-line grades leaves
 * the file alone.
 */
export function isSpanGradeFile(path: string): boolean {
  const rows = rowsOf(JSON.parse(readFileSync(path, "utf8")));
  return (
    rows.length > 0 &&
    rows.every(
      (row) =>
        typeof (row as { key?: unknown }).key === "string" &&
        Array.isArray((row as { spans?: unknown }).spans),
    )
  );
}

/** The graded batches on disk, in batch order (batch-2 before batch-10). */
export function readGradedBatches(
  batchDir = BATCH_DIR,
  gradeDir = GRADE_DIR,
): GradedBatch[] {
  if (!existsSync(gradeDir)) return [];
  const order = (name: string) => Number(/(\d+)/.exec(name)?.[1] ?? 0);
  return readdirSync(gradeDir)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .filter((name) => !isSpanGradeFile(join(gradeDir, name)))
    .map((name) => {
      const batchPath = join(batchDir, basename(name));
      const grades = JSON.parse(
        readFileSync(join(gradeDir, name), "utf8"),
      ) as GradeFile;
      // A grade file that carries each line's parts stands on its own.
      const selfContained = rowsOf(grades).every(
        (row) => (row.parts?.length ?? 0) > 0,
      );
      if (!existsSync(batchPath) && !selfContained)
        throw new Error(`${join(gradeDir, name)}: no batch at ${batchPath}`);
      return {
        batch: existsSync(batchPath)
          ? (JSON.parse(readFileSync(batchPath, "utf8")) as BatchFile)
          : null,
        grades,
      };
    });
}

/** A part's counts plus another's. */
function plus(was: PartGradeCounts, add: PartGradeCounts): PartGradeCounts {
  const axes: Record<string, AxisGradeCounts> = { ...(was.axes ?? {}) };
  for (const [axis, counts] of Object.entries(add.axes ?? {}) as [
    string,
    AxisGradeCounts,
  ][]) {
    const prior = axes[axis] ?? { good: 0, bad: 0, fix: 0 };
    axes[axis] = {
      good: prior.good + counts.good,
      bad: prior.bad + counts.bad,
      fix: prior.fix + counts.fix,
    };
  }
  return {
    good: was.good + add.good,
    bad: was.bad + add.bad,
    fix: was.fix + add.fix,
    sharedGood: was.sharedGood + add.sharedGood,
    sharedBad: was.sharedBad + add.sharedBad,
    sharedFix: was.sharedFix + add.sharedFix,
    ...(Object.keys(axes).length ? { axes } : {}),
  };
}

/** Two sets of part counts added together, parts in key order. */
function addParts(
  one: Readonly<Record<string, PartGradeCounts>>,
  two: Readonly<Record<string, PartGradeCounts>>,
): Record<string, PartGradeCounts> {
  const parts: Record<string, PartGradeCounts> = { ...one };
  for (const [key, add] of Object.entries(two))
    parts[key] = plus(parts[key] ?? EMPTY, add);
  const sorted: Record<string, PartGradeCounts> = {};
  for (const key of Object.keys(parts).sort()) sorted[key] = parts[key]!;
  return sorted;
}

/**
 * The ledger is a pure result of the grade files on disk plus the share of
 * batches whose files are gone. That share is written into the ledger itself
 * (`kept`), so a rerun never has to guess it back out of the totals: the
 * totals are always the fresh fold plus `kept`, however many times this runs.
 * A batch whose files have just gone away is moved into `kept` by taking its
 * share out of the old totals (everything the files still on disk fold to,
 * and the old `kept`, come out first).
 */
export function withKept(
  fresh: PartGradeLedger,
  existing: PartGradeLedger | undefined,
  /** Folds the named batches still on disk, to take their share out of `existing`. */
  refold?: (ids: readonly string[]) => PartGradeLedger,
): PartGradeLedger {
  if (!existing) return fresh;
  const prior = existing.kept ?? { batches: [], parts: {} };
  const back = prior.batches.filter((id) => fresh.batches.includes(id));
  if (back.length)
    throw new Error(
      `${LEDGER_FILE}: batches ${back.join(", ")} are kept from files that are gone but are on disk again; remove them from "kept" and refold`,
    );
  const onDisk = existing.batches.filter((id) => fresh.batches.includes(id));
  const gone = existing.batches.filter(
    (id) => !fresh.batches.includes(id) && !prior.batches.includes(id),
  );
  let kept = prior;
  if (gone.length) {
    // Some of the ledger's batches are still on disk: their share comes out
    // of the ledger, and what is left beyond the old `kept` is the share of
    // the batches that went away.
    if (!refold && onDisk.length)
      throw new Error(
        `${LEDGER_FILE}: some of its batches are on disk and some are not (${gone.join(", ")} missing); restore their files or fold them together`,
      );
    const rest = without(
      without(existing, { ...existing, batches: [], parts: prior.parts }),
      onDisk.length ? refold!(onDisk) : { ...existing, batches: [], parts: {} },
    );
    kept = {
      batches: [...prior.batches, ...gone],
      parts: addParts(prior.parts, rest.parts),
    };
  }
  if (!kept.batches.length) return fresh;
  return {
    ...fresh,
    batches: [...kept.batches, ...fresh.batches],
    parts: addParts(kept.parts, fresh.parts),
    kept: { batches: kept.batches, parts: kept.parts },
  };
}

/** A ledger with another ledger's counts taken out. */
function without(
  ledger: PartGradeLedger,
  share: PartGradeLedger,
): PartGradeLedger {
  const parts: Record<string, PartGradeCounts> = { ...ledger.parts };
  for (const [key, out] of Object.entries(share.parts)) {
    const was = parts[key];
    if (!was) continue;
    const axes: Record<string, AxisGradeCounts> = { ...(was.axes ?? {}) };
    for (const [axis, counts] of Object.entries(out.axes ?? {}) as [
      string,
      AxisGradeCounts,
    ][]) {
      const prior = axes[axis];
      if (!prior) continue;
      axes[axis] = {
        good: prior.good - counts.good,
        bad: prior.bad - counts.bad,
        fix: prior.fix - counts.fix,
      };
      if (!axes[axis]!.good && !axes[axis]!.bad && !axes[axis]!.fix)
        delete axes[axis];
    }
    const left: PartGradeCounts = {
      good: was.good - out.good,
      bad: was.bad - out.bad,
      fix: was.fix - out.fix,
      sharedGood: was.sharedGood - out.sharedGood,
      sharedBad: was.sharedBad - out.sharedBad,
      sharedFix: was.sharedFix - out.sharedFix,
      ...(Object.keys(axes).length ? { axes } : {}),
    };
    const empty =
      !left.good &&
      !left.bad &&
      !left.fix &&
      !left.sharedGood &&
      !left.sharedBad &&
      !left.sharedFix &&
      !left.axes;
    if (empty) delete parts[key];
    else parts[key] = left;
  }
  return {
    ...ledger,
    batches: ledger.batches.filter((id) => !share.batches.includes(id)),
    parts,
  };
}

export const PARTS_DIR = "data/english/parts";

/**
 * Adds the owner's voice-note grades (span-grade files) to a fold: a line his
 * words grade clearly good counts as good, clearly bad as bad, by the sum of
 * its spans. A line he graded part of keeps its part grades on the grade map
 * only. The batch is listed once, by the file's `batch`.
 */
export function withVoiceGrades(
  fold: PartGradeLedger,
  gradeDir = GRADE_DIR,
  /** Only the voice batches with these ids (`<batch>:voice`), when given. */
  only?: readonly string[],
): PartGradeLedger {
  if (!existsSync(gradeDir)) return fold;
  const parts: Record<string, PartGradeCounts> = { ...fold.parts };
  const batches = [...fold.batches];
  for (const name of readdirSync(gradeDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    const path = join(gradeDir, name);
    if (!isSpanGradeFile(path)) continue;
    const file = JSON.parse(readFileSync(path, "utf8")) as {
      batch?: string;
      grades: { key: string; spans: { strength: number }[] }[];
    };
    const id = `${file.batch ?? basename(name, ".json")}:voice`;
    if (only && !only.includes(id)) continue;
    if (!batches.includes(id)) batches.push(id);
    for (const row of file.grades) {
      // A line of a text scene that is no bank piece has no key and no part to grade.
      if (!row.key) continue;
      const net = row.spans.reduce((sum, span) => sum + span.strength, 0);
      if (Math.abs(net) < VOICE_VERDICT) continue;
      const counts = (parts[row.key] ??= {
        good: 0,
        bad: 0,
        fix: 0,
        sharedGood: 0,
        sharedBad: 0,
        sharedFix: 0,
      });
      parts[row.key] =
        net > 0
          ? { ...counts, good: counts.good + 1 }
          : { ...counts, bad: counts.bad + 1 };
    }
  }
  return { ...fold, batches, parts };
}

/**
 * The ledger the grade files in `gradeDir` fold to: every row of every file
 * counted once, plus the share of batches whose files are gone (`kept`, read
 * from `existing`). Folding again from its own result changes nothing.
 */
export function foldLedger(
  graded: readonly GradedBatch[],
  existing: PartGradeLedger | undefined,
  gradeDir = GRADE_DIR,
): PartGradeLedger {
  return withKept(
    withVoiceGrades(foldGrades(graded), gradeDir),
    existing,
    // A voice batch's share comes out with the rest, or each run counts it again.
    (ids) =>
      withVoiceGrades(
        foldGrades(
          graded.filter((row) =>
            ids.includes(row.batch?.id ?? row.grades.batch ?? ""),
          ),
        ),
        gradeDir,
        ids,
      ),
  );
}

function main() {
  const graded = readGradedBatches();
  const ledger = foldLedger(
    graded,
    existsSync(LEDGER_FILE)
      ? (JSON.parse(readFileSync(LEDGER_FILE, "utf8")) as PartGradeLedger)
      : undefined,
  );
  // The coverage file keeps what batches asked (byKind, cells) beside what the
  // owner has graded, axis by kind.
  const coverage = existsSync(COVERAGE_FILE)
    ? (JSON.parse(readFileSync(COVERAGE_FILE, "utf8")) as Record<
        string,
        unknown
      >)
    : {};
  // Each batch's share is kept by id: one whose files were since deleted
  // keeps its counts, and one still on disk is counted again from its files.
  const byBatch = {
    ...((coverage.gradedByBatch as GradedCoverageByBatch | undefined) ?? {}),
    ...gradedCoverageByBatch(graded),
  };
  writeFileSync(
    COVERAGE_FILE,
    `${JSON.stringify({ ...coverage, graded: sumGradedCoverage(byBatch), gradedByBatch: byBatch }, null, 2)}\n`,
  );
  execSync(`npx prettier --write ${COVERAGE_FILE}`, { stdio: "ignore" });
  const table = JSON.parse(
    readFileSync(CALIBRATION_FILE, "utf8"),
  ) as CalibrationTable;
  const folded = foldCalibration(graded, table);
  if (folded.folded.length !== table.folded.length) {
    writeFileSync(CALIBRATION_FILE, `${JSON.stringify(folded, null, 2)}\n`);
    execSync(`npx prettier --write ${CALIBRATION_FILE}`, { stdio: "ignore" });
    console.log(
      `Wrote ${CALIBRATION_FILE}: batches folded ${folded.folded.join(", ")}.`,
    );
  }
  writeFileSync(LEDGER_FILE, `${JSON.stringify(ledger, null, 2)}\n`);
  // A committed data file, written in the repository's JSON style.
  execSync(`npx prettier --write ${LEDGER_FILE}`, { stdio: "ignore" });
  const held = Object.keys(ledger.parts).filter((key) =>
    heldByGrades(key, ledger),
  );
  console.log(
    `Wrote ${LEDGER_FILE}: ${ledger.batches.length} graded batches, ${Object.keys(ledger.parts).length} parts graded, ${held.length} held back.`,
  );
  // The ledger and the rules are the only gates: a bank part plays unless the
  // grades hold it or a rule pulled it (`npm run words:rules`).
  const pieces = readBankPieces();
  const heldInBanks = pieces.filter((piece) =>
    heldByGrades(piece.key, ledger),
  ).length;
  console.log(
    `Banks in ${PARTS_DIR}: ${pieces.length - heldInBanks} parts play, ${heldInBanks} held by the grades. Now run: npm run words:rules`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
