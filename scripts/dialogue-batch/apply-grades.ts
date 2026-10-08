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
  heldByGrades,
  type OwnerGrade,
  type PartGradeCounts,
  type PartGradeLedger,
} from "../../src/presentation/english-grades";

export const BATCH_DIR = "data/english/batches";
export const GRADE_DIR = "data/english/grades";
export const LEDGER_FILE = "data/english/part-grades.json";

export interface BatchFileItem {
  readonly i: number;
  readonly parts: readonly string[];
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
  fix: "fix",
  rewrite: "fix",
};

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

export function foldGrades(graded: readonly GradedBatch[]): PartGradeLedger {
  const parts: Record<string, PartGradeCounts> = {};
  const batches: string[] = [];
  for (const { batch, grades } of graded) {
    const id = batch?.id ?? grades.batch ?? "batch";
    batches.push(id);
    const byNumber = new Map(batch?.items.map((item) => [item.i, item]));
    for (const row of grades.grades ?? grades.items ?? []) {
      const number = row.i ?? row.n;
      const where = `${id} item ${number}`;
      const keys =
        row.parts ??
        (number === undefined ? undefined : byNumber.get(number)?.parts);
      if (!keys || keys.length === 0)
        throw new Error(`${where}: no such item in the batch`);
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
      const selfContained = (grades.grades ?? grades.items ?? []).every(
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

function main() {
  const ledger = foldGrades(readGradedBatches());
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
