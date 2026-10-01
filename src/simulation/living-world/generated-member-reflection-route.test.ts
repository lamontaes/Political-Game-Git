import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { legislativeBlueprint } from "../legislation-scenarios";
import { defaultOriginChamber } from "../legislature-rules";
import { stateLegislators } from "../nationwide-world/state-legislature-opening";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { fileMemberAgendaBill } from "../governing/member-agenda";
import {
  OFFICEHOLDER_PRINCIPLES_VERSION,
  principledLeaning,
} from "../governing/officeholder-principles";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, LegislativeVoteRecord, World } from "../types";
import { advanceWorld } from "../world";

function floorVote(
  world: World,
  measureId: EntityId,
): LegislativeVoteRecord | null {
  return (
    (world.history.legislativeVotes ?? []).find(
      (vote) => vote.measureId === measureId && vote.purpose === "floor-stage",
    ) ?? null
  );
}

describe("a generated member's bill and reflection", () => {
  it("carries an ordinary agenda filing through a saved belief and roll call", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "generated-member-reflection-route-nebraska",
        placeKey: "nebraska",
        startAge: 30,
        startingLife: "legislative-office",
      }),
    ).game!;
    const blueprint = legislativeBlueprint("nebraska");
    let world = fileMemberAgendaBill(game.world, {
      jurisdictionId: blueprint.context.jurisdiction.id,
      intakeKey: "generated-member-reflection-route",
    });
    const measure = world.history.legislativeMeasures?.find((row) =>
      row.stableKey.endsWith(":generated-member-reflection-route:agenda"),
    );
    expect(measure).toBeDefined();
    const sponsorId = measure!.sponsorPersonId!;
    expect(sponsorId).not.toBe(game.playerPersonId);
    const generated = world.history.principles.filter(
      (row) =>
        row.personId === sponsorId &&
        row.stableKey.startsWith(`${OFFICEHOLDER_PRINCIPLES_VERSION}:`),
    );
    expect(generated.length).toBeGreaterThan(0);
    const answer = measure!.propositionAnswers?.[0];
    expect(answer).toBeDefined();
    expect(
      Math.abs(
        principledLeaning(world, sponsorId, answer!.propositionId).score,
      ),
    ).toBeGreaterThanOrEqual(3);
    const exposure = world.history.propositionExposures.find(
      (row) =>
        row.personId === sponsorId &&
        row.propositionId === answer!.propositionId,
    );
    expect(exposure?.provenance.kind).toBe("direct-experience");

    world = advanceWorld(world, 1, createCampaignElectionTransitionRegistry());
    const belief = world.history.privateBeliefs.find(
      (row) =>
        row.personId === sponsorId &&
        row.propositionId === answer!.propositionId &&
        row.formation.propositionExposureIds.includes(exposure!.id),
    );
    expect(belief).toBeDefined();
    const trace = world.history.decisionTraces.find((row) =>
      belief!.formation.decisionTraceIds.includes(row.id),
    );
    expect(
      trace?.context.considerations.some((consideration) =>
        consideration.sourceRefs.some(
          (reference) =>
            reference.kind === "political-principle" &&
            generated.some(
              (principle) => principle.id === reference.principleRecordId,
            ),
        ),
      ),
    ).toBe(true);

    // The rest of the chamber holds the sponsor's view, so the bill leaves
    // committee on its members' own views: a member with no view no longer
    // votes yes by default.
    const pack = blueprint.pack;
    const chamber = defaultOriginChamber(pack);
    stateLegislators(world, `${pack.packId}:candidacy`)
      .filter(
        (member) =>
          member.officeKey === `${pack.packId}:${chamber.chamberKey}` &&
          member.personId !== sponsorId &&
          member.personId !== game.playerPersonId,
      )
      .forEach((member, index) => {
        world = recordPrivateBelief(world, {
          stableKey: `generated-member-reflection-route:colleague:${index}`,
          personId: member.personId,
          propositionId: answer!.propositionId,
          formedAt: world.currentDate,
          position: answer!.answer === "yes" ? "support" : "oppose",
          conviction: "strong",
          salience: "moderate",
          flexibility: "firm",
          rationale: null,
          formation: createFormationContext("reflection:initial"),
          supersedesBeliefId: null,
        });
      });
    for (let day = 0; day < 45 && !floorVote(world, measure!.id); day += 1)
      world = advanceWorld(
        world,
        1,
        createCampaignElectionTransitionRegistry(),
      );
    const vote = floorVote(world, measure!.id);
    expect(vote?.provenance.method).toBe("member-decisions");
    const disposition = vote?.dispositions.find(
      (row) => row.personId === sponsorId,
    );
    expect(disposition).toMatchObject({
      disposition: "yea",
      reason: "member:own-bill",
    });
    const restored = deserializeWorld(serializeWorld(world));
    expect(floorVote(restored, measure!.id)?.dispositions).toEqual(
      vote?.dispositions,
    );
  }, 30_000); // Measured at 4.7 s with main merged (9/28), at the edge of the 5 s default.
});
