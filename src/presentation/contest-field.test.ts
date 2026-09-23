import { describe, expect, it } from "vitest";

import {
  candidacyPackForJurisdiction,
  electionContestResult,
  generalElectionField,
} from "../simulation";
import { fileForOffice, projectCampaign } from "./campaign-projection";
import { createExplicitGeographyLife } from "./new-game-geography";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * A general election carries the other party's nominee when there is one, any
 * independent who ran, and nobody when the seat is unopposed. Every race used
 * to have exactly one opponent. The rates are placeholders.
 */
describe("who else is on the ballot", () => {
  it("draws unopposed seats and independents at the stand-in rates, and never leaves a governorship unopposed", () => {
    const keys = Array.from({ length: 2000 }, (_, index) => `field:${index}`);
    const legislative = keys.map((stableKey) =>
      generalElectionField("field-rates", {
        stableKey,
        officeKey: "us-or-legislature-v1:house",
        incumbentStanding: false,
      }),
    );
    const unopposed = legislative.filter((f) => f.partyOpponents === 0);
    const independents = legislative.filter((f) => f.independents === 1);
    expect(unopposed.length).toBeGreaterThan(500);
    expect(unopposed.length).toBeLessThan(700);
    expect(independents.length).toBeGreaterThan(220);
    expect(independents.length).toBeLessThan(380);
    // An incumbent standing again is always on the ballot.
    expect(
      keys.every(
        (stableKey) =>
          generalElectionField("field-rates", {
            stableKey,
            officeKey: "us-or-legislature-v1:house",
            incumbentStanding: true,
          }).partyOpponents === 1,
      ),
    ).toBe(true);
    // The same filing always draws the same field.
    expect(
      generalElectionField("field-rates", {
        stableKey: "field:7",
        officeKey: "us-or-legislature-v1:house",
        incumbentStanding: false,
      }),
    ).toEqual(legislative[7]);
  });

  it("runs an unopposed legislative race to a win with every vote", () => {
    const created = createExplicitGeographyLife({
      placeKey: "4159000", // Portland, Oregon
      seed: "unopposed-seat",
      startAge: 40,
      startKind: "normal",
      depth: "summarize-earlier-life",
    });
    const personId = created.game.playerPersonId;
    let world = created.game.world;
    const office = candidacyPackForJurisdiction(
      world.people[personId]!.homeJurisdictionId,
    )!.offices.find((candidate) => candidate.officeKey.endsWith(":house"))!;
    // Walk forward to a day whose filing draws an unopposed field.
    for (let day = 0; day < 60; day += 1) {
      const field = generalElectionField(world.seed, {
        stableKey: `candidacy:${personId}:${world.currentDate}`,
        officeKey: office.officeKey,
        incumbentStanding: false,
      });
      if (field.partyOpponents === 0 && field.independents === 0) break;
      world = passOrdinaryDays(world);
    }
    world = fileForOffice(world, personId, null, office.officeKey);
    const contest = world.history.electionContests!.at(-1)!;
    expect(contest.candidatePersonIds).toEqual([personId]);
    expect(projectCampaign(world, personId).opponentNames).toEqual([]);

    for (
      let step = 0;
      step < 40 && projectCampaign(world, personId).phase === "active";
      step += 1
    )
      world = passOrdinaryDays(world, 30);
    const result = electionContestResult(world, contest.id)!;
    expect(result.winnerPersonId).toBe(personId);
    expect(result.tallies).toEqual([
      { candidatePersonId: personId, votes: 10_000, voteShare: 1 },
    ]);
    expect(projectCampaign(world, personId).phase).toBe("won");
    const record = world.history.events.find(
      (event) =>
        event.type === "election.contest-resolved" &&
        event.involvedEntityIds.includes(contest.id),
    )!;
    expect(record.summary).toMatch(/ won the race for .* unopposed\.$/);
  }, 600_000);
});
