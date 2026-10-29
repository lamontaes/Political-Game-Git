/**
 * The calibration table the English engine reads (owner, Oct 15, 2026: "every
 * word is a data point calibrating the entire engine"). Weights only: no
 * scenario text, no scene script, no if-this-town-then-that. Nothing here
 * names a place, a person or a situation's wording. The table
 * (`data/english/calibration.json`) holds, all TUNABLE with the spread each is
 * checked against:
 *
 *   per trait      a pull toward each bearing and toward longer or shorter lines;
 *   per register   the target length in words and sentences;
 *   per piece      a running grade (mean over the axes graded, with a count);
 *   per move pair  whether that arrangement read naturally.
 *
 * `scripts/dialogue-batch/apply-grades.ts` folds each grade in; the engine
 * reads the table when it chooses a piece (`english-composition.ts`) and ranks
 * a reply (`src/director/conversation.ts`). Every function is pure and
 * deterministic (no randomness), and an empty table returns 1 or 0 everywhere,
 * so output is unchanged until a grade moves a weight.
 */
import tableFile from "../../data/english/calibration.json" with { type: "json" };
import reachFile from "../../data/english/grade-reach.json" with { type: "json" };
import { reachFactor, type ReachTable } from "./grade-reach";

export interface RunningGrade {
  readonly mean: number;
  readonly count: number;
}

export interface CalibrationTable {
  readonly schema: "english-calibration/1";
  readonly parameters: Readonly<Record<string, { readonly value: number }>>;
  readonly folded: readonly string[];
  readonly traits: Readonly<
    Record<
      string,
      {
        /** Pull toward each bearing, -1 to 1. */
        readonly bearing?: Readonly<Record<string, number>>;
        /** Pull toward longer (positive) or shorter (negative) lines. */
        readonly length?: number;
      }
    >
  >;
  readonly registers: Readonly<
    Record<
      string,
      { readonly targetWords?: number; readonly targetSentences?: number }
    >
  >;
  readonly pieces: Readonly<Record<string, RunningGrade>>;
  readonly movePairs: Readonly<Record<string, RunningGrade>>;
  /** The class of each bank's register, for how far a grade reaches (`grade-reach.ts`). */
  readonly registerClasses?: Readonly<Record<string, string>>;
  /** How far the owner's grades reach: the pieces sharing a graded piece's pattern, voice and register. Absent: no reach. */
  readonly reach?: ReachTable;
}

export const CALIBRATION = {
  ...(tableFile as unknown as CalibrationTable),
  reach: reachFile as unknown as ReachTable,
} as CalibrationTable;

/** The middle of the 1 to 5 grade scale; a piece graded 3 is neither favored nor held down. */
export const MIDDLE_GRADE = 3;

const parameter = (table: CalibrationTable, key: string): number => {
  const row = table.parameters[key];
  if (!row) throw new Error(`calibration.json has no parameter ${key}`);
  return row.value;
};

/**
 * How much a piece is chosen relative to its authored weight: its own running
 * grade, and the reach of the grades given to other pieces of its pattern,
 * voice and register (`grade-reach.ts`). 1 when neither applies.
 */
export function pieceFactor(
  ids: readonly string[],
  table: CalibrationTable = CALIBRATION,
): number {
  return ownGradeFactor(ids, table) * gradeReach(ids, table);
}

/** The reach of other pieces' grades on this one; 1 on a table with no reach. */
export function gradeReach(
  ids: readonly string[],
  table: CalibrationTable = CALIBRATION,
): number {
  if (!table.reach) return 1;
  return reachFactor(ids, table.reach, {
    floor: parameter(table, "reachFloor"),
    ceiling: parameter(table, "reachCeiling"),
    saturation: parameter(table, "reachSaturation"),
  });
}

function ownGradeFactor(
  ids: readonly string[],
  table: CalibrationTable,
): number {
  const found = ids
    .map((id) => table.pieces[id])
    .find((row): row is RunningGrade => row !== undefined);
  if (!found) return 1;
  const floor = parameter(table, "pieceFloor");
  const ceiling = parameter(table, "pieceCeiling");
  const full = Math.min(1, found.count / parameter(table, "pieceFullAt"));
  const unit = (found.mean - MIDDLE_GRADE) / (MIDDLE_GRADE - 1);
  const ends = unit >= 0 ? ceiling - 1 : 1 - floor;
  return 1 + unit * ends * full;
}

/** Sum of a speaker's trait pulls toward longer lines, each weighted by how far the trait is from the middle (levels -2 to 2). */
export function lengthPull(
  traits: Readonly<Record<string, number>> | undefined,
  table: CalibrationTable = CALIBRATION,
): number {
  if (!traits) return 0;
  let sum = 0;
  for (const [id, level] of Object.entries(traits)) {
    const pull = table.traits[id]?.length;
    if (pull) sum += pull * (level / 2);
  }
  return sum;
}

