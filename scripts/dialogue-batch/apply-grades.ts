/**
 * Folds the owner's grades into the ledger the English engine reads.
 *
 *   node --import tsx scripts/dialogue-batch/apply-grades.ts
 *
 * Reads every grading batch in data/english/batches/ and every grade file in
 * data/english/grades/ with the same name, joins each grade to its batch item
 * by number, and counts the grade against the part keys that made the line.
 * Writes data/english/part-grades.json, which `src/presentation/
 * english-grades.ts` reads. A grade file whose batch is missing, or a grade
 * that names no item, stops the run with the file and number, so no grade is
 * silently lost.
 *
 * A development tool. It never words anything.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  type AxisGradeCounts,
  heldByGrades,
  type OwnerGrade,
  type PartGradeCounts,
  type PartGradeLedger,
} from "../../src/english/english-grades";

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

export interface BatchFileItem {
  readonly i: number;
  readonly parts: readonly string[];
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
  readonly axes?: Readonly<Record<string, string>>;
  /** The variant number that is better: per axis, or one number in a scene batch. */
  readonly prefer?: Readonly<Record<string, number>> | number;
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

export function foldGrades(graded: readonly GradedBatch[]): PartGradeLedger {
  const parts: Record<string, PartGradeCounts> = {};
  const batches: string[] = [];
  for (const { batch, grades } of graded) {
    const id = batch?.id ?? grades.batch ?? "batch";
    batches.push(id);
    const byNumber = new Map(batch?.items.map((item) => [item.i, item]));
    for (const row of rowsOf(grades)) {
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

/**
 * Adds a fresh fold to grades kept from batches whose files were since
 * removed from the repository (the old batch and grade files were deleted
 * once folded), so no earlier grade is lost.
 */
export function withKept(
  fresh: PartGradeLedger,
  existing: PartGradeLedger | undefined,
  /** Folds the named batches still on disk, to take their share out of `existing`. */
  refold?: (ids: readonly string[]) => PartGradeLedger,
): PartGradeLedger {
  const kept = (existing?.batches ?? []).filter(
    (id) => !fresh.batches.includes(id),
  );
  if (!existing || !kept.length) return fresh;
  let base = existing;
  if (kept.length !== existing.batches.length) {
    // Some of the ledger's batches are still on disk: their share comes out
    // of the ledger, and the fresh fold adds it back once.
    if (!refold)
      throw new Error(
        `${LEDGER_FILE}: some of its batches are on disk and some are not (${kept.join(", ")} missing); restore their files or fold them together`,
      );
    base = without(
      existing,
      refold(existing.batches.filter((id) => !kept.includes(id))),
    );
  }
  const parts: Record<string, PartGradeCounts> = { ...base.parts };
  for (const [key, add] of Object.entries(fresh.parts)) {
    const was = parts[key] ?? EMPTY;
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
    parts[key] = {
      good: was.good + add.good,
      bad: was.bad + add.bad,
      fix: was.fix + add.fix,
      sharedGood: was.sharedGood + add.sharedGood,
      sharedBad: was.sharedBad + add.sharedBad,
      sharedFix: was.sharedFix + add.sharedFix,
      ...(Object.keys(axes).length ? { axes } : {}),
    };
  }
  const sorted: Record<string, PartGradeCounts> = {};
  for (const key of Object.keys(parts).sort()) sorted[key] = parts[key]!;
  return { ...fresh, batches: [...kept, ...fresh.batches], parts: sorted };
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

function main() {
  const graded = readGradedBatches();
  const ledger = withKept(
    foldGrades(graded),
    existsSync(LEDGER_FILE)
      ? (JSON.parse(readFileSync(LEDGER_FILE, "utf8")) as PartGradeLedger)
      : undefined,
    (ids) =>
      foldGrades(
        graded.filter((row) =>
          ids.includes(row.batch?.id ?? row.grades.batch ?? ""),
        ),
      ),
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
  writeFileSync(LEDGER_FILE, `${JSON.stringify(ledger, null, 2)}\n`);
  // A committed data file, written in the repository's JSON style.
  execSync(`npx prettier --write ${LEDGER_FILE}`, { stdio: "ignore" });
  const held = Object.keys(ledger.parts).filter((key) =>
    heldByGrades(key, ledger),
  );
  console.log(
    `Wrote ${LEDGER_FILE}: ${ledger.batches.length} graded batches, ${Object.keys(ledger.parts).length} parts graded, ${held.length} held back.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
