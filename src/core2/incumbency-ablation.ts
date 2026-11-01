/**
 * Measurement only: the incumbency ablation's knobs
 * (campaign-incumbency-calibrated; scripts/core2-year/incumbency-totals.ts).
 * A measurement run zeroes one or both of the two terms that favor a seat's
 * holder in every voter's appeal, so the world's own re-election totals show
 * what each adds and whether the advantage is counted twice. Both default off,
 * and nothing in play sets them: play reads the same appeal it always has.
 *
 * - `trait`: the incumbent side of each voter's traits (the
 *   `voting.back-incumbent` decision at `traitWeightVotingBackIncumbent`),
 *   read in `countedAppeal` (electorate.ts).
 * - `standing`: the incumbent's bare incumbency in their public standing:
 *   `incumbentRecognition` in a local race (`contestView`, voting.ts) and
 *   `incumbencyShare` in a partisan state or federal race (`candidateReasons`,
 *   electorate-inputs.ts), together with the same share netted out of a
 *   held state legislative district's 2024 baseline (`makePlace`,
 *   electorate-places.ts), so the holder's side lands at zero, not below it.
 *
 * Neither knob removes all incumbency: the holder's record (the town's or a
 * voter's `recordAppeal`, voting.ts) and the recognition every adult in an
 * office's public gets from its serving official (past-public.ts) stay in
 * every version, `neither` included.
 *
 * Three value knobs set a term's size instead of zeroing it. Each is
 * undefined unless a measurement script sets it, and the code that reads it
 * falls back to the parameter, so in play every expression is the old one:
 *
 * - `traitWeight`: in place of `traitWeightVotingBackIncumbent`, read in
 *   `incumbentLeanOf` (voting.ts) for every place the voter's incumbent lean
 *   is read (the appeal, the town's center, the kept ballots).
 * - `recognition`: in place of `incumbentRecognition`, read in `contestView`
 *   (voting.ts) for a local incumbent's bare standing; the `standing` knob
 *   above, where set, still zeroes it.
 * - `pledgeWeight`: in place of `doorPledgeWeight`, read where the appeal's
 *   pledge term is built (`countedAppeal`, electorate.ts) and where the
 *   turnout reads how far a door yes still holds (`heldPledge`, voting.ts).
 */
export interface IncumbencyAblation {
  readonly trait: boolean;
  readonly standing: boolean;
  readonly traitWeight?: number;
  readonly recognition?: number;
  readonly pledgeWeight?: number;
}

const OFF: IncumbencyAblation = { trait: false, standing: false };
let knobs: IncumbencyAblation = OFF;

/** The knobs as set; every one off (or undefined) unless a measurement script set it. */
export function incumbencyAblation(): IncumbencyAblation {
  return knobs;
}

/**
 * Measurement only: zero the trait term, the standing term or both, and set
 * the three value knobs, for the rest of the process (set before the world is
 * built). A knob not named goes back to off. Returns the previous setting.
 * Never called in play.
 */
export function setIncumbencyAblationForMeasurement(
  next: Partial<IncumbencyAblation>,
): IncumbencyAblation {
  const previous = knobs;
  knobs = { ...OFF, ...next };
  return previous;
}
