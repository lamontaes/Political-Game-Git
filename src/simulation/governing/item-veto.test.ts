import { describe, expect, it } from "vitest";

import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { addDays } from "../dates";
import { bodyForChamber } from "../legislation-scenarios";
import {
  enrollMeasure,
  measurePosition,
  presentMeasureToExecutive,
  recordEnactment,
  takeFloorVote,
} from "../legislation";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import {
  AUTHORED,
  CHAMBER,
  amend,
  billOnTheFloor,
  everyone,
  type Setup,
} from "../vote-bundle.fixture";
import { measureAnswersAt, voteBundle } from "../vote-bundle";
import { assertWorldIntegrity } from "../world";
import { recordGovernorDecisionOnMeasure } from "./legislative-clock";
import { applyItemVetoes, itemVetoPower, itemsToStrike } from "./item-veto";

/** Moves the bill through every floor stage and on to the executive. */
function toTheGovernor(setup: Setup, world: World): World {
  let next = world;
  for (let step = 0; step < 12; step += 1) {
    const phase = measurePosition(next, setup.measureId).phase;
    if (phase === "awaiting-executive") return next;
    // Each stage on its own legislative day.
    const date = addDays(next.currentDate, 1);
    next = {
      ...next,
      currentDate: date,
      currentMoment: { ...next.currentMoment, date },
    };
    if (phase === "on-floor")
      next = takeFloorVote(next, {
        stableKey: `item-veto:floor:${step}`,
        measureId: setup.measureId,
        dispositions: everyone(setup, "yea"),
        electedMembers: bodyForChamber(setup.scenario, CHAMBER).members.length,
        provenance: AUTHORED,
      });
    else if (phase === "awaiting-enrollment")
      next = enrollMeasure(next, {
        stableKey: `item-veto:enroll:${step}`,
        measureId: setup.measureId,
      });
    else if (phase === "awaiting-presentation")
      next = presentMeasureToExecutive(next, {
        stableKey: `item-veto:present:${step}`,
        measureId: setup.measureId,
      });
    else throw new Error(`Unexpected phase ${phase}.`);
  }
  throw new Error("The bill never reached the governor.");
}

function governorOpposing(
  setup: Setup,
  world: World,
): {
  world: World;
  governorId: EntityId;
} {
  // Any person in the world can stand in as the signer; this one holds a
  // settled view against the rider's answer.
  const governorId = setup.world.personOrder.find(
    (personId) => personId !== setup.memberId,
  )!;
  return {
    governorId,
    world: recordPrivateBelief(world, {
      stableKey: "item-veto:governor-view",
      personId: governorId,
      propositionId: setup.workRuleId,
      formedAt: world.currentDate,
      position: "oppose",
      conviction: "strong",
      salience: "high",
      flexibility: "firm",
      rationale: null,
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    }),
  };
}

describe("the governor's item veto", () => {
  it("reads who has one from the research table", () => {
    const { scenario } = billOnTheFloor();
    expect(itemVetoPower(scenario.pack.packId)).toMatchObject({
      reaches: "appropriation-bills",
    });
    expect(itemVetoPower(US_CONGRESS_PACK_ID)).toBeNull();
  });

  it("strikes a rider from a signed money bill, which the votes still read but the law does not", () => {
    const setup = billOnTheFloor("appropriation");
    let world = amend(setup, setup.world, "yea");
    world = toTheGovernor(setup, world);
    const opposing = governorOpposing(setup, world);
    world = recordGovernorDecisionOnMeasure(
      opposing.world,
      setup.measureId,
      "signed",
      "The governor signed the budget.",
      opposing.governorId,
    );
    expect(itemsToStrike(world, setup.measureId, opposing.governorId)).toEqual([
      expect.objectContaining({ reason: expect.stringMatching(/item veto/) }),
    ]);
    world = applyItemVetoes(world, setup.measureId, opposing.governorId);
    assertWorldIntegrity(world);
    expect(world.history.itemVetoes).toHaveLength(1);

    // Every vote before the signing read the rider.
    const floorVotes = world.history.legislativeVotes!.filter(
      (vote) =>
        vote.measureId === setup.measureId && vote.purpose === "floor-stage",
    );
    for (const vote of floorVotes)
      expect(
        voteBundle(world, vote).parts.map(
          (part) => part.answers?.propositionId,
        ),
      ).toContain(setup.workRuleId);

    // The law does not.
    expect(measurePosition(world, setup.measureId).phase).toBe(
      "awaiting-enactment",
    );
    world = recordEnactment(world, {
      stableKey: "item-veto:enact",
      measureId: setup.measureId,
    });
    const enactment = world.history.legislativeEnactments!.at(-1)!;
    expect(
      measureAnswersAt(world, setup.measureId, enactment.sequence),
    ).toEqual([{ propositionId: setup.transitId, answer: "yes" }]);
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(measureAnswersAt(reloaded, setup.measureId)).toEqual(
      measureAnswersAt(world, setup.measureId),
    );
    // Striking again after the same signing changes nothing.
    expect(applyItemVetoes(world, setup.measureId, opposing.governorId)).toBe(
      world,
    );
  });

  it("does not reach a general bill where the veto covers money bills only", () => {
    const setup = billOnTheFloor("general-policy");
    let world = amend(setup, setup.world, "yea");
    world = toTheGovernor(setup, world);
    const opposing = governorOpposing(setup, world);
    world = recordGovernorDecisionOnMeasure(
      opposing.world,
      setup.measureId,
      "signed",
      "Signed.",
      opposing.governorId,
    );
    // Nebraska's item veto reaches money bills only.
    expect(applyItemVetoes(world, setup.measureId, opposing.governorId)).toBe(
      world,
    );
  });
});
