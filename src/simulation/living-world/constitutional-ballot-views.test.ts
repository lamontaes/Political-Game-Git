import { describe, expect, it } from "vitest";

import {
  constitutionalActions,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
  stateAmendmentProfile,
} from "../constitutional-process";
import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { stableHash } from "../ids";
import { isEligibleVoterIn } from "../issue-record";
import { dispositionsFromCounts } from "../legislation-scenarios";
import { lifePlaceStateIdentities } from "../life-places";
import { chiefExecutiveJurisdictionId } from "../nationwide-world/government-jurisdiction";
import { ensureStateJurisdiction } from "../nationwide-world/state-executives";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { searchLifePlaces } from "../index";
import type { EntityId, FutureDueItem, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  CONSTITUTIONAL_REFORM_BALLOT,
  constitutionalReformBallotHandler,
  recordedBallotTally,
} from "./constitutional-reform";

/** A state from all 56 with an amendment process and a playable locality. */
function drawState(seed: string) {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  const start = parseInt(stableHash(seed).slice(0, 8), 16) % states.length;
  for (let step = 0; step < states.length; step++) {
    const state = states[(start + step) % states.length]!;
    const usps = state.jurisdictionKey.slice(3);
    if (!stateAmendmentProfile(state.jurisdictionKey)) continue;
    if (!chiefExecutiveJurisdictionId(usps)) continue;
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0];
    if (place) return { key: state.jurisdictionKey, usps, place };
  }
  throw new Error("No state with an amendment process and a locality.");
}

const FIXTURE = {
  method: "authored-fixture" as const,
  note: "Authored chamber votes for this ballot test.",
  sourceEntityIds: [],
};

/**
 * A policy amendment referred to the voters of a drawn state, with `views`
 * saved for that many eligible residents (true = supports the policy).
 */
function referred(
  seed: string,
  stance: "adopt" | "repeal",
  views: readonly boolean[],
) {
  const state = drawState(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 40,
      questionnaire: "skipped",
      placeKey: state.place.key,
    }),
  ).game!;
  let world: World = ensureStateJurisdiction(game.world, state.usps);
  const stateId = chiefExecutiveJurisdictionId(state.usps)!;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) =>
      world.policyCatalog.issues[entry.issueId]?.levels?.includes("state"),
  )!;
  const voters = world.personOrder.filter(
    (id) =>
      id !== game.playerPersonId &&
      isEligibleVoterIn(world, id, stateId, world.currentDate),
  );
  expect(voters.length).toBeGreaterThanOrEqual(views.length);
  views.forEach((supports, index) => {
    world = recordPrivateBelief(world, {
      stableKey: `ballot-views:${index}`,
      personId: voters[index]!,
      propositionId: proposition.id,
      formedAt: world.currentDate,
      position: supports ? "support" : "oppose",
      conviction: "moderate",
      salience: "moderate",
      flexibility: "open",
      rationale: null,
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
  });
  const year = world.currentDate.slice(0, 4);
  const stableKey = `constitutional-reform/v1:${state.usps}:${year}:principles`;
  world = proposeConstitutionalMeasure(world, {
    stableKey,
    jurisdictionId: stateId,
    jurisdictionKey: state.key as `US-${string}`,
    processKind: "state-amendment",
    designation: "Fixture Amendment",
    shortTitle: proposition.name,
    text: "Fictional test text.",
    textVersion: "v1",
    sponsoringAuthority: "Fixture legislature",
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "policy-provision",
      propositionId: proposition.id,
      stance,
    },
    ordinaryMeasureId: null,
  });
  const measure = world.history.constitutionalMeasures!.at(-1)!;
  for (const body of stateAmendmentProfile(state.key)!.bodies) {
    const members = Array.from({ length: body.members }, (_, i) => ({
      memberKey: `m:${i}`,
      name: `Member ${i}`,
      personId: null,
      caucusLabel: "",
    }));
    world = recordConstitutionalProposalVote(
      world,
      measure.id,
      body.bodyKey,
      dispositionsFromCounts(members, { yea: body.members }),
      body.members,
      FIXTURE,
    );
  }
  expect(constitutionalPosition(world, measure.id).phase).toBe("ratification");
  world = scheduleFutureDueItem(world, {
    stableKey: `${stableKey}:ballot:${year}`,
    dueAt: addDays(world.currentDate, 1),
    transitionKey: CONSTITUTIONAL_REFORM_BALLOT,
    entityIds: [stateId],
    jurisdictionId: stateId,
    provenance: { kind: "authored", note: FIXTURE.note },
  });
  const due: FutureDueItem = world.history.futureDueItems.at(-1)!;
  return { world, measure, due, state: state.key };
}

function statewideVote(world: World, measureId: EntityId) {
  return constitutionalActions(world, measureId).flatMap((action) =>
    action.detail.kind === "statewide-vote" ? [action.detail] : [],
  );
}

describe("the voters decide a referred amendment from their recorded views", () => {
  const seed1 = "ballot-views-1";
  it(`three for and one against adopting: ratified at 7,500 of 10,000 (${drawState(seed1).key}, seed ${seed1})`, () => {
    const f = referred(seed1, "adopt", [true, true, true, false]);
    const tally = recordedBallotTally(f.world, f.measure)!;
    expect(tally).toMatchObject({ yes: 3, no: 1 });
    // The same saved views give the same count under any world seed.
    expect(
      recordedBallotTally({ ...f.world, seed: "other-seed" }, f.measure),
    ).toEqual(tally);
    const next = constitutionalReformBallotHandler(f.world, f.due).world;
    assertWorldIntegrity(next);
    expect(statewideVote(next, f.measure.id)).toMatchObject([
      { yes: 7_500, no: 2_500 },
    ]);
    expect(constitutionalPosition(next, f.measure.id).phase).not.toBe(
      "ratification",
    );
  });

  const seed2 = "ballot-views-2";
  it(`the same supporters vote against repealing it: rejected (${drawState(seed2).key}, seed ${seed2})`, () => {
    const f = referred(seed2, "repeal", [true, true, true, false]);
    const next = constitutionalReformBallotHandler(f.world, f.due).world;
    expect(statewideVote(next, f.measure.id)).toMatchObject([
      { yes: 2_500, no: 7_500 },
    ]);
  });

  const seed3 = "ballot-views-3";
  it(`an even split is not a majority (${drawState(seed3).key}, seed ${seed3})`, () => {
    const f = referred(seed3, "adopt", [true, false]);
    const next = constitutionalReformBallotHandler(f.world, f.due).world;
    expect(statewideVote(next, f.measure.id)).toMatchObject([
      { yes: 5_000, no: 5_000 },
    ]);
  });

  const seed4 = "ballot-views-4";
  it(`with no recorded view the ballot is unsupported and nothing is decided (${drawState(seed4).key}, seed ${seed4})`, () => {
    const f = referred(seed4, "adopt", []);
    expect(recordedBallotTally(f.world, f.measure)).toBeNull();
    const result = constitutionalReformBallotHandler(f.world, f.due);
    expect(result.world).toBe(f.world);
    expect(result.context).toMatch(/^Unsupported:/);
    expect(constitutionalPosition(result.world, f.measure.id).phase).toBe(
      "ratification",
    );
  });
});
