import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { amend, billOnTheFloor, floor } from "./vote-bundle.fixture";
import { classifyVoteReading } from "./vote-readings";

function voteOf(
  world: ReturnType<typeof billOnTheFloor>["world"],
  purpose: string,
) {
  const vote = world.history.legislativeVotes?.find(
    (vote) => vote.purpose === purpose,
  );
  if (!vote) throw new Error(`Expected a recorded ${purpose} vote.`);
  return vote;
}

describe("claims about a member's vote on one bill part", () => {
  it("distinguishes a single-part vote, a nay on a bundle, and a yea", () => {
    const place = drawRandomPlace(
      "b09-vote-readings",
      (candidate) =>
        candidate.stateJurisdictionKey !== null &&
        ["US-KY", "US-NE"].includes(candidate.stateJurisdictionKey),
    );
    const stateKey = place.stateJurisdictionKey;
    if (!stateKey) throw new Error("The random place has no state key.");
    const scenarioKey = {
      "US-KY": "kentucky",
      "US-NE": "nebraska",
    }[stateKey];
    if (!scenarioKey)
      throw new Error("The random state has no roll-call fixture.");
    const setup = billOnTheFloor("general-policy", scenarioKey);
    const amended = amend(setup, setup.world, "nay");
    const amendmentVote = voteOf(amended, "amendment");
    const amendmentPart = {
      source: "amendment-section",
      provisionId: null,
      provisionKey: "work-requirement",
      heading: "Work requirement",
      answers: { propositionId: setup.workRuleId, answer: "yes" },
    } as const;
    expect(
      classifyVoteReading(
        amended,
        amendmentVote.id,
        setup.memberId,
        amendmentPart,
      )?.classification,
    ).toBe("honest");

    const passed = floor(setup, amend(setup, setup.world, "yea"), "nay");
    const passageVote = voteOf(passed, "floor-stage");
    const provision = passed.history.legislativeProvisions?.at(-1);
    if (!provision) throw new Error("Expected the adopted rider provision.");
    const rider = {
      source: "section",
      provisionId: provision.id,
      provisionKey: "work-requirement",
      heading: "Work requirement for assistance",
      answers: { propositionId: setup.workRuleId, answer: "yes" },
    } as const;
    expect(
      classifyVoteReading(passed, passageVote.id, setup.memberId, rider)
        ?.classification,
    ).toBe("misleading");

    const yeaWorld = floor(setup, amend(setup, setup.world, "yea"), "yea");
    const yeaVote = voteOf(yeaWorld, "floor-stage");
    const votedPart = yeaWorld.history.legislativeProvisions?.at(-1);
    if (!votedPart) throw new Error("Expected the adopted rider provision.");
    expect(
      classifyVoteReading(yeaWorld, yeaVote.id, setup.memberId, {
        source: "section",
        provisionId: votedPart.id,
        provisionKey: votedPart.provisionKey,
        heading: votedPart.heading,
        answers: votedPart.answers ?? null,
      })?.classification,
    ).toBe("false");
  });

  it("marks a part outside the roll call as false", () => {
    const setup = billOnTheFloor();
    const world = floor(setup, setup.world, "nay");
    const vote = voteOf(world, "floor-stage");
    expect(
      classifyVoteReading(world, vote.id, setup.memberId, {
        source: "section",
        provisionId: null,
        provisionKey: "not-in-bill",
        heading: "An unrelated promise",
        answers: null,
      })?.classification,
    ).toBe("false");
  });
});
