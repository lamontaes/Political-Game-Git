import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  runToElection,
} from "../../tests/fixtures/state-executive-entry";
import { passOrdinaryDays } from "./ordinary-life";
import { latestDisposition, storyLeads } from "../simulation/press";
import { projectCampaign } from "./campaign-projection";
import { fileForStateExecutiveOffice } from "./nationwide-candidacy";
import { ownElectionResultSentence } from "./own-election";

/**
 * Fatima's Maine governor race, 2026-09-22: the result read "Fatima Erickson
 * won. The seat is theirs…" with no vote share, and the public record a paper
 * writes from said only "Winner: …". Both now carry the shares.
 */
describe("a state race result reports its vote shares", () => {
  it("puts the shares in the result line and the public record, and the papers cover it", () => {
    const { world, personId } = adultLifeIn("ME", "state-race-shares");
    const decided = runToElection(
      fileForStateExecutiveOffice(world, personId),
      personId,
    );
    const view = projectCampaign(decided, personId);
    expect(["won", "lost"]).toContain(view.phase);
    const [first, second] = view.tallies;
    const own = view.tallies.find((tally) => tally.isThisCandidate)!;
    const other = view.tallies.find((tally) => !tally.isThisCandidate)!;
    expect(view.afterword).toContain(
      `, ${own.displayedSharePercent}% to ${other.displayedSharePercent}%.`,
    );
    expect(first && second).toBeTruthy();

    const contest = decided.history.electionContests!.find((candidate) =>
      candidate.candidatePersonIds.includes(personId),
    )!;
    expect(ownElectionResultSentence(decided, contest.id, personId)).toMatch(
      /^You (won|lost) the race for Governor, \d+\.\d% to \d+\.\d%\.$/,
    );
    const record = decided.history.events.find(
      (event) =>
        event.type === "election.contest-resolved" &&
        event.involvedEntityIds.includes(contest.id),
    )!;
    expect(record.summary).toMatch(
      /won the race for Governor in Maine, \d+\.\d% to \d+\.\d%\.$/,
    );

    // The state's paper writes the result up from that record.
    const later = passOrdinaryDays(decided, 28);
    const published = storyLeads(later)
      .filter((lead) => lead.basisEventIds.includes(record.id))
      .map((lead) => latestDisposition(later, lead.id))
      .filter((disposition) => disposition?.decision === "published");
    expect(published.length).toBeGreaterThan(0);
    const story = later.history.events.find(
      (event) => event.id === published[0]!.eventId,
    )!;
    expect(story.summary).toBe(record.summary);
  }, 900_000);
});
