import { describe, expect, it } from "vitest";

import { ageOnDate } from "./dates";
import {
  availableLifeActions,
  createLifeStartWorld,
  performLifeAction,
  summarizeLifeWorld,
} from "./life-start";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";

describe("life-start simulation foundation", () => {
  it("creates a canonical player-controlled world with coherent age and facts", () => {
    const world = createLifeStartWorld({
      givenName: "Jordan",
      familyName: "Reed",
      startAge: 32,
      partyAffiliation: "independent",
      background: "neighborhood-advocate",
      declaredValue: "service",
      declaredApproach: "cautious",
      seed: "test-seed-jordan-reed",
    });

    assertWorldIntegrity(world);
    expect(world.control.kind).toBe("person");
    if (world.control.kind !== "person")
      throw new Error("Expected person control");

    const playerPersonId = world.control.personId;
    const player = world.people[playerPersonId];
    expect(player).toBeDefined();
    expect(player?.givenName).toBe("Jordan");
    expect(player?.familyName).toBe("Reed");

    const calculatedAge = ageOnDate(player!.birthDate, world.currentDate);
    expect(calculatedAge).toBe(32);

    const summary = summarizeLifeWorld(world, playerPersonId);
    expect(summary.name).toBe("Jordan Reed");
    expect(summary.age).toBe(32);
    expect(summary.currentResidence).toBe("Lexington, Kentucky");
    expect(summary.recentHistory.length).toBeGreaterThan(0);
    expect(summary.resourceLabel).toContain("$");
  });

  it("supports multiple starting ages and backgrounds", () => {
    for (const age of [25, 32, 40, 48] as const) {
      const world = createLifeStartWorld({
        givenName: "Morgan",
        familyName: "Chen",
        startAge: age,
        background: "local-business",
        partyAffiliation: "democratic",
        seed: `test-seed-${age}`,
      });
      assertWorldIntegrity(world);
      if (world.control.kind !== "person")
        throw new Error("Expected person control");
      const player = world.people[world.control.personId];
      expect(ageOnDate(player!.birthDate, world.currentDate)).toBe(age);
    }
  });

  it("allows performing life actions, advancing simulation time, and recording history", () => {
    const world = createLifeStartWorld({
      givenName: "Taylor",
      familyName: "Brooks",
      startAge: 25,
      partyAffiliation: "independent",
      background: "civic-organizer",
    });

    if (world.control.kind !== "person")
      throw new Error("Expected person control");
    const playerPersonId = world.control.personId;
    const initialDate = world.currentDate;
    const actions = availableLifeActions(world, playerPersonId);
    expect(actions.length).toBeGreaterThanOrEqual(4);

    const nextWorld = performLifeAction(world, playerPersonId, "talk-ally");
    assertWorldIntegrity(nextWorld);
    expect(nextWorld.currentDate > initialDate).toBe(true);

    const summary = summarizeLifeWorld(nextWorld, playerPersonId);
    expect(summary.recentHistory[0]).toContain("Taylor Brooks spoke with");
  });

  it("serializes and deserializes the life-start world cleanly without data loss", () => {
    const original = createLifeStartWorld({
      givenName: "Alex",
      familyName: "Rivera",
      startAge: 40,
      background: "public-service",
      partyAffiliation: "republican",
    });

    const serialized = serializeWorld(original);
    const restored = deserializeWorld(serialized);
    assertWorldIntegrity(restored);

    expect(restored.id).toBe(original.id);
    expect(restored.seed).toBe(original.seed);
    expect(restored.control).toStrictEqual(original.control);
    expect(restored.currentDate).toBe(original.currentDate);
    expect(serializeWorld(restored)).toBe(serialized);
  });
});
