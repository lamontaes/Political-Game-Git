import { describe, expect, it } from "vitest";

import { isPersonAliveAt } from "../simulation/vitality-integrity";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

// Build 19's watched run in Evergreen, Missouri (seed b19-watch-0c69e9)
// stopped when a town election drew a resident who had already died:
// "Election contest candidate is deceased at scheduling date."
const SEED = "b19-watch-0c69e9";

describe(`town elections draw only living residents (Evergreen, Missouri, seed ${SEED})`, () => {
  it("runs past the filing for its 2029 town election, and every candidate was alive when their contest was scheduled", () => {
    const setup = observerSetup(SEED);
    expect(setup.placeKey).toBe("2922951");
    let { world } = openObserverWorld(setup);
    for (let step = 0; step < 37; step += 1)
      world = advanceObservedWorld(world, 30);

    const contests = world.history.electionContests ?? [];
    expect(contests.length).toBeGreaterThan(0);
    for (const contest of contests)
      for (const personId of contest.candidatePersonIds)
        expect(
          isPersonAliveAt(world, personId, {
            asOfDate: contest.scheduledAt,
            historySequenceExclusive: contest.sequence,
          }),
          `${personId} on ${contest.stableKey}`,
        ).toBe(true);
  }, 600_000);
});
