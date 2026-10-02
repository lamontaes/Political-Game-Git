import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { daysBetween } from "./dates";
import { advanceWorld } from "./world";
import {
  nominationPlan,
  nominationRuleRow,
} from "./nominations/nomination-rules";
import {
  holdNominationPrimary,
  NOMINATION_EVENT,
  nominationPrimaryRecord,
} from "./nominations/party-nominations";

import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { countRecordedVoterBallots } from "./election-contests";
import { isEligibleVoterIn } from "./issue-record";
import { lifePlaceStateIdentities } from "./life-places";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";

const placeSeed = "a114-recorded-voter-place";
const place = new SeededRng(placeSeed).pick(lifePlaceStateIdentities()).usps;
function setup(seed: string) {
  const { world } = smallWorld({ place, seed, people: 8 });
  const jurisdictionId =
    world.people[world.personOrder[0]!]!.homeJurisdictionId;
  const adults = world.personOrder.filter((id) =>
    isEligibleVoterIn(world, id, jurisdictionId, world.currentDate),
  );
  if (adults.length < 4)
    throw new Error(`Missing actual adult fixture voters in ${place}`);
  return {
    world,
    voters: adults.slice(2),
    input: {
      stableKey: "recorded-voter-proof",
      jurisdictionId,
      electionDate: world.currentDate,
      candidatePersonIds: adults.slice(0, 2),
    },
  };
}
function support(world: World, voterId: EntityId, candidateId: EntityId) {
  return recordPrivateBelief(world, {
    stableKey: `candidate-view:${voterId}:${candidateId}`,
    personId: voterId,
    propositionId: null,
    subject: { kind: "official", personId: candidateId },
    formedAt: world.currentDate,
    position: "support",
    conviction: "strong",
    salience: "high",
    flexibility: "negotiable",
    rationale: "The fixture voter supports this recorded candidate.",
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId: null,
  });
}

describe(`shared recorded voter count (${place}, all56 draw ${placeSeed})`, () => {
  it("counts actual saved views through the shared decision without seed pull; save/reopen preserves the result", () => {
    const results = ["a114-world-one", "a114-world-two"].map((seed) => {
      const fixture = setup(seed);
      let world = fixture.world;
      for (const voterId of fixture.voters)
        world = support(world, voterId, fixture.input.candidatePersonIds[0]!);
      const result = countRecordedVoterBallots(world, fixture.input);
      expect(result?.winnerPersonId).toBe(fixture.input.candidatePersonIds[0]);
      expect(result?.tallies.map((row) => row.votes)).toEqual([
        fixture.voters.length,
        0,
      ]);
      const saved = serializeWorld(world);
      expect(
        countRecordedVoterBallots(deserializeWorld(saved), fixture.input),
      ).toEqual(result);
      expect(serializeWorld(world)).toBe(saved);
      return result?.tallies.map((row) => row.votes);
    });
    expect(results[0]).toEqual(results[1]);
  });
  it("leaves missing preferences, exact voter ties, and unread legal admission unresolved", () => {
    const fixture = setup("a114-missing-tie");
    expect(countRecordedVoterBallots(fixture.world, fixture.input)).toBeNull();
    let world = support(
      fixture.world,
      fixture.voters[0]!,
      fixture.input.candidatePersonIds[0]!,
    );
    expect(
      countRecordedVoterBallots(world, {
        ...fixture.input,
        admitVoter: () => null,
      }),
    ).toBeNull();
    world = support(
      world,
      fixture.voters[1]!,
      fixture.input.candidatePersonIds[1]!,
    );
    expect(countRecordedVoterBallots(world, fixture.input)).toBeNull();
  });
});

