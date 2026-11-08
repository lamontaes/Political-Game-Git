/**
 * Fast-forward is a development switch (owner, Nov 8, about 1:58 a.m.: "I'm
 * fine with it simulating everything as long as it makes sense in the end.
 * Like, I would love if 20 years only took 5 seconds"). On, the engines that
 * spend their time on each person's evening (a candidate's town halls,
 * speeches, door-to-door rounds and ads) stand aside, and the race is decided
 * by what the voters already hold: their leans, parties, the incumbent's
 * record and the impressions earlier days left. Everything else runs as in
 * play. Off in play and in every test unless one turns it on.
 *
 * Registered stopgap: SG-SPEED-fast-forward-campaigns (see
 * src/core2/data/stopgaps/speed.ts).
 */
let enabled = false;

export function fastForward(): boolean {
  return enabled;
}

/** Turns fast-forward on or off. Returns the previous setting. */
export function setFastForward(on: boolean): boolean {
  const previous = enabled;
  enabled = on;
  return previous;
}
