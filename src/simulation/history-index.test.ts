import { describe, expect, it } from "vitest";

import { eventIndexOf } from "./event-index";
import {
  appendedList,
  hasStableKey,
  recordById,
  recordByStableKey,
  recordsByStringField,
  recordsWithFieldValue,
} from "./history-index";
import type { HistoricalEvent } from "./types";
import type { EntityId } from "./types";

describe("immutable history lookup indexes", () => {
  it("keeps first-match and source order while a new array gets fresh entries", () => {
    const first = { id: "first" as EntityId, personId: "a", value: 1 };
    const duplicate = { id: "first" as EntityId, personId: "b", value: 2 };
    const records = [first, duplicate] as const;
    expect(recordById(records, first.id)).toBe(first);
    expect(recordsByStringField(records, "personId", "a")).toEqual([first]);
    expect(recordsByStringField(records, "personId", "b")).toEqual([duplicate]);

    const changed = [
      first,
      duplicate,
      { id: "third" as EntityId, personId: "a", value: 3 },
    ];
    expect(recordById(changed, changed[2]!.id)).toBe(changed[2]);
    expect(recordsByStringField(changed, "personId", "a")).toEqual([
      first,
      changed[2],
    ]);
    expect(recordById(records, changed[2]!.id)).toBeUndefined();
  });

  it("answers a grown list, and each list grown from the same one, exactly", () => {
    const row = (id: string, flowId: string) => ({
      id: id as EntityId,
      stableKey: `key:${id}`,
      flowId,
    });
    const base = [row("a", "f1"), row("b", "f2")];
    expect(recordById(base, "a" as EntityId)).toBe(base[0]);
    expect(hasStableKey(base, "key:b")).toBe(true);
    expect(recordsWithFieldValue(base, "flowId", "f1")).toEqual([base[0]]);

    // Two writers copy the same list and append different records.
    const left = [...base, row("c", "f1")];
    const right = [...base, row("d", "f1")];
    expect(recordById(left, "c" as EntityId)).toBe(left[2]);
    expect(recordById(right, "c" as EntityId)).toBeUndefined();
    expect(recordById(right, "d" as EntityId)).toBe(right[2]);
    expect(hasStableKey(left, "key:d")).toBe(false);
    expect(hasStableKey(right, "key:d")).toBe(true);
    expect(recordsWithFieldValue(left, "flowId", "f1")).toEqual([
      left[0],
      left[2],
    ]);
    expect(recordsWithFieldValue(right, "flowId", "f1")).toEqual([
      right[0],
      right[2],
    ]);
    // The list both grew from still answers only for its own records.
    expect(recordById(base, "c" as EntityId)).toBeUndefined();
    expect(hasStableKey(base, "key:c")).toBe(false);
    expect(recordsWithFieldValue(base, "flowId", "f1")).toEqual([base[0]]);
  });

  it("does not reuse an index for a list that only ends like an indexed one", () => {
    const shared = { id: "z" as EntityId, stableKey: "key:z" };
    const first = [{ id: "a" as EntityId, stableKey: "key:a" }, shared];
    expect(hasStableKey(first, "key:a")).toBe(true);
    const other = [{ id: "b" as EntityId, stableKey: "key:b" }, shared];
    const grown = [...other, { id: "c" as EntityId, stableKey: "key:c" }];
    expect(hasStableKey(grown, "key:a")).toBe(false);
    expect(hasStableKey(grown, "key:b")).toBe(true);
    expect(recordById(grown, "a" as EntityId)).toBeUndefined();
  });

  it("follows lists built by appending, and rereads a list rewritten in place", () => {
    const row = (id: string, detail = "brief") => ({
      id: id as EntityId,
      stableKey: `key:${id}`,
      detail,
    });
    const base = Array.from({ length: 3_000 }, (_, at) => row(`r${at}`));
    expect(recordById(base, "r1500" as EntityId)).toBe(base[1500]);

    // Two appends with no lookup between them still extend the index.
    const once = appendedList(base, [row("x")]);
    const twice = appendedList(once, [row("y"), row("z")]);
    expect(twice).toHaveLength(3_003);
    expect(recordById(twice, "y" as EntityId)).toBe(twice[3_001]);
    expect(hasStableKey(twice, "key:z")).toBe(true);
    expect(recordByStableKey(twice, "key:r7")).toBe(base[7]);
    expect(recordById(once, "y" as EntityId)).toBeUndefined();

    // A second writer grows the same list differently: its list never
    // borrows the other writer's records.
    const fork = appendedList(once, [row("v")]);
    expect(recordById(fork, "v" as EntityId)).toBe(fork.at(-1));
    expect(recordById(fork, "y" as EntityId)).toBeUndefined();
    expect(hasStableKey(appendedList(fork, [row("u")]), "key:z")).toBe(false);
    expect(hasStableKey(twice, "key:v")).toBe(false);

    // A writer that replaces one record far from the end, then appends, keeps
    // the length and the last records of the old list: the new list is read
    // again, so the replacement is what a lookup finds.
    const rewritten = twice.map((record) =>
      record.id === "r1234" ? row("r1234", "detailed") : record,
    );
    const after = [...rewritten, row("w")];
    expect(recordById(after, "r1234" as EntityId)?.detail).toBe("detailed");
    expect(recordById(after, "w" as EntityId)).toBe(after.at(-1));
  });

  it("extends the event index as events are appended, last id winning", () => {
    const event = (id: string, summary: string) =>
      ({ id: id as EntityId, summary }) as unknown as HistoricalEvent;
    const one = [event("e1", "one")];
    expect(eventIndexOf(one).get("e1" as EntityId)?.summary).toBe("one");
    const two = [...one, event("e2", "two"), event("e1", "again")];
    expect(eventIndexOf(two).get("e2" as EntityId)?.summary).toBe("two");
    expect(eventIndexOf(two).get("e1" as EntityId)?.summary).toBe("again");
    expect(eventIndexOf(one).get("e2" as EntityId)).toBeUndefined();
    expect(eventIndexOf(one).get("e1" as EntityId)?.summary).toBe("one");
  });
});
