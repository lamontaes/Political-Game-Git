/**
 * The shape of a state's bill numbering style, and the labeled game default
 * for a place with no recorded pattern. The table itself is
 * src/core2/data/legislature/bill-numbering-styles.json (decision OCD-LEG-NUM-001: each
 * state's own bill prefixes, chamber names and numbering period, from the
 * recorded research).
 */

export type BillNumberingBasis =
  /** Read directly from a recorded sample. */
  | "recorded"
  /** Read from a recorded sample for the other chamber, letter swapped. */
  | "mirrored-from-other-chamber"
  /** Read from the recorded prefix (an "A" bill is an Assembly bill). */
  | "inferred-from-recorded-prefix"
  /** Named in the Decision Register (OCD-LEG-NUM-001 or -002) itself. */
  | "decision-register"
  /** Read from the session labels the recorded samples carry. */
  | "session-label"
  /** A recorded starting number, with its source, checked against the samples. */
  | "recorded-start"
  /** A numbering period a source states outright, with its quote. */
  | "recorded-period"
  /** Nothing recorded; the game's own labeled default. */
  | "game-default";

export interface ChamberNumberingStyle {
  /**
   * The designation template. `{n}` is the bill's number, `{yy}` the last two
   * digits of the year its numbering period opened in.
   */
  readonly template: string;
  readonly templateBasis: BillNumberingBasis;
  readonly name: string;
  readonly nameBasis: BillNumberingBasis;
  /**
   * The number a regular session's first bill carries. Decision
   * OCD-LEG-NUM-002: where a state's recorded numbers begin above 1
   * (Washington's Senate at 5001), each session starts there; every other
   * chamber starts at 1.
   */
  readonly firstNumber: number;
  /**
   * For a state whose even-year session opens a block of its own (Rhode
   * Island's House at 7001), that session's first number; otherwise null and
   * every session starts at `firstNumber`.
   */
  readonly evenYearFirstNumber: number | null;
  readonly firstNumberBasis: BillNumberingBasis;
}

export interface StateBillNumberingStyle {
  readonly jurisdictionKey: string;
  readonly lower: ChamberNumberingStyle;
  readonly upper: ChamberNumberingStyle;
  /**
   * How long one run of numbers lasts before it returns to 1: one year, or
   * the two-year legislature.
   */
  readonly period: "annual" | "biennial";
  /** For a biennial state, whether its legislatures open in odd or even years. */
  readonly biennialOpensIn: "odd" | "even";
  readonly periodBasis: BillNumberingBasis;
}

export const DEFAULT_LOWER_TEMPLATE = "HB {n}";
export const DEFAULT_UPPER_TEMPLATE = "SB {n}";
export const DEFAULT_LOWER_NAME = "House of Representatives";
export const DEFAULT_UPPER_NAME = "Senate";
