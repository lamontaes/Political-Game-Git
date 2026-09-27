import { describe, expect, it } from "vitest";
import { seatedChamberMember } from "../../../tests/fixtures/seated-chamber-member";

import { createCampaignElectionTransitionRegistry } from "../campaigns";
import {
  decideChamberVote,
  seatedChamberForPack,
} from "../governing/chamber-votes";
import { committeeRoster } from "../governing/committee-assignment";
import { principledLeaning } from "../governing/officeholder-principles";
import {
  introduceMeasure,
  recordCommitteeDisposition,
  referMeasure,
} from "../legislation";
import { legislativeBlueprint } from "../legislation-scenarios";
import { createFormationContext, recordPrinciple } from "../politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { advanceWorld } from "../world";

describe("learning from a recorded legislative roll call", () => {
  it("records only the actual committee participants and reflects after their vote", () => {
    const elected = seatedChamberMember("NE");
    const blueprint = legislativeBlueprint("nebraska");
    const chamber = blueprint.pack.chambers[0]!;
    const committee = chamber.committees[0]!;
    const body = seatedChamberForPack(
      elected.world,
      blueprint.pack.packId,
      chamber.chamberKey,
      chamber.name,
    )!.body;
    const roster = committeeRoster(
      body,
      chamber.committees,
      committee.committeeKey,
      `${blueprint.pack.packId}:${chamber.chamberKey}`,
    );
    const npc = roster.find(
      (member) => member.personId && member.personId !== elected.personId,
    )!;
    const outside = body.members.find(
      (member) =>
        member.personId &&
        !roster.some((seat) => seat.personId === member.personId),
    )!;
    expect(npc?.personId).toBeDefined();
    expect(outside?.personId).toBeDefined();
    const proposition = Object.values(
      elected.world.policyCatalog.propositions,
    ).find((entry) => (entry.principles?.length ?? 0) > 0)!;
    expect(proposition).toBeDefined();
    let world: World = elected.world;
    for (const [index, bearing] of proposition.principles!.entries()) {
      const earlier = world.history.principles
        .filter(
          (row) =>
            row.personId === npc.personId &&
            row.principleId === bearing.principleId,
        )
        .at(-1);
      world = recordPrinciple(world, {
        stableKey: `vote-learning:principle:${index}`,
        personId: npc.personId!,
        principleId: bearing.principleId,
        formedAt: world.currentDate,
        stance:
          index === 0
            ? bearing.bearing === "consistent-with"
              ? "endorses"
              : "rejects"
            : "conflicted",
        conviction: "tentative",
        flexibility: "open",
        qualification: null,
        formation: createFormationContext("other:drawn-before-play", {
          note: "Focused fixture: a saved principle bearing before the ballot.",
        }),
        supersedesPrincipleRecordId: earlier?.id ?? null,
      });
    }
    expect(
      principledLeaning(world, npc.personId!, proposition.id).score,
    ).not.toBe(0);
    world = introduceMeasure(world, {
      stableKey: "vote-learning:measure",
      jurisdictionId: blueprint.context.jurisdiction.id,
      rulePackId: blueprint.pack.packId,
      designation: "LB 9999",
      shortTitle: "Recorded Question",
      summary:
        "A measure puts one recorded policy question to the legislature.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: elected.personId,
      originChamberKey: chamber.chamberKey,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    world = referMeasure(world, {
      stableKey: "vote-learning:referral",
      measureId: measure.id,
      committeeKey: committee.committeeKey,
    });
    const dispositions = decideChamberVote(world, {
      stableKey: "vote-learning:decisions",
      question: {
        question: {
          measureId: measure.id,
          purpose: "committee-report",
          forumKey: committee.committeeKey,
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Report the recorded question?",
      },
      members: roster,
      playerPersonId: elected.personId,
    });
    const participating = dispositions
      .filter(
        (row) =>
          row.personId &&
          ["yea", "nay", "present-not-voting"].includes(row.disposition),
      )
      .map((row) => row.personId!);
    expect(participating).toContain(npc.personId);
    const before = {
      knowledge: world.history.knowledge.length,
      exposures: world.history.propositionExposures.length,
      beliefs: world.history.privateBeliefs.length,
    };
    world = recordCommitteeDisposition(world, {
      stableKey: "vote-learning:committee",
      measureId: measure.id,
      recommendation: "favorable",
      dispositions,
      rationale: "The recorded committee answered its question.",
      provenance: {
        method: "member-decisions",
        note: "Named decisions from the chamber vote reader.",
        sourceEntityIds: [],
      },
    });
    const vote = world.history.legislativeVotes!.at(-1)!;
    const action = world.history.legislativeActions!.find(
      (row) => row.voteId === vote.id,
    )!;
    const event = world.history.events.find(
      (row) => row.id === action.eventId,
    )!;
    expect(event.involvedEntityIds).not.toContain(outside.personId);
    const knowledge = world.history.knowledge.slice(before.knowledge);
    const exposures = world.history.propositionExposures.slice(
      before.exposures,
    );
    expect(knowledge.map((row) => row.personId).sort()).toEqual(
      [...participating].sort(),
    );
    expect(exposures.map((row) => row.personId).sort()).toEqual(
      [...participating].sort(),
    );
    expect(
      knowledge.every(
        (row) => row.eventId === event.id && row.source.kind === "direct",
      ),
    ).toBe(true);
    expect(
      exposures.every(
        (row) =>
          row.propositionId === proposition.id &&
          row.provenance.kind === "direct-experience" &&
          row.provenance.eventId === event.id,
      ),
    ).toBe(true);
    expect(world.history.privateBeliefs).toHaveLength(before.beliefs);
    const exposure = exposures.find((row) => row.personId === npc.personId)!;
    const restored = deserializeWorld(serializeWorld(world));
    expect(restored.history.knowledge).toEqual(world.history.knowledge);
    expect(restored.history.propositionExposures).toEqual(
      world.history.propositionExposures,
    );
    const registry = createCampaignElectionTransitionRegistry();
    const continued = advanceWorld(world, 1, registry);
    const replayed = advanceWorld(restored, 1, registry);
    expect(continued.history.privateBeliefs).toContainEqual(
      expect.objectContaining({
        personId: npc.personId,
        propositionId: proposition.id,
        formation: expect.objectContaining({
          propositionExposureIds: expect.arrayContaining([exposure.id]),
        }),
      }),
    );
    expect(replayed.history.privateBeliefs).toEqual(
      continued.history.privateBeliefs,
    );
  });
});
