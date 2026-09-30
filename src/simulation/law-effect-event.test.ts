import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { appendHistoricalEvent, createHistoryStore } from "./history";
import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "./law-effect-stamp";
import type { EntityId, HistoricalEvent } from "./types";

const date = makeIsoDate("2026-09-01");
const worldId = "world_event_stamp_fixture" as EntityId;
const stamp = lawEffectStamp(
  {
    answer: "yes",
    measureId: "measure_event_stamp_fixture" as EntityId,
    origin: "enacted",
    level: "state-statute",
    operativeAt: makeIsoDate("2026-08-01"),
    operativeBasis: "enacted-date",
  },
  {
    effectKind: "election.term-limit-bar",
    questionKey:
      "us-policy-positions:government-operations.legislative-term-limits",
    jurisdictionId: "jurisdiction_event_stamp_fixture" as EntityId,
    appliedAt: date,
    sourceRecordIds: ["service_event_stamp_fixture" as EntityId],
  },
)!;

function input() {
  return {
    stableKey: "test:law-effect-event",
    type: "election.term-limit-bar" as const,
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: null,
    involvedEntityIds: [worldId],
    participants: [],
    personFactConstraints: [],
    visibility: "public" as const,
    tags: [],
    summary: "The recorded term limit prevents another candidacy.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  };
}

describe("canonical historical event law-effect persistence", () => {
  it("preserves the supplied canonical stamp instead of dropping it at append", () => {
    const supplied = { ...input(), lawEffectStamps: [stamp] };
    const history = appendHistoricalEvent(
      createHistoryStore(),
      worldId,
      supplied,
    );
    const saved = history.events[0] as HistoricalEvent & LawEffectStampedRecord;
    expect(saved.lawEffectStamps).toEqual([stamp]);
    expect(JSON.parse(JSON.stringify(saved)).lawEffectStamps).toEqual([stamp]);
  });

  it("keeps unstamped records free of a new saved field", () => {
    const history = appendHistoricalEvent(
      createHistoryStore(),
      worldId,
      input(),
    );
    expect(Object.hasOwn(history.events[0]!, "lawEffectStamps")).toBe(false);
  });
});
