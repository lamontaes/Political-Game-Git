import { describe, expect, it } from "vitest";

import { ageOnDate } from "./dates";
import {
  LIFE_START_PLACES,
  availableLifeActions,
  createLifeStartWorld,
  performLifeAction,
  summarizeLifeWorld,
} from "./life-start";
import { SYNTHETIC_MIND_IDS } from "./mind-catalog";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";

function playerId(world: ReturnType<typeof createLifeStartWorld>) {
  if (world.control.kind !== "person") {
    throw new Error("Expected player control.");
  }
  return world.control.personId;
}

describe("life-start simulation foundation", () => {
  it("supports deterministic childhood, teenage, and adult dates of birth", () => {
    for (const age of [8, 16, 32]) {
      const first = createLifeStartWorld({
        givenName: "Morgan",
        familyName: "Chen",
        startAge: age,
        seed: `age-${age}`,
      });
      const second = createLifeStartWorld({
        givenName: "Morgan",
        familyName: "Chen",
        startAge: age,
        seed: `age-${age}`,
      });
      const person = first.people[playerId(first)]!;
      expect(ageOnDate(person.birthDate, first.currentDate)).toBe(age);
      expect(serializeWorld(second)).toBe(serializeWorld(first));
    }
  });

  it("keeps birthplace, hometown, and residence distinct across real places", () => {
    const world = createLifeStartWorld({
      givenName: "Avery",
      familyName: "Brooks",
      startAge: 16,
      birthplace: "los-angeles-california",
      hometown: "chicago-illinois",
      currentResidence: "lexington-kentucky",
      seed: "three-place-life",
    });
    const summary = summarizeLifeWorld(world, playerId(world));

    expect(summary).toMatchObject({
      birthplace: "Los Angeles, California",
      hometown: "Chicago, Illinois",
      currentResidence: "Lexington, Kentucky",
    });
    expect(LIFE_START_PLACES).toHaveLength(3);
    expect(
      LIFE_START_PLACES.find((place) => place.key === "chicago-illinois"),
    ).toMatchObject({
      sourceName: "Chicago city, Illinois",
      politicalCapability: "place-identity-only",
    });
    expect(world.jurisdictionOrder).toHaveLength(3);
  });

  it("leaves unchosen biography unknown and creates no canned people, jobs, or schools", () => {
    const world = createLifeStartWorld({
      givenName: "Riley",
      familyName: "James",
      startAge: 25,
      depth: "play-from-here",
      seed: "sparse-biography",
    });
    const summary = summarizeLifeWorld(world, playerId(world));

    expect(world.personOrder).toHaveLength(1);
    expect(world.history.organizations).toStrictEqual([]);
    expect(world.history.workRelationships).toStrictEqual([]);
    expect(world.history.educationEnrollments).toStrictEqual([]);
    expect(world.history.kinshipRelationships).toStrictEqual([]);
    expect(world.history.relationshipInteractions).toStrictEqual([]);
    expect(summary.workLabel).toBeNull();
    expect(summary.educationLabel).toBeNull();
    expect(summary.resourceLabel).toBe("Resources not established");
    expect(serializeWorld(world)).not.toMatch(
      /University of Kentucky|community ally|City Council/i,
    );
  });

  it("uses one history store for explicit anchors and ignores them in Play From Here", () => {
    const anchor = {
      date: "2020-06-15",
      summary: "Riley chose to leave a long-running club.",
    };
    const sparse = createLifeStartWorld({
      givenName: "Riley",
      familyName: "James",
      startAge: 25,
      depth: "play-from-here",
      historyAnchors: [anchor],
      seed: "sparse-anchor",
    });
    const authored = createLifeStartWorld({
      givenName: "Riley",
      familyName: "James",
      startAge: 25,
      depth: "build-my-history",
      historyAnchors: [anchor],
      seed: "authored-anchor",
    });

    expect(
      sparse.history.events.some((event) =>
        event.tags.includes("life.history-anchor"),
      ),
    ).toBe(false);
    expect(
      authored.history.events.find((event) =>
        event.tags.includes("life.history-anchor"),
      ),
    ).toMatchObject({
      occurredAt: anchor.date,
      summary: anchor.summary,
      visibility: "private",
    });
  });

  it("records only subtle, low-confidence situational evidence and permits change", () => {
    const initial = createLifeStartWorld({
      givenName: "Sam",
      familyName: "Ortiz",
      startAge: 16,
      friendAnswer: "truth",
      riskAnswer: "risk",
      seed: "mutable-evidence",
    });
    const id = playerId(initial);
    const tendency = initial.history.personalityTendencies[0]!;

    expect(initial.history.personalValues[0]).toMatchObject({
      personId: id,
      strength: "subtle",
      salience: "low",
    });
    expect(tendency).toMatchObject({
      personId: id,
      strength: "subtle",
      confidence: "low",
      expressionKey: "risk-seeking",
    });

    const changed = recordPersonalityTendency(initial, {
      stableKey: "later-play:risk-reappraisal",
      personId: id,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
      recordedAt: initial.currentDate,
      expressionKey: "cautious",
      strength: "moderate",
      confidence: "medium",
      scopeTags: ["played.experience"],
      provenance: createMindProvenance("player-choice", {
        note: "Later played behavior changed the evidence.",
      }),
      supersedesTendencyId: tendency.id,
    });
    expect(changed.history.personalityTendencies.at(-1)).toMatchObject({
      expressionKey: "cautious",
      supersedesTendencyId: tendency.id,
    });
  });

  it("allows politics to be skipped and records direct beliefs without party inference", () => {
    const skipped = createLifeStartWorld({
      givenName: "Casey",
      familyName: "Lee",
      startAge: 34,
      seed: "politics-skipped",
    });
    expect(skipped.history.privateBeliefs).toStrictEqual([]);
    expect(skipped.history.publicPositions).toStrictEqual([]);
    expect(skipped.history.campaignCommitments).toStrictEqual([]);

    const answered = createLifeStartWorld({
      givenName: "Casey",
      familyName: "Lee",
      startAge: 34,
      policyAnswers: {
        "collective-bargaining": "support",
        "clean-electricity": "uncertain",
      },
      seed: "politics-direct",
    });
    expect(
      answered.history.privateBeliefs.map((belief) => belief.position),
    ).toStrictEqual(["support", "uncertain"]);
    expect(answered.history.propositionExposures).toHaveLength(2);
    expect(answered.history.publicPositions).toStrictEqual([]);
    expect(answered.history.campaignCommitments).toStrictEqual([]);
    expect(answered.history.principles).toStrictEqual([]);
    expect(serializeWorld(answered)).not.toMatch(/democratic|republican/i);
  });

  it("creates materially different explicit household, housing, and resource starts", () => {
    const unknown = createLifeStartWorld({
      givenName: "Taylor",
      familyName: "Ng",
      startAge: 40,
      householdKind: "alone",
      housingKind: "unknown",
      startingFundsUsd: null,
      seed: "circumstances-unknown",
    });
    const shared = createLifeStartWorld({
      givenName: "Taylor",
      familyName: "Ng",
      startAge: 40,
      householdKind: "shared",
      housingKind: "renting",
      startingFundsUsd: 2300,
      seed: "circumstances-shared",
    });

    expect(unknown.history.housingTenures).toStrictEqual([]);
    expect(unknown.history.resourcePositions).toStrictEqual([]);
    expect(shared.history.housingTenures).toHaveLength(1);
    expect(shared.history.resourcePositions[0]?.openingBalance.minorUnits).toBe(
      230_000,
    );
    expect(summarizeLifeWorld(shared, playerId(shared))).toMatchObject({
      householdLabel: "Shared household",
      housingLabel: "Rented home",
      resourceLabel: "$2,300 available",
    });
  });

  it("provides age-appropriate directions and a played consequence that unlocks follow-up", () => {
    const child = createLifeStartWorld({
      givenName: "Jamie",
      familyName: "Patel",
      startAge: 8,
      seed: "child-opening",
    });
    const childId = playerId(child);
    const childActions = availableLifeActions(child, childId);
    expect(childActions.map((item) => item.key)).toStrictEqual([
      "personal-project",
      "relationships",
      "learning",
    ]);

    const next = performLifeAction(child, childId, "personal-project");
    expect(next.currentDate > child.currentDate).toBe(true);
    expect(next.history.memories).toHaveLength(1);
    expect(next.history.knowledge).toHaveLength(1);
    expect(next.history.goalStates).toHaveLength(1);
    expect(availableLifeActions(next, childId)[0]?.key).toBe(
      "continue-project",
    );
    expect(summarizeLifeWorld(next, childId).recentHistory[0]).toContain(
      "began a personal project",
    );

    const teen = createLifeStartWorld({
      givenName: "Jamie",
      familyName: "Patel",
      startAge: 16,
      seed: "teen-opening",
    });
    expect(
      availableLifeActions(teen, playerId(teen)).map((item) => item.key),
    ).toContain("community");

    const adult = createLifeStartWorld({
      givenName: "Jamie",
      familyName: "Patel",
      startAge: 32,
      seed: "adult-opening",
    });
    expect(
      availableLifeActions(adult, playerId(adult)).map((item) => item.key),
    ).toEqual(expect.arrayContaining(["work", "politics"]));
  });

  it("serializes and restores the exact world without loss", () => {
    const original = createLifeStartWorld({
      givenName: "Alex",
      familyName: "Rivera",
      startAge: 40,
      birthplace: "chicago-illinois",
      hometown: "los-angeles-california",
      currentResidence: "lexington-kentucky",
      householdKind: "shared",
      housingKind: "renting",
      startingFundsUsd: 900,
      seed: "roundtrip-life",
    });
    const restored = deserializeWorld(serializeWorld(original));
    assertWorldIntegrity(restored);
    expect(serializeWorld(restored)).toBe(serializeWorld(original));
  });
});
