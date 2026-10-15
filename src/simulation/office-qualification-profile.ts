/**
 * What an office plausibly asks, in a state the game has not read.
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
 * though the state had legislated it. Or it can give that state a plausible
 * rule, drawn from what real states actually do, and say plainly that it is a
 * stand-in.
 *
 * This module is the third answer. An unread state takes the MODAL rule: the
 * enacted value the most read states set for that field of that office, ties
 * going to the lower value, ESTIMATED FROM AVERAGE. No hash or draw picks it
 * (owner rule A118: a state's qualification age is read or estimated, never
 * chosen by hash), so every unread place among the 56 gets the same value
 * through one path, and reading a state's law replaces it for that state.
 *
 * Every value offered is a real enacted value, never a figure arithmetic
 * invents (no 21.75, no half years). The mode comes from the corpus rather
 * than from this file, so it moves on its own as states are compiled, and it
 * cannot drift away from its own evidence. A state the game HAS read always
 * uses its own rule; nothing here is consulted for a state that has one.
 *
 * A candidacy pack records the value it was built with, so an old save keeps
 * the value it was given.
 *
 * This is the same device `STATE_EXECUTIVE_GAME_PROFILE` already uses for
 * governors' terms, and it carries the same obligation: a profile value is
 * `game-profile`, never `verified`, and anything that records an eligibility
 * decision records which of the two it rested on.
 */

import type { RuleSourceRef } from "./legislature-rules";
import {
  OFFICE_QUALIFICATIONS_META,
  qualificationRows,
  type QualificationFieldName,
  type QualificationOfficeFamily,
} from "./office-qualification-rules";

/** The spread of enacted values behind one field of one office family. */
export interface QualificationRange {
  readonly field: QualificationFieldName;
  readonly officeFamily: QualificationOfficeFamily;
  /** Every distinct value the corpus carries, ascending. Enacted, all of them. */
  readonly enactedValues: readonly number[];
  readonly lowest: number;
  readonly highest: number;
  /** The states those values came from, so a reader can check the spread. */
  readonly states: readonly string[];
}

/** What one unread state gets, and the evidence it was drawn from. */
export interface StandInQualification extends QualificationRange {
  /** The state this was drawn for, as `US-XX`. */
  readonly stateJurisdictionKey: string;
  /** The modal enacted value. Always one of `enactedValues`. */
  readonly value: number;
  /**
   * Always `game-profile`. Present so a caller cannot pass this value to
   * something expecting a sourced rule without the mismatch being visible.
   */
  readonly basis: "game-profile";
}

/**
 * The enacted value the most read states set for this field and office, ties
 * going to the lower value, or null where the corpus carries none.
 */
export function modalQualification(
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
): number | null {
  const statesByValue = new Map<number, Set<string>>();
  for (const row of qualificationRows()) {
    if (
      row.field !== field ||
      row.officeFamily !== officeFamily ||
      row.sourceState !== "KNOWN" ||
      typeof row.value !== "number"
    )
      continue;
    const states = statesByValue.get(row.value) ?? new Set<string>();
    states.add(row.stateUsps);
    statesByValue.set(row.value, states);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [value, states] of [...statesByValue.entries()].sort(
    (left, right) => left[0] - right[0],
  )) {
    if (states.size > bestCount) {
      best = value;
      bestCount = states.size;
    }
  }
  return best;
}

/**
 * The enacted spread for one field of one office family, or null.
 *
 * Null means the corpus carries no numeric value for that pair at all, and it
 * is not a zero and not a permission. A caller that gets null has learned that
 * the game cannot even say what is usual, which is a different and smaller
 * claim than saying a state has no requirement. Nothing is borrowed from a
 * neighboring office to fill it: a senate's district requirement is not a
 * measurement of a house's.
 */
export function qualificationRange(
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
): QualificationRange | null {
  const matching = qualificationRows().filter(
    (row) =>
      row.field === field &&
      row.officeFamily === officeFamily &&
      row.sourceState === "KNOWN" &&
      typeof row.value === "number",
  );
  if (matching.length === 0) return null;
  const enactedValues = [
    ...new Set(matching.map((row) => row.value as number)),
  ].sort((left, right) => left - right);
  return {
    field,
    officeFamily,
    enactedValues,
    lowest: enactedValues[0]!,
    highest: enactedValues[enactedValues.length - 1]!,
    states: [...new Set(matching.map((row) => row.stateUsps))].sort(),
  };
}

/**
 * What one unread state asks for one field, or null if nothing is known: the
 * modal enacted value ({@link modalQualification}), ESTIMATED FROM AVERAGE.
 */
export function standInQualification(
  stateJurisdictionKey: string,
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
): StandInQualification | null {
  const range = qualificationRange(field, officeFamily);
  if (range === null) return null;
  return {
    ...range,
    stateJurisdictionKey,
    value: modalQualification(field, officeFamily)!,
    basis: "game-profile",
  };
}

/**
 * The requirement in the player's own words, and nothing else.
 *
 * A generated rule is shown exactly as a sourced one is. The player is not
 * told which states the game has read, how wide the spread is, or that this
 * office's rule was generated at all — a game does not narrate its own
 * research state at somebody trying to stand for office, and a rule that
 * announces itself as provisional is not a rule anyone can play against.
 *
 * Every bit of that provenance survives in the record: `basis` says
 * `game-profile`, `enactedValues`, `lowest`, `highest` and `states` carry the
 * evidence, and reading the real law replaces the whole thing. That is where
 * an auditor looks. This function is what a screen prints.
 */
export function standInRequirementSentence(
  standIn: StandInQualification,
  measure: string,
  unit: string,
): string {
  return `This office asks for ${standIn.value} ${unit} of ${measure}.`;
}

/** How wide the evidence behind the whole profile is, for a reader who asks. */
export const QUALIFICATION_PROFILE_COVERAGE = {
  statesRead: OFFICE_QUALIFICATIONS_META.states,
  asOf: OFFICE_QUALIFICATIONS_META.asOf,
} as const;

/**
 * A generated qualification as a rule source ref.
 *
 * It says `game-profile` in both the authority and the verification, so a
 * consumer reading either one sees what this is. The note carries the evidence
 * a reader of the record needs — the spread and the states behind it — and no
 * player-facing surface prints it; `standInRequirementSentence` is what a screen
 * shows.
 */
export function standInQualificationSourceRef(
  standIn: StandInQualification,
): RuleSourceRef {
  return {
    authority: "game-profile",
    citation: `${standIn.field} for a ${standIn.officeFamily} in ${standIn.stateJurisdictionKey}`,
    sourceTitle: "Our Civic Duty office qualification profile",
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note: `ESTIMATED FROM AVERAGE: ${standIn.value}, the value the most of ${standIn.states.join(", ")} enacted (spread ${standIn.lowest} to ${standIn.highest}). Not a claim about this state's law.`,
  };
}
