import { describe, expect, it } from "vitest";

import type { SeatedMember } from "../legislation-scenarios";
import { measureAmendments } from "../legislation";
import { chamberByKey } from "../legislature-rules";
import {
  createFormationContext,
  recordPrivateBelief,
  recordPublicPosition,
} from "../politics";
import type {
  BeliefPosition,
  EntityId,
  PoliticalSalience,
  World,
} from "../types";
import {
  CHAMBER,
  billOnTheFloor,
  seatEveryone,
  type Setup,
} from "../vote-bundle.fixture";
import { measureAnswersAt, voteBundle } from "../vote-bundle";
import { assertWorldIntegrity } from "../world";
import {
  offerPlannedAmendment,
  planFloorAmendment,
  type AmendmentAuthorsInput,
} from "./amendment-authors";

/**
 * Three blocs in a 49-seat chamber, the shape of the Powell amendment
 * (1956): members who back the bill and back the added part, members who
 * oppose the bill and back the part, and members who back the bill but
 * cannot accept the part. Every view is authored for the test.
 */
interface Bloc {
  readonly members: readonly EntityId[];
  readonly transit: {
    position: BeliefPosition;
    salience: PoliticalSalience;
  } | null;
  readonly work: {
    position: BeliefPosition;
    salience: PoliticalSalience;
  } | null;
  /** Which of the bloc's views it has said in public. */
  readonly stated: readonly ("transit" | "work")[];
}

function blocs(
  seats: readonly SeatedMember[],
  cOpposesInPublic = true,
): readonly Bloc[] {
  const members = seats.map((member) => member.personId!);
  return [
    {
      members: members.slice(0, 20),
      transit: { position: "support", salience: "moderate" },
      work: { position: "support", salience: "central" },
      stated: ["work"],
    },
    {
      members: members.slice(20, 30),
      transit: { position: "oppose", salience: "high" },
      work: { position: "support", salience: "moderate" },
      stated: ["transit"],
    },
    {
      members: members.slice(30),
      transit: { position: "support", salience: "moderate" },
      work: { position: "oppose", salience: "high" },
      stated: cOpposesInPublic ? ["work"] : [],
    },
  ];
}

function hold(setup: Setup, world: World, groups: readonly Bloc[]): World {
  let next = world;
  groups.forEach((bloc, b) =>
    bloc.members.forEach((personId, m) => {
      for (const topic of ["transit", "work"] as const) {
        const view = bloc[topic];
        if (!view) continue;
        const propositionId =
          topic === "transit" ? setup.transitId : setup.workRuleId;
        next = recordPrivateBelief(next, {
          stableKey: `authors:${b}:${m}:${topic}`,
          personId,
          propositionId,
          formedAt: next.currentDate,
          position: view.position,
          conviction: "strong",
          salience: view.salience,
          flexibility: "firm",
          rationale: null,
          formation: createFormationContext("reflection:initial"),
          supersedesBeliefId: null,
        });
        if (bloc.stated.includes(topic))
          next = recordPublicPosition(next, {
            stableKey: `authors:${b}:${m}:${topic}:said`,
            personId,
            propositionId,
            statedAt: next.currentDate,
            stance: view.position,
            statement: "Said so on the floor.",
            audience: "public",
            venue: null,
            sourceEventId: null,
            supersedesPublicPositionId: null,
          });
      }
    }),
  );
  return next;
}

function input(
  setup: Setup,
  members: readonly SeatedMember[],
): AmendmentAuthorsInput {
  const chamber = chamberByKey(setup.scenario.pack, CHAMBER);
  return {
    measureId: setup.measureId,
    chamber,
    stage: chamber.floorStages[0]!,
    members,
    stableKey: "authors:floor",
  };
}

describe("members who amend a bill for their own reasons", () => {
  it("has an opponent offer a part that splits the bill's coalition, and says why", () => {
    const { setup, members: seats } = seatEveryone(billOnTheFloor());
    const groups = blocs(seats);
    const world = hold(setup, setup.world, groups);
    const plan = planFloorAmendment(world, input(setup, seats));
    expect(plan).toMatchObject({
      motive: "sink",
      part: { propositionId: setup.workRuleId, answer: "yes" },
    });
    // The author opposes the bill: they are in the second bloc.
    expect(groups[1]!.members).toContain(plan!.authorPersonId);
    expect(plan!.predicted.billAsItReads.passes).toBe(true);
    expect(plan!.predicted.billWithPart.passes).toBe(false);
    expect(plan!.predicted.amendment.passes).toBe(true);
    expect(plan!.reasoning).toMatch(/opposed the bill/);
  });

  it("puts the amendment to a real vote, carries it in, and keeps why on the record", () => {
    const { setup, members: seats } = seatEveryone(billOnTheFloor());
    const world = hold(setup, setup.world, blocs(seats));
    const next = offerPlannedAmendment(world, input(setup, seats));
    assertWorldIntegrity(next);
    const amendment = measureAmendments(next, setup.measureId).at(-1)!;
    expect(amendment).toMatchObject({
      status: "adopted",
      authorMotive: "sink",
      proposedSections: [
        expect.objectContaining({
          answers: { propositionId: setup.workRuleId, answer: "yes" },
        }),
      ],
    });
    // The section is now in the bill, so the floor vote is on the bill with
    // it, and the voting record will read it.
    expect(measureAnswersAt(next, setup.measureId)).toContainEqual({
      propositionId: setup.workRuleId,
      answer: "yes",
    });
    const vote = next.history.legislativeVotes!.find(
      (record) => record.id === amendment.voteId,
    )!;
    expect(vote.provenance.note).toMatch(/opposed the bill/);
    expect(voteBundle(next, vote).parts).toHaveLength(1);
    // Offering again before the same question changes nothing.
    expect(offerPlannedAmendment(next, input(setup, seats))).toBe(next);
  });

  it("predicts from what the author can know, so a private objection is missed", () => {
    const { setup, members: seats } = seatEveryone(billOnTheFloor());
    // The third bloc never said in public that it opposes the work rule, so
    // an opponent of the bill cannot count on it to sink the bill.
    const world = hold(setup, setup.world, blocs(seats, false));
    const plan = planFloorAmendment(world, input(setup, seats));
    expect(plan?.motive).not.toBe("sink");
  });

  it("has nobody amend when no member's view, lean and count line up", () => {
    const { setup, members: seats } = seatEveryone(billOnTheFloor());
    expect(planFloorAmendment(setup.world, input(setup, seats))).toBeNull();
  });

  it("has a member attach what they care about to a bill that must pass", () => {
    const { setup, members: seats } = seatEveryone(
      billOnTheFloor("appropriation"),
    );
    const members = seats.map((member) => member.personId!);
    // Everyone backs the money bill; a few care most about the work rule,
    // and nobody objects to it.
    const world = hold(setup, setup.world, [
      {
        members: members.slice(0, 5),
        transit: { position: "support", salience: "moderate" },
        work: { position: "support", salience: "central" },
        stated: ["transit", "work"],
      },
      {
        members: members.slice(5),
        transit: { position: "support", salience: "moderate" },
        work: null,
        stated: ["transit"],
      },
    ]);
    const plan = planFloorAmendment(world, input(setup, seats));
    expect(plan).toMatchObject({
      motive: "ride",
      part: { propositionId: setup.workRuleId, answer: "yes" },
    });
    expect(members.slice(0, 5)).toContain(plan!.authorPersonId);
  });
});