it("holds a sourced all-party primary from saved voter views and retains its tally after reopening", () => {
  const drawSeed = "a114-sourced-all-party-primary";
  const primaryPlace = drawRandomPlace(drawSeed, (candidate) => {
    const state = candidate.stateJurisdictionKey?.slice(3);
    return (
      candidate.scope === "locality" &&
      state !== undefined &&
      nominationRuleRow(state)?.method === "top-two"
    );
  });
  const stateUsps = primaryPlace.stateJurisdictionKey!.slice(3);
  expect(nominationRuleRow(stateUsps)?.method).toBe("top-two");
  const fixture = smallWorld({
    place: primaryPlace.key,
    seed: drawSeed,
    people: 8,
  });
  const plan = nominationPlan(fixture.world, {
    stateUsps,
    family: "us-house",
    year: 2026,
    onDate: fixture.world.currentDate,
  });
  expect(plan.known, `${primaryPlace.displayName}; seed ${drawSeed}`).toBe(
    true,
  );
  if (!plan.known) throw new Error(plan.reason);
  expect(plan.method).toBe("top-two");
  const jurisdictionId =
    fixture.world.people[fixture.world.personOrder[0]!]!.homeJurisdictionId;
  const adults = fixture.world.personOrder.filter((id) =>
    isEligibleVoterIn(
      fixture.world,
      id,
      jurisdictionId,
      fixture.world.currentDate,
    ),
  );
  expect(
    adults.length,
    `${primaryPlace.displayName}; seed ${drawSeed}`,
  ).toBeGreaterThanOrEqual(4);
  const preferred = adults[0]!;
  const incumbent = adults[1]!;
  const voters = adults.slice(2);
  let supported = fixture.world;
  for (const voterId of voters)
    supported = support(supported, voterId, preferred);
  const elapsed = daysBetween(supported.currentDate, plan.primaryDate);
  expect(elapsed).toBeGreaterThan(0);
  const onPrimaryDay = advanceWorld(supported, elapsed);
  expect(onPrimaryDay.currentDate).toBe(plan.primaryDate);
  expect(onPrimaryDay.currentMoment.date).toBe(plan.primaryDate);
  const input = {
    stableKey: "a114-saved-voters:all-party-primary:2026",
    seatKey: "a114-saved-voters:fixture-seat",
    title: `Recorded-voter fixture in ${primaryPlace.displayName}`,
    jurisdictionId,
    involvedEntityIds: [preferred, incumbent],
    plan,
    entrants: [
      {
        personId: preferred,
        party: "democratic",
        incumbent: false,
        partyBacked: false,
      },
      {
        personId: incumbent,
        party: "republican",
        incumbent: true,
        partyBacked: true,
      },
    ],
    // The all-party path must count actual views, never static party shares.
    partyShare: () => {
      throw new Error("A recorded primary must not read static party pull.");
    },
  };
  const missingViews = advanceWorld(fixture.world, elapsed);
  expect(holdNominationPrimary(missingViews, input)).toBe(missingViews);
  expect(nominationPrimaryRecord(missingViews, input.stableKey)).toBeNull();
  const held = holdNominationPrimary(onPrimaryDay, input);
  const event = nominationPrimaryRecord(held, input.stableKey);
  expect(event?.type).toBe(NOMINATION_EVENT);
  expect(event?.occurredAt).toBe(plan.primaryDate);
  expect(event?.participants.map((row) => [row.personId, row.detail])).toEqual([
    [preferred, "democratic|1000|advanced"],
    [incumbent, "republican|0|advanced"],
  ]);
  expect(holdNominationPrimary(held, input)).toBe(held);
  const reopened = deserializeWorld(serializeWorld(held));
  expect(nominationPrimaryRecord(reopened, input.stableKey)).toEqual(event);
  expect(holdNominationPrimary(reopened, input)).toBe(reopened);
});

const openingSeed = "overflow8-a114-continuation-opening";
const openingPlace = drawRandomPlace(openingSeed);
it(`opens a new game in ${openingPlace.displayName}, ${openingPlace.stateJurisdictionKey}, seed ${openingSeed}`, () => {
  const opened = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: openingSeed,
      placeKey: openingPlace.key,
    }),
  );
  expect(opened.game).not.toBeNull();
  const game = opened.game!;
  expect(game.world.people[game.playerPersonId]!.homeJurisdictionId).toBe(
    openingPlace.context.jurisdiction.id,
  );
  expect(game.world.control).toEqual({
    kind: "person",
    personId: game.playerPersonId,
  });
});

// Canonical controlled filing fixture, not a registration producer or play gate.
it("restores unopposed nominations without inventing voter admission, while contested party ballots remain pending", () => {
  const seed = "a117-unopposed-primary-repair";
  const place = drawRandomPlace(seed, (candidate) => {
    const state = candidate.stateJurisdictionKey?.slice(3);
    return (
      candidate.scope === "locality" &&
      state !== undefined &&
      nominationRuleRow(state)?.method === "party-primary"
    );
  });
  const built = smallWorld({ place: place.key, seed, people: 8 });
  const stateUsps = place.stateJurisdictionKey!.slice(3);
  const plan = nominationPlan(built.world, {
    stateUsps,
    family: "us-house",
    year: 2026,
    onDate: built.world.currentDate,
  });
  if (!plan.known) throw new Error(plan.reason);
  const onDate = {
    ...built,
    world: advanceWorld(
      built.world,
      daysBetween(built.world.currentDate, plan.primaryDate),
    ),
  };
  const candidates = onDate.world.personOrder.slice(0, 2);
  const input = {
    stableKey: "a117:unopposed-repair",
    seatKey: "fixture:unopposed-seat",
    title: "Unopposed filing control",
    jurisdictionId: onDate.jurisdictionId,
    involvedEntityIds: candidates,
    plan,
    entrants: candidates.map((personId) => ({
      personId,
      party: "fixture-party",
      incumbent: false,
      partyBacked: false,
    })),
    partyShare: () => {
      throw new Error("No static party share allowed.");
    },
  };
  expect(holdNominationPrimary(onDate.world, input)).toBe(onDate.world);
  expect(nominationPrimaryRecord(onDate.world, input.stableKey)).toBeNull();
  const held = holdNominationPrimary(onDate.world, {
    ...input,
    entrants: input.entrants.slice(0, 1),
  });
  const primary = nominationPrimaryRecord(held, input.stableKey)!;
  expect(primary.participants).toHaveLength(1);
  expect(primary.participants[0]!.personId).toBe(candidates[0]);
  expect(primary.participants[0]!.detail).toBe("fixture-party||unopposed");
  expect(primary.tags).toContain("unopposed-filing/v1");
  expect(primary.tags).not.toContain("recorded-voter-count/v1");
  expect(held.history.privateBeliefs).toEqual(
    onDate.world.history.privateBeliefs,
  );
  expect(held.history.decisionTraces).toEqual(
    onDate.world.history.decisionTraces,
  );
  expect(holdNominationPrimary(held, input)).toBe(held);
  const reopened = deserializeWorld(serializeWorld(held));
  expect(nominationPrimaryRecord(reopened, input.stableKey)).toEqual(primary);
});
