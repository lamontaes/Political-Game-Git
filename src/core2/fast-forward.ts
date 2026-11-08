/**
 * Fast-forward is a development switch (owner, Nov 8, about 1:58 a.m.: "I'm
 * fine with it simulating everything as long as it makes sense in the end.
 * Like, I would love if 20 years only took 5 seconds"). On, the engines that
 * spend their time on each person's evening (a candidate's town halls,
 * speeches, door-to-door rounds and ads) take their turns a few times less
 * often, so a race is still decided by the impressions the campaign leaves
 * but costs less. Everything else runs as in play. (Skipping campaign turns
 * outright was tried on Nov 8: no votes were tallied, so no one won.) Off in play and in every test unless one turns it on.
 *
 * Registered stopgap: SG-SPEED-fast-forward-campaigns (see
 * src/core2/data/stopgaps/speed.ts).
 */
let enabled = false;

/** How many times as far apart a campaign's turns are in fast-forward (coarser time, as distant things update less often). */
export const FAST_FORWARD_STRIDE = 4;

export function fastForward(): boolean {
  return enabled;
}

/** Turns fast-forward on or off. Returns the previous setting. */
export function setFastForward(on: boolean): boolean {
  const previous = enabled;
  enabled = on;
  return previous;
}
