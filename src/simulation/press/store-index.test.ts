import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import { requireLifePlace } from "../life-places";
import type { EntityId, World } from "../types";
import { createWorld, withWorldIntegrityDeferred } from "../world";
import {
  appendPressRecord,
  pressDispositionsForLead,
  pressRecordByKey,
  pressRecordsOfKind,
} from "./store";

/**
 * The press read index follows the array it was built from. Two histories
 * that branch from one World must each see only their own records, whichever
 * is read first.
 */

function base(): World {
  return createWorld({
    seed: "press-index",
    currentDate: makeIsoDate("2031-06-01"),
    jurisdictions: [requireLifePlace("kentucky").context.jurisdiction],
    people: [],
  });
}

// Only the index is under test; record contents are not validated here.
function disposition(world: World, key: string, leadId: string): World {
  return withWorldIntegrityDeferred(
    () =>
      appendPressRecord(world, "story-disposition", {
        stableKey: key,
        leadId: leadId as EntityId,
      } as never).world,
  );
}

describe("press read index", () => {
  it("never shows one branch's records to another", () => {
    const parent = disposition(base(), "d:0", "lead-a");
    const left = disposition(parent, "d:left", "lead-a");
    const right = disposition(parent, "d:right", "lead-a");

    expect(pressRecordByKey(left, "story-disposition", "d:right")).toBeNull();
    expect(pressRecordByKey(right, "story-disposition", "d:left")).toBeNull();
    expect(
      pressRecordByKey(left, "story-disposition", "d:left"),
    ).not.toBeNull();
    expect(pressRecordByKey(parent, "story-disposition", "d:left")).toBeNull();
    expect(
      pressDispositionsForLead(right, "lead-a" as EntityId).map(
        (record) => record.stableKey,
      ),
    ).toEqual(["d:0", "d:right"]);
    expect(pressRecordsOfKind(parent, "story-disposition")).toHaveLength(1);
  });

  it("refuses a duplicate key after the index has moved on", () => {
    const first = disposition(base(), "d:0", "lead-a");
    const second = disposition(first, "d:1", "lead-a");
    expect(() => disposition(second, "d:0", "lead-b")).toThrow(
      /already exists/,
    );
  });
});
