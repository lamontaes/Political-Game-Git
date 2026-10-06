import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { recordWorldEvent } from "../world";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  recordChamberLeaderVote,
  electChamberLeader,
} from "./presiding-officers";
import { castBallots } from "./joint-assembly";

describe("a chamber leadership race", () => {
  it("uses the declared field, lets the player choose to run, and records the post", () => {
    const { world, personId } = smallWorld({ place: "ND", people: 8 });
    const people = Object.keys(world.people);
    const members = people.map((id, index) => ({
      personId: id as typeof personId,
      party: index % 2 === 0 ? "blue" : "green",
      serviceSince: makeIsoDate(`202${index % 3}-01-01`),
    }));
    const { world: electedWorld, election } = electChamberLeader(world, {
      stableKey: "leadership-race:whip",
      post: {
        key: "majority-whip",
        title: "majority whip",
        selection: "floor-vote",
        seniorityImportance: "slight",
      },
      members,
      playerDeclarations: [personId],
    });

    expect(election.postKey).toBe("majority-whip");
    expect(
      election.declarations.find(
        (declaration) => declaration.personId === personId,
      ),
    ).toMatchObject({ declared: true, reason: "player:declared-for-post" });
    expect(
      election.floorVote.candidates.map((candidate) => candidate.personId),
    ).toContain(personId);
    expect(election.declarations).toHaveLength(members.length);

    const recorded = recordChamberLeaderVote(electedWorld, {
      stableKey: "leadership-race:whip",
      chamberKey: "house",
      officeTitle: "majority whip",
      occurredAt: world.currentDate,
      election,
    });
    const event = recorded.history.events.find(
      (candidate) => candidate.stableKey === "leadership-race:whip",
    );
    expect(event?.tags).toContain("post:majority-whip");
    expect(event?.tags).toContain(
      `declared:${personId}:yes:player:declared-for-post`,
    );
    expect(
      event?.participants.some((participant) =>
        participant.detail?.includes("|declared"),
      ),
    ).toBe(true);
  });

  it("adds the owed commitment reason to a colleague's ballot", () => {
    const { world, personId } = smallWorld({ place: "NE", people: 5 });
    const colleagueId = Object.keys(world.people).find(
      (id) => id !== personId,
    )!;
    const withPromise = recordWorldEvent(world, {
      stableKey: "test:leadership-promise",
      type: "test.chamber-leadership-promise",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [colleagueId as typeof personId, personId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["post:majority-whip"],
      summary: "A fixture promise to support a colleague for majority whip.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = withPromise.history.events.at(-1)!.id;
    const vote = castBallots(withPromise, {
      stableKey: "leadership-race:commitment",
      decisionType: "legislature.chamber-leader-vote",
      subjectKind: "context:chamber-leadership",
      describe: () => "A candidate for whip.",
      members: [
        { personId: colleagueId as typeof personId, party: "green" },
        { personId, party: "blue" },
      ],
      candidates: [
        {
          key: `person:${personId}`,
          personId,
          party: "blue",
          incumbent: false,
        },
        {
          key: "person:unmodeled-rival",
          personId: null,
          party: "red",
          incumbent: false,
        },
      ],
      owedLeadershipCommitments: [
        {
          commitmentId: "leadership-promise-1" as typeof personId,
          eventId,
          memberPersonId: colleagueId as typeof personId,
          candidatePersonId: personId,
          postKey: "majority-whip",
        },
      ],
    });

    expect(vote.ballots[0]?.candidateKey).toBe(`person:${personId}`);
    expect(vote.ballots[0]?.reason).toContain("owed-leadership-commitment");
  });
});
