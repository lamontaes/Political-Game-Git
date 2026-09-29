import { describe, expect, it } from "vitest";
import { electionContestResult } from "../simulation/election-contests";
import { CONGRESS_RESULTS_EVENT } from "../simulation/living-world/congress-turnover";
import { calibrationRow } from "../simulation/world-setup/political-start";
import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

/**
 * A world report used to say every 2026 congressional race "reported only
 * totals": one record named the winners of 468 seats, with no candidate who
 * lost and no vote counted. Each seat's general election is now its own race,
 * with its nominees and a count from the seat's own voters. The place the
 * world is watched from is drawn from all 56 and named with the seed.
 */
describe("the 2026 congressional elections", () => {
  it("record each seat's candidates and votes, and seat the count's winner", () => {
    const seed = "b24-congress-races";
    const place = observerPlace(seed);
    let { world } = openObserverWorld(observerSetup(seed));
    while (world.currentDate < "2026-11-10")
      world = advanceObservedWorld(world, 1);
    const label = `${place.key} seed ${seed}`;

    const races = (world.history.electionContests ?? []).filter((contest) =>
      /^us-(house|senate):/.test(contest.office.officeKey),
    );
    // Every seat on the ballot whose printed 2024 result gives a two-party
    // count: all but the few uncontested or undetermined ones.
    expect(races.length, label).toBeGreaterThan(400);

    const winners = new Map(
      world.history.events
        .find((event) => event.type === CONGRESS_RESULTS_EVENT)!
        .participants.map((row) => [row.detail!.split("|")[0]!, row.personId]),
    );
    for (const race of races) {
      const result = electionContestResult(world, race.id)!;
      expect(result, race.office.title).toBeDefined();
      const tallies = (
        result as unknown as {
          tallies: { candidatePersonId: string; votes: number }[];
        }
      ).tallies;
      expect(tallies.map((row) => row.candidatePersonId).sort()).toEqual(
        [...race.candidatePersonIds].sort(),
      );
      // The seat's own electorate, not a drawn handful.
      const ballots = calibrationRow(race.office.officeKey)!.totalVotes!;
      const counted = tallies.reduce((sum, row) => sum + row.votes, 0);
      expect(
        Math.abs(counted - ballots),
        race.office.title,
      ).toBeLessThanOrEqual(tallies.length);
      // The member seated is the one the count elected.
      expect(winners.get(race.office.officeKey), race.office.title).toBe(
        result.winnerPersonId,
      );
    }
  }, 600_000);
});
