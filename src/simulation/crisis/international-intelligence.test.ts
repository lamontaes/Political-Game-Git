import { describe, expect, it } from "vitest";

// World first, the order the game itself loads in.
import { advanceWorld, assertWorldIntegrity } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import type { EntityId, World } from "../types";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  declareInternationalCrisis,
  internationalCrisisState,
  UNRESEARCHED_INTELLIGENCE,
} from "./international";
import { appendCrisisRecord, crisisRecords } from "./records";
import type { CounterpartyResponseRecord, TensionLevel } from "./types";

/** The place of all 56 this seed draws, with a locality to live in. */
function drawPlace(): { seed: string; usps: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `a133-intelligence-${n}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, usps: place.usps };
  }
  throw new Error("No place with a locality was drawn.");
}

const { seed, usps } = drawPlace();
const label = `${usps}, seed ${seed}`;

function declare(
  world: World,
  key: string,
  tension: TensionLevel,
  counterpartyLabel = "a foreign government",
): { world: World; crisisId: EntityId } {
  const next = declareInternationalCrisis(world, {
    stableKey: key,
    counterpartyLabel,
    allyLabels: ["treaty allies"],
    subject: "access to a disputed shipping lane",
    tension,
    basis: "Declared test crisis; fictional counterparty.",
  });
  const crisisId = crisisRecords(next)
    .filter((record) => record.kind === "international-crisis")
    .at(-1)!.id;
  return { world: next, crisisId };
}

function assessment(world: World, crisisId: EntityId) {
  return internationalCrisisState(world, crisisId).assessments.at(-1)!;
}

/** A response on record through the one crisis-record writer. */
function responded(
  world: World,
  crisisId: EntityId,
  cycle: number,
  counterparty: CounterpartyResponseRecord["counterparty"],
): World {
  return appendCrisisRecord(world, {
    kind: "counterparty-response",
    stableKey: `a133-test:${crisisId}:response:${cycle}`,
    effectiveAt: world.currentDate,
    causalParentIds: [crisisId],
    visibility: "public",
    eventId: null,
    crisisId,
    cycle,
    counterparty,
    allies: "stood-aside",
    tensionAfter: "elevated",
    ended: false,
  } as never);
}

describe(`intelligence judges from the record, not a roll (A133; ${label})`, () => {
  it("a first look at a counterparty with no record rests on the tension alone, the same under any key", () => {
    const { world } = smallWorld({ place: usps, people: 3, seed });
    const quiet = declare(world, "quiet", "low");
    const first = assessment(quiet.world, quiet.crisisId);
    expect(first.confidence, label).toBe("low");
    expect(first.assessedIntent).toBe("probing");
    expect(first.reasons).toContain(
      "no record yet of how a foreign government acts",
    );
    expect(
      internationalCrisisState(quiet.world, quiet.crisisId).options.at(-1)!
        .recommended,
    ).toBe("diplomatic");
    // A different key changes nothing: nothing is drawn from it.
    const again = declare(world, "quiet-again", "low");
    expect(assessment(again.world, again.crisisId)).toMatchObject({
      confidence: first.confidence,
      assessedIntent: first.assessedIntent,
      reasons: first.reasons,
    });

    // A severe standoff leaves its preparations in plain sight.
    const severe = declare(world, "severe", "severe");
    const read = assessment(severe.world, severe.crisisId);
    expect(read.confidence).toBe("high");
    expect(read.assessedIntent).toBe("preparing-force");
    expect(read.reasons).toContain("preparations in plain sight");
    expect(
      internationalCrisisState(severe.world, severe.crisisId).options.at(-1)!
        .recommended,
    ).toBe("force-posture");
    assertWorldIntegrity(severe.world);
  });

  it("a counterparty's record in an earlier dispute makes the next judgment surer and moves the intent it reads", () => {
    const { world } = smallWorld({ place: usps, people: 3, seed });
    // An earlier dispute in which the counterparty escalated three times.
    let earlier = declare(world, "earlier", "elevated");
    let next = earlier.world;
    for (const cycle of [0, 1, 2])
      next = responded(next, earlier.crisisId, cycle, "escalated");
    earlier = { world: next, crisisId: earlier.crisisId };

    const fresh = declare(world, "fresh", "elevated");
    const known = declare(earlier.world, "known", "elevated");
    const stranger = declare(
      earlier.world,
      "stranger",
      "elevated",
      "another government",
    );
    const before = assessment(fresh.world, fresh.crisisId);
    const after = assessment(known.world, known.crisisId);
    // 0.85 for elevated tension alone; 0.85 + 3 × 0.5 with the record.
    expect(UNRESEARCHED_INTELLIGENCE.pastDisputeWeight).toBe(0.5);
    expect(before.confidence).toBe("low");
    expect(after.confidence).toBe("moderate");
    expect(before.assessedIntent).toBe("probing");
    // Elevated (1) plus a reputation of escalating, capped at 2 × 0.5.
    expect(after.assessedIntent).toBe("coercive");
    expect(after.reasons).toContain(
      "a foreign government has escalated before",
    );
    // Another counterparty's record says nothing about this one.
    expect(assessment(stranger.world, stranger.crisisId)).toMatchObject({
      confidence: before.confidence,
      assessedIntent: before.assessedIntent,
    });
    assertWorldIntegrity(known.world);
    console.info(
      JSON.stringify({
        place: label,
        fresh: before,
        afterAnEscalatingRecord: after,
      }),
    );
  });

  it("played forward, the next cycle's assessment reads what the counterparty actually did", () => {
    const { world } = smallWorld({
      place: usps,
      people: 3,
      seed,
      offices: ["congress"],
    });
    const declared = declare(world, "played", "high");
    const later = advanceWorld(
      declared.world,
      30,
      createCampaignElectionTransitionRegistry(),
    );
    assertWorldIntegrity(later);
    const state = internationalCrisisState(later, declared.crisisId);
    console.info(
      JSON.stringify({
        place: label,
        responses: state.responses.map((r) => r.counterparty),
        assessments: state.assessments.map((a) => [
          a.cycle,
          a.confidence,
          a.assessedIntent,
          a.reasons,
        ]),
      }),
    );
    expect(state.responses.length, label).toBeGreaterThan(0);
    const second = state.assessments.find((a) => a.cycle === 1);
    expect(second, label).toBeDefined();
    expect(second!.reasons).toContain("1 response watched in this dispute");
    // One response more on record: high tension's 1.7 plus 1 crosses 2.5.
    expect(state.assessments[0]!.confidence).toBe("moderate");
    expect(second!.confidence).toBe("high");
  });
});
