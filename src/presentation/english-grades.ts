/**
 * The owner's grades, read by the English engine (00s P3: "grades are DATA
 * the engine reads").
 *
 * A grading batch (`data/english/batches/batch-<n>.json`) lists real engine
 * lines with the part keys that made each one. The owner's grades come back
 * as `data/english/grades/batch-<n>.json`:
 *
 *   { "batch": "batch-1", "grades": [ { "i": 0, "grade": "GOOD" },
 *     { "i": 4, "grade": "BAD", "note": "..." } ] }
 *
 * `scripts/dialogue-batch/apply-grades.ts` folds every graded batch into one
 * ledger, `data/english/part-grades.json`, counted per part key. The engine
 * reads that ledger here: a part the owner graded BAD or FIX, and never GOOD,
 * is held back, so the next line comes from another part of the same bank.
 * Nothing is reworded; a held part is simply not chosen.
 *
 * Pure: reads data, never the world.
 */
import ledgerFile from "../../data/english/part-grades.json" with { type: "json" };

export type OwnerGrade = "good" | "bad" | "fix";

export interface PartGradeCounts {
  /** Grades of lines made from this part alone. */
  readonly good: number;
  readonly bad: number;
  readonly fix: number;
  /** Grades of lines this part shared with other parts. */
  readonly sharedGood: number;
  readonly sharedBad: number;
  readonly sharedFix: number;
}

export interface PartGradeLedger {
  readonly schema: "english-part-grades/1";
  /** The graded batches folded in, oldest first. */
  readonly batches: readonly string[];
  readonly parts: Readonly<Record<string, PartGradeCounts>>;
}

export const PART_GRADES = ledgerFile as PartGradeLedger;

/**
 * Whether the owner's grades hold a part back. A part graded BAD or FIX on a
 * line of its own, and never GOOD, is held. A part that only shared graded
 * lines with other parts is held once two such lines were BAD or FIX and none
 * was GOOD, so one bad neighbor does not sink a part that may be fine.
 */
export function heldByGrades(
  partKey: string,
  ledger: PartGradeLedger = PART_GRADES,
): boolean {
  const counts = ledger.parts[partKey];
  if (!counts) return false;
  if (counts.good > 0 || counts.sharedGood > 0) return false;
  if (counts.bad + counts.fix > 0) return true;
  return counts.sharedBad + counts.sharedFix >= 2;
}
