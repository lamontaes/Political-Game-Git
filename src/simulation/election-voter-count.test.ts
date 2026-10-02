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
