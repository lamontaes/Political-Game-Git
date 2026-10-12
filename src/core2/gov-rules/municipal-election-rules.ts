/**
 * The municipal election vocabulary the town readers use, and the signature
 * arithmetic of a petition. Ported from the old engine's
 * `municipal-election-rules.ts`, keeping only what the new core reads.
 */

/**
 * When municipal elections are held. The union is the set the corpus's state
 * profiles actually use, which is wider than the enum its own summary section
 * proposes; see the `section-6-timing-enum-narrower-than-profiles` conflict.
 */
export type MunicipalElectionTiming =
  | "even-year-november-consolidated"
  | "odd-year-november-consolidated"
  | "even-year-june-consolidated"
  | "even-year-august-consolidated"
  | "even-year-may-consolidated"
  | "odd-year-autumn"
  | "odd-year-spring"
  | "spring-annual"
  | "spring-even-year"
  | "annual-spring-april"
  | "annual-spring-may"
  | "annual-autumn-october"
  | "autumn-gubernatorial"
  | "town-meeting-day-march"
  | "town-meeting-day-spring"
  | "quadrennial-summer-june"
  | "quadrennial-late-summer-august";

/** How, or whether, voters may remove a municipal officer before term's end. */
export type MunicipalRecallDoctrine =
  /** Recall vote and replacement race decided on one ballot. */
  | "two-question-standalone"
  /** The incumbent runs against challengers in a single replacement contest. */
  | "simultaneous-incumbent-replacement"
  /** A bare keep-or-remove question; the seat then fills under vacancy rules. */
  | "yes-no-retention"
  /** No recall election exists; removal runs through a court. */
  | "judicial-cause-removal-trial"
  /** State general law authorizes no municipal recall at all. */
  | "prohibited";

/** What a signature requirement is a percentage *of*. */
export type PetitionSignatureBase =
  /** Everyone on the municipality's rolls. The largest base, and the hardest. */
  | "registered-voters"
  /** Votes cast for the office at issue, or for the executive head. */
  | "votes-cast-for-office"
  /** Total votes cast at the last regular municipal election. */
  | "votes-cast-last-election"
  /** Votes cast in the municipality for Governor at the last state election. */
  | "last-gubernatorial-vote";

/**
 * A bounded signature requirement.
 *
 * The percentage is meaningless without its base — 25% of the votes cast for
 * one council seat and 25% of a city's registered voters are different
 * petitions by an order of magnitude — so the two are never separable here.
 */
export interface PetitionThreshold {
  readonly percent: number;
  readonly base: PetitionSignatureBase;
}

export function assertPetitionThreshold(
  threshold: PetitionThreshold,
  label: string,
): void {
  if (
    typeof threshold.percent !== "number" ||
    !Number.isFinite(threshold.percent) ||
    threshold.percent <= 0 ||
    threshold.percent > 100
  ) {
    throw new Error(
      `${label} must be a percentage in (0, 100]: ${threshold.percent}`,
    );
  }
}

/**
 * Turns a percentage requirement plus a concrete electorate into the exact
 * number of signatures required. Pure integer arithmetic; a petition needs a
 * whole signature, and a fractional requirement always rounds up.
 */
export function resolveRequiredSignatures(
  threshold: PetitionThreshold,
  baseCount: number,
): number {
  assertPetitionThreshold(threshold, "A petition threshold");
  if (!Number.isSafeInteger(baseCount) || baseCount < 0) {
    throw new Error(
      `A petition signature base must be a non-negative integer: ${baseCount}`,
    );
  }
  // `Math.ceil` of a small negative is -0, and a signature count of -0 is not
  // a number anyone should ever read out of this function.
  return Math.max(0, Math.ceil((baseCount * threshold.percent) / 100 - 1e-9));
}
