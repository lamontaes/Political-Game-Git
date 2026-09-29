import { describe, expect, it } from "vitest";
import { electionContestResult } from "../simulation/election-contests";
import { majorPartyOf } from "../simulation/statewide-electorate";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

/**
 * Build 9 watched Washington, D.C. (seed b9-snap-dc) for a year: the mayor
 * opened with no party on record, so the 2026 race fell to a drawn count of
 * a few thousand votes and a Republican won a city that gave the Democrat
 * 93% of its two-party presidential vote in 2024. The District's own voters
 * decide it now, the sitting mayor included.
 */
describe("the District of Columbia's mayoral race", () => {
  it("is decided by the District's voters, with the no-party mayor in the count", () => {
    let { world } = openObserverWorld(observerSetup("b9-snap-dc", "1150000"));
    while (world.currentDate < "2026-11-10")
      world = advanceObservedWorld(world, 30);
    const contest = (world.history.electionContests ?? []).find(
      (candidate) =>
        /mayor/.test(candidate.office.officeKey) &&
        candidate.electionDate === "2026-11-03",
    )!;
    expect(contest).toBeDefined();
    const result = electionContestResult(world, contest.id)!;
    const tallies = (
      result as unknown as {
        tallies: { candidatePersonId: string; votes: number }[];
      }
    ).tallies;
    const partyOf = (personId: string) =>
      majorPartyOf(world, personId as never, contest.electionDate);
    expect(partyOf(tallies[0]!.candidatePersonId)).toBe("democratic");
    const total = tallies.reduce((sum, tally) => sum + tally.votes, 0);
    // The District cast 325,869 presidential ballots in 2024.
    expect(total).toBeGreaterThan(300_000);
    expect(
      tallies.some((tally) => partyOf(tally.candidatePersonId) === null),
    ).toBe(true);
  }, 900_000);
});
