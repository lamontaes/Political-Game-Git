import { describe, expect, it, vi } from "vitest";
import { memberBallotOn, recordMemberBallot } from "./member-ballots";
import { bargainBeforeScheduledVote } from "./vote-bargaining";
import type { World } from "../types";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { smallWorld } from "../../../tests/fixtures/small-world";

function ballotWorld(): {
  world: World;
  sponsor: string;
  one: string;
  two: string;
  jurisdictionId: string;
  questionId: string;
} {
  const place = drawRandomPlace("b08-p7-vote-bargaining");
  const generated = smallWorld({
    place: place.stateJurisdictionKey!,
    seed: "b08-p7-vote-bargaining",
  });
  const people = Object.keys(generated.world.people);
  const ids = people.slice(0, 4);
  if (ids.length < 4)
    throw new Error("Random-place fixture needs four people.");
  const npcIds = ids.filter((id) => id !== generated.personId);
  return {
    world: generated.world,
    sponsor: npcIds[0]!,
    one: npcIds[1]!,
    two: npcIds[2]!,
    jurisdictionId: generated.jurisdictionId,
    // The seam test needs a canonical entity token for the ballot event. A
    // runtime caller supplies the actual measure ID from the calendar.
    questionId: generated.personId,
  };
}

describe("NPC bargaining before a scheduled vote", () => {
  const questionFor = (measureId: string) => ({
    measureId: measureId as never,
    purpose: "floor-stage" as const,
    forumKey: "test-chamber",
    floorStageKey: "passage",
  });

  it("does nothing off-calendar and approaches only undecided members when short", () => {
    const { world, sponsor, one, two, jurisdictionId, questionId } =
      ballotWorld();
    const question = questionFor(questionId);
    const cast = recordMemberBallot(world, {
      personId: one as never,
      jurisdictionId: jurisdictionId as never,
      question,
      ballot: "nay",
      summary: "Recorded test ballot.",
    });
    const approach = vi.fn((value: World) => value);
    const input = {
      onCalendar: false,
      question,
      requiredYeas: 2,
      sponsorPersonId: sponsor as never,
      members: [
        { personId: sponsor as never, memberKey: "sponsor" },
        { personId: one as never, memberKey: "one" },
        { personId: two as never, memberKey: "two" },
      ],
      exchangeKey: "b08-p7:test",
      approach,
    };
    expect(bargainBeforeScheduledVote(cast, input)).toMatchObject({
      reason: "not-on-calendar",
      approachedPersonIds: [],
    });
    const result = bargainBeforeScheduledVote(cast, {
      ...input,
      onCalendar: true,
    });
    expect(result.reason).toBe("approached-undecided-members");
    expect(result.approachedPersonIds).toEqual([two]);
    expect(approach).toHaveBeenCalledTimes(1);
    expect(approach).toHaveBeenCalledWith(cast, {
      member: { personId: two, memberKey: "two" },
      intent: "request-support",
      turnKey: expect.stringContaining("b08-p7:test"),
    });
    expect(memberBallotOn(cast, one as never, question)).toBe("nay");
  });

  it("records the random place used for this generated-world seam proof", () => {
    const seed = "b08-p7-vote-bargaining";
    const place = drawRandomPlace(seed);
    console.log(
      "b08-p7 random place",
      seed,
      place.key,
      place.stateJurisdictionKey,
    );
    expect(place.key).toBeTruthy();
  });

  it("does not approach once actual pending yea ballots meet the threshold", () => {
    const { world, sponsor, one, two, jurisdictionId, questionId } =
      ballotWorld();
    const question = questionFor(questionId);
    const first = recordMemberBallot(world, {
      personId: one as never,
      jurisdictionId: jurisdictionId as never,
      question,
      ballot: "yea",
      summary: "Recorded test ballot.",
    });
    const cast = recordMemberBallot(first, {
      personId: two as never,
      jurisdictionId: jurisdictionId as never,
      question,
      ballot: "yea",
      summary: "Recorded test ballot.",
    });
    const approach = vi.fn((value: World) => value);
    const result = bargainBeforeScheduledVote(cast, {
      onCalendar: true,
      question,
      requiredYeas: 2,
      sponsorPersonId: sponsor as never,
      members: [
        { personId: sponsor as never, memberKey: "sponsor" },
        { personId: one as never, memberKey: "one" },
        { personId: two as never, memberKey: "two" },
      ],
      exchangeKey: "b08-p7:test",
      approach,
    });
    expect(result.reason).toBe("majority-already-reached");
    expect(approach).not.toHaveBeenCalled();
  });
});
