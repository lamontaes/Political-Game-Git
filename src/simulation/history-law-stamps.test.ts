import { expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import type { EntityId } from "./types";
import type { HistoricalEventInput } from "./history";
import type { LawEffectStamp } from "./law-effect-stamp";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

it("preserves event law attribution through the canonical writer and Save/Continue", () => {
  const initial = createDemoWorld("event-law-stamp-save");
  const person = initial.people[initial.personOrder[0]!]!;
  const stamp: LawEffectStamp = {
    version: "law-effect-stamp/v1",
    governingLawKey: "starting-law:US:test.event-law" as EntityId,
    source: "in-force-at-start",
    effectKind: "test.recorded-event",
    questionKey: "test.event-law",
    jurisdictionId: person.homeJurisdictionId,
    operativeAt: initial.currentDate,
    appliedAt: initial.currentDate,
    sourceRecordIds: [person.id],
  };
  const input: HistoricalEventInput = {
    stableKey: "stamped-event",
    type: "test.occurrence",
    occurredAt: initial.currentDate,
    recordedAt: initial.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [person.id],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["test.fixture"],
    summary: "A recorded test event preserves its law attribution.",
    context: {
      location: null,
      socialContext: "Test fixture.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
    lawEffectStamps: [stamp],
  };
  const recorded = recordWorldEvent(initial, input);
  const event = recorded.history.events.find(
    (row) => row.stableKey === input.stableKey,
  )!;
  expect(event.lawEffectStamps).toEqual([stamp]);
  expect(event.lawEffectStamps).not.toBe(input.lawEffectStamps);
  expect(event.lawEffectStamps![0]).not.toBe(stamp);
  expect(event.lawEffectStamps![0]!.sourceRecordIds).not.toBe(
    stamp.sourceRecordIds,
  );
  assertWorldIntegrity(recorded);
  const restored = deserializeWorld(serializeWorld(recorded));
  assertWorldIntegrity(restored);
  expect(restored.history.events.find((row) => row.id === event.id)).toEqual(
    event,
  );
  const unstamped = { ...input };
  delete unstamped.lawEffectStamps;
  const legacy = recordWorldEvent(restored, {
    ...unstamped,
    stableKey: "unstamped-event",
  });
  expect(legacy.history.events.at(-1)).not.toHaveProperty("lawEffectStamps");
});