/** Sum of a speaker's trait pulls toward one bearing. */
export function bearingPull(
  traits: Readonly<Record<string, number>> | undefined,
  bearing: string | undefined,
  table: CalibrationTable = CALIBRATION,
): number {
  if (!traits || !bearing) return 0;
  let sum = 0;
  for (const [id, level] of Object.entries(traits)) {
    const pull = table.traits[id]?.bearing?.[bearing];
    if (pull) sum += pull * (level / 2);
  }
  return sum;
}

/**
 * How much a speaker's traits favor a wording's bearing: 1 with no bearing or
 * no pull, more for a bearing the speaker leans toward, less (never below the
 * floor) for one they lean away from.
 */
export function bearingFactor(
  bearing: string | undefined,
  traits: Readonly<Record<string, number>> | undefined,
  table: CalibrationTable = CALIBRATION,
): number {
  const pull = bearingPull(traits, bearing, table);
  if (!pull) return 1;
  return Math.max(
    parameter(table, "bearingFloor"),
    1 + parameter(table, "bearingScale") * pull,
  );
}

/**
 * How well a piece's length suits the register and the speaker: 1 at the
 * register's target (moved longer or shorter by the speaker's trait pulls),
 * falling as it departs. 1 when the register has no target.
 */
export function lengthFactor(
  register: string | undefined,
  words: number,
  traits: Readonly<Record<string, number>> | undefined,
  table: CalibrationTable = CALIBRATION,
): number {
  const target = register ? table.registers[register]?.targetWords : undefined;
  if (!target) return 1;
  const aimed = Math.max(
    1,
    target * (1 + parameter(table, "pullScale") * lengthPull(traits, table)),
  );
  const off = Math.abs(words - aimed) / aimed;
  return 1 / (1 + parameter(table, "lengthSlope") * off);
}

/** How naturally a move follows another, from the pair's running grade; 1 when never graded. */
export function movePairFactor(
  previous: string | undefined,
  next: string | undefined,
  table: CalibrationTable = CALIBRATION,
): number {
  if (!previous || !next) return 1;
  const row = table.movePairs[`${previous}>${next}`];
  return row
    ? pieceFactor([`${previous}>${next}`], {
        ...table,
        pieces: table.movePairs,
      })
    : 1;
}

/** Words in a line, as the bench counts them. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Sentences in a line, as the bench counts them. */
export function sentenceCount(text: string): number {
  return (text.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [text]).filter((s) =>
    s.trim(),
  ).length;
}

/** Shares an authored weight of 1 is scaled to, so the stable pick stays an integer draw. */
const WEIGHT_SHARES = 1000;

/**
 * Re-weights a bank's variants by the table: the piece's running grade, the
 * length and bearing the speaker's traits favor, and the move before it. The
 * one place a variant's weight factor is computed: a composed line's parts
 * and a rendered line's voice both come here (`grounded-english.ts`).
 * Returns the same array untouched when every factor is 1 (so an empty table
 * changes no pick). Weights are integers, which the stable pick needs.
 */
export function calibratedVariants<
  V extends {
    readonly key: string;
    readonly weight?: number;
    readonly bearing?: string;
    readonly pieceKey?: string;
  },
>(
  variants: readonly V[],
  context: {
    readonly bankKey: string;
    /** The bank part the variants fill; without one, only the variant's own piece key is looked up. */
    readonly part?: string;
    readonly register?: string;
    readonly traits?: Readonly<Record<string, number>>;
    readonly previousMove?: string;
    readonly moveOf?: (variant: V) => string | undefined;
    readonly textOf?: (variant: V) => string | undefined;
  },
  table: CalibrationTable = CALIBRATION,
): readonly V[] {
  const factors = variants.map((variant) => {
    const ids = [
      ...(context.part === undefined
        ? []
        : [`${context.bankKey}:${context.part}:${variant.key}`]),
      variant.pieceKey ?? variant.key,
    ];
    const text = context.textOf?.(variant);
    return (
      pieceFactor(ids, table) *
      (text === undefined
        ? 1
        : lengthFactor(
            context.register,
            wordCount(text),
            context.traits,
            table,
          )) *
      bearingFactor(variant.bearing, context.traits, table) *
      movePairFactor(context.previousMove, context.moveOf?.(variant), table)
    );
  });
  if (factors.every((factor) => factor === 1)) return variants;
  return variants.map((variant, at) => ({
    ...variant,
    weight: Math.max(
      1,
      Math.round((variant.weight ?? 1) * factors[at]! * WEIGHT_SHARES),
    ),
  }));
}
