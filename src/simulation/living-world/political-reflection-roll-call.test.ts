import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { scheduleInstitutionStep } from "../governing/legislative-clock";
import { principledLeaning } from "../governing/officeholder-principles";
import { publicPartyOf } from "../governing/chamber-votes";
import { nextMeasureDesignation } from "../measure-numbering";
import { introduceMeasure, measurePosition } from "../legislation";
import { legislativeBlueprint } from "../legislation-scenarios";
import { defaultOriginChamber } from "../legislature-rules";
import { stateLegislators } from "../nationwide-world/state-legislature-opening";
import {
  createFormationContext,
  recordPrinciple,
  recordPrivateBelief,
} from "../politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, LegislativeVoteRecord, World } from "../types";
import { advanceWorld } from "../world";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";

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

function reachFloor(world: World, measureId: EntityId): World {
  const registry = createCampaignElectionTransitionRegistry();
  let next = world;
  for (let day = 0; day < 45 && !floorVote(next, measureId); day += 1)
    next = advanceWorld(next, 1, registry);
  return next;
}

describe("a recorded reflection reaches the chamber's saved roll call", () => {
  it("uses an NPC member's dated belief as the decisive reason, with Save and Continue replay", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "recorded-reflection-roll-call-nebraska",
        placeKey: "nebraska",
        startAge: 30,
        startingLife: "legislative-office",
      }),
    ).game!;
    const blueprint = legislativeBlueprint("nebraska");
    const pack = blueprint.pack;
    const chamber = defaultOriginChamber(pack);
    const members = stateLegislators(
      game.world,
      `${pack.packId}:candidacy`,
    ).filter(
      (member) =>
        member.officeKey === `${pack.packId}:${chamber.chamberKey}` &&
        member.personId !== game.playerPersonId,
    );
    expect(members.length).toBeGreaterThan(1);
    const member = members[0]!;
    const otherSponsor =
      members.find(
        (candidate) =>
          candidate.personId !== member.personId &&
          publicPartyOf(game.world, candidate.personId) !==
            publicPartyOf(game.world, member.personId),
      ) ?? members[1]!;
    const proposition = Object.values(
      game.world.policyCatalog.propositions,
    ).find(
      (entry) =>
        (entry.principles?.length ?? 0) > 0 &&
        game.world.policyCatalog.issues[entry.issueId]?.levels?.includes(
          "state",
        ),
    );
    if (!proposition) throw new Error("No principled state question.");
    let world = game.world;
    for (const [index, bearing] of proposition.principles!.entries()) {
      const earlierPrinciple = world.history.principles
        .filter(
          (row) =>
            row.personId === member.personId &&
            row.principleId === bearing.principleId,
        )
        .at(-1);
      world = recordPrinciple(world, {
        stableKey: `roll-call-proof:principle:${index}`,
        personId: member.personId,
        principleId: bearing.principleId,
        formedAt: world.currentDate,
        stance:
          index === 0
            ? bearing.bearing === "consistent-with"
              ? "endorses"
              : "rejects"
            : "conflicted",
        strength: 0.25,
        conviction: "tentative",
        flexibility: "open",
        qualification: null,
        formation: createFormationContext("other:drawn-before-play", {
          note: "Test fixture: one tentative bearing among recorded principles.",
        }),
        supersedesPrincipleRecordId: earlierPrinciple?.id ?? null,
      });
    }
    expect(
      principledLeaning(world, member.personId, proposition.id).score,
    ).toBe(1);
    world = introduceMeasure(world, {
      stableKey: "roll-call-proof:first-encounter",
      jurisdictionId: blueprint.context.jurisdiction.id,
      rulePackId: pack.packId,
      designation: nextMeasureDesignation(world, {
        jurisdictionId: blueprint.context.jurisdiction.id,
        originChamber: chamber,
      }),
      shortTitle: "First Question Encounter",
      summary: "The member files a measure on a question.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: member.personId,
      originChamberKey: chamber.chamberKey,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
    });
    const exposure = world.history.propositionExposures.at(-1)!;
    expect(exposure.personId).toBe(member.personId);
    world = advanceWorld(world, 1, createCampaignElectionTransitionRegistry());
    const belief = world.history.privateBeliefs.find(
      (row) =>
        row.personId === member.personId &&
        row.propositionId === proposition.id &&
        row.formation.propositionExposureIds.includes(exposure.id),
    );
    expect(belief?.position).toBe("support");
    if (!belief) throw new Error("The exposed member formed no view.");

    // The rest of the chamber favors the contrary answer, so the measure
    // leaves committee on its members' own views: a member with no view no
    // longer votes yes by default.
    for (const [index, other] of members.entries()) {
      if (other.personId === member.personId) continue;
      world = recordPrivateBelief(world, {
        stableKey: `roll-call-proof:colleague:${index}`,
        personId: other.personId,
        propositionId: proposition.id,
        formedAt: world.currentDate,
        position: "oppose",
        conviction: "strong",
        salience: "moderate",
        flexibility: "firm",
        rationale: null,
        formation: createFormationContext("reflection:initial"),
        supersedesBeliefId: null,
      });
    }
    world = introduceMeasure(world, {
      stableKey: "roll-call-proof:contrary-measure",
      jurisdictionId: blueprint.context.jurisdiction.id,
      rulePackId: pack.packId,
      designation: nextMeasureDesignation(world, {
        jurisdictionId: blueprint.context.jurisdiction.id,
        originChamber: chamber,
      }),
      shortTitle: "Contrary Answer",
      summary: "A different member files a contrary answer.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: otherSponsor.personId,
      originChamberKey: chamber.chamberKey,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "no" }],
    });
    const measureId = world.history.legislativeMeasures?.at(-1)?.id;
    if (!measureId) throw new Error("The contrary measure was not saved.");
    world = scheduleInstitutionStep(world, measureId);
    for (
      let day = 0;
      day < 45 && measurePosition(world, measureId).phase !== "on-floor";
      day += 1
    )
      world = advanceWorld(
        world,
        1,
        createCampaignElectionTransitionRegistry(),
      );
    expect(measurePosition(world, measureId).phase).toBe("on-floor");
    const restored = deserializeWorld(serializeWorld(world));
    const completed = reachFloor(world, measureId);
    const replayed = reachFloor(restored, measureId);
    const vote = floorVote(completed, measureId);
    expect(vote?.provenance.method).toBe("member-decisions");
    expect(
      vote?.dispositions.find((row) => row.personId === member.personId),
    ).toMatchObject({
      disposition: "nay",
      reason: `member:private-belief:${belief.id}`,
    });
    expect(floorVote(replayed, measureId)?.dispositions).toEqual(
      vote?.dispositions,
    );
  }, 30_000); // Measured at 5.6 s with main merged (9/28), past the 5 s default.
});
