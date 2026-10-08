import { describe, expect, it } from "vitest";

import { amend, billOnTheFloor, floor } from "./vote-bundle.fixture";
import { voteBundle } from "./vote-bundle";
import { classifyVoteReading } from "./vote-readings";
import type { EntityId, LegislativeVoteRecord, World } from "./types";

function voteFor(
  world: World,
  measureId: EntityId,
  purpose: LegislativeVoteRecord["purpose"],
) {
  return world.history.legislativeVotes!.find(
    (vote) => vote.measureId === measureId && vote.purpose === purpose,
  )!;
}

describe("classifying a member's reading of a recorded vote", () => {
  it("calls a nay on a one-part amendment honest", () => {
    const setup = billOnTheFloor();
    const world = amend(setup, setup.world, "yea", "nay");
    const vote = voteFor(world, setup.measureId, "amendment");
    const bundle = voteBundle(world, vote);

    expect(classifyVoteReading(bundle, "nay", 0)).toMatchObject({
      classification: "honest",
      part: { source: "amendment-section", provisionKey: "work-requirement" },
    });
  });

  it("distinguishes the main filed question from another part carried by the bill", () => {
    const setup = billOnTheFloor();
    const amended = amend(setup, setup.world, "yea");
    const world = floor(setup, amended, "nay");
    const bundle = voteBundle(
      world,
      voteFor(world, setup.measureId, "floor-stage"),
    );

    expect(classifyVoteReading(bundle, "nay", 0)).toMatchObject({
      classification: "honest",
      part: { source: "filed-question" },
    });
    expect(classifyVoteReading(bundle, "nay", 1)).toMatchObject({
      classification: "misleading",
      part: { provisionKey: "work-requirement" },
    });
  });

  it.each([
    ["yea", 0],
    ["absent", 0],
    ["present-not-voting", 0],
    ["excused", 0],
    ["nay", 2],
  ] as const)(
    "classifies %s at part %i as false when the record does not support the claim",
    (disposition, partIndex) => {
      const setup = billOnTheFloor();
      const world = amend(setup, setup.world, "yea");
      const vote = voteFor(world, setup.measureId, "amendment");
      expect(
        classifyVoteReading(voteBundle(world, vote), disposition, partIndex)
          .classification,
      ).toBe("false");
    },
  );

  it("does not infer an intent from the vote's aggregate tally", () => {
    const setup = billOnTheFloor();
    const world = floor(setup, setup.world, "nay");
    const vote = voteFor(world, setup.measureId, "floor-stage");
    const bundle = voteBundle(world, vote);

    expect(classifyVoteReading(bundle, "nay", 0).classification).toBe("honest");
    expect(classifyVoteReading(bundle, "yea", 0).classification).toBe("false");
  });
});
