import { describe, expect, it } from "vitest";
import { scheduleFutureDueItem } from "../simulation/future-transitions";
import { addDays } from "../simulation/dates";
import { createLegislativeScenario } from "../simulation/legislation-scenarios";
import {
  introduceMeasure,
  nextMeasureStableKey,
  referMeasure,
} from "../simulation/legislation";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { assertWorldIntegrity } from "../simulation/world";
import { applyLegislativeStep } from "./legislation-session";

describe("canonical multi-measure operation identity", () => {
  it("reserves exact and colon-descendant keys while preserving older snapshots", () => {
    const fixture = createLegislativeScenario("alaska");
    const add = (world: typeof fixture.world, stableKey: string) =>
      scheduleFutureDueItem(world, {
        stableKey,
        dueAt: addDays(world.currentDate, 1),
        transitionKey: "custom:identity-test",
        entityIds: [fixture.measureId],
        jurisdictionId: world.jurisdictionOrder[0]!,
        provenance: {
          kind: "authored",
          note: "Operation-key collision regression.",
        },
      });
    let world = fixture.world;
    for (const key of [
      "operation:1-extra",
      "operation:10",
      "operation:2:descendant",
    ])
      world = add(world, key);
    expect(nextMeasureStableKey(world, fixture.measureId, "operation")).toBe(
      "operation:1",
    );
    const after = add(world, "operation:1");
    expect(nextMeasureStableKey(after, fixture.measureId, "operation")).toBe(
      "operation:3",
    );
    expect(nextMeasureStableKey(world, fixture.measureId, "operation")).toBe(
      "operation:1",
    );
    const loaded = deserializeWorld(serializeWorld(after));
    expect(nextMeasureStableKey(loaded, fixture.measureId, "operation")).toBe(
      "operation:3",
    );
  });

  it("preserves legacy fixture keys and separates supplied non-docket measures after reload", () => {
    const fixture = createLegislativeScenario("alaska");
    let world = applyLegislativeStep(
      fixture,
      fixture.world,
      "request-referral",
    ).world;
    expect(world.history.committeeReferrals.at(-1)!.stableKey).toBe(
      "refer:house:1",
    );
    for (const stableKey of [
      "tax-proposal:supplied:first:measure",
      "appropriation:supplied:second:measure",
    ]) {
      world = introduceMeasure(world, {
        stableKey,
        jurisdictionId: world.jurisdictionOrder[0]!,
        rulePackId: fixture.pack.packId,
        designation: stableKey,
        shortTitle: "Supplied fictional proposal",
        summary: "Identity-only fixture; no fiscal or policy effect.",
        origin: "member-introduction",
        subjectClass: "general-policy",
      });
      const measureId = world.history.legislativeMeasures.at(-1)!.id;
      world = applyLegislativeStep(
        { ...fixture, measureId },
        world,
        "request-referral",
      ).world;
      expect(world.history.committeeReferrals.at(-1)!.stableKey).toBe(
        `measure:${measureId}:refer:house:1`,
      );
    }
    world = deserializeWorld(serializeWorld(world));
    const lastMeasure = world.history.legislativeMeasures.at(-1)!;
    expect(nextMeasureStableKey(world, lastMeasure.id, "refer:house")).toBe(
      "refer:house:2",
    );
    // The globally shared helper also protects other trusted writers that use
    // an unnamespaced semantic prefix; it never renames existing records.
    world = introduceMeasure(world, {
      stableKey: "supplied:third:measure",
      jurisdictionId: lastMeasure.jurisdictionId,
      rulePackId: fixture.pack.packId,
      designation: "Supplied third proposal",
      shortTitle: "Supplied fictional proposal",
      summary: "Identity-only fixture.",
      origin: "member-introduction",
      subjectClass: "general-policy",
    });
    const thirdId = world.history.legislativeMeasures.at(-1)!.id;
    world = referMeasure(world, {
      stableKey: nextMeasureStableKey(world, thirdId, "refer:house"),
      measureId: thirdId,
      committeeKey: fixture.pack.chambers[0]!.committees[0]!.committeeKey,
    });
    expect(
      new Set(world.history.committeeReferrals.map((entry) => entry.stableKey))
        .size,
    ).toBe(world.history.committeeReferrals.length);
    assertWorldIntegrity(world);
  });
});
