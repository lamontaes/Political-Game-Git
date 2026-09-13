import { expect, it } from "vitest";
import { createLegislativeScenario } from "./legislation-scenarios";
import { recordFiledProvision } from "./legislative-politics";
import { recordWorldEvent } from "./world";
import { addDays } from "./dates";
import { serializeWorld, deserializeWorld } from "./serialization";
import { createStableId } from "./ids";
import type { EntityId, World } from "./types";

function fixture() {
  const scenario = createLegislativeScenario("alaska");
  const world = recordFiledProvision(scenario.world, {
    stableKey: "reference-test:provision",
    measureId: scenario.measureId,
    provisionKey: "record-only",
    sectionNumber: 1,
    heading: "Authored test text",
    text: "Explicitly synthetic record-reference test.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "the test record",
    },
    applicationScope: {
      jurisdictionId: scenario.world.jurisdictionOrder[0]!,
      segmentKey: null,
    },
  });
  return {
    world,
    provisionId: world.history.legislativeProvisions!.at(-1)!.id,
  };
}
function reference(world: World, id: EntityId, occurredAt = world.currentDate) {
  return recordWorldEvent(world, {
    stableKey: "reference-test:event",
    type: "records.legislative-reference",
    occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [id],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "Canonical filed-text reference.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
it("accepts an existing prior provision reference through import without rewriting history", () => {
  const { world, provisionId } = fixture();
  const next = reference(world, provisionId);
  expect(next.history.legislativeProvisions).toEqual(
    world.history.legislativeProvisions,
  );
  expect(next.history.events.slice(0, -1)).toEqual(world.history.events);
  expect(deserializeWorld(serializeWorld(next))).toEqual(next);
});
it("still refuses unknown, backdated and later-appended provision references", () => {
  const { world, provisionId } = fixture();
  expect(() =>
    reference(world, createStableId("legislative-provision", "missing")),
  ).toThrow(/missing entity/);
  expect(() =>
    reference(world, provisionId, addDays(world.currentDate, -1)),
  ).toThrow(/unavailable legislative politics entity/);
  const malformed: World = {
    ...world,
    history: {
      ...world.history,
      events: world.history.events.map((e, i) =>
        i === 0
          ? {
              ...e,
              involvedEntityIds: [
                ...new Set([...e.involvedEntityIds, provisionId]),
              ].sort(),
            }
          : e,
      ),
    },
  };
  expect(() => serializeWorld(malformed)).toThrow(
    /unavailable legislative politics entity/,
  );
});
