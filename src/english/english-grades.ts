/**
 * The owner's grades, read by the English engine (00s P3: "grades are DATA
 * the engine reads").
 *
 * The owner's grades come from his voice notes on played scenes, or from the
 * grade control in play, as one grade file per set in `data/english/grades/`.
 * Each row names the part keys of the line it grades:
 *
 *   { "batch": "voice-notes-oct15-28", "grades": [
 *     { "i": 1, "grade": "GOOD", "parts": ["conversation.greet.a"] },
 *     { "i": 4, "grade": "BAD", "note": "...", "parts": ["journal.vote.b"] } ] }
 *
 * `scripts/dialogue-batch/apply-grades.ts` folds every grade file into one
 * ledger, `data/english/part-grades.json`, counted per part key. The engine
 * reads that ledger here: a part the owner graded BAD or FIX, and never GOOD,
 * is held back, so the next line comes from another part of the same bank.
 * Nothing is reworded; a held part is simply not chosen.
 *
 * Pure: reads data, never the world.
 */
import ledgerFile from "../../data/english/part-grades.json" with { type: "json" };

export type OwnerGrade = "good" | "bad" | "fix";

/** Grades of one axis (formality, length, ...) a part was graded on. */
export interface AxisGradeCounts {
  readonly good: number;
  readonly bad: number;
  readonly fix: number;
}

export interface PartGradeCounts {
  /** Grades of lines made from this part alone. */
  readonly good: number;
  readonly bad: number;
  readonly fix: number;
  /** Grades of lines this part shared with other parts. */
  readonly sharedGood: number;
  readonly sharedBad: number;
  readonly sharedFix: number;
  /**
   * Per-axis grades from a multi-axis batch (personality fit, formality, word
   * choice, sentence structure, length). Absent on parts graded on one axis.
   */
  readonly axes?: Readonly<Record<string, AxisGradeCounts>>;
}

export interface PartGradeLedger {
  readonly schema: "english-part-grades/1";
  /** The graded batches folded in, oldest first. */
  readonly batches: readonly string[];
  readonly parts: Readonly<Record<string, PartGradeCounts>>;
}

export const PART_GRADES = ledgerFile as PartGradeLedger;

/**
 * Whether the owner's grades hold a part back.
 *
 * With an axis, the part is held on that axis when it was graded BAD or FIX
 * there and never GOOD there; its grades on other axes do not count.
 *
 * Without an axis: a part graded BAD or FIX on a line of its own, and never
 * GOOD, is held. A part that only shared graded lines with other parts is
 * held once two such lines were BAD or FIX and none was GOOD, so one bad
 * neighbor does not sink a part that may be fine. A part graded on axes is
 * also held when every axis it was graded on is BAD or FIX and none is GOOD.
 */
export function heldByGrades(
  partKey: string,
  ledger: PartGradeLedger = PART_GRADES,
  axis?: string,
): boolean {
  const counts = ledger.parts[partKey];
  if (!counts) return false;
  if (axis !== undefined) {
    const onAxis = counts.axes?.[axis];
    return (
      onAxis !== undefined && onAxis.good === 0 && onAxis.bad + onAxis.fix > 0
    );
  }
  if (counts.good > 0 || counts.sharedGood > 0) return false;
  if (counts.bad + counts.fix > 0) return true;
  if (counts.sharedBad + counts.sharedFix >= 2) return true;
  const graded = Object.values(counts.axes ?? {});
  return (
    graded.length > 0 &&
    graded.every((row) => row.good === 0 && row.bad + row.fix > 0)
  );
}
