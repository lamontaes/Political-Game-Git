import { describe, expect, it } from "vitest";

import { distinctOccasions } from "./character-history";
import { makeIsoDate } from "./dates";
import type { EntityId, RelationshipInteraction } from "./types";

/*
 * Two copies of one event are one observation.
 *
 * Repeated formative history is what proposes a character development, and it
 * used to be measured by counting rows in `relationshipInteractions`. Several
 * records can carry one event, so a row count counts one occasion more than
 * once — which is the "repeat-click accumulation" the thresholds review named.
 *
 * A record carrying no event is its own occasion, because a record the history
 * cannot tie to an event is the only evidence there is that it happened.
 */

const EVENT_A = "event-a" as EntityId;
const EVENT_B = "event-b" as EntityId;

function interaction(
  stableKey: string,
  eventId: EntityId | null,
): RelationshipInteraction {
  return {
    id: `interaction-${stableKey}` as EntityId,
    stableKey,
    sequence: 0,
    personIds: ["one" as EntityId, "two" as EntityId],
    eventId,
    occurredAt: makeIsoDate("2026-01-01"),
    kind: "other:lunch-table",
    change: "maintained",
    significance: "minor",
    summary: "",
    tags: ["formative.lunch-table"],
  };
}

describe("repeated history", () => {
  it("counts two records of one event as one occasion", () => {
    expect(
      distinctOccasions([
        interaction("first", EVENT_A),
        interaction("second", EVENT_A),
      ]),
    ).toBe(1);
  });

  it("counts two records of two events as two occasions", () => {
    expect(
      distinctOccasions([
        interaction("first", EVENT_A),
        interaction("second", EVENT_B),
      ]),
    ).toBe(2);
  });

  it("counts a record with no event as its own occasion", () => {
    expect(
      distinctOccasions([
        interaction("first", null),
        interaction("second", null),
      ]),
    ).toBe(2);
  });

  it("is not a row count", () => {
    const rows = [
      interaction("first", EVENT_A),
      interaction("second", EVENT_A),
      interaction("third", EVENT_A),
    ];
    expect(rows).toHaveLength(3);
    expect(distinctOccasions(rows)).toBe(1);
  });
});
