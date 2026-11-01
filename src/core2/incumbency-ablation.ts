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
 */
export interface IncumbencyAblation {
  readonly trait: boolean;
  readonly standing: boolean;
}

const OFF: IncumbencyAblation = { trait: false, standing: false };
let knobs: IncumbencyAblation = OFF;

/** The knobs as set; both off unless a measurement script set them. */
export function incumbencyAblation(): IncumbencyAblation {
  return knobs;
}

/**
 * Measurement only: zero the trait term, the standing term or both for the
 * rest of the process (set before the world is built). Returns the previous
 * setting. Never called in play.
 */
export function setIncumbencyAblationForMeasurement(
  next: Partial<IncumbencyAblation>,
): IncumbencyAblation {
  const previous = knobs;
  knobs = { ...OFF, ...next };
  return previous;
}
