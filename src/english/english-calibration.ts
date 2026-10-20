/**
 * The owner's numeric grades, read by the English engine when it chooses.
 *
 * `data/english/calibration.json` holds only weights. A piece the owner
 * graded carries a running grade from -1 to 1; a register carries the line
 * length in words the owner's length grades settled on. When the engine
 * chooses among the pieces that can say a part, it keeps the best-scoring
 * ones: the running grade, less the weight times the words a piece is off its
 * register's target. A table with nothing graded keeps every piece, so
 * nothing changes until the owner grades.
 *
 * `scripts/dialogue-batch/apply-grades.ts` writes the table from the grade
 * files. Pure: reads data, never the world.
 */
import calibrationFile from "../../data/english/calibration.json" with { type: "json" };

export interface CalibrationWeight {
  readonly value: number;
  readonly tag: "TUNABLE";
  readonly citation: string;
  readonly spread: {
    readonly low: number;
    readonly high: number;
    readonly unit: string;
    readonly citation: string;
  };
}

export interface Calibration {
  readonly schema: "english-calibration/1";
  readonly step: CalibrationWeight;
  readonly lengthWeight: CalibrationWeight;
  /** Per register: the target length in words, settled by the length grades. */
  readonly registers: Readonly<
    Record<string, { readonly targetWords: number }>
  >;
  /** Per piece key: its running grade, -1 to 1. */
  readonly parts: Readonly<Record<string, { readonly grade: number }>>;
}

export const CALIBRATION = calibrationFile as unknown as Calibration;

/** The words in a line of text. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * A piece's score under the table: its running grade less the weight times
 * the words it is off the register's target. Null when the table knows
 * nothing about the piece or its register's length.
 */
export function calibrationScore(
  partKey: string,
  register: string | undefined,
  words: number | undefined,
  table: Calibration = CALIBRATION,
): number | null {
  const grade = table.parts[partKey]?.grade;
  const target =
    register === undefined ? undefined : table.registers[register]?.targetWords;
  if (grade === undefined && (target === undefined || words === undefined))
    return null;
  const off =
    target !== undefined && words !== undefined ? Math.abs(words - target) : 0;
  return (grade ?? 0) - table.lengthWeight.value * off;
}

/**
 * The candidates the table prefers: those scoring within one grade step of the
 * best. Candidates the table knows nothing about score zero, so graded pieces
 * rise above or fall below them. One grade moves a score by exactly one step
 * and never decides a choice alone (the step's own note): a single graded
 * piece keeps company with the ungraded ones, and only a second grade in the
 * same direction drops them. With nothing known about any candidate, all stay.
 */
export function preferGraded<T>(
  candidates: readonly T[],
  scoreOf: (candidate: T) => number | null,
  table: Calibration = CALIBRATION,
): readonly T[] {
  const scores = candidates.map((candidate) => scoreOf(candidate));
  if (scores.every((score) => score === null)) return candidates;
  const values = scores.map((score) => score ?? 0);
  const best = Math.max(...values);
  // The small allowance keeps a gap of exactly one step on the kept side.
  const floor = best - table.step.value - 1e-9;
  return candidates.filter((_, at) => values[at]! >= floor);
}
