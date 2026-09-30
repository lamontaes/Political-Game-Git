import { describe, expect, it } from "vitest";

import { legislativeBlueprint } from "../legislation-scenarios";
import { introduceMeasure } from "../legislation";
import { memberVoteConsiderations } from "../legislative-member-decisions";
import { createFormationContext, recordPrinciple } from "../politics";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { advanceWorld } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { searchLifePlaces } from "../index";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { schedulePoliticalReflectionForExposure } from "./political-reflection";

const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: "US-NE",
  scope: "locality",
})[0]!;
const opening = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "political-reflection-nebraska-proof",
    placeKey: place.key,
    startAge: 40,
    questionnaire: "skipped",
  }),
).game!;

function fixture(withPrinciple: boolean, sponsorIsPlayer = false) {
  const personId = sponsorIsPlayer
    ? opening.playerPersonId
    : opening.world.personOrder.find((id) => id !== opening.playerPersonId)!;
  const proposition = Object.values(
    opening.world.policyCatalog.propositions,
  ).find((entry) => entry.principles && entry.principles.length > 0)!;
  const bearing = proposition.principles![0]!;
  let world: World = opening.world;
  if (withPrinciple)
    world = recordPrinciple(world, {
      stableKey: `reflection-proof:principle:${personId}`,
      personId,
      principleId: bearing.principleId,
      formedAt: world.currentDate,
      stance: bearing.bearing === "consistent-with" ? "endorses" : "rejects",
      strength: 0.75,
      conviction: "strong",
      flexibility: "open",
      qualification: null,
      formation: createFormationContext("other:drawn-before-play", {
        note: "Test fixture: a saved prior principle, not an inference from the bill.",
      }),
      supersedesPrincipleRecordId: null,
    });
  const blueprint = legislativeBlueprint("nebraska");
  const dueBefore = world.history.futureDueItems.length;
  world = introduceMeasure(world, {
    stableKey: `reflection-proof:measure:${personId}`,
    jurisdictionId: blueprint.context.jurisdiction.id,
    rulePackId: blueprint.pack.packId,
    designation: "LB 999",
    shortTitle: "Question Encounter",
    summary: "A recorded sponsor encounters a specific policy question.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: personId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const exposure = world.history.propositionExposures.at(-1)!;
  expect(exposure.personId).toBe(personId);
  expect(exposure.propositionId).toBe(proposition.id);
  return {
    world,
    personId,
    propositionId: proposition.id,
    exposureId: exposure.id,
    dueBefore,
  };
}

function beliefs(world: World, personId: EntityId, propositionId: EntityId) {
  return world.history.privateBeliefs.filter(
    (row) => row.personId === personId && row.propositionId === propositionId,
  );
}

describe("dated political reflection on a recorded exposure", () => {
  it("schedules once, survives reload, and forms a cited private view on the master clock", () => {
    const f = fixture(true);
    const scheduled = schedulePoliticalReflectionForExposure(
      f.world,
      f.exposureId,
    );
    expect(scheduled).toBe(f.world);
    expect(scheduled.history.futureDueItems).toHaveLength(f.dueBefore + 1);
    const reloaded = deserializeWorld(serializeWorld(scheduled));
    const again = schedulePoliticalReflectionForExposure(
      reloaded,
      f.exposureId,
    );
    expect(serializeWorld(again)).toBe(serializeWorld(reloaded));
    const advanced = advanceWorld(
      again,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    const formed = beliefs(advanced, f.personId, f.propositionId);
    expect(formed).toHaveLength(1);
    expect(formed[0]?.position).toBe("support");
    expect(formed[0]?.formation.propositionExposureIds).toContain(f.exposureId);
    expect(formed[0]?.formation.decisionTraceIds).toHaveLength(1);
    const measure = advanced.history.legislativeMeasures?.at(-1);
    if (!measure) throw new Error("The sponsor's measure was not saved.");
    const measureId = measure.id;
    const voteReasons = memberVoteConsiderations(advanced, {
      stableKey: "reflection-proof:floor-vote",
      personId: f.personId,
      question: {
        question: {
          measureId,
          purpose: "floor-stage",
          forumKey: "house",
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Pass this measure?",
      },
    }).filter((row) => row.sourceType === "belief:formed-position");
    expect(voteReasons).toHaveLength(1);
    expect(voteReasons[0]?.sourceRefs).toEqual([
      { kind: "private-belief", beliefId: formed[0]?.id },
    ]);
  });

  it("keeps an exposed NPC without a recorded bearing at no opinion", () => {
    const f = fixture(false);
    const scheduled = schedulePoliticalReflectionForExposure(
      f.world,
      f.exposureId,
    );
    expect(scheduled).toBe(f.world);
    expect(scheduled.history.futureDueItems).toHaveLength(f.dueBefore);
    const advanced = advanceWorld(
      scheduled,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    expect(beliefs(advanced, f.personId, f.propositionId)).toEqual([]);
  });

  it("reconsiders a later real exposure as a new saved belief", () => {
    const f = fixture(true);
    const registry = createCampaignElectionTransitionRegistry();
    let world = advanceWorld(
      schedulePoliticalReflectionForExposure(f.world, f.exposureId),
      1,
      registry,
    );
    const first = beliefs(world, f.personId, f.propositionId)[0]!;
    const blueprint = legislativeBlueprint("nebraska");
    world = introduceMeasure(world, {
      stableKey: `reflection-proof:later-measure:${f.personId}`,
      jurisdictionId: blueprint.context.jurisdiction.id,
      rulePackId: blueprint.pack.packId,
      designation: "LB 1000",
      shortTitle: "Question Revisited",
      summary: "The same sponsor encounters the question in a later filing.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: f.personId,
      propositionIds: [f.propositionId],
    });
    const laterExposure = world.history.propositionExposures.at(-1)!;
    expect(laterExposure.sequence).toBeGreaterThan(first.sequence);
    expect(
      schedulePoliticalReflectionForExposure(world, laterExposure.id),
    ).toBe(world);
    world = advanceWorld(world, 1, registry);
    const revised = beliefs(world, f.personId, f.propositionId);
    expect(revised).toHaveLength(2);
    expect(revised[1]?.supersedesBeliefId).toBe(first.id);
    expect(revised[1]?.formation.propositionExposureIds).toContain(
      laterExposure.id,
    );
  });

  it("leaves a controlled sponsor's political view to the player", () => {
    const f = fixture(true, true);
    expect(schedulePoliticalReflectionForExposure(f.world, f.exposureId)).toBe(
      f.world,
    );
    expect(f.world.history.futureDueItems).toHaveLength(f.dueBefore);
  });
});
