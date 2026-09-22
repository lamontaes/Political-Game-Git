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
 * This module is the third answer, and the shape of it matters. One value for
 * all forty-three would be measured and still wrong, because it would make
 * every unread state identical — a player crossing a state line would find the
 * same numbers waiting, which is the one thing real American law never does.
 * So each unread state draws from the RANGE the read states span, and
 * different states land on different values inside it.
 *
 * Three rules hold that honest.
 *
 * Every value offered is a whole number inside the spread real states set. A
 * state may land between two enacted values — twenty-two years where the
 * corpus holds twenty-one and twenty-four — because whole years in that
 * window are the ordinary stuff of American qualification law and reading a
 * few more states would turn several of them up. What it may never produce is
 * a figure arithmetic invents and no legislature would write: no 21.75, no
 * half years. The spread's ends are always real enacted values.
 *
 * A state's draw is stable. It is derived from the state's own key, so the
 * same state answers the same way in every session, in every save, on every
 * machine, forever. A value rolled per session would let one save contradict
 * itself between two readings of the same rule.
 *
 * And the range comes from the corpus rather than from this file, so it widens
 * on its own as states are compiled, and it cannot drift away from its own
 * evidence. A state the game HAS read always uses its own rule; nothing here
 * is consulted for a state that has one.
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
  /** The drawn value. Always a whole number within the enacted spread. */
  readonly value: number;
  /**
   * Always `game-profile`. Present so a caller cannot pass this value to
   * something expecting a sourced rule without the mismatch being visible.
   */
  readonly basis: "game-profile";
}

/**
 * A small stable hash of a string.
 *
 * FNV-1a, written out rather than imported, because what this needs is not
 * cryptographic strength but a promise: the same input gives the same number
 * on every machine and every version of the runtime, for as long as saves
 * live. A hash whose algorithm might be tuned later would quietly change
 * every unread state's rules underneath existing saves.
 */
function stableHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * The enacted spread for one field of one office family, or null.
 *
 * Null means the corpus carries no numeric value for that pair at all, and it
 * is not a zero and not a permission. A caller that gets null has learned that
 * the game cannot even say what is usual, which is a different and smaller
 * claim than saying a state has no requirement. Nothing is borrowed from a
 * neighbouring office to fill it: a senate's district requirement is not a
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
 * What one unread state asks for one field, or null if nothing is known.
 *
 * The draw is a stable hash of the state, the field and the office, so two
 * fields of one state vary independently — a state does not get the strictest
 * of everything or the loosest of everything — while each stays fixed for that
 * state forever.
 */
export function standInQualification(
  stateJurisdictionKey: string,
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
): StandInQualification | null {
  const range = qualificationRange(field, officeFamily);
  if (range === null) return null;
  const draw = stableHash(`${stateJurisdictionKey}|${field}|${officeFamily}`);
  return {
    ...range,
    stateJurisdictionKey,
    value: range.lowest + (draw % (range.highest - range.lowest + 1)),
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
    note: `Drawn from ${standIn.lowest} to ${standIn.highest}, the spread enacted by ${standIn.states.join(", ")}. Not a claim about this state's law.`,
  };
}
