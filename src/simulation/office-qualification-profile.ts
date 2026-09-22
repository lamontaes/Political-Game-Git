/**
 * What a typical office asks, measured from the states the game has read.
 *
 * Most of the country is not in the qualification corpus: seven states are,
 * and forty-three and the District are not. That absence is a fact about this
 * repository and never a fact about those states' law. The game still has to
 * answer whether somebody may stand for an office there, and there are three
 * answers it could give.
 *
 * It could refuse, which reads as the country being closed rather than as the
 * game being careful, and which would unseat offices that work today. It could
 * invent a number, which is worse: an invented rule gets quoted back later as
 * though the state had legislated it. Or it can say plainly that it has not
 * read this state's rule and is applying a typical one instead, and show its
 * working.
 *
 * This module is the third answer. Every value below is the median of the
 * values the corpus actually carries for that field and office family. Nothing
 * is written down by hand, so the profile moves on its own as states are
 * compiled, and it cannot drift away from its own evidence. A state the game
 * HAS read always uses its own rule; the profile is consulted only where there
 * is nothing to consult.
 *
 * The median, not the mean, because the samples are small and a median returns
 * a value that real law actually uses — twenty-one years, one year — where a
 * mean returns 21.75, which looks like a legal figure and is not one. On an
 * even-sized sample the lower of the two middle values wins: the game is
 * guessing about somebody's right to stand for office, and a guess should not
 * invent a barrier stricter than the states it learned from.
 *
 * This is the same device `STATE_EXECUTIVE_GAME_PROFILE` already uses for
 * governors' terms, and it carries the same obligation: a profile value is
 * `game-profile`, never `verified`, and anything that records an eligibility
 * decision records which of the two it rested on.
 */

import {
  OFFICE_QUALIFICATIONS_META,
  qualificationRows,
  type QualificationFieldName,
  type QualificationOfficeFamily,
} from "./office-qualification-rules";

/** A typical value, with enough provenance to say where it came from. */
export interface TypicalQualification {
  readonly field: QualificationFieldName;
  readonly officeFamily: QualificationOfficeFamily;
  /** The median of the corpus values, in the units that field is stated in. */
  readonly value: number;
  /** How many compiled records the median was taken over. */
  readonly sampleSize: number;
  /** The states those records came from, so a reader can check the spread. */
  readonly states: readonly string[];
  /**
   * Always `game-profile`. Present so a caller cannot pass this value to
   * something expecting a sourced rule without the mismatch being visible.
   */
  readonly basis: "game-profile";
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length / 2;
  if (sorted.length % 2 === 1) return sorted[(sorted.length - 1) / 2]!;
  // Even sample: the lower middle value, for the reason in the header.
  return sorted[middle - 1]!;
}

/**
 * The typical value for one field of one office family, or null.
 *
 * Null means the corpus carries no numeric value for that pair at all, and it
 * is not a zero and not a permission. A caller that gets null has learned that
 * the game cannot even say what is typical, which is a different and smaller
 * claim than saying a state has no requirement.
 */
export function typicalQualification(
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
): TypicalQualification | null {
  const matching = qualificationRows().filter(
    (row) =>
      row.field === field &&
      row.officeFamily === officeFamily &&
      row.sourceState === "KNOWN" &&
      typeof row.value === "number",
  );
  if (matching.length === 0) return null;
  return {
    field,
    officeFamily,
    value: median(matching.map((row) => row.value as number)),
    sampleSize: matching.length,
    states: [...new Set(matching.map((row) => row.stateUsps))].sort(),
    basis: "game-profile",
  };
}

/**
 * How the game says this out loud, in the player's words.
 *
 * It names the typical value and says where it came from, and it never says
 * the state requires it, because the state may not. Keeping the sentence here
 * rather than at each call site is deliberate: there is one wording for this
 * claim, and it cannot quietly become a different and more confident one on
 * one screen.
 */
export function typicalQualificationNote(
  typical: TypicalQualification,
  measure: string,
  unit: string,
): string {
  const spread =
    typical.sampleSize === 1
      ? `the one state the game has read this rule for`
      : `the ${typical.sampleSize} states the game has read this rule for`;
  return `The game has not read this state's ${measure} for this office, so it is using a typical one instead: ${typical.value} ${unit}, the middle value across ${spread}. That is the game's own stand-in and not this state's law.`;
}

/** How wide the evidence behind the whole profile is, for a reader who asks. */
export const QUALIFICATION_PROFILE_COVERAGE = {
  statesRead: OFFICE_QUALIFICATIONS_META.states,
  asOf: OFFICE_QUALIFICATIONS_META.asOf,
} as const;
